const { pointToLineDistance } = require('../utils/haversine');
const Alert = require('../models/Alert');
const logger = require('../config/logger');

const DEVIATION_THRESHOLD = 500;

async function checkRouteDeviation(busId, busCoords, routePath, io) {
  if (!routePath || !routePath.coordinates || routePath.coordinates.length < 2) return false;
  const dist = pointToLineDistance(busCoords, routePath.coordinates);
  if (dist > DEVIATION_THRESHOLD) {
    const alert = await Alert.create({
      busId,
      type: 'route_deviation',
      message: `Bus ${busId} deviated ${Math.round(dist)}m from route`,
      data: { deviationMeters: Math.round(dist), threshold: DEVIATION_THRESHOLD },
      location: { type: 'Point', coordinates: busCoords }
    });
    logger.warn(`Route deviation: ${busId} is ${Math.round(dist)}m off route`);
    if (io) io.to('alerts').emit('alert:new', alert);
    return true;
  }
  return false;
}

module.exports = { checkRouteDeviation };
