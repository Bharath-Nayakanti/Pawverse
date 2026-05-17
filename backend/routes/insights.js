const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { analyzeSymptoms } = require('../engines/recommendationEngine');
const { generateLifecycleInsights } = require('../engines/insightEngine');
const {
  getPet,
  insertHealthRecord,
  listHealthRecords,
  listVaccineRecords
} = require('../services/petCareStore');
const { listReminderOccurrences, listTaskLogs } = require('../services/scheduleService');
const { symptomAnalysisSchema, validateBody } = require('../utils/petCareValidation');

const router = express.Router();

router.get('/:petId', asyncHandler(async (req, res) => {
  const pet = await getPet(req.user.id, req.params.petId);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const [vaccines, reminders, healthRecords] = await Promise.all([
    listVaccineRecords(req.user.id, pet.id),
    listReminderOccurrences(req.user.id, { petId: pet.id }),
    listHealthRecords(req.user.id, pet.id)
  ]);
  const taskLogs = await listTaskLogs(req.user.id, pet.id);

  const insights = generateLifecycleInsights({ pet, vaccines, reminders, healthRecords, taskLogs });
  res.json({ insights });
}));

router.post('/symptoms/analyze', validateBody(symptomAnalysisSchema), asyncHandler(async (req, res) => {
  const analysis = analyzeSymptoms(req.body);

  if (req.body.petId) {
    await insertHealthRecord(req.user.id, {
      petId: req.body.petId,
      type: 'symptom',
      title: `Symptom analysis: ${analysis.severity}`,
      description: analysis.recommendation,
      occurredAt: new Date().toISOString(),
      severity: analysis.severity,
      metadata: analysis
    });
  }

  res.json({ analysis });
}));

module.exports = router;
