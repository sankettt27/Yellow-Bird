/**
 * RegisterSchoolPage — Self-registration for new School Institutions and School Admins.
 * Flow:
 * 1. Enter email -> receive 6-digit OTP code in inbox
 * 2. Verify 6-digit OTP
 * 3. Enter School Name, Admin Name, Phone, and Password
 * 4. Auto-login and navigate to School Setup Wizard
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function RegisterSchoolPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();

  // Multi-step state: 1: email, 2: otp, 3: details
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // OTP input reference
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', { email: cleanEmail });
      toast.success(res.data.message || 'Verification code sent to your email!');
      if (res.data.debug_code) {
        setOtpCode(res.data.debug_code);
      }
      setResendTimer(60);
      setCanResend(false);
      setStep(2);
      setTimeout(() => otpInputRef.current?.focus(), 150);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to send verification code. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-email-otp', {
        email: email.trim().toLowerCase(),
        otp_code: cleanOtp,
      });
      toast.success('Email verified successfully! Complete your school profile.');
      setStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid verification code. Please check your inbox.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete School Registration & Auto-Login
  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast.error('Please enter your School / Institution Name');
      return;
    }
    if (!fullName.trim()) {
      toast.error('Please enter the Administrator Full Name');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register-school', {
        email: email.trim().toLowerCase(),
        otp_code: otpCode.trim(),
        password,
        full_name: fullName.trim(),
        school_name: schoolName.trim(),
        phone: phone.trim() || undefined,
      });

      const { access_token, user } = res.data;
      setSession(access_token, user);
      toast.success(`Welcome to YellowBird, ${user.full_name}! School registered.`);

      // Direct them to the initial setup wizard to set address & coordinates
      navigate('/admin/setup', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* ── Left Branding Panel (Desktop) ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-amber-500 via-brand-500 to-amber-700 relative p-12 flex-col justify-between overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 text-2xl">
              🚌
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">YellowBird</h1>
              <p className="text-xs text-amber-100 font-medium tracking-wide uppercase">Admin Onboarding</p>
            </div>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold text-white">
            <Sparkles className="w-4 h-4 text-amber-200" />
            Instant School Onboarding
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Register Your School & Deploy Real-Time Fleet Tracking
          </h2>
          <p className="text-sm text-amber-100/90 leading-relaxed">
            Every registered school starts with a dedicated, isolated portal with zero pre-existing records.
            Add drivers, parents, students, routes, and configure live GPS geofencing in minutes.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Dedicated school instance with clean data isolation',
              'Verified administrator authentication via Gmail OTP',
              'Built-in setup wizard for coordinates & campus mapping',
              'Ready for Windows Desktop (.exe) & Web Portal',
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-sm text-white/95">
                <CheckCircle2 className="w-4 h-4 text-amber-200 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="relative z-10 pt-6 border-t border-white/20 text-xs text-amber-100/80">
          Protected with end-to-end encryption and 365-day persistent session support.
        </div>
      </div>

      {/* ── Right Action Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          {/* Top Mobile Brand Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🚌</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">YellowBird</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Sign In Instead
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold">
              <span className={step >= 1 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}>
                1. Email
              </span>
              <span className={step >= 2 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}>
                2. Verify OTP
              </span>
              <span className={step >= 3 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}>
                3. School Details
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-brand-500"
                initial={{ width: '33.33%' }}
                animate={{ width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-200/80 dark:border-gray-800">
            <AnimatePresence mode="wait">
              {/* ── STEP 1: Email Address ── */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-brand-500" />
                      School Admin Email
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the administrator email. We'll send a 6-digit verification code to confirm ownership.
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Administrator / Official Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="principal@school.edu.in"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Send Verification Code <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 2: 6-Digit OTP Code ── */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to email
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-brand-500" />
                      Enter 6-Digit Code
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      We sent a verification code to <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Verification Code
                      </label>
                      <input
                        ref={otpInputRef}
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-amber-50/50 dark:bg-gray-800 text-amber-900 dark:text-amber-300 focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      {canResend ? (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          Resend available in {resendTimer}s
                        </span>
                      )}
                      <span className="text-gray-400">Expires in 10 mins</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || otpCode.length !== 6}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Verify & Continue <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 3: School Profile & Admin Password ── */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-500" />
                      School & Account Setup
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Configure your school name and administrator login password.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSchool} className="space-y-3.5">
                    {/* School Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        School / Institution Name *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          placeholder="e.g. Greenfield International School"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Administrator Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Administrator Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Contact Phone (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Password (Min 6 characters) *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create School & Launch Portal <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom helper */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
              >
                Sign In to Existing School →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
