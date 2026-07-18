'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Light theme tokens (hardcoded so they're independent of globals.css variables)
const C = {
  bg:         '#f5f5f0',
  surface:    '#ffffff',
  border:     '#e2e2dc',
  borderHov:  '#c8c8c0',
  bgAlt:      '#f9f9f7',
  text:       '#1a1a1a',
  muted:      '#6b6b6b',
  faint:      '#a0a0a0',
  accent:     '#2563eb',
  accentBg:   '#dbeafe',
  success:    '#16a34a',
  successBg:  '#dcfce7',
  adminPurple:'#7c3aed',
  adminBg:    '#ede9fe',
};

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
  const [users, setUsers]   = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const router = useRouter();

  const formatBytes = (bytes: string | number) => {
    const size = Number(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    const user = JSON.parse(userData);
    if (user.role !== 'ADMIN') { router.push('/'); return; }

    fetch(`${API_BASE}/auth/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) setUsers(data.users);
        else setError(data.error || 'Failed to load users');
        setLoading(false);
      })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [router]);

  const totalStorage = users.reduce((s, u) => s + Number(u.totalStorage), 0);
  const totalFiles   = users.reduce((s, u) => s + u.fileCount, 0);
  const activeToday  = users.filter(u => u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 86400000).length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg, color: C.muted, fontSize: '0.9rem' }}>
      Loading…
    </div>
  );
  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg, color: '#dc2626', fontSize: '0.9rem' }}>
      {error}
    </div>
  );

  const statCards = [
    { label: 'Total Users',   value: users.length,          accent: '#2563eb', bg: '#dbeafe' },
    { label: 'Active Today',  value: activeToday,           accent: '#16a34a', bg: '#dcfce7' },
    { label: 'Total Files',   value: totalFiles,            accent: '#d97706', bg: '#fef3c7' },
    { label: 'Total Storage', value: formatBytes(totalStorage), accent: '#7c3aed', bg: '#ede9fe' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: 'clamp(1rem, 4vw, 2rem)', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>PolyStore</div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>Admin Panel</h1>
          </div>
          <a href="/" style={{ padding: '0.5rem 1rem', backgroundColor: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
            ← Dashboard
          </a>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {statCards.map(card => (
            <div key={card.label} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${card.accent}`, borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.accent, lineHeight: 1 }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* ── Users Table ── */}
        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.125rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: C.text }}>All Users</h2>
            <span style={{ fontSize: '0.8rem', color: C.faint, backgroundColor: C.bgAlt, padding: '0.2rem 0.625rem', borderRadius: 999 }}>{users.length} accounts</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['User', 'Role', 'Signed Up', 'Last Login', 'Files', 'Storage'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.bgAlt}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* User */}
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: '0.875rem' }}>{u.name || '—'}</div>
                      <div style={{ fontSize: '0.775rem', color: C.muted, marginTop: '0.15rem' }}>{u.email}</div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        backgroundColor: u.role === 'ADMIN' ? C.adminBg : C.bgAlt,
                        color: u.role === 'ADMIN' ? C.adminPurple : C.muted,
                        border: `1px solid ${u.role === 'ADMIN' ? '#c4b5fd' : C.border}`,
                      }}>
                        {u.role}
                      </span>
                    </td>

                    {/* Signed up */}
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.825rem', color: C.muted, whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    {/* Last login */}
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: u.lastLoginAt ? C.success : C.faint, fontWeight: u.lastLoginAt ? 500 : 400 }}>
                        {timeAgo(u.lastLoginAt)}
                      </span>
                    </td>

                    {/* Files */}
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: C.text }}>
                      {u.fileCount}
                    </td>

                    {/* Storage */}
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 120 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: C.bgAlt, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                          <div style={{
                            height: '100%',
                            borderRadius: 999,
                            backgroundColor: C.accent,
                            width: `${Math.min((Number(u.totalStorage) / Math.max(totalStorage, 1)) * 100, 100)}%`,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>
                          {formatBytes(u.totalStorage)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: C.faint, fontSize: '0.9rem' }}>
                No users found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
