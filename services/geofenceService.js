const { haversine } = require('../utils/haversine');
const Alert = require('../models/Alert');
const logger = require('../config/logger');

const busGeofenceState = new Map();

async function checkGeofences(busId, busCoords, geofences, io) {
  if (!geofences || geofences.length === 0) return;
  const stateKey = busId;
  if (!busGeofenceState.has(stateKey)) {
    busGeofenceState.set(stateKey, new Set());
  }
  const prevInside = busGeofenceState.get(stateKey);
  const currentInside = new Set();
  for (const fence of geofences) {
    const dist = haversine(
      busCoords[1], busCoords[0],
      fence.center.coordinates[1], fence.center.coordinates[0]
    );
    const isInside = dist <= fence.radiusMeters;
    if (isInside) currentInside.add(fence.name);
    if (isInside && !prevInside.has(fence.name)) {
      const alert = await Alert.create({
        busId,
        type: 'geofence_enter',
        message: `Bus ${busId} entered zone: ${fence.name}`,
        data: { zone: fence.name, distance: Math.round(dist) },
        location: { type: 'Point', coordinates: busCoords }
      });
      logger.info(`Geofence ENTER: ${busId} → ${fence.name}`);
      if (io) io.to('alerts').emit('alert:new', alert);
    }
    if (!isInside && prevInside.has(fence.name)) {
      const alert = await Alert.create({
        busId,
        type: 'geofence_exit',
        message: `Bus ${busId} exited zone: ${fence.name}`,
        data: { zone: fence.name, distance: Math.round(dist) },
        location: { type: 'Point', coordinates: busCoords }
      });
      logger.info(`Geofence EXIT: ${busId} → ${fence.name}`);
      if (io) io.to('alerts').emit('alert:new', alert);
    }
  }
  busGeofenceState.set(stateKey, currentInside);
}

function clearBusState(busId) {
  busGeofenceState.delete(busId);
}

module.exports = { checkGeofences, clearBusState };
