# RideLoop Frontend

Person B React SPA for a smart carpooling and ride-sharing application.

## API-backed application

- React app scaffold with routing and CSS setup
- Shared navbar, footer, and protected route wrapper
- API sign-in/sign-up with persisted JWT sessions and passenger/driver roles
- Editable user profile with profile photo URL field
- Marketplace rides, ride details, bookings, sites, profiles, and dashboard totals loaded from the API
- Responsive glassy UI with loading, empty, saved, and status states

## Run Locally

```bash
npm install
npm run dev
```

## Backend

The frontend uses `http://localhost:3000/api/v1` by default. Start PostgreSQL, then configure and migrate the backend:

```bash
cd backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=rideconnect DB_USER=postgres DB_PASSWORD=... JWT_SECRET=replace-with-a-long-random-value npm run migrate
DB_HOST=localhost DB_PORT=5432 DB_NAME=rideconnect DB_USER=postgres DB_PASSWORD=... JWT_SECRET=replace-with-a-long-random-value FRONTEND_URL=http://localhost:5173 npm start
```

Set `VITE_API_URL` in the frontend environment to use a deployed API instead. The database begins empty by design; accounts, rides, bookings, reviews, and saved sites are created through the API.

## M-Pesa

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` and fill in the M-Pesa values. The consumer key and secret must stay in that backend-only file. STK Push also needs the business shortcode, passkey, and a publicly reachable HTTPS callback URL; the app accepts callbacks at `/api/mpesa/callback` and sends the payment prompt after a passenger enters their M-Pesa phone number for an accepted booking.

## Google Maps

Create a frontend environment file with a browser-restricted Google Maps key:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Enable the Maps JavaScript API and Places API for that key. The app uses Places autocomplete for customer searches, ride pickup/drop-off selection, saved sites, and route maps.
