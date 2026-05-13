import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

function BarChart({ data, height = 200, color = '#002819', maxValue, labelKey }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(20, Math.min(60, 600 / data.length - 8));

  return (
    <div className="flex items-end gap-2 h-full pt-6" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
            <span className="text-[10px] font-bold text-[#002819] mb-1">{d.value}</span>
            <div
              className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: d.color || color,
                maxWidth: barWidth,
              }}
            />
            <span className="text-[9px] text-[#717973] mt-2 truncate w-full text-center font-medium">
              {d.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, total, size = 160 }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="transparent" stroke="#eeeee9" strokeWidth="3.5" />
        {segments.map((seg, i) => {
          const dashLength = (seg.value / 100) * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          return seg.value > 0 ? (
            <circle
              key={i}
              cx="18" cy="18" r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="3.5"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700"
            />
          ) : null;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-[#002819]">{total}</span>
        <span className="text-[9px] uppercase font-bold text-[#717973] tracking-widest">subs</span>
      </div>
    </div>
  );
}

function TrendChart({ data, height = 200, valueKey = 'value', color = '#002819' }) {
  if (!data || data.length === 0) return <div className="text-center py-12 text-[#717973] text-sm">No data</div>;

  const values = data.map(d => d[valueKey] || 0);
  const max = Math.max(...values, 1);
  const padding = 30;
  const chartWidth = 1000;
  const chartHeight = 100;
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (chartWidth - 2 * padding),
    y: chartHeight - ((d[valueKey] || 0) / max) * (chartHeight - 10),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${chartHeight} L${points[0].x},${chartHeight} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#trendFill)`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
        {points.filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="absolute -bottom-6 w-full flex justify-between text-[10px] text-[#717973] font-bold uppercase tracking-widest px-1">
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { t, dir, locale } = useI18n();
  const isRtl = dir === 'rtl';
  const [tiers, setTiers] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const isAdmin = user?.role === 'Admin';

  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingTierChanges, setPendingTierChanges] = useState({});
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [paymentRefInput, setPaymentRefInput] = useState('');

  const [activeTab, setActiveTab] = useState('plans');

  const [statusFilter, setStatusFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [paymentDateFilter, setPaymentDateFilter] = useState('All');
  const [paymentSortField, setPaymentSortField] = useState(null);
  const [paymentSortDir, setPaymentSortDir] = useState('asc');
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [bankTransferFile, setBankTransferFile] = useState(null);
  const [bankTransferLoading, setBankTransferLoading] = useState(false);
  const [ownerPaymentMethod, setOwnerPaymentMethod] = useState('');
  const [ownerPaymentRef, setOwnerPaymentRef] = useState('');

  const [showPlanPaymentModal, setShowPlanPaymentModal] = useState(false);
  const [planTargetTier, setPlanTargetTier] = useState(null);
  const [planAction, setPlanAction] = useState('upgrade');
  const [planPaymentMethod, setPlanPaymentMethod] = useState('card');
  const [planCardNumber, setPlanCardNumber] = useState('');
  const [planCardExpiry, setPlanCardExpiry] = useState('');
  const [planCardCvc, setPlanCardCvc] = useState('');
  const [planTransferFile, setPlanTransferFile] = useState(null);
  const [planProcessing, setPlanProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    if (isAdmin) fetchOwners();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'reports') {
      fetchStats();
    }
    if (isAdmin && activeTab === 'subscribers') {
      fetchPendingPayments();
    }
    if (!isAdmin && activeTab === 'billing') {
      fetchPaymentHistory();
      if (currentSubscription) {
        setOwnerPaymentMethod(currentSubscription.payment_method || '');
        setOwnerPaymentRef(currentSubscription.payment_reference || '');
      }
    }
  }, [activeTab, currentSubscription]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch('/api/subscription/admin/stats');
      if (res.ok) {
        const data = await res.json();
        const raw = data.data || data;

        if (raw.tier_distribution && Array.isArray(raw.tier_distribution)) {
          raw.tier_distribution = raw.tier_distribution.map(t => ({
            ...t,
            count: t.subscriber_count || 0,
          }));
        }

        if (raw.payment_methods && !Array.isArray(raw.payment_methods)) {
          raw.payment_methods = Object.entries(raw.payment_methods).map(([method, count]) => ({
            method,
            count,
          }));
        }

        if (raw.recent_subscriptions && Array.isArray(raw.recent_subscriptions)) {
          raw.recent_subscriptions = raw.recent_subscriptions.map(sub => ({
            ...sub,
            user: { name: sub.user_name || 'Unknown', email: sub.user_email || '' },
            tier: { name: sub.tier_name || 'N/A', slug: (sub.tier_name || '').toLowerCase() },
            amount: sub.amount || null,
          }));
        }

        setStats(raw);
      }
    } catch (error) {
      console.error('Failed to fetch subscription stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const res = await apiFetch('/api/users?per_page=100');
      if (res.ok) {
        const data = await res.json();
        setOwners(data.data?.filter(u => u.role === 'Owner') || []);
      }
    } catch (error) {
      console.error('Failed to fetch owners:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [tiersRes, subscriptionRes] = await Promise.all([
        apiFetch('/api/subscription/tiers'),
        apiFetch(`/api/subscription/current${selectedOwnerId ? `?user_id=${selectedOwnerId}` : ''}`),
      ]);

      if (tiersRes.ok) {
        const data = await tiersRes.json();
        setTiers(data.data || []);
      }

      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json();
        setCurrentSubscription(data.data);
        setLimits(data.limits);
      }

      if (isAdmin) {
        const subsRes = await apiFetch('/api/subscription/admin/subscriptions');
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          setAllSubscriptions(subsData.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const res = await apiFetch('/api/subscription/admin/pending-payments');
      if (res.ok) {
        const data = await res.json();
        setPendingPayments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending payments:', error);
    }
  };

  const handleApprovePayment = async (subscription) => {
    if (!confirm(`Approve payment for ${subscription.user?.name || 'this user'}?`)) return;
    try {
      const res = await apiFetch(`/api/subscription/admin/approve-payment/${subscription.id}`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment approved, subscription activated' });
        fetchData();
        fetchPendingPayments();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to approve payment' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to approve payment' });
    }
  };

  const handleRejectPayment = async (subscription) => {
    if (!confirm(`Reject payment from ${subscription.user?.name || 'this user'}?`)) return;
    try {
      const res = await apiFetch(`/api/subscription/admin/reject-payment/${subscription.id}`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment rejected' });
        fetchData();
        fetchPendingPayments();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to reject payment' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reject payment' });
    }
  };

  const handleAdminSetTier = async (userId, tierId) => {
    if (!confirm('Change this user\'s subscription tier?')) return;

    try {
      const response = await apiFetch(`/api/subscription/admin/set-tier/${userId}/${tierId}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription tier updated successfully' });
        setPendingTierChanges(prev => ({ ...prev, [userId]: null }));
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to update tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update tier' });
    }
  };

  const handleSubscribe = async (tier) => {
    if (!confirm(`Subscribe to ${tier.name} plan?`)) return;

    setActionLoading(tier.id);
    setMessage(null);

    try {
      const response = await apiFetch(`/api/subscription/subscribe/${tier.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Successfully subscribed to ${tier.name}!` });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to subscribe' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to subscribe' });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchPaymentHistory = async () => {
    setPaymentHistoryLoading(true);
    try {
      const res = await apiFetch('/api/subscription/history');
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!confirm('Renew your subscription for the next billing period?')) return;
    setActionLoading('renew');
    setMessage(null);
    try {
      const response = await apiFetch('/api/subscription/renew', { method: 'POST' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription renewed successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to renew' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to renew subscription' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOwnerReactivate = async () => {
    if (!confirm('Reactivate your subscription?')) return;
    setActionLoading('reactivate');
    setMessage(null);
    try {
      const response = await apiFetch('/api/subscription/reactivate', { method: 'POST' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription reactivated successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to reactivate' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reactivate subscription' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBankTransferUpload = async () => {
    if (!bankTransferFile) {
      setMessage({ type: 'error', text: 'Please select a PDF file to upload' });
      return;
    }
    if (!currentSubscription?.tier?.id) {
      setMessage({ type: 'error', text: 'No active subscription found' });
      return;
    }
    setBankTransferLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('tier_id', currentSubscription.tier.id);
      formData.append('payment_proof', bankTransferFile);
      const response = await apiFetch('/api/subscription/bank-transfer', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Bank transfer proof uploaded. Awaiting admin approval.' });
        setBankTransferFile(null);
        fetchData();
        fetchPaymentHistory();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload bank transfer proof' });
    } finally {
      setBankTransferLoading(false);
    }
  };

  const handleOwnerUpdatePaymentInfo = async () => {
    if (!currentSubscription?.id) {
      setMessage({ type: 'error', text: 'No subscription record found' });
      return;
    }
    try {
      const response = await apiFetch(`/api/subscription/admin/update/${currentSubscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: ownerPaymentMethod || null,
          payment_reference: ownerPaymentRef || null,
        }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment info updated successfully' });
        fetchData();
      } else {
        const d = await response.json();
        setMessage({ type: 'error', text: d.message || 'Failed to update' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update payment info' });
    }
  };

  const openPlanPaymentModal = (tier, action) => {
    setPlanTargetTier(tier);
    setPlanAction(action);
    setPlanPaymentMethod('card');
    setPlanCardNumber('');
    setPlanCardExpiry('');
    setPlanCardCvc('');
    setPlanTransferFile(null);
    setMessage(null);
    setShowPlanPaymentModal(true);
  };

  const handlePlanCardPayment = async () => {
    if (!planCardNumber || !planCardExpiry || !planCardCvc) {
      setMessage({ type: 'error', text: 'Please fill all card details' });
      return;
    }
    setPlanProcessing(true);
    setMessage(null);
    try {
      const paymentRes = await apiFetch('/api/subscription/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: planTargetTier.id,
          card_number: planCardNumber,
          expiry: planCardExpiry,
          cvc: planCardCvc,
        }),
      });
      if (paymentRes.ok) {
        setMessage({ type: 'success', text: `Payment successful! ${planAction === 'upgrade' ? 'Upgraded' : 'Downgraded'} to ${planTargetTier.name}.` });
        setShowPlanPaymentModal(false);
        fetchData();
      } else {
        const d = await paymentRes.json();
        setMessage({ type: 'error', text: d.message || 'Payment failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Payment processing error' });
    } finally {
      setPlanProcessing(false);
    }
  };

  const handlePlanBankTransfer = async () => {
    if (!planTransferFile) {
      setMessage({ type: 'error', text: 'Please select a PDF proof of payment' });
      return;
    }
    setPlanProcessing(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('tier_id', planTargetTier.id);
      formData.append('payment_proof', planTransferFile);
      formData.append('payment_method', 'bank_transfer');
      const btRes = await apiFetch('/api/subscription/bank-transfer', {
        method: 'POST',
        body: formData,
      });
      if (btRes.ok) {
        setMessage({ type: 'success', text: `Bank transfer proof submitted. Awaiting admin approval for ${planAction} to ${planTargetTier.name}.` });
        setShowPlanPaymentModal(false);
        fetchData();
      } else {
        const d = await btRes.json();
        setMessage({ type: 'error', text: d.message || 'Bank transfer upload failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Upload error' });
    } finally {
      setPlanProcessing(false);
    }
  };

  const handleUpgrade = async (tier) => {
    if (!confirm(`Upgrade to ${tier.name}?`)) return;

    setActionLoading(tier.id);
    setMessage(null);

    try {
      const response = await apiFetch(`/api/subscription/upgrade/${tier.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Successfully upgraded to ${tier.name}!` });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to upgrade' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upgrade' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async (tier) => {
    if (!confirm(`Downgrade to ${tier.name}? You may lose access to some features.`)) return;

    setActionLoading(tier.id);
    setMessage(null);

    try {
      const response = await apiFetch(`/api/subscription/downgrade/${tier.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Successfully downgraded to ${tier.name}` });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to downgrade' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to downgrade' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setActionLoading('cancel');
    setMessage(null);

    try {
      const response = await apiFetch('/api/subscription/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription cancelled successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to cancel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel subscription' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseSubscription = async (userId) => {
    if (!confirm('Pause this subscription?')) return;
    try {
      const response = await apiFetch(`/api/subscription/admin/pause/${userId}`, { method: 'POST' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription paused successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to pause' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to pause subscription' });
    }
  };

  const handleReactivateSubscription = async (userId) => {
    if (!confirm('Reactivate this subscription?')) return;
    try {
      const response = await apiFetch(`/api/subscription/admin/reactivate/${userId}`, { method: 'POST' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription reactivated successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to reactivate' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reactivate subscription' });
    }
  };

  const handleCancelSubscription = async (userId) => {
    if (!confirm('Cancel this subscription? User will be moved to Free tier.')) return;
    try {
      const response = await apiFetch(`/api/subscription/admin/cancel/${userId}`, { method: 'POST' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription cancelled successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to cancel' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel subscription' });
    }
  };

  const handleUpdatePaymentInfo = async (subscriptionId, data) => {
    if (!subscriptionId) {
      setMessage({ type: 'error', text: 'No subscription record found for this user' });
      return;
    }
    try {
      const response = await apiFetch(`/api/subscription/admin/update/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment info updated successfully' });
        fetchData();
      } else {
        const d = await response.json();
        setMessage({ type: 'error', text: d.message || 'Failed to update payment info' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update payment info' });
    }
  };

  const handleChangeBillingCycle = async (subId, currentCycle) => {
    const newCycle = currentCycle === 'yearly' ? 'monthly' : 'yearly';
    if (!confirm(`Change billing cycle to ${newCycle}?`)) return;
    try {
      const response = await apiFetch(`/api/subscription/admin/billing-cycle/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_cycle: newCycle }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `Billing cycle changed to ${newCycle}` });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to change billing cycle' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change billing cycle' });
    }
  };

  const handleDeleteTier = async (tier) => {
    if (!confirm(`Delete ${tier.name} tier? Users on this tier will be moved to Free.`)) return;

    try {
      const response = await apiFetch(`/api/subscription/admin/tiers/${tier.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Tier deleted successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to delete tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete tier' });
    }
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const tierData = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      price_monthly: parseFloat(formData.get('price_monthly')) || 0,
      price_yearly: parseFloat(formData.get('price_yearly')) || 0,
      trial_days: parseInt(formData.get('trial_days')) || 0,
      max_animals: parseInt(formData.get('max_animals')) || 0,
      max_devices: parseInt(formData.get('max_devices')) || 0,
      max_users: parseInt(formData.get('max_users')) || 0,
      has_geofencing: formData.get('has_geofencing') === 'on',
      has_auctions: formData.get('has_auctions') === 'on',
      has_advanced_reports: formData.get('has_advanced_reports') === 'on',
      has_api_access: formData.get('has_api_access') === 'on',
      sort_order: parseInt(formData.get('sort_order')) || 10,
      is_active: true,
    };

    try {
      const url = editingTier
        ? `/api/subscription/admin/tiers/${editingTier.id}`
        : '/api/subscription/admin/tiers';
      const method = editingTier ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Tier ${editingTier ? 'updated' : 'created'} successfully` });
        setShowTierModal(false);
        setEditingTier(null);
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save tier' });
    }
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setShowTierModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCurrentTierIndex = () => {
    if (!currentSubscription?.tier) return -1;
    return tiers.findIndex(t => t.id === currentSubscription.tier.id);
  };

  const currentTierIndex = getCurrentTierIndex();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handlePaymentSort = (field) => {
    if (paymentSortField === field) {
      setPaymentSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPaymentSortField(field);
      setPaymentSortDir('asc');
    }
  };

  const exportToCsv = (data, filename, columns) => {
    const header = columns.map(c => `"${c.label}"`).join(',');
    const rows = data.map(row =>
      columns.map(c => `"${(c.accessor(row) ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkCancel = async () => {
    if (!confirm(`Cancel subscriptions for ${selectedSubs.length} selected user(s)?`)) return;
    for (const userId of selectedSubs) {
      await apiFetch(`/api/subscription/admin/cancel/${userId}`, { method: 'POST' });
    }
    setMessage({ type: 'success', text: `${selectedSubs.length} subscription(s) cancelled` });
    setSelectedSubs([]);
    fetchData();
  };

  const handleBulkPause = async () => {
    if (!confirm(`Pause subscriptions for ${selectedSubs.length} selected user(s)?`)) return;
    for (const userId of selectedSubs) {
      await apiFetch(`/api/subscription/admin/pause/${userId}`, { method: 'POST' });
    }
    setMessage({ type: 'success', text: `${selectedSubs.length} subscription(s) paused` });
    setSelectedSubs([]);
    fetchData();
  };

  const handleBulkReactivate = async () => {
    if (!confirm(`Reactivate subscriptions for ${selectedSubs.length} selected user(s)?`)) return;
    for (const userId of selectedSubs) {
      await apiFetch(`/api/subscription/admin/reactivate/${userId}`, { method: 'POST' });
    }
    setMessage({ type: 'success', text: `${selectedSubs.length} subscription(s) reactivated` });
    setSelectedSubs([]);
    fetchData();
  };

  const handleBulkExportSubs = () => {
    exportToCsv(sortedSubscriptions, 'subscribers-export.csv', [
      { label: 'Name', accessor: r => r.user?.name || '' },
      { label: 'Email', accessor: r => r.user?.email || '' },
      { label: 'Tier', accessor: r => r.tier?.name || '' },
      { label: 'Status', accessor: r => r.status || '' },
      { label: 'Billing Cycle', accessor: r => r.billing_cycle || '' },
      { label: 'Payment Method', accessor: r => r.payment_method || '' },
      { label: 'Start Date', accessor: r => formatDate(r.started_at || r.created_at) },
      { label: 'Renewal Date', accessor: r => formatDate(r.ends_at || r.renewal_at || r.next_billing_date) },
      { label: 'Animals Used', accessor: r => r.usage?.animals?.used ?? 0 },
      { label: 'Animals Max', accessor: r => r.usage?.animals?.max ?? 0 },
      { label: 'Devices Used', accessor: r => r.usage?.devices?.used ?? 0 },
      { label: 'Devices Max', accessor: r => r.usage?.devices?.max ?? 0 },
      { label: 'Team Used', accessor: r => r.usage?.team?.used ?? 0 },
      { label: 'Team Max', accessor: r => r.usage?.team?.max ?? 0 },
    ]);
  };

  const handleBulkExportPayments = () => {
    const filtered = allSubscriptions.filter(sub => {
      if (paymentMethodFilter !== 'All' && sub.payment_method !== paymentMethodFilter) return false;
      if (paymentStatusFilter !== 'All' && sub.status !== paymentStatusFilter) return false;
      if (paymentDateFilter !== 'All') {
        const days = parseInt(paymentDateFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const subDate = new Date(sub.created_at || sub.started_at);
        if (subDate < cutoff) return false;
      }
      if (paymentSearch) {
        const q = paymentSearch.toLowerCase();
        const name = sub.user?.name?.toLowerCase() || '';
        const email = sub.user?.email?.toLowerCase() || '';
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
    exportToCsv(filtered, 'payments-export.csv', [
      { label: 'Owner', accessor: r => r.user?.name || '' },
      { label: 'Email', accessor: r => r.user?.email || '' },
      { label: 'Plan', accessor: r => r.tier?.name || '' },
      { label: 'Amount', accessor: r => r.tier?.price_monthly ? formatCurrency(r.tier.price_monthly) : '' },
      { label: 'Payment Method', accessor: r => r.payment_method || '' },
      { label: 'Reference', accessor: r => r.payment_reference || '' },
      { label: 'Status', accessor: r => r.status || '' },
      { label: 'Start Date', accessor: r => formatDate(r.started_at || r.created_at) },
      { label: 'Renewal Date', accessor: r => formatDate(r.ends_at || r.renewal_at || r.next_billing_date) },
    ]);
  };

  const getDateRangeStart = () => {
    if (dateRangeFilter === 'All') return null;
    const days = parseInt(dateRangeFilter);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const filteredSubscriptions = allSubscriptions.filter(sub => {
    if (statusFilter !== 'All' && sub.status !== statusFilter) return false;
    if (tierFilter !== 'All' && sub.tier?.name !== tierFilter && sub.tier?.slug !== tierFilter) return false;
    const rangeStart = getDateRangeStart();
    const subDateVal = sub.created_at || sub.started_at;
    if (rangeStart && subDateVal) {
      const subDate = new Date(subDateVal);
      if (subDate < rangeStart) return false;
    }
    if (subscriberSearch) {
      const q = subscriberSearch.toLowerCase();
      const name = sub.user?.name?.toLowerCase() || '';
      const email = sub.user?.email?.toLowerCase() || '';
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    if (!sortField) return 0;
    let aVal, bVal;
    switch (sortField) {
      case 'user':
        aVal = a.user?.name || '';
        bVal = b.user?.name || '';
        break;
      case 'tier':
        aVal = a.tier?.name || '';
        bVal = b.tier?.name || '';
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      case 'start_date':
        aVal = a.created_at || a.started_at || '';
        bVal = b.created_at || b.started_at || '';
        break;
      case 'renewal_date':
        aVal = a.renewal_at || a.ends_at || '';
        bVal = b.renewal_at || b.ends_at || '';
        break;
      case 'billing_cycle':
        aVal = a.billing_cycle || '';
        bVal = b.billing_cycle || '';
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />;
    return (
      <MaterialSymbol
        icon={sortDir === 'asc' ? 'expand_less' : 'expand_more'}
        size={16}
        className="text-[#002819] ml-1"
      />
    );
  };

  const normalizeStatus = (status) => {
    if (status === 'changed_by_admin') return 'cancelled';
    return status;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'paused': return 'bg-sky-100 text-sky-700';
      case 'cancelled':
      case 'changed_by_admin': return 'bg-red-100 text-red-700';
      case 'pending_payment': return 'bg-amber-100 text-amber-700';
      case 'past_due': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTierBadgeColor = (slug) => {
    switch (slug) {
      case 'free': return 'bg-gray-100 text-gray-700';
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'professional': return 'bg-purple-100 text-purple-700';
      case 'enterprise': return 'bg-amber-100 text-amber-700';
      default: return 'bg-[#D4AF37]/20 text-[#735c00]';
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Choose the perfect plan for your livestock management needs</p>
        </div>
        {isAdmin && owners.length > 0 && (
          <select
            value={selectedOwnerId || ''}
            onChange={(e) => {
              setSelectedOwnerId(e.target.value || null);
              fetchData();
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Owners</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'plans'
              ? 'border-[#002819] text-[#002819]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Plans
        </button>
        {!isAdmin && (
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'billing'
                ? 'border-[#002819] text-[#002819]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Billing
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'subscribers'
                ? 'border-[#002819] text-[#002819]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Subscribers
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-[#002819] text-[#002819]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'reports'
                ? 'border-[#002819] text-[#002819]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reports
          </button>
        )}
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          {/* Current Usage */}
          {!isAdmin && currentSubscription && limits && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#002819] mb-4">Current Usage</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Animals', used: limits.animals.used, max: limits.animals.max, icon: 'pets' },
                  { label: 'Devices', used: limits.devices.used, max: limits.devices.max, icon: 'sensors' },
                  { label: 'Team Members', used: limits.users.used, max: limits.users.max, icon: 'group' },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-[#f4f4ef] rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MaterialSymbol icon={item.icon} size={20} className="text-[#735c00]" />
                      <span className="text-sm font-medium text-gray-600">{item.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#002819]">{item.used}</span>
                      <span className="text-gray-500">/ {item.max === 0 ? 'Unlimited' : item.max}</span>
                    </div>
                    {item.max > 0 && (
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(item.used / item.max) > 0.9 ? 'bg-red-500' : (item.used / item.max) > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min((item.used / item.max) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {currentSubscription.trial_ends_at && new Date(currentSubscription.trial_ends_at) > new Date() && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <MaterialSymbol icon="info" size={16} className="inline mr-1" />
                    Trial period ends on {formatDate(currentSubscription.trial_ends_at)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pricing Cards */}
          {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier, index) => {
              const isCurrentTier = currentSubscription?.tier?.id === tier.id;
              const isLowerTier = currentTierIndex > index;
              const isHigherTier = currentTierIndex < index;
              const isFree = tier.slug === 'free';

              return (
                <div
                  key={tier.id}
                  className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 transition-all ${
                    isCurrentTier
                      ? 'border-[#D4AF37] ring-4 ring-[#D4AF37]/20'
                      : isHigherTier
                        ? 'border-emerald-200 hover:border-emerald-400'
                        : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-[#D4AF37] text-white text-xs font-bold rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {tier.trial_days > 0 && !isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                        {tier.trial_days} Day Trial
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-[#002819]">{tier.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-[#002819]">{formatPrice(tier.price_monthly)}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                    {tier.price_yearly > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Save {formatPrice(tier.price_monthly * 12 - tier.price_yearly)}/year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {[
                      { label: `${tier.max_animals === 0 ? 'Unlimited' : tier.max_animals} Animals`, icon: 'pets' },
                      { label: `${tier.max_devices === 0 ? 'Unlimited' : tier.max_devices} Devices`, icon: 'sensors' },
                      { label: `${tier.max_users === 0 ? 'Unlimited' : tier.max_users} Users`, icon: 'group' },
                      tier.has_geofencing && { label: 'Geofencing', icon: 'fence' },
                      tier.has_auctions && { label: 'Auctions', icon: 'gavel' },
                      tier.has_advanced_reports && { label: 'Advanced Reports', icon: 'analytics' },
                      tier.has_api_access && { label: 'API Access', icon: 'api' },
                    ].filter(Boolean).map((feature, i) => (
                    <li key={i} className={`flex items-center gap-2 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <MaterialSymbol icon={feature.icon} size={16} className="text-emerald-500" />
                      {feature.label}
                    </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    {isCurrentTier ? null : isLowerTier ? (
                      <button
                        onClick={() => handleDowngrade(tier)}
                        disabled={actionLoading === tier.id}
                        className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === tier.id ? 'Processing...' : 'Downgrade'}
                      </button>
                    ) : (
                      <button
                        onClick={() => isCurrentTier ? null : (isFree || !currentSubscription ? handleUpgrade(tier) : openPlanPaymentModal(tier, 'upgrade'))}
                        disabled={actionLoading === tier.id}
                        className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition-colors disabled:opacity-50"
                      >
                        {actionLoading === tier.id ? 'Processing...' : isFree && !currentSubscription ? 'Subscribe Free' : 'Upgrade'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Admin Section - Tier Management only on Plans tab */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#002819]">Manage Subscription Tiers</h2>
                  <button
                    onClick={() => { setEditingTier(null); setShowTierModal(true); }}
                    className="px-4 py-2 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition-colors flex items-center gap-2"
                  >
                    <MaterialSymbol icon="add" size={18} />
                    Add New Tier
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Name</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Slug</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Price (Mo/Yr)</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Limits</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Features</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((tier) => (
                        <tr key={tier.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#002819]">{tier.name}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{tier.slug}</td>
                          <td className="py-3 px-4 text-sm">
                            {formatPrice(tier.price_monthly)} / {formatPrice(tier.price_yearly)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {tier.max_animals === 0 ? 'Unlimited' : tier.max_animals} A / {tier.max_devices === 0 ? 'Unlimited' : tier.max_devices} D / {tier.max_users === 0 ? 'Unlimited' : tier.max_users} U
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex gap-1 flex-wrap">
                              {tier.has_geofencing && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Geo</span>}
                              {tier.has_auctions && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Auc</span>}
                              {tier.has_advanced_reports && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Rep</span>}
                              {tier.has_api_access && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">API</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditTier(tier)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <MaterialSymbol icon="edit" size={18} />
                              </button>
                              {tier.slug !== 'free' && (
                                <button
                                  onClick={() => handleDeleteTier(tier)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <MaterialSymbol icon="delete" size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && isAdmin && (
        <div className="space-y-6">
          {/* Pending Payments Section */}
          {pendingPayments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MaterialSymbol icon="hourglass_bottom" size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800">Pending Payment Approvals</h3>
                  <p className="text-sm text-amber-600">{pendingPayments.length} subscription{pendingPayments.length !== 1 ? 's' : ''} awaiting review</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-start py-2 px-3 text-xs font-bold text-amber-700 uppercase">User</th>
                      <th className="text-start py-2 px-3 text-xs font-bold text-amber-700 uppercase">Tier</th>
                      <th className="text-start py-2 px-3 text-xs font-bold text-amber-700 uppercase">Proof</th>
                      <th className="text-start py-2 px-3 text-xs font-bold text-amber-700 uppercase">Date</th>
                      <th className="text-start py-2 px-3 text-xs font-bold text-amber-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((sub) => (
                      <tr key={sub.id} className="border-b border-amber-100 hover:bg-amber-50/50">
                        <td className="py-2 px-3">
                          <span className="font-medium text-amber-900 text-sm">{sub.user?.name || 'Unknown'}</span>
                          <span className="text-xs text-amber-600 block">{sub.user?.email}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-sm font-semibold text-amber-800">{sub.tier?.name || 'N/A'}</span>
                        </td>
                        <td className="py-2 px-3">
                          {sub.payment_reference ? (
                            <a
                              href={sub.payment_reference}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <MaterialSymbol icon="description" size={14} />
                              View Proof
                            </a>
                          ) : <span className="text-xs text-amber-500">No file</span>}
                        </td>
                        <td className="py-2 px-3 text-xs text-amber-700">
                          {formatDate(sub.created_at)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprovePayment(sub)}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                            >
                              <MaterialSymbol icon="check" size={14} className="inline mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(sub)}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                              <MaterialSymbol icon="close" size={14} className="inline mr-1" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {sortedSubscriptions.length === allSubscriptions.length ? 'Total Owners' : 'Showing'}
              </p>
              <p className="text-2xl font-bold text-[#002819]">
                {sortedSubscriptions.length}
                {sortedSubscriptions.length !== allSubscriptions.length && (
                  <span className="text-sm font-normal text-gray-400 ml-1">/ {allSubscriptions.length}</span>
                )}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Devices</p>
              <p className="text-2xl font-bold text-emerald-600">{allSubscriptions.reduce((s, sub) => s + (sub.usage?.devices?.used || 0), 0)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Animals</p>
              <p className="text-2xl font-bold text-blue-600">{allSubscriptions.reduce((s, sub) => s + (sub.usage?.animals?.used || 0), 0)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Team</p>
              <p className="text-2xl font-bold text-purple-600">{allSubscriptions.reduce((s, sub) => s + (sub.usage?.team?.used || 0), 0)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
              <p className={`text-2xl font-bold ${pendingPayments.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {pendingPayments.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">MRR</p>
              <p className="text-2xl font-bold text-[#002819]">{formatCurrency(allSubscriptions.reduce((sum, sub) => sum + (parseFloat(sub.tier?.price_monthly) || 0), 0))}</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <MaterialSymbol icon="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                  >
                    <option value="All">All</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="past_due">Past Due</option>
                  </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All</option>
                  {tiers.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
              <div className="text-xs text-gray-400 self-center ml-auto">
                {sortedSubscriptions.length} owner{sortedSubscriptions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#002819]">All Subscribers</h3>
              <div className="flex items-center gap-2">
                {selectedSubs.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 mr-2">{selectedSubs.length} selected</span>
                    <button onClick={handleBulkPause} className="px-2 py-1 text-xs font-bold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50">Pause</button>
                    <button onClick={handleBulkReactivate} className="px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50">Reactivate</button>
                    <button onClick={handleBulkCancel} className="px-2 py-1 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Cancel</button>
                  </div>
                )}
                <button onClick={handleBulkExportSubs} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <MaterialSymbol icon="download" size={14} />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-start py-3 px-2 text-sm">
                      <input type="checkbox"
                        checked={selectedSubs.length > 0 && selectedSubs.length === sortedSubscriptions.length}
                        onChange={(e) => { if (e.target.checked) { setSelectedSubs(sortedSubscriptions.map(s => s.user_id)); } else { setSelectedSubs([]); } }}
                        className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]" />
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('user')}>
                      <div className="flex items-center">
                        User
                        <SortIcon field="user" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('tier')}>
                      <div className="flex items-center">
                        {t('team.tier') || 'Tier'}
                        <SortIcon field="tier" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        {t('common.status') || 'Status'}
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('start_date')}>
                      <div className="flex items-center">
                        {t('subscription.startDate')}
                        <SortIcon field="start_date" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('renewal_date')}>
                      <div className="flex items-center">
                        {t('subscription.renewalDate')}
                        <SortIcon field="renewal_date" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('billing_cycle')}>
                      <div className="flex items-center">
                        {t('subscription.billing')}
                        <SortIcon field="billing_cycle" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">{t('subscription.devices')}</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">{t('subscription.animals')}</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">{t('subscription.team')}</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">{t('subscription.payment')}</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">{t('subscription.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubscriptions.map((sub) => {
                    const usage = sub.usage || {};
                    const animals = usage.animals || {};
                    const devices = usage.devices || {};
                    const team = usage.team || {};
                    return (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <input type="checkbox"
                          checked={selectedSubs.includes(sub.user_id)}
                          onChange={(e) => { if (e.target.checked) { setSelectedSubs(prev => [...prev, sub.user_id]); } else { setSelectedSubs(prev => prev.filter(id => id !== sub.user_id)); } }}
                          className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#002819]">{sub.user?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{sub.user?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierBadgeColor(sub.tier?.slug)}`}>
                          {sub.tier?.name || 'No Tier'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(sub.status)}`}>
                          {sub.status === 'paused' ? t('subscription.statusPaused') : normalizeStatus(sub.status)?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(sub.started_at || sub.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(sub.ends_at || sub.renewal_at || sub.next_billing_date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.billing_cycle ? sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#002819]">{devices.used ?? '-'}</span>
                          <span className="text-gray-400">/</span>
                          <span className={devices.max > 0 && devices.used > devices.max ? 'text-red-600 font-bold' : 'text-gray-500'}>
                            {devices.max === 0 ? '∞' : devices.max ?? '-'}
                          </span>
                        </div>
                        {devices.max > 0 && (
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                            <div className={`h-full rounded-full ${devices.used > devices.max ? 'bg-red-500' : devices.used / devices.max > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((devices.used / devices.max) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#002819]">{animals.used ?? '-'}</span>
                          <span className="text-gray-400">/</span>
                          <span className={animals.max > 0 && animals.used > animals.max ? 'text-red-600 font-bold' : 'text-gray-500'}>
                            {animals.max === 0 ? '∞' : animals.max ?? '-'}
                          </span>
                        </div>
                        {animals.max > 0 && (
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                            <div className={`h-full rounded-full ${animals.used > animals.max ? 'bg-red-500' : animals.used / animals.max > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((animals.used / animals.max) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#002819]">{team.used ?? '-'}</span>
                          <span className="text-gray-400">/</span>
                          <span className={team.max > 0 && team.used > team.max ? 'text-red-600 font-bold' : 'text-gray-500'}>
                            {team.max === 0 ? '∞' : team.max ?? '-'}
                          </span>
                        </div>
                        {team.max > 0 && (
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                            <div className={`h-full rounded-full ${team.used > team.max ? 'bg-red-500' : team.used / team.max > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((team.used / team.max) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.payment_method || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setEditingSubscriber(sub);
                              setPaymentMethodInput(sub.payment_method || '');
                              setPaymentRefInput(sub.payment_reference || '');
                              setShowSubscriberModal(true);
                            }}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-[#002819] hover:bg-gray-50 transition-colors"
                          >
                            <MaterialSymbol icon="edit_square" size={14} className="inline mr-1" />
                            Edit
                          </button>
                          {sub.status === 'active' && (
                            <button
                              onClick={() => handlePauseSubscription(sub.user_id)}
                              className="px-2 py-1 text-xs font-bold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 whitespace-nowrap"
                            >
                              <MaterialSymbol icon="pause_circle" size={14} className="inline mr-1" />
                              Pause
                            </button>
                          )}
                          {sub.status === 'paused' && (
                            <button
                              onClick={() => handleReactivateSubscription(sub.user_id)}
                              className="px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 whitespace-nowrap"
                            >
                              <MaterialSymbol icon="play_circle" size={14} className="inline mr-1" />
                              Reactivate
                            </button>
                          )}
                          {sub.status === 'cancelled' && (
                            <button
                              onClick={() => handleReactivateSubscription(sub.user_id)}
                              className="px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 whitespace-nowrap"
                            >
                              <MaterialSymbol icon="play_circle" size={14} className="inline mr-1" />
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {sortedSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-gray-500">
                        {allSubscriptions.length === 0 ? 'No owners with subscriptions yet' : 'No owners match the current filters'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && isAdmin && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Payments</p>
              <p className="text-2xl font-bold text-[#002819]">{allSubscriptions.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(allSubscriptions.reduce((sum, sub) => sum + (parseFloat(sub.tier?.price_monthly) || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{allSubscriptions.filter(s => s.status === 'active').length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{allSubscriptions.filter(s => s.status === 'pending_payment').length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{allSubscriptions.filter(s => s.status === 'cancelled').length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <MaterialSymbol icon="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search by owner name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Method</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All</option>
                  <option value="card">Credit Card</option>
                  <option value="stripe">Stripe</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending_payment">Pending Payment</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Date</label>
                <select
                  value={paymentDateFilter}
                  onChange={(e) => setPaymentDateFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#002819]">Payment Records</h3>
              <div className="flex items-center gap-2">
                {selectedPayments.length > 0 && (
                  <span className="text-xs text-gray-500">{selectedPayments.length} selected</span>
                )}
                <button
                  onClick={handleBulkExportPayments}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                >
                  <MaterialSymbol icon="download" size={14} />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-start py-3 px-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPayments.length > 0 && selectedPayments.length === allSubscriptions.filter(sub => {
                          if (paymentMethodFilter !== 'All' && sub.payment_method !== paymentMethodFilter) return false;
                          if (paymentStatusFilter !== 'All' && sub.status !== paymentStatusFilter) return false;
                          if (paymentDateFilter !== 'All') {
                            const days = parseInt(paymentDateFilter);
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - days);
                            const subDate = new Date(sub.created_at || sub.started_at);
                            if (subDate < cutoff) return false;
                          }
                          if (paymentSearch) {
                            const q = paymentSearch.toLowerCase();
                            const name = sub.user?.name?.toLowerCase() || '';
                            const email = sub.user?.email?.toLowerCase() || '';
                            if (!name.includes(q) && !email.includes(q)) return false;
                          }
                          return true;
                        }).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayments(allSubscriptions.map(s => s.user_id));
                          } else {
                            setSelectedPayments([]);
                          }
                        }}
                        className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                      />
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('owner')}>
                      <div className="flex items-center">
                        Owner
                        {paymentSortField === 'owner' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('amount')}>
                      <div className="flex items-center">
                        Plan / Amount
                        {paymentSortField === 'amount' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('method')}>
                      <div className="flex items-center">
                        Payment Method
                        {paymentSortField === 'method' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Reference</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('start_date')}>
                      <div className="flex items-center">
                        Start Date
                        {paymentSortField === 'start_date' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('renewal_date')}>
                      <div className="flex items-center">
                        Renewal Date
                        {paymentSortField === 'renewal_date' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handlePaymentSort('status')}>
                      <div className="flex items-center">
                        Status
                        {paymentSortField === 'status' ? <MaterialSymbol icon={paymentSortDir === 'asc' ? 'expand_less' : 'expand_more'} size={16} className="text-[#002819] ml-1" /> : <MaterialSymbol icon="unfold_more" size={16} className="text-gray-400 ml-1" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = allSubscriptions.filter(sub => {
                      if (paymentMethodFilter !== 'All' && sub.payment_method !== paymentMethodFilter) return false;
                      if (paymentStatusFilter !== 'All' && sub.status !== paymentStatusFilter) return false;
                      if (paymentDateFilter !== 'All') {
                        const days = parseInt(paymentDateFilter);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - days);
                        const subDate = new Date(sub.created_at || sub.started_at);
                        if (subDate < cutoff) return false;
                      }
                      if (paymentSearch) {
                        const q = paymentSearch.toLowerCase();
                        const name = sub.user?.name?.toLowerCase() || '';
                        const email = sub.user?.email?.toLowerCase() || '';
                        if (!name.includes(q) && !email.includes(q)) return false;
                      }
                      return true;
                    });
                    const sorted = [...filtered].sort((a, b) => {
                      if (!paymentSortField) return 0;
                      let aVal, bVal;
                      switch (paymentSortField) {
                        case 'owner': aVal = a.user?.name || ''; bVal = b.user?.name || ''; break;
                        case 'amount': aVal = parseFloat(a.tier?.price_monthly) || 0; bVal = parseFloat(b.tier?.price_monthly) || 0; break;
                        case 'method': aVal = a.payment_method || ''; bVal = b.payment_method || ''; break;
                        case 'start_date': aVal = a.started_at || a.created_at || ''; bVal = b.started_at || b.created_at || ''; break;
                        case 'renewal_date': aVal = a.ends_at || a.renewal_at || a.next_billing_date || ''; bVal = b.ends_at || b.renewal_at || b.next_billing_date || ''; break;
                        case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
                        default: return 0;
                      }
                      if (aVal < bVal) return paymentSortDir === 'asc' ? -1 : 1;
                      if (aVal > bVal) return paymentSortDir === 'asc' ? 1 : -1;
                      return 0;
                    });
                    return sorted.map((sub) => (
                      <tr key={sub.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={selectedPayments.includes(sub.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayments(prev => [...prev, sub.user_id]);
                              } else {
                                setSelectedPayments(prev => prev.filter(id => id !== sub.user_id));
                              }
                            }}
                            className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#002819]">{sub.user?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{sub.user?.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#002819]">{sub.tier?.name || 'N/A'}</div>
                          <div className="text-sm text-emerald-600 font-medium">
                            {sub.tier?.price_monthly ? formatCurrency(sub.tier.price_monthly) + '/mo' : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-sm text-gray-700">
                            {sub.payment_method ? sub.payment_method.replace('_', ' ') : <span className="text-gray-400 italic">Not set</span>}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-500 font-mono max-w-[120px] block truncate" title={sub.payment_reference || ''}>
                            {sub.payment_reference || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(sub.started_at || sub.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(sub.ends_at || sub.renewal_at || sub.next_billing_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(sub.status)}`}>
                            {normalizeStatus(sub.status)?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                  {(() => {
                    const filtered = allSubscriptions.filter(sub => {
                      if (paymentMethodFilter !== 'All' && sub.payment_method !== paymentMethodFilter) return false;
                      if (paymentStatusFilter !== 'All' && sub.status !== paymentStatusFilter) return false;
                      if (paymentDateFilter !== 'All') {
                        const days = parseInt(paymentDateFilter);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - days);
                        const subDate = new Date(sub.created_at || sub.started_at);
                        if (subDate < cutoff) return false;
                      }
                      if (paymentSearch) {
                        const q = paymentSearch.toLowerCase();
                        const name = sub.user?.name?.toLowerCase() || '';
                        const email = sub.user?.email?.toLowerCase() || '';
                        if (!name.includes(q) && !email.includes(q)) return false;
                      }
                      return true;
                    });
                    return filtered.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-gray-500">No payment records found</td></tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-gray-400 text-center">
              {(() => {
                const filtered = allSubscriptions.filter(sub => {
                  if (paymentMethodFilter !== 'All' && sub.payment_method !== paymentMethodFilter) return false;
                  if (paymentStatusFilter !== 'All' && sub.status !== paymentStatusFilter) return false;
                  if (paymentDateFilter !== 'All') {
                    const days = parseInt(paymentDateFilter);
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - days);
                    const subDate = new Date(sub.created_at || sub.started_at);
                    if (subDate < cutoff) return false;
                  }
                  if (paymentSearch) {
                    const q = paymentSearch.toLowerCase();
                    const name = sub.user?.name?.toLowerCase() || '';
                    const email = sub.user?.email?.toLowerCase() || '';
                    if (!name.includes(q) && !email.includes(q)) return false;
                  }
                  return true;
                });
                return `Showing ${filtered.length} of ${allSubscriptions.length} records`;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab (Owner) */}
      {activeTab === 'billing' && !isAdmin && (
        <div className="space-y-6">
          {/* Current Plan & Payment Method */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002819] mb-4">Current Plan</h3>
              {currentSubscription ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Plan</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierBadgeColor(currentSubscription.tier?.slug)}`}>
                      {currentSubscription.tier?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(currentSubscription.status)}`}>
                      {normalizeStatus(currentSubscription.status)?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Billing Cycle</span>
                    <span className="text-sm font-medium text-[#002819] capitalize">{currentSubscription.billing_cycle || 'Monthly'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Started</span>
                    <span className="text-sm font-medium text-[#002819]">{formatDate(currentSubscription.started_at || currentSubscription.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Renewal</span>
                    <span className="text-sm font-medium text-[#002819]">{formatDate(currentSubscription.ends_at || currentSubscription.renewal_at || currentSubscription.next_billing_date)}</span>
                  </div>
                  {currentSubscription.tier?.price_monthly > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-700">Amount</span>
                      <span className="text-lg font-bold text-[#002819]">{formatCurrency(currentSubscription.tier.price_monthly)}<span className="text-sm font-normal text-gray-500">/{currentSubscription.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span></span>
                    </div>
                  )}
                  <div className="pt-4 space-y-2">
                    {currentSubscription.status === 'active' && (
                      <button
                        onClick={handleRenew}
                        disabled={actionLoading === 'renew'}
                        className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'renew' ? 'Renewing...' : 'Renew Subscription'}
                      </button>
                    )}
                    {(currentSubscription.status === 'paused' || currentSubscription.status === 'cancelled') && (
                      <button
                        onClick={handleOwnerReactivate}
                        disabled={actionLoading === 'reactivate'}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                      </button>
                    )}
                    {(currentSubscription.status === 'none' || !currentSubscription.status || currentSubscription.status === 'pending') && (
                      <button
                        onClick={() => setActiveTab('plans')}
                        className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition-colors"
                      >
                        Subscribe to a Plan
                      </button>
                    )}
                    {currentSubscription.status === 'pending_payment' && (
                      <button
                        disabled
                        className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm cursor-not-allowed"
                      >
                        Payment Pending Approval
                      </button>
                    )}
                    {currentSubscription.status === 'past_due' && (
                      <button
                        onClick={() => setActiveTab('plans')}
                        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                      >
                        Update Payment
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <MaterialSymbol icon="credit_card_off" size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No active subscription</p>
                  <button onClick={() => setActiveTab('plans')} className="mt-4 px-4 py-2 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b]">
                    Subscribe Now
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002819] mb-4">Payment Method</h3>
              {currentSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-600 w-24">Method:</label>
                    <select
                      value={ownerPaymentMethod}
                      onChange={(e) => setOwnerPaymentMethod(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                    >
                      <option value="">Not set</option>
                      <option value="card">Credit Card</option>
                      <option value="stripe">Stripe</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-600 w-24">Reference:</label>
                    <input
                      type="text"
                      value={ownerPaymentRef}
                      onChange={(e) => setOwnerPaymentRef(e.target.value)}
                      placeholder="Transaction ID or receipt"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                    />
                  </div>
                  <button
                    onClick={handleOwnerUpdatePaymentInfo}
                    className="px-4 py-2 bg-[#002819] text-white rounded-lg text-xs font-bold hover:bg-[#06402b]"
                  >
                    Save Payment Info
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">No subscription to configure</div>
              )}
            </div>
          </div>

          {/* Bank Transfer Upload */}
          {currentSubscription && currentSubscription.tier?.price_monthly > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002819] mb-4">Bank Transfer Payment</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload your bank transfer receipt (PDF) to complete payment for the current plan.
                An admin will review and approve your payment.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setBankTransferFile(e.target.files[0] || null)}
                  className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#002819] file:text-white hover:file:bg-[#06402b]"
                />
                <button
                  onClick={handleBankTransferUpload}
                  disabled={bankTransferLoading || !bankTransferFile}
                  className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {bankTransferLoading ? 'Uploading...' : 'Upload Proof'}
                </button>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#002819] mb-4">Payment History</h3>
            {paymentHistoryLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-4 border-[#002819] border-t-transparent rounded-full" />
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Plan</th>
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Status</th>
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Method</th>
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Amount</th>
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Start Date</th>
                      <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((sub, i) => (
                      <tr key={sub.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierBadgeColor(sub.tier_slug)}`}>
                            {sub.tier_name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(sub.status)}`}>
                            {normalizeStatus(sub.status)?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">{sub.payment_method || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium text-[#002819]">{sub.amount ? formatCurrency(sub.amount) : '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(sub.started_at || sub.created_at)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(sub.ended_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <MaterialSymbol icon="receipt_long" size={32} className="mx-auto mb-2 text-gray-300" />
                No payment history
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && isAdmin && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MaterialSymbol icon="group" size={18} className="text-emerald-600" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Subscribers</p>
                  </div>
                  <p className="text-2xl font-bold text-[#002819]">{stats.active_subscribers || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MaterialSymbol icon="payments" size={18} className="text-[#002819]" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Revenue</p>
                  </div>
                  <p className="text-2xl font-bold text-[#002819]">{formatCurrency(stats.mrr || 0)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MaterialSymbol icon="person_add" size={18} className="text-blue-600" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New This Month</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.new_this_month || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MaterialSymbol icon="person_remove" size={18} className="text-red-600" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Churned This Month</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{stats.churned_this_month || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MaterialSymbol icon="hourglass_bottom" size={18} className="text-amber-600" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Payments</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending_payments || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-[#002819] mb-4">Tier Distribution</h3>
                  {stats.tier_distribution && stats.tier_distribution.length > 0 ? (
                    <div className="flex items-center gap-8">
                      <DonutChart
                        segments={stats.tier_distribution.map((t, i) => ({
                          value: parseFloat(((t.count / Math.max(...stats.tier_distribution.map(x => x.count), 1)) * 100).toFixed(1)),
                          color: ['#002819', '#D4AF37', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][i % 6],
                        }))}
                        total={stats.tier_distribution.reduce((sum, t) => sum + t.count, 0)}
                      />
                      <div className="space-y-3 flex-1">
                        {stats.tier_distribution.map((t, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#002819', '#D4AF37', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][i % 6] }} />
                              <span className="text-sm font-semibold text-gray-700">{t.name || t.tier_name || `Tier ${i + 1}`}</span>
                            </div>
                            <span className="text-sm font-bold text-[#002819]">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No tier distribution data</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-[#002819] mb-4">Subscription Growth</h3>
                  {stats.growth_over_time && stats.growth_over_time.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-gray-600">New this month: {stats.new_this_month || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-xs font-semibold text-gray-600">Churned this month: {stats.churned_this_month || 0}</span>
                        </div>
                      </div>
                      <div className="h-48 relative pb-8">
                        <TrendChart
                          data={stats.growth_over_time.map(g => ({ label: g.month, value: g.new || 0 }))}
                          color="#10B981"
                          height={200}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-2">New subscriptions over time</div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No growth data available</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-[#002819] mb-4">Revenue Over Time</h3>
                  {stats.revenue_over_time && stats.revenue_over_time.length > 0 ? (
                    <div className="h-48">
                      <BarChart
                        data={stats.revenue_over_time.map(r => ({
                          label: r.label || r.month || '',
                          value: r.value || r.revenue || 0,
                          color: '#D4AF37',
                        }))}
                        color="#D4AF37"
                        height={200}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No revenue data available</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-[#002819] mb-4">Payment Methods</h3>
                  {stats.payment_methods && stats.payment_methods.length > 0 ? (
                    <div className="space-y-4">
                      {stats.payment_methods.map((pm, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <MaterialSymbol
                              icon={pm.method?.includes('card') ? 'credit_card' : pm.method?.includes('bank') ? 'account_balance' : 'payments'}
                              size={20}
                              className="text-gray-500"
                            />
                            <span className="text-sm font-medium text-gray-700 capitalize">{pm.method || pm.name || `Method ${i + 1}`}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-[#002819]">{pm.count || pm.subscribers || 0}</span>
                            <span className="text-xs text-gray-500 w-16 text-right">{pm.percentage ? `${pm.percentage}%` : ''}</span>
                          </div>
                        </div>
                      ))}
                      {stats.payment_methods.reduce((sum, pm) => sum + (pm.count || pm.subscribers || 0), 0) > 0 && (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          {stats.payment_methods.map((pm, i) => {
                            const total = stats.payment_methods.reduce((s, p) => s + (p.count || p.subscribers || 0), 0);
                            const pct = ((pm.count || pm.subscribers || 0) / total) * 100;
                            return (
                              <div key={i} className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                                style={{ width: `${pct}%`, backgroundColor: ['#002819', '#D4AF37', '#3B82F6', '#8B5CF6', '#10B981'][i % 5] }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No payment method data</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#002819] mb-4">Recent Subscriptions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">User</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Tier</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Status</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Date</th>
                        <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_subscriptions || []).slice(0, 20).map((sub, i) => (
                        <tr key={sub.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-[#002819]">{sub.user?.name || sub.name || 'Unknown'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierBadgeColor(sub.tier?.slug || sub.tier_name)}`}>
                              {sub.tier?.name || sub.tier_name || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(sub.status)}`}>
                              {normalizeStatus(sub.status)?.replace('_', ' ') || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(sub.created_at || sub.started_at || sub.date)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-[#002819]">
                            {sub.amount ? formatCurrency(sub.amount) : sub.tier?.price_monthly ? formatCurrency(sub.tier.price_monthly) : '-'}
                          </td>
                        </tr>
                      ))}
                      {(!stats.recent_subscriptions || stats.recent_subscriptions.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">No recent subscriptions</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No report data available</div>
          )}
        </div>
      )}

      {/* Subscriber Edit Modal */}
      {showSubscriberModal && editingSubscriber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSubscriberModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#002819]">{editingSubscriber.user?.name || 'Unknown'}</h2>
                <p className="text-sm text-gray-500">{editingSubscriber.user?.email}</p>
              </div>
              <button onClick={() => setShowSubscriberModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={24} />
              </button>
            </div>

            {/* Status & Plan */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Status</p>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getStatusBadgeClass(editingSubscriber.status)}`}>
                  {normalizeStatus(editingSubscriber.status)?.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Current Plan</p>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getTierBadgeColor(editingSubscriber.tier?.slug)}`}>
                  {editingSubscriber.tier?.name || 'No Tier'}
                </span>
              </div>
            </div>

            {/* Usage */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-[#002819] mb-3">Resource Usage</h3>
              <div className="space-y-3">
                {['animals', 'devices', 'team'].map(key => {
                  const u = editingSubscriber.usage?.[key] || {};
                  const pct = u.max > 0 ? Math.min((u.used / u.max) * 100, 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-600">{key}</span>
                        <span className="font-semibold text-[#002819]">{u.used ?? 0} / {u.max === 0 ? '∞' : u.max}</span>
                      </div>
                      {u.max > 0 && (
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Started</p>
                <p className="text-sm font-medium text-[#002819]">{formatDate(editingSubscriber.started_at || editingSubscriber.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Renewal</p>
                <p className="text-sm font-medium text-[#002819]">{formatDate(editingSubscriber.ends_at || editingSubscriber.renewal_at || editingSubscriber.next_billing_date)}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h3 className="text-sm font-bold text-[#002819] mb-3">Payment</h3>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs font-semibold text-gray-600 w-20">Method:</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="">Not set</option>
                  <option value="card">Credit Card</option>
                  <option value="stripe">Stripe</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs font-semibold text-gray-600 w-20">Reference:</label>
                <input
                  type="text"
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder="Transaction ID, receipt #, or notes"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                />
              </div>
              <button
                onClick={() => {
                  handleUpdatePaymentInfo(editingSubscriber.subscription_id, {
                    payment_method: paymentMethodInput || null,
                    payment_reference: paymentRefInput || null,
                  });
                  setShowSubscriberModal(false);
                }}
                className="px-4 py-2 bg-[#002819] text-white rounded-lg text-xs font-bold hover:bg-[#06402b]"
              >
                Save Payment Info
              </button>
            </div>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-[#002819]">Quick Actions</h3>

              {/* Change Tier */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600 w-20">Change Tier:</label>
                <select
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                  value={pendingTierChanges[editingSubscriber.user_id] || editingSubscriber.tier_id}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    setPendingTierChanges(prev => {
                      const next = { ...prev };
                      if (val === null || val === editingSubscriber.tier_id) {
                        delete next[editingSubscriber.user_id];
                      } else {
                        next[editingSubscriber.user_id] = val;
                      }
                      return next;
                    });
                  }}
                >
                  {tiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
                {pendingTierChanges[editingSubscriber.user_id] && (
                  <button
                    onClick={() => handleAdminSetTier(editingSubscriber.user_id, pendingTierChanges[editingSubscriber.user_id])}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Change Billing */}
              {editingSubscriber.billing_cycle && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 w-20">Billing:</label>
                  <span className="text-sm font-medium text-[#002819] capitalize">{editingSubscriber.billing_cycle}</span>
                  <button
                    onClick={() => handleChangeBillingCycle(editingSubscriber.id, editingSubscriber.billing_cycle)}
                    className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Change to {editingSubscriber.billing_cycle === 'yearly' ? 'Monthly' : 'Yearly'}
                  </button>
                </div>
              )}

              {/* Status Actions */}
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-semibold text-gray-600 w-20">Status:</label>
                {editingSubscriber.status === 'active' && (
                  <>
                    <button
                      onClick={() => { handlePauseSubscription(editingSubscriber.user_id); setShowSubscriberModal(false); }}
                      className="px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-bold hover:bg-sky-600"
                    >
                      <MaterialSymbol icon="pause_circle" size={16} className="inline mr-1" />
                      Pause Subscription
                    </button>
                    <button
                      onClick={() => { handleCancelSubscription(editingSubscriber.user_id); setShowSubscriberModal(false); }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                    >
                      <MaterialSymbol icon="cancel" size={16} className="inline mr-1" />
                      Cancel Subscription
                    </button>
                  </>
                )}
                {(editingSubscriber.status === 'paused' || editingSubscriber.status === 'cancelled') && (
                  <button
                    onClick={() => { handleReactivateSubscription(editingSubscriber.user_id); setShowSubscriberModal(false); }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                  >
                    <MaterialSymbol icon="play_circle" size={16} className="inline mr-1" />
                    Reactivate Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Upgrade/Downgrade Payment Modal */}
      {showPlanPaymentModal && planTargetTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPlanPaymentModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#002819]">
                {planAction === 'upgrade' ? 'Upgrade' : 'Downgrade'} to {planTargetTier.name}
              </h2>
              <button onClick={() => setShowPlanPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={24} />
              </button>
            </div>

            {/* Plan Comparison */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentSubscription?.tier && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Current</p>
                  <p className="text-sm font-bold text-[#002819]">{currentSubscription.tier.name}</p>
                  {currentSubscription.tier.price_monthly > 0 && (
                    <p className="text-xs text-gray-500">{formatCurrency(currentSubscription.tier.price_monthly)}/mo</p>
                  )}
                </div>
              )}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-xs font-bold text-emerald-600 uppercase mb-1">New</p>
                <p className="text-sm font-bold text-emerald-700">{planTargetTier.name}</p>
                {planTargetTier.price_monthly > 0 && (
                  <p className="text-xs text-emerald-600">{formatCurrency(planTargetTier.price_monthly)}/mo</p>
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPlanPaymentMethod('card')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                  planPaymentMethod === 'card' ? 'bg-[#002819] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <MaterialSymbol icon="credit_card" size={18} className="inline mr-1" />
                Credit Card
              </button>
              <button
                onClick={() => setPlanPaymentMethod('bank')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                  planPaymentMethod === 'bank' ? 'bg-[#002819] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <MaterialSymbol icon="account_balance" size={18} className="inline mr-1" />
                Bank Transfer
              </button>
            </div>

            {planPaymentMethod === 'card' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={planCardNumber}
                    onChange={e => setPlanCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={planCardExpiry}
                      onChange={e => setPlanCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#002819]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CVC</label>
                    <input
                      type="text"
                      value={planCardCvc}
                      onChange={e => setPlanCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#002819]/20"
                    />
                  </div>
                </div>
                <button
                  onClick={handlePlanCardPayment}
                  disabled={planProcessing}
                  className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition-colors disabled:opacity-50"
                >
                  {planProcessing ? 'Processing...' : `Pay ${formatCurrency(planTargetTier.price_monthly)} & ${planAction === 'upgrade' ? 'Upgrade' : 'Downgrade'}`}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 mb-2 font-bold">Bank Transfer Details</p>
                  <p className="text-xs text-blue-600">Bank: First Abu Dhabi Bank</p>
                  <p className="text-xs text-blue-600">Account: 1234567890</p>
                  <p className="text-xs text-blue-600">IBAN: AE123456789012345678901</p>
                  <p className="text-xs text-blue-600 mt-2">Reference: SUBS-{planTargetTier.id}-{Date.now()}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Upload Payment Proof (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPlanTransferFile(e.target.files[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#002819] file:text-white hover:file:bg-[#06402b]"
                  />
                </div>
                <button
                  onClick={handlePlanBankTransfer}
                  disabled={planProcessing || !planTransferFile}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {planProcessing ? 'Uploading...' : 'Upload Proof & Request Upgrade'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#002819]">
                {editingTier ? 'Edit Tier' : 'Create New Tier'}
              </h2>
              <button onClick={() => { setShowTierModal(false); setEditingTier(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingTier?.name || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={editingTier?.slug || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingTier?.description || ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Price (SAR)</label>
                  <input
                    type="number"
                    name="price_monthly"
                    defaultValue={editingTier?.price_monthly || 0}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Yearly Price (SAR)</label>
                  <input
                    type="number"
                    name="price_yearly"
                    defaultValue={editingTier?.price_yearly || 0}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Trial Days</label>
                  <input
                    type="number"
                    name="trial_days"
                    defaultValue={editingTier?.trial_days || 0}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Animals (0=∞)</label>
                  <input
                    type="number"
                    name="max_animals"
                    defaultValue={editingTier?.max_animals || 0}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Devices (0=∞)</label>
                  <input
                    type="number"
                    name="max_devices"
                    defaultValue={editingTier?.max_devices || 0}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Users (0=∞)</label>
                  <input
                    type="number"
                    name="max_users"
                    defaultValue={editingTier?.max_users || 0}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    defaultValue={editingTier?.sort_order || 10}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002819]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Features</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_geofencing"
                      defaultChecked={editingTier?.has_geofencing}
                      className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                    />
                    <span className="text-sm">Geofencing</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_auctions"
                      defaultChecked={editingTier?.has_auctions}
                      className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                    />
                    <span className="text-sm">Auctions</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_advanced_reports"
                      defaultChecked={editingTier?.has_advanced_reports}
                      className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                    />
                    <span className="text-sm">Advanced Reports</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_api_access"
                      defaultChecked={editingTier?.has_api_access}
                      className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                    />
                    <span className="text-sm">API Access</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition-colors"
                >
                  {editingTier ? 'Update Tier' : 'Create Tier'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTierModal(false); setEditingTier(null); }}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
