import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { usePlatform } from '../context/PlatformContext';
import { storageUrl, apiFetch } from '../utils/api';

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

export default function ForgotPassword() {
  const { t, dir } = useI18n();
  const { platformName, logoUrl, loginBackgroundUrl, copyrightText } = usePlatform();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  // Step management: 1 = email, 2 = otp, 3 = new password, 4 = success
  const [step, setStep] = useState(1);

  // Step 1 state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Step 3 state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 2) return;
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    if (!canResend) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown, canResend]);

  const focusOtpInput = useCallback((index) => {
    if (index >= 0 && index < 6 && inputRefs.current[index]) {
      inputRefs.current[index].focus();
    }
  }, []);

  // ---- Step 1: Send OTP ----
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setStep(2);
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
      } else {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to send reset code. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: OTP Handling ----
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      focusOtpInput(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusOtpInput(index - 1);
    }
    if (e.key === 'ArrowRight' && index < 5) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    focusOtpInput(nextIndex);
  };

  const handleOtpNext = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setCountdown(60);
        setCanResend(false);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 3: Reset Password ----
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const otpString = otp.join('');

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpString,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep(4);
      } else {
        setError(data.message || data.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

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
                  <MaterialSymbol icon="lock_reset" size={36} className="text-brand-accent" weight="fill" />
                </div>
              )}

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        step === s
                          ? 'bg-brand-primary text-brand-accent'
                          : step > s
                          ? 'bg-green-500 text-white'
                          : 'bg-surface-high text-on-surface-subtle'
                      }`}
                    >
                      {step > s ? (
                        <MaterialSymbol icon="check" size={16} weight="fill" />
                      ) : (
                        s
                      )}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-10 h-0.5 rounded transition-all duration-300 ${
                          step > s ? 'bg-green-500' : 'bg-surface-high'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <h1 className="text-3xl font-black text-brand-primary font-['Manrope'] tracking-tight mb-2 text-center">
                {step === 1 && 'Forgot Password'}
                {step === 2 && 'Enter OTP'}
                {step === 3 && 'Reset Password'}
                {step === 4 && 'Password Reset!'}
              </h1>
              <p className="text-on-surface-variant font-medium text-center">
                {step === 1 && (t('auth.forgotPasswordInstructions') || 'Enter your email to receive an OTP')}
                {step === 2 && 'Enter the 6-digit code sent to your email'}
                {step === 3 && 'Choose a new password for your account'}
                {step === 4 && 'Your password has been reset successfully'}
              </p>
            </div>

            {error && step !== 4 && (
              <div className="mb-5 p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Email Input */}
            {step === 1 && (
              <form className="space-y-5" onSubmit={handleSendOtp}>
                <div className="space-y-3">
                  <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    Email
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
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="example@oasis.com"
                      required
                      className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                        isRtl ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                    isRtl ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="font-bold">{loading ? 'Sending...' : 'Send OTP'}</span>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MaterialSymbol icon="send" size={20} weight="fill" />
                  )}
                </button>

                <Link
                  to="/login"
                  className={`flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-brand-primary transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <MaterialSymbol icon="arrow_back" size={16} />
                  Back to Login
                </Link>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-6">
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
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`w-12 h-14 text-center text-xl font-bold text-brand-primary bg-surface-light rounded-xl border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                        digit ? 'border-brand-accent' : 'border-surface-high'
                      }`}
                      autoFocus={index === 0}
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleOtpNext}
                  disabled={!isOtpComplete}
                  className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                    isRtl ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="font-bold">Continue</span>
                  <MaterialSymbol icon="arrow_forward" size={20} weight="fill" />
                </button>

                <div className="text-center">
                  {canResend ? (
                    <button
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-sm font-semibold text-brand-accent hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {loading ? 'Resending...' : 'Resend Code'}
                    </button>
                  ) : (
                    <p className="text-sm text-on-surface-variant font-medium">
                      Resend code in <span className="font-bold text-brand-primary">{countdown}s</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => { setStep(1); setError(''); }}
                  className={`flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-brand-primary transition-colors w-full ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <MaterialSymbol icon="arrow_back" size={16} />
                  Back to Email
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form className="space-y-5" onSubmit={handleResetPassword}>
                <div className="space-y-3">
                  <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    New Password
                  </label>
                  <div className="relative">
                    <MaterialSymbol
                      icon="lock"
                      size={20}
                      className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Min 8 characters"
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
                  {passwordStrength && (
                    <div className="px-1">
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-surface-high rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                        </div>
                        <span className="text-xs text-on-surface-subtle font-medium capitalize">
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className={`block text-sm font-bold text-brand-primary px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <MaterialSymbol
                      icon="lock"
                      size={20}
                      className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-5 left-auto' : 'left-5'}`}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      className={`w-full bg-surface-light rounded-xl py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all font-medium text-on-surface placeholder:text-outline ${
                        isRtl ? 'pr-14 pl-5' : 'pl-14 pr-14'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-on-surface-subtle hover:text-brand-primary ${isRtl ? 'left-2 right-auto' : 'right-2'}`}
                    >
                      <MaterialSymbol
                        icon={showConfirmPassword ? 'visibility_off' : 'visibility'}
                        size={20}
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl shadow-xl shadow-brand-primary/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 ${
                    isRtl ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="font-bold">{loading ? 'Resetting...' : 'Reset Password'}</span>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MaterialSymbol icon="lock_reset" size={20} weight="fill" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(2); setError(''); }}
                  className={`flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-brand-primary transition-colors w-full ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <MaterialSymbol icon="arrow_back" size={16} />
                  Back to OTP
                </button>
              </form>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <MaterialSymbol icon="check_circle" size={40} className="text-green-600" weight="fill" />
                </div>
                <p className="text-on-surface-variant font-medium">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-accent font-bold py-5 rounded-2xl text-center hover:opacity-95 transition-all shadow-xl shadow-brand-primary/25"
                >
                  Back to Login
                </Link>
              </div>
            )}
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
