import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';
import { setAuthToken, setAuthUser, setUserRole, setPendingSubscription, getAuthToken } from '../utils/cookies';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { platformName, logoUrl, copyrightText } = usePlatform();
  const isRtl = dir === 'rtl';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (getAuthToken()) {
      navigate('/dashboard');
      return;
    }
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const res = await apiFetch(`/api/invitations/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvitation(data.data);
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid or expired invitation link');
      }
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== passwordConfirmation) errs.password_confirmation = 'Passwords do not match';
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
        navigate('/dashboard');
      } else {
        const serverErrors = data.errors || {};
        if (serverErrors.name || serverErrors.password || serverErrors.password_confirmation) {
          setValidationErrors(prev => ({ ...prev, ...serverErrors }));
        }
        setError(data.message || 'Failed to complete registration');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE]">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
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
          <div className="absolute inset-0 bg-[#eeeee9]/30" />
          <div className="w-full h-full bg-[linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)] bg-cover bg-center" />
        </div>
        <div className="flex-1 flex items-center justify-center w-full px-6">
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)] text-center">
              <MaterialSymbol icon="link_off" size={48} className="text-[#BA1A1A] mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-[#002819] mb-3">Invalid Invitation</h1>
              <p className="text-[#404943] mb-6">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition"
              >
                Go to Login
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
        <div className="absolute inset-0 bg-[#eeeee9]/30" />
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)] bg-cover bg-center" />
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)]">
            <div className="flex flex-col items-center mb-10">
              {logoUrl ? (
                <img src={storageUrl(logoUrl)} alt={platformName} className="h-18 mb-5 object-contain" />
              ) : (
                <div className="w-18 h-18 bg-gradient-to-br from-[#002819] to-[#06402B] rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-[#002819]/30">
                  <MaterialSymbol icon="track_changes" size={36} className="text-[#D4AF37]" weight="fill" />
                </div>
              )}
              <h1 className="text-4xl font-black text-[#002819] font-['Manrope'] tracking-tight mb-2">
                Complete Registration
              </h1>
              <p className="text-[#404943] font-medium">{platformName}</p>
            </div>

            {invitation && (
              <div className="bg-[#f4f4ef] rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <MaterialSymbol icon="mail" size={18} className="text-[#717973]" />
                  <span className="text-sm text-[#404943]">{invitation.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MaterialSymbol icon="badge" size={18} className="text-[#717973]" />
                  <span className="text-sm text-[#404943]">Role: <strong className="text-[#002819]">{invitation.role}</strong></span>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className={`block text-sm font-bold text-[#002819] px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('users.name')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="person"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setValidationErrors(prev => ({ ...prev, name: undefined })); }}
                    placeholder={t('users.name')}
                    required
                    className={`w-full bg-[#F4F4EF] rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#06402B]/20 transition-all font-medium text-[#1a1c19] placeholder:text-[#c0c9c1] ${
                      isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                    } ${validationErrors.name ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.name && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.name}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-[#002819] px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('users.phone')}
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="phone"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('users.phone')}
                    className={`w-full bg-[#F4F4EF] rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#06402B]/20 transition-all font-medium text-[#1a1c19] placeholder:text-[#c0c9c1] ${
                      isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-[#002819] px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="lock"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setValidationErrors(prev => ({ ...prev, password: undefined })); }}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className={`w-full bg-[#F4F4EF] rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#06402B]/20 transition-all font-medium text-[#1a1c19] placeholder:text-[#c0c9c1] ${
                      isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'
                    } ${validationErrors.password ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.password && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.password}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold text-[#002819] px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('auth.confirmPassword')} *
                </label>
                <div className="relative">
                  <MaterialSymbol
                    icon="lock"
                    size={20}
                    className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                  />
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => { setPasswordConfirmation(e.target.value); setValidationErrors(prev => ({ ...prev, password_confirmation: undefined })); }}
                    placeholder="Confirm password"
                    required
                    minLength={8}
                    className={`w-full bg-[#F4F4EF] rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#06402B]/20 transition-all font-medium text-[#1a1c19] placeholder:text-[#c0c9c1] ${
                      isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'
                    } ${validationErrors.password_confirmation ? 'ring-2 ring-red-500' : ''}`}
                  />
                  {validationErrors.password_confirmation && <p className="text-red-600 text-xs mt-1 px-1">{validationErrors.password_confirmation}</p>}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-[#BA1A1A]/10 text-[#BA1A1A] rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-gradient-to-br from-[#002819] to-[#06402B] text-[#D4AF37] font-bold py-5 rounded-2xl shadow-xl shadow-[#002819]/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                  isRtl ? 'flex-row-reverse' : ''
                }`}
              >
                <span className="font-bold">{submitting ? t('common.loading') : 'Create Account'}</span>
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
