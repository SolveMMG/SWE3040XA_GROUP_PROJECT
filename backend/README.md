# RideConnect — Backend API

Smart carpooling & ride-sharing REST API built with Node.js, Express, and PostgreSQL.

- **Base URL:** `/api/v1`
- **Auth:** `Authorization: Bearer <jwt>` on every protected route
- **All responses:** JSON
- **Timestamps:** ISO 8601 strings
- **IDs:** integers

---

## Table of Contents

1. [Setup](#setup)
2. [Environment Variables](#environment-variables)
3. [Database Migrations](#database-migrations)
4. [Error Format](#error-format)
5. [Auth Endpoints](#1-auth)
6. [User Endpoints](#2-users)
7. [Ride Endpoints](#3-rides)
8. [Upload Endpoints](#4-uploads)
9. [Booking Endpoints](#5-bookings)
10. [Payment Endpoints](#6-payments)
11. [Review Endpoints](#7-reviews)
12. [Status Codes](#status-codes)

---

## Setup

```bash
cd backend
cp .env.example .env        # fill in your credentials
npm install
npm run migrate             # run all DB migrations
npm run dev                 # start with nodemon (hot reload)
# or
npm start                   # production
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default `5432`) |
| `DB_NAME` | Database name (`rideconnect`) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL (e.g. `http://localhost:3000/api/v1/auth/google/callback`) |
| `JWT_SECRET` | Secret used to sign access tokens |
| `JWT_EXPIRES_IN` | Access token TTL (default `1h`) |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL (default `30d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (Person C) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (Person C) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (Person C) |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key (Person C) |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret (Person C) |
| `MPESA_SHORTCODE` | M-Pesa shortcode (Person C) |
| `MPESA_PASSKEY` | M-Pesa passkey (Person C) |
| `MPESA_CALLBACK_URL` | Public URL for M-Pesa callbacks (Person C) |
| `MPESA_ENV` | `sandbox` or `production` (Person C) |
| `FIREBASE_PROJECT_ID` | Firebase project ID (Person C) |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (Person C) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email (Person C) |
| `FRONTEND_URL` | SPA URL for CORS and OAuth redirects (e.g. `http://localhost:5173`) |

---

## Database Migrations

```bash
npm run migrate
```

Migrations run in order (`001_` → `006_`) and are tracked in the `schema_migrations` table. Re-running is safe — applied migrations are skipped.

### Schema overview

| Table | Purpose |
|---|---|
| `users` | Registered users with role (`passenger` / `driver`) |
| `rides` | Ride listings posted by drivers |
| `bookings` | Booking requests from passengers |
| `payments` | M-Pesa payment records per booking |
| `reviews` | Driver ratings submitted after a paid booking |
| `auth_tokens` | Hashed refresh tokens (auto-pruned every 24 h) |

---

## Error Format

All error responses share this shape:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable description"
  }
}
```

For validation errors a `details` array is also included:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "origin is required",
    "details": [
      { "field": "origin", "message": "origin is required" },
      { "field": "departureTime", "message": "departureTime is required" }
    ]
  }
}
```

---

## 1. Auth

### `GET /api/v1/auth/google` — Public

Redirects the browser to Google's OAuth 2.0 consent screen.

**Response:** `302` redirect to Google.

---

### `GET /api/v1/auth/google/callback` — Public

Google redirects here after consent. The server exchanges the code for a profile, creates the user if new, issues tokens, and redirects to the frontend.

**Redirect to:** `FRONTEND_URL/auth/callback?token=...&refreshToken=...&id=...&name=...&email=...&photoUrl=...&isNewUser=true|false`

The frontend reads these query params once to bootstrap auth state, then discards the URL params.

---

### `POST /api/v1/auth/refresh` — Public

Exchange a valid refresh token for a new access token. Implements token rotation — the old refresh token is revoked and a new one is issued.

**Request body:**
```json
{ "refreshToken": "..." }
```

**Response `200`:**
```json
{
  "token": "new-jwt...",
  "refreshToken": "new-refresh-token..."
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `MISSING_REFRESH_TOKEN` | 400 | `refreshToken` not in body |
| `INVALID_REFRESH_TOKEN` | 401 | Token not found or expired |
| `USER_NOT_FOUND` | 401 | User account was deleted |

---

### `POST /api/v1/auth/logout` — Bearer

Revokes the provided refresh token. Idempotent — revoking an already-revoked token succeeds silently.

**Request body:**
```json
{ "refreshToken": "..." }
```

**Response `200`:**
```json
{ "message": "Logged out" }
```

---

## 2. Users

JWT payload: `{ "userId": 1, "email": "..." }` — expiry 1 hour.

### `GET /api/v1/users/me` — Bearer

Returns the authenticated user's own profile.

**Response `200`:**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@usiu.ac.ke",
  "bio": "4th-year CS student",
  "role": "passenger",
  "photoUrl": "https://res.cloudinary.com/...",
  "avgRating": 4.6,
  "rideCount": 12,
  "createdAt": "2026-07-01T10:00:00.000Z"
}
```

---

### `PUT /api/v1/users/me` — Bearer

Updates the caller's profile. All fields are optional.

**Request body:**
```json
{
  "name": "Jane D.",
  "bio": "4th-year CS student",
  "role": "driver",
  "photoUrl": "https://res.cloudinary.com/..."
}
```

**Validation:**
- `name` — non-empty string if provided
- `bio` — string if provided
- `role` — must be `passenger` or `driver`
- `photoUrl` — string if provided

**Response `200`:** Updated user object (same shape as `GET /users/me`).

---

### `GET /api/v1/users/:id` — Public

Returns a public profile of any user.

**Response `200`:**
```json
{
  "id": 2,
  "name": "John K.",
  "bio": "Part-time driver",
  "role": "driver",
  "photoUrl": "https://res.cloudinary.com/...",
  "avgRating": 4.2,
  "rideCount": 5
}
```

**Errors:** `USER_NOT_FOUND` 404, `INVALID_ID` 400.

---

### `DELETE /api/v1/users/me` — Bearer

Deletes the caller's account and revokes all their refresh tokens.

**Response `200`:**
```json
{ "message": "Account deleted" }
```

---

## 3. Rides

> Implemented by **Person C** (C1 / C2).

### `GET /api/v1/rides` — Public

Browse / search active ride listings.

**Query params (all optional):**

| Param | Type | Description |
|---|---|---|
| `origin` | string | Partial match on origin (case-insensitive) |
| `destination` | string | Partial match on destination |
| `date` | string | Filter by departure date (`YYYY-MM-DD`) |
| `page` | integer | Page number (default `1`) |
| `limit` | integer | Results per page (default `20`, max `50`) |

**Response `200`:**
```json
{
  "rides": [
    {
      "id": 10,
      "origin": "CBD",
      "destination": "USIU",
      "departureTime": "2026-07-10T07:30:00.000Z",
      "seatsAvailable": 2,
      "pricePerSeat": 150,
      "status": "active",
      "driver": { "id": 2, "name": "John K.", "avgRating": 4.2 },
      "createdAt": "2026-07-05T08:00:00.000Z"
    }
  ],
  "page": 1,
  "totalPages": 4,
  "total": 71
}
```

---

### `POST /api/v1/rides` — Bearer

Create a ride listing. The caller becomes the driver.

**Request body:**
```json
{
  "origin": "CBD",
  "destination": "USIU",
  "departureTime": "2026-07-10T07:30:00Z",
  "seatsAvailable": 3,
  "pricePerSeat": 150
}
```

**Validation:**
- `origin`, `destination` — required strings
- `departureTime` — required, valid ISO 8601
- `seatsAvailable` — required, positive integer
- `pricePerSeat` — required, non-negative integer

**Response `201`:** Full ride object (same shape as single item in `GET /rides`).

---

### `GET /api/v1/rides/:id` — Public

Full detail of one ride including driver info.

**Response `200`:**
```json
{
  "id": 10,
  "origin": "CBD",
  "destination": "USIU",
  "departureTime": "2026-07-10T07:30:00.000Z",
  "seatsAvailable": 2,
  "pricePerSeat": 150,
  "status": "active",
  "driver": {
    "id": 2,
    "name": "John K.",
    "photoUrl": "https://res.cloudinary.com/...",
    "avgRating": 4.2,
    "rideCount": 5
  },
  "createdAt": "2026-07-05T08:00:00.000Z"
}
```

---

### `PUT /api/v1/rides/:id` — Bearer (driver/owner only)

Update a ride. `403` if the caller is not the driver.

**Request body** (all fields optional):
```json
{ "pricePerSeat": 180, "seatsAvailable": 2, "status": "completed" }
```

**Response `200`:** Updated ride object.

---

### `DELETE /api/v1/rides/:id` — Bearer (driver/owner only)

Delete a ride. `403` if not the owner.

**Response `200`:**
```json
{ "message": "Ride deleted" }
```

---

## 4. Uploads

> Implemented by **Person C** (C3).

### `POST /api/v1/uploads/image` — Bearer

Upload a profile photo. Multipart form upload — field name `image`, max 5 MB, `jpg` / `png` / `webp`.

**Request:** `multipart/form-data` with field `image: <file>`

**Response `201`:**
```json
{ "url": "https://res.cloudinary.com/rideconnect/image/upload/v1/abc123.jpg" }
```

---

## 5. Bookings

> Implemented by **Person C** (C4 / C5).

### `POST /api/v1/bookings` — Bearer

Passenger sends a booking request. `400` if booking your own ride. Triggers push notification to the driver.

**Request body:**
```json
{ "rideId": 10, "seatsRequested": 1 }
```

**Validation:**
- `rideId` — required integer
- `seatsRequested` — required, positive integer

**Response `201`:**
```json
{
  "id": 55,
  "rideId": 10,
  "passenger": { "id": 1, "name": "Jane" },
  "driver": { "id": 2, "name": "John" },
  "seatsRequested": 1,
  "totalPrice": 150,
  "status": "pending",
  "createdAt": "2026-07-05T09:00:00.000Z"
}
```

---

### `GET /api/v1/bookings` — Bearer

List the caller's bookings.

**Query params:**

| Param | Values | Description |
|---|---|---|
| `role` | `sent` / `received` | `sent` = as passenger; `received` = as driver |
| `status` | `pending` / `accepted` / `declined` / `paid` | Optional filter |

**Response `200`:**
```json
{
  "bookings": [
    {
      "id": 55,
      "ride": { "id": 10, "origin": "CBD", "destination": "USIU" },
      "passenger": { "id": 1, "name": "Jane" },
      "driver": { "id": 2, "name": "John" },
      "seatsRequested": 1,
      "totalPrice": 150,
      "status": "pending",
      "createdAt": "2026-07-05T09:00:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/v1/bookings/:id/accept` — Bearer (driver only)

Driver accepts a pending booking. `403` if caller is not the ride's driver. `409` if booking is not `pending`. Triggers push notification to passenger.

**Response `200`:**
```json
{ "id": 55, "status": "accepted", "...": "..." }
```

---

### `PATCH /api/v1/bookings/:id/decline` — Bearer (driver only)

Driver declines a pending booking. Same rules as accept.

**Response `200`:**
```json
{ "id": 55, "status": "declined", "...": "..." }
```

**Booking status flow:** `pending` → `accepted` or `declined` → (if accepted) `paid`. No other transitions allowed.

---

## 6. Payments

> Implemented by **Person C** (C6).

### `POST /api/v1/payments/initiate` — Bearer

Initiate an M-Pesa STK push for an accepted booking. `400` if booking is not `accepted`. `409` if already paid.

**Request body:**
```json
{ "bookingId": 55, "phone": "0712345678" }
```

**Validation:**
- `bookingId` — required integer
- `phone` — required, valid Kenyan mobile number (e.g. `0712345678`, `254712345678`)

**Response `200`:**
```json
{
  "checkoutRequestId": "ws_CO_...",
  "message": "STK push sent"
}
```

---

### `POST /api/v1/payments/callback` — Public

M-Pesa Daraja callback. Receives payment confirmation, marks booking as `paid`, triggers a receipt push notification.

**Response `200`:**
```json
{ "ResultCode": 0, "ResultDesc": "Accepted" }
```

---

### `GET /api/v1/payments/:bookingId` — Bearer

Returns the payment record for a booking. `403` if the caller is not the passenger or driver of that booking.

**Response `200`:**
```json
{
  "id": 30,
  "bookingId": 55,
  "amount": 150,
  "mpesaRef": "RCX12345",
  "status": "paid",
  "paidAt": "2026-07-10T07:45:00.000Z"
}
```

---

## 7. Reviews

> Implemented by **Person C** (C8).

### `POST /api/v1/reviews` — Bearer (passenger only)

Passenger reviews a driver after a **paid** booking. `403` if the caller has no paid booking with that driver. `409` if the booking was already reviewed.

**Request body:**
```json
{
  "bookingId": 55,
  "rating": 5,
  "comment": "Great driver, very punctual!"
}
```

**Validation:**
- `bookingId` — required integer
- `rating` — required, integer 1–5
- `comment` — optional string

**Response `201`:**
```json
{
  "id": 7,
  "bookingId": 55,
  "reviewer": { "id": 1, "name": "Jane" },
  "driver": { "id": 2 },
  "rating": 5,
  "comment": "Great driver, very punctual!",
  "createdAt": "2026-07-10T10:00:00.000Z"
}
```

---

### `GET /api/v1/reviews?driverId=2` — Public

All reviews received by a driver, newest first, with aggregate stats.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `driverId` | integer | Required — the driver's user ID |

**Response `200`:**
```json
{
  "avgRating": 4.6,
  "reviewCount": 12,
  "reviews": [
    {
      "id": 7,
      "reviewer": { "id": 1, "name": "Jane", "photoUrl": "https://..." },
      "rating": 5,
      "comment": "Great driver, very punctual!",
      "createdAt": "2026-07-10T10:00:00.000Z"
    }
  ]
}
```

---

## Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `302` | Redirect (OAuth flow) |
| `400` | Validation error / bad request |
| `401` | Missing or invalid token |
| `403` | Forbidden (not the owner / driver / passenger) |
| `404` | Resource not found |
| `409` | Conflict (duplicate review, booking not pending, already paid) |
| `500` | Internal server error |

## Common Error Codes

| Code | HTTP | Description |
|---|---|---|
| `MISSING_TOKEN` | 401 | No `Authorization: Bearer` header |
| `INVALID_TOKEN` | 401 | Token malformed or signed with wrong secret |
| `TOKEN_EXPIRED` | 401 | Access token has expired — call `/auth/refresh` |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token not found or expired |
| `VALIDATION_ERROR` | 400 | One or more request fields failed validation |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `NOT_FOUND` | 404 | Route or resource does not exist |
| `CONFLICT` | 409 | Unique constraint violated (e.g. duplicate booking) |
| `INVALID_REFERENCE` | 400 | Foreign key does not exist (e.g. invalid `rideId`) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
