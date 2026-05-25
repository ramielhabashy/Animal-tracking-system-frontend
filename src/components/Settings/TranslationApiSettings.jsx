import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { SettingsCard, SaveButton } from './index';

export default function TranslationApiSettings({ dir, message, setMessage, saving, setSaving }) {
  const [translationSettings, setTranslationSettings] = useState({
    deepl_api_key: '',
    google_api_key: '',
    ai_enabled: false,
  });

  const handleSaveTranslationSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...translationSettings,
          ai_enabled: translationSettings.ai_enabled ? '1' : '0',
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Translation settings saved' });
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

  return (
    <SettingsCard icon="translate" title="Translation Settings" description="Configure API keys for on-demand translation (DeepL + Google Translate + AI fallback)">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">DeepL API Key</label>
          <input
            type="password"
            value={translationSettings.deepl_api_key}
            onChange={(e) => setTranslationSettings({ ...translationSettings, deepl_api_key: e.target.value })}
            className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
            placeholder="DeepL API Key (en/ar/ur)"
          />
          <p className="text-xs text-on-surface-subtle mt-1">Used for English, Arabic, Urdu translations</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Google Translate API Key</label>
          <input
            type="password"
            value={translationSettings.google_api_key}
            onChange={(e) => setTranslationSettings({ ...translationSettings, google_api_key: e.target.value })}
            className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
            placeholder="Google Translate API Key (all langs)"
          />
          <p className="text-xs text-on-surface-subtle mt-1">Fallback for Basque (eu) and all other languages</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 p-4 bg-surface-light rounded-xl">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={translationSettings.ai_enabled}
            onChange={(e) => setTranslationSettings({ ...translationSettings, ai_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-on-surface-subtle rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
        </label>
        <div>
          <p className="font-medium text-sm text-brand-primary">AI Fallback Translation</p>
          <p className="text-xs text-on-surface-subtle">When DeepL and Google are unavailable, use your configured AI provider (requires AI settings configured under the AI tab)</p>
        </div>
      </div>

      <div className="mt-6">
        <SaveButton onClick={handleSaveTranslationSettings} saving={saving}>
          Save Translation Settings
        </SaveButton>
      </div>
    </SettingsCard>
  );
}
