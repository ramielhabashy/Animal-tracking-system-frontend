import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';

export default function ActivateDevicePage() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [ordersRes, subRes] = await Promise.all([
        apiFetch('/api/checkout/orders'),
        apiFetch('/api/subscription/current'),
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders((d.data || []).filter(o => o.payment_status === 'paid' && !o.activated_at));
      }
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!deviceId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a device ID or serial number' });
      return;
    }

    setActivating(true);
    setMessage(null);

    try {
      const res = await apiFetch('/api/checkout/activate-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId.trim() }),
      });

      if (res.ok) {
        setActivated(true);
        setMessage({ type: 'success', text: 'Device activated! Your subscription has started.' });
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Activation failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActivating(false);
    }
  };

  const hasPendingOrders = orders.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-brand-primary">Activate Device</h2>
        <p className="text-on-surface-variant mt-1">
          {activated
            ? 'Your subscription is now active!'
            : 'Enter your device serial number to activate your subscription.'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <MaterialSymbol
            icon={message.type === 'success' ? 'check_circle' : 'error'}
            size={20}
            className={message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}
          />
          <span className="font-medium">{message.text}</span>
          {!activated && <button onClick={() => setMessage(null)} className="ml-auto"><MaterialSymbol icon="close" size={18} /></button>}
        </div>
      )}

      {hasPendingOrders && !activated && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high">
          <h3 className="font-bold text-brand-primary mb-3">Pending Activations</h3>
          <p className="text-sm text-on-surface-subtle mb-4">
            You have {orders.length} paid subscription(s) awaiting device activation.
          </p>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-surface-light rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-brand-primary">{order.tier?.name || 'Subscription'}</p>
                    <p className="text-xs text-on-surface-subtle">Order #{order.id} — {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">Paid</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded font-medium ${
                    order.shipping_status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.shipping_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {order.shipping_status === 'delivered' ? 'Delivered' :
                     order.shipping_status === 'shipped' ? 'Shipped' : 'Awaiting shipment'}
                  </span>
                  {order.tracking_number && (
                    <span className="text-on-surface-subtle">Tracking: #{order.tracking_number}</span>
                  )}
                  {!order.shipping_status || order.shipping_status === 'pending' ? (
                    <span className="text-on-surface-subtle">— Device not yet shipped</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activated && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high">
          <div className="mb-4">
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Device ID / Serial Number</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Enter the device serial number from your GPS tracker"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#002819]/20"
              autoFocus
            />
          </div>
          <button
            onClick={handleActivate}
            disabled={activating || !hasPendingOrders}
            className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-brand-secondary transition disabled:opacity-50"
          >
            {activating ? 'Activating...' : 'Activate Device & Start Subscription'}
          </button>
        </div>
      )}

      {!hasPendingOrders && !activated && (
        <div className="bg-brand-accent/10 border border-brand-accent rounded-2xl p-6 text-center">
          <MaterialSymbol icon="info" size={48} className="text-brand-accent mx-auto mb-3" />
          <h3 className="text-lg font-bold text-brand-primary mb-2">No Pending Orders</h3>
          <p className="text-on-surface-variant mb-4">
            You don't have any paid subscriptions waiting for activation.
            Subscribe to a plan first, then activate your device here.
          </p>
          <button
            onClick={() => navigate('/subscription/select')}
            className="py-3 px-6 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
          >
            View Plans
          </button>
        </div>
      )}

      {activated && (
        <div className="text-center space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="py-4 px-8 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
