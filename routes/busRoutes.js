const router = require('express').Router();
const Bus = require('../models/Bus');
const LocationHistory = require('../models/LocationHistory');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * @swagger
 * /api/buses:
 *   get:
 *     tags: [Buses]
 *     summary: List all buses
 *     responses:
 *       200: { description: Array of buses }
 */
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find().populate('routeId', 'name routeId').lean();
    res.json({ buses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses/nearby:
 *   get:
 *     tags: [Buses]
 *     summary: Find buses within radius (meters)
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 2000 }
 *     responses:
 *       200: { description: Nearby buses }
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 2000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const buses = await Bus.find({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    }).lean();
    res.json({ buses, count: buses.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses/{busId}:
 *   get:
 *     tags: [Buses]
 *     summary: Get single bus
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Bus details }
 */
router.get('/:busId', async (req, res) => {
  try {
    const bus = await Bus.findOne({ busId: req.params.busId }).populate('routeId');
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json({ bus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses:
 *   post:
 *     tags: [Buses]
 *     summary: Register a new bus (staff only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [busId, name, numberPlate]
 *             properties:
 *               busId: { type: string }
 *               name: { type: string }
 *               numberPlate: { type: string }
 *               routeId: { type: string }
 *     responses:
 *       201: { description: Bus created }
 */
router.post('/', verifyToken, requireRole('staff'), validate(schemas.createBus), async (req, res) => {
  try {
    const existing = await Bus.findOne({ busId: req.body.busId });
    if (existing) return res.status(409).json({ error: 'Bus ID already exists' });
    const bus = await Bus.create(req.body);
    res.status(201).json({ bus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses/{busId}:
 *   put:
 *     tags: [Buses]
 *     summary: Update bus info (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:busId', verifyToken, requireRole('staff'), validate(schemas.updateBus), async (req, res) => {
  try {
    const bus = await Bus.findOneAndUpdate({ busId: req.params.busId }, req.body, { new: true });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json({ bus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses/{busId}:
 *   delete:
 *     tags: [Buses]
 *     summary: Delete a bus (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:busId', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const bus = await Bus.findOneAndDelete({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json({ message: 'Bus deleted', bus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/buses/{busId}/history:
 *   get:
 *     tags: [Buses]
 *     summary: Get location history
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: hours
 *         schema: { type: number, default: 6 }
 *     responses:
 *       200: { description: Location history }
 */
router.get('/:busId/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 6;
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const history = await LocationHistory.find({ busId: req.params.busId, timestamp: { $gte: since } })
      .sort({ timestamp: -1 }).limit(500).lean();
    res.json({ busId: req.params.busId, count: history.length, periodHours: hours, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
