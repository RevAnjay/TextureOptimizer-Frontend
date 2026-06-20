import { useState } from 'react';

export default function Login({ setToken, setUser, navigateTo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      setToken(data.access_token);
      setUser({ username: data.username, tier: data.tier });
      navigateTo('home');
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
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Sign in</h2>
            <p className="text-slate-400">Welcome back to Texture Optimizer</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Password</label>
                <button 
                  type="button"
                  onClick={() => navigateTo('forgot-password')} 
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
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
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center lg:text-left text-sm text-slate-400">
            Don't have an account?{' '}
            <button onClick={() => navigateTo('register')} className="text-white hover:text-brand-400 font-medium transition-colors">
              Sign up
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
            <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Optimize Your Textures</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Compress and optimize Minecraft resource packs with advanced algorithms. Reduce file size drastically while maintaining visual fidelity.
          </p>
        </div>
      </div>
      
    </div>
  );
}
