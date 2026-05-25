import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { setAuthUser } from '../utils/cookies';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, dir, setLanguage, language } = useI18n();
  const isRtl = dir === 'rtl';

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });
  const [subscription, setSubscription] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tiersError, setTiersError] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const results = await Promise.allSettled([
        apiFetch('/api/auth/me'),
        apiFetch('/api/subscription/current'),
        apiFetch('/api/devices'),
        apiFetch('/api/subscription/tiers'),
      ]);

      const [profileRes, subscriptionRes, devicesRes, tiersRes] = results.map((r, i) => {
        const labels = ['/api/auth/me', '/api/subscription/current', '/api/devices', '/api/subscription/tiers'];
        if (r.status === 'rejected') {
          console.warn(`API call failed: ${labels[i]}`, r.reason);
          return null;
        }
        if (!r.value.ok) {
          console.warn(`API returned ${r.value.status}: ${labels[i]}`);
        }
        return r.value;
      });

      if (profileRes && profileRes.ok) {
        const data = await profileRes.json();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
        });
      }

      if (subscriptionRes && subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        const sub = subData.subscription || subData.data;
        if (sub && subData.tier && (!sub.tier || sub.status === 'pending_payment')) {
          sub.tier = subData.tier;
        }
        setSubscription(sub);
      }

      if (devicesRes && devicesRes.ok) {
        const devicesData = await devicesRes.json();
        const myDevices = (devicesData.data || []).filter(d => d.owner_id === user?.id);
        setDevices(myDevices);
      }

      if (tiersRes && tiersRes.ok) {
        const tiersData = await tiersRes.json();
        setTiers(tiersData.data || []);
      } else {
        setTiersError(true);
        if (!tiersRes) setTiers([]);
      }
    } catch (error) {
      setTiersError(true);
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await apiFetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        }),
      });

