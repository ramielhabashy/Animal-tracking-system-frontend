import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import { getAuthUser, setAuthToken, setAuthUser, setUserRole } from '../utils/cookies';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import Footer from '../components/Layout/Footer';

function Stepper({ step, steps }) {
  const { dir } = useI18n();
  const isRtl = dir === 'rtl';
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step > i ? 'bg-emerald-500 text-white' :
              step === i ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' :
              'bg-gray-100 text-on-surface-subtle'
            }`}>
              {step > i ? <MaterialSymbol icon="check" size={20} /> : i + 1}
            </div>
            <span className={`text-[11px] mt-1.5 font-medium whitespace-nowrap transition-colors ${
              step >= i ? 'text-brand-primary' : 'text-on-surface-subtle'
            }`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 sm:w-16 md:w-20 h-0.5 mb-6 transition-colors ${step > i ? 'bg-emerald-500' : 'bg-gray-200'} ${isRtl ? 'scale-x-[-1]' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const formatPrice = (price, t) => {
  if (price === '0.00' || price === 0) return t('subscription.free') || 'Free';
  const n = parseFloat(price);
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
};

function SelectPlanStep({ tiers, onSelect }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-brand-primary">{t('subscription.chooseYourPlan')}</h2>
        <p className="text-on-surface-variant mt-2">{t('subscription.confirmDetails')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const displayPrice = tier.is_yearly_only ? tier.price_yearly : tier.price_monthly;
          const isFree = displayPrice === '0.00' || displayPrice === 0;
          const isFeatured = tier.is_featured;
          return (
            <div key={tier.id} className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
              isFeatured
                ? 'border-brand-primary ring-2 ring-[#002819]/10 bg-gradient-to-b from-brand-primary/5 to-white md:scale-105 md:-translate-y-1'
                : 'border-surface-high'
            }`}>
              {isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap z-10 uppercase tracking-wider">
                  {tier.name}
                </div>
              )}
              <div className="flex flex-col flex-1">
                <h3 className="font-bold text-xl text-brand-primary">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className={`font-bold text-brand-primary ${isFeatured ? 'text-4xl' : 'text-3xl'}`}>
                    {isFree ? (t('subscription.free') || 'Free') : formatPrice(displayPrice, t)}
                  </span>
                  {!isFree && <span className="text-on-surface-subtle">{tier.is_yearly_only ? (t('subscription.perYear') || '/year') : (t('subscription.perMonth') || '/month')}</span>}
                  {tier.is_yearly_only && !isFree && (
                    <span className="block text-[10px] text-on-surface-subtle mt-0.5">{t('subscription.yearly') || 'Yearly'} — {t('subscription.billedYearly') || 'billed yearly'}</span>
                  )}
                </div>
                <p className="text-sm text-on-surface-subtle mb-4">{tier.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {[
                    { icon: 'pets', text: `${tier.max_animals === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_animals} ${(t('subscription.animals') || 'animals').toLowerCase()}` },
                    { icon: 'sensors', text: `${tier.max_devices === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_devices} ${(t('subscription.devices') || 'devices').toLowerCase()}` },
                    { icon: 'group', text: `${tier.max_users === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_users} ${(t('subscription.users') || 'users').toLowerCase()}` },
                    tier.has_geofencing && { icon: 'fence', text: 'Geofencing' },
                    tier.has_auctions && { icon: 'gavel', text: 'Auctions' },
                    tier.has_medical_records && { icon: 'medical_services', text: 'Medical Records' },
                    tier.has_tasks && { icon: 'task', text: 'Task Management' },
                    tier.has_advanced_reports && { icon: 'analytics', text: 'Advanced Reports' },
                    tier.has_api_access && { icon: 'api', text: 'API Access' },
                    tier.has_ai_assistant && { icon: 'psychology', text: 'AI Assistant' },
                  ].filter(Boolean).map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <MaterialSymbol icon={item.icon} size={16} className="text-brand-accent flex-shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onSelect(tier)}
                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
                >
                  {isFree ? (t('subscription.activateFree') || 'Activate Free Plan') : (t('subscription.selectPlan') || 'Select Plan')}
                </button>
          </div>
        </div>
      );
        })}
      </div>
    </div>
  );
}

