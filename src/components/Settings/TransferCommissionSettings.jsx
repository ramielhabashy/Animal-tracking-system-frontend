import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { ToggleSwitch, InputField, SelectField, SaveButton } from './InputField';

function CommissionTypeSection({ type, label, icon, data, onChange }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2 flex items-center gap-2">
        <MaterialSymbol icon={icon} size={18} className="text-brand-accent" />
        {label}
      </h4>
      <SelectField
        label="Commission Type"
        value={data.type}
        onChange={(v) => onChange({ ...data, type: v })}
        options={[
          { value: 'percentage', label: 'Percentage (%)' },
          { value: 'fixed', label: 'Fixed Amount (SAR)' },
        ]}
      />
      {data.type === 'percentage' ? (
        <InputField
          label="Commission Percentage"
          type="number"
          value={data.percentage}
          onChange={(v) => onChange({ ...data, percentage: parseFloat(v) || 0 })}
          min={0}
          max={100}
          step={0.5}
        />
      ) : (
        <InputField
          label="Fixed Commission Amount (SAR)"
          type="number"
          value={data.fixed}
          onChange={(v) => onChange({ ...data, fixed: parseFloat(v) || 0 })}
          min={0}
          step={10}
        />
      )}
    </div>
  );
}

export default function TransferCommissionSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();
  const isRtl = dir === 'rtl';
  const [settings, setSettings] = useState({
    enabled: false,
    manual: { type: 'percentage', percentage: 5, fixed: 0 },
    auction: { type: 'percentage', percentage: 5, fixed: 0 },
    stats: {
      total_manual_transfers: 0,
      total_auction_transfers: 0,
      total_commission: 0,
      paid_commission: 0,
      pending_commission: 0,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/transfer-commission');
      if (res.ok) {
        const d = await res.json();
        if (d.data) setSettings(d.data);
      }
    } catch (e) {
      console.error('Failed to load transfer commission settings:', e);
    }
  };

  const handleSave = async () => {
    setSaving?.(true);
    try {
      const res = await apiFetch('/api/admin/settings/transfer-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage?.({ type: 'success', text: 'Transfer commission settings saved' });
      } else {
        const d = await res.json();
        setMessage?.({ type: 'error', text: d.message || 'Failed to save' });
      }
    } catch (e) {
      setMessage?.({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving?.(false);
    }
  };

  const fmt = (v) => {
    const n = parseFloat(v) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <SettingsCard
      icon="swap_horiz"
      title="Transfer Commission"
      description="Configure platform commission on animal ownership transfers"
    >
      <div className="space-y-6">
        <ToggleSwitch
          label="Enable Transfer Commission"
          checked={settings.enabled}
          onChange={(v) => setSettings({ ...settings, enabled: v })}
        />

        {settings.enabled && (
          <div className="space-y-8 pt-2">
            <CommissionTypeSection
              type="manual"
              label="Manual Transfers"
              icon="person"
              data={settings.manual}
              onChange={(v) => setSettings({ ...settings, manual: v })}
            />
            <CommissionTypeSection
              type="auction"
              label="Auction Transfers"
              icon="gavel"
              data={settings.auction}
              onChange={(v) => setSettings({ ...settings, auction: v })}
            />
          </div>
        )}

        {settings.stats && (
          <div className="space-y-4 pt-4 border-t border-surface-high">
            <h4 className="text-sm font-bold text-brand-primary">Transfer Statistics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-surface-light rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-primary">{settings.stats.total_manual_transfers || 0}</p>
                <p className="text-xs text-on-surface-subtle mt-1">Manual Transfers</p>
              </div>
              <div className="bg-brand-accent/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#B8860B]">{settings.stats.total_auction_transfers || 0}</p>
                <p className="text-xs text-[#B8860B] mt-1">Auction Transfers</p>
              </div>
              <div className="bg-surface-light rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-primary">{fmt(settings.stats.total_commission)}</p>
                <p className="text-xs text-on-surface-subtle mt-1">Total Commission (SAR)</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{fmt(settings.stats.paid_commission)}</p>
                <p className="text-xs text-green-600 mt-1">Paid (SAR)</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{fmt(settings.stats.pending_commission)}</p>
                <p className="text-xs text-amber-600 mt-1">Pending (SAR)</p>
              </div>
            </div>
          </div>
        )}

        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </SettingsCard>
  );
}
