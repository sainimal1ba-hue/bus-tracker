require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const { setupRedisAdapter } = require('./socket/redisAdapter');
const { setupSocketHandlers } = require('./socket/socketHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiLimiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BusTrack API Docs'
}));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

async function start() {
  await connectDB();
  await setupRedisAdapter(io);
  setupSocketHandlers(io);
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    logger.info(`BusTrack server running on port ${PORT}`);
    logger.info(`API docs: http://localhost:${PORT}/api-docs`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

start().catch((err) => {
  logger.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
