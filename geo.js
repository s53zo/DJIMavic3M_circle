/* WGS84-compatible spherical geodesic helpers. Distances are accurate at mission scales. */
const EARTH_RADIUS = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const normalize = (d) => ((d % 360) + 360) % 360;
function destinationPoint(lat, lng, bearing, metres) {
  const a = rad(lat),
    l = rad(lng),
    b = rad(bearing),
    q = metres / EARTH_RADIUS;
  const lat2 = Math.asin(
    Math.sin(a) * Math.cos(q) + Math.cos(a) * Math.sin(q) * Math.cos(b),
  );
  const lng2 =
    l +
    Math.atan2(
      Math.sin(b) * Math.sin(q) * Math.cos(a),
      Math.cos(q) - Math.sin(a) * Math.sin(lat2),
    );
  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 };
}
function distanceBetween(a, b) {
  const p = rad(b.lat - a.lat),
    q = rad(b.lng - a.lng),
    x =
      Math.sin(p / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(q / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function calculateBearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat)),
    x =
      Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
      Math.sin(rad(a.lat)) *
        Math.cos(rad(b.lat)) *
        Math.cos(rad(b.lng - a.lng));
  return normalize(deg(Math.atan2(y, x)));
}
function generateCirclePoints(o) {
  const sign = o.direction === "cw" ? 1 : -1;
  return Array.from({ length: o.count }, (_, i) => {
    const az = normalize(o.startAzimuth + (sign * i * 360) / o.count),
      p = destinationPoint(o.lat, o.lng, az, o.radius);
    return { ...p, index: i, azimuth: az };
  });
}
