const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message || 'Request failed', response.status);
  return body;
}

export const userFromApi = (user = {}) => ({
  ...user,
  id:           user?.id ?? null,
  name:         user?.name || 'Kenyan Driver',
  photoUrl:     user?.photoUrl     ?? user?.photo_url     ?? '',
  rating:       user?.avgRating    ?? user?.avg_rating    ?? '4.9',
  vehicleModel: user?.vehicleModel ?? user?.vehicle_model ?? '',
  licensePlate: user?.licensePlate ?? user?.license_plate ?? '',
  mpesaPhone:   user?.mpesaPhone   ?? user?.mpesa_phone   ?? '',
});

export const rideFromApi = (ride = {}) => {
  if (!ride) return null;
  return {
    ...ride,
    id: String(ride.id || '1'),
    price: ride.price_per_seat ?? ride.price ?? 50,
    seats: ride.seats_available ?? ride.seats ?? 3,
    pickup: ride.origin || 'Roysambu (TRM Mall)',
    dropoff: ride.destination || 'Nairobi CBD (KICC)',
    dateTime: ride.departure_time ? new Date(ride.departure_time) : new Date(),
    pickupLocation: {
      address: ride.origin || 'Roysambu (TRM Mall)',
      placeId: ride.origin_place_id || '',
      lat: Number(ride.origin_latitude || -1.2180),
      lng: Number(ride.origin_longitude || 36.8870),
    },
    dropoffLocation: {
      address: ride.destination || 'Nairobi CBD (KICC)',
      placeId: ride.destination_place_id || '',
      lat: Number(ride.destination_latitude || -1.2885),
      lng: Number(ride.destination_longitude || 36.8232),
    },
    seller: userFromApi(ride.driver || ride.seller || {}),
  };
};
