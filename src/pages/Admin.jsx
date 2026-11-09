import { API_URL } from '../lib/api';
import { useState, useEffect } from 'react';

export default function Admin({ token, navigateTo }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch users (status ${response.status})`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid content type (non-JSON)');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Cannot connect to API server. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeTier = async (username, newTier) => {
    try {
      const params = new URLSearchParams();
      params.append('tier', newTier);

      const response = await fetch(`${API_URL}/admin/users/${username}/tier`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) throw new Error('Failed to update tier');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const premiumCount = users.filter((u) => u.tier === 'premium').length;

  return (
    <div className="w-full card p-5 sm:p-6 md:p-8 animate-fade-in-up flex-1">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-6 border-b border-dark-border">
        <div>
          <h2 className="page-title">Admin Dashboard</h2>
          <p className="page-subtitle mt-1">Manage user roles and subscription tiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-neutral">{users.length} users</span>
          <span className="badge-warn">{premiumCount} premium</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-dark-border border-t-brand-400 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm">Loading users data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connection Error</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">{error}</p>
          <button onClick={fetchUsers} className="btn-white text-xs px-5 py-2.5">
            Retry connection
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dark-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-surface2/80 text-slate-500 text-[10px] uppercase tracking-[0.1em]">
                <th className="p-3.5 font-bold border-b border-dark-border">ID</th>
                <th className="p-3.5 font-bold border-b border-dark-border">Username</th>
                <th className="p-3.5 font-bold border-b border-dark-border">Email</th>
                <th className="p-3.5 font-bold border-b border-dark-border">Role</th>
                <th className="p-3.5 font-bold border-b border-dark-border">Tier</th>
                <th className="p-3.5 font-bold text-center border-b border-dark-border">Usage</th>
                <th className="p-3.5 font-bold text-center border-b border-dark-border">Action</th>
              </tr>
            </thead>
            <tbody className="bg-dark-surface text-sm">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dark-border last:border-0 hover:bg-dark-surface2/60 transition-colors">
                  <td className="p-3.5 font-mono text-slate-600 text-xs">#{u.id}</td>
                  <td className="p-3.5 font-medium text-slate-200">{u.username}</td>
                  <td className="p-3.5 text-slate-500 text-xs">{u.email || '-'}</td>
                  <td className="p-3.5">
                    {u.is_admin ? <span className="badge-admin">Admin</span> : <span className="badge-neutral">User</span>}
                  </td>
                  <td className="p-3.5">
                    <span className={u.tier === 'premium' ? 'badge-warn' : 'badge-neutral'}>{u.tier}</span>
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-400 text-xs">
                    {u.tier === 'premium' ? '∞' : `${u.usage_count}/5`}
                  </td>
                  <td className="p-3.5 text-center">
                    {!u.is_admin && (
                      <select
                        value={u.tier}
                        onChange={(e) => changeTier(u.username, e.target.value)}
                        className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg block w-full p-2 outline-none
                                   hover:border-dark-borderHover focus:border-brand-500/60 transition-colors cursor-pointer"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
