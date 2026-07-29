import { Bell, Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { onForegroundMessage } from '../lib/firebase.js';

const STORAGE_KEY = 'rideconnect_notifications';

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export default function NotificationsPanel() {
  const [open, setOpen]             = useState(false);
  const [notifications, setNotes]   = useState(loadStored);
  const panelRef                    = useRef(null);

  // Listen for foreground FCM messages and store them
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { title = 'RideConnect', body = '' } = payload.notification || {};
      const note = { id: Date.now(), title, body, read: false, time: new Date().toISOString() };
      setNotes((prev) => {
        const next = [note, ...prev].slice(0, 30);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    });
    return unsubscribe;
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotes((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const dismiss = (id) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const markRead = (id) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000)  return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-button"
        onClick={() => { setOpen((o) => !o); if (!open) markRead; }}
        aria-label="Notifications"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#ef4444', color: '#fff', borderRadius: '50%',
            fontSize: '10px', fontWeight: 700, width: '16px', height: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 10px)',
          width: '320px', maxHeight: '420px', overflowY: 'auto',
          background: 'var(--glass-bg, rgba(255,255,255,0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000,
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#0c6b5c', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                <Check size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
              <Bell size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.88rem' }}>No notifications yet</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0' }}>
              {notifications.map((n) => (
                <li key={n.id} onClick={() => markRead(n.id)} style={{
                  padding: '10px 16px',
                  background: n.read ? 'transparent' : 'rgba(12,107,92,0.05)',
                  borderBottom: '1px solid var(--border, #f1f5f9)',
                  cursor: 'pointer',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block' }}>{n.title}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: 2 }}>{n.body}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: 4 }}>{relativeTime(n.time)}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
