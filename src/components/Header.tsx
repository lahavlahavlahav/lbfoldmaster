import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const { t, lang, toggleLang } = useLanguage();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-wide">
            {t('app.title')}
          </h1>
          <span className="hidden sm:inline text-sm text-muted-foreground font-light">
            |
          </span>
          <span className="hidden sm:inline text-sm text-muted-foreground font-light">
            {t('app.subtitle')}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {lang === 'en' ? 'עברית' : 'English'}
        </Button>
      </div>
    </header>
  );
};

export default Header;
