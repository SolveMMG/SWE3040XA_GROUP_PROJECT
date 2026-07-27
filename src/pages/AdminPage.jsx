import { Check, DollarSign, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function AdminPage() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState([]); const [stats, setStats] = useState(null); const [error, setError] = useState('');
  const load = async () => { try { const [pending, statistics] = await Promise.all([api('/admin/drivers/pending', { token }), api('/admin/statistics', { token })]); setDrivers(pending.drivers); setStats(statistics); setError(''); } catch (err) { setError(err.message); } };
  useEffect(() => { load(); }, [token]);
  const approve = async(id) => { try { await api(`/admin/drivers/${id}/approve`, { token, method: 'PUT' }); load(); } catch (err) { setError(err.message); } };
  return <section className="page dashboard-page"><div className="section-heading"><div><span className="eyebrow">Superadmin</span><h1>Driver approvals and revenue.</h1></div></div>{error && <div className="state-bar danger">{error}</div>}{stats && <><div className="dashboard-grid"><div className="dashboard-card glass"><DollarSign size={22}/><span>Paid ride revenue</span><strong>{money(stats.grossRevenue)}</strong></div><div className="dashboard-card glass"><DollarSign size={22}/><span>Company revenue ({stats.companyFeePercent}%)</span><strong>{money(stats.companyRevenue)}</strong></div><div className="dashboard-card glass"><UsersRound size={22}/><span>Driver payouts</span><strong>{money(stats.driverPayout)}</strong></div></div><div className="site-list glass"><h2>Driver earnings per paid ride</h2>{stats.drivers.length === 0 ? <p>No paid rides yet.</p> : stats.drivers.map((driver) => <article className="site-card" key={driver.driver_id}><div><h2>{driver.driver_name}</h2><p>{driver.paid_rides} paid ride(s) · Gross {money(driver.grossRevenue)}</p></div><div><strong>Driver: {money(driver.driverPayout)}</strong><p>Company: {money(driver.companyRevenue)}</p></div></article>)}</div></>}<div className="site-list glass"><h2>Pending driver approvals</h2>{drivers.length === 0 ? <p>No drivers awaiting approval.</p> : drivers.map((driver) => <article className="site-card" key={driver.id}><div><h2>{driver.name}</h2><p>{driver.email}</p></div><button type="button" className="button success" onClick={() => approve(driver.id)}><Check size={18}/>Approve</button></article>)}</div></section>;
}
