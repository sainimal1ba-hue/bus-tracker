const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToLineDistance(point, lineCoords) {
  let minDist = Infinity;
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const segDist = pointToSegmentDistance(point, lineCoords[i], lineCoords[i + 1]);
    if (segDist < minDist) minDist = segDist;
  }
  return minDist;
}

function pointToSegmentDistance(p, a, b) {
  const d1 = haversine(p[1], p[0], a[1], a[0]);
  const d2 = haversine(p[1], p[0], b[1], b[0]);
  const d3 = haversine(a[1], a[0], b[1], b[0]);
  if (d3 === 0) return d1;
  const s = (d1 + d2 + d3) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - d1) * (s - d2) * (s - d3)));
  const h = (2 * area) / d3;
  const proj1 = Math.sqrt(Math.max(0, d1 * d1 - h * h));
  const proj2 = Math.sqrt(Math.max(0, d2 * d2 - h * h));
  if (proj1 > d3 || proj2 > d3) return Math.min(d1, d2);
  return h;
}

module.exports = { haversine, pointToLineDistance };
