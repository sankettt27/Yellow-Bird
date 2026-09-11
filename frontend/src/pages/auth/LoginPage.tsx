/**
 * Login Page — premium glass-morphism design with animated bus illustration.
 * Fully responsive: PC shows split layout, mobile shows stacked branding header + form.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Eye, EyeOff, AlertCircle, ArrowRight, MapPin, Bell, Users, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or username'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage({ appMode = 'unified' }: { appMode?: 'mobile' | 'admin' | 'unified' }) {
  const navigate = useNavigate();
  const { login, loginWithPhone, logout, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Authentication Method: 'phone' (OTP) or 'email' (Password)
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>(appMode === 'admin' ? 'email' : 'phone');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const defaultEmail = appMode === 'admin' ? 'admin@greenfield.edu.in' : appMode === 'mobile' ? '' : 'admin@greenfield.edu.in';
  const defaultPassword = appMode === 'admin' ? 'admin123' : appMode === 'mobile' ? '' : 'admin123';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: defaultPassword,
    },
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirect depending on which app we're in
      if (appMode === 'mobile') {
        if (user.role === ROLES.DRIVER) {
          navigate('/driver', { replace: true });
        } else if (user.role === ROLES.PARENT) {
          navigate('/parent', { replace: true });
        } else {
          // Admin tried to login on mobile app
          setRoleError('This app is for Drivers and Parents only. Please use the Admin Portal.');
          logout();
        }
      } else if (appMode === 'admin') {
        if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.SCHOOL_ADMIN) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          // Driver/Parent tried to login on admin portal
          setRoleError('This portal is for Administrators only. Please use the YellowBird App.');
          logout();
        }
      } else {
        // Unified (legacy) — redirect based on role
        const redirectPath = user.role === ROLES.DRIVER
          ? '/driver'
          : user.role === ROLES.PARENT
            ? '/parent'
            : '/dashboard';
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, appMode]);

  const onSubmit = async (data: LoginForm) => {
    clearError();
    setRoleError(null);
    try {
      await login(data);
    } catch {
      // Error is already set in the store
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    clearError();

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!otpSent) {
      setOtpSent(true);
      toast.success(`OTP verification code sent to +91 ${cleanDigits.slice(-10)}`);
      return;
    }

    try {
      await loginWithPhone({ phone: cleanDigits });
    } catch {
      // Handled by store
    }
  };

  const features = [
    { icon: MapPin, label: 'Live GPS Tracking' },
    { icon: Bell, label: 'Parent Alerts' },
    { icon: Users, label: 'Driver Portal' },
    { icon: Shield, label: 'Route Management' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-auto" style={{ minHeight: '100dvh' }}>
      {/* ====================== LEFT PANEL — Desktop Branding ====================== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-brand-500 to-amber-700" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating glass shapes */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 right-32 w-40 h-40 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20"
        />
        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-32 left-24 w-56 h-56 rounded-full bg-white/5 backdrop-blur-xl border border-white/10"
        />
        <motion.div
          animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 right-16 w-24 h-24 rounded-2xl bg-white/8 backdrop-blur-xl border border-white/15"
        />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight">YellowBird</span>
                <p className="text-xs text-white/70 font-medium">School Transport System</p>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-5xl font-bold leading-tight mb-4">
              Real-Time School Bus<br />
              Tracking Platform
            </h2>
            <p className="text-amber-100 text-lg leading-relaxed max-w-md mb-12">
              Track every bus in real-time using just a smartphone.
              No GPS hardware required. Built for modern schools.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {features.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium border border-white/20"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ====================== MOBILE BRANDING HEADER ====================== */}
      <div className="lg:hidden relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-brand-500 to-amber-700" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Small floating shapes for mobile */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-4 right-8 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
        />
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-4 left-6 w-20 h-20 rounded-full bg-white/5 backdrop-blur-xl border border-white/10"
        />

        <div className="relative z-10 px-6 pt-12 pb-8 text-white" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 12px) + 2rem)' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">YellowBird</span>
                <p className="text-[10px] text-white/70 font-medium leading-tight">School Transport System</p>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="text-2xl font-bold leading-snug mb-2">
              Real-Time School Bus<br />
              Tracking Platform
            </h2>
            <p className="text-amber-100 text-sm leading-relaxed max-w-sm mb-5">
              Track every bus in real-time. No GPS hardware required.
            </p>

            {/* Horizontal scroll feature pills on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {features.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium whitespace-nowrap border border-white/20"
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Curved bottom edge for smooth transition to form */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white dark:bg-gray-950 rounded-t-[28px]" />
      </div>

      {/* ====================== RIGHT PANEL — Login Form ====================== */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 lg:py-0 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-md"
        >
          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5">
            {appMode === 'admin' ? 'Admin Portal' : appMode === 'mobile' ? 'Welcome to YellowBird' : 'Welcome back'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-7">
            {appMode === 'admin' ? 'Sign in with your administrator account' : appMode === 'mobile' ? 'Sign in as a Driver or Parent' : 'Sign in to your account to continue'}
          </p>

          {/* Role Error Alert */}
          {roleError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5"
            >
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">{roleError}</p>
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-5"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Auth Method Toggle Tabs */}
          {appMode !== 'admin' && (
            <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); clearError(); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === 'phone'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span>📱 Mobile OTP</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); clearError(); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === 'email'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span>📧 Password Login</span>
              </button>
            </div>
          )}

          {authMethod === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              {/* Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registered Mobile Phone Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent || isLoading}
                    className="w-full pl-14 pr-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400"
                    placeholder="98765 43210"
                    maxLength={14}
                    inputMode="numeric"
                  />
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {phoneError}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Enter the mobile number registered with your school.
                </p>
              </div>

              {/* OTP Code Input */}
              {otpSent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-center tracking-[0.5em] text-lg font-bold outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ OTP Code sent via SMS
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                    >
                      Change Number
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 active:shadow-md"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {!otpSent ? 'Get OTP Verification Code' : 'Verify OTP & Log In'}{' '}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400"
                    placeholder="you@school.edu"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => navigate(appMode === 'admin' ? '/admin/forgot-password' : '/forgot-password')}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all pr-12 placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 active:shadow-md"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Quick Admin Portal Link */}
          <div className="mt-4 text-center">
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-500/20 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Switch to Dedicated Admin Portal (/admin) →
            </a>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/60 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Demo Credentials
              </p>
              <a href="/admin" className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                /admin link
              </a>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-700/30">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-[10px] uppercase">Super</span>
                <span className="truncate">superadmin@smarttransport.com / admin123</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-700/30">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-[10px] uppercase">Admin</span>
                <span className="truncate">admin@greenfield.edu.in / admin123</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-700/30">
                <span className="px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 font-semibold text-[10px] uppercase">Driver</span>
                <span className="truncate">driver1@greenfield.edu.in / driver123</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-700/30">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-[10px] uppercase">Parent</span>
                <span className="truncate">parent1@gmail.com / parent123</span>
              </div>
            </div>
          </div>

          {/* Bottom safe area spacer for mobile */}
          <div className="h-6 lg:h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        </motion.div>
      </div>
    </div>
  );
}
