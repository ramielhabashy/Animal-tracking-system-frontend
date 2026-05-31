import React, { useState, useEffect } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await apiFetch('/api/admin/settings/smtp/logs');
      if (res.ok) {
        const json = await res.json();
        setEmailLogs(json.data || []);
      }
    } catch (e) {
      // silent
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load SMTP settings
        const smtpRes = await apiFetch('/api/admin/settings/smtp');
        if (smtpRes.ok) {
          const smtpJson = await smtpRes.json();
          const smtpData = smtpJson.data || smtpJson;
          const loadedHost = smtpData.host || '';
          const loadedPort = smtpData.port || '';
          const loadedUsername = smtpData.username || '';
          const loadedPassword = smtpData.password || '';
          const loadedEncryption = smtpData.encryption || 'tls';
          const loadedFromEmail = smtpData.from_email || '';
          const loadedFromName = smtpData.from_name || '';
          setSmtpSettings({
            host: loadedHost,
            port: loadedPort,
            username: loadedUsername,
            password: loadedPassword,
            encryption: loadedEncryption,
            from_email: loadedFromEmail,
            from_name: loadedFromName,
          });
          // Default test email to the SMTP from_email if not already set
          if (!testEmail && loadedFromEmail) {
            setTestEmail(loadedFromEmail);
          }
        }

        // Load email notification preferences
        const prefsRes = await apiFetch('/api/admin/settings/email-preferences');
        if (prefsRes.ok) {
          const prefsJson = await prefsRes.json();
          const prefsData = prefsJson.data || prefsJson;
          setEmailNotificationPrefs({
            welcome: prefsData.welcome !== false,
            invitation: prefsData.invitation !== false,
            subscription: prefsData.subscription !== false,
            auction_won: prefsData.auction_won !== false,
            auction_bid: prefsData.auction_bid !== false,
            auction_payment: prefsData.auction_payment !== false,
            task_assigned: prefsData.task_assigned !== false,
            medical: prefsData.medical !== false,
          });
        }
      } catch (e) {
        // silent — settings remain at defaults
      }
    };
    loadData();
    loadEmailLogs();
  }, []);

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
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a recipient email address for the test' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail }),
      });
      const data = await res.json();
      // Refresh logs after test attempt
      loadEmailLogs();

      // Build display message with diagnostics
      let displayMsg = data.message || '';
      if (data.diagnostics) {
        const d = data.diagnostics;
        displayMsg += ` | Mailer: ${d.active_mailer}`;
        displayMsg += ` | SMTP: ${d.configured_host}:${d.configured_port}`;
        if (data.smtp_test) {
          displayMsg += data.smtp_test.reachable
            ? ` | Server: reachable ✓`
            : ` | Server: NOT reachable ✗ (${data.smtp_test.error || ''})`;
        }
      }
      if (res.ok) {
        setMessage({ type: 'success', text: displayMsg });
      } else {
        setMessage({ type: 'error', text: displayMsg });
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
          value={smtpSettings.password}
          onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
          placeholder="App password"
        >
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={smtpSettings.password}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
              placeholder="App password"
              className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center w-8 h-8 text-on-surface-subtle hover:text-brand-primary"
            >
              <MaterialSymbol
                icon={showPassword ? 'visibility_off' : 'visibility'}
                size={20}
              />
            </button>
          </div>
        </InputField>
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

      <div className="flex gap-4 mt-6">
        <button
          onClick={handleSaveSmtp}
          disabled={saving}
          className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      <h4 className="text-lg font-bold text-brand-primary mt-8 mb-4 pb-2 border-b border-[#F4F4EF]">Test SMTP Connection</h4>
      <p className="text-sm text-on-surface-subtle mb-4">Send a test email to verify your SMTP configuration</p>

      <InputField
        label="Recipient Email"
        type="email"
        value={testEmail}
        onChange={(e) => setTestEmail(e.target.value)}
        placeholder="test@example.com"
      />

      <div className="mt-4">
        <button
          onClick={handleTestSmtp}
          disabled={testing || !testEmail}
          className="w-full py-3 bg-brand-accent text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {testing ? t('common.loading') : t('settings.sendTest')}
        </button>
      </div>

      <h4 className="text-lg font-bold text-brand-primary mt-8 mb-4 pb-2 border-b border-[#F4F4EF]">Test Email Log</h4>
      <p className="text-sm text-on-surface-subtle mb-4">History of test emails sent from this dashboard</p>

      {loadingLogs ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin w-6 h-6 border-2 border-[#002819] border-t-transparent rounded-full" />
        </div>
      ) : emailLogs.length === 0 ? (
        <p className="text-sm text-on-surface-subtle py-4 text-center">No test emails have been sent yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#F4F4EF]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F4F4EF] text-on-surface-variant font-bold uppercase tracking-wider text-xs">
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Recipient</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Response / Error</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((log) => (
                <tr key={log.id} className="border-t border-[#F4F4EF] hover:bg-surface-light">
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      log.status === 'sent'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.status === 'sending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      <MaterialSymbol
                        icon={log.status === 'sent' ? 'check_circle' : log.status === 'sending' ? 'schedule' : 'error'}
                        size={14}
                      />
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-brand-primary font-medium">{log.recipient}</td>
                  <td className="p-3 text-on-surface-subtle">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-on-surface-subtle max-w-[200px] truncate" title={log.error_message || log.response || ''}>
                    {log.error_message || log.response || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={loadEmailLogs}
          disabled={loadingLogs}
          className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-accent transition disabled:opacity-50"
        >
          <MaterialSymbol icon="refresh" size={16} />
          Refresh
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
