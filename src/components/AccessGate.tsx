import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, UserPlus, LogIn } from 'lucide-react';

const ACCESS_CODE = 'lilou2024';

interface AccessGateProps {
  onAuthenticated: () => void;
}

const AccessGate: React.FC<AccessGateProps> = ({ onAuthenticated }) => {
  const { t, lang, toggleLang } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(lang === 'he' ? 'נא להזין שם משתמש' : 'Please enter a username');
      return;
    }
    if (!code.trim()) {
      setError(lang === 'he' ? 'נא להזין קוד גישה' : 'Please enter an access code');
      return;
    }

    if (code === ACCESS_CODE) {
      localStorage.setItem('lilou_user', username.trim());
      localStorage.setItem('lilou_auth', 'true');
      onAuthenticated();
    } else {
      setError(lang === 'he' ? 'קוד גישה שגוי' : 'Invalid access code');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold text-primary tracking-tight">
            Lilou Books
          </h1>
          <p className="text-muted-foreground text-sm">
            {lang === 'he' ? 'מחולל דפוסי קיפול ספרים' : 'Book Folding Pattern Generator'}
          </p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg justify-center">
              <Lock className="h-5 w-5 text-primary" />
              {mode === 'login'
                ? (lang === 'he' ? 'כניסה למערכת' : 'Login')
                : (lang === 'he' ? 'הרשמה' : 'Register')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{lang === 'he' ? 'שם משתמש' : 'Username'}</Label>
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={lang === 'he' ? 'הזינו שם משתמש...' : 'Enter username...'}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>{lang === 'he' ? 'קוד גישה' : 'Access Code'}</Label>
                <Input
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={lang === 'he' ? 'הזינו קוד גישה...' : 'Enter access code...'}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium text-center">{error}</p>
              )}

              <Button type="submit" className="w-full gap-2" size="lg">
                {mode === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                {mode === 'login'
                  ? (lang === 'he' ? 'כניסה' : 'Login')
                  : (lang === 'he' ? 'הרשמה' : 'Register')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
                  className="text-sm text-primary hover:underline"
                >
                  {mode === 'login'
                    ? (lang === 'he' ? 'אין לך חשבון? הרשמה' : "Don't have an account? Register")
                    : (lang === 'he' ? 'יש לך חשבון? כניסה' : 'Already have an account? Login')}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <button
                onClick={toggleLang}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {lang === 'he' ? 'Switch to English' : 'עברית'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessGate;
