const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { buildFeedingPreference, buildFeedingScheduleTemplate } = require('../engines/feedingEngine');
const { buildVaccinePlan, buildVaccineScheduleTemplate } = require('../engines/vaccineEngine');
const { getPet, listVaccineRecords } = require('../services/petCareStore');
const {
  createScheduleTemplate,
  generateOccurrencesForTemplate,
  generateOccurrencesForUser,
  listReminderOccurrences,
  listScheduleTemplates,
  updateOccurrenceLifecycle
} = require('../services/scheduleService');
const { occurrenceActionSchema, scheduleTemplateSchema, validateBody } = require('../utils/petCareValidation');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  await generateOccurrencesForUser(req.user.id, { petId: req.query.petId, horizonDays: Number(req.query.horizonDays || 45) });
  const reminders = await listReminderOccurrences(req.user.id, {
    petId: req.query.petId || null,
    status: req.query.status || null
  });
  res.json({ reminders });
}));

router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await listScheduleTemplates(req.user.id, req.query.petId);
  res.json({ templates });
}));

router.post('/templates', validateBody(scheduleTemplateSchema), asyncHandler(async (req, res) => {
  const template = await createScheduleTemplate(req.user.id, req.body);
  if (!template) return res.status(404).json({ error: 'Pet not found' });
  const occurrences = await generateOccurrencesForTemplate(req.user.id, template.id, { horizonDays: 45 });
  res.status(201).json({ template, occurrences });
}));

router.post('/generate', asyncHandler(async (req, res) => {
  const pet = await getPet(req.user.id, req.body.petId);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const feedingPreference = buildFeedingPreference(pet, req.body.feedingPreferences || {});
  const templatePayloads = [
    buildFeedingScheduleTemplate(pet, feedingPreference),
    {
      petId: pet.id,
      type: 'grooming',
      title: `${pet.name} grooming check`,
      description: 'Brush coat, inspect ears, paws, teeth, and skin.',
      recurrenceRule: { frequency: 'weekly', interval: 1 },
      preferredTimes: [req.body.groomingTime || '17:00'],
      startDate: new Date().toISOString().slice(0, 10),
      timezone: req.body.timezone || 'UTC'
    },
    {
      petId: pet.id,
      type: 'flea_tick',
      title: `${pet.name} flea and tick prevention`,
      description: 'Confirm preventive dose or treatment with your veterinarian.',
      recurrenceRule: { frequency: 'monthly', interval: 1 },
      preferredTimes: [req.body.preventiveTime || '10:00'],
      startDate: new Date().toISOString().slice(0, 10),
      timezone: req.body.timezone || 'UTC'
    }
  ];

  const vaccineRecords = await listVaccineRecords(req.user.id, pet.id);
  const vaccineTemplates = buildVaccinePlan(pet, vaccineRecords, req.body.region || 'US')
    .map((recommendation) => buildVaccineScheduleTemplate(pet, recommendation));
  templatePayloads.push(...vaccineTemplates);

  const templates = [];
  const reminders = [];
  for (const payload of templatePayloads) {
    const template = await createScheduleTemplate(req.user.id, { ...payload, timezone: req.body.timezone || payload.timezone });
    templates.push(template);
    reminders.push(...await generateOccurrencesForTemplate(req.user.id, template.id, { horizonDays: Number(req.body.horizonDays || 60) }));
  }

  res.status(201).json({ templates, reminders });
}));

router.patch('/:id/action', validateBody(occurrenceActionSchema), asyncHandler(async (req, res) => {
  const reminder = await updateOccurrenceLifecycle(req.user.id, req.params.id, req.body.action, req.body);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ reminder });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const actionByStatus = {
    completed: 'complete',
    skipped: 'skip',
    snoozed: 'snooze',
    upcoming: 'reschedule',
    pending: 'reschedule'
  };
  const action = actionByStatus[req.body.status];
  if (!action) return res.status(400).json({ error: 'Invalid reminder status' });

  const reminder = await updateOccurrenceLifecycle(req.user.id, req.params.id, action, {
    dueAt: req.body.dueAt || new Date().toISOString(),
    snoozedUntil: req.body.snoozedUntil,
    notes: req.body.notes
  });
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ reminder });
}));

module.exports = router;
