import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../utils/api';

export default function ActivationWidget() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await apiFetch('/api/checkout/orders');
      if (res.ok) {
        const d = await res.json();
        setPendingOrders((d.data || []).filter(o => o.payment_status === 'paid' && !o.activated_at));
      }
    } catch (e) {
      console.error('Failed to fetch pending activations:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-5">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (pendingOrders.length === 0) return null;

  return (
    <div className="card p-5 bg-gradient-to-br from-brand-accent/10 to-[#735C00]/10 border border-brand-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
            <MaterialSymbol icon="power_settings_new" size={22} className="text-brand-accent" />
          </div>
          <div>
            <h3 className="font-bold text-brand-primary text-sm">Device Activation</h3>
            <p className="text-xs text-on-surface-subtle">{pendingOrders.length} pending</p>
          </div>
        </div>
        <Link
          to="/activate-device"
          className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-secondary transition"
        >
          Activate
        </Link>
      </div>
      <div className="space-y-2">
        {pendingOrders.slice(0, 3).map((order) => (
          <div key={order.id} className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
            <div>
              <p className="text-sm font-semibold text-brand-primary">{order.tier?.name || 'Subscription'}</p>
              <p className="text-xs text-on-surface-subtle">Order #{order.id}</p>
            </div>
            <span className="text-emerald-600 text-xs font-bold">Paid</span>
          </div>
        ))}
        {pendingOrders.length > 3 && (
          <p className="text-xs text-center text-on-surface-subtle">+{pendingOrders.length - 3} more</p>
        )}
      </div>
    </div>
  );
}
