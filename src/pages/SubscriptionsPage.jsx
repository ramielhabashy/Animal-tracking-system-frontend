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
  const { t, dir } = useI18n();
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

  const [activeTab, setActiveTab] = useState('plans');

  const [statusFilter, setStatusFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    if (isAdmin) fetchOwners();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'reports') {
      fetchStats();
    }
  }, [activeTab]);

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

  const handleAdminSetTier = async (userId, tierId) => {
    if (!confirm('Change this user\'s subscription tier?')) return;

    try {
      const response = await apiFetch(`/api/subscription/admin/set-tier/${userId}/${tierId}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subscription tier updated successfully' });
        fetchData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to update tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update tier' });
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
    if (rangeStart && sub.created_at) {
      const subDate = new Date(sub.created_at);
      if (subDate < rangeStart) return false;
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
        aVal = a.created_at || '';
        bVal = b.created_at || '';
        break;
      case 'renewal_date':
        aVal = a.renewal_at || '';
        bVal = b.renewal_at || '';
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
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
          {currentSubscription && limits && (
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
                    Trial period ends on {new Date(currentSubscription.trial_ends_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pricing Cards */}
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
                    {isCurrentTier ? (
                      <>
                        {currentSubscription && !isFree && (
                          <button
                            onClick={handleCancel}
                            disabled={actionLoading === 'cancel'}
                            className="w-full py-3 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                          </button>
                        )}
                      </>
                    ) : isLowerTier ? (
                      <button
                        onClick={() => handleDowngrade(tier)}
                        disabled={actionLoading === tier.id}
                        className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === tier.id ? 'Processing...' : 'Downgrade'}
                      </button>
                    ) : (
                      <button
                        onClick={() => isCurrentTier ? null : handleUpgrade(tier)}
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
          {/* Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-bold text-[#002819]">{allSubscriptions.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Subs</p>
              <p className="text-2xl font-bold text-emerald-600">{allSubscriptions.filter(s => s.status === 'active').length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Payments</p>
              <p className="text-2xl font-bold text-amber-600">{allSubscriptions.filter(s => s.status === 'pending_payment').length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{allSubscriptions.filter(s => s.status === 'cancelled').length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">MRR</p>
              <p className="text-2xl font-bold text-[#002819]">{formatCurrency(allSubscriptions.reduce((sum, s) => sum + (s.status === 'active' ? (parseFloat(s.tier?.price_monthly) || 0) : 0), 0))}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002819]/20"
                >
                  <option value="All">All</option>
                  <option value="active">Active</option>
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
                {sortedSubscriptions.length} subscriber{sortedSubscriptions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('user')}>
                      <div className="flex items-center">
                        User
                        <SortIcon field="user" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('tier')}>
                      <div className="flex items-center">
                        Tier
                        <SortIcon field="tier" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('start_date')}>
                      <div className="flex items-center">
                        Start Date
                        <SortIcon field="start_date" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('renewal_date')}>
                      <div className="flex items-center">
                        Renewal Date
                        <SortIcon field="renewal_date" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('billing_cycle')}>
                      <div className="flex items-center">
                        Billing Cycle
                        <SortIcon field="billing_cycle" />
                      </div>
                    </th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Payment Method</th>
                    <th className="text-start py-3 px-4 text-sm font-bold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                          {sub.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.renewal_at ? new Date(sub.renewal_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.billing_cycle || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sub.payment_method || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => e.target.value && handleAdminSetTier(sub.user_id, e.target.value)}
                            value={sub.tier_id}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#002819]/20"
                          >
                            <option value="">Change tier...</option>
                            {tiers.map((tier) => (
                              <option key={tier.id} value={tier.id}>{tier.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAdminSetTier(sub.user_id, tiers.find(t => t.slug === 'free')?.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel subscription"
                          >
                            <MaterialSymbol icon="cancel" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">No subscribers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              {/* Summary Metric Cards */}
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

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Distribution - Donut */}
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

                {/* Subscription Growth - Trend Line */}
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

                {/* Revenue Over Time - Bar Chart */}
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

                {/* Payment Methods */}
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
                              <div
                                key={i}
                                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: ['#002819', '#D4AF37', '#3B82F6', '#8B5CF6', '#10B981'][i % 5],
                                }}
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

              {/* Recent Subscriptions */}
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
                              {sub.status?.replace('_', ' ') || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {sub.created_at || sub.date ? new Date(sub.created_at || sub.date).toLocaleDateString() : '-'}
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
