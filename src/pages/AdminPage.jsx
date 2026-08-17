import { BarChart2, Car, Check, ChevronDown, DollarSign, Hash, Mail, Phone, Route, Search, ShieldOff, Trash2, TrendingUp, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';

const KSh = (v) => `KSh ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const capitalize = (s) => s ? s[0].toUpperCase() + s.slice(1) : '—';

function BarChart({ data = [], valueKey, labelKey, color = '#22d3ee', height = 120, formatValue = (v) => v }) {
  if (!data.length) return <p style={{ color: '#6b7280', fontSize: 13 }}>No data yet</p>;
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  const barW = Math.min(40, Math.floor(560 / data.length) - 4);
  return (
    <svg width="100%" viewBox={`0 0 ${Math.max(data.length * (barW + 4), 100)} ${height + 32}`} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const barH = Math.max((val / max) * height, val > 0 ? 2 : 0);
        const x = i * (barW + 4);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} opacity={0.85} />
            <title>{`${d[labelKey]}: ${formatValue(val)}`}</title>
            {barH > 14 && (
              <text x={x + barW / 2} y={y + barH - 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>
                {val}
              </text>
            )}
            <text x={x + barW / 2} y={height + 18} textAnchor="middle" fontSize={9} fill="#6b7280">
              {String(d[labelKey] || '').slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const TABS = [
  { id: 'stats',     label: 'Stats',     icon: <DollarSign size={15} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
  { id: 'users',     label: 'Users',     icon: <UsersRound size={15} /> },
  { id: 'rides',     label: 'Rides',     icon: <Route size={15} /> },
  { id: 'bookings',  label: 'Bookings',  icon: <TrendingUp size={15} /> },
];

const TH = ({ children }) => (
  <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
    {children}
  </th>
);
const TD = ({ children, style = {} }) => (
  <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...style }}>{children}</td>
);

function DriverApprovalList({ drivers, onApprove }) {
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const field = (icon, label, value) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 200 }}>
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#6b7280', minWidth: 110, flexShrink: 0 }}>{label}</span>
      {value
        ? <strong style={{ color: '#f1f5f9' }}>{value}</strong>
        : <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Not provided</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {drivers.map((d) => {
        const isOpen = expandedId === d.id;
        return (
          <div key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Header row — always visible, clickable */}
            <div
              onClick={() => toggle(d.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', transition: 'background .15s', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent' }}
              onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
              onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Avatar initials */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#22d3ee', flexShrink: 0 }}>
                {d.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={12} />{d.email}
                </div>
              </div>

              {/* Vehicle summary — shown in collapsed state */}
              {!isOpen && (d.car_type || d.vehicle_model) && (
                <div style={{ fontSize: 13, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Car size={13} />{[d.car_type, d.vehicle_model].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Date */}
              <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
              </div>

              {/* Approve button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onApprove(d.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(52,211,153,0.2)', color: '#34d399', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <Check size={14} /> Approve
              </button>

              <ChevronDown size={16} style={{ color: '#6b7280', flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
            </div>

            {/* Expanded detail panel */}
            {isOpen && (
              <div style={{ padding: '12px 20px 18px 76px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 40px' }}>
                  {field(<Car size={13} />,   'Vehicle',          d.vehicle_model)}
                  {field(<Hash size={13} />,  'Licence plate',    d.license_plate)}
                  {field(<Hash size={13} />,  'Driver licence №', d.license_number)}
                  {field(<Phone size={13} />, 'M-Pesa phone',     d.mpesa_phone)}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#4b5563' }}>
                  Registered: {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab]             = useState('stats');
  const [error, setError]         = useState('');
  const [drivers, setDrivers]     = useState([]);
  const [stats, setStats]         = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers]         = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [rides, setRides]         = useState([]);
  const [rideSearch, setRideSearch] = useState('');
  const [bookings, setBookings]   = useState([]);

  const loadStats = async() => {
    try {
      const [pending, statistics] = await Promise.all([
        api('/admin/drivers/pending', { token }),
        api('/admin/statistics', { token }),
      ]);
      setDrivers(pending.drivers); setStats(statistics); setError('');
    } catch (err) { setError(err.message); }
  };

  const loadAnalytics = async() => {
    try { setAnalytics(await api('/admin/analytics', { token })); setError(''); }
    catch (err) { setError(err.message); }
  };

  const loadUsers = async(search = userSearch) => {
    try { const d = await api(`/admin/users?search=${encodeURIComponent(search)}`, { token }); setUsers(d.users); setError(''); }
    catch (err) { setError(err.message); }
  };

  const loadRides = async(search = rideSearch) => {
    try { const d = await api(`/admin/rides?search=${encodeURIComponent(search)}`, { token }); setRides(d.rides); setError(''); }
    catch (err) { setError(err.message); }
  };

  const loadBookings = async() => {
    try { const d = await api('/admin/bookings', { token }); setBookings(d.bookings); setError(''); }
    catch (err) { setError(err.message); }
  };

  useEffect(() => {
    if (tab === 'stats')     loadStats();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'users')     loadUsers('');
    if (tab === 'rides')     loadRides('');
    if (tab === 'bookings')  loadBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approveDriver = async(id) => {
    try { await api(`/admin/drivers/${id}/approve`, { token, method: 'PUT' }); loadStats(); }
    catch (err) { setError(err.message); }
  };

  const toggleSuspend = async(user) => {
    try {
      await api(`/admin/users/${user.id}/suspend`, { token, method: 'PUT', body: JSON.stringify({ suspend: !user.is_suspended }) });
      loadUsers();
    } catch (err) { setError(err.message); }
  };

  const deleteRide = async(id) => {
    if (!window.confirm('Remove this ride listing?')) return;
    try { await api(`/admin/rides/${id}`, { token, method: 'DELETE' }); loadRides(); }
    catch (err) { setError(err.message); }
  };

  const statusColor = (s) => ({ paid: '#34d399', accepted: '#60a5fa', pending: '#fbbf24', declined: '#f87171', cancelled: '#9ca3af', refunded: '#c4b5fd' })[s] || '#9ca3af';

  const pill = (label, color) => (
    <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 12, fontWeight: 600, background: `${color}22`, color }}>{label}</span>
  );

  const glassPanel = { padding: '20px 24px', borderRadius: 12 };

  return (
    <section className="page dashboard-page">
      <div className="section-heading">
        <div><span className="eyebrow">Superadmin</span><h1>Admin Dashboard</h1></div>
      </div>

      {error && <div className="state-bar danger">{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t.id ? '#22d3ee' : 'rgba(255,255,255,0.08)', color: tab === t.id ? '#0b1729' : 'inherit' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === 'stats' && stats && (
        <>
          <div className="dashboard-grid">
            <div className="dashboard-card glass"><DollarSign size={22} /><span>Total paid rides</span><strong>{stats.paidRides}</strong></div>
            <div className="dashboard-card glass"><DollarSign size={22} /><span>Gross revenue</span><strong>{KSh(stats.grossRevenue)}</strong></div>
            <div className="dashboard-card glass"><DollarSign size={22} /><span>Company revenue ({stats.companyFeePercent}%)</span><strong>{KSh(stats.companyRevenue)}</strong></div>
            <div className="dashboard-card glass"><UsersRound size={22} /><span>Driver payouts</span><strong>{KSh(stats.driverPayout)}</strong></div>
          </div>
          <div className="site-list glass" style={{ marginTop: 20 }}>
            <h2>Driver earnings</h2>
            {stats.drivers.length === 0 ? <p>No paid rides yet.</p> : stats.drivers.map((d) => (
              <article className="site-card" key={d.driver_id}>
                <div><h2>{d.driver_name}</h2><p>{d.paid_rides} paid ride(s) · Gross {KSh(d.grossRevenue)}</p></div>
                <div><strong>Driver: {KSh(d.driverPayout)}</strong><p>Company: {KSh(d.companyRevenue)}</p></div>
              </article>
            ))}
          </div>
          <div className="glass" style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Pending driver approvals
                {drivers.length > 0 && (
                  <span style={{ marginLeft: 10, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: 100, padding: '2px 10px', fontSize: 13 }}>
                    {drivers.length}
                  </span>
                )}
              </h2>
              <button type="button" onClick={loadStats} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 12px', fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                ↻ Refresh
              </button>
            </div>
            {drivers.length === 0
              ? <p style={{ padding: '20px', color: '#6b7280' }}>No drivers awaiting approval.</p>
              : <DriverApprovalList drivers={drivers} onApprove={approveDriver} />}
          </div>
        </>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="dashboard-grid">
            <div className="dashboard-card glass"><UsersRound size={22} /><span>Active passengers (30d)</span><strong>{analytics.activeUsers.active_passengers}</strong></div>
            <div className="dashboard-card glass"><UsersRound size={22} /><span>Active drivers (30d)</span><strong>{analytics.activeUsers.active_drivers}</strong></div>
          </div>
          <div className="glass" style={glassPanel}>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Paid rides — last 30 days</h3>
            <div style={{ overflowX: 'auto' }}><BarChart data={analytics.ridesOverTime} valueKey="count" labelKey="date" color="#22d3ee" /></div>
          </div>
          <div className="glass" style={glassPanel}>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Revenue (KSh) — last 30 days</h3>
            <div style={{ overflowX: 'auto' }}><BarChart data={analytics.revenueOverTime} valueKey="revenue" labelKey="date" color="#34d399" formatValue={(v) => `KSh ${v}`} /></div>
          </div>
          <div className="glass" style={glassPanel}>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>New users — last 30 days</h3>
            <div style={{ overflowX: 'auto' }}><BarChart data={analytics.userGrowth} valueKey="count" labelKey="date" color="#a78bfa" /></div>
          </div>
          <div className="glass" style={glassPanel}>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Popular routes (all time)</h3>
            {analytics.popularRoutes.length === 0 ? <p style={{ color: '#6b7280', fontSize: 13 }}>No paid rides yet</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr><TH>Route</TH><TH>Bookings</TH></tr></thead>
                <tbody>
                  {analytics.popularRoutes.map((r, i) => (
                    <tr key={i}>
                      <TD><strong>{r.origin}</strong> → {r.destination}</TD>
                      <TD style={{ fontWeight: 700, color: '#22d3ee' }}>{r.bookings}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="glass" style={glassPanel}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 14 }} placeholder="Search by name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadUsers(userSearch)} />
            </div>
            <button type="button" className="button compact" onClick={() => loadUsers(userSearch)}>Search</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Joined</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_suspended ? 0.55 : 1 }}>
                    <TD style={{ fontWeight: 600 }}>{u.name}</TD>
                    <TD style={{ color: '#9ca3af' }}>{u.email}</TD>
                    <TD>{pill(capitalize(u.role), u.role === 'driver' ? '#60a5fa' : u.role === 'superadmin' ? '#f6a623' : '#a78bfa')}</TD>
                    <TD style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</TD>
                    <TD>{pill(u.is_suspended ? 'Suspended' : 'Active', u.is_suspended ? '#f87171' : '#34d399')}</TD>
                    <TD>
                      {u.role !== 'superadmin' && (
                        <button type="button" onClick={() => toggleSuspend(u)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: u.is_suspended ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)', color: u.is_suspended ? '#34d399' : '#f87171' }}>
                          {u.is_suspended ? <><Check size={12} /> Unsuspend</> : <><ShieldOff size={12} /> Suspend</>}
                        </button>
                      )}
                    </TD>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} style={{ padding: '24px 10px', textAlign: 'center', color: '#6b7280' }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RIDES */}
      {tab === 'rides' && (
        <div className="glass" style={glassPanel}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 14 }} placeholder="Search by origin, destination, or driver…" value={rideSearch} onChange={(e) => setRideSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadRides(rideSearch)} />
            </div>
            <button type="button" className="button compact" onClick={() => loadRides(rideSearch)}>Search</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr><TH>ID</TH><TH>Route</TH><TH>Driver</TH><TH>Price/seat</TH><TH>Seats</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {rides.map((r) => (
                  <tr key={r.id}>
                    <TD style={{ color: '#9ca3af' }}>#{r.id}</TD>
                    <TD style={{ fontWeight: 600 }}>{r.origin} → {r.destination}</TD>
                    <TD style={{ color: '#9ca3af' }}>{r.driver_name}</TD>
                    <TD>KSh {r.price_per_seat}</TD>
                    <TD>{r.seats_available}</TD>
                    <TD>{pill(capitalize(r.status), r.status === 'active' ? '#34d399' : '#9ca3af')}</TD>
                    <TD>
                      <button type="button" onClick={() => deleteRide(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: 'rgba(248,113,113,0.2)', color: '#f87171' }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </TD>
                  </tr>
                ))}
                {rides.length === 0 && <tr><td colSpan={7} style={{ padding: '24px 10px', textAlign: 'center', color: '#6b7280' }}>No rides found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOOKINGS */}
      {tab === 'bookings' && (
        <div className="glass" style={{ ...glassPanel, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr><TH>ID</TH><TH>Route</TH><TH>Passenger</TH><TH>Driver</TH><TH>Seats</TH><TH>Total</TH><TH>Status</TH><TH>Date</TH></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <TD style={{ color: '#9ca3af' }}>#{b.id}</TD>
                  <TD style={{ fontWeight: 600 }}>{b.origin} → {b.destination}</TD>
                  <TD style={{ color: '#9ca3af' }}>{b.passenger_name}</TD>
                  <TD style={{ color: '#9ca3af' }}>{b.driver_name}</TD>
                  <TD>{b.seats_requested}</TD>
                  <TD>KSh {b.total_price}</TD>
                  <TD>{pill(capitalize(b.status), statusColor(b.status))}</TD>
                  <TD style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(b.created_at)}</TD>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={8} style={{ padding: '24px 10px', textAlign: 'center', color: '#6b7280' }}>No bookings found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
