const { haversine } = require('../utils/haversine');

function calculateETAs(busCoords, busSpeed, stops) {
  if (!stops || stops.length === 0) return [];
  const speedMps = busSpeed > 0 ? (busSpeed * 1000) / 3600 : 0;
  const etas = [];
  for (const stop of stops) {
    const dist = haversine(
      busCoords[1], busCoords[0],
      stop.location.coordinates[1], stop.location.coordinates[0]
    );
    let etaMinutes;
    if (speedMps <= 0.5) {
      etaMinutes = null;
    } else {
      etaMinutes = Math.round((dist / speedMps) / 60);
    }
    etas.push({
      stop: stop.name,
      order: stop.order,
      distanceMeters: Math.round(dist),
      etaMinutes,
      status: etaMinutes === null ? 'stationary' : etaMinutes <= 1 ? 'arriving' : 'en_route'
    });
  }
  return etas.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

module.exports = { calculateETAs };
