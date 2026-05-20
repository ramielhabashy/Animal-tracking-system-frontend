import React from 'react';
import { useI18n } from './index';
import { setStoredLocale } from '../utils/api';

export default function LanguageSwitcher({ compact }) {
  const { locale, setLocale, languages, t } = useI18n();

  const handleChange = (e) => {
    const newLocale = e.target.value;
    setStoredLocale(newLocale);
    setLocale(newLocale);
  };

  const currentLang = languages.find(l => l.code === locale);

  const getDisplayName = (lang) => {
    const localName = t(`languages.${lang.code}`);
    if (localName && localName !== `languages.${lang.code}`) return localName;
    const name = lang.native_name || lang.name;
    if (typeof name === 'string' && /^[\s?]*$/.test(name)) {
      const fallbacks = { en: 'English', ar: 'العربية', ur: 'اردو', eu: 'Euskara' };
      return fallbacks[lang.code] || lang.code;
    }
    return name || lang.code;
  };

  if (compact) {
    return (
      <select
        value={locale}
        onChange={handleChange}
        className="px-3 py-2 rounded-xl bg-surface-light hover:bg-surface-high transition-all text-sm text-brand-primary font-semibold border-none cursor-pointer appearance-none"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code} dir={lang.direction || 'ltr'}>
            {getDisplayName(lang)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative flex items-center">
      <select
        value={locale}
        onChange={handleChange}
        className="px-3 pe-14 py-2 rounded-xl bg-surface-light hover:bg-surface-high transition-all text-sm text-brand-primary font-semibold border-none cursor-pointer appearance-none"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code} dir={lang.direction || 'ltr'}>
            {getDisplayName(lang)}
          </option>
        ))}
      </select>
      {currentLang?.direction === 'rtl' && (
        <span className="absolute end-2 text-[10px] font-bold text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded pointer-events-none">
          RTL
        </span>
      )}
    </div>
  );
}
