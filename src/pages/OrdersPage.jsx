import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';



const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
};

const SHIPPING_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

export default function OrdersPage() {
  return <OrdersPanel />;
}

export function OrdersPanel({ embedded }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState(null);
  const [shippingStatus, setShippingStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await apiFetch('/api/checkout/admin/orders');
      if (res.ok) {
        const d = await res.json();
        setOrders(d.data?.data || d.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/checkout/admin/stats');
      if (res.ok) {
        const d = await res.json();
        setStats(d.data);
      }
    } catch (e) {}
  };

  const handleUpdateOrder = async (order) => {
    const body = {};
    if (shippingStatus) body.shipping_status = shippingStatus;
    if (trackingNumber) body.tracking_number = trackingNumber;
    if (Object.keys(body).length === 0) return;

    try {
      const res = await apiFetch(`/api/checkout/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Order updated' });
        setEditingOrder(null);
        setShippingStatus('');
        setTrackingNumber('');
        fetchOrders();
        fetchStats();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Update failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleApprovePayment = async (order) => {
    try {
      const res = await apiFetch(`/api/checkout/admin/orders/${order.id}/approve-payment`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment approved' });
        fetchOrders();
        fetchStats();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Approval failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleRejectPayment = async (order) => {
    try {
      const res = await apiFetch(`/api/checkout/admin/orders/${order.id}/reject-payment`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment rejected' });
        fetchOrders();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Rejection failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.payment_status === filter);
  const statusCount = (status) => orders.filter(o => o.payment_status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span>Admin</span>
            <span className="mx-2">/</span>
            <span className="text-brand-primary">Orders</span>
          </nav>
          <h2 className="text-3xl font-bold text-brand-primary">Subscription Orders</h2>
          <p className="text-on-surface-variant mt-1">Manage orders, shipping, and payments</p>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <MaterialSymbol icon={message.type === 'success' ? 'check_circle' : 'error'} size={20} />
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <MaterialSymbol icon="close" size={18} />
          </button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Orders', value: stats.total_orders, icon: 'receipt_long' },
            { label: 'Pending Payment', value: stats.pending_payment, icon: 'hourglass_empty' },
            { label: 'Paid', value: stats.paid, icon: 'check_circle' },
            { label: 'Pending Shipment', value: stats.pending_shipment, icon: 'inventory_2' },
            { label: 'Shipped', value: stats.shipped, icon: 'local_shipping' },
            { label: 'Revenue', value: `$${parseFloat(stats.revenue || 0).toLocaleString()}`, icon: 'payments' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-surface-high">
              <div className="flex items-center gap-2 mb-2">
                <MaterialSymbol icon={item.icon} size={18} className="text-brand-accent" />
                <span className="text-xs text-on-surface-subtle">{item.label}</span>
              </div>
              <p className="text-2xl font-bold text-brand-primary">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 bg-surface-light p-1 rounded-xl w-fit">
        {[
          { id: 'all', label: `All (${orders.length})` },
          { id: 'pending', label: `Pending (${statusCount('pending')})` },
          { id: 'paid', label: `Paid (${statusCount('paid')})` },
          { id: 'failed', label: `Failed (${statusCount('failed')})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filter === f.id ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-variant hover:text-brand-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-surface-high overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <MaterialSymbol icon="receipt_long" size={48} className="text-on-surface-subtle mx-auto mb-3" />
            <p className="text-on-surface-variant">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-high">
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">ID</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">User</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Plan</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Amount</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Payment</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Shipping</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Date</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-surface-high last:border-0 hover:bg-brand-light/50">
                    <td className="p-4 font-bold text-brand-primary">#{order.id}</td>
                    <td className="p-4">
                      <p className="font-medium text-brand-primary">{order.user?.name || 'N/A'}</p>
                      <p className="text-xs text-on-surface-subtle">{order.user?.email || ''}</p>
                    </td>
                    <td className="p-4 text-on-surface-variant">{order.tier?.name || 'N/A'}</td>
                    <td className="p-4 font-bold text-brand-primary">${parseFloat(order.amount || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[order.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.payment_status}
                      </span>
                      <p className="text-xs text-on-surface-subtle mt-1 capitalize">{order.payment_method || '-'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${SHIPPING_STYLES[order.shipping_status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.shipping_status}
                      </span>
                      {order.tracking_number && (
                        <p className="text-xs text-on-surface-subtle mt-1">#{order.tracking_number}</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-on-surface-subtle">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {order.payment_method === 'bank_transfer' && (
                          order.payment_reference && order.payment_status === 'pending' && (
                            <a
                              href={order.payment_reference}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition"
                            >
                              View Proof
                            </a>
                          )
                        )}
                        {order.payment_method === 'bank_transfer' && order.payment_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprovePayment(order)}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(order)}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            setShippingStatus(order.shipping_status || 'pending');
                            setTrackingNumber(order.tracking_number || '');
                          }}
                          className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-secondary transition"
                        >
                          Shipping
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-primary">Update Order #{editingOrder.id}</h3>
              <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Shipping Status</label>
                <select
                  value={shippingStatus}
                  onChange={(e) => setShippingStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                >
                  <option value="pending">Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                />
              </div>
              <button
                onClick={() => handleUpdateOrder(editingOrder)}
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
