require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');

// St. Joseph's College of Engineering, Semmancheri, OMR, Chennai
// 12.8694° N, 80.2158° E
const COLLEGE = [80.2158, 12.8694];

const SEED_ROUTES = [
  {
    routeId: 'route_omr',
    name: 'OMR Route (Perungudi → St. Josephs)',
    maxSpeedLimit: 50,
    stops: [
      { name: 'Perungudi Signal', location: { type: 'Point', coordinates: [80.2397, 12.9614] }, order: 1 },
      { name: 'Thoraipakkam', location: { type: 'Point', coordinates: [80.2327, 12.9387] }, order: 2 },
      { name: 'Sholinganallur Junction', location: { type: 'Point', coordinates: [80.2279, 12.9010] }, order: 3 },
      { name: 'Karapakkam', location: { type: 'Point', coordinates: [80.2240, 12.8870] }, order: 4 },
      { name: 'Semmancheri', location: { type: 'Point', coordinates: [80.2190, 12.8740] }, order: 5 },
      { name: 'St. Josephs College', location: { type: 'Point', coordinates: COLLEGE }, order: 6 }
    ],
    path: {
      type: 'LineString',
      coordinates: [
        [80.2397, 12.9614], [80.2380, 12.9540], [80.2360, 12.9470],
        [80.2327, 12.9387], [80.2310, 12.9300], [80.2295, 12.9200],
        [80.2279, 12.9010], [80.2265, 12.8940], [80.2240, 12.8870],
        [80.2220, 12.8800], [80.2190, 12.8740], [80.2170, 12.8710],
        COLLEGE
      ]
    },
    geofences: [
      { name: 'College Campus', center: { type: 'Point', coordinates: COLLEGE }, radiusMeters: 200 },
      { name: 'Sholinganallur Junction', center: { type: 'Point', coordinates: [80.2279, 12.9010] }, radiusMeters: 150 },
      { name: 'Perungudi Pickup', center: { type: 'Point', coordinates: [80.2397, 12.9614] }, radiusMeters: 100 }
    ]
  },
  {
    routeId: 'route_velachery',
    name: 'Velachery Route (Velachery → St. Josephs)',
    maxSpeedLimit: 45,
    stops: [
      { name: 'Velachery Station', location: { type: 'Point', coordinates: [80.2180, 12.9815] }, order: 1 },
      { name: 'Medavakkam Junction', location: { type: 'Point', coordinates: [80.1920, 12.9168] }, order: 2 },
      { name: 'Jalladianpet', location: { type: 'Point', coordinates: [80.2050, 12.9000] }, order: 3 },
      { name: 'Semmancheri', location: { type: 'Point', coordinates: [80.2190, 12.8740] }, order: 4 },
      { name: 'St. Josephs College', location: { type: 'Point', coordinates: COLLEGE }, order: 5 }
    ],
    path: {
      type: 'LineString',
      coordinates: [
        [80.2180, 12.9815], [80.2100, 12.9600], [80.2000, 12.9400],
        [80.1920, 12.9168], [80.1980, 12.9100], [80.2050, 12.9000],
        [80.2120, 12.8880], [80.2190, 12.8740], [80.2170, 12.8710],
        COLLEGE
      ]
    },
    geofences: [
      { name: 'College Campus', center: { type: 'Point', coordinates: COLLEGE }, radiusMeters: 200 },
      { name: 'Velachery Station', center: { type: 'Point', coordinates: [80.2180, 12.9815] }, radiusMeters: 150 }
    ]
  },
  {
    routeId: 'route_tambaram',
    name: 'Tambaram Route (Tambaram → St. Josephs)',
    maxSpeedLimit: 50,
    stops: [
      { name: 'Tambaram Station', location: { type: 'Point', coordinates: [80.1278, 12.9249] }, order: 1 },
      { name: 'Chromepet', location: { type: 'Point', coordinates: [80.1440, 12.9516] }, order: 2 },
      { name: 'Pallavaram', location: { type: 'Point', coordinates: [80.1500, 12.9680] }, order: 3 },
      { name: 'Medavakkam', location: { type: 'Point', coordinates: [80.1920, 12.9168] }, order: 4 },
      { name: 'Semmancheri', location: { type: 'Point', coordinates: [80.2190, 12.8740] }, order: 5 },
      { name: 'St. Josephs College', location: { type: 'Point', coordinates: COLLEGE }, order: 6 }
    ],
    path: {
      type: 'LineString',
      coordinates: [
        [80.1278, 12.9249], [80.1360, 12.9380], [80.1440, 12.9516],
        [80.1500, 12.9680], [80.1700, 12.9450], [80.1920, 12.9168],
        [80.2050, 12.9000], [80.2190, 12.8740], [80.2170, 12.8710],
        COLLEGE
      ]
    },
    geofences: [
      { name: 'College Campus', center: { type: 'Point', coordinates: COLLEGE }, radiusMeters: 200 },
      { name: 'Tambaram Station', center: { type: 'Point', coordinates: [80.1278, 12.9249] }, radiusMeters: 150 }
    ]
  }
];

