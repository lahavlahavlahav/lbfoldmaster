export interface BookConfig {
  heightCm: number;
  numberOfPages: number;
  topMarginCm: number;
  bottomMarginCm: number;
  pageThicknessMm: number;
}

export interface DesignConfig {
  type: 'text' | 'image';
  text?: string;
  fontFamily?: string;
  imageElement?: HTMLImageElement;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type FoldTechnique =
  | 'mmf' | 'mmcf' | 'inverted' | 'shadow'
  | 'multilayer' | 'multiline' | 'embossed' | 'combi';

export interface Mark {
  positionCm: number;
  type: 'fold' | 'cut' | 'fold-in' | 'fold-out';
  depth?: 'deep' | 'shallow' | 'medium';
  layer?: number;
}

export interface PagePattern {
  pageNumber: number;
  marks: Mark[];
  action: string;
}

export interface PatternResult {
  pages: PagePattern[];
  totalPagesWithFolds: number;
  bookConfig: BookConfig;
  technique: FoldTechnique;
  canvasDataUrl: string;
}

export interface TechniqueConfig {
  shadowDepth?: number;
  threshold1?: number;
  threshold2?: number;
  threshold3?: number;
}

const CANVAS_HEIGHT = 800;

function renderDesignToCanvas(
  book: BookConfig,
  design: DesignConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = book.numberOfPages;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2 + (design.offsetX * canvas.width / 2);
  const centerY = canvas.height / 2 + (design.offsetY * canvas.height / 2);

  if (design.type === 'text' && design.text) {
    ctx.fillStyle = '#000000';
    const baseFontSize = Math.min(canvas.height * 0.6, canvas.width * 0.15);
    const fontSize = baseFontSize * design.scale;
    const fontFamily = design.fontFamily || 'Arial';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Handle multiline text
    const lines = design.text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, startY + i * lineHeight);
    });
  } else if (design.type === 'image' && design.imageElement) {
    const img = design.imageElement;
    const maxW = canvas.width * 0.8 * design.scale;
    const maxH = canvas.height * 0.8 * design.scale;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;

    // Draw image, convert to grayscale, then threshold
    ctx.drawImage(img, centerX - w / 2, centerY - h / 2, w, h);

    // Convert to black and white
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const val = brightness < 128 ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

function getColumnPixels(ctx: CanvasRenderingContext2D, x: number, height: number): number[] {
  const imageData = ctx.getImageData(x, 0, 1, height);
  const brightness: number[] = [];
  for (let y = 0; y < height; y++) {
    const idx = y * 4;
    brightness.push(
      (imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114)
    );
  }
  return brightness;
}

function pixelToCm(pixelY: number, canvasHeight: number, book: BookConfig): number {
  const usableHeight = book.heightCm - book.topMarginCm - book.bottomMarginCm;
  const cm = book.topMarginCm + (pixelY / canvasHeight) * usableHeight;
  return Math.round(cm * 10) / 10;
}

function findEdges(
  brightness: number[],
  threshold: number
): { top: number; bottom: number } | null {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < brightness.length; y++) {
    if (brightness[y] < threshold) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1) return null;
  return { top, bottom };
}

function findAllSegments(
  brightness: number[],
  threshold: number
): Array<{ top: number; bottom: number }> {
  const segments: Array<{ top: number; bottom: number }> = [];
  let inSegment = false;
  let segTop = 0;

  for (let y = 0; y < brightness.length; y++) {
    const isDark = brightness[y] < threshold;
    if (isDark && !inSegment) {
      inSegment = true;
      segTop = y;
    } else if (!isDark && inSegment) {
      inSegment = false;
      segments.push({ top: segTop, bottom: y - 1 });
    }
  }
  if (inSegment) {
    segments.push({ top: segTop, bottom: brightness.length - 1 });
  }
  return segments;
}

function generateMMF(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const segments = findAllSegments(brightness, 128);
    if (segments.length > 0) {
      const marks: Mark[] = [];
      segments.forEach(seg => {
        marks.push(
          { positionCm: pixelToCm(seg.top, canvas.height, book), type: 'fold' },
          { positionCm: pixelToCm(seg.bottom, canvas.height, book), type: 'fold' },
        );
      });
      pages.push({
        pageNumber: x + 1,
        marks,
        action: 'fold',
      });
    }
  }
  return pages;
}

function generateMMCF(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const segments = findAllSegments(brightness, 128);
    if (segments.length > 0) {
      const marks: Mark[] = [];
      segments.forEach(seg => {
        marks.push(
          { positionCm: pixelToCm(seg.top, canvas.height, book), type: 'cut' },
          { positionCm: pixelToCm(seg.bottom, canvas.height, book), type: 'fold' },
        );
      });
      pages.push({ pageNumber: x + 1, marks, action: 'cut+fold' });
    }
  }
  return pages;
}

function generateInverted(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const edges = findEdges(brightness, 128);
    if (edges) {
      // Inverted: fold the OUTSIDE areas, leave design area unfolded
      pages.push({
        pageNumber: x + 1,
        marks: [
          { positionCm: pixelToCm(edges.top, canvas.height, book), type: 'fold' },
          { positionCm: pixelToCm(edges.bottom, canvas.height, book), type: 'fold' },
        ],
        action: 'fold-inverted',
      });
    } else {
      // No design on this page — fold entire page
      pages.push({
        pageNumber: x + 1,
        marks: [
          { positionCm: book.topMarginCm, type: 'fold' },
          { positionCm: book.heightCm - book.bottomMarginCm, type: 'fold' },
        ],
        action: 'fold-full',
      });
    }
  }
  return pages;
}

