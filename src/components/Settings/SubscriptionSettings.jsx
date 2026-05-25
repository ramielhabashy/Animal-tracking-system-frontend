import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { ToggleSwitch, InputField, SaveButton } from './InputField';

export default function SubscriptionSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();
  const isRtl = dir === 'rtl';
  const [settings, setSettings] = useState({
    grace_period_days: 7,
    renewal_reminder_days: 7,
    expiry_notification_days: 7,
    auto_cancel_after_grace: true,
    default_billing_period_days: 30,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/subscription');
      if (res.ok) {
        const d = await res.json();
        if (d.data) setSettings(d.data);
      }
    } catch (e) {
      console.error('Failed to load subscription settings:', e);
    }
  };

  const handleSave = async () => {
    setSaving?.(true);
    try {
      const res = await apiFetch('/api/admin/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage?.({ type: 'success', text: t('subscriptionSettings.saved') || 'Subscription settings saved successfully' });
        fetchSettings();
      } else {
        const d = await res.json();
        setMessage?.({ type: 'error', text: d.message || 'Failed to save' });
      }
    } catch (e) {
      setMessage?.({ type: 'error', text: 'Network error' });
    } finally {
      setSaving?.(false);
    }
  };

  return (
    <SettingsCard
      icon="subscriptions"
      title={t('subscriptionSettings.title')}
      description={t('subscriptionSettings.description')}
    >
      <div className="space-y-8">
        {/* Grace Period */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Grace Period & Cancellation</h4>
          <InputField
            label={t('subscriptionSettings.gracePeriodDays')}
            type="number"
            value={settings.grace_period_days}
            onChange={(e) => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) || 7 })}
            min={0}
            max={90}
          />
          <p className="text-xs text-on-surface-subtle -mt-3">
            {t('subscriptionSettings.gracePeriodDesc')}
          </p>

          <div className="space-y-2 pt-2">
            <ToggleSwitch
              label={t('subscriptionSettings.autoCancelAfterGrace')}
              checked={settings.auto_cancel_after_grace}
              onChange={(v) => setSettings({ ...settings, auto_cancel_after_grace: v })}
            />
            <p className="text-xs text-on-surface-subtle mt-1">
              {t('subscriptionSettings.autoCancelAfterGraceDesc')}
            </p>
          </div>
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Reminders & Notifications</h4>
          <InputField
            label={t('subscriptionSettings.renewalReminderDays')}
            type="number"
            value={settings.renewal_reminder_days}
            onChange={(e) => setSettings({ ...settings, renewal_reminder_days: parseInt(e.target.value) || 7 })}
            min={0}
            max={30}
          />
          <p className="text-xs text-on-surface-subtle -mt-3">
            {t('subscriptionSettings.renewalReminderDesc')}
          </p>

          <InputField
            label={t('subscriptionSettings.expiryNotificationDays')}
            type="number"
            value={settings.expiry_notification_days}
            onChange={(e) => setSettings({ ...settings, expiry_notification_days: parseInt(e.target.value) || 7 })}
            min={0}
            max={30}
          />
          <p className="text-xs text-on-surface-subtle -mt-3">
            {t('subscriptionSettings.expiryNotificationDesc')}
          </p>
        </div>

        {/* Billing */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Billing</h4>
          <InputField
            label={t('subscriptionSettings.defaultBillingPeriodDays')}
            type="number"
            value={settings.default_billing_period_days}
            onChange={(e) => setSettings({ ...settings, default_billing_period_days: parseInt(e.target.value) || 30 })}
            min={1}
            max={365}
          />
          <p className="text-xs text-on-surface-subtle -mt-3">
            {t('subscriptionSettings.defaultBillingPeriodDesc')}
          </p>
        </div>

        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </SettingsCard>
  );
}
