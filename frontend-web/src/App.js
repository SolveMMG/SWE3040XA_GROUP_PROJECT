import React from 'react';

function App() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to RideConnect</h1>
        <p style={styles.subtitle}>
          Smart carpooling for university students and daily commuters in the Nairobi Metropolitan Region.
        </p>
        <div style={styles.features}>
          <Feature icon="🗺️" text="Intelligent Route Matching" />
          <Feature icon="📍" text="Real-time GPS Tracking" />
          <Feature icon="💳" text="M-Pesa Payment Integration" />
          <Feature icon="⭐" text="Mutual Rating System" />
        </div>
        <div style={styles.actions}>
          <button style={styles.btnPrimary}>Find a Ride</button>
          <button style={styles.btnSecondary}>Offer a Ride</button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div style={styles.feature}>
      <span style={styles.icon}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '48px 40px',
    maxWidth: 480,
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: { fontSize: 28, fontWeight: 700, color: '#0f3460', marginBottom: 12 },
  subtitle: { color: '#555', lineHeight: 1.6, marginBottom: 32 },
  features: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' },
  feature: { display: 'flex', alignItems: 'center', gap: 12, color: '#333', fontSize: 15 },
  icon: { fontSize: 20 },
  actions: { display: 'flex', gap: 12, justifyContent: 'center' },
  btnPrimary: {
    padding: '12px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: '#0f3460', color: 'white', fontWeight: 600, fontSize: 15,
  },
  btnSecondary: {
    padding: '12px 28px', borderRadius: 8, cursor: 'pointer',
    background: 'transparent', border: '2px solid #0f3460', color: '#0f3460',
    fontWeight: 600, fontSize: 15,
  },
};

export default App;
