import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { InputField, SelectField, SaveButton } from './InputField';

export default function LanguageSettings({ dir: _dir }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const [languages, setLanguages] = useState([]);
  const [languageForm, setLanguageForm] = useState({ code: '', name: '', native_name: '', direction: 'ltr' });
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [selectedLanguageForTranslation, setSelectedLanguageForTranslation] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('common');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [aiFillTarget, setAiFillTarget] = useState('ar');
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFillProgress, setAiFillProgress] = useState(null);

  const groups = ['common', 'dashboard', 'animals', 'devices', 'geofences', 'alerts', 'tasks', 'auctions', 'profile', 'settings'];

  useEffect(() => {
    const loadLanguages = async () => {
      const res = await apiFetch('/api/admin/languages');
      if (res.ok) {
        const data = await res.json();
        setLanguages(data.data || data);
      }
    };
    loadLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguageForTranslation && showTranslations) {
      loadTranslations();
    }
  }, [selectedLanguageForTranslation, selectedGroup, showTranslations]);

  const loadTranslations = async () => {
    if (!selectedLanguageForTranslation) return;
    try {
      const res = await apiFetch('/api/translations', { params: { group: selectedGroup, lang: selectedLanguageForTranslation } });
      if (res.ok) {
        const data = await res.json();
        setTranslations(data || []);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  const handleSaveLanguage = async () => {
    if (!languageForm.code || !languageForm.name || !languageForm.native_name) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = editingLanguage
        ? await apiFetch(`/api/admin/languages/${editingLanguage}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(languageForm),
          })
        : await apiFetch('/api/admin/languages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(languageForm),
          });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
        setLanguageForm({ code: '', name: '', native_name: '', direction: 'ltr' });
        setEditingLanguage(null);
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || data.error || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLanguage = async (code) => {
    if (!confirm('Are you sure? This will also delete all translations for this language.')) return;
    try {
      const res = await apiFetch(`/api/admin/languages/${code}`, { method: 'DELETE' });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleSetDefaultLanguage = async (code) => {
    try {
      const res = await apiFetch(`/api/admin/languages/${code}/set-default`, { method: 'POST' });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to set default');
    }
  };

  const handleToggleLanguage = async (lang) => {
    try {
      const res = await apiFetch(`/api/admin/languages/${lang.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !lang.is_active }),
      });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to toggle');
    }
  };

  const handleSelectLanguageForTranslation = (lang) => {
    setSelectedLanguageForTranslation(lang.code);
    setSelectedGroup('common');
    setShowTranslations(true);
  };

  const handleSaveTranslation = async (id, value) => {
    try {
      await apiFetch(`/api/admin/translations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error('Failed to save translation:', error);
    }
  };

  const handleEditLanguage = (lang) => {
    setEditingLanguage(lang.code);
    setLanguageForm({ code: lang.code, name: lang.name, native_name: lang.native_name, direction: lang.direction });
  };

  const handleCancelEdit = () => {
    setEditingLanguage(null);
    setLanguageForm({ code: '', name: '', native_name: '', direction: 'ltr' });
  };

  const handleAiFillUi = async () => {
    setAiFilling(true);
    setAiFillProgress({ type: 'info', text: `AI-filling missing UI strings for ${aiFillTarget}...` });
    let remaining = null;
    let totalFilled = 0;
    do {
      try {
        const res = await apiFetch('/api/admin/translations/ai-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_lang: 'en', target_lang: aiFillTarget, limit: 200 }),
        });
        if (res.ok) {
          const data = await res.json();
          totalFilled += data.filled || 0;
          remaining = data.remaining || 0;
          setAiFillProgress({ type: 'info', text: `Filled ${totalFilled} strings... ${remaining} remaining` });
        } else {
          const err = await res.json();
          setAiFillProgress({ type: 'error', text: err.error || 'AI fill failed' });
          remaining = 0;
        }
      } catch (error) {
        setAiFillProgress({ type: 'error', text: 'Network error during AI fill' });
        remaining = 0;
      }
    } while (remaining > 0);
    setAiFilling(false);
    if (aiFillProgress?.type !== 'error') {
      setAiFillProgress({ type: 'success', text: `AI fill complete: ${totalFilled} strings translated to ${aiFillTarget}` });
      sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
    }
  };

  const handleAiFillModels = async () => {
    setAiFilling(true);
    setAiFillProgress({ type: 'info', text: `AI-filling model names for ${aiFillTarget}...` });
    let remaining = null;
    let totalFilled = 0;
    do {
      try {
        const res = await apiFetch('/api/admin/translations/ai-fill-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_lang: 'en', target_lang: aiFillTarget, limit: 200 }),
        });
        if (res.ok) {
          const data = await res.json();
          totalFilled += data.filled || 0;
          remaining = data.remaining || 0;
          setAiFillProgress({ type: 'info', text: `Filled ${totalFilled} model names... ${remaining} remaining` });
        } else {
          const err = await res.json();
          setAiFillProgress({ type: 'error', text: err.error || 'AI fill failed' });
          remaining = 0;
        }
      } catch (error) {
        setAiFillProgress({ type: 'error', text: 'Network error during AI fill' });
        remaining = 0;
      }
    } while (remaining > 0);
    setAiFilling(false);
    if (aiFillProgress?.type !== 'error') {
      setAiFillProgress({ type: 'success', text: `Model fill complete: ${totalFilled} names translated to ${aiFillTarget}` });
    }
  };

  if (showTranslations) {
    return (
      <SettingsCard icon="translate" title="Manage Translations" description="Edit translation values for selected language">
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <button
            onClick={() => setShowTranslations(false)}
            className="flex items-center gap-1 text-on-surface-variant hover:text-brand-primary font-medium transition-colors"
          >
            <MaterialSymbol icon="arrow_back" size={20} />
            <span>Back to Languages</span>
          </button>
          <span className="text-[#E3E3DE]">|</span>
          <select
            value={selectedLanguageForTranslation}
            onChange={(e) => setSelectedLanguageForTranslation(e.target.value)}
            className="border border-[#F4F4EF] rounded-xl px-3 py-2 min-w-[200px] text-brand-primary bg-white"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>
            ))}
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="border border-[#F4F4EF] rounded-xl px-3 py-2 text-brand-primary bg-white"
          >
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#F4F4EF]">
          <table className="w-full">
            <thead className="bg-surface-light sticky top-0">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase w-1/3">Key</th>
                <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              {translations.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-4 py-8 text-center text-on-surface-subtle">
                    No translations found for this language and group.
                  </td>
                </tr>
              ) : (
                translations.map((trans) => (
                  <tr key={trans.id} className="border-t border-[#F4F4EF]">
                    <td className="px-4 py-3 font-mono text-sm text-brand-primary">{trans.key}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={trans.value}
                        onBlur={(e) => handleSaveTranslation(trans.id, e.target.value)}
                        dir={selectedLanguageForTranslation === 'ar' || selectedLanguageForTranslation === 'ur' ? 'rtl' : 'ltr'}
                        className="w-full border-none rounded-lg px-3 py-2 bg-surface-light focus:ring-2 focus:ring-brand-secondary/20 text-brand-primary"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard icon="language" title={t('settings.languageSettings') || 'Language Settings'} description={t('settings.languageDescription') || 'Manage system languages and translations'}>
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <InputField
          label={t('common.code') || 'Code'}
          value={languageForm.code}
          onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value.toLowerCase() })}
          placeholder="e.g. fr"
          disabled={!!editingLanguage}
          inputClassName={editingLanguage ? 'opacity-50' : ''}
        />
        <InputField
          label={t('common.name') || 'Name'}
          value={languageForm.name}
          onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
          placeholder="e.g. French"
        />
        <InputField
          label={t('common.nativeName') || 'Native Name'}
          value={languageForm.native_name}
          onChange={(e) => setLanguageForm({ ...languageForm, native_name: e.target.value })}
          placeholder="e.g. Français"
        />
        <SelectField
          label={t('common.direction') || 'Direction'}
          value={languageForm.direction}
          onChange={(e) => setLanguageForm({ ...languageForm, direction: e.target.value })}
          options={[
            { value: 'ltr', label: 'LTR' },
            { value: 'rtl', label: 'RTL' },
          ]}
        />
        <div className="flex items-end gap-2">
          <SaveButton
            onClick={handleSaveLanguage}
            saving={saving}
            className="flex-1"
          >
            {editingLanguage ? (t('common.update') || 'Update') : (t('common.add') || 'Add')}
          </SaveButton>
          {editingLanguage && (
            <button
              onClick={handleCancelEdit}
              className="px-4 py-3 bg-on-surface-subtle text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#F4F4EF]">
        <table className="w-full">
          <thead className="bg-surface-light">
            <tr>
              <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">{t('common.code') || 'Code'}</th>
              <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">{t('common.name') || 'Name'}</th>
              <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">{t('common.nativeName') || 'Native'}</th>
              <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">{t('common.direction') || 'Dir'}</th>
              <th className="px-4 py-3 text-start text-xs font-bold text-on-surface-variant uppercase">{t('common.status') || 'Status'}</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-on-surface-variant uppercase">{t('common.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {languages.map((lang) => (
              <tr key={lang.code} className="border-t border-[#F4F4EF] hover:bg-[#FAFAF7] transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-brand-primary">{lang.code}</td>
                <td className="px-4 py-3 text-brand-primary">{lang.name}</td>
                <td className="px-4 py-3 text-brand-primary" dir={lang.direction || 'ltr'}>{lang.native_name}</td>
                <td className="px-4 py-3 uppercase text-xs text-on-surface-variant">{lang.direction}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      lang.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {lang.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {lang.is_default && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-accent text-white">
                        Default
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleEditLanguage(lang)}
                    className="text-brand-primary hover:text-brand-secondary font-medium text-sm mr-2"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleSelectLanguageForTranslation(lang)}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm mr-2"
                  >
                    Translate
                  </button>
                  <button
                    onClick={() => handleToggleLanguage(lang)}
                    className={`font-medium text-sm mr-2 ${lang.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                  >
                    {lang.is_active ? t('common.disable') : t('common.enable')}
                  </button>
                  {!lang.is_default && (
                    <>
                      <button
                        onClick={() => handleSetDefaultLanguage(lang.code)}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm mr-2"
                      >
                        {t('common.setDefault')}
                      </button>
                      <button
                        onClick={() => handleDeleteLanguage(lang.code)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        {t('common.delete')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-[#E3E3DE]">
        <div className="flex items-center gap-2 mb-4">
          <MaterialSymbol icon="auto_awesome" size={20} className="text-brand-accent" />
          <h3 className="text-lg font-bold text-brand-primary">AI Translation Fill</h3>
        </div>
        <p className="text-sm text-on-surface-subtle mb-4">Use your configured AI provider to automatically translate missing strings. Requires AI settings configured on the AI tab.</p>

        {aiFillProgress && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${
            aiFillProgress.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
            aiFillProgress.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {aiFillProgress.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-on-surface-variant">Target:</label>
            <select
              value={aiFillTarget}
              onChange={(e) => setAiFillTarget(e.target.value)}
              className="border border-[#F4F4EF] rounded-xl px-3 py-2 text-brand-primary bg-white"
              disabled={aiFilling}
            >
              {languages.filter(l => l.code !== 'en').map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAiFillUi}
            disabled={aiFilling}
            className="px-4 py-2 bg-brand-primary text-white rounded-xl font-medium text-sm hover:bg-[#003d24] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {aiFilling ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Working...
              </>
            ) : (
              <MaterialSymbol icon="translate" size={16} />
            )}
            AI-Fill Missing UI Strings
          </button>
          <button
            onClick={handleAiFillModels}
            disabled={aiFilling}
            className="px-4 py-2 bg-brand-secondary text-white rounded-xl font-medium text-sm hover:bg-[#c9a22f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {aiFilling ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Working...
              </>
            ) : (
              <MaterialSymbol icon="pets" size={16} />
            )}
            AI-Fill Model Names
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}
