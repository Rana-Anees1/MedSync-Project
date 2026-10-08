import { Languages } from 'lucide-react';

export default function LangToggle({ lang, setLang, t }) {
  return (
    <button className="btn btn--ghost btn--sm lang-toggle" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')} aria-label="Change language">
      <Languages size={16} aria-hidden />
      <span lang={lang === 'en' ? 'ur' : 'en'}>{t.switchTo}</span>
    </button>
  );
}
