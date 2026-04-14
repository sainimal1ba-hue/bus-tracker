const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  order: { type: Number, required: true }
}, { _id: false });

const geofenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  center: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  radiusMeters: { type: Number, required: true, default: 100 }
}, { _id: true });

const routeSchema = new mongoose.Schema({
  routeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  stops: [stopSchema],
  path: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: { type: [[Number]], default: [] }
  },
  maxSpeedLimit: { type: Number, default: 60 },
  geofences: [geofenceSchema],
  createdAt: { type: Date, default: Date.now }
});

routeSchema.index({ 'stops.location': '2dsphere' });

module.exports = mongoose.model('Route', routeSchema);
