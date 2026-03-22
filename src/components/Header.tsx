import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, MessageCircle, Instagram, Star, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SOCIAL_LINKS = [
  { href: 'https://chat.whatsapp.com/JOqFT8cIA25LpzgHJv8bCZ?mode=wwc', icon: MessageCircle, label: 'WhatsApp', color: 'text-green-500' },
  { href: 'https://www.instagram.com/liloubooks____', icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
  { href: 'https://maps.app.goo.gl/mXKDagLgv4ALSkoV7?g_st=ic', icon: Star, label: 'Google Review', color: 'text-yellow-500' },
  { href: 'https://drive.google.com/drive/folders/1oLb6Cd0Ze_ehM5UzYu0_Of_cMGnd1bEh?usp=sharing', icon: FolderOpen, label: 'Templates', color: 'text-blue-500' },
];

const Header: React.FC = () => {
  const { t, lang, toggleLang } = useLanguage();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-wide">
            {t('app.title')}
          </h1>
          <span className="hidden sm:inline text-sm text-muted-foreground font-light">|</span>
          <span className="hidden sm:inline text-sm text-muted-foreground font-light">
            {t('app.subtitle')}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {SOCIAL_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              className={`p-2 rounded-md hover:bg-muted transition-colors ${link.color}`}
            >
              <link.icon className="h-5 w-5" />
            </a>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            className="gap-2 ms-1"
          >
            <Globe className="h-4 w-4" />
            {lang === 'en' ? 'עברית' : 'English'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