function PlanSummaryStep({ tier, billingCycle, onCycleChange, onContinue, onBack, isYearlyOnly }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-primary">{t('subscription.reviewYourPlan') || 'Review Your Plan'}</h2>
        <p className="text-on-surface-variant mt-1">{t('subscription.confirmDetails')}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high">
        <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div>
            <h3 className="text-xl font-bold text-brand-primary">{tier.name}</h3>
            <p className="text-sm text-on-surface-subtle">{tier.description}</p>
          </div>
          <div className={`${isRtl ? 'text-left' : 'text-right'}`}>
            <span className="text-3xl font-bold text-brand-primary">{formatPrice(billingCycle === 'yearly' ? tier.price_yearly : tier.price_monthly, t)}</span>
            <span className="text-on-surface-subtle">/{billingCycle === 'yearly' ? (t('subscription.perYear') || 'yr') : (t('subscription.perMonth') || 'mo')}</span>
          </div>
        </div>

        {!isYearlyOnly && (
          <div className="flex gap-2 mb-6">
            <button onClick={() => onCycleChange('monthly')}
              className={`flex-1 py-3 rounded-xl font-medium transition ${billingCycle === 'monthly' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-on-surface-variant'}`}>
              {t('subscription.monthly')} {tier.price_monthly !== '0.00' && `$${parseFloat(tier.price_monthly).toFixed(0)}/mo`}
            </button>
            <button onClick={() => onCycleChange('yearly')}
              className={`flex-1 py-3 rounded-xl font-medium transition ${billingCycle === 'yearly' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-on-surface-variant'}`}>
              {t('subscription.yearly')} {tier.price_yearly !== '0.00' && `$${parseFloat(tier.price_yearly).toFixed(0)}/yr`}
            </button>
          </div>
        )}

        {isYearlyOnly && (
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3 mb-4 text-center">
            <span className="text-sm font-semibold text-brand-primary">{t('subscription.yearly')} {tier.price_yearly !== '0.00' && <>{'—'} {formatPrice(tier.price_yearly, t)}<span className="text-sm font-normal">/{t('subscription.perYearAbbr') || 'yr'}</span></>}</span>
            <p className="text-xs text-on-surface-subtle mt-1">{t('subscription.yearlyOnlyInfo') || 'This plan is yearly-only'}</p>
          </div>
        )}

        <ul className="space-y-3">
          {[
            { icon: 'pets', text: `${tier.max_animals === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_animals} ${(t('subscription.animals') || 'animals').toLowerCase()}` },
            { icon: 'sensors', text: `${tier.max_devices === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_devices} ${(t('subscription.devices') || 'devices').toLowerCase()}` },
            { icon: 'group', text: `${tier.max_users === 0 ? (t('subscription.unlimited') || 'Unlimited') : tier.max_users} ${(t('subscription.users') || 'users').toLowerCase()}` },
            tier.has_geofencing && { icon: 'fence', text: 'Geofencing' },
            tier.has_auctions && { icon: 'gavel', text: 'Auctions' },
            tier.has_medical_records && { icon: 'medical_services', text: 'Medical Records' },
            tier.has_tasks && { icon: 'task', text: 'Task Management' },
            tier.has_advanced_reports && { icon: 'analytics', text: 'Advanced Reports' },
            tier.has_api_access && { icon: 'api', text: 'API Access' },
            tier.has_ai_assistant && { icon: 'psychology', text: 'AI Assistant' },
          ].filter(Boolean).map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-on-surface-variant">
              <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                <MaterialSymbol icon={item.icon} size={16} className="text-brand-accent" />
              </div>
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack}
          className="flex-1 py-4 bg-gray-100 text-on-surface-variant rounded-xl font-bold hover:bg-gray-200 transition">
          {t('subscription.changePlan') || 'Change Plan'}
        </button>
        <button onClick={onContinue}
          className="flex-1 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition">
          {t('subscription.continueToShipping') || 'Continue to Shipping'}
        </button>
      </div>
    </div>
  );
}

