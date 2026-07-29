const formatPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^2547\d{8}$/.test(digits)) return digits;
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) return `254${digits}`;
  return null;
};

const config = () => ({
  baseUrl: (process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke').replace(/\/$/, ''),
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
});

const assertConfigured = (settings) => {
  const missing = Object.entries(settings).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    const error = new Error(`M-Pesa is not configured: ${missing.join(', ')}`);
    error.status = 503;
    error.code = 'MPESA_NOT_CONFIGURED';
    throw error;
  }
};

const getAccessToken = async(settings) => {
  const credentials = Buffer.from(`${settings.consumerKey}:${settings.consumerSecret}`).toString('base64');
  const response = await fetch(`${settings.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.errorMessage || 'Could not authenticate with M-Pesa');
    error.status = 502;
    error.code = 'MPESA_AUTH_FAILED';
    throw error;
  }
  return data.access_token;
};

const initiateStkPush = async({ amount, phone, reference, description }) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    const error = new Error('Enter a valid Kenyan M-Pesa number');
    error.status = 400;
    error.code = 'INVALID_PHONE';
    throw error;
  }

  // In sandbox mode, bypass Safaricom entirely — avoids minimum-amount (10 KES) restrictions
  // and localhost callback issues. The controller auto-confirms after 5 seconds.
  if (process.env.MPESA_ENV !== 'production') {
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    return { checkoutRequestId, phone: formattedPhone, merchantRequestId: `${Date.now()}-sandbox` };
  }

  const settings = config();
  assertConfigured(settings);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer.from(`${settings.shortcode}${settings.passkey}${timestamp}`).toString('base64');
  const accessToken = await getAccessToken(settings);
  const response = await fetch(`${settings.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: settings.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(amount)),
      PartyA: formattedPhone,
      PartyB: settings.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: settings.callbackUrl,
      AccountReference: reference,
      TransactionDesc: description,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ResponseCode !== '0' || !data.CheckoutRequestID) {
    const error = new Error(data.errorMessage || data.ResponseDescription || 'M-Pesa could not start the payment prompt');
    error.status = 502;
    error.code = 'MPESA_STK_FAILED';
    throw error;
  }
  return { checkoutRequestId: data.CheckoutRequestID, phone: formattedPhone, merchantRequestId: data.MerchantRequestID };
};

/**
 * Simulates a refund / reversal for demo/testing purposes.
 * In production, this would call the M-Pesa reversal API (B2C or Reversal request).
 * For sandbox testing, we return success so the payment can be marked refunded.
 */
const refundTransaction = async({ checkoutRequestId, amount, phone }) => {
  // In a real scenario, we would call the M-Pesa reversal API here.
  // For demo/sandbox, we simulate a successful reversal.
  // eslint-disable-next-line no-console
  console.log(`[MPESA-REFUND] Simulating refund for CheckoutRequestID: ${checkoutRequestId}, Amount: ${amount}, Phone: ${phone}`);

  // If configured for sandbox/production, you could call the reversal endpoint:
  // const accessToken = await getAccessToken(settings);
  // const response = await fetch(`${settings.baseUrl}/mpesa/reversal/v1/request`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ ... }),
  // });

  // For sandbox, just return success so the auto-refund scheduler can proceed.
  return {
    success: true,
    message: 'Refund simulated successfully (sandbox)',
    checkoutRequestId,
    amount,
  };
};

module.exports = { initiateStkPush, refundTransaction };
