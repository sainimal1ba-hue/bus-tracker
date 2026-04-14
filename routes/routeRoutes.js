const router = require('express').Router();
const Route = require('../models/Route');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * @swagger
 * /api/routes:
 *   get:
 *     tags: [Routes]
 *     summary: List all routes
 *     responses:
 *       200: { description: Array of routes }
 */
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find().lean();
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/routes/{routeId}:
 *   get:
 *     tags: [Routes]
 *     summary: Get single route
 */
router.get('/:routeId', async (req, res) => {
  try {
    const route = await Route.findOne({ routeId: req.params.routeId });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/routes:
 *   post:
 *     tags: [Routes]
 *     summary: Create a route (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', verifyToken, requireRole('staff'), validate(schemas.createRoute), async (req, res) => {
  try {
    const existing = await Route.findOne({ routeId: req.body.routeId });
    if (existing) return res.status(409).json({ error: 'Route ID already exists' });
    const route = await Route.create(req.body);
    res.status(201).json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/routes/{routeId}:
 *   put:
 *     tags: [Routes]
 *     summary: Update route (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:routeId', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const route = await Route.findOneAndUpdate({ routeId: req.params.routeId }, req.body, { new: true });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/routes/{routeId}:
 *   delete:
 *     tags: [Routes]
 *     summary: Delete route (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:routeId', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const route = await Route.findOneAndDelete({ routeId: req.params.routeId });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted', route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
