const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const petSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  species: Joi.string().valid('dog', 'cat').required(),
  breed: Joi.string().trim().allow('').max(120),
  dateOfBirth: Joi.date().iso().allow(null),
  ageYears: Joi.number().min(0).max(40).allow(null),
  gender: Joi.string().valid('female', 'male', 'unknown').default('unknown'),
  weightKg: Joi.number().min(0).max(200).allow(null),
  allergies: Joi.array().items(Joi.string().trim().max(100)).default([]),
  medicalConditions: Joi.array().items(Joi.string().trim().max(120)).default([]),
  activityLevel: Joi.string().valid('low', 'moderate', 'high').default('moderate'),
  neuteredSpayed: Joi.boolean().default(false),
  imageUrl: Joi.string().uri({ allowRelative: true }).allow('', null),
  predictedBreed: Joi.string().trim().allow('', null),
  confirmedBreed: Joi.string().trim().allow('', null),
  breedConfidence: Joi.number().min(0).max(1).allow(null)
});

const petImageSchema = Joi.object({
  imageUrl: Joi.string().uri({ allowRelative: true }).required(),
  predictedSpecies: Joi.string().valid('dog', 'cat').allow(null),
  predictedBreed: Joi.string().trim().allow('', null),
  confirmedBreed: Joi.string().trim().allow('', null),
  confidence: Joi.number().min(0).max(1).allow(null),
  isPrimary: Joi.boolean().default(false)
});

const reminderSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  type: Joi.string().valid('vaccine', 'feeding', 'medication', 'deworming', 'flea_tick', 'grooming', 'exercise', 'appointment').required(),
  title: Joi.string().trim().min(1).max(160).required(),
  description: Joi.string().trim().allow('', null),
  dueAt: Joi.date().iso().required(),
  recurrence: Joi.string().valid('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly').default('none'),
  status: Joi.string().valid('upcoming', 'completed', 'overdue', 'skipped').default('upcoming'),
  metadata: Joi.object().default({})
});

const recurrenceRuleSchema = Joi.object({
  frequency: Joi.string().valid('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom').default('none'),
  interval: Joi.number().integer().min(1).max(36).default(1),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).default([]),
  intervalDays: Joi.number().integer().min(1).max(365).optional()
});

const scheduleTemplateSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  type: Joi.string().valid('vaccine', 'feeding', 'medication', 'deworming', 'flea_tick', 'grooming', 'exercise', 'appointment', 'hydration', 'weight').required(),
  title: Joi.string().trim().min(1).max(160).required(),
  description: Joi.string().trim().allow('', null),
  recurrenceRule: recurrenceRuleSchema.default({ frequency: 'none', interval: 1 }),
  preferredTimes: Joi.array().items(Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/)).default([]),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().allow(null),
  timezone: Joi.string().trim().max(80).default('UTC'),
  metadata: Joi.object().default({})
});

const occurrenceActionSchema = Joi.object({
  action: Joi.string().valid('complete', 'skip', 'snooze', 'reschedule').required(),
  snoozedUntil: Joi.date().iso().when('action', { is: 'snooze', then: Joi.required(), otherwise: Joi.optional() }),
  dueAt: Joi.date().iso().when('action', { is: 'reschedule', then: Joi.required(), otherwise: Joi.optional() }),
  notes: Joi.string().trim().allow('', null),
  metadata: Joi.object().default({})
});

const vaccineSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  vaccineName: Joi.string().trim().min(1).max(160).required(),
  status: Joi.string().valid('suggested', 'scheduled', 'completed', 'overdue').default('scheduled'),
  administeredAt: Joi.date().iso().allow(null),
  dueAt: Joi.date().iso().allow(null),
  nextBoosterAt: Joi.date().iso().allow(null),
  provider: Joi.string().trim().allow('', null),
  notes: Joi.string().trim().allow('', null)
});

const feedingPlanSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  caloriesPerDay: Joi.number().min(0).allow(null),
  mealsPerDay: Joi.number().integer().min(1).max(8).default(2),
  feedingTimes: Joi.array().items(Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/)).default([]),
  dietType: Joi.string().trim().allow('', null),
  quantityPerMeal: Joi.string().trim().allow('', null),
  hydrationGoalMl: Joi.number().min(0).allow(null),
  foodSuggestions: Joi.array().items(Joi.string().trim().max(180)).default([]),
  notes: Joi.string().trim().allow('', null),
  isActive: Joi.boolean().default(true)
});

const healthRecordSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  type: Joi.string().valid('vet_visit', 'diagnosis', 'symptom', 'treatment', 'surgery', 'prescription', 'report', 'image', 'weight').required(),
  title: Joi.string().trim().min(1).max(180).required(),
  description: Joi.string().trim().allow('', null),
  occurredAt: Joi.date().iso().default(() => new Date().toISOString()),
  severity: Joi.string().valid('low', 'moderate', 'high', 'emergency').allow(null),
  metadata: Joi.object().default({})
});

const appointmentSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  vetName: Joi.string().trim().allow('', null),
  clinicName: Joi.string().trim().allow('', null),
  reason: Joi.string().trim().min(1).max(180).required(),
  scheduledAt: Joi.date().iso().required(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled').default('scheduled'),
  notes: Joi.string().trim().allow('', null)
});

const symptomAnalysisSchema = Joi.object({
  petId: Joi.string().uuid().allow(null),
  species: Joi.string().valid('dog', 'cat').required(),
  symptoms: Joi.array().items(Joi.string().trim().min(1).max(120)).min(1).required()
});

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.body = value;
  next();
};

const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({ error: 'Invalid route parameters' });
  }

  req.params = value;
  next();
};

module.exports = {
  appointmentSchema,
  feedingPlanSchema,
  healthRecordSchema,
  idParamSchema,
  occurrenceActionSchema,
  petImageSchema,
  petSchema,
  reminderSchema,
  scheduleTemplateSchema,
  symptomAnalysisSchema,
  vaccineSchema,
  validateBody,
  validateParams
};
