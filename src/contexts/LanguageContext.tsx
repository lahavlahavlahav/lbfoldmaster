import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'en' | 'he';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<string, Record<Language, string>> = {
  'app.title': { en: 'Lilou Books', he: 'Lilou Books' },
  'app.subtitle': { en: 'Book Folding Pattern Generator', he: 'מחולל דפוסי קיפול ספרים' },
  'book.settings': { en: 'Book Settings', he: 'הגדרות ספר' },
  'book.height': { en: 'Book Height (cm)', he: 'גובה הספר (ס"מ)' },
  'book.pages': { en: 'Number of Foldable Pages', he: 'מספר דפים לקיפול' },
  'book.topMargin': { en: 'Top Margin (cm)', he: 'שוליים עליונים (ס"מ)' },
  'book.bottomMargin': { en: 'Bottom Margin (cm)', he: 'שוליים תחתונים (ס"מ)' },
  'book.pageThickness': { en: 'Page Thickness (mm)', he: 'עובי דף (מ"מ)' },
  'design.title': { en: 'Design Input', he: 'הזנת עיצוב' },
  'design.text': { en: 'Text', he: 'טקסט' },
  'design.image': { en: 'Image', he: 'תמונה' },
  'design.enterText': { en: 'Enter text to fold...', he: 'הזינו טקסט לקיפול...' },
  'design.font': { en: 'Font', he: 'גופן' },
  'design.uploadImage': { en: 'Upload Image', he: 'העלאת תמונה' },
  'design.scale': { en: 'Scale', he: 'קנה מידה' },
  'design.horizontalOffset': { en: 'Horizontal Position', he: 'מיקום אופקי' },
  'design.verticalOffset': { en: 'Vertical Position', he: 'מיקום אנכי' },
  'fold.title': { en: 'Fold Technique', he: 'טכניקת קיפול' },
  'fold.mmf': { en: 'MMF (Mark, Measure, Fold)', he: 'MMF (סימון, מדידה, קיפול)' },
  'fold.mmcf': { en: 'Cut & Fold', he: 'חיתוך וקיפול' },
  'fold.inverted': { en: 'Inverted', he: 'הפוך' },
  'fold.shadow': { en: 'Shadow', he: 'צל' },
  'fold.twoTone': { en: 'Two-Tone', he: 'דו-גוני' },
  'fold.threeTone': { en: 'Three-Tone', he: 'תלת-גוני' },
  'fold.multilayer': { en: 'Multilayer', he: 'רב-שכבתי' },
  'fold.multiline': { en: 'Multiline', he: 'רב-שורתי' },
  'fold.embossed': { en: 'Embossed', he: 'בליטה' },
  'fold.combi': { en: 'Combi', he: 'משולב' },
  'fold.shadowDepth': { en: 'Shadow Depth (pages)', he: 'עומק צל (דפים)' },
  'preview.title': { en: 'Pattern Preview', he: 'תצוגה מקדימה' },
  'preview.2d': { en: '2D Preview', he: 'תצוגה דו-ממדית' },
  'preview.3d': { en: '3D Preview', he: 'תצוגה תלת-ממדית' },
  'results.title': { en: 'Folding Pattern', he: 'דפוס קיפול' },
  'results.page': { en: 'Page', he: 'דף' },
  'results.mark1': { en: 'Mark 1 (cm)', he: 'סימן 1 (ס"מ)' },
  'results.mark2': { en: 'Mark 2 (cm)', he: 'סימן 2 (ס"מ)' },
  'results.mark3': { en: 'Mark 3 (cm)', he: 'סימן 3 (ס"מ)' },
  'results.mark4': { en: 'Mark 4 (cm)', he: 'סימן 4 (ס"מ)' },
  'results.action': { en: 'Action', he: 'פעולה' },
  'results.fold': { en: 'Fold', he: 'קיפול' },
  'results.cut': { en: 'Cut', he: 'חיתוך' },
  'results.cutFold': { en: 'Cut + Fold', he: 'חיתוך + קיפול' },
  'results.foldIn': { en: 'Fold In', he: 'קיפול פנימה' },
  'results.foldOut': { en: 'Fold Out', he: 'קיפול החוצה' },
  'results.deepFold': { en: 'Deep Fold', he: 'קיפול עמוק' },
  'results.shallowFold': { en: 'Shallow Fold', he: 'קיפול רדוד' },
  'results.noPattern': { en: 'Enter text or upload an image and click Generate', he: 'הזינו טקסט או העלו תמונה ולחצו על יצירה' },
  'btn.generate': { en: 'Generate Pattern', he: 'צור דפוס' },
  'btn.exportPdf': { en: 'Export PDF', he: 'ייצוא PDF' },
  'btn.exportCsv': { en: 'Export CSV', he: 'ייצוא CSV' },
  'results.totalPages': { en: 'Total pages with folds', he: 'סה"כ דפים עם קיפולים' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('he');

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'en' ? 'he' : 'en');
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, dir }}>
      <div dir={dir}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
