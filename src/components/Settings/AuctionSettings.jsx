import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { ToggleSwitch, InputField, SaveButton } from './InputField';

export default function AuctionSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();
  const isRtl = dir === 'rtl';
  const [settings, setSettings] = useState({
    auto_approve: false,
    payment_expiry_hours: 24,
    second_winner_enabled: true,
    stats: { total_sold: 0, pending_payments: 0, auction_transfers: 0 },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/auction');
      if (res.ok) {
        const d = await res.json();
        if (d.data) setSettings(d.data);
      }
    } catch (e) {
      console.error('Failed to load auction settings:', e);
    }
  };

  const handleSave = async () => {
    setSaving?.(true);
    try {
      const res = await apiFetch('/api/admin/settings/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage?.({ type: 'success', text: 'Auction settings saved' });
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
      icon="gavel"
      title="Auction Settings"
      description="Configure auction platform behavior and payment flow"
    >
      <div className="space-y-8">
        {/* Approval */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Approval</h4>
          <div className="space-y-2">
            <ToggleSwitch
              label="Auto-approve Auctions"
              checked={settings.auto_approve}
              onChange={(v) => setSettings({ ...settings, auto_approve: v })}
            />
            <p className="text-xs text-on-surface-subtle mt-1">
              When enabled, auctions go live immediately without admin approval. When disabled, admin must approve each auction before it goes live.
            </p>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Payment</h4>
          <InputField
            label="Payment Expiry (hours)"
            type="number"
            value={settings.payment_expiry_hours}
            onChange={(e) => setSettings({ ...settings, payment_expiry_hours: parseInt(e.target.value) || 24 })}
            min={1}
            max={168}
          />
          <p className="text-xs text-on-surface-subtle -mt-3">
            How many hours the winner has to complete payment before the auction is marked as expired. Default: 24 hours.
          </p>

          <div className="space-y-2 pt-2">
            <ToggleSwitch
              label="Auto-promote Second Winner"
              checked={settings.second_winner_enabled}
              onChange={(v) => setSettings({ ...settings, second_winner_enabled: v })}
            />
            <p className="text-xs text-on-surface-subtle mt-1">
              When enabled, if the winner fails to pay, the second-highest bidder is automatically promoted. When disabled, the auction is marked as ended.
            </p>
          </div>
        </div>

        {/* Stats */}
        {settings.stats && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-brand-primary border-b border-surface-high pb-2">Overview</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-light rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-primary">{settings.stats.total_sold || 0}</p>
                <p className="text-xs text-on-surface-subtle mt-1">Sold Auctions</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{settings.stats.pending_payments || 0}</p>
                <p className="text-xs text-amber-600 mt-1">Pending Payments</p>
              </div>
              <div className="bg-brand-accent/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#B8860B]">{settings.stats.auction_transfers || 0}</p>
                <p className="text-xs text-[#B8860B] mt-1">Auction Transfers</p>
              </div>
            </div>
          </div>
        )}

        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </SettingsCard>
  );
}
