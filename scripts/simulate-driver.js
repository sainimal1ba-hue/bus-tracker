require('dotenv').config();
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const BUS_COUNT = parseInt(process.argv[2]) || 1;

const ROUTES = {
  route_omr: [
    [80.2397, 12.9614], [80.2380, 12.9540], [80.2360, 12.9470],
    [80.2327, 12.9387], [80.2310, 12.9300], [80.2295, 12.9200],
    [80.2279, 12.9010], [80.2265, 12.8940], [80.2240, 12.8870],
    [80.2220, 12.8800], [80.2190, 12.8740], [80.2170, 12.8710],
    [80.2158, 12.8694]
  ],
  route_velachery: [
    [80.2180, 12.9815], [80.2100, 12.9600], [80.2000, 12.9400],
    [80.1920, 12.9168], [80.1980, 12.9100], [80.2050, 12.9000],
    [80.2120, 12.8880], [80.2190, 12.8740], [80.2170, 12.8710],
    [80.2158, 12.8694]
  ],
  route_tambaram: [
    [80.1278, 12.9249], [80.1360, 12.9380], [80.1440, 12.9516],
    [80.1500, 12.9680], [80.1700, 12.9450], [80.1920, 12.9168],
    [80.2050, 12.9000], [80.2190, 12.8740], [80.2170, 12.8710],
    [80.2158, 12.8694]
  ]
};

const BUS_ROUTE_MAP = {
  1: 'route_omr', 2: 'route_omr', 3: 'route_velachery',
  4: 'route_tambaram', 5: 'route_omr'
};

async function getToken(username, password) {
  const resp = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await resp.json();
  if (!data.token) throw new Error(`Login failed for ${username}: ${JSON.stringify(data)}`);
  return data.token;
}

function interpolate(p1, p2, t) {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

async function simulateBus(busIndex) {
  const driverNum = busIndex + 1;
  const username = `driver${driverNum}`;
  const busId = `bus_00${driverNum}`;
  const routeKey = BUS_ROUTE_MAP[driverNum] || 'route_omr';
  const routePath = ROUTES[routeKey];
  console.log(`[${busId}] Route: ${routeKey} | Logging in as ${username}...`);
  const token = await getToken(username, 'driver123');
  const socket = io(SERVER_URL, { auth: { token } });

  socket.on('connect', () => {
    console.log(`[${busId}] Connected — starting trip...`);
    const startCoord = routePath[0];
    socket.emit('driver:start-trip', { lat: startCoord[1], lng: startCoord[0] }, (res) => {
      if (res && res.ok) {
        console.log(`[${busId}] Trip started: ${res.trip.tripId}`);
        beginRoute(socket, busId, routePath);
      } else {
        console.error(`[${busId}] Failed to start trip: ${res ? res.error : 'no response'}`);
      }
    });
  });

  socket.on('connect_error', (err) => console.error(`[${busId}] Connection error: ${err.message}`));
}

function beginRoute(socket, busId, routePath) {
  let pathIndex = 0;
  let subStep = 0;
  const SUBSTEPS = 8;

  const interval = setInterval(() => {
    if (pathIndex >= routePath.length - 1) {
      console.log(`[${busId}] Arrived at St. Josephs College — ending trip`);
      socket.emit('driver:end-trip', { lat: 12.8694, lng: 80.2158 }, (res) => {
        console.log(`[${busId}] Trip ended. Restarting in 5s...`);
      });
      clearInterval(interval);
      setTimeout(() => {
        console.log(`[${busId}] Starting new trip...`);
        const startCoord = routePath[0];
        socket.emit('driver:start-trip', { lat: startCoord[1], lng: startCoord[0] }, (res) => {
          if (res && res.ok) {
            console.log(`[${busId}] New trip: ${res.trip.tripId}`);
            beginRoute(socket, busId, routePath);
          }
        });
      }, 5000);
      return;
    }
    const from = routePath[pathIndex];
    const to = routePath[pathIndex + 1];
    const t = subStep / SUBSTEPS;
    const [lng, lat] = interpolate(from, to, t);
    const jitterLng = lng + (Math.random() - 0.5) * 0.00008;
    const jitterLat = lat + (Math.random() - 0.5) * 0.00008;
    const speed = 25 + Math.random() * 25;
    socket.emit('driver:update-location', {
      busId,
      lat: parseFloat(jitterLat.toFixed(6)),
      lng: parseFloat(jitterLng.toFixed(6)),
      speed: parseFloat(speed.toFixed(1)),
      heading: Math.random() * 360
    });
    const now = new Date().toLocaleTimeString();
    console.log(`[${busId}] ${now} → ${jitterLat.toFixed(5)}, ${jitterLng.toFixed(5)} @ ${speed.toFixed(0)} km/h`);
    subStep++;
    if (subStep >= SUBSTEPS) {
      subStep = 0;
      pathIndex++;
    }
  }, 3000);
}

async function main() {
  console.log(`Simulating ${BUS_COUNT} bus(es) heading to St. Josephs College, OMR`);
  console.log(`Server: ${SERVER_URL}\n`);
  for (let i = 0; i < Math.min(BUS_COUNT, 5); i++) {
    await simulateBus(i);
    if (i < BUS_COUNT - 1) await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch((err) => {
  console.error('Simulator failed:', err.message);
  process.exit(1);
});
