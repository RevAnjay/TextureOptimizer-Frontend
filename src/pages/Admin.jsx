import { useState, useEffect } from 'react';

export default function Admin({ token, navigateTo }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${username}/tier`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) throw new Error('Failed to update tier');
      // Refresh list
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full bg-dark-surface border border-dark-border rounded-2xl p-6 md:p-8 animate-fade-in-up flex-1">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-dark-border">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Manage user roles and subscription tiers.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-dark-border border-t-brand-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm">Loading users data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connection Error</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">{error}</p>
          <button 
            onClick={fetchUsers}
            className="px-5 py-2.5 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg text-xs transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dark-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-surface2 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-dark-border">ID</th>
                <th className="p-4 font-semibold border-b border-dark-border">Username</th>
                <th className="p-4 font-semibold border-b border-dark-border">Email</th>
                <th className="p-4 font-semibold border-b border-dark-border">Role</th>
                <th className="p-4 font-semibold border-b border-dark-border">Tier</th>
                <th className="p-4 font-semibold text-center border-b border-dark-border">Usage</th>
                <th className="p-4 font-semibold text-center border-b border-dark-border">Action</th>
              </tr>
            </thead>
            <tbody className="bg-dark-surface text-sm">
              {users.map(u => (
                <tr key={u.id} className="border-b border-dark-border hover:bg-dark-surface2 transition-colors">
                  <td className="p-4 font-mono text-slate-500">#{u.id}</td>
                  <td className="p-4 font-medium text-slate-300">{u.username}</td>
                  <td className="p-4 text-slate-400">{u.email || '-'}</td>
                  <td className="p-4">
                    {u.is_admin ? (
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg uppercase tracking-wider">Admin</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-dark-bg text-slate-400 border border-dark-border text-[10px] font-bold rounded-lg uppercase tracking-wider">User</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${
                      u.tier === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-dark-bg text-slate-300 border-dark-border'
                    }`}>
                      {u.tier}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-slate-400">
                    {u.tier === 'premium' ? '∞' : `${u.usage_count}/5`}
                  </td>
                  <td className="p-4 text-center">
                    {!u.is_admin && (
                      <select 
                        value={u.tier}
                        onChange={(e) => changeTier(u.username, e.target.value)}
                        className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2 outline-none"
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
