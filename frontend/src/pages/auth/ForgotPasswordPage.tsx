/**
 * Forgot Password Page — user enters their email to receive a password reset link.
 * Premium design matching the login page aesthetic.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

const forgotSchema = z.object({
  email: z.string().min(1, 'Please enter your email or username'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setIsSuccess(true);
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        // API always returns success to prevent email enumeration,
        // but handle unexpected errors gracefully
        setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              Forgot Your<br />Password?
            </h2>
            <p className="text-amber-100 text-lg leading-relaxed max-w-md">
              No worries! Enter your email and we'll send you a link to reset your password.
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
            <h2 className="text-2xl font-bold leading-snug mb-1">Forgot Password?</h2>
            <p className="text-amber-100 text-sm leading-relaxed">We'll send you a reset link via email.</p>
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
          {/* Back to login */}
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
                If an account exists with that email address, we've sent a password reset link. Please check your inbox and spam folder.
              </p>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Tip:</strong> The reset link expires in 15 minutes. If you don't receive an email, try again or contact your school administrator.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-brand-500/25"
              >
                Return to Sign In
              </Link>
            </motion.div>
          ) : (
            /* ─── Form State ─── */
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/15 mb-6">
                <Mail className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5">Reset Password</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-7">
                Enter the email address associated with your account and we'll send you a link to reset your password.
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm sm:text-base outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400"
                    placeholder="you@school.edu"
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email.message}
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
                      Send Reset Link <Mail className="w-4 h-4" />
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
