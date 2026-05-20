import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../../utils/api';
import { exportDatabase } from '../../utils/export';
import { useI18n } from '../../i18n';
import { usePlatform } from '../../context/PlatformContext';
import SettingsCard from './SettingsCard';
import { InputField, SelectField, SaveButton } from './InputField';

export default function GeneralSettings({ dir: _dir }) {
  const { t, dir } = useI18n();
  const { refreshPlatformSettings } = usePlatform();
  const isRtl = dir === 'rtl';

  const [generalSettings, setGeneralSettings] = useState({
    platform_name: 'The Oasis',
    platform_url: 'http://localhost:5173',
    admin_email: '',
    timezone: 'Asia/Dubai',
    date_format: 'Y-m-d',
    default_language: 'en',
    logo: '',
    favicon: '',
    login_background: '',
    copyright_text: 'Digital Majlis.',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [loginBackgroundFile, setLoginBackgroundFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [loginBackgroundPreview, setLoginBackgroundPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [exportingDb, setExportingDb] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch('/api/admin/settings/general');
      if (res.ok) {
        const data = await res.json();
        setGeneralSettings(data.data);
      }
    };
    load();
  }, []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('platform_name', generalSettings.platform_name);
      fd.append('platform_url', generalSettings.platform_url);
      fd.append('admin_email', generalSettings.admin_email);
      fd.append('timezone', generalSettings.timezone);
      fd.append('date_format', generalSettings.date_format);
      fd.append('default_language', generalSettings.default_language);
      fd.append('copyright_text', generalSettings.copyright_text);
      if (logoFile) fd.append('logo', logoFile);
      else fd.append('logo', generalSettings.logo || '');
      if (faviconFile) fd.append('favicon', faviconFile);
      else fd.append('favicon', generalSettings.favicon || '');
      if (loginBackgroundFile) fd.append('login_background', loginBackgroundFile);
      else fd.append('login_background', generalSettings.login_background || '');

      const res = await apiFetch('/api/admin/settings/general', { method: 'POST', body: fd });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
        setLogoFile(null);
        setFaviconFile(null);
        setLoginBackgroundFile(null);
        setLogoPreview('');
        setFaviconPreview('');
        setLoginBackgroundPreview('');
        refreshPlatformSettings();
        const generalRes = await apiFetch('/api/admin/settings/general');
        if (generalRes.ok) {
          const data = await generalRes.json();
          setGeneralSettings(data.data);
        }
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportDatabase = async () => {
    setExportingDb(true);
    const success = await exportDatabase();
    if (success) {
      setMessage({ type: 'success', text: t('common.exported') });
    } else {
      setMessage({ type: 'error', text: t('common.exportFailed') });
    }
    setTimeout(() => setMessage(null), 3000);
    setExportingDb(false);
  };

  const timezoneOptions = [
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
    { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST)' },
    { value: 'Asia/Kuwait', label: 'Asia/Kuwait (AST)' },
    { value: 'Asia/Qatar', label: 'Asia/Qatar (AST)' },
    { value: 'Asia/Bahrain', label: 'Asia/Bahrain (AST)' },
    { value: 'Asia/Amman', label: 'Asia/Amman (AST)' },
    { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  ];

  const dateFormatOptions = [
    { value: 'Y-m-d', label: '2024-01-15' },
    { value: 'd/m/Y', label: '15/01/2024' },
    { value: 'm/d/Y', label: '01/15/2024' },
    { value: 'd-m-Y', label: '15-01-2024' },
    { value: 'd.M.Y', label: '15.Jan.2024' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية (Arabic)' },
  ];

  if (!generalSettings.platform_name && !message) {
    return (
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#eeeee9]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-surface-light rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-surface-light rounded w-48" />
              <div className="h-3 bg-surface-light rounded w-64" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-light rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsCard icon="settings" title={t('settings.generalSettings')} description={t('settings.generalDescription')}>
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label={t('settings.platformName')}
          value={generalSettings.platform_name}
          onChange={(e) => setGeneralSettings({ ...generalSettings, platform_name: e.target.value })}
          placeholder="The Oasis"
        />
        <InputField
          label={t('settings.platformUrl')}
          type="url"
          value={generalSettings.platform_url}
          onChange={(e) => setGeneralSettings({ ...generalSettings, platform_url: e.target.value })}
          placeholder="https://oasis.com"
        />
        <InputField
          label={t('settings.adminEmail')}
          type="email"
          value={generalSettings.admin_email}
          onChange={(e) => setGeneralSettings({ ...generalSettings, admin_email: e.target.value })}
          placeholder="admin@oasis.com"
        />
        <SelectField
          label={t('settings.timezone')}
          value={generalSettings.timezone}
          onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
          options={timezoneOptions}
        />
        <SelectField
          label={t('settings.dateFormat')}
          value={generalSettings.date_format}
          onChange={(e) => setGeneralSettings({ ...generalSettings, date_format: e.target.value })}
          options={dateFormatOptions}
        />
        <SelectField
          label={t('settings.defaultLanguage')}
          value={generalSettings.default_language}
          onChange={(e) => setGeneralSettings({ ...generalSettings, default_language: e.target.value })}
          options={languageOptions}
        />
        <InputField
          label="Copyright Text"
          value={generalSettings.copyright_text}
          onChange={(e) => setGeneralSettings({ ...generalSettings, copyright_text: e.target.value })}
          placeholder="Digital Majlis."
        />
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Logo</label>
          <div className="flex items-center gap-4">
            {(logoPreview || generalSettings.logo) && (
              <div className="group relative w-16 h-16 flex-shrink-0">
                <img
                  src={storageUrl(logoPreview || generalSettings.logo)}
                  alt="Logo"
                  className="w-16 h-16 object-contain rounded-xl border border-outline transition-transform duration-200 group-hover:scale-110"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                }
              }}
              className="w-full bg-surface-light border-none rounded-xl p-3 text-sm text-brand-primary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary file:text-white file:font-bold file:text-xs hover:file:bg-brand-secondary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Favicon</label>
          <div className="flex items-center gap-4">
            {(faviconPreview || generalSettings.favicon) && (
              <div className="group relative w-8 h-8 flex-shrink-0">
                <img
                  src={storageUrl(faviconPreview || generalSettings.favicon)}
                  alt="Favicon"
                  className="w-8 h-8 object-contain rounded border border-outline transition-transform duration-200 group-hover:scale-110"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setFaviconFile(file);
                  setFaviconPreview(URL.createObjectURL(file));
                }
              }}
              className="w-full bg-surface-light border-none rounded-xl p-3 text-sm text-brand-primary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary file:text-white file:font-bold file:text-xs hover:file:bg-brand-secondary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('settings.loginBackground')}</label>
          <div className="flex items-center gap-4">
            {(loginBackgroundPreview || generalSettings.login_background) && (
              <div className="group relative w-24 h-16 flex-shrink-0">
                <div
                  className="w-24 h-16 rounded-xl border border-outline bg-cover bg-center transition-transform duration-200 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${storageUrl(loginBackgroundPreview || generalSettings.login_background)})`
                  }}
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setLoginBackgroundFile(file);
                  setLoginBackgroundPreview(URL.createObjectURL(file));
                }
              }}
              className="w-full bg-surface-light border-none rounded-xl p-3 text-sm text-brand-primary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary file:text-white file:font-bold file:text-xs hover:file:bg-brand-secondary"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SaveButton onClick={handleSaveGeneral} saving={saving} />
      </div>

      <div className="mt-4 pt-4 border-t border-[#F4F4EF]">
        <button
          onClick={handleExportDatabase}
          disabled={exportingDb}
          className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold hover:bg-brand-accent transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MaterialSymbol icon="backup" size={20} />
          {exportingDb ? t('common.exporting') : t('settings.exportDatabase')}
        </button>
      </div>
    </SettingsCard>
  );
}
