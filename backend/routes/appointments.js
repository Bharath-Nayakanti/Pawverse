const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { appointmentSchema, validateBody } = require('../utils/petCareValidation');
const { insertAppointment, listAppointments } = require('../services/petCareStore');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const appointments = await listAppointments(req.user.id, req.query.petId);
  res.json({ appointments });
}));

router.post('/', validateBody(appointmentSchema), asyncHandler(async (req, res) => {
  const appointment = await insertAppointment(req.user.id, req.body);
  if (!appointment) return res.status(404).json({ error: 'Pet not found' });
  res.status(201).json({ appointment });
}));

module.exports = router;
