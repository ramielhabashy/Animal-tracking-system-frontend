import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';

const clientCache = new Map();

export default function TranslateButton({ text, className = '' }) {
  const { locale, dir } = useI18n();
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const isRtl = dir === 'rtl';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!text || typeof text !== 'string') return null;

  const cacheKey = `${text}|${locale}`;
  if (!translation && clientCache.has(cacheKey)) {
    setTranslation(clientCache.get(cacheKey));
  }

  const handleTranslate = async () => {
    if (loading) return;
    if (translation) {
      setShow(!show);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify({ text, target_lang: locale }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.translated_text;
        clientCache.set(cacheKey, translated);
        setTranslation(translated);
        setShow(true);
      }
    } catch (e) {
      console.warn('Translation failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        onClick={handleTranslate}
        className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-brand-accent/20 text-on-surface-subtle hover:text-brand-accent transition-colors"
        title="Translate"
      >
        <MaterialSymbol
          icon={loading ? 'sync' : 'translate'}
          size={14}
          className={loading ? 'animate-spin' : ''}
        />
      </button>
      {show && translation && (
        <div
          className={`absolute z-50 top-6 bg-white border border-brand-accent/30 rounded-xl px-4 py-3 shadow-[0_8px_24px_rgba(6,64,43,0.12)] text-sm text-brand-primary min-w-[200px] max-w-[320px] ${isRtl ? 'left-0' : 'right-0'}`}
        >
          <div className={`flex items-start gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="g_translate" size={16} className="text-brand-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">{translation}</p>
          </div>
        </div>
      )}
    </span>
  );
}
