'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

type UserStat = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  fileCount: number;
  totalStorage: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const formatBytes = (bytes: string | number) => {
    const size = Number(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) { router.push('/login'); return; }

    const user = JSON.parse(userData);
    if (user.role !== 'ADMIN') { router.push('/'); return; }

    fetch(`${API_BASE}/auth/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || 'Failed to load users');
        }
        setLoading(false);
      })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [router]);

  const totalStorage = users.reduce((sum, u) => sum + Number(u.totalStorage), 0);
  const totalFiles = users.reduce((sum, u) => sum + u.fileCount, 0);
  const activeToday = users.filter(u => u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 86400000).length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
      Loading admin panel...
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8a8a' }}>
      {error}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            PolyStore
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', margin: 0 }}>Admin Panel</h1>
        </div>
        <a href="/" style={{ padding: '0.6rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Dashboard
        </a>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Users', value: users.length, color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
          { label: 'Active Today', value: activeToday, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
          { label: 'Total Files', value: totalFiles, color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
          { label: 'Total Storage', value: formatBytes(totalStorage), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
        ].map(card => (
          <div key={card.label} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `3px solid ${card.color}`, background: card.bg }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>All Users</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{users.length} accounts</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['User', 'Role', 'Signed Up', 'Last Login', 'Files', 'Storage'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'white' }}>{u.name || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)',
                      color: u.role === 'ADMIN' ? '#a78bfa' : 'var(--text-secondary)',
                      border: u.role === 'ADMIN' ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: u.lastLoginAt ? '#34d399' : 'var(--text-secondary)' }}>
                      {timeAgo(u.lastLoginAt)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>
                    {u.fileCount}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '4px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: '80px' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: '999px',
                          backgroundColor: '#818cf8',
                          width: `${Math.min((Number(u.totalStorage) / Math.max(totalStorage, 1)) * 100, 100)}%`,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatBytes(u.totalStorage)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
