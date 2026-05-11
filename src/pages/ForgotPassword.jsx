import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';

export default function ForgotPassword() {
  const { t, dir } = useI18n();
  const { platformName } = usePlatform();
  const isRtl = dir === 'rtl';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
       const response = await apiFetch('/api/auth/forgot-password', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
         },
         body: JSON.stringify({ email }),
       });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(t(`errors.${data.error}`) || data.message || t('errors.serverError'));
      }
    } catch (err) {
      setError(t('errors.networkError'));
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-[#FAF1F5] via-[#F4F4EF] to-[#E3E3DE] ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#eeeee9]/30" />
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 40, 25, 0.85), rgba(6, 64, 43, 0.7)), url(https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-3xl shadow-[0_24px_64px_rgba(6,64,43,0.15)]">
            <div className="flex flex-col items-center mb-10">
              <div className="w-18 h-18 bg-gradient-to-br from-[#002819] to-[#06402B] rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-[#002819]/30">
                <MaterialSymbol icon="lock_reset" size={36} className="text-[#D4AF37]" weight="fill" />
              </div>
              <h1 className="text-4xl font-black text-[#002819] font-['Manrope'] tracking-tight mb-2">
                {t('auth.forgotPassword')}
              </h1>
              <p className="text-[#404943] font-medium">{platformName}</p>
            </div>

            {success ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <MaterialSymbol icon="mark_email_read" size={32} className="text-green-600" weight="fill" />
                </div>
                <p className="text-[#404943] font-medium">
                  {t('auth.resetEmailSent') || 'Password reset email sent! Check your inbox.'}
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full bg-gradient-to-br from-[#002819] to-[#06402B] text-[#D4AF37] font-bold py-4 rounded-2xl text-center hover:opacity-95 transition-all"
                >
                  {t('auth.backToLogin') || 'Back to Login'}
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <p className={`text-sm text-[#404943] ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('auth.forgotPasswordInstructions') || 'Enter your email address and we\'ll send you a link to reset your password.'}
                </p>

                <div className="space-y-3">
                  <label className={`block text-sm font-bold text-[#002819] px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <MaterialSymbol
                      icon="mail"
                      size={20}
                      className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@oasis.com"
                      required
                      className={`w-full bg-[#F4F4EF] rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#06402B]/20 transition-all font-medium text-[#1a1c19] placeholder:text-[#c0c9c1] ${
                        isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-[#BA1A1A]/10 text-[#BA1A1A] rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-[#002819] to-[#06402B] text-[#D4AF37] font-bold py-5 rounded-2xl shadow-xl shadow-[#002819]/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <span className="font-bold">{loading ? t('common.loading') : (t('auth.sendResetLink') || 'Send Reset Link')}</span>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MaterialSymbol icon="send" size={20} weight="fill" />
                  )}
                </button>

                <Link
                  to="/login"
                  className={`flex items-center justify-center gap-2 text-sm text-[#404943] hover:text-[#002819] transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <MaterialSymbol icon="arrow_back" size={16} />
                  {t('auth.backToLogin') || 'Back to Login'}
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
