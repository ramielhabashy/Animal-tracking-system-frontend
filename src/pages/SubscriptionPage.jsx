import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { getPendingSubscription, setPendingSubscription } from '../utils/cookies';

const TIER_COLORS = ['#002819', '#06402B', '#D4AF37', '#002819'];
const TIER_ICONS = ['eco', 'growing', 'stars', 'workspace_premium'];

export default function SubscriptionPage() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const navigate = useNavigate();

  const [tiers, setTiers] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const isFromRegistration = getPendingSubscription();
  const isNewUser = !currentSubscription || currentSubscription?.status === 'none';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tiersRes, subscriptionRes] = await Promise.all([
        apiFetch('/api/subscription/tiers'),
        apiFetch('/api/subscription/current'),
      ]);
      if (tiersRes.ok) {
        const data = await tiersRes.json();
        setTiers(data.data || []);
      }
      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json();
        const sub = data.subscription || data.data;
        setCurrentSubscription(sub);
        setLimits(data.limits);
        if ((sub?.status === 'active' || sub?.status === 'pending_payment') && isFromRegistration) {
          setPendingSubscription(false);
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToCheckout = (tier) => {
    const cycle = tier.is_yearly_only ? 'yearly' : billingCycle;
    navigate(`/checkout?tier_id=${tier.id}&cycle=${cycle}`);
  };

  const handleActivateFreePlan = async (tier) => {
    try {
      const response = await apiFetch(`/api/subscription/subscribe/${tier.id}`, { method: 'POST' });
      if (response.ok) {
        if (isFromRegistration) setPendingSubscription(false);
        navigate('/dashboard');
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || t('common.error') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('common.networkError') });
    }
  };

  const formatPrice = (price) => {
    if (price === '0.00' || price === 0) return t('subscription.free') || 'Free';
    return `$${parseFloat(price).toFixed(0)}`;
  };

  const getPrice = (tier) => {
    if (tier.price_monthly === '0.00' || tier.price_monthly === 0) return '0';
    const cycle = tier.is_yearly_only ? 'yearly' : billingCycle;
    return cycle === 'yearly' ? tier.price_yearly : tier.price_monthly;
  };

  const computeSavings = (tier) => {
    if (!tier.price_yearly || tier.price_monthly === '0.00') return 0;
    const monthly = parseFloat(tier.price_monthly);
    const yearly = parseFloat(tier.price_yearly);
    if (!monthly || !yearly) return 0;
    return Math.round((1 - yearly / (monthly * 12)) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-8">
      {!isAdmin && (isFromRegistration || isNewUser) && currentSubscription?.status !== 'active' && currentSubscription?.status !== 'pending_payment' && (
        <div className="bg-gradient-to-br from-brand-accent/15 via-[#D4AF37]/5 to-brand-primary/10 border border-brand-accent/40 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <MaterialSymbol icon="celebration" size={48} className="text-brand-accent mx-auto mb-3" weight="fill" />
          <h2 className="text-2xl font-bold text-brand-primary mb-2">{t('subscription.welcomeToOasis')}</h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            {isFromRegistration ? t('subscription.selectPlanToStart') : t('subscription.selectPlanToUpgrade')}
          </p>
        </div>
      )}

      {!isAdmin && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-brand-primary">{t('subscription.chooseYourPlan')}</h2>
          <p className="text-on-surface-variant mt-2">{t('subscription.getStartedDescription')}</p>
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-brand-primary' : 'text-on-surface-subtle'}`}>
            {t('subscription.monthly')}
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-brand-primary' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'} ${isRtl ? (billingCycle === 'yearly' ? 'translate-x-[-2rem]' : 'translate-x-[-0.25rem]') : ''}`} />
          </button>
          <span className={`text-sm font-semibold transition-colors ${billingCycle === 'yearly' ? 'text-brand-primary' : 'text-on-surface-subtle'}`}>
            {t('subscription.yearly')}
          </span>
          {billingCycle === 'yearly' && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              {t('subscription.savePercent', { percent: '20' })}
            </span>
          )}
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {!isAdmin && limits && currentSubscription?.status === 'active' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high">
          <h3 className="font-bold text-brand-primary mb-4">{t('subscription.currentUsage')}</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t('subscription.animals'), used: limits.animals?.used, max: limits.animals?.max, icon: 'pets' },
              { label: t('subscription.devices'), used: limits.devices?.used, max: limits.devices?.max, icon: 'sensors' },
              { label: t('subscription.users'), used: limits.users?.used, max: limits.users?.max, icon: 'group' },
            ].map((item) => {
              const pct = item.max > 0 ? Math.round((item.used / item.max) * 100) : 0;
              return (
                <div key={item.label} className="text-center">
                  <MaterialSymbol icon={item.icon} size={24} className="text-brand-accent mx-auto mb-1" />
                  <div className="text-2xl font-bold text-brand-primary">
                    {item.used} / {item.max === 0 ? (t('subscription.unlimited') || 'Unlimited') : item.max}
                  </div>
                  <div className="text-sm text-on-surface-subtle">{item.label}</div>
                  {item.max > 0 && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-primary rounded-full h-1.5 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="flex flex-col md:flex-row gap-6">
          {tiers.map((tier, idx) => {
            const isCurrent = currentSubscription?.tier_id === tier.id && currentSubscription?.status === 'active';
            const canSelect = !isCurrent && (!currentSubscription || currentSubscription?.status === 'none' || currentSubscription?.status === 'pending');
            const isFeatured = tier.is_featured;
            const isRecommended = (idx === 1 || idx === 2) && !isFeatured;
            const savings = computeSavings(tier);
            const price = getPrice(tier);
            const effectiveCycle = tier.is_yearly_only ? 'yearly' : billingCycle;
            const priceLabel = effectiveCycle === 'yearly' ? t('subscription.perYear') : t('subscription.perMonth');

            return (
              <div
                key={tier.id}
                className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col ${
                  isFeatured && !isCurrent ? 'md:flex-[2] md:scale-105 md:-translate-y-2' : 'md:flex-1'
                } ${
                  isCurrent
                    ? 'border-brand-accent ring-2 ring-brand-accent/20'
                    : isFeatured && !isCurrent
                      ? 'border-brand-primary ring-2 ring-[#002819]/15 bg-gradient-to-b from-brand-primary/5 to-white'
                      : isRecommended && !isCurrent
                        ? 'border-brand-primary/20'
                        : 'border-surface-high'
                }`}
              >
                {isFeatured && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap z-10 uppercase tracking-wider">
                    {tier.name}
                  </div>
                )}
                {isRecommended && !isCurrent && !isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-accent text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap z-10">
                    {t('subscription.recommended')}
                  </div>
                )}
                {savings > 0 && billingCycle === 'yearly' && (
                  <div className={`absolute -top-3 end-3 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 ${isFeatured ? 'bg-brand-primary' : 'bg-emerald-500'}`}>
                    {t('subscription.savePercent', { percent: savings })}
                  </div>
                )}
                <div className={`flex flex-col flex-1 ${isFeatured && !isCurrent ? 'p-7' : 'p-6'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${TIER_COLORS[idx % TIER_COLORS.length]}15` }}
                    >
                      <MaterialSymbol icon={TIER_ICONS[idx % TIER_ICONS.length] || 'eco'} size={isFeatured ? 26 : 22} style={{ color: TIER_COLORS[idx % TIER_COLORS.length] }} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-brand-primary ${isFeatured ? 'text-xl' : 'text-lg'}`}>{tier.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">
                          {t('subscription.currentPlan')}
                        </span>
                      )}
                      {tier.is_yearly_only && (
                        <span className="text-[10px] font-bold text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
                          Yearly Only
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className={`font-bold text-brand-primary ${isFeatured ? 'text-4xl' : 'text-3xl'}`}>{formatPrice(price)}</span>
                    {price !== (t('subscription.free') || 'Free') && price !== '0' && (
                      <span className="text-on-surface-subtle text-sm">{priceLabel}</span>
                    )}
                    {effectiveCycle === 'yearly' && savings > 0 && (
                      <div className="text-xs text-on-surface-subtle mt-0.5 line-through">
                        ${(parseFloat(tier.price_monthly) * 12).toFixed(0)}/yr
                      </div>
                    )}
                  </div>

                  {tier.description && (
                    <p className={`mb-4 ${isFeatured ? 'text-sm font-medium text-brand-primary' : 'text-sm text-on-surface-subtle'}`}>{tier.description}</p>
                  )}

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {[
                      { icon: 'pets', text: `${tier.max_animals === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_animals} ${(t('subscription.animals') || 'Animals').toLowerCase()}` },
                      { icon: 'sensors', text: `${tier.max_devices === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_devices} ${(t('subscription.devices') || 'Devices').toLowerCase()}` },
                      { icon: 'group', text: `${tier.max_users === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_users} ${(t('subscription.users') || 'Users').toLowerCase()}` },
                      tier.has_geofencing && { icon: 'fence', text: 'Geofencing' },
                      tier.has_auctions && { icon: 'gavel', text: 'Auctions' },
                      tier.has_advanced_reports && { icon: 'analytics', text: t('nav.reports') },
                      tier.has_api_access && { icon: 'api', text: 'API Access' },
                    ].filter(Boolean).map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                        <div className="w-6 h-6 rounded-lg bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                          <MaterialSymbol icon={item.icon} size={14} className="text-brand-accent" />
                        </div>
                        {item.text}
                      </li>
                    ))}
                  </ul>

                  {canSelect && (
                    <button
                      onClick={() => price === '0' || tier.price_monthly === '0.00' ? handleActivateFreePlan(tier) : goToCheckout(tier)}
                      className={`w-full py-3 rounded-xl font-bold transition-all duration-200 ${
                        isFeatured || isRecommended
                          ? 'bg-brand-primary text-white hover:bg-brand-secondary shadow-md hover:shadow-lg'
                          : 'bg-surface-light text-brand-primary hover:bg-surface-high border border-surface-high'
                      }`}
                    >
                      {price === '0' || tier.price_monthly === '0.00' ? (t('subscription.activateFree') || 'Activate Free Plan') : (t('subscription.subscribeNow') || 'Subscribe Now')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