function ShippingStep({ address, onChange, onBack, onContinue }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [countries, setCountries] = useState(['Saudi Arabia']);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    apiFetch('/api/settings/countries').then(r => r.ok && r.json()).then(d => {
      if (d?.data && d.data.length > 0) setCountries(d.data);
    }).catch(() => {});
  }, []);

  const updateField = (field, value) => {
    onChange({ ...address, [field]: value });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleContinue = () => {
    const newErrors = {};
    if (!address.full_name?.trim()) newErrors.full_name = true;
    if (!address.street?.trim()) newErrors.street = true;
    if (!address.city?.trim()) newErrors.city = true;
    if (!address.zip?.trim()) newErrors.zip = true;
    if (!address.country?.trim()) newErrors.country = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onContinue();
  };

  const inputClass = (field) =>
    `w-full bg-surface-light border rounded-xl p-3 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition ${
      errors[field] ? 'border-red-400' : 'border-surface-high'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-primary">{t('subscription.shippingAddress') || 'Shipping Address'}</h2>
        <p className="text-on-surface-variant mt-1">{t('subscription.shippingDescription') || 'Where should we ship your device?'}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.fullName') || 'Full Name'}</label>
            <input type="text" value={address.full_name} onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="John Doe" className={inputClass('full_name')} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.streetAddress') || 'Street Address'}</label>
            <input type="text" value={address.street} onChange={(e) => updateField('street', e.target.value)}
              placeholder="123 Main Street" className={inputClass('street')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.city') || 'City'}</label>
            <input type="text" value={address.city} onChange={(e) => updateField('city', e.target.value)}
              placeholder="Riyadh" className={inputClass('city')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.zipCode') || 'ZIP Code'}</label>
            <input type="text" value={address.zip} onChange={(e) => updateField('zip', e.target.value)}
              placeholder="10001" className={inputClass('zip')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.country') || 'Country'}</label>
            <select value={address.country} onChange={(e) => updateField('country', e.target.value)}
              className={inputClass('country')}>
              <option value="">{t('subscription.selectCountry') || 'Select a country'}</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 py-4 bg-gray-100 text-on-surface-variant rounded-xl font-bold hover:bg-gray-200 transition">
          {t('subscription.back') || 'Back'}
        </button>
        <button onClick={handleContinue}
          className="flex-1 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50">
          {t('subscription.continueToPayment') || 'Continue to Payment'}
        </button>
      </div>
    </div>
  );
}

function PaymentStep({ tier, billingCycle, orderId, stripeEnabled, paymentMethods = [], onBack, onComplete, onError }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [paymentMethod, setPaymentMethod] = useState(stripeEnabled ? 'stripe' : 'bank');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (res.ok) {
        onComplete();
      } else {
        const d = await res.json();
        onError(d.message || 'Payment confirmation failed');
      }
    } catch (e) {
      onError(e.message || 'Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBankTransfer = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('payment_proof', file);
    try {
      const res = await apiFetch('/api/checkout/bank-transfer', { method: 'POST', body: formData });
      if (res.ok) {
        onComplete('bank_transfer');
      } else {
        const d = await res.json();
        onError(d.message || 'Upload failed');
      }
    } catch (e) {
      onError(e.message || 'Network error');
    } finally {
      setUploading(false);
    }
  };

  const amount = formatPrice(billingCycle === 'yearly' ? tier.price_yearly : tier.price_monthly, t);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-primary">{t('subscription.payment') || 'Payment'}</h2>
        <p className="text-on-surface-variant mt-1">{t('subscription.paymentDescription') || 'Choose your payment method'}</p>
      </div>

      <div className="bg-surface-light rounded-xl p-4">
        <div className={`flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-on-surface-subtle">{t('subscription.plan') || 'Plan'}</span>
          <span className="font-bold text-brand-primary">{tier.name} ({billingCycle})</span>
        </div>
        <div className={`flex justify-between mt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-on-surface-subtle">{t('subscription.amount') || 'Amount'}</span>
          <span className="font-bold text-brand-accent">{amount}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(paymentMethods.length > 0
          ? paymentMethods.filter(pm => pm.handler === 'stripe' ? stripeEnabled : true)
          : [{ handler: 'stripe', name: 'Credit Card', icon: 'credit_card' }, { handler: 'bank_transfer', name: 'Bank Transfer', icon: 'account_balance' }]
        ).map(pm => (
          <button key={pm.handler} onClick={() => setPaymentMethod(pm.handler)}
            className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              paymentMethod === pm.handler ? 'bg-brand-primary text-white' : 'bg-gray-100 text-on-surface-variant'
            }`}>
            <MaterialSymbol icon={pm.icon || 'payments'} size={18} />
            {pm.name}
          </button>
        ))}
      </div>

      {paymentMethod === 'stripe' ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <MaterialSymbol icon="lock" size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {t('common.securePayment') || 'You will be redirected to Stripe Checkout to complete your payment securely.'}
              </p>
            </div>
          </div>
          <button onClick={handleStripePayment} disabled={processing}
            className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50 flex items-center justify-center gap-2">
            {processing ? (
              <>{t('subscription.processing') || 'Processing...'}</>
            ) : (
              <>{t('subscription.payWith') || 'Pay'} {amount} {t('subscription.withCard') || 'with Card'}</>
            )}
          </button>
        </div>
      ) : paymentMethod === 'bank_transfer' ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
              <MaterialSymbol icon="account_balance" size={16} />
              {t('subscription.bankDetails') || 'Bank Transfer Details'}
            </h4>
            <div className="text-sm text-blue-600 space-y-1">
              <p>Bank: First Abu Dhabi Bank</p>
              <p>Account: 1234567890</p>
              <p>IBAN: AE123456789012345678901</p>
              <p className="mt-2 font-medium">Reference: SUBS-{orderId || tier.id}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              {t('subscription.uploadProof') || 'Upload Payment Proof (PDF)'}
            </label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleBankTransfer} disabled={uploading}
              className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary transition file:cursor-pointer cursor-pointer" />
          </div>
        </div>
      ) : null}

      <button onClick={onBack}
        className="w-full py-3 bg-gray-100 text-on-surface-variant rounded-xl font-medium hover:bg-gray-200 transition">
        {t('subscription.back') || 'Back'}
      </button>
    </div>
  );
}

