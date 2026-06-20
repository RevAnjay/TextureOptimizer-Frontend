import { useState } from 'react';

export default function ResetPassword({ navigateTo, resetEmail }) {
  const [email, setEmail] = useState(resetEmail || '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (otpCode.length !== 6) {
        throw new Error('OTP code must be exactly 6 digits.');
      }
      if (newPassword.len < 6) {
        throw new Error('New password must be at least 6 characters.');
      }

      const params = new URLSearchParams();
      params.append('email', email);
      params.append('otp_code', otpCode);
      params.append('new_password', newPassword);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Reset password failed');
      }

      setMessage(data.message || 'Password reset successfully! Redirecting...');
      
      setTimeout(() => {
        navigateTo('login');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-dark-bg text-slate-300">
      
      {/* Kiri: Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Reset Password</h2>
            <p className="text-slate-400">Complete authentication to set your new password</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 p-4 rounded-lg mb-6 text-sm font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">OTP Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white text-center text-xl tracking-[0.5em] focus:outline-none focus:border-brand-500 transition-colors font-mono"
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full py-3 mt-4 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-8 text-center lg:text-left text-sm text-slate-400">
            Back to{' '}
            <button onClick={() => navigateTo('login')} className="text-white hover:text-brand-400 font-medium transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Kanan: Branding / Graphic Area (Hanya Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-dark-surface border-l border-dark-border items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern for technical feel */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '32px 32px', opacity: 0.3 }}></div>
        
        <div className="relative z-10 p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Finish Setup</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Choose a strong new password that is at least 6 characters long to secure your account.
          </p>
        </div>
      </div>
      
    </div>
  );
}
