const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../middleware/asyncHandler');
const { discoverNearbyProfiles, getUserLocation, upsertUserLocation } = require('../geo/locationService');
const { listConversations, listMessages, sendMessage } = require('../chat/chatService');
const { blockUser, reportUser } = require('../moderation/safetyService');
const {
  createGroup,
  createLostPetAlert,
  createMeetup,
  getSocialSummary,
  joinGroup,
  joinMeetup,
  listConnections,
  listGroups,
  listLostPetAlerts,
  listMeetups,
  requestConnection,
  updateConnectionStatus
} = require('../services/socialService');
const { validateBody, validateParams } = require('../utils/petCareValidation');

const router = express.Router();

const idParamSchema = Joi.object({ id: Joi.string().uuid().required() });

const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  areaLabel: Joi.string().trim().max(160).allow('', null),
  visibilityMode: Joi.string().valid('invisible', 'nearby', 'friends_only', 'pet_only', 'hidden_location').default('nearby'),
  visibilityRadiusKm: Joi.number().min(1).max(100).default(10),
  isVisible: Joi.boolean().default(true),
  petsVisible: Joi.boolean().default(true),
  messagesAllowed: Joi.boolean().default(true),
  connectionRequestsAllowed: Joi.boolean().default(true),
  manualLocation: Joi.boolean().default(false)
});

const nearbyQuerySchema = Joi.object({
  radiusKm: Joi.number().min(1).max(100),
  species: Joi.string().valid('dog', 'cat'),
  breed: Joi.string().trim().max(120),
  activityLevel: Joi.string().valid('low', 'moderate', 'high'),
  ageGroup: Joi.string().valid('young', 'adult', 'senior')
});

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: 'Validation error' });
  req.query = value;
  next();
};

const connectionSchema = Joi.object({ receiverId: Joi.string().uuid().required() });
const connectionStatusSchema = Joi.object({ status: Joi.string().valid('accepted', 'rejected', 'removed', 'blocked').required() });

const messageSchema = Joi.object({
  receiverId: Joi.string().uuid().required(),
  message: Joi.string().trim().min(1).max(1500).required(),
  imageUrl: Joi.string().uri({ allowRelative: true }).allow('', null)
});

const groupSchema = Joi.object({
  title: Joi.string().trim().min(2).max(160).required(),
  description: Joi.string().trim().max(1000).allow('', null),
  location: Joi.string().trim().max(160).allow('', null),
  category: Joi.string().valid('breed', 'city', 'walking', 'adoption', 'rescue', 'community').default('community'),
  visibility: Joi.string().valid('public', 'nearby', 'friends_only', 'private').default('public')
});

const meetupSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180).required(),
  description: Joi.string().trim().max(1000).allow('', null),
  meetupTime: Joi.date().iso().required(),
  approximateLocation: Joi.string().trim().min(2).max(180).required(),
  visibility: Joi.string().valid('public', 'nearby', 'friends_only', 'group').default('nearby'),
  maxParticipants: Joi.number().integer().min(2).max(500).allow(null),
  category: Joi.string().valid('walk', 'playdate', 'adoption', 'vaccination', 'grooming', 'training').default('playdate')
});

const lostPetSchema = Joi.object({
  petId: Joi.string().uuid().allow('', null),
  lastSeenArea: Joi.string().trim().min(2).max(180).required(),
  description: Joi.string().trim().max(1500).allow('', null),
  photoUrl: Joi.string().uri({ allowRelative: true }).allow('', null)
});

const reportSchema = Joi.object({
  reportedUserId: Joi.string().uuid().allow(null),
  targetType: Joi.string().valid('user', 'message', 'group', 'meetup', 'lost_pet_alert').default('user'),
  targetId: Joi.string().uuid().allow(null),
  reason: Joi.string().trim().min(2).max(80).required(),
  details: Joi.string().trim().max(1000).allow('', null)
});

const blockSchema = Joi.object({
  blockedUserId: Joi.string().uuid().required(),
  reason: Joi.string().trim().max(500).allow('', null)
});

router.get('/summary', asyncHandler(async (req, res) => {
  res.json({ summary: await getSocialSummary(req.user.id) });
}));

