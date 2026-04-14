const router = require('express').Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/trips/start:
 *   post:
 *     tags: [Trips]
 *     summary: Start a trip (driver only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       201: { description: Trip started }
 *       409: { description: Already on a trip }
 */
router.post('/start', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const busId = req.user.assignedBusId;
    if (!busId) return res.status(400).json({ error: 'No bus assigned to this driver' });
    const activeTrip = await Trip.findOne({ busId, status: 'active' });
    if (activeTrip) return res.status(409).json({ error: 'Trip already in progress', trip: activeTrip });
    const tripId = `trip_${busId}_${Date.now()}`;
    const startCoords = req.body.lat && req.body.lng
      ? [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      : [0, 0];
    const bus = await Bus.findOne({ busId });
    const trip = await Trip.create({
      tripId,
      busId,
      driverId: req.user.id,
      driverUsername: req.user.username,
      routeId: bus ? bus.routeId : null,
      startLocation: { type: 'Point', coordinates: startCoords }
    });
    await Bus.findOneAndUpdate({ busId }, { isActive: true, currentDriverId: req.user.id, lastUpdated: new Date() });
    res.status(201).json({ message: 'Trip started — live location is now broadcasting', trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/trips/end:
 *   post:
 *     tags: [Trips]
 *     summary: End current trip (driver only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       200: { description: Trip ended }
 *       404: { description: No active trip }
 */
router.post('/end', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const busId = req.user.assignedBusId;
    if (!busId) return res.status(400).json({ error: 'No bus assigned' });
    const trip = await Trip.findOne({ busId, status: 'active' });
    if (!trip) return res.status(404).json({ error: 'No active trip found' });
    const endCoords = req.body.lat && req.body.lng
      ? [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      : [0, 0];
    trip.status = 'completed';
    trip.endTime = new Date();
    trip.endLocation = { type: 'Point', coordinates: endCoords };
    await trip.save();
    await Bus.findOneAndUpdate({ busId }, { isActive: false, currentDriverId: null });
    res.json({ message: 'Trip ended — location broadcasting stopped', trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/trips/active:
 *   get:
 *     tags: [Trips]
 *     summary: Get all currently active trips
 *     responses:
 *       200: { description: Active trips }
 */
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'active' }).populate('routeId', 'name routeId').lean();
    res.json({ trips, count: trips.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/trips/my:
 *   get:
 *     tags: [Trips]
 *     summary: Get current driver's trips
 *     security: [{ bearerAuth: [] }]
 */
router.get('/my', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const trips = await Trip.find({ driverId: req.user.id }).sort({ startTime: -1 }).limit(20).lean();
    res.json({ trips, count: trips.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/trips:
 *   get:
 *     tags: [Trips]
 *     summary: List all trips (staff only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, completed, cancelled] }
 *       - in: query
 *         name: busId
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 50 }
 */
router.get('/', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.busId) filter.busId = req.query.busId;
    const limit = parseInt(req.query.limit) || 50;
    const trips = await Trip.find(filter).sort({ startTime: -1 }).limit(limit).populate('routeId', 'name').lean();
    res.json({ trips, count: trips.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/trips/{tripId}:
 *   get:
 *     tags: [Trips]
 *     summary: Get trip details
 */
router.get('/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId }).populate('routeId');
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
