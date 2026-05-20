import React from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { useI18n } from '../../i18n';

export default function Footer() {
  const { platformName, copyrightText } = usePlatform();
  const { dir } = useI18n();
  const isRtl = dir === 'rtl';

  return (
    <footer className={`border-t border-surface-high bg-white py-6 px-8 mt-auto ${isRtl ? 'text-right' : 'text-left'}`}>
      <div className="flex items-center justify-between text-sm text-on-surface-subtle">
        <p>
          &copy; {new Date().getFullYear()} {platformName}. {copyrightText}
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
