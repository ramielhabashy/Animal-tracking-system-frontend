import React from 'react';
import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useAuth as useAuthContext } from '../context/AuthContext';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';
import { storageUrl } from '../utils/api';

export default function Login() {
  const { t, dir } = useI18n();
  const { platformName, logoUrl, loginBackgroundUrl, copyrightText } = usePlatform();
  const isRtl = dir === 'rtl';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthContext();

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      if (result === true) {
        navigate(searchParams.get('redirect') || '/subscription/select');
      } else {
        setError(result?.message || t('errors.serverError'));
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
        <div className="absolute inset-0 bg-surface-dim/30" />
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(135deg,rgba(0,40,25,0.85),rgba(6,64,43,0.7)),url(${loginBackgroundUrl ? storageUrl(loginBackgroundUrl) : 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop'})`
          }}
        />
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
              {t('auth.login')}
            </h1>
            <p className="text-on-surface-variant font-medium">{platformName}</p>
          </div>

          {searchParams.get('invitation') && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <MaterialSymbol icon="info" size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">{t('invitations.invalidOrExpired')}</p>
                <p className="text-amber-700">{t('common.contactAdmin')}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                {t('auth.email')}
              </label>
              <div className="relative">
                <MaterialSymbol
                  icon="mail"
                  size={20}
                  className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@oasis.com"
                  required
                  className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                    isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className={`flex justify-between items-center px-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <label className="text-sm font-bold text-brand-primary">{t('auth.password')}</label>
                <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-brand-accent hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
              </div>
              <div className="relative">
                <MaterialSymbol
                  icon="lock"
                  size={20}
                  className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                    isRtl ? 'pr-14 pl-5' : 'pl-14 pr-14'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-on-surface-subtle hover:text-brand-primary ${isRtl ? 'left-2 right-auto' : 'right-2'}`}
                >
                  <MaterialSymbol
                    icon={showPassword ? 'visibility_off' : 'visibility'}
                    size={20}
                  />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className={`flex items-center gap-3 px-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-surface-high text-brand-primary focus:ring-2 focus:ring-brand-secondary/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-on-surface-variant font-medium cursor-pointer">
                {t('auth.rememberMe')}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                isRtl ? 'flex-row-reverse' : ''
              }`}
            >
              <span className="font-bold">{loading ? t('common.loading') : t('auth.login')}</span>
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <MaterialSymbol icon="login" size={20} weight="fill" />
              )}
            </button>
          </form>

        </div>
      </div>
    </div>

      <footer className={`mt-auto w-full py-8 px-12 z-20 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={`flex justify-between items-center max-w-screen-2xl mx-auto ${isRtl ? 'flex-row-reverse' : ''}`}>
            <p className="text-white/80 font-medium text-sm">
            © {new Date().getFullYear()} {platformName}. {copyrightText}
          </p>
        </div>
      </footer>
    </div>
  );
}


