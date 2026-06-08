const express = require('express');
const router = express.Router();

// Placeholder ride data — replace with DB queries
const sampleRides = [
  {
    id: 1,
    driver: 'Alice Wanjiru',
    origin: 'Westlands, Nairobi',
    destination: 'University of Nairobi',
    departureTime: '07:30',
    seats: 3,
    priceKes: 150,
  },
  {
    id: 2,
    driver: 'Brian Otieno',
    origin: 'Kasarani, Nairobi',
    destination: 'Strathmore University',
    departureTime: '08:00',
    seats: 2,
    priceKes: 200,
  },
];

router.get('/', (req, res) => {
  res.json({ rides: sampleRides });
});

router.get('/:id', (req, res) => {
  const ride = sampleRides.find((r) => r.id === parseInt(req.params.id));
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

module.exports = router;
