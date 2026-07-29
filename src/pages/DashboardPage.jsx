import { ArrowUpRight, BarChart3, CarFront, Check, CheckCircle2, Clock, ClipboardList, Compass, DollarSign, Inbox, Leaf, MapPin, Plus, RefreshCw, ShieldCheck, TrendingUp, WalletCards, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { formatKSh } from '../utils/googleMaps.js';

function StatCard({ icon, label, value, subtext, highlight = false }) {
  return (
    <div className={`dashboard-card glass ${highlight ? 'highlight-card' : ''}`}>
      <div className="card-top-row">
        <span className="dashboard-icon">{icon}</span>
      </div>
      <span className="card-label">{label}</span>
      <strong className="card-value">{value}</strong>
      {subtext && <span className="card-subtext">{subtext}</span>}
    </div>
  );
}

function ExpenseTrendChart({ monthlyData = [], isDriver = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [metric, setMetric] = useState('amount');

  const maxVal = Math.max(...monthlyData.map((d) => (metric === 'amount' ? d.amount : d.trips)), 1);

  if (monthlyData.every((d) => d.amount === 0 && d.trips === 0)) {
    return (
      <div className="analytics-chart-card glass">
        <div className="chart-header">
          <div>
            <span className="eyebrow"><TrendingUp size={14} /> {isDriver ? 'Revenue Analytics' : 'Spending Analytics'}</span>
            <h2>{isDriver ? 'Monthly Driver Revenue' : 'Monthly Ride Expenses'}</h2>
          </div>
        </div>
        <div className="empty-transactions glass" style={{ margin: '16px 0' }}>
          <BarChart3 size={28} />
          <p>No data yet. {isDriver ? 'Complete rides to see your revenue.' : 'Book rides to see your spending history.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-chart-card glass">
      <div className="chart-header">
        <div>
          <span className="eyebrow"><TrendingUp size={14} /> {isDriver ? 'Revenue Analytics' : 'Spending & Activity Analytics'}</span>
          <h2>{metric === 'amount' ? (isDriver ? 'Monthly Driver Revenue' : 'Monthly Ride Expenses') : 'Monthly Completed Trips'}</h2>
        </div>
        <div className="chart-toggle-buttons">
          <button type="button" className={`chart-btn ${metric === 'amount' ? 'active' : ''}`} onClick={() => setMetric('amount')}>
            <DollarSign size={13} /> {isDriver ? 'Revenue (KSh)' : 'Expenses (KSh)'}
          </button>
          <button type="button" className={`chart-btn ${metric === 'trips' ? 'active' : ''}`} onClick={() => setMetric('trips')}>
            <CarFront size={13} /> Trips Count
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg className="svg-chart" viewBox="0 0 500 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c6b5c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1781a2" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#0c6b5c" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(12,107,92,0.1)" strokeDasharray="4 4" />
          <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(12,107,92,0.1)" strokeDasharray="4 4" />
          <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(12,107,92,0.1)" strokeDasharray="4 4" />
          {monthlyData.map((d, idx) => {
            const val = metric === 'amount' ? d.amount : d.trips;
            const barHeight = Math.max(4, (val / maxVal) * 130);
            const x = 30 + idx * 75;
            const y = 160 - barHeight;
            const isHovered = hoveredIndex === idx;
            return (
              <g key={d.month} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                <rect x={x} y={y} width="36" height={barHeight} rx="6"
                  fill={isHovered ? 'url(#barHoverGradient)' : 'url(#barGradient)'} className="chart-bar-rect" />
                <text x={x + 18} y="180" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">{d.month}</text>
                {val > 0 && (
                  <text x={x + 18} y={y - 6} textAnchor="middle" fill={isHovered ? '#047857' : '#0c6b5c'} fontSize="10" fontWeight="700">
                    {metric === 'amount' ? Math.round(val) : val}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredIndex !== null && monthlyData[hoveredIndex] && (
          <div className="chart-tooltip glass">
            <strong>{monthlyData[hoveredIndex].month} Summary</strong>
            <span>{isDriver ? 'Earned' : 'Spent'}: {formatKSh(monthlyData[hoveredIndex].amount)}</span>
            <span>Trips: {monthlyData[hoveredIndex].trips}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, token } = useAuth();
  const isDriver = currentUser.role === 'driver';

  const [counts, setCounts]               = useState({ rides: 0, bookings: 0, expenditure: 0, earnings: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [monthlyData, setMonthlyData]     = useState([]);
  const [topDestinations, setTopDestinations] = useState([]);
  const [lastUpdated, setLastUpdated]     = useState(new Date());
  const [isRefreshing, setIsRefreshing]   = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [ridesRes, bookingsRes] = await Promise.all([
        api('/rides'),
        api(`/bookings/me?role=${isDriver ? 'received' : 'sent'}`, { token }),
      ]);

      const allBookings = bookingsRes.bookings || [];
      const paidBookings = allBookings.filter((b) => b.status === 'paid');
      const pending = allBookings.filter((b) => b.status === 'pending');
      setPendingRequests(pending);

      const paidTotal = paidBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

      setCounts({
        rides:       ridesRes.total || 0,
        bookings:    allBookings.length,
        expenditure: isDriver ? 0 : paidTotal,
        earnings:    isDriver ? paidTotal : 0,
      });

      setRecentBookings(paidBookings.slice(0, 4));

      // Build last 6 calendar months dynamically
      const now = new Date();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { year: d.getFullYear(), month: d.getMonth(), label: monthNames[d.getMonth()] };
      });

      const monthly = last6.map(({ year, month, label }) => {
        const mb = paidBookings.filter((b) => {
          const d = b.created_at ? new Date(b.created_at) : null;
          return d && d.getFullYear() === year && d.getMonth() === month;
        });
        return {
          month: label,
          amount: mb.reduce((s, b) => s + (Number(b.total_price) || 0), 0),
          trips: mb.length,
        };
      });
      setMonthlyData(monthly);

      // Real top destinations from actual bookings
      const destCounts = {};
      allBookings.forEach((b) => {
        const dest = b.ride?.destination;
        if (dest) destCounts[dest] = (destCounts[dest] || 0) + 1;
      });
      const totalDest = Object.values(destCounts).reduce((s, n) => s + n, 0) || 1;
      const sorted = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalDest) * 100) }));
      setTopDestinations(sorted);

      setLastUpdated(new Date());
    } catch { /* keep current state on error */ }
  }, [isDriver, token]);

  const updateBookingStatus = async (id, status) => {
    try {
      await api(`/bookings/${id}/status`, { token, method: 'PUT', body: JSON.stringify({ status }) });
      fetchDashboardData();
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const avgCostPerTrip = counts.bookings > 0 ? Math.round((counts.expenditure || counts.earnings) / Math.max(1, recentBookings.length)) : 0;
  const estimatedKm   = recentBookings.length * 12.5;
  const co2SavedKg    = (estimatedKm * 0.12).toFixed(1);

  return (
    <section className="page dashboard-page analytics-dashboard">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">{isDriver ? 'Driver Analytics & Earnings' : 'Passenger Spendings & Trips'}</span>
          <h1>{isDriver ? 'Driver Revenue & Trip Analytics' : 'Ride Expenses & Trip Dashboard'}</h1>
        </div>
        <button type="button" className={`refresh-icon-btn ${isRefreshing ? 'spinning' : ''}`} onClick={handleManualRefresh} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-grid">
        <StatCard
          icon={<WalletCards size={24} />}
          label={isDriver ? 'Total Earnings' : 'Total Spent'}
          value={formatKSh(isDriver ? counts.earnings : counts.expenditure)}
          subtext={`From ${recentBookings.length} completed ride(s)`}
          highlight live
        />
        <StatCard
          icon={<ClipboardList size={24} />}
          label={isDriver ? 'Total Inquiries' : 'Total Bookings'}
          value={counts.bookings}
          subtext={`${pendingRequests.length} pending`}
        />
        <StatCard
          icon={<Compass size={24} />}
          label="Avg. Fare per Trip"
          value={avgCostPerTrip > 0 ? formatKSh(avgCostPerTrip) : '—'}
          subtext="Based on completed trips"
        />
        <StatCard
          icon={<Leaf size={24} />}
          label="CO₂ Footprint Saved"
          value={recentBookings.length > 0 ? `${co2SavedKg} kg` : '—'}
          subtext={recentBookings.length > 0 ? `Est. ${estimatedKm.toFixed(0)} km carpooled` : 'Complete rides to see impact'}
        />
      </div>

      {/* Driver earnings breakdown */}
      {isDriver && (
        <div className="pending-requests-card glass">
          <div className="section-header-row">
            <div className="title-box">
              <WalletCards size={20} className="header-icon" />
              <div>
                <h3>Earnings Breakdown</h3>
                <span>Revenue from completed passenger payments</span>
              </div>
            </div>
          </div>
          {recentBookings.length === 0 ? (
            <div className="empty-transactions glass">
              <DollarSign size={24} />
              <p>No earnings yet. Accept passenger requests to start earning.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {recentBookings.map((b, idx) => (
                <div key={b.id || idx} className="transaction-row">
                  <div className="tx-left">
                    <span className="tx-icon-circle"><CheckCircle2 size={16} /></span>
                    <div>
                      <strong className="tx-route">{b.ride?.origin || 'Pickup'} ➔ {b.ride?.destination || 'Destination'}</strong>
                      <span className="tx-meta">
                        Passenger: {b.passenger?.name || '—'} · {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                  <div className="tx-right">
                    <strong className="tx-amount">{formatKSh(Number(b.total_price) || 0)}</strong>
                    <span className="tx-badge paid">● Paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incoming Requests (driver only) */}
      {isDriver && (
        <div className="pending-requests-card glass">
          <div className="section-header-row">
            <div className="title-box">
              <Inbox size={20} className="header-icon" />
              <div>
                <h3>Incoming Passenger Requests</h3>
                <span>Accept or decline pending seat requests</span>
              </div>
            </div>
            <span className="pending-badge-count">{pendingRequests.length} Pending</span>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="empty-transactions glass">
              <CheckCircle2 size={24} />
              <p>No pending requests. Publish a ride offer to receive passenger requests.</p>
            </div>
          ) : (
            <div className="pending-requests-list">
              {pendingRequests.map((b) => (
                <div key={b.id} className="pending-request-row glass">
                  <div className="req-left">
                    <span className="req-avatar">{b.passenger?.name?.[0] || 'P'}</span>
                    <div>
                      <strong className="req-passenger-name">{b.passenger?.name || 'Passenger'}</strong>
                      <span className="req-route">{b.ride?.origin || 'Pickup'} ➔ {b.ride?.destination || 'Destination'}</span>
                    </div>
                  </div>
                  <div className="req-middle">
                    <span className="req-seats">{b.seats_requested} Seat(s)</span>
                    <strong className="req-price">{formatKSh(b.total_price)}</strong>
                  </div>
                  <div className="req-actions">
                    <button type="button" className="button success compact" onClick={() => updateBookingStatus(b.id, 'accepted')}>
                      <Check size={15} /> Accept
                    </button>
                    <button type="button" className="button danger compact" onClick={() => updateBookingStatus(b.id, 'declined')}>
                      <X size={15} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart + Destinations */}
      <div className="dashboard-analytics-split">
        <ExpenseTrendChart monthlyData={monthlyData} isDriver={isDriver} />

        <div className="analytics-destinations-card glass">
          <div className="card-title-row">
            <MapPin size={20} className="header-icon" />
            <div>
              <h3>Frequent Destinations</h3>
              <span>Based on your real booking history</span>
            </div>
          </div>
          {topDestinations.length === 0 ? (
            <div className="empty-transactions glass" style={{ margin: '16px 0' }}>
              <MapPin size={24} />
              <p>{isDriver ? 'No trips completed yet.' : 'Book rides to see your top destinations.'}</p>
            </div>
          ) : (
            <div className="destinations-progress-list">
              {topDestinations.map((d) => (
                <div key={d.name} className="dest-progress-item">
                  <div className="dest-info-row">
                    <strong className="dest-name">{d.name}</strong>
                    <span className="dest-trips-count">{d.count} trip{d.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${d.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="recent-transactions-section glass">
        <div className="section-header-row">
          <div className="title-box">
            <Clock size={20} className="header-icon" />
            <div>
              <h3>{isDriver ? 'Recent Payouts' : 'Recent Transactions'}</h3>
              <span>Completed M-Pesa payments</span>
            </div>
          </div>
          <Link to="/inquiries" className="button ghost compact">View All <ArrowUpRight size={14} /></Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="empty-transactions glass">
            <CheckCircle2 size={24} />
            <p>{isDriver ? 'No completed rides yet.' : 'No paid trips yet. Book your first ride.'}</p>
            {!isDriver && <Link to="/" className="button compact" style={{ marginTop: '12px' }}>Browse Rides</Link>}
          </div>
        ) : (
          <div className="transactions-list">
            {recentBookings.map((b, idx) => (
              <div key={b.id || idx} className="transaction-row">
                <div className="tx-left">
                  <span className="tx-icon-circle"><CheckCircle2 size={16} /></span>
                  <div>
                    <strong className="tx-route">{b.ride?.origin || 'Pickup'} ➔ {b.ride?.destination || 'Destination'}</strong>
                    <span className="tx-meta">
                      {isDriver ? `Passenger: ${b.passenger?.name || '—'}` : `Driver: ${b.driver?.name || '—'}`}
                      {' · '}{b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <strong className="tx-amount">{formatKSh(Number(b.total_price) || 0)}</strong>
                  <span className="tx-badge paid">● Paid</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="dashboard-actions glass">
        <div><ShieldCheck size={24} /><h2>Quick Actions</h2></div>
        <div className="action-row">
          {isDriver && <Link to="/rides/new" className="button"><Plus size={18} /> Offer Ride</Link>}
          {!isDriver && <Link to="/" className="button"><CarFront size={18} /> Browse Rides</Link>}
          <Link to="/inquiries" className="button ghost">Ride Requests</Link>
          <Link to="/profile" className="button ghost">Profile</Link>
        </div>
      </div>
    </section>
  );
}
