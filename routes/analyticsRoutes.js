const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Dashboard overview stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Overview stats }
 */
router.get('/overview', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const overview = await analyticsService.getOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/analytics/bus/{busId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Stats for a specific bus
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: hours
 *         schema: { type: number, default: 6 }
 */
router.get('/bus/:busId', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 6;
    const stats = await analyticsService.getBusStats(req.params.busId, hours);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/analytics/fleet:
 *   get:
 *     tags: [Analytics]
 *     summary: Fleet-wide statistics
 *     security: [{ bearerAuth: [] }]
 */
router.get('/fleet', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const stats = await analyticsService.getFleetStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
