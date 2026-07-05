/**
 * Lightweight validation middleware factory.
 *
 * Usage:
 *   const { body, run } = require('../middleware/validate');
 *
 *   router.post('/route',
 *     body('field').required().string(),
 *     run,
 *     controller
 *   );
 *
 * Each chain method returns `this` so calls can be chained.
 * `run` collects all errors and short-circuits with 400 if any exist.
 */

const VALID_ROLES = ['passenger', 'driver'];

// ─── Field validator ────────────────────────────────────────────────────────

class FieldValidator {
  constructor(req, field, location = 'body') {
    this.req      = req;
    this.field    = field;
    this.location = location;
    this.value    = req[location]?.[field];
    this.errors   = [];
    this._optional = false;
  }

  optional() { this._optional = true; return this; }

  _absent() { return this.value === undefined || this.value === null; }

  required(msg) {
    if (this._absent()) {
      this.errors.push({ field: this.field, message: msg || `${this.field} is required` });
    }
    return this;
  }

  string(msg) {
    if (!this._absent() && typeof this.value !== 'string') {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be a string` });
    }
    return this;
  }

  notEmpty(msg) {
    if (!this._absent() && typeof this.value === 'string' && !this.value.trim()) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must not be empty` });
    }
    return this;
  }

  integer(msg) {
    if (!this._absent() && !Number.isInteger(Number(this.value))) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be an integer` });
    }
    return this;
  }

  min(n, msg) {
    if (!this._absent() && Number(this.value) < n) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be at least ${n}` });
    }
    return this;
  }

  max(n, msg) {
    if (!this._absent() && Number(this.value) > n) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be at most ${n}` });
    }
    return this;
  }

  isIn(list, msg) {
    if (!this._absent() && !list.includes(this.value)) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be one of: ${list.join(', ')}` });
    }
    return this;
  }

  isoDate(msg) {
    if (!this._absent() && isNaN(Date.parse(this.value))) {
      this.errors.push({ field: this.field, message: msg || `${this.field} must be a valid ISO 8601 date` });
    }
    return this;
  }

  url(msg) {
    if (!this._absent()) {
      try { new URL(this.value); } catch {
        this.errors.push({ field: this.field, message: msg || `${this.field} must be a valid URL` });
      }
    }
    return this;
  }
}

// ─── Middleware factory ──────────────────────────────────────────────────────

/**
 * body(field) — returns a FieldValidator for req.body[field].
 * Attach it as middleware; errors are collected on req._validationErrors.
 */
const body = (field) => (req, _res, next) => {
  if (!req._validationErrors) req._validationErrors = [];
  const v = new FieldValidator(req, field, 'body');
  // Store the validator so the chain methods can add errors lazily.
  // We return a Proxy so chained calls become no-ops after the field is
  // collected — the real work happens in `run`.
  req._validators = req._validators || [];
  req._validators.push(v);
  next();
  return v;
};

/**
 * query(field) — same as body() but reads from req.query.
 */
const query = (field) => (req, _res, next) => {
  if (!req._validationErrors) req._validationErrors = [];
  const v = new FieldValidator(req, field, 'query');
  req._validators = req._validators || [];
  req._validators.push(v);
  next();
  return v;
};

/**
 * run — collects all validator errors and returns 400 if any exist.
 * Place this as the last middleware before the controller.
 */
const run = (req, res, next) => {
  const errors = (req._validators || []).flatMap((v) => v.errors);
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: errors[0].message,   // first error message for simplicity
        details: errors,
      },
    });
  }
  return next();
};

// ─── Pre-built rule sets for each endpoint ───────────────────────────────────

/**
 * Convenience: a single middleware that validates a plain rules object
 * without needing body()/run() chains.
 *
 * rules is a function that receives the request body and returns an array
 * of { field, message } error objects.
 *
 * Example:
 *   validate((b) => [
 *     !b.origin && { field: 'origin', message: 'origin is required' },
 *   ])
 */
const validate = (rulesFn) => (req, res, next) => {
  const errors = rulesFn(req.body || {})
    .filter(Boolean)
    .map((e) => (typeof e === 'string' ? { field: '?', message: e } : e));

  if (errors.length > 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: errors[0].message, details: errors },
    });
  }
  return next();
};

// ─── Common reusable validators ──────────────────────────────────────────────

