const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { insertHealthRecord, listHealthRecords } = require('../services/petCareStore');
const { healthRecordSchema, validateBody } = require('../utils/petCareValidation');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const records = await listHealthRecords(req.user.id, req.query.petId);
  res.json({ records });
}));

router.post('/', validateBody(healthRecordSchema), asyncHandler(async (req, res) => {
  const record = await insertHealthRecord(req.user.id, req.body);
  if (!record) return res.status(404).json({ error: 'Pet not found' });
  res.status(201).json({ record });
}));

module.exports = router;
