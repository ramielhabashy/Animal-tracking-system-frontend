import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';

export function useBanners(type, locale) {
  const { locale: contextLocale } = useI18n();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const effectiveLocale = locale || contextLocale;

  const fetchBanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (effectiveLocale) params.set('locale', effectiveLocale);
      const res = await apiFetch(`/api/banners/active?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBanners(data.data || data.banners || data || []);
    } catch (err) {
      setError(err.message);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [type, effectiveLocale]);

  return { banners, loading, error, refetch: fetchBanners };
}

export default useBanners;