function generateShadow(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig,
  config: TechniqueConfig
): PagePattern[] {
  const shadowDepth = config.shadowDepth ?? 3;
  const basePags = generateMMF(ctx, canvas, book);

  // Add shadow offset: duplicate marks shifted by shadowDepth pages
  const shadowPages: PagePattern[] = [];
  const pageMap = new Map<number, PagePattern>();
  basePags.forEach(p => pageMap.set(p.pageNumber, p));

  for (let x = 0; x < canvas.width; x++) {
    const pageNum = x + 1;
    const mainPage = pageMap.get(pageNum);
    const shadowSource = pageMap.get(pageNum - shadowDepth);

    const marks: Mark[] = [];
    if (mainPage) {
      mainPage.marks.forEach(m => marks.push({ ...m, depth: 'deep' }));
    }
    if (shadowSource) {
      shadowSource.marks.forEach(m => {
        // Shadow is a shallower fold
        marks.push({ positionCm: m.positionCm, type: 'fold', depth: 'shallow' });
      });
    }
    if (marks.length > 0) {
      // Sort marks by position
      marks.sort((a, b) => a.positionCm - b.positionCm);
      shadowPages.push({ pageNumber: pageNum, marks, action: 'fold-shadow' });
    }
  }
  return shadowPages;
}


function generateMultilayer(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const segments = findAllSegments(brightness, 128);
    if (segments.length > 0) {
      const marks: Mark[] = [];
      segments.forEach((seg, layer) => {
        marks.push(
          { positionCm: pixelToCm(seg.top, canvas.height, book), type: 'fold', layer },
          { positionCm: pixelToCm(seg.bottom, canvas.height, book), type: 'fold', layer },
        );
      });
      pages.push({ pageNumber: x + 1, marks, action: 'fold-multilayer' });
    }
  }
  return pages;
}

function generateEmbossed(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const edges = findEdges(brightness, 128);
    if (edges) {
      // Alternate between fold-in and fold-out for embossed 3D effect
      const foldType: 'fold-in' | 'fold-out' = (x % 2 === 0) ? 'fold-in' : 'fold-out';
      pages.push({
        pageNumber: x + 1,
        marks: [
          { positionCm: pixelToCm(edges.top, canvas.height, book), type: foldType },
          { positionCm: pixelToCm(edges.bottom, canvas.height, book), type: foldType },
        ],
        action: foldType === 'fold-in' ? 'fold-in' : 'fold-out',
      });
    }
  }
  return pages;
}

function generateCombi(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, book: BookConfig
): PagePattern[] {
  const pages: PagePattern[] = [];
  for (let x = 0; x < canvas.width; x++) {
    const brightness = getColumnPixels(ctx, x, canvas.height);
    const segments = findAllSegments(brightness, 128);
    if (segments.length > 0) {
      const marks: Mark[] = [];
      segments.forEach((seg) => {
        const segHeight = seg.bottom - seg.top;
        if (segHeight > canvas.height * 0.05) {
          // Large segment: use fold
          marks.push(
            { positionCm: pixelToCm(seg.top, canvas.height, book), type: 'fold' },
            { positionCm: pixelToCm(seg.bottom, canvas.height, book), type: 'fold' },
          );
        } else {
          // Small segment: use cut + fold for detail
          marks.push(
            { positionCm: pixelToCm(seg.top, canvas.height, book), type: 'cut' },
            { positionCm: pixelToCm(seg.bottom, canvas.height, book), type: 'fold' },
          );
        }
      });
      pages.push({ pageNumber: x + 1, marks, action: 'combi' });
    }
  }
  return pages;
}

export function generatePattern(
  book: BookConfig,
  design: DesignConfig,
  technique: FoldTechnique,
  techConfig: TechniqueConfig = {}
): PatternResult {
  const canvas = renderDesignToCanvas(book, design);
  const ctx = canvas.getContext('2d')!;

  let pages: PagePattern[];

  switch (technique) {
    case 'mmf':
      pages = generateMMF(ctx, canvas, book);
      break;
    case 'mmcf':
      pages = generateMMCF(ctx, canvas, book);
      break;
    case 'inverted':
      pages = generateInverted(ctx, canvas, book);
      break;
    case 'shadow':
      pages = generateShadow(ctx, canvas, book, techConfig);
      break;
    case 'multilayer':
      pages = generateMultilayer(ctx, canvas, book);
      break;
    case 'multiline':
      // Multiline is handled by the text input having newlines;
      // pattern generation is same as MMF
      pages = generateMMF(ctx, canvas, book);
      break;
    case 'embossed':
      pages = generateEmbossed(ctx, canvas, book);
      break;
    case 'combi':
      pages = generateCombi(ctx, canvas, book);
      break;
    default:
      pages = generateMMF(ctx, canvas, book);
  }

  return {
    pages,
    totalPagesWithFolds: pages.length,
    bookConfig: book,
    technique,
    canvasDataUrl: canvas.toDataURL(),
  };
}

export function generatePreviewCanvas(
  book: BookConfig,
  design: DesignConfig
): string {
  const canvas = renderDesignToCanvas(book, design);
  return canvas.toDataURL();
}
