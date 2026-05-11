import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, storageUrl } from '../utils/api';

const PlatformContext = createContext();

export function PlatformProvider({ children }) {
  const [platformName, setPlatformName] = useState('The Oasis');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [copyrightText, setCopyrightText] = useState('Digital Majlis.');
  const [platformUrl, setPlatformUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const applyFavicon = (url) => {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url || '/favicon.png';
  };

  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const res = await apiFetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          const d = data?.data || {};
          const name = d.platform_name || 'The Oasis';
          setPlatformName(name);
          document.title = name;
          setLogoUrl(d.logo_url || '');
          setFaviconUrl(d.favicon_url || '');
          setCopyrightText(d.copyright_text || 'Digital Majlis.');
          setPlatformUrl(d.platform_url || '');
          applyFavicon(storageUrl(d.favicon_url));
        }
      } catch (error) {
        console.error('Failed to fetch platform settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlatformSettings();
  }, []);

  const refreshPlatformSettings = async () => {
    try {
      const res = await apiFetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        const d = data?.data || {};
        const name = d.platform_name || 'The Oasis';
        setPlatformName(name);
        document.title = name;
        setLogoUrl(d.logo_url || '');
        setFaviconUrl(d.favicon_url || '');
        setCopyrightText(d.copyright_text || 'Digital Majlis.');
        setPlatformUrl(d.platform_url || '');
        applyFavicon(storageUrl(d.favicon_url));
      }
    } catch (error) {
      console.error('Failed to refresh platform settings:', error);
    }
  };

  return (
    <PlatformContext.Provider value={{ platformName, logoUrl, faviconUrl, copyrightText, platformUrl, loading, refreshPlatformSettings }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
