import { useState } from 'react';

export default function Register({ navigateTo }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Register, 2: OTP, 3: Success
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('email', email);
      params.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Terjadi kesalahan saat registrasi');
      }

      setStep(2); // Go to OTP step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('email', email);
      params.append('otp_code', otp);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Terjadi kesalahan saat verifikasi');
      }

      setStep(3); // Go to Success step
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
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Create Account</h2>
            <p className="text-slate-400">Join us to optimize your textures</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {step === 3 ? (
            <div className="text-center">
              <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 p-4 rounded-lg mb-6 text-sm font-medium">
                Registration successful! Please sign in to continue.
              </div>
              <button
                onClick={() => navigateTo('login')}
                className="w-full py-3 mt-2 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors"
              >
                Continue to Sign In
              </button>
            </div>
          ) : step === 2 ? (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
              <div className="text-center lg:text-left mb-2">
                <p className="text-slate-400 text-sm">We've sent a 6-digit OTP code to:</p>
                <p className="text-white font-semibold">{email}</p>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 text-center lg:text-left">Enter OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-dark-surface border border-dark-border rounded-lg p-4 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-brand-500 transition-colors font-mono"
                  placeholder="000000"
                />
                <p className="mt-4 text-xs text-slate-400 p-3 rounded-lg border border-dark-border bg-dark-surface">
                  <span className="text-brand-400 font-semibold">Note:</span> If you don't see the email, please check your <strong className="text-white">Spam</strong> folder.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 mt-2 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
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
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Choose username"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Sign Up'}
              </button>
            </form>
          )}

          {step === 1 && (
            <p className="mt-8 text-center lg:text-left text-sm text-slate-400">
              Already have an account?{' '}
              <button onClick={() => navigateTo('login')} className="text-white hover:text-brand-400 font-medium transition-colors">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Kanan: Branding / Graphic Area (Hanya Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-dark-surface border-l border-dark-border items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '32px 32px', opacity: 0.3 }}></div>
        
        <div className="relative z-10 p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Lightning Fast</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Boost your FPS by stripping away unneeded texture resolution. Perfect for PvP servers and low-end machines.
          </p>
        </div>
      </div>
      
    </div>
  );
}
