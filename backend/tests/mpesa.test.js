const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const mpesaService = require('../src/services/mpesa.service');
const paymentsController = require('../src/controllers/payments.controller');

describe('M-Pesa Service & Payments Flow', () => {
  it('exports STK push and refund transaction handlers', () => {
    assert.equal(typeof mpesaService.initiateStkPush, 'function');
    assert.equal(typeof mpesaService.refundTransaction, 'function');
  });

  it('handles simulated refund transactions cleanly', async () => {
    const result = await mpesaService.refundTransaction({
      checkoutRequestId: 'ws_CO_TEST_12345',
      amount: 1500,
      phone: '254712345678',
    });

    assert.equal(result.success, true);
    assert.equal(result.checkoutRequestId, 'ws_CO_TEST_12345');
    assert.equal(result.amount, 1500);
  });

  it('rejects STK push if bookingId or phone is missing', async () => {
    let statusCode;
    let payload;
    const req = { body: { bookingId: 1 } }; // missing phone
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };

    await paymentsController.initiateStkPush(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(statusCode, 400);
    assert.equal(payload.error.code, 'MISSING_FIELDS');
  });

  it('validates missing checkout ID on callback', async () => {
    let statusCode;
    let payload;
    const req = { body: {} };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };

    await paymentsController.mpesaCallback(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(payload.ResultCode, 0);
  });
});
