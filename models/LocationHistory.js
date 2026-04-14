const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
  busId: { type: String, required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

locationHistorySchema.index({ location: '2dsphere' });
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });
locationHistorySchema.index({ busId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
