const nodemailer = require('nodemailer');

const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@rideconnect.app';

async function send({ to, subject, html }) {
  if (!transporter) return;
  try {
    await transporter.sendMail({ from: `RideConnect <${FROM}>`, to, subject, html });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[email] send failed:', err.message);
  }
}

const welcome = (to, name) => send({
  to,
  subject: 'Welcome to RideConnect!',
  html: `<h2>Hi ${name}, welcome to RideConnect!</h2>
         <p>Your account is ready. Browse available rides or offer your own on the <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}">RideConnect platform</a>.</p>
         <p>Safe travels,<br/>The RideConnect Team</p>`,
});

const bookingConfirmation = (to, { passengerName, driverName, origin, destination, seats, total }) => send({
  to,
  subject: 'Booking Request Sent — RideConnect',
  html: `<h2>Booking request sent, ${passengerName}!</h2>
         <p>You've requested <strong>${seats} seat(s)</strong> on a ride from <strong>${origin}</strong> to <strong>${destination}</strong> with driver <strong>${driverName}</strong>.</p>
         <p>Total: <strong>KSh ${total}</strong></p>
         <p>You'll be notified once the driver accepts. Then you can proceed to M-Pesa payment.</p>
         <p>View status in <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/inquiries">My Inquiries</a>.</p>`,
});

const paymentReceipt = (to, { passengerName, mpesaRef, origin, destination, amount }) => send({
  to,
  subject: 'Payment Confirmed — RideConnect Receipt',
  html: `<h2>Payment confirmed, ${passengerName}!</h2>
         <p>Your M-Pesa payment of <strong>KSh ${amount}</strong> for the ride from <strong>${origin}</strong> to <strong>${destination}</strong> has been received.</p>
         ${mpesaRef ? `<p>M-Pesa Reference: <strong>${mpesaRef}</strong></p>` : ''}
         <p>Have a safe trip!</p>
         <p>The RideConnect Team</p>`,
});

module.exports = { welcome, bookingConfirmation, paymentReceipt };
