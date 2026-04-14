const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    next();
  };
}

const schemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('driver', 'staff', 'student').required(),
    assignedBusId: Joi.string().allow(null, '')
  }),
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),
  createBus: Joi.object({
    busId: Joi.string().required(),
    name: Joi.string().required(),
    numberPlate: Joi.string().required(),
    routeId: Joi.string().allow(null, ''),
    maxSpeedLimit: Joi.number().min(10).max(120)
  }),
  updateBus: Joi.object({
    name: Joi.string(),
    numberPlate: Joi.string(),
    routeId: Joi.string().allow(null, ''),
    maxSpeedLimit: Joi.number().min(10).max(120)
  }),
  createRoute: Joi.object({
    routeId: Joi.string().required(),
    name: Joi.string().required(),
    stops: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      location: Joi.object({
        type: Joi.string().default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).required()
      }).required(),
      order: Joi.number().required()
    })).min(2).required(),
    path: Joi.object({
      type: Joi.string().default('LineString'),
      coordinates: Joi.array().items(Joi.array().items(Joi.number()).length(2)).min(2)
    }),
    maxSpeedLimit: Joi.number().min(10).max(120).default(60),
    geofences: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      center: Joi.object({
        type: Joi.string().default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).required()
      }).required(),
      radiusMeters: Joi.number().min(10).default(100)
    }))
  })
};

module.exports = { validate, schemas };
