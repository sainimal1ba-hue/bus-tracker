const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  numberPlate: { type: String, required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  isActive: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastUpdated: { type: Date, default: Date.now }
});

busSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Bus', busSchema);
