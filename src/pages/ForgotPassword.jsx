import { useState } from 'react';

export default function ForgotPassword({ navigateTo, setResetEmail }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('email', email);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP code');
      }

      setResetEmail(email);
      setMessage(data.message || 'OTP code has been sent to your email.');
      
      // Auto redirect to reset password after 2 seconds
      setTimeout(() => {
        navigateTo('reset-password');
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
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Forgot Password</h2>
            <p className="text-slate-400">Enter your email to request a reset OTP code</p>
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full py-3 mt-4 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending code...' : 'Request OTP'}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-3 text-center lg:text-left">
            <p className="text-sm text-slate-400">
              Remember your password?{' '}
              <button onClick={() => navigateTo('login')} className="text-white hover:text-brand-400 font-medium transition-colors">
                Sign in
              </button>
            </p>
            <p className="text-sm text-slate-400">
              Already have an OTP?{' '}
              <button onClick={() => navigateTo('reset-password')} className="text-white hover:text-brand-400 font-medium transition-colors">
                Reset password
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Kanan: Branding / Graphic Area (Hanya Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-dark-surface border-l border-dark-border items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern for technical feel */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '32px 32px', opacity: 0.3 }}></div>
        
        <div className="relative z-10 p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Secure Recovery</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Verify ownership of your account with a secure, one-time passcode delivered directly to your inbox.
          </p>
        </div>
      </div>
      
    </div>
  );
}
