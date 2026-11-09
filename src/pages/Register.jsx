import { API_URL, newPasswordError } from '../lib/api';
import { useState } from 'react';
import AuthLayout, { AuthAlert } from '../components/AuthLayout';

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
      const passwordError = newPasswordError(password);
      if (passwordError) throw new Error(passwordError);
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('email', email);
      params.append('password', password);

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Registration failed');

      setStep(2);
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

      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Verification failed');

      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Details', 'Verify', 'Done'];
  const stepIndex = step - 1;

  const stepper = (
    <div className="flex items-center gap-2 mb-7">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
          <div
            className={`flex items-center gap-2 text-[11px] font-semibold transition-colors ${
              i <= stepIndex ? 'text-brand-300' : 'text-slate-600'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-all ${
                i < stepIndex
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                  : i === stepIndex
                  ? 'bg-brand-400 border-brand-400 text-[#04150f]'
                  : 'border-dark-border text-slate-600'
              }`}
            >
              {i < stepIndex ? '✓' : i + 1}
            </span>
            <span className="whitespace-nowrap">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 ${i < stepIndex ? 'bg-brand-500/40' : 'bg-dark-border'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <AuthLayout
      title={step === 3 ? 'You are all set' : step === 2 ? 'Check your inbox' : 'Create your account'}
      subtitle={
        step === 3
          ? 'Your account is verified and ready to use.'
          : step === 2
          ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
          : 'Start optimizing resource packs in under a minute.'
      }
      badge={step < 3 ? stepper : null}
      footer={
        step === 1 ? (
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <button
              onClick={() => navigateTo('login')}
              className="font-semibold text-white hover:text-brand-300 transition-colors"
            >
              Sign in
            </button>
          </p>
        ) : null
      }
    >
      {error && <AuthAlert>{error}</AuthAlert>}

      {step === 3 ? (
        <div className="animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/12 border border-brand-500/25 flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <button onClick={() => navigateTo('login')} className="btn-primary w-full py-3">
            Continue to sign in
          </button>
        </div>
      ) : step === 2 ? (
        <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
          <div>
            <label className="label text-center" htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="field text-center text-2xl tracking-[0.55em] font-mono py-3.5"
              placeholder="000000"
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-dark-border bg-dark-surface2/60 p-3.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-500 leading-relaxed">
              Didn&apos;t get the email? Check your <span className="font-semibold text-slate-300">spam</span> or
              promotions folder before requesting a new code.
            </p>
          </div>

          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full py-3 mt-1">
            {loading ? 'Verifying...' : 'Verify & continue'}
          </button>
          <button
            type="button"
            onClick={() => { setStep(1); setOtp(''); setError(''); }}
            className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors mx-auto"
          >
            Use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field"
              placeholder="choose a username"
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="at least 8 characters"
            />
            {password.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= n * 4 ? 'bg-brand-500' : 'bg-dark-border'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            By signing up you agree to our fair-use policy. Files are deleted automatically after 24 hours.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
