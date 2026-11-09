import { API_URL } from '../lib/api';
import { useState } from 'react';
import AuthLayout, { AuthAlert } from '../components/AuthLayout';

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

      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to send OTP code');

      setResetEmail(email);
      setMessage(data.message || 'OTP code has been sent to your email.');

      setTimeout(() => navigateTo('reset-password'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email linked to your account and we will send a one-time code."
      footer={
        <div className="flex flex-col gap-2 text-sm text-slate-500">
          <p>
            Remembered it?{' '}
            <button
              onClick={() => navigateTo('login')}
              className="font-semibold text-white hover:text-brand-300 transition-colors"
            >
              Back to sign in
            </button>
          </p>
          <p>
            Already have a code?{' '}
            <button
              onClick={() => navigateTo('reset-password')}
              className="font-semibold text-white hover:text-brand-300 transition-colors"
            >
              Enter it here
            </button>
          </p>
        </div>
      }
    >
      {error && <AuthAlert>{error}</AuthAlert>}
      {message && <AuthAlert type="success">{message}</AuthAlert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="forgot-email">Email address</label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="name@example.com"
          />
        </div>

        <button type="submit" disabled={loading || !!message} className="btn-primary w-full py-3 mt-1">
          {loading ? 'Sending code...' : 'Send reset code'}
        </button>
      </form>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dark-border bg-dark-surface2/50 p-3.5">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-slate-500 leading-relaxed">
          The code is valid for 10 minutes. If the email does not arrive, check your spam folder or contact an admin.
        </p>
      </div>
    </AuthLayout>
  );
}