const SEED_BUSES = [
  { busId: 'bus_001', name: 'OMR Express A', numberPlate: 'TN-22-AB-1234' },
  { busId: 'bus_002', name: 'OMR Express B', numberPlate: 'TN-22-CD-5678' },
  { busId: 'bus_003', name: 'Velachery Shuttle', numberPlate: 'TN-22-EF-9012' },
  { busId: 'bus_004', name: 'Tambaram Shuttle', numberPlate: 'TN-22-GH-3456' },
  { busId: 'bus_005', name: 'OMR Express C', numberPlate: 'TN-22-IJ-7890' }
];

const SEED_USERS = [
  { username: 'staff1', password: 'staff123', role: 'staff' },
  { username: 'staff2', password: 'staff123', role: 'staff' },
  { username: 'student1', password: 'student123', role: 'student' },
  { username: 'student2', password: 'student123', role: 'student' },
  { username: 'student3', password: 'student123', role: 'student' },
  { username: 'driver1', password: 'driver123', role: 'driver', assignedBusId: 'bus_001' },
  { username: 'driver2', password: 'driver123', role: 'driver', assignedBusId: 'bus_002' },
  { username: 'driver3', password: 'driver123', role: 'driver', assignedBusId: 'bus_003' },
  { username: 'driver4', password: 'driver123', role: 'driver', assignedBusId: 'bus_004' },
  { username: 'driver5', password: 'driver123', role: 'driver', assignedBusId: 'bus_005' }
];

const ROUTE_ASSIGNMENTS = {
  'bus_001': 'route_omr',
  'bus_002': 'route_omr',
  'bus_003': 'route_velachery',
  'bus_004': 'route_tambaram',
  'bus_005': 'route_omr'
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await User.deleteMany({});
  await Bus.deleteMany({});
  await Route.deleteMany({});
  console.log('Cleared existing data');
  const routeMap = {};
  for (const routeData of SEED_ROUTES) {
    const route = await Route.create(routeData);
    routeMap[route.routeId] = route._id;
    console.log(`Route: ${route.name}`);
  }
  for (const busData of SEED_BUSES) {
    const assignedRoute = ROUTE_ASSIGNMENTS[busData.busId];
    await Bus.create({ ...busData, routeId: routeMap[assignedRoute] || null });
  }
  console.log(`${SEED_BUSES.length} buses created`);
  for (const userData of SEED_USERS) {
    await User.create(userData);
  }
  console.log(`${SEED_USERS.length} users created`);
  console.log('\n=== Seeded Credentials ===');
  console.log('STAFF:');
  console.log('  staff1 / staff123');
  console.log('  staff2 / staff123');
  console.log('STUDENTS:');
  console.log('  student1 / student123');
  console.log('  student2 / student123');
  console.log('  student3 / student123');
  console.log('DRIVERS:');
  console.log('  driver1 / driver123 → bus_001 (OMR Express A)');
  console.log('  driver2 / driver123 → bus_002 (OMR Express B)');
  console.log('  driver3 / driver123 → bus_003 (Velachery Shuttle)');
  console.log('  driver4 / driver123 → bus_004 (Tambaram Shuttle)');
  console.log('  driver5 / driver123 → bus_005 (OMR Express C)');
  console.log('\nAll routes go TO St. Josephs College of Engineering, Semmancheri, OMR');
  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