function AccountStep({ tier, onComplete, onBack }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || password !== passwordConfirmation) {
      setError(t('subscription.allFieldsRequired') || 'Please fill all fields and confirm your password');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
      });
      if (res.ok) {
        const d = await res.json();
        setAuthToken(d.token);
        setAuthUser({ ...d.user, role: d.user?.role || 'Owner' });
        setUserRole(d.user?.role || 'Owner');
        onComplete();
      } else {
        let msg = t('subscription.registrationFailed') || 'Registration failed';
        try {
          const d = await res.json();
          msg = d.message || (d.errors ? Object.values(d.errors).flat()[0] : msg);
        } catch (_) {
          msg = `Server error (${res.status})`;
        }
        setError(msg);
      }
    } catch (e) {
      setError(e instanceof TypeError && e.message.includes('fetch') ? t('subscription.networkError') || 'Network error' : e.message || 'Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-primary">{t('subscription.createAccount') || 'Create Your Account'}</h2>
        <p className="text-on-surface-variant mt-1">
          {(t('subscription.createAccountDesc') || 'Enter your details to continue with {plan}').replace('{plan}', tier?.name || '')}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high space-y-4">
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <MaterialSymbol icon="error" size={18} className="text-red-500 flex-shrink-0" />
          {error}
        </div>}
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.fullName') || 'Full Name'}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required
            className="w-full bg-surface-light border border-surface-high rounded-xl p-3 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.email') || 'Email'}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required
            className="w-full bg-surface-light border border-surface-high rounded-xl p-3 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('common.password') || 'Password'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('subscription.passwordMin') || 'Min 8 characters'} required minLength={8}
            className="w-full bg-surface-light border border-surface-high rounded-xl p-3 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('subscription.confirmPassword') || 'Confirm Password'}</label>
          <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder={t('subscription.repeatPassword') || 'Repeat your password'} required minLength={8}
            className="w-full bg-surface-light border border-surface-high rounded-xl p-3 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition" />
        </div>
        <div className="flex gap-4 pt-2">
          <button type="button" onClick={onBack}
            className="flex-1 py-4 bg-gray-100 text-on-surface-variant rounded-xl font-bold hover:bg-gray-200 transition">
            {t('subscription.back') || 'Back'}
          </button>
          <button type="submit" disabled={creating}
            className="flex-1 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition disabled:opacity-50">
            {creating ? (t('subscription.processing') || 'Creating Account...') : (t('subscription.createAccountAndContinue') || 'Create Account & Continue')}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmationStep({ order, subscription, tier, isBankTransfer }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto animate-bounce">
        <MaterialSymbol icon="check_circle" size={48} className="text-emerald-500" weight="fill" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-brand-primary">
          {isBankTransfer ? (t('subscription.paymentProofSubmitted') || 'Payment Proof Submitted!') : (t('subscription.orderConfirmed') || 'Order Confirmed!')}
        </h2>
        <p className="text-on-surface-variant mt-2 max-w-md mx-auto">
          {isBankTransfer ? (t('subscription.bankTransferDesc') || 'Your bank transfer proof has been received.') : (t('subscription.orderConfirmationDesc') || 'Your payment was successful.')}
        </p>
      </div>

      {order && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-high max-w-md mx-auto text-left">
          <div className="space-y-3">
            <div className={`flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="text-on-surface-subtle">{t('subscription.orderNum') || 'Order #'}</span>
              <span className="font-bold text-brand-primary">#{order?.id || order.order_id}</span>
            </div>
            <div className={`flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="text-on-surface-subtle">{t('subscription.plan') || 'Plan'}</span>
              <span className="font-bold text-brand-primary">{tier?.name}</span>
            </div>
            <div className={`flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="text-on-surface-subtle">{t('subscription.status') || 'Status'}</span>
              <span className={`font-bold ${order?.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {order?.payment_status === 'paid' ? (t('subscription.paid') || 'Paid') : (t('subscription.pendingApproval') || 'Pending Approval')}
              </span>
            </div>
          </div>
        </div>
      )}

      {!isBankTransfer && (
        <div className="bg-brand-accent/10 border border-brand-accent/40 rounded-2xl p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MaterialSymbol icon="info" size={20} className="text-brand-accent" />
            <span className="font-bold text-brand-primary">{t('subscription.subscriptionStart') || 'Subscription Start'}</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {t('subscription.subscriptionInfo') || 'Your subscription will officially start when you activate your first device.'}
          </p>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <button onClick={() => navigate(isBankTransfer ? '/subscription' : '/dashboard')}
          className="py-4 px-8 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition">
          {isBankTransfer ? (t('subscription.viewSubscriptionStatus') || 'View Subscription Status') : (t('subscription.goToDashboard') || 'Go to Dashboard')}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { t, dir, setLocale } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const { platformName, logoUrl } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const lang = searchParams.get('lang');
    if (lang && setLocale) setLocale(lang);
  }, []);

  const [allTiers, setAllTiers] = useState([]);
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState(null);
  const cycleParam = searchParams.get('cycle');
  const authTokenParam = searchParams.get('token');
  const [billingCycle, setBillingCycle] = useState(cycleParam || 'monthly');
  const [address, setAddress] = useState({
    full_name: '', street: '', city: '', state: '', zip: '', country: ''
  });
  const [orderId, setOrderId] = useState(null);
  const [order, setOrder] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBankTransfer, setIsBankTransfer] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const embedMode = searchParams.get('embed') === '1';
  const tierId = searchParams.get('tier_id');
  const sessionId = searchParams.get('session_id');
  const confirmOrderId = searchParams.get('order_id');
  const canceled = searchParams.get('canceled');

  const steps = [
    t('subscription.plan') || 'Plan',
    t('subscription.shippingAddress') || 'Shipping',
    t('subscription.payment') || 'Payment',
  ];

  useEffect(() => {
    apiFetch('/api/settings/stripe-status').then(r => r.ok && r.json()).then(d => {
      if (d?.data) setStripeEnabled(d.data.enabled !== false);
    }).catch(() => {});
    apiFetch('/api/payment-methods').then(r => r.ok && r.json()).then(d => {
      if (d?.data) setPaymentMethods(d.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (authTokenParam) return;
    if (sessionId && confirmOrderId) {
      handleStripeConfirm(confirmOrderId, sessionId);
      return;
    }
    if (canceled) {
      setError('Payment was canceled. Please try again.');
      setLoading(false);
      return;
    }
    if (tierId) {
      fetchTier(tierId);
    } else {
      fetchAllTiers();
    }
  }, [tierId, sessionId, confirmOrderId, canceled, authTokenParam]);

  useEffect(() => {
    if (authTokenParam) {
      setAuthToken(authTokenParam);
      apiFetch('/api/auth/me').then(r => r.ok && r.json()).then(data => {
        if (data?.id) {
          const userInfo = { ...data, role: data.role || 'Owner' };
          setAuthUser(userInfo);
          setUserRole(userInfo.role);
          if (tierId) fetchTier(tierId);
        }
      }).catch(() => setLoading(false));
    }
  }, [authTokenParam]);

  const fetchAllTiers = async () => {
    try {
      const res = await apiFetch('/api/subscription/tiers');
      if (res.ok) {
        const d = await res.json();
        setAllTiers(d.data || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchTier = async (id) => {
    try {
      const res = await apiFetch(`/api/subscription/tiers/${id}`);
      if (res.ok) {
        const d = await res.json();
        setTier(d.data);
        const currentUser = getAuthUser() || user;
        setStep(currentUser ? 2 : 1);
      } else {
        setError('Plan not found');
      }
    } catch (e) {
      setError(e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (selectedTier) => {
    setTier(selectedTier);
    if (selectedTier.is_yearly_only) setBillingCycle('yearly');
    const isFree = selectedTier.is_yearly_only
      ? (selectedTier.price_yearly === '0.00' || selectedTier.price_yearly === 0)
      : (selectedTier.price_monthly === '0.00' || selectedTier.price_monthly === 0);
    if (isFree) {
      if (!user) { setStep(1); return; }
      handleActivateFree(selectedTier);
      return;
    }
    if (!user) { setStep(1); return; }
    setStep(2);
  };

  const handleAccountComplete = () => {
    if (!tier) { setStep(2); return; }
    const isFree = tier.is_yearly_only
      ? (tier.price_yearly === '0.00' || tier.price_yearly === 0)
      : (tier.price_monthly === '0.00' || tier.price_monthly === 0);
    if (isFree) {
      handleActivateFree(tier);
    } else {
      setStep(2);
    }
  };

  const handleActivateFree = async (selectedTier) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/subscription/subscribe/${selectedTier.id}`, { method: 'POST' });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to activate');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConfirm = async (orderId, sessionId) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, stripe_session_id: sessionId }),
      });
      if (res.ok) {
        const d = await res.json();
        setOrder(d.data?.order);
        setSubscription(d.data?.subscription);
        if (d.data?.order?.tier) setTier(d.data.order.tier);
        setStep(5);
      } else {
        const d = await res.json();
        setError(d.message || 'Confirmation failed');
      }
    } catch (e) {
      setError(e.message || 'Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const handleInitCheckout = async () => {
    setError(null);
    const pm = stripeEnabled ? 'stripe' : 'bank_transfer';
    try {
      const res = await apiFetch('/api/checkout/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: tier.id,
          billing_cycle: billingCycle,
          shipping_address: address,
          payment_method: pm,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.data?.url) {
          window.location.href = d.data.url;
        } else {
          setOrderId(d.data.order_id);
          setStep(4);
        }
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to initiate checkout');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    }
  };

  const handlePaymentComplete = (type) => {
    if (type === 'bank_transfer') setIsBankTransfer(true);
    setStep(5);
  };

  const handlePaymentError = (msg) => {
    setError(msg);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-on-surface-variant">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light flex flex-col">
      {!embedMode && <header className="bg-white border-b border-surface-high px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              {logoUrl ? (
                <img src={storageUrl(logoUrl)} alt={platformName} className="w-9 h-9 object-contain rounded-lg" />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center">
                  <MaterialSymbol icon="eco" size={18} className="text-brand-accent" fill />
                </div>
              )}
              <span className="text-lg font-bold text-brand-primary">{platformName}</span>
            </button>
          </div>
          <LanguageSwitcher compact />
        </div>
      </header>}

      <div className={`flex-1 max-w-7xl mx-auto w-full ${embedMode ? 'p-2 sm:p-4' : 'p-6 sm:p-8'}`}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <MaterialSymbol icon="error" size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <MaterialSymbol icon="close" size={18} />
            </button>
          </div>
        )}

        {step >= 2 && step <= 4 && (
          <Stepper step={step - 2} steps={steps} />
        )}

        <div className="mx-auto">
          {step === 0 && <SelectPlanStep tiers={allTiers} onSelect={handleSelectPlan} />}
          {step === 1 && !user && (
            <AccountStep tier={tier} onComplete={handleAccountComplete} onBack={() => setStep(0)} />
          )}
          {step === 2 && tier && (
            <PlanSummaryStep
              tier={tier}
              billingCycle={billingCycle}
              onCycleChange={setBillingCycle}
              onContinue={() => setStep(3)}
              onBack={() => tierId ? navigate('/checkout') : setStep(0)}
              isYearlyOnly={tier?.is_yearly_only}
            />
          )}
          {step === 3 && (
            <ShippingStep
              address={address}
              onChange={setAddress}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <PaymentStep
              tier={tier}
              billingCycle={billingCycle}
              orderId={orderId}
              stripeEnabled={stripeEnabled}
              paymentMethods={paymentMethods}
              onBack={() => setStep(3)}
              onComplete={handlePaymentComplete}
              onError={handlePaymentError}
            />
          )}
          {step === 5 && (
            <ConfirmationStep tier={tier} billingCycle={billingCycle} />
          )}
        </div>
      </div>
      {!embedMode && <Footer />}
    </div>
  );
}
