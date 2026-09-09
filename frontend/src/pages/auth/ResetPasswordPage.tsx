/**
 * Reset Password Page — user sets a new password using a valid reset token from URL.
 * Accessed via: /reset-password?token=xxxxx
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

const resetSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  // Auto-redirect after success
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, navigate]);

  const onSubmit = async (data: ResetForm) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: data.new_password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-white dark:bg-gray-950" style={{ minHeight: '100dvh' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/15 mb-6 mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Reset Link</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/25"
          >
            Request New Link
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-auto" style={{ minHeight: '100dvh' }}>
      {/* ====================== LEFT PANEL — Desktop Branding ====================== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-brand-500 to-amber-700" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
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

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight">YellowBird</span>
                <p className="text-xs text-white/70 font-medium">School Transport System</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Set Your<br />New Password
            </h2>
            <p className="text-amber-100 text-lg leading-relaxed max-w-md">
              Choose a strong password that you'll remember. We recommend at least 8 characters with a mix of letters and numbers.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ====================== MOBILE BRANDING HEADER ====================== */}
      <div className="lg:hidden relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-brand-500 to-amber-700" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 px-6 pt-12 pb-8 text-white" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 12px) + 2rem)' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">YellowBird</span>
                <p className="text-[10px] text-white/70 font-medium leading-tight">School Transport System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold leading-snug mb-1">New Password</h2>
            <p className="text-amber-100 text-sm leading-relaxed">Create a strong, memorable password.</p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white dark:bg-gray-950 rounded-t-[28px]" />
      </div>

      {/* ====================== RIGHT PANEL — Form ====================== */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 lg:py-0 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-md"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {isSuccess ? (
            /* ─── Success State ─── */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-500/15 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                Redirecting to login in {countdown}s...
              </p>
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-brand-500/25"
              >
                Sign In Now
              </Link>
            </motion.div>
          ) : (
            /* ─── Form State ─── */
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/15 mb-6">
                <ShieldCheck className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5">Set New Password</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-7">
                Enter your new password below. Make sure it's at least 6 characters long.
              </p>

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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('new_password')}
                      className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all pr-12 placeholder:text-gray-400"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.new_password && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.new_password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      {...register('confirm_password')}
                      className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all pr-12 placeholder:text-gray-400"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.confirm_password.message}
                    </p>
                  )}
                </div>

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
                      Reset Password <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </>
          )}

          <div className="h-6 lg:h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        </motion.div>
      </div>
    </div>
  );
}