router.get('/location', asyncHandler(async (req, res) => {
  res.json({ location: await getUserLocation(req.user.id) });
}));

router.put('/location', validateBody(locationSchema), asyncHandler(async (req, res) => {
  res.json({ location: await upsertUserLocation(req.user.id, req.body) });
}));

router.get('/nearby', validateQuery(nearbyQuerySchema), asyncHandler(async (req, res) => {
  const location = await getUserLocation(req.user.id);
  if (!location || !location.isVisible || location.visibilityMode === 'invisible') {
    return res.json({
      needsLocation: true,
      profiles: [],
      pets: [],
      places: [],
      message: 'Save a visible approximate area before searching nearby.'
    });
  }

  const profiles = await discoverNearbyProfiles(req.user.id, req.query);
  const pets = profiles.flatMap((profile) => profile.pets.map((pet) => ({
    ...pet,
    owner: {
      id: profile.userId,
      displayName: profile.displayName,
      areaLabel: profile.areaLabel,
      approximateDistance: profile.approximateDistance
    }
  })));
  res.json({
    needsLocation: false,
    profiles,
    pets,
    places: [
      { id: 'park-1', type: 'park', title: 'Neighborhood Pet Park', areaLabel: 'Central green area', approximateDistance: '~1.5 km away' },
      { id: 'clinic-1', type: 'clinic', title: 'PawCare Veterinary Clinic', areaLabel: 'Main road', approximateDistance: '~2 km away' },
      { id: 'shop-1', type: 'shop', title: 'Happy Tails Pet Shop', areaLabel: 'Market street', approximateDistance: '~3 km away' }
    ]
  });
}));

router.get('/connections', asyncHandler(async (req, res) => {
  res.json({ connections: await listConnections(req.user.id) });
}));

router.post('/connections', validateBody(connectionSchema), asyncHandler(async (req, res) => {
  const result = await requestConnection(req.user.id, req.body.receiverId);
  if (result.error) return res.status(403).json({ error: result.error });
  res.status(201).json(result);
}));

router.patch('/connections/:id', validateParams(idParamSchema), validateBody(connectionStatusSchema), asyncHandler(async (req, res) => {
  const connection = await updateConnectionStatus(req.user.id, req.params.id, req.body.status);
  if (!connection) return res.status(404).json({ error: 'Connection not found or action not allowed' });
  res.json({ connection });
}));

router.get('/messages', asyncHandler(async (req, res) => {
  res.json({ conversations: await listConversations(req.user.id) });
}));

router.get('/messages/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  res.json({ messages: await listMessages(req.user.id, req.params.id) });
}));

router.post('/messages', validateBody(messageSchema), asyncHandler(async (req, res) => {
  const result = await sendMessage(req.user.id, req.body.receiverId, req.body);
  if (result.error) return res.status(403).json({ error: result.error });
  res.status(201).json(result);
}));

router.get('/groups', asyncHandler(async (req, res) => {
  res.json({ groups: await listGroups(req.user.id) });
}));

router.post('/groups', validateBody(groupSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ group: await createGroup(req.user.id, req.body) });
}));

router.post('/groups/:id/join', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  await joinGroup(req.user.id, req.params.id);
  res.status(204).send();
}));

router.get('/meetups', asyncHandler(async (req, res) => {
  res.json({ meetups: await listMeetups(req.user.id) });
}));

router.post('/meetups', validateBody(meetupSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ meetup: await createMeetup(req.user.id, req.body) });
}));

router.post('/meetups/:id/join', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  await joinMeetup(req.user.id, req.params.id);
  res.status(204).send();
}));

router.get('/lost-pets', asyncHandler(async (req, res) => {
  res.json({ alerts: await listLostPetAlerts(req.user.id) });
}));

router.post('/lost-pets', validateBody(lostPetSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ alert: await createLostPetAlert(req.user.id, req.body) });
}));

router.post('/safety/block', validateBody(blockSchema), asyncHandler(async (req, res) => {
  await blockUser(req.user.id, req.body.blockedUserId, req.body.reason);
  res.status(204).send();
}));

router.post('/safety/report', validateBody(reportSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ report: await reportUser(req.user.id, req.body) });
}));

module.exports = router;
