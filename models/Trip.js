const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  busId: { type: String, required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverUsername: { type: String, required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  startLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  endLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  totalDistanceKm: { type: Number, default: 0 },
  avgSpeedKmh: { type: Number, default: 0 },
  maxSpeedKmh: { type: Number, default: 0 },
  locationCount: { type: Number, default: 0 }
});

tripSchema.index({ status: 1, busId: 1 });
tripSchema.index({ startTime: -1 });

module.exports = mongoose.model('Trip', tripSchema);
