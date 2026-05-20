import React, { useMemo } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useBanners } from '../../../hooks/useBanners';
import { useI18n } from '../../../i18n';

const COLOR_STYLES = {
  dark: 'bg-stone-900 text-stone-300',
  brand: 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white',
  amber: 'bg-amber-50 border border-amber-200 text-amber-800',
  default: 'bg-surface-light',
};

export default function AnnouncementsWidget({ dashboardData }) {
  const { t } = useI18n();
  const { banners, loading } = useBanners('announcement,promotion');

  const activeBanners = useMemo(() => {
    if (!banners || !Array.isArray(banners)) return [];
    return banners.filter(b => b.active !== false);
  }, [banners]);

  if (loading || activeBanners.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-primary mb-3">
        {t('nav.announcements') || 'Announcements'}
      </h3>
      <div className="space-y-2">
        {activeBanners.map((banner, idx) => {
          const scheme = banner.color_scheme || 'default';
          const colorClass = COLOR_STYLES[scheme] || COLOR_STYLES.default;
          return (
            <div key={banner.id || idx} className={`rounded-xl p-3 ${colorClass}`}>
              <div className="flex items-start gap-2">
                {banner.icon && (
                  <MaterialSymbol icon={banner.icon} size={20} className="mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-tight">{banner.title}</p>
                  {banner.description && (
                    <p className="text-xs mt-0.5 line-clamp-2 opacity-85">{banner.description}</p>
                  )}
                  {banner.button_url && (
                    <a
                      href={banner.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
                    >
                      {t('announcements.view') || 'View'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
