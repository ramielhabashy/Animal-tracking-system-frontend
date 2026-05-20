import React, { useState } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, InputField, SelectField, CheckboxField } from './index';

const encryptionOptions = [
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
  { value: 'none', label: 'None' },
];

const notificationCheckboxes = [
  { key: 'welcome', label: 'New User Registration', description: 'Welcome email when users register or accept an invitation' },
  { key: 'invitation', label: 'Invitations', description: 'Email when invitations are sent and accepted' },
  { key: 'subscription', label: 'Subscription & Payments', description: 'Payment confirmations, renewals, cancellations, and expiry notices' },
  { key: 'auction_won', label: 'Auction Won', description: 'Notify winner when they win an auction' },
  { key: 'auction_bid', label: 'Auction Bids', description: 'Outbid notices and new bid alerts for auction owners' },
  { key: 'auction_payment', label: 'Auction Payments', description: 'Payment verified/rejected notices for auction winners' },
  { key: 'task_assigned', label: 'Task Assigned', description: 'Email when a task is assigned to a user' },
  { key: 'medical', label: 'Medical Records', description: 'Notify animal owners when a medical record is added' },
];

export default function EmailSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    encryption: 'tls',
    from_email: '',
    from_name: '',
  });
  const [emailNotificationPrefs, setEmailNotificationPrefs] = useState({
    welcome: true,
    invitation: true,
    subscription: true,
    auction_won: true,
    auction_bid: true,
    auction_payment: true,
    task_assigned: true,
    medical: true,
  });
  const [testing, setTesting] = useState(false);

  const handleSaveSmtp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
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

  const handleTestSmtp = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/smtp/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveEmailPrefs = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNotificationPrefs),
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
    <SettingsCard icon="mail" title="Email Settings" description="Configure SMTP, email notifications, and send test emails">
      <h4 className="text-lg font-bold text-brand-primary mb-4 pb-2 border-b border-[#F4F4EF]">SMTP Configuration</h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label={t('settings.smtpHost')}
          value={smtpSettings.host}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
          placeholder="smtp.gmail.com"
        />
        <InputField
          label={t('settings.port')}
          value={smtpSettings.port}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
          placeholder="587"
        />
        <InputField
          label={t('settings.username')}
          value={smtpSettings.username}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
          placeholder="your@email.com"
        />
        <InputField
          label={t('auth.password')}
          type="password"
          value={smtpSettings.password}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
          placeholder="App password"
        />
        <SelectField
          label={t('settings.encryption')}
          value={smtpSettings.encryption}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, encryption: e.target.value })}
          options={encryptionOptions}
        />
        <InputField
          label={t('settings.fromEmail')}
          type="email"
          value={smtpSettings.from_email}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, from_email: e.target.value })}
          placeholder="noreply@oasis.com"
        />
        <div className="lg:col-span-2">
          <InputField
            label={t('settings.fromName')}
            value={smtpSettings.from_name}
            onChange={(e) => setSmtpSettings({ ...smtpSettings, from_name: e.target.value })}
            placeholder="The Oasis"
          />
        </div>
      </div>

      <div className="flex gap-4 mt-6 mb-8">
        <button
          onClick={handleSaveSmtp}
          disabled={saving}
          className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
        <button
          onClick={handleTestSmtp}
          disabled={testing}
          className="px-6 py-3 bg-brand-accent text-white rounded-xl font-bold hover:bg-brand-accent transition disabled:opacity-50"
        >
          {testing ? t('common.loading') : t('settings.sendTest')}
        </button>
      </div>

      <h4 className="text-lg font-bold text-brand-primary mb-4 pb-2 border-b border-[#F4F4EF]">Email Notification Preferences</h4>
      <p className="text-sm text-on-surface-subtle mb-4">Choose which events trigger email notifications to users</p>

      <div className="space-y-3">
        {notificationCheckboxes.map(({ key, label, description }) => (
          <CheckboxField
            key={key}
            label={label}
            description={description}
            checked={emailNotificationPrefs[key]}
            onChange={(e) => setEmailNotificationPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
          />
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={handleSaveEmailPrefs}
          disabled={saving}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50"
        >
          {saving ? t('common.loading') : 'Save Notification Preferences'}
        </button>
      </div>
    </SettingsCard>
  );
}
