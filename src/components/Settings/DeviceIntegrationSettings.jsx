import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, InputField, SaveButton } from './index';

export default function DeviceIntegrationSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [settings, setSettings] = useState({
    device_simulator_enabled: true,
    device_real_data_enabled: false,
    device_real_api_endpoint: '',
    device_real_api_key: '',
    device_real_driver: 'sani',
    device_mqtt_enabled: false,
    device_mqtt_broker_host: '',
    device_mqtt_broker_port: 1883,
    device_mqtt_username: '',
    device_mqtt_password: '',
    device_mqtt_topic_prefix: 'sani',
  });

  const [connectionStatus, setConnectionStatus] = useState(null);
  const [mqttStatus, setMqttStatus] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/device-integration');
      if (res?.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (e) {}
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/device-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const res = await apiFetch('/api/admin/settings/device-integration/test', { method: 'POST' });
      if (res.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
      }
    } catch (e) {
      setConnectionStatus('failed');
    }
  };

  const testMqttConnection = async () => {
    setMqttStatus('testing');
    try {
      const res = await apiFetch('/api/admin/settings/device-integration/test-mqtt', { method: 'POST' });
      if (res.ok) {
        setMqttStatus('success');
      } else {
        const data = await res.json();
        setMqttStatus('failed');
      }
    } catch (e) {
      setMqttStatus('failed');
    }
  };

  return (
    <div className="space-y-8">
      <SettingsCard icon="simulation" title="Simulator" description="Control the device simulator for testing and development">
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface-dim rounded-xl">
            <div>
              <p className="text-sm font-semibold text-brand-primary">Enable Simulator</p>
              <p className="text-xs text-on-surface-subtle">Allow admin to move, nudge, and control simulated devices</p>
            </div>
            <input
              type="checkbox"
              checked={settings.device_simulator_enabled}
              onChange={(e) => setSettings({ ...settings, device_simulator_enabled: e.target.checked })}
              className="w-5 h-5 accent-[#D4AF37]"
            />
          </label>
          <div className="p-4 bg-surface-dim rounded-xl">
            <p className="text-xs text-on-surface-subtle">
              When disabled, the Simulator tab will be hidden and all simulator API endpoints will return 403.
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon="settings_ethernet" title="Real Device Integration" description="Connect to real Sani hardware devices">
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface-dim rounded-xl">
            <div>
              <p className="text-sm font-semibold text-brand-primary">Enable Real Device Data</p>
              <p className="text-xs text-on-surface-subtle">Poll real device data from the configured provider</p>
            </div>
            <input
              type="checkbox"
              checked={settings.device_real_data_enabled}
              onChange={(e) => setSettings({ ...settings, device_real_data_enabled: e.target.checked })}
              className="w-5 h-5 accent-[#D4AF37]"
            />
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Driver</label>
              <select
                value={settings.device_real_driver}
                onChange={(e) => setSettings({ ...settings, device_real_driver: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-outline rounded-xl text-sm focus:border-brand-accent focus:outline-none transition-colors bg-white"
              >
                <option value="sani">Sani (HTTP)</option>
                <option value="mqtt">MQTT</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <InputField
              label="API Endpoint"
              value={settings.device_real_api_endpoint}
              onChange={(e) => setSettings({ ...settings, device_real_api_endpoint: e.target.value })}
              placeholder="https://api.sani-devices.com"
            />
            <InputField
              label="API Key"
              type="password"
              value={settings.device_real_api_key}
              onChange={(e) => setSettings({ ...settings, device_real_api_key: e.target.value })}
              placeholder="Your Sani API key"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={!settings.device_real_api_endpoint || !settings.device_real_api_key || connectionStatus === 'testing'}
              className="px-4 py-2 border-2 border-outline rounded-xl text-sm font-semibold text-on-surface-variant hover:border-brand-accent transition-all disabled:opacity-50"
            >
              {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {connectionStatus === 'success' && (
              <span className="text-sm text-green-600 font-semibold">Connected</span>
            )}
            {connectionStatus === 'failed' && (
              <span className="text-sm text-red-600 font-semibold">Connection failed</span>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon="hub" title="MQTT Broker" description="Subscribe to real-time Sani device telemetry via MQTT">
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface-dim rounded-xl">
            <div>
              <p className="text-sm font-semibold text-brand-primary">Enable MQTT Listener</p>
              <p className="text-xs text-on-surface-subtle">Run a long-lived MQTT subscriber to receive real-time device data</p>
            </div>
            <input
              type="checkbox"
              checked={settings.device_mqtt_enabled}
              onChange={(e) => setSettings({ ...settings, device_mqtt_enabled: e.target.checked })}
              className="w-5 h-5 accent-[#D4AF37]"
            />
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InputField
              label="Broker Host"
              value={settings.device_mqtt_broker_host}
              onChange={(e) => setSettings({ ...settings, device_mqtt_broker_host: e.target.value })}
              placeholder="mqtt.sani-devices.com"
            />
            <InputField
              label="Port"
              type="number"
              value={String(settings.device_mqtt_broker_port)}
              onChange={(e) => setSettings({ ...settings, device_mqtt_broker_port: parseInt(e.target.value) || 1883 })}
              placeholder="1883"
            />
            <InputField
              label="Topic Prefix"
              value={settings.device_mqtt_topic_prefix}
              onChange={(e) => setSettings({ ...settings, device_mqtt_topic_prefix: e.target.value })}
              placeholder="sani"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InputField
              label="Username (optional)"
              value={settings.device_mqtt_username}
              onChange={(e) => setSettings({ ...settings, device_mqtt_username: e.target.value })}
              placeholder="MQTT username"
            />
            <InputField
              label="Password (optional)"
              type="password"
              value={settings.device_mqtt_password}
              onChange={(e) => setSettings({ ...settings, device_mqtt_password: e.target.value })}
              placeholder="MQTT password"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testMqttConnection}
              disabled={!settings.device_mqtt_broker_host || mqttStatus === 'testing'}
              className="px-4 py-2 border-2 border-outline rounded-xl text-sm font-semibold text-on-surface-variant hover:border-brand-accent transition-all disabled:opacity-50"
            >
              {mqttStatus === 'testing' ? 'Testing...' : 'Test MQTT Connection'}
            </button>
            {mqttStatus === 'success' && (
              <span className="text-sm text-green-600 font-semibold">Connected</span>
            )}
            {mqttStatus === 'failed' && (
              <span className="text-sm text-red-600 font-semibold">Connection failed</span>
            )}
          </div>

          <div className="p-4 bg-surface-dim rounded-xl">
            <p className="text-xs text-on-surface-subtle">
              The MQTT listener subscribes to <code className="text-brand-primary bg-[#d5d8cd] px-1 rounded">{settings.device_mqtt_topic_prefix || 'sani'}/+/telemetry</code> and <code className="text-brand-primary bg-[#d5d8cd] px-1 rounded">{settings.device_mqtt_topic_prefix || 'sani'}/+/status</code> topics. Run <code className="text-brand-primary bg-[#d5d8cd] px-1 rounded">php artisan devices:mqtt-listen</code> to start the listener (requires Supervisor or similar process manager).
            </p>
          </div>
        </div>
      </SettingsCard>

      <div>
        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </div>
  );
}