const rules = {
  /** POST /auth/refresh  &  POST /auth/logout */
  refreshToken: validate((b) => [
    !b.refreshToken && { field: 'refreshToken', message: 'refreshToken is required' },
    b.refreshToken && typeof b.refreshToken !== 'string' && { field: 'refreshToken', message: 'refreshToken must be a string' },
  ]),

  /** PUT /users/me */
  updateProfile: validate((b) => [
    b.name     !== undefined && (typeof b.name !== 'string' || !b.name.trim()) &&
      { field: 'name', message: 'name must be a non-empty string' },
    b.bio      !== undefined && typeof b.bio !== 'string' &&
      { field: 'bio', message: 'bio must be a string' },
    b.role     !== undefined && !VALID_ROLES.includes(b.role) &&
      { field: 'role', message: `role must be one of: ${VALID_ROLES.join(', ')}` },
    b.photoUrl !== undefined && typeof b.photoUrl !== 'string' &&
      { field: 'photoUrl', message: 'photoUrl must be a string' },
  ]),

  /** POST /rides */
  createRide: validate((b) => [
    !b.origin                                          && { field: 'origin',         message: 'origin is required' },
    !b.destination                                     && { field: 'destination',    message: 'destination is required' },
    !b.departureTime                                   && { field: 'departureTime',  message: 'departureTime is required' },
    b.departureTime && isNaN(Date.parse(b.departureTime)) && { field: 'departureTime', message: 'departureTime must be a valid ISO 8601 date' },
    (b.seatsAvailable === undefined || b.seatsAvailable === null) && { field: 'seatsAvailable', message: 'seatsAvailable is required' },
    b.seatsAvailable !== undefined && (!Number.isInteger(Number(b.seatsAvailable)) || Number(b.seatsAvailable) < 1) &&
      { field: 'seatsAvailable', message: 'seatsAvailable must be a positive integer' },
    (b.pricePerSeat === undefined || b.pricePerSeat === null) && { field: 'pricePerSeat', message: 'pricePerSeat is required' },
    b.pricePerSeat !== undefined && (!Number.isInteger(Number(b.pricePerSeat)) || Number(b.pricePerSeat) < 0) &&
      { field: 'pricePerSeat', message: 'pricePerSeat must be a non-negative integer' },
  ]),

  /** POST /bookings */
  createBooking: validate((b) => [
    !b.rideId                                                        && { field: 'rideId',          message: 'rideId is required' },
    b.rideId && !Number.isInteger(Number(b.rideId))                  && { field: 'rideId',          message: 'rideId must be an integer' },
    (b.seatsRequested === undefined || b.seatsRequested === null)    && { field: 'seatsRequested',  message: 'seatsRequested is required' },
    b.seatsRequested !== undefined && (!Number.isInteger(Number(b.seatsRequested)) || Number(b.seatsRequested) < 1) &&
      { field: 'seatsRequested', message: 'seatsRequested must be a positive integer' },
  ]),

  /** POST /payments/initiate */
  initiatePayment: validate((b) => [
    !b.bookingId                                        && { field: 'bookingId', message: 'bookingId is required' },
    b.bookingId && !Number.isInteger(Number(b.bookingId)) && { field: 'bookingId', message: 'bookingId must be an integer' },
    !b.phone                                            && { field: 'phone',     message: 'phone is required' },
    b.phone && typeof b.phone !== 'string'              && { field: 'phone',     message: 'phone must be a string' },
    b.phone && !/^(?:254|\+254|0)[17]\d{8}$/.test(b.phone.replace(/\s/g, '')) &&
      { field: 'phone', message: 'phone must be a valid Kenyan mobile number (e.g. 0712345678)' },
  ]),

  /** POST /reviews */
  createReview: validate((b) => [
    !b.bookingId                                          && { field: 'bookingId', message: 'bookingId is required' },
    b.bookingId && !Number.isInteger(Number(b.bookingId)) && { field: 'bookingId', message: 'bookingId must be an integer' },
    (b.rating === undefined || b.rating === null)         && { field: 'rating',    message: 'rating is required' },
    b.rating !== undefined && (!Number.isInteger(Number(b.rating)) || Number(b.rating) < 1 || Number(b.rating) > 5) &&
      { field: 'rating', message: 'rating must be an integer between 1 and 5' },
    b.comment !== undefined && typeof b.comment !== 'string' &&
      { field: 'comment', message: 'comment must be a string' },
  ]),
};

module.exports = { body, query, run, validate, rules };
