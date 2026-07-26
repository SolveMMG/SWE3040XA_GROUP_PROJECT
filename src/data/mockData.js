export const categories = ['All', 'Commute', 'Airport', 'Campus', 'Event', 'Weekend'];

export const rides = [
  {
    id: 'ride-1',
    title: 'CBD to Westlands evening commute',
    category: 'Commute',
    price: 150,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    route: 'Nairobi CBD to Westlands',
    pickup: 'Kencom Bus Stage',
    dropoff: 'Sarit Centre',
    date: 'Today',
    time: '5:40 PM',
    seats: 3,
    distance: '6.4 km',
    seller: {
      name: 'Brian Otieno',
      rating: 4.8,
      rides: 128,
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Smooth weekday ride from CBD heading to Westlands. AC on, music low, one stop at the Globe Roundabout on request.',
  },
  {
    id: 'ride-2',
    title: 'JKIA pickup — arrivals terminal',
    category: 'Airport',
    price: 900,
    image:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    route: 'JKIA to Upper Hill',
    pickup: 'JKIA Arrivals Hall',
    dropoff: 'Upper Hill Medical Centre',
    date: 'Tomorrow',
    time: '8:15 AM',
    seats: 2,
    distance: '18.3 km',
    seller: {
      name: 'Faith Wanjiku',
      rating: 5,
      rides: 91,
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Airport pickup with boot space for two bags. I wait at the rideshare bay outside arrivals and send a live location when nearby.',
  },
  {
    id: 'ride-3',
    title: 'UoN campus evening shuttle',
    category: 'Campus',
    price: 80,
    image:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    route: 'Halls of Residence to Chiromo Campus',
    pickup: 'UoN Main Gate, University Way',
    dropoff: 'Chiromo Campus',
    date: 'Monday',
    time: '6:10 PM',
    seats: 4,
    distance: '2.8 km',
    seller: {
      name: 'Kevin Mwangi',
      rating: 4.7,
      rides: 57,
      photoUrl:
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Short campus loop for students heading to evening labs. Student ID check at pickup.',
  },
  {
    id: 'ride-4',
    title: 'Kasarani — Harambee Stars match day',
    category: 'Event',
    price: 300,
    image:
      'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=80',
    route: 'Ngara to Kasarani Stadium',
    pickup: 'Ngara Market Stage',
    dropoff: 'Kasarani Stadium Gate A',
    date: 'Saturday',
    time: '1:00 PM',
    seats: 3,
    distance: '10.5 km',
    seller: {
      name: 'Amina Hassan',
      rating: 4.9,
      rides: 144,
      photoUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Match-day carpool with easy drop-off near Gate A. Return ride available — leaving 30 mins after the final whistle.',
  },
  {
    id: 'ride-5',
    title: 'Naivasha weekend trip',
    category: 'Weekend',
    price: 1200,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    route: 'Nairobi to Naivasha',
    pickup: 'Globe Cinema Roundabout',
    dropoff: 'Naivasha Town Stage',
    date: 'Sunday',
    time: '7:00 AM',
    seats: 3,
    distance: '98 km',
    seller: {
      name: 'Dennis Kipchoge',
      rating: 4.6,
      rides: 73,
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Early Sunday getaway to Naivasha. Highway drive on the Mai Mahiu road. Space for a small bag or day pack.',
  },
  {
    id: 'ride-6',
    title: 'Thika Road morning commute',
    category: 'Commute',
    price: 120,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    route: 'Thika Town to Nairobi CBD',
    pickup: 'Thika Stage (near Blue Post)',
    dropoff: 'Archives Bus Stop, CBD',
    date: 'Monday',
    time: '6:30 AM',
    seats: 2,
    distance: '42 km',
    seller: {
      name: 'Grace Njeri',
      rating: 4.9,
      rides: 210,
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    description:
      'Daily highway commute from Thika to the CBD. No detours — straight down Thika Superhighway. Punctual pick-up guaranteed.',
  },
];

export const inquiries = {
  sent: [
    {
      id: 'inq-1',
      rideTitle: 'JKIA pickup — arrivals terminal',
      withUser: 'Faith Wanjiku',
      status: 'Pending',
      message: 'Can I bring one large suitcase?',
      date: 'Tomorrow, 8:15 AM',
    },
    {
      id: 'inq-2',
      rideTitle: 'Kasarani — Harambee Stars match day',
      withUser: 'Amina Hassan',
      status: 'Accepted',
      message: 'I can meet at Ngara Market Stage.',
      date: 'Saturday, 1:00 PM',
    },
  ],
  received: [
    {
      id: 'inq-3',
      rideTitle: 'CBD to Westlands evening commute',
      withUser: 'James Kamau',
      status: 'Pending',
      message: 'Can you stop near Parklands on the way?',
      date: 'Today, 5:40 PM',
    },
    {
      id: 'inq-4',
      rideTitle: 'CBD to Westlands evening commute',
      withUser: 'Sharon Achieng',
      status: 'Declined',
      message: 'Looking for two seats for me and a colleague.',
      date: 'Today, 5:40 PM',
    },
  ],
};

export const reviews = [
  {
    id: 'rev-1',
    author: 'James Kamau',
    rating: 5,
    text: 'Very punctual, clean car, and knew the quickest route to avoid CBD traffic.',
  },
  {
    id: 'rev-2',
    author: 'Sharon Achieng',
    rating: 4,
    text: 'Friendly driver and comfortable ride. Will book again for the Westlands route.',
  },
];
