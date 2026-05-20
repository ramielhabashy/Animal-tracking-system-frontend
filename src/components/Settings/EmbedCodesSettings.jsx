import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../i18n';
import { usePlatform } from '../../context/PlatformContext';

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'eu', label: 'Euskara', dir: 'ltr' },
];

const WIDGETS = [
  {
    id: 'auctions',
    icon: 'gavel',
    titleKey: 'embedCodesSection.auctionsTitle',
    descKey: 'embedCodesSection.auctionsDesc',
    defaultHeight: 600,
    defaultWidth: '100%',
    path: '/embed/auctions',
  },
  {
    id: 'auctionsCarousel',
    icon: 'view_carousel',
    titleKey: 'embedCodesSection.auctionsCarouselTitle',
    descKey: 'embedCodesSection.auctionsCarouselDesc',
    defaultHeight: 320,
    defaultWidth: '100%',
    path: '/embed/auctions/carousel',
  },
  {
    id: 'animals',
    icon: 'pets',
    titleKey: 'embedCodesSection.animalsTitle',
    descKey: 'embedCodesSection.animalsDesc',
    defaultHeight: 800,
    defaultWidth: '100%',
    path: '/embed/animals',
  },
  {
    id: 'animalsCarousel',
    icon: 'view_carousel',
    titleKey: 'embedCodesSection.animalsCarouselTitle',
    descKey: 'embedCodesSection.animalsCarouselDesc',
    defaultHeight: 320,
    defaultWidth: '100%',
    path: '/embed/animals/carousel',
  },
  {
    id: 'checkout',
    icon: 'credit_card',
    titleKey: 'embedCodesSection.checkoutTitle',
    descKey: 'embedCodesSection.checkoutDesc',
    defaultHeight: 850,
    defaultWidth: '100%',
    path: '/checkout?embed=1',
  },
];

export default function EmbedCodesSettings({ dir }) {
  const { t, locale: currentLocale } = useI18n();
  const { platformUrl } = usePlatform();
  const [copiedId, setCopiedId] = useState(null);
  const [heights, setHeights] = useState({});
  const [widths, setWidths] = useState({});
  const [langs, setLangs] = useState({});

  useEffect(() => {
    if (!langs.auctions && currentLocale) {
      const defaults = {};
      WIDGETS.forEach(w => { defaults[w.id] = currentLocale; });
      setLangs(defaults);
    }
  }, [currentLocale]);

  const baseUrl = (platformUrl || window.location.origin).replace(/\/+$/, '');

  const getIframeCode = (widget) => {
    const height = heights[widget.id] || widget.defaultHeight;
    const width = widths[widget.id] || widget.defaultWidth;
    const lang = (langs[widget.id] ?? currentLocale) || 'en';
    const separator = widget.path.includes('?') ? '&' : '?';
    const url = `${baseUrl}/react.oasis${widget.path}${separator}lang=${lang}`;
    return `<iframe src="${url}"\n        width="${width}" height="${height}"\n        frameborder="0"\n        style="border-radius:12px;background:#FAF5F1;max-width:100%"\n        allow="payment"></iframe>`;
  };

  const copyToClipboard = async (widget) => {
    const code = getIframeCode(widget);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(widget.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(widget.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-brand-primary">
          <MaterialSymbol icon="code" size={22} className="inline align-text-bottom mr-1" />
          {t('embedCodesSection.title')}
        </h3>
        <p className="text-sm text-on-surface-subtle mt-1">{t('embedCodesSection.description')}</p>
      </div>

      <div className="grid gap-6">
        {WIDGETS.map(widget => (
          <div key={widget.id} className="bg-white rounded-2xl border border-[#eeeee9] overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-light flex items-center justify-center shrink-0">
                  <MaterialSymbol icon={widget.icon} size={24} className="text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-brand-primary">{t(widget.titleKey)}</h4>
                  <p className="text-sm text-on-surface-subtle mt-0.5">{t(widget.descKey)}</p>

                  <div className="flex flex-wrap gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('embedCodesSection.height')}</label>
                      <input
                        type="number"
                        value={heights[widget.id] ?? widget.defaultHeight}
                        onChange={e => setHeights(prev => ({ ...prev, [widget.id]: parseInt(e.target.value) || widget.defaultHeight }))}
                        className="w-24 px-3 py-1.5 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent"
                        min="100"
                        max="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('embedCodesSection.width')}</label>
                      <input
                        type="text"
                        value={widths[widget.id] ?? widget.defaultWidth}
                        onChange={e => setWidths(prev => ({ ...prev, [widget.id]: e.target.value }))}
                        className="w-24 px-3 py-1.5 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('embedCodesSection.language')}</label>
                      <select
                        value={(langs[widget.id] ?? currentLocale) || 'en'}
                        onChange={e => setLangs(prev => ({ ...prev, [widget.id]: e.target.value }))}
                        className="px-3 py-1.5 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent appearance-none cursor-pointer"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="self-end">
                      <a
                        href={`/react.oasis${widget.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-light rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-high transition"
                      >
                        <MaterialSymbol icon="open_in_new" size={14} />
                        {t('common.preview') || 'Preview'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#eeeee9] bg-[#fafafa]">
              <div className="p-4">
                <div className="relative">
                  <pre className="bg-[#1a1c19] text-[#e8e8e0] rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {getIframeCode(widget)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(widget)}
                    className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      copiedId === widget.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <MaterialSymbol icon={copiedId === widget.id ? 'check' : 'content_copy'} size={14} />
                    {copiedId === widget.id ? t('embedCodesSection.copied') : t('embedCodesSection.copyCode')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
