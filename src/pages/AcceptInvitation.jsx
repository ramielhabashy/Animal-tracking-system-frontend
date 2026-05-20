import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';
import { setAuthToken, setAuthUser, setUserRole, setPendingSubscription, getAuthToken } from '../utils/cookies';

function getPasswordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return { label: 'weak', color: 'bg-red-500', width: 'w-1/4' };
  if (score <= 3) return { label: 'medium', color: 'bg-amber-500', width: 'w-2/4' };
  return { label: 'strong', color: 'bg-green-500', width: 'w-full' };
}

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { t, dir, locale } = useI18n();
  const { platformName, logoUrl, copyrightText } = usePlatform();
  const isRtl = dir === 'rtl';
  const nameRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (getAuthToken()) {
      navigate(redirect);
      return;
    }
    loadInvitation();
  }, [token]);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, [loading]);

  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      navigate(redirect);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, navigate, redirect]);

  const loadInvitation = async () => {
    try {
      const res = await apiFetch(`/api/invitations/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvitation(data.data);
      } else {
        const data = await res.json();
        const code = data.code || '';
        setErrorCode(code);
        if (code === 'invitation_used') {
          setError(t('invitations.alreadyUsed'));
        } else if (code === 'invitation_expired') {
          setError(t('invitations.expired'));
        } else {
          setError(data.message || t('invitations.invalidOrExpired'));
        }
      }
    } catch (err) {
      setError(t('invitations.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = t('invitations.nameRequired');
    if (!password) {
      errs.password = t('invitations.passwordRequired');
    } else if (password.length < 8) {
      errs.password = t('invitations.passwordMinLength');
    }
    if (password !== passwordConfirmation) {
      errs.password_confirmation = t('invitations.passwordsDoNotMatch');
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password,
          password_confirmation: passwordConfirmation,
          phone,
          language: locale || 'en',
        }),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (res.ok) {
        const userRole = data.data?.user?.role || data.data?.user?.roles?.[0] || 'Shepherd';
        if (data.data?.token) setAuthToken(data.data.token);
        if (data.data?.user) setAuthUser({ ...data.data.user, role: userRole });
        setUserRole(userRole);
        setPendingSubscription(true);
        setSuccess(true);
      } else {
        const serverErrors = data.errors || {};
        if (serverErrors.name || serverErrors.password || serverErrors.password_confirmation) {
          setValidationErrors(prev => ({ ...prev, ...serverErrors }));
        }
        if (data.code === 'invitation_used') {
          setError(t('invitations.alreadyUsed'));
          setErrorCode('invitation_used');
        } else if (data.code === 'invitation_expired') {
          setError(t('invitations.expired'));
          setErrorCode('invitation_expired');
        } else if (data.code === 'email_exists') {
          setError(t('invitations.emailExists'));
          setErrorCode('email_exists');
        } else {
          setError(data.message || t('invitations.failedToComplete'));
        }
      }
    } catch (err) {
      setError(t('invitations.networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);
  const isTerminalError = ['invitation_used', 'invitation_expired', 'email_exists'].includes(errorCode);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE]">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className={`min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE] ${isRtl ? 'rtl' : 'ltr'}`}>
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-surface-dim/30" />
          <div className="w-full h-full bg-[linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)] bg-cover bg-center" />
        </div>
        <div className="flex-1 flex items-center justify-center w-full px-6">
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)] text-center">
              <MaterialSymbol icon="link_off" size={48} className="text-danger mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-brand-primary mb-3">{t('invitations.invalidLink')}</h1>
              <p className="text-on-surface-variant mb-6">{error}</p>
              {isTerminalError && (
                <p className="text-sm text-on-surface-subtle mb-4">
                  {t('common.contactAdmin') || 'Please contact your administrator to get a new invitation.'}
                </p>
              )}
              <button
                onClick={() => navigate(`/login${isTerminalError ? '?invitation=expired' : ''}`)}
                className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
              >
                {t('invitations.goToLogin')}
              </button>
            </div>
          </div>
        </div>
        <footer className="mt-auto w-full py-8 px-12 z-20">
          <p className="text-white/80 font-medium text-sm text-center">
            &copy; {new Date().getFullYear()} {platformName}. {copyrightText}
          </p>
        </footer>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE] ${isRtl ? 'rtl' : 'ltr'}`}>
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-surface-dim/30" />
          <div className="w-full h-full bg-[linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)] bg-cover bg-center" />
        </div>
        <div className="flex-1 flex items-center justify-center w-full px-6">
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)] text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MaterialSymbol icon="check_circle" size={40} className="text-green-600" weight="fill" />
              </div>
              <h1 className="text-2xl font-bold text-brand-primary mb-2">{t('invitations.accountCreated')}</h1>
              <p className="text-on-surface-variant mb-6">{t('invitations.accountCreatedDesc')}</p>
              <button
                onClick={() => navigate(redirect)}
                className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
              >
                {t('invitations.goToDashboard')} ({countdown})
              </button>
            </div>
          </div>
        </div>
        <footer className="mt-auto w-full py-8 px-12 z-20">
          <p className="text-white/80 font-medium text-sm text-center">
            &copy; {new Date().getFullYear()} {platformName}. {copyrightText}
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE] ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-surface-dim/30" />
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)] bg-cover bg-center" />
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)]">
            <div className="flex flex-col items-center mb-10">
              {logoUrl ? (
                <img src={storageUrl(logoUrl)} alt={platformName} className="h-18 mb-5 object-contain" />
              ) : (
                <div className="w-18 h-18 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-brand-primary/30">
                  <MaterialSymbol icon="track_changes" size={36} className="text-brand-accent" weight="fill" />
                </div>
              )}
              <h1 className="text-4xl font-black text-brand-primary font-['Manrope'] tracking-tight mb-2">
                {t('invitations.completeRegistration')}
              </h1>
              <p className="text-on-surface-variant font-medium">{platformName}</p>
            </div>

            {invitation && (
              <div className="bg-surface-light rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <MaterialSymbol icon="mail" size={18} className="text-on-surface-subtle" />
                  <span className="text-sm text-on-surface-variant">{invitation.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MaterialSymbol icon="badge" size={18} className="text-on-surface-subtle" />
                  <span className="text-sm text-on-surface-variant">{t('invitations.inviteAccepted')}: <strong className="text-brand-primary">{invitation.role}</strong></span>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('users.name')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="person"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setValidationErrors(prev => ({ ...prev, name: undefined })); }}
                    placeholder={t('users.name')}
                    required
                    className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                      isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                    } ${validationErrors.name ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.name && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.name}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('users.phone')}
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="phone"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('users.phone')}
                    className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                      isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="lock"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setValidationErrors(prev => ({ ...prev, password: undefined })); }}
                    placeholder={t('invitations.min8Chars')}
                    required
                    minLength={8}
                    className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                      isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'
                    } ${validationErrors.password ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.password && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.password}</p>}
                </div>
                {strength && (
                  <div className="px-1">
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                      </div>
                      <span className="text-xs text-on-surface-subtle font-medium">
                        {t('invitations.' + strength.label)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('invitations.confirmPassword')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="lock"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => { setPasswordConfirmation(e.target.value); setValidationErrors(prev => ({ ...prev, password_confirmation: undefined })); }}
                    placeholder={t('invitations.confirmPassword')}
                    required
                    minLength={8}
                    className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                      isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'
                    } ${validationErrors.password_confirmation ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.password_confirmation && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.password_confirmation}</p>}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium">
                  {error}
                  {isTerminalError && (
                    <span className="block mt-1 text-xs text-on-surface-subtle">
                      {t('common.contactAdmin') || 'Please contact your administrator to get a new invitation.'}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                  isRtl ? 'flex-row-reverse' : ''
                }`}
              >
                <span className="font-bold">{submitting ? t('common.loading') : t('invitations.createAccount')}</span>
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MaterialSymbol icon="person_add" size={20} weight="fill" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="mt-auto w-full py-8 px-12 z-20">
        <p className="text-white/80 font-medium text-sm text-center">
          &copy; {new Date().getFullYear()} {platformName}. {copyrightText}
        </p>
      </footer>
    </div>
  );
}
