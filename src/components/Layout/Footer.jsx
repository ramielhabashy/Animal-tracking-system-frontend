import React from 'react';
import { Link } from 'react-router-dom';
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
          <Link to="/privacy" className="hover:text-brand-primary transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-brand-primary transition-colors">Terms</Link>

        </div>
      </div>
    </footer>
  );
}
