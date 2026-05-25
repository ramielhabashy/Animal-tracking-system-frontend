import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, InputField, ToggleSwitch, SaveButton } from './index';

export default function StripeSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [stripeSettings, setStripeSettings] = useState({
    public_key: '',
    secret_key: '',
    webhook_secret: '',
    enabled: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/settings/stripe');
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setStripeSettings({
            public_key: data.public_key || '',
            secret_key: data.secret_key || '',
            webhook_secret: data.webhook_secret || '',
            enabled: !!data.enabled,
          });
        }
      } catch (e) {
        // silent — settings remain at defaults
      }
    })();
  }, []);

  const handleSaveStripe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripeSettings),
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
    <SettingsCard icon="credit_card" title={t('settings.stripeSettings')} description={t('settings.stripeDescription')}>
      <ToggleSwitch
        checked={stripeSettings.enabled}
        onChange={(e) => setStripeSettings({ ...stripeSettings, enabled: e.target.checked })}
        label={t('settings.enableStripe')}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label={t('settings.publicKey')}
          value={stripeSettings.public_key}
          onChange={(e) => setStripeSettings({ ...stripeSettings, public_key: e.target.value })}
          placeholder="pk_live_..."
        />
        <InputField
          label={t('settings.secretKey')}
          type="password"
          value={stripeSettings.secret_key}
          onChange={(e) => setStripeSettings({ ...stripeSettings, secret_key: e.target.value })}
          placeholder="sk_live_..."
        />
        <div className="lg:col-span-2">
          <InputField
            label={t('settings.webhookSecret')}
            value={stripeSettings.webhook_secret}
            onChange={(e) => setStripeSettings({ ...stripeSettings, webhook_secret: e.target.value })}
            placeholder="whsec_..."
          />
        </div>
      </div>

      <div className="mt-6">
        <SaveButton onClick={handleSaveStripe} saving={saving} />
      </div>
    </SettingsCard>
  );
}
