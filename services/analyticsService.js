const LocationHistory = require('../models/LocationHistory');
const Bus = require('../models/Bus');
const Alert = require('../models/Alert');
const { haversine } = require('../utils/haversine');

async function getOverview() {
  const [totalBuses, activeBuses, totalAlerts, unackedAlerts] = await Promise.all([
    Bus.countDocuments(),
    Bus.countDocuments({ isActive: true }),
    Alert.countDocuments(),
    Alert.countDocuments({ acknowledged: false })
  ]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const updatesToday = await LocationHistory.countDocuments({ timestamp: { $gte: todayStart } });
  return { totalBuses, activeBuses, totalAlerts, unackedAlerts, updatesToday };
}

async function getBusStats(busId, hours = 6) {
  const since = new Date(Date.now() - hours * 3600 * 1000);
  const points = await LocationHistory.find({ busId, timestamp: { $gte: since } })
    .sort({ timestamp: 1 }).lean();
  if (points.length < 2) {
    return { busId, totalPoints: points.length, totalDistanceKm: 0, avgSpeedKmh: 0, maxSpeedKmh: 0, uptimeMinutes: 0 };
  }
  let totalDist = 0;
  let maxSpeed = 0;
  let speedSum = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversine(
      points[i - 1].location.coordinates[1], points[i - 1].location.coordinates[0],
      points[i].location.coordinates[1], points[i].location.coordinates[0]
    );
    totalDist += d;
    if (points[i].speed > maxSpeed) maxSpeed = points[i].speed;
    speedSum += points[i].speed;
  }
  const firstTs = new Date(points[0].timestamp).getTime();
  const lastTs = new Date(points[points.length - 1].timestamp).getTime();
  const uptimeMin = Math.round((lastTs - firstTs) / 60000);
  return {
    busId,
    totalPoints: points.length,
    totalDistanceKm: parseFloat((totalDist / 1000).toFixed(2)),
    avgSpeedKmh: parseFloat((speedSum / (points.length - 1)).toFixed(1)),
    maxSpeedKmh: parseFloat(maxSpeed.toFixed(1)),
    uptimeMinutes: uptimeMin,
    periodHours: hours
  };
}

async function getFleetStats() {
  const buses = await Bus.find().lean();
  const stats = await Promise.all(buses.map(b => getBusStats(b.busId, 24)));
  const active = stats.filter(s => s.totalPoints > 0);
  const avgFleetSpeed = active.length > 0
    ? parseFloat((active.reduce((sum, s) => sum + s.avgSpeedKmh, 0) / active.length).toFixed(1))
    : 0;
  const totalFleetDistance = parseFloat(active.reduce((sum, s) => sum + s.totalDistanceKm, 0).toFixed(2));
  return {
    totalBuses: buses.length,
    activeBusesToday: active.length,
    avgFleetSpeedKmh: avgFleetSpeed,
    totalFleetDistanceKm: totalFleetDistance,
    perBus: stats
  };
}

module.exports = { getOverview, getBusStats, getFleetStats };