if (res.ok) {
        setMsg({ ok: true, text: 'Profile updated successfully!' });
        const updatedUser = { ...user, name: profile.name, email: profile.email };
        setAuthUser(updatedUser);
      } else {
        const data = await res.json();
        const errors = data.errors ? Object.values(data.errors).flat().join(' ') : null;
        setMsg({ ok: false, text: errors || data.message || 'Failed to update profile' });
      }
    } catch (err) {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubscription = async (tierId) => {
    setSaving(true);
    setMsg(null);

    try {
      const res = await apiFetch(`/api/subscription/subscribe/${tierId}`, {
        method: 'POST',
      });

      if (res.ok) {
        setMsg({ ok: true, text: 'Subscription updated successfully!' });
        fetchProfile();
      } else {
        const data = await res.json();
        setMsg({ ok: false, text: data.message || 'Failed to update subscription' });
      }
    } catch (err) {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await apiFetch('/api/subscription/cancel', { method: 'POST' });
      if (res.ok) {
        setMsg({ ok: true, text: 'Subscription cancelled successfully' });
        fetchProfile();
      } else {
        const data = await res.json();
        setMsg({ ok: false, text: data.message || 'Failed to cancel subscription' });
      }
    } catch (err) {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setMsg(null);

    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      if (res.ok) {
        setMsg({ ok: true, text: 'Password changed successfully!' });
        setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      } else {
        const data = await res.json();
        const errors = data.errors ? Object.values(data.errors).flat().join(' ') : null;
        setMsg({ ok: false, text: errors || data.message || 'Failed to change password' });
      }
    } catch (err) {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'subscription', label: t('subscription.title'), icon: 'workspace_premium' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold">
          <span>{t('common.settings')}</span>
          <span className="mx-2">/</span>
          <span className="text-brand-primary">{t('nav.profile')}</span>
        </nav>
        <h2 className="text-3xl font-bold text-brand-primary">{t('profile.accountSettings')}</h2>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl ${msg.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-surface-light p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-on-surface-variant hover:text-brand-primary'
            }`}
          >
            <MaterialSymbol icon={tab.icon} size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
              <MaterialSymbol icon="person" size={24} className="text-brand-secondary" />
              {t('profile.profileInfo')}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('users.name')}</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('users.phone')}</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    placeholder="+971 50 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('users.role')}</label>
                  <input
                    type="text"
                    value={user?.role || 'Owner'}
                    className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary/50"
                    disabled
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50">
                  {saving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm">
              <h4 className="font-bold text-brand-primary mb-4">{t('profile.quickStats')}</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-subtle">{t('common.devices')}</span>
                  <span className="font-bold text-brand-primary">{devices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-subtle">{t('common.subscription')}</span>
                  <span className="font-bold text-brand-accent">{subscription?.tier?.name || 'Free'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm">
              <h4 className="font-bold text-brand-primary mb-4">{t('profile.language')}</h4>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary"
              >
                <option value="en">English (US)</option>
                <option value="ar">Arabic (العربية)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
              <MaterialSymbol icon="lock" size={24} className="text-brand-secondary" />
              Change Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword || !passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation}
                  className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50 flex items-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Changing...
                    </>
                  ) : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6">
              <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                <MaterialSymbol icon="info" size={20} />
                Password Requirements
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Minimum 8 characters</li>
                <li>• Must be different from your current password</li>
                <li>• Use a mix of letters and numbers for better security</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {subscription && ['active', 'pending', 'cancelled', 'pending_payment'].includes(subscription.status) && (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
                <MaterialSymbol icon="workspace_premium" size={24} className="text-brand-accent" />
                {t('subscription.title')}
              </h3>

              <div className="border-2 border-brand-accent rounded-2xl p-6 bg-brand-accent/5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-2xl font-bold text-brand-primary">{subscription.tier?.name || 'Plan'}</h4>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        subscription.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        subscription.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {subscription.status === 'active' ? 'Active' :
                         subscription.status === 'cancelled' ? 'Cancelled' :
                         subscription.status === 'pending_payment' ? 'Pending Payment' :
                         'Free Plan'}
                      </span>
                    </div>
                    <p className="text-3xl font-black text-brand-primary">
                      {subscription.tier?.price_monthly === '0.00' || subscription.tier?.price_monthly == 0 ? 'Free' : `$${subscription.tier?.price_monthly}`}
                      {subscription.tier?.price_monthly !== '0.00' && subscription.tier?.price_monthly != 0 && (
                        <span className="text-base font-normal text-on-surface-subtle">/month</span>
                      )}
                    </p>
                    <p className="text-sm text-on-surface-subtle mt-1">{subscription.tier?.description}</p>
                  </div>
                  {subscription.status === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={saving}
                      className="px-6 py-2 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition disabled:opacity-50 text-sm"
                    >
                      Cancel Subscription
                    </button>
                  )}
                  {subscription.status === 'pending' && (
                    <span className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm">
                      Free Plan
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-brand-accent/20">
                  <div>
                    <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">Started</p>
                    <p className="font-bold text-brand-primary mt-1">
                      {subscription.started_at ? new Date(subscription.started_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">Renewal Date</p>
                    <p className="font-bold text-brand-primary mt-1">
                      {subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">Billing Cycle</p>
                    <p className="font-bold text-brand-primary mt-1 capitalize">{subscription.billing_cycle || 'Monthly'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">Payment Method</p>
                    <p className="font-bold text-brand-primary mt-1 capitalize">{subscription.payment_method || 'Card'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-brand-accent/20">
                  <div className="flex items-center gap-2">
                    <MaterialSymbol icon="pets" size={18} className="text-on-surface-subtle" />
                    <span className="text-sm text-on-surface-variant">
                      {subscription.tier?.max_animals === 0 ? 'Unlimited' : subscription.tier?.max_animals} animals
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MaterialSymbol icon="sensors" size={18} className="text-on-surface-subtle" />
                    <span className="text-sm text-on-surface-variant">
                      {subscription.tier?.max_devices === 0 ? 'Unlimited' : subscription.tier?.max_devices} devices
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MaterialSymbol icon="group" size={18} className="text-on-surface-subtle" />
                    <span className="text-sm text-on-surface-variant">
                      {subscription.tier?.max_users === 0 ? 'Unlimited' : subscription.tier?.max_users} users
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!subscription || subscription.status === 'none') && subscription?.status !== 'pending_payment' && (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
                <MaterialSymbol icon="workspace_premium" size={24} className="text-brand-accent" />
                {t('subscription.title')}
              </h3>
              <div className="text-center py-8">
                <MaterialSymbol icon="credit_card_off" size={48} className="text-on-surface-subtle mx-auto mb-3" />
                <h4 className="text-lg font-bold text-brand-primary mb-2">No Active Subscription</h4>
                <p className="text-on-surface-subtle mb-6">Choose a plan below to get started</p>
              </div>
            </div>
          )}

          {tiers.length > 0 && (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm">
              <h4 className="text-lg font-bold text-brand-primary mb-4">Available Plans</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.map((tier) => {
                  const effectiveTierId = subscription?.tier?.id ?? subscription?.tier_id;
                  const isCurrent = effectiveTierId === tier.id && ['active', 'pending', 'pending_payment'].includes(subscription?.status);
                  const currentTier = tiers.find(t => t.id === effectiveTierId);
                  const currentSortOrder = currentTier?.sort_order ?? 0;
                  const isUpgrade = tier.sort_order > currentSortOrder && !isCurrent;
                  const isDowngrade = tier.sort_order < currentSortOrder && !isCurrent;
                  return (
                    <div
                      key={tier.id}
                      className={`p-6 rounded-2xl border-2 ${isCurrent ? 'border-brand-accent bg-brand-accent/5' : 'border-gray-100 bg-surface-light'}`}
                    >
                      {isCurrent && (
                        <span className="inline-block bg-brand-accent text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                          Current
                        </span>
                      )}
                      <h4 className="text-xl font-bold text-brand-primary">{tier.name}</h4>
                      <p className="text-3xl font-black text-brand-primary mt-2">
                        {tier.price_monthly === '0.00' || tier.price_monthly == 0 ? 'Free' : `$${tier.price_monthly}`}
                        {tier.price_monthly !== '0.00' && tier.price_monthly != 0 && (
                          <span className="text-base font-normal text-on-surface-subtle">/mo</span>
                        )}
                      </p>
                      <p className="text-sm text-on-surface-subtle mt-1">{tier.description}</p>
                      <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
                        <li className="flex items-center gap-2">
                          <MaterialSymbol icon="pets" size={16} className="text-brand-accent" />
                          {tier.max_animals === 0 ? 'Unlimited' : tier.max_animals} animals
                        </li>
                        <li className="flex items-center gap-2">
                          <MaterialSymbol icon="sensors" size={16} className="text-brand-accent" />
                          {tier.max_devices === 0 ? 'Unlimited' : tier.max_devices} devices
                        </li>
                        <li className="flex items-center gap-2">
                          <MaterialSymbol icon="group" size={16} className="text-brand-accent" />
                          {tier.max_users === 0 ? 'Unlimited' : tier.max_users} users
                        </li>
                      </ul>
                      {isUpgrade && (
                        <button
                          onClick={() => handleSaveSubscription(tier.id)}
                          disabled={saving}
                          className="w-full mt-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50"
                        >
                          Upgrade
                        </button>
                      )}
                      {isDowngrade && (
                        <button
                          onClick={() => handleSaveSubscription(tier.id)}
                          disabled={saving}
                          className="w-full mt-4 py-2 border-2 border-brand-primary text-brand-primary rounded-xl font-bold hover:bg-brand-primary/5 transition disabled:opacity-50"
                        >
                          Downgrade
                        </button>
                      )}
                      {(!subscription || subscription.status === 'none') && subscription?.status !== 'pending_payment' && (
                        <button
                          onClick={() => handleSaveSubscription(tier.id)}
                          disabled={saving}
                          className="w-full mt-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50"
                        >
                          {tier.price_monthly === '0.00' || tier.price_monthly == 0 ? 'Select Free Plan' : 'Subscribe'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tiers.length === 0 && !loading && (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm text-center">
              <MaterialSymbol icon="error_outline" size={40} className="text-on-surface-subtle mx-auto mb-3" />
              <p className="text-on-surface-subtle">No subscription plans are available at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
            <MaterialSymbol icon="notifications_active" size={24} className="text-brand-secondary" />
            Notification Preferences
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-surface-light rounded-xl cursor-pointer">
              <div className="flex gap-3 items-center">
                <MaterialSymbol icon="mail" size={20} className="text-brand-primary/60" />
                <div>
                  <p className="font-bold text-brand-primary">{t('profile.emailNotifications')}</p>
                  <p className="text-xs text-on-surface-subtle">{t('profile.healthAlerts')}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => toggleNotification('email')}
                className="w-5 h-5 rounded-lg border-2 border-brand-accent text-brand-accent focus:ring-brand-accent cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-surface-light rounded-xl cursor-pointer">
              <div className="flex gap-3 items-center">
                <MaterialSymbol icon="notifications" size={20} className="text-brand-primary/60" />
                <div>
                  <p className="font-bold text-brand-primary">{t('profile.pushNotifications')}</p>
                  <p className="text-xs text-on-surface-subtle">{t('profile.platformActivities')}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={() => toggleNotification('push')}
                className="w-5 h-5 rounded-lg border-2 border-brand-accent text-brand-accent focus:ring-brand-accent cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

