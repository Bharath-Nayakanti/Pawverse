const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { buildVaccinePlan } = require('../engines/vaccineEngine');
const { getPet, insertVaccinationRecord, insertVaccineRecord, listVaccinationRecords, listVaccineRecords } = require('../services/petCareStore');
const { vaccineSchema, validateBody } = require('../utils/petCareValidation');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const [legacyVaccines, vaccinationRecords] = await Promise.all([
    listVaccineRecords(req.user.id, req.query.petId),
    listVaccinationRecords(req.user.id, req.query.petId)
  ]);
  const vaccines = [...vaccinationRecords, ...legacyVaccines];
  res.json({ vaccines });
}));

router.post('/', validateBody(vaccineSchema), asyncHandler(async (req, res) => {
  const [vaccine] = await Promise.all([
    insertVaccinationRecord(req.user.id, req.body),
    insertVaccineRecord(req.user.id, req.body)
  ]);
  if (!vaccine) return res.status(404).json({ error: 'Pet not found' });
  res.status(201).json({ vaccine });
}));

router.get('/recommendations/:petId', asyncHandler(async (req, res) => {
  const pet = await getPet(req.user.id, req.params.petId);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  const records = await listVaccinationRecords(req.user.id, pet.id);
  const recommendations = buildVaccinePlan(pet, records, req.query.region || 'US');
  res.json({ recommendations });
}));

module.exports = router;
