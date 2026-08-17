import { ChevronDown, HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
  {
    section: 'Getting Started',
    items: [
      { q: 'How do I create an account?', a: 'Click "Sign in" in the top navigation bar, then choose "Create account". Enter your name, email, and a password (minimum 8 characters). Select your role — Passenger or Driver — and submit.' },
      { q: 'What is the difference between a Passenger and a Driver?', a: 'Passengers browse available rides and book seats. Drivers post ride listings, manage booking requests from passengers, and receive M-Pesa payment when a ride is completed.' },
      { q: 'Can I switch roles after registering?', a: 'Not currently. If you registered as a Passenger and want to offer rides, create a new account with a different email and select the Driver role.' },
    ],
  },
  {
    section: 'Finding & Booking a Ride',
    items: [
      { q: 'How do I search for a ride?', a: 'On the Marketplace page, use the search bar to enter your destination. You can filter by origin, date, number of seats, and maximum price. Results show rides near your search location.' },
      { q: 'How do I book a seat?', a: 'Open a ride listing and click "Request & Pay via M-Pesa". You\'ll create a booking request first — the driver must accept before you can proceed to payment.' },
      { q: 'What happens after I send a booking request?', a: 'The driver receives a notification and can accept or decline. If accepted, you\'ll be prompted to pay via M-Pesa. If declined, you can book with a different driver.' },
      { q: 'Can I cancel a booking?', a: 'Yes — go to "My Inquiries" and cancel any booking that is still in Pending or Accepted status. Paid bookings cannot be cancelled.' },
    ],
  },
  {
    section: 'Payments',
    items: [
      { q: 'How does payment work?', a: 'Once the driver accepts your booking, click "Pay" in My Inquiries or the listing page. Enter your M-Pesa phone number and you\'ll receive an STK push prompt on your phone. Confirm the payment on your phone to complete it.' },
      { q: 'What if I don\'t receive the M-Pesa prompt?', a: 'Wait up to 30 seconds. If nothing arrives, check that your phone number is correct and try again. Make sure you have sufficient M-Pesa balance before initiating.' },
      { q: 'Is my payment secure?', a: 'Yes. Payments go directly through the official Safaricom Daraja API. RideConnect never stores your M-Pesa PIN or wallet balance.' },
      { q: 'What is the price shown?', a: 'The price shown is the price per seat set by the driver. You pay that amount for one seat.' },
    ],
  },
  {
    section: 'Offering a Ride (Drivers)',
    items: [
      { q: 'How do I post a ride?', a: 'Log in as a Driver and click "Offer Ride" in the navigation. Fill in the origin, destination, departure time, number of seats available, and price per seat.' },
      { q: 'How do I accept or decline a booking request?', a: 'Go to Dashboard or "Ride Requests" in the navigation. You\'ll see incoming requests. Click "Accept" or "Decline" for each one.' },
      { q: 'When do I receive payment?', a: 'Payment is confirmed once the passenger completes M-Pesa payment. You\'ll receive a push notification and can view earnings in your Dashboard.' },
      { q: 'Can I edit or delete my ride listing?', a: 'Yes — open the ride from Marketplace and click "Edit ride listing". You can update details or remove the listing entirely from the edit page.' },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { q: 'How do I receive notifications?', a: 'RideConnect uses Firebase Cloud Messaging for real-time push notifications. When prompted by your browser, allow notifications. The bell icon in the top bar shows unread alerts.' },
      { q: 'What events trigger a notification?', a: 'Drivers are notified when a passenger books their ride. Passengers are notified when a driver accepts or declines. Both parties are notified when payment is confirmed.' },
      { q: 'How do I mark notifications as read?', a: 'Click the bell icon and select "Mark all read", or click an individual notification to mark it read. Use the X button to dismiss one.' },
    ],
  },
  {
    section: 'Reviews',
    items: [
      { q: 'How do I leave a review?', a: 'Go to "My Inquiries" after your booking status shows "Paid & Complete". A "Leave Review" option will appear for that booking. Rate the driver 1–5 stars and leave an optional comment.' },
      { q: 'Can passengers be reviewed?', a: 'Currently, only drivers can be reviewed. Passenger ratings are not implemented in this version.' },
    ],
  },
  {
    section: 'Account & Profile',
    items: [
      { q: 'How do I update my profile?', a: 'Click "Profile" in the navigation. You can update your name, bio, M-Pesa phone number, vehicle details (if you\'re a driver), and upload a profile photo.' },
      { q: 'I forgot my password. How do I reset it?', a: 'Password reset via email is not available in this version. Contact the RideConnect admin at admin@gmail.com for assistance.' },
      { q: 'How do I delete my account?', a: 'Account deletion is not self-service in this version. Contact the admin to request removal.' },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, cursor: 'pointer', color: 'inherit' }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>{q}</span>
        <ChevronDown size={18} style={{ flexShrink: 0, marginTop: 2, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', color: '#6b7280' }} />
      </button>
      {open && (
        <p style={{ margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.7, color: 'var(--muted, #9ca3af)' }}>{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <section className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Help & FAQ</h1>
        </div>
      </div>

      <p style={{ marginBottom: 32, color: 'var(--muted, #9ca3af)', fontSize: 15 }}>
        Answers to common questions about using RideConnect.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {FAQS.map((section) => (
          <div key={section.section} className="glass" style={{ padding: '20px 24px', borderRadius: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={18} style={{ color: '#22d3ee' }} />
              {section.section}
            </h2>
            <div>
              {section.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, marginTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={16} style={{ color: '#22d3ee' }} /> Still need help?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted, #9ca3af)', margin: 0 }}>
            Reach the admin at <strong>admin@gmail.com</strong> for account issues, billing questions, or to report a safety concern.
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={16} style={{ color: '#22d3ee' }} /> Report a problem
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted, #9ca3af)', margin: 0 }}>
            To report a safety issue or abusive behaviour, email the admin with the ride ID, the date, and a description of what happened.
          </p>
        </div>
      </div>
    </section>
  );
}
