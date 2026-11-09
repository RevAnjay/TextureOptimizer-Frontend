import { API_URL, newPasswordError } from '../lib/api';
import { useState } from 'react';
import AuthLayout, { AuthAlert } from '../components/AuthLayout';

export default function ResetPassword({ navigateTo, resetEmail }) {
  const [email, setEmail] = useState(resetEmail || '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (otpCode.length !== 6) throw new Error('OTP code must be exactly 6 digits.');
      const passwordError = newPasswordError(newPassword);
      if (passwordError) throw new Error(passwordError);

      const params = new URLSearchParams();
      params.append('email', email);
      params.append('otp_code', otpCode);
      params.append('new_password', newPassword);

      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Reset password failed');

      setMessage(data.message || 'Password reset successfully! Redirecting...');
      setTimeout(() => navigateTo('login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter the code we emailed you, then set a password you have not used before."
      footer={
        <p className="text-sm text-slate-500">
          Back to{' '}
          <button
            onClick={() => navigateTo('login')}
            className="font-semibold text-white hover:text-brand-300 transition-colors"
          >
            sign in
          </button>
        </p>
      }
    >
      {error && <AuthAlert>{error}</AuthAlert>}
      {message && <AuthAlert type="success">{message}</AuthAlert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
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
          <label className="label" htmlFor="reset-otp">Reset code</label>
          <input
            id="reset-otp"
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            className="field text-center text-xl tracking-[0.55em] font-mono py-3"
            placeholder="000000"
          />
        </div>

        <div>
          <label className="label" htmlFor="reset-password">New password</label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field pr-11"
              placeholder="at least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || !!message} className="btn-primary w-full py-3 mt-1">
          {loading ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}
