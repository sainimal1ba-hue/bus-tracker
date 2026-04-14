const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  busId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['speed_violation', 'geofence_enter', 'geofence_exit', 'route_deviation', 'bus_offline'],
    required: true
  },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  timestamp: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false }
});

alertSchema.index({ timestamp: -1 });
alertSchema.index({ type: 1, busId: 1 });

module.exports = mongoose.model('Alert', alertSchema);
