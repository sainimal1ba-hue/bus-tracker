const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const LocationHistory = require('../models/LocationHistory');
const Alert = require('../models/Alert');
const { checkGeofences, clearBusState } = require('../services/geofenceService');
const { calculateETAs } = require('../services/etaService');
const { checkRouteDeviation } = require('../services/deviationService');
const { haversine } = require('../utils/haversine');
const { socketAuthMiddleware } = require('../middleware/auth');
const logger = require('../config/logger');

const driverThrottle = new Map();
const lastCoords = new Map();
const THROTTLE_MS = 2000;

function setupSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { username, role, assignedBusId } = socket.user;
    logger.info(`Socket connected: ${username} (${role})`);

    if (role === 'staff') {
      socket.join('alerts');
    }

    // driver starts a trip via socket (alternative to REST endpoint)
    socket.on('driver:start-trip', async (data, callback) => {
      if (role !== 'driver') return;
      const busId = assignedBusId;
      if (!busId) return;
      try {
        const existing = await Trip.findOne({ busId, status: 'active' });
        if (existing) {
          if (callback) callback({ ok: true, trip: existing, message: 'Trip already active' });
          return;
        }
        const tripId = `trip_${busId}_${Date.now()}`;
        const coords = data && data.lat && data.lng ? [parseFloat(data.lng), parseFloat(data.lat)] : [0, 0];
        const bus = await Bus.findOne({ busId });
        const trip = await Trip.create({
          tripId,
          busId,
          driverId: socket.user.id,
          driverUsername: username,
          routeId: bus ? bus.routeId : null,
          startLocation: { type: 'Point', coordinates: coords }
        });
        await Bus.findOneAndUpdate({ busId }, { isActive: true, currentDriverId: socket.user.id, lastUpdated: new Date() });
        io.to(`bus:${busId}`).emit('bus:status-changed', { busId, isActive: true, tripId });
        logger.info(`Trip started: ${tripId} by ${username}`);
        if (callback) callback({ ok: true, trip, message: 'Trip started' });
      } catch (err) {
        logger.error(`Start trip error: ${err.message}`);
        if (callback) callback({ ok: false, error: err.message });
      }
    });

    // driver ends trip
    socket.on('driver:end-trip', async (data, callback) => {
      if (role !== 'driver') return;
      const busId = assignedBusId;
      if (!busId) return;
      try {
        const trip = await Trip.findOne({ busId, status: 'active' });
        if (!trip) {
          if (callback) callback({ ok: false, error: 'No active trip' });
          return;
        }
        const coords = data && data.lat && data.lng ? [parseFloat(data.lng), parseFloat(data.lat)] : [0, 0];
        trip.status = 'completed';
        trip.endTime = new Date();
        trip.endLocation = { type: 'Point', coordinates: coords };
        await trip.save();
        await Bus.findOneAndUpdate({ busId }, { isActive: false, currentDriverId: null });
        clearBusState(busId);
        lastCoords.delete(busId);
        io.to(`bus:${busId}`).emit('bus:status-changed', { busId, isActive: false });
        io.to(`bus:${busId}`).emit('trip:ended', { busId, tripId: trip.tripId });
        logger.info(`Trip ended: ${trip.tripId} by ${username}`);
        if (callback) callback({ ok: true, trip, message: 'Trip ended' });
      } catch (err) {
        logger.error(`End trip error: ${err.message}`);
        if (callback) callback({ ok: false, error: err.message });
      }
    });

    // driver pushes location — only works if there's an active trip
    socket.on('driver:update-location', async (data) => {
      if (role !== 'driver') return;
      const busId = assignedBusId || data.busId;
      if (!busId) return;
      const now = Date.now();
      const lastUpdate = driverThrottle.get(busId) || 0;
      if (now - lastUpdate < THROTTLE_MS) return;
      driverThrottle.set(busId, now);
      try {
        const activeTrip = await Trip.findOne({ busId, status: 'active' });
        if (!activeTrip) return; // no trip = no broadcasting

        const { lat, lng, speed = 0, heading = 0 } = data;
        if (lat == null || lng == null) return;
        const coords = [parseFloat(lng), parseFloat(lat)];

        // calculate incremental distance
        const prev = lastCoords.get(busId);
        let segmentDist = 0;
        if (prev) {
          segmentDist = haversine(prev[1], prev[0], coords[1], coords[0]);
        }
        lastCoords.set(busId, coords);

        await Bus.findOneAndUpdate(
          { busId },
          {
            isActive: true,
            location: { type: 'Point', coordinates: coords },
            speed,
            heading,
            lastUpdated: new Date()
          }
        );
        await LocationHistory.create({
          busId,
          location: { type: 'Point', coordinates: coords },
          speed,
          heading
        });

        // update trip stats
        activeTrip.locationCount += 1;
        activeTrip.totalDistanceKm += segmentDist / 1000;
        if (speed > activeTrip.maxSpeedKmh) activeTrip.maxSpeedKmh = speed;
        activeTrip.avgSpeedKmh = activeTrip.locationCount > 0
          ? parseFloat(((activeTrip.avgSpeedKmh * (activeTrip.locationCount - 1) + speed) / activeTrip.locationCount).toFixed(1))
          : speed;
        activeTrip.totalDistanceKm = parseFloat(activeTrip.totalDistanceKm.toFixed(3));
        await activeTrip.save();

        const updatePayload = {
          busId, lat: parseFloat(lat), lng: parseFloat(lng),
          speed, heading, timestamp: new Date(),
          tripId: activeTrip.tripId
        };
        io.to(`bus:${busId}`).emit('bus:location-updated', updatePayload);

        // route-based checks
        const bus = await Bus.findOne({ busId }).populate('routeId').lean();
        if (bus && bus.routeId) {
          const route = bus.routeId;
          if (speed > route.maxSpeedLimit) {
            const alert = await Alert.create({
              busId,
              type: 'speed_violation',
              message: `Bus ${busId} exceeded speed limit: ${speed} km/h (limit: ${route.maxSpeedLimit})`,
              data: { speed, limit: route.maxSpeedLimit, tripId: activeTrip.tripId },
              location: { type: 'Point', coordinates: coords }
            });
            logger.warn(`Speed violation: ${busId} at ${speed} km/h`);
            io.to('alerts').emit('alert:new', alert);
          }
          if (route.geofences && route.geofences.length > 0) {
            await checkGeofences(busId, coords, route.geofences, io);
          }
          if (route.path && route.path.coordinates && route.path.coordinates.length >= 2) {
            await checkRouteDeviation(busId, coords, route.path, io);
          }
          if (route.stops && route.stops.length > 0) {
            const etas = calculateETAs(coords, speed, route.stops);
            io.to(`bus:${busId}`).emit('bus:eta-update', { busId, etas, tripId: activeTrip.tripId });
          }
        }
      } catch (err) {
        logger.error(`Location update error for ${busId}: ${err.message}`);
      }
    });

    socket.on('passenger:track-bus', (data) => {
      const { busId } = data;
      if (!busId) return;
      socket.join(`bus:${busId}`);
      logger.info(`${username} tracking bus ${busId}`);
    });

    socket.on('passenger:untrack-bus', (data) => {
      const { busId } = data;
      if (!busId) return;
      socket.leave(`bus:${busId}`);
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${username}`);
      // driver disconnect does NOT auto-end trip — trip persists until explicit end
      // this way if driver's phone reconnects, the trip is still active
    });
  });
}

module.exports = { setupSocketHandlers };
