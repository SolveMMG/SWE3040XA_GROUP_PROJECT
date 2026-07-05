export const categories = ['All', 'Commute', 'Airport', 'Campus', 'Event', 'Weekend'];

export const rides = [
  {
    id: 'ride-1',
    title: 'Downtown express after work',
    category: 'Commute',
    price: 8,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    route: 'Financial District to North Park',
    pickup: 'Market St Station',
    dropoff: 'North Park Library',
    date: 'Today',
    time: '5:40 PM',
    seats: 3,
    distance: '11.2 mi',
    seller: {
      name: 'Jordan Lee',
      rating: 4.8,
      rides: 128,
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Fast weekday ride with one stop near City Hall. Clean hybrid, phone chargers, and room for backpacks.',
  },
  {
    id: 'ride-2',
    title: 'Airport pickup from Terminal 2',
    category: 'Airport',
    price: 16,
    image:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    route: 'SFO to Mission Bay',
    pickup: 'SFO Terminal 2 Arrivals',
    dropoff: 'Mission Bay Commons',
    date: 'Tomorrow',
    time: '8:15 AM',
    seats: 2,
    distance: '14.8 mi',
    seller: {
      name: 'Priya Rao',
      rating: 5,
      rides: 91,
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Early airport run with trunk space for two carry-ons. I wait at the rideshare curb and send a live location.',
  },
  {
    id: 'ride-3',
    title: 'Campus shuttle for evening lab',
    category: 'Campus',
    price: 4,
    image:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    route: 'West Dorms to Engineering Hall',
    pickup: 'West Dorms Gate B',
    dropoff: 'Engineering Hall',
    date: 'Monday',
    time: '6:10 PM',
    seats: 4,
    distance: '3.5 mi',
    seller: {
      name: 'Noah Brooks',
      rating: 4.7,
      rides: 57,
      photoUrl:
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Short campus loop for students heading to evening classes. Student ID check at pickup.',
  },
  {
    id: 'ride-4',
    title: 'Saturday stadium carpool',
    category: 'Event',
    price: 12,
    image:
      'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=80',
    route: 'East Village to Harbor Stadium',
    pickup: 'East Village Square',
    dropoff: 'Harbor Stadium Gate 4',
    date: 'Saturday',
    time: '1:00 PM',
    seats: 3,
    distance: '8.1 mi',
    seller: {
      name: 'Amara Stone',
      rating: 4.9,
      rides: 144,
      photoUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Game day carpool with easy drop-off near Gate 4. Leaving right after the match unless everyone agrees.',
  },
];

export const inquiries = {
  sent: [
    {
      id: 'inq-1',
      rideTitle: 'Airport pickup from Terminal 2',
      withUser: 'Priya Rao',
      status: 'Pending',
      message: 'Can I bring one checked bag?',
      date: 'Tomorrow, 8:15 AM',
    },
    {
      id: 'inq-2',
      rideTitle: 'Saturday stadium carpool',
      withUser: 'Amara Stone',
      status: 'Accepted',
      message: 'I can meet at East Village Square.',
      date: 'Saturday, 1:00 PM',
    },
  ],
  received: [
    {
      id: 'inq-3',
      rideTitle: 'Downtown express after work',
      withUser: 'Leo Martinez',
      status: 'Pending',
      message: 'Is a stop near 9th Street possible?',
      date: 'Today, 5:40 PM',
    },
    {
      id: 'inq-4',
      rideTitle: 'Downtown express after work',
      withUser: 'Nina Patel',
      status: 'Declined',
      message: 'Looking for two seats.',
      date: 'Today, 5:40 PM',
    },
  ],
};

export const reviews = [
  {
    id: 'rev-1',
    author: 'Leo Martinez',
    rating: 5,
    text: 'Clear pickup details, careful driving, and a smooth ride home.',
  },
  {
    id: 'rev-2',
    author: 'Nina Patel',
    rating: 4,
    text: 'Friendly driver and clean car. Would ride again.',
  },
];
