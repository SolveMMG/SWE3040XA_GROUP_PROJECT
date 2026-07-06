const axios = require('axios');

const DARAJA_BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

/** Get an OAuth token from Daraja. */
const getAccessToken = async() => {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const creds  = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } },
  );
  return data.access_token;
};

/**
 * Initiate an STK push (Lipa Na M-Pesa Online).
 * @param {string} phone        - customer phone e.g. "254712345678"
 * @param {number} amount       - integer amount in KES
 * @param {number} bookingId    - used as the AccountReference
 * @returns {object} Daraja response including CheckoutRequestID
 */
const initiateSTKPush = async(phone, amount, bookingId) => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey   = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  // Normalise phone to 2547XXXXXXXX
  const normPhone = phone.replace(/^0/, '254').replace(/^\+/, '');

  const token = await getAccessToken();

  const { data } = await axios.post(
    `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            amount,
      PartyA:            normPhone,
      PartyB:            shortcode,
      PhoneNumber:       normPhone,
      CallBackURL:       process.env.MPESA_CALLBACK_URL,
      AccountReference:  `RideConnect-${bookingId}`,
      TransactionDesc:   `Payment for booking #${bookingId}`,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
};

module.exports = { initiateSTKPush };
