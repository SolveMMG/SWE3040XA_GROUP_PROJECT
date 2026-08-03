const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api(path, { token, body, ...options } = {}) {
  const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    body: isJsonBody ? JSON.stringify(body) : body,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Handle 204 No Content responses safely
  if (response.status === 204) return null;

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      responseData.error?.message || responseData.message || 'Request failed',
      response.status
    );
  }

  return responseData;
}

export const userFromApi = (user) => {
  if (!user) return null;

  return {
    ...user,
    id:           user.id           ?? null,
    name:         user.name         || 'Kenyan Driver',
    photoUrl:     user.photoUrl     ?? user.photo_url     ?? '',
    rating:       user.avgRating    ?? user.avg_rating    ?? '4.9',
    vehicleModel: user.vehicleModel ?? user.vehicle_model ?? '',
    licensePlate: user.licensePlate ?? user.license_plate ?? '',
    mpesaPhone:   user.mpesaPhone   ?? user.mpesa_phone   ?? '',
  };
};

export const rideFromApi = (ride = {}) => {
  if (!ride) return null;

  const parseCoord = (val, fallback) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  };

  const parseDate = (val) => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const origin = ride.origin || 'Roysambu (TRM Mall)';
  const destination = ride.destination || 'Nairobi CBD (KICC)';

  return {
    ...ride,
    id: String(ride.id ?? '1'),
    price: ride.price_per_seat ?? ride.price ?? 50,
    seats: ride.seats_available ?? ride.seats ?? 3,
    pickup: origin,
    dropoff: destination,
    dateTime: parseDate(ride.departure_time),
    pickupLocation: {
      address: origin,
      placeId: ride.origin_place_id || '',
      lat: parseCoord(ride.origin_latitude, -1.2180),
      lng: parseCoord(ride.origin_longitude, 36.8870),
    },
    dropoffLocation: {
      address: destination,
      placeId: ride.destination_place_id || '',
      lat: parseCoord(ride.destination_latitude, -1.2885),
      lng: parseCoord(ride.destination_longitude, 36.8232),
    },
    seller: userFromApi(ride.driver || ride.seller || {}),
  };
};

