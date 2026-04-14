const router = require('express').Router();
const Alert = require('../models/Alert');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List alerts (filterable)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: busId
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 50 }
 *     responses:
 *       200: { description: Array of alerts }
 */
router.get('/', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.busId) filter.busId = req.query.busId;
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await Alert.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/alerts/{busId}:
 *   get:
 *     tags: [Alerts]
 *     summary: Get alerts for specific bus
 */
router.get('/:busId', async (req, res) => {
  try {
    const alerts = await Alert.find({ busId: req.params.busId })
      .sort({ timestamp: -1 }).limit(20).lean();
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}/acknowledge:
 *   patch:
 *     tags: [Alerts]
 *     summary: Acknowledge an alert (staff only)
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/:alertId/acknowledge', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.alertId, { acknowledged: true }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
