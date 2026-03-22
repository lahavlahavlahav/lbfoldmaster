import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import AccessGate from '@/components/AccessGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  type BookConfig,
  type DesignConfig,
  type FoldTechnique,
  type PatternResult,
  type TechniqueConfig,
  generatePattern,
  generatePreviewCanvas,
} from '@/lib/pattern-engine';
import { exportPatternToPdf, exportPatternToCsv } from '@/lib/pdf-export';
import {
  BookOpen, Type, Image, Scissors, Download, FileSpreadsheet, Wand2, Eye,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const FONTS = [
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const TECHNIQUES: { value: FoldTechnique; labelKey: string; icon: string }[] = [
  { value: 'mmf', labelKey: 'fold.mmf', icon: '📐' },
  { value: 'mmcf', labelKey: 'fold.mmcf', icon: '✂️' },
  { value: 'inverted', labelKey: 'fold.inverted', icon: '🔄' },
  { value: 'shadow', labelKey: 'fold.shadow', icon: '🌗' },
  { value: 'multilayer', labelKey: 'fold.multilayer', icon: '📚' },
  { value: 'multiline', labelKey: 'fold.multiline', icon: '📝' },
  { value: 'embossed', labelKey: 'fold.embossed', icon: '💎' },
  { value: 'combi', labelKey: 'fold.combi', icon: '🔀' },
];

const Index: React.FC = () => {
  const { t, lang } = useLanguage();

  // Book settings
  const [bookHeight, setBookHeight] = useState(21);
  const [numberOfPages, setNumberOfPages] = useState(300);
  const [topMargin, setTopMargin] = useState(1);
  const [bottomMargin, setBottomMargin] = useState(1);
  const [pageThickness, setPageThickness] = useState(0.1);

  // Design settings
  const [designType, setDesignType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('LOVE');
  const [fontFamily, setFontFamily] = useState('Arial Black');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(0.8);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Fold settings
  const [technique, setTechnique] = useState<FoldTechnique>('mmf');
  const [shadowDepth, setShadowDepth] = useState(3);

  // Results
  const [result, setResult] = useState<PatternResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [currentTablePage, setCurrentTablePage] = useState(0);
  const ROWS_PER_PAGE = 20;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview
  useEffect(() => {
    const design: DesignConfig = {
      type: designType,
      text: designType === 'text' ? text : undefined,
      fontFamily,
      imageElement: designType === 'image' ? (imageElement ?? undefined) : undefined,
      scale,
      offsetX,
      offsetY,
    };
    const book: BookConfig = {
      heightCm: bookHeight,
      numberOfPages,
      topMarginCm: topMargin,
      bottomMarginCm: bottomMargin,
      pageThicknessMm: pageThickness,
    };

    if (designType === 'text' && !text) {
      setPreviewUrl('');
      return;
    }
    if (designType === 'image' && !imageElement) {
      setPreviewUrl('');
      return;
    }

    try {
      const url = generatePreviewCanvas(book, design);
      setPreviewUrl(url);
    } catch {
      // silently fail for preview
    }
  }, [designType, text, fontFamily, imageElement, scale, offsetX, offsetY, bookHeight, numberOfPages, topMargin, bottomMargin, pageThickness]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => setImageElement(img);
    img.src = URL.createObjectURL(file);
  }, []);

  const handleGenerate = useCallback(() => {
    const book: BookConfig = {
      heightCm: bookHeight,
      numberOfPages,
      topMarginCm: topMargin,
      bottomMarginCm: bottomMargin,
      pageThicknessMm: pageThickness,
    };
    const design: DesignConfig = {
      type: designType,
      text: designType === 'text' ? text : undefined,
      fontFamily,
      imageElement: designType === 'image' ? (imageElement ?? undefined) : undefined,
      scale,
      offsetX,
      offsetY,
    };
    const techConfig: TechniqueConfig = {
      shadowDepth,
    };

    const pattern = generatePattern(book, design, technique, techConfig);
    setResult(pattern);
    setCurrentTablePage(0);
  }, [bookHeight, numberOfPages, topMargin, bottomMargin, pageThickness, designType, text, fontFamily, imageElement, scale, offsetX, offsetY, technique, shadowDepth]);

  const handleExportPdf = useCallback(() => {
    if (result) exportPatternToPdf(result, lang);
  }, [result, lang]);

  const handleExportCsv = useCallback(() => {
    if (result) exportPatternToCsv(result);
  }, [result]);

  const tablePages = result ? Math.ceil(result.pages.length / ROWS_PER_PAGE) : 0;
  const currentRows = result?.pages.slice(
    currentTablePage * ROWS_PER_PAGE,
    (currentTablePage + 1) * ROWS_PER_PAGE
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top: Settings Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('book.settings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('book.height')}</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[bookHeight]}
                    onValueChange={([v]) => setBookHeight(v)}
                    min={10} max={40} step={0.5}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={bookHeight}
                    onChange={e => setBookHeight(Number(e.target.value))}
                    className="w-20"
                    min={10} max={40} step={0.5}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('book.pages')}</Label>
                <Input
                  type="number"
                  value={numberOfPages}
                  onChange={e => setNumberOfPages(Number(e.target.value))}
                  min={50} max={1000} step={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t('book.topMargin')}</Label>
                  <Input
                    type="number"
                    value={topMargin}
                    onChange={e => setTopMargin(Number(e.target.value))}
                    min={0} max={5} step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('book.bottomMargin')}</Label>
                  <Input
                    type="number"
                    value={bottomMargin}
                    onChange={e => setBottomMargin(Number(e.target.value))}
                    min={0} max={5} step={0.1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-5 w-5 text-primary" />
                {t('design.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={designType} onValueChange={v => setDesignType(v as 'text' | 'image')}>
                <TabsList className="w-full">
                  <TabsTrigger value="text" className="flex-1 gap-1">
                    <Type className="h-3.5 w-3.5" /> {t('design.text')}
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex-1 gap-1">
                    <Image className="h-3.5 w-3.5" /> {t('design.image')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-3 mt-3">
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t('design.enterText')}
                    className="text-lg font-bold"
                  />
                  <div className="space-y-2">
                    <Label>{t('design.font')}</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONTS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            <span style={{ fontFamily: f.value }}>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="image" className="space-y-3 mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {imageElement ? '✓ Image loaded' : t('design.uploadImage')}
                      </span>
                    </div>
                  </Button>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t('design.scale')}: {Math.round(scale * 100)}%</Label>
                  <Slider
                    value={[scale]}
                    onValueChange={([v]) => setScale(v)}
                    min={0.2} max={1.5} step={0.05}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('design.horizontalOffset')}</Label>
                    <Slider
                      value={[offsetX]}
                      onValueChange={([v]) => setOffsetX(v)}
                      min={-0.8} max={0.8} step={0.05}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('design.verticalOffset')}</Label>
                    <Slider
                      value={[offsetY]}
                      onValueChange={([v]) => setOffsetY(v)}
                      min={-0.8} max={0.8} step={0.05}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fold Technique */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scissors className="h-5 w-5 text-primary" />
                {t('fold.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TECHNIQUES.map(tech => (
                  <button
                    key={tech.value}
                    onClick={() => setTechnique(tech.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-start
                      ${technique === tech.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                      }`}
                  >
                    <span>{tech.icon}</span>
                    <span className="truncate">{t(tech.labelKey)}</span>
                  </button>
                ))}
              </div>

              {technique === 'shadow' && (
                <div className="mt-4 space-y-2">
                  <Label className="text-xs">{t('fold.shadowDepth')}: {shadowDepth}</Label>
                  <Slider
                    value={[shadowDepth]}
                    onValueChange={([v]) => setShadowDepth(v)}
                    min={1} max={10} step={1}
                  />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                className="w-full mt-4 gap-2"
                size="lg"
              >
                <Wand2 className="h-5 w-5" />
                {t('btn.generate')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-primary" />
              {t('preview.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="relative bg-muted/30 rounded-lg p-4 overflow-hidden">
                <div className="flex justify-center">
                  <img
                    src={result?.canvasDataUrl || previewUrl}
                    alt="Pattern preview"
                    className="max-w-full h-auto border border-border rounded shadow-sm"
                    style={{ imageRendering: 'pixelated', maxHeight: '300px' }}
                  />
                </div>
                {result && (
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span>{t('results.totalPages')}: <strong className="text-foreground">{result.totalPagesWithFolds}</strong></span>
                    <span>|</span>
                    <span>{t('fold.title')}: <strong className="text-foreground">{technique.toUpperCase()}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                {t('results.noPattern')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        {result && result.pages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('results.title')}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    {t('btn.exportPdf')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                    <FileSpreadsheet className="h-4 w-4" />
                    {t('btn.exportCsv')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 px-3 text-start font-semibold text-muted-foreground">{t('results.page')}</th>
                      {(() => {
                        const maxMarks = Math.max(...result.pages.map(p => p.marks.length), 2);
                        return Array.from({ length: maxMarks }, (_, i) => (
                          <th key={i} className="py-2 px-3 text-start font-semibold text-muted-foreground">
                            {t(`results.mark${i + 1}`)}
                          </th>
                        ));
                      })()}
                      <th className="py-2 px-3 text-start font-semibold text-muted-foreground">{t('results.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((page, idx) => (
                      <tr
                        key={page.pageNumber}
                        className={`border-b border-border/50 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
                      >
                        <td className="py-2 px-3 font-medium">{page.pageNumber}</td>
                        {(() => {
                          const maxMarks = Math.max(...result.pages.map(p => p.marks.length), 2);
                          return Array.from({ length: maxMarks }, (_, i) => {
                            const mark = page.marks[i];
                            return (
                              <td key={i} className="py-2 px-3 font-mono">
                                {mark ? (
                                  <span>
                                    {mark.positionCm}
                                    {mark.depth && (
                                      <span className="text-xs text-muted-foreground ms-1">
                                        ({mark.depth === 'deep' ? '▓' : mark.depth === 'medium' ? '▒' : '░'})
                                      </span>
                                    )}
                                  </span>
                                ) : '—'}
                              </td>
                            );
                          });
                        })()}
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${page.action.includes('cut') ? 'bg-destructive/10 text-destructive' :
                              page.action.includes('inverted') ? 'bg-accent/20 text-accent-foreground' :
                              'bg-primary/10 text-primary'}`}>
                            {page.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {tablePages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentTablePage === 0}
                    onClick={() => setCurrentTablePage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentTablePage + 1} / {tablePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentTablePage >= tablePages - 1}
                    onClick={() => setCurrentTablePage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
