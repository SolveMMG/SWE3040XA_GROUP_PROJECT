import { Check, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { inquiries as initialInquiries } from '../data/mockData.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function InquiriesPage() {
  const { currentUser } = useAuth();
  const isDriver = currentUser.role === 'driver';
  const activeTab = isDriver ? 'received' : 'sent';
  const [items, setItems] = useState(initialInquiries);

  const setStatus = (id, status) => {
    setItems((current) => ({
      ...current,
      received: current.received.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
  };

  const visibleItems = items[activeTab];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isDriver ? 'Received ride requests' : 'My ride inquiries'}</span>
          <h1>{isDriver ? 'Review customer requests for your rides.' : 'Track the ride requests you sent.'}</h1>
        </div>
      </div>

      <div className="inquiry-list">
        {visibleItems.map((item) => (
          <article className="inquiry-card glass" key={item.id}>
            <div>
              <div className="card-topline">
                <span>{item.date}</span>
                <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
              </div>
              <h2>{item.rideTitle}</h2>
              <p>
                {activeTab === 'sent' ? 'To' : 'From'} {item.withUser}: {item.message}
              </p>
            </div>
            {activeTab === 'received' && item.status === 'Pending' ? (
              <div className="action-row">
                <button type="button" className="button success" onClick={() => setStatus(item.id, 'Accepted')}>
                  <Check size={18} />
                  Accept
                </button>
                <button type="button" className="button danger" onClick={() => setStatus(item.id, 'Declined')}>
                  <X size={18} />
                  Decline
                </button>
              </div>
            ) : (
              <div className="status-note">
                <Clock size={18} />
                {item.status === 'Pending' ? 'Waiting for a response' : `Marked ${item.status.toLowerCase()}`}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
