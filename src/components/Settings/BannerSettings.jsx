import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';

const TYPE_OPTIONS = ['insight', 'cta', 'announcement', 'promotion'];
const COLOR_OPTIONS = ['dark', 'brand', 'amber', 'emerald'];

const COLOR_STYLES = {
  dark: 'bg-stone-900 text-stone-300',
  brand: 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white',
  amber: 'bg-amber-50 border border-amber-200 text-amber-800',
  emerald: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
};

const COLOR_PREVIEW = {
  dark: { bg: 'bg-stone-900', ring: 'ring-stone-500', text: 'text-white' },
  brand: { bg: 'bg-brand-primary', ring: 'ring-[#002819]', text: 'text-white' },
  amber: { bg: 'bg-amber-400', ring: 'ring-amber-400', text: 'text-brand-primary' },
  emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-white' },
};

export default function BannerSettings({ dir, message, setMessage }) {
  const { t } = useI18n();
  const isRtl = dir === 'rtl';
  const [banners, setBanners] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeLangTab, setActiveLangTab] = useState('en');
  const [form, setForm] = useState(getEmptyForm());
  const [saving, setSaving] = useState(false);

  function getEmptyForm(lang) {
    const base = {
      type: 'announcement',
      icon: '',
      color_scheme: 'brand',
      translations: {},
      button_url: '',
      sort_order: 0,
      is_active: true,
      starts_at: '',
      expires_at: '',
    };
    languages.forEach(l => {
      base.translations[l.code] = { title: '', description: '', button_text: '' };
    });
    if (!lang) {
      base.translations.en = { title: '', description: '', button_text: '' };
    }
    return base;
  }

  const fetchBanners = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch banners:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/languages');
      if (res.ok) {
        const data = await res.json();
        setLanguages(data.data || data || []);
      }
    } catch (e) {
      setLanguages([{ code: 'en', name: 'English', direction: 'ltr' }]);
    }
  }, []);

  useEffect(() => { fetchLanguages(); fetchBanners(); }, []);

  useEffect(() => {
    if (languages.length > 0 && Object.keys(form.translations).length === 0) {
      const translations = {};
      languages.forEach(l => { translations[l.code] = { title: '', description: '', button_text: '' }; });
      setForm(prev => ({ ...prev, translations }));
    }
  }, [languages]);

  const openNew = () => {
    setEditing(null);
    const translations = {};
    (languages.length > 0 ? languages : [{ code: 'en' }]).forEach(l => {
      translations[l.code] = { title: '', description: '', button_text: '' };
    });
    setForm({
      type: 'announcement',
      icon: '',
      color_scheme: 'brand',
      translations,
      button_url: '',
      sort_order: 0,
      is_active: true,
      starts_at: '',
      expires_at: '',
    });
    setActiveLangTab(languages[0]?.code || 'en');
    setShowForm(true);
  };

  const openEdit = (banner) => {
    setEditing(banner);
    const translations = {};
    (languages.length > 0 ? languages : [{ code: 'en' }]).forEach(l => {
      translations[l.code] = {
        title: banner.translations?.[l.code]?.title || '',
        description: banner.translations?.[l.code]?.description || '',
        button_text: banner.translations?.[l.code]?.button_text || '',
      };
    });
    setForm({
      type: banner.type,
      icon: banner.icon || '',
      color_scheme: banner.color_scheme,
      translations,
      button_url: banner.button_url || '',
      sort_order: banner.sort_order ?? 0,
      is_active: banner.is_active,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : '',
      expires_at: banner.expires_at ? banner.expires_at.slice(0, 16) : '',
    });
    setActiveLangTab(languages[0]?.code || 'en');
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/banners/${editing.id}` : '/api/admin/banners';
      const method = editing ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('announcements.saved') });
        setShowForm(false);
        fetchBanners();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!confirm(t('announcements.deleteConfirm'))) return;
    try {
      const res = await apiFetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: t('announcements.deleted') });
        fetchBanners();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const updateTranslation = (langCode, field, value) => {
    setForm(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [langCode]: { ...(prev.translations[langCode] || {}), [field]: value },
      },
    }));
  };

  const getTypeBadge = (type) => {
    const colors = { insight: 'bg-purple-100 text-purple-700', cta: 'bg-blue-100 text-blue-700', announcement: 'bg-amber-100 text-amber-700', promotion: 'bg-green-100 text-green-700' };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-primary">
            <MaterialSymbol icon="campaign" size={22} className="inline align-text-bottom mr-1" />
            {t('announcements.title')}
          </h3>
          <p className="text-sm text-on-surface-subtle mt-1">{t('announcements.description')}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition"
        >
          <MaterialSymbol icon="add" size={18} />
          {t('announcements.addBanner')}
        </button>
      </div>

      {!showForm && banners.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#eeeee9]">
          <MaterialSymbol icon="campaign" size={48} className="text-[#E3E3DE] mx-auto mb-3" />
          <p className="text-on-surface-subtle font-medium">{t('announcements.noBanners')}</p>
        </div>
      )}

      {!showForm && banners.length > 0 && (
        <div className="space-y-3">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-xl border border-[#eeeee9] p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${COLOR_PREVIEW[banner.color_scheme]?.bg || 'bg-stone-900'}`}>
                <MaterialSymbol icon={banner.icon || 'campaign'} size={20} className={COLOR_PREVIEW[banner.color_scheme]?.text || 'text-white'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadge(banner.type)}`}>{banner.type}</span>
                  {banner.is_active ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{t('announcements.active')}</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{t('announcements.inactive')}</span>
                  )}
                  <span className="text-[10px] text-on-surface-subtle">#{banner.sort_order}</span>
                </div>
                <p className="font-bold text-brand-primary text-sm truncate">
                  {banner.translations?.en?.title || '(no title)'}
                </p>
                <p className="text-xs text-on-surface-subtle truncate mt-0.5">
                  {banner.translations?.en?.description || ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(banner)} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle hover:text-brand-primary transition">
                  <MaterialSymbol icon="edit" size={18} />
                </button>
                <button onClick={() => handleDelete(banner)} className="p-2 rounded-lg hover:bg-red-50 text-on-surface-subtle hover:text-red-600 transition">
                  <MaterialSymbol icon="delete" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#eeeee9] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-brand-primary">{editing ? t('announcements.editBanner') : t('announcements.addBanner')}</h4>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle transition">
              <MaterialSymbol icon="close" size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.type')}</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent">
                {TYPE_OPTIONS.map(tp => (
                  <option key={tp} value={tp}>{t('announcements.' + tp)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.icon')}</label>
              <input type="text" value={form.icon} onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="material_symbol_name"
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
              {form.icon && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-on-surface-subtle">
                  <MaterialSymbol icon={form.icon} size={16} /> {form.icon}
                </span>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.colorScheme')}</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(prev => ({ ...prev, color_scheme: c }))}
                    className={`w-8 h-8 rounded-lg ${COLOR_PREVIEW[c]?.bg || 'bg-stone-900'} ${form.color_scheme === c ? 'ring-2 ring-offset-2 ' + COLOR_PREVIEW[c]?.ring : ''}`} />
                ))}
              </div>
            </div>
          </div>

          {languages.length > 0 && (
            <div>
              <div className="flex gap-1 bg-surface-light p-1 rounded-lg w-fit mb-4">
                {languages.map(l => (
                  <button key={l.code} type="button" onClick={() => setActiveLangTab(l.code)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition ${activeLangTab === l.code ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle hover:text-brand-primary'}`}>
                    {l.name}
                  </button>
                ))}
              </div>

              {languages.map(l => l.code === activeLangTab && (
                <div key={l.code} className="space-y-4 border border-[#eeeee9] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-brand-accent">{l.name}</p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.tabTitle')}</label>
                    <input type="text" value={form.translations[l.code]?.title || ''}
                      onChange={e => updateTranslation(l.code, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.tabDescription')}</label>
                    <textarea value={form.translations[l.code]?.description || ''}
                      onChange={e => updateTranslation(l.code, 'description', e.target.value)} rows={3}
                      className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
                  </div>
                  {form.type === 'cta' && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.tabButton')}</label>
                      <input type="text" value={form.translations[l.code]?.button_text || ''}
                        onChange={e => updateTranslation(l.code, 'button_text', e.target.value)}
                        className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.buttonUrl')}</label>
              <input type="text" value={form.button_url} onChange={e => setForm(prev => ({ ...prev, button_url: e.target.value }))}
                placeholder="/path"
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.sortOrder')}</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.startsAt')}</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-subtle mb-1">{t('announcements.expiresAt')}</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-light rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-5 h-5 rounded border-2 border-surface-high text-brand-primary focus:ring-2 focus:ring-brand-accent" />
              <span className="text-sm font-medium text-brand-primary">{t('announcements.active')}</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition flex items-center gap-2 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MaterialSymbol icon="save" size={18} />}
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-surface-light text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-high transition">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
