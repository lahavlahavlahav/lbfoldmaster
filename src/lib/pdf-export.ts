import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PatternResult } from './pattern-engine';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export function exportPatternToPdf(result: PatternResult, lang: 'en' | 'he' = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isHe = lang === 'he';
  const title = 'Lilou Books';
  const subtitle = isHe ? 'דפוס קיפול ספרים' : 'Book Folding Pattern';

  // Header
  doc.setFontSize(24);
  doc.setTextColor(180, 150, 90);
  doc.text(title, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 80, 50);
  doc.text(subtitle, 105, 28, { align: 'center' });

  // Book info
  doc.setFontSize(10);
  doc.setTextColor(60, 50, 30);
  const bookInfoY = 38;
  const heightLabel = isHe ? 'גובה הספר' : 'Book Height';
  const pagesLabel = isHe ? 'דפים עם קיפולים' : 'Pages with folds';
  const techLabel = isHe ? 'טכניקה' : 'Technique';

  doc.text(`${heightLabel}: ${result.bookConfig.heightCm} cm`, 15, bookInfoY);
  doc.text(`${pagesLabel}: ${result.totalPagesWithFolds}`, 15, bookInfoY + 5);
  doc.text(`${techLabel}: ${result.technique.toUpperCase()}`, 15, bookInfoY + 10);

  // Table
  const pageHeader = isHe ? 'דף' : 'Page';
  const actionHeader = isHe ? 'פעולה' : 'Action';

  // Determine max marks per page for column count
  const maxMarks = Math.max(...result.pages.map(p => p.marks.length), 2);
  const markHeaders = Array.from({ length: maxMarks }, (_, i) => {
    const label = isHe ? `סימן ${i + 1} (ס"מ)` : `Mark ${i + 1} (cm)`;
    return label;
  });

  const head = [[pageHeader, ...markHeaders, actionHeader]];
  const body = result.pages.map(page => {
    const markValues = Array.from({ length: maxMarks }, (_, i) => {
      const mark = page.marks[i];
      if (!mark) return '';
      let val = `${mark.positionCm}`;
      if (mark.depth) val += ` (${mark.depth})`;
      return val;
    });

    let action = page.action;
    if (isHe) {
      const actionMap: Record<string, string> = {
        'fold': 'קיפול',
        'cut+fold': 'חיתוך + קיפול',
        'fold-inverted': 'קיפול הפוך',
        'fold-full': 'קיפול מלא',
        'fold-shadow': 'קיפול צל',
        'fold-two-tone': 'דו-גוני',
        'fold-three-tone': 'תלת-גוני',
        'fold-multilayer': 'רב-שכבתי',
        'fold-in': 'קיפול פנימה',
        'fold-out': 'קיפול החוצה',
        'combi': 'משולב',
      };
      action = actionMap[page.action] || page.action;
    }

    return [page.pageNumber.toString(), ...markValues, action];
  });

  doc.autoTable({
    head,
    body,
    startY: bookInfoY + 18,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [180, 150, 90], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 245, 235] },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 130, 100);
    doc.text('liloubooks.com', 105, 290, { align: 'center' });
  }

  doc.save(`lilou-books-pattern-${result.technique}.pdf`);
}

export function exportPatternToCsv(result: PatternResult) {
  const maxMarks = Math.max(...result.pages.map(p => p.marks.length), 2);
  const markHeaders = Array.from({ length: maxMarks }, (_, i) => `Mark ${i + 1} (cm)`);

  let csv = `Page,${markHeaders.join(',')},Action\n`;
  result.pages.forEach(page => {
    const markValues = Array.from({ length: maxMarks }, (_, i) => {
      const mark = page.marks[i];
      return mark ? `${mark.positionCm}` : '';
    });
    csv += `${page.pageNumber},${markValues.join(',')},${page.action}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lilou-books-pattern-${result.technique}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
