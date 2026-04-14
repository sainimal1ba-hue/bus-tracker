const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('../config/logger');

async function setupRedisAdapter(io) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  pubClient.on('error', (err) => logger.error(`Redis pub error: ${err.message}`));
  subClient.on('error', (err) => logger.error(`Redis sub error: ${err.message}`));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Redis adapter connected (Upstash)');
  return { pubClient, subClient };
}

module.exports = { setupRedisAdapter };
