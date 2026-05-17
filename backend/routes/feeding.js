const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { generateFeedingPlan } = require('../services/petCareIntelligence');
const { getPet, listFeedingPlans, listFeedingPreferences, upsertFeedingPlan } = require('../services/petCareStore');
const { feedingPlanSchema, validateBody } = require('../utils/petCareValidation');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const [plans, preferences] = await Promise.all([
    listFeedingPlans(req.user.id, req.query.petId),
    listFeedingPreferences(req.user.id, req.query.petId)
  ]);
  res.json({ plans, preferences });
}));

router.post('/', validateBody(feedingPlanSchema), asyncHandler(async (req, res) => {
  const plan = await upsertFeedingPlan(req.user.id, req.body);
  if (!plan) return res.status(404).json({ error: 'Pet not found' });
  res.status(201).json({ plan });
}));

router.get('/recommendations/:petId', asyncHandler(async (req, res) => {
  const pet = await getPet(req.user.id, req.params.petId);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  res.json({ recommendation: generateFeedingPlan(pet) });
}));

module.exports = router;
