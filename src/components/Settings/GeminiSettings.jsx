import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, InputField, SelectField, ToggleSwitch, SaveButton } from './index';

const modelOptions = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
];

export default function GeminiSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [geminiSettings, setGeminiSettings] = useState({
    api_key: '',
    model: 'gemini-2.0-flash',
    enabled: false,
  });

  const handleSaveGemini = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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
    <SettingsCard icon="psychology" title={t('settings.geminiSettings')} description={t('settings.geminiDescription')}>
      <ToggleSwitch
        checked={geminiSettings.enabled}
        onChange={(e) => setGeminiSettings({ ...geminiSettings, enabled: e.target.checked })}
        label={t('settings.enableGemini')}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label={t('settings.geminiApiKey')}
          type="password"
          value={geminiSettings.api_key}
          onChange={(e) => setGeminiSettings({ ...geminiSettings, api_key: e.target.value })}
          placeholder="AI..."
        />
        <SelectField
          label={t('settings.geminiModel')}
          value={geminiSettings.model}
          onChange={(e) => setGeminiSettings({ ...geminiSettings, model: e.target.value })}
          options={modelOptions}
        />
      </div>

      <div className="mt-6">
        <SaveButton onClick={handleSaveGemini} saving={saving} />
      </div>
    </SettingsCard>
  );
}
