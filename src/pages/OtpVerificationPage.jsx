import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { setAuthUser, setUserRole, setAuthToken } from '../utils/cookies';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../context/AuthContext';

export default function OtpVerificationPage() {
  const { t, dir } = useI18n();
  const { platformName, logoUrl, loginBackgroundUrl, copyrightText } = usePlatform();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [searchParams] = useSearchParams();

  const tempToken = searchParams.get('temp_token') || sessionStorage.getItem('login_temp_token') || '';
  const storedEmail = sessionStorage.getItem('login_email') || '';
  const storedPassword = sessionStorage.getItem('login_password') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    if (!canResend) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, canResend]);

  const focusInput = useCallback((index) => {
    if (index >= 0 && index < 6 && inputRefs.current[index]) {
      inputRefs.current[index].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    focusInput(nextIndex);
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ temp_token: tempToken, otp: otpString }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Verification failed. Please try again.');
        setLoading(false);
        return;
      }

      if (data.user && data.token) {
        const userRole = data.user.role || 'Owner';
        const userWithRole = { ...data.user, role: userRole };
        setAuthUser(userWithRole);
        setUserRole(userRole);
        setAuthToken(data.token);

        // Clear temporary data
        sessionStorage.removeItem('login_temp_token');
        sessionStorage.removeItem('login_email');
        sessionStorage.removeItem('login_password');

        // Sync AuthContext with the newly set cookies
        refreshAuth();

        navigate('/dashboard');
      } else {
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: storedEmail, password: storedPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to resend code. Please log in again.');
        setResending(false);
        return;
      }

      if (data.requires_otp && data.temp_token) {
        sessionStorage.setItem('login_temp_token', data.temp_token);
        setCountdown(60);
        setCanResend(false);
      } else {
        setError('Unexpected response. Please try logging in again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

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
            <div className="flex flex-col items-center mb-8">
              {logoUrl ? (
                <img src={storageUrl(logoUrl)} alt={platformName} className="h-18 mb-5 object-contain" />
              ) : (
                <div className="w-18 h-18 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-brand-primary/30">
                  <MaterialSymbol icon="lock" size={36} className="text-brand-accent" weight="fill" />
                </div>
              )}
              <h1 className="text-3xl font-black text-brand-primary font-['Manrope'] tracking-tight mb-2 text-center">
                OTP Verification
              </h1>
              <p className="text-on-surface-variant font-medium text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* OTP Input Boxes */}
              <div className={`flex gap-3 justify-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-12 h-14 text-center text-xl font-bold text-brand-primary bg-surface-light rounded-xl border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                      digit ? 'border-brand-accent' : 'border-surface-high'
                    }`}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerify}
                disabled={loading || !isOtpComplete}
                className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                  isRtl ? 'flex-row-reverse' : ''
                }`}
              >
                <span className="font-bold">{loading ? 'Verifying...' : 'Verify'}</span>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MaterialSymbol icon="check_circle" size={20} weight="fill" />
                )}
              </button>

              {/* Resend Section */}
              <div className="text-center">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm font-semibold text-brand-accent hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resending ? 'Resending...' : 'Resend Code'}
                  </button>
                ) : (
                  <p className="text-sm text-on-surface-variant font-medium">
                    Resend code in <span className="font-bold text-brand-primary">{countdown}s</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto w-full py-8 px-12 z-20">
        <div className="max-w-screen-2xl mx-auto text-center">
          <p className="text-white/80 font-medium text-sm">
            &copy; {new Date().getFullYear()} {platformName}. {copyrightText}
          </p>
        </div>
      </footer>
    </div>
  );
}
