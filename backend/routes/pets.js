const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  idParamSchema,
  petImageSchema,
  petSchema,
  validateBody,
  validateParams
} = require('../utils/petCareValidation');
const {
  addPetImage,
  createPet,
  deletePet,
  getPet,
  listPetImages,
  listPets,
  updatePet
} = require('../services/petCareStore');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const pets = await listPets(req.user.id);
  res.json({ pets });
}));

router.post('/', validateBody(petSchema), asyncHandler(async (req, res) => {
  const pet = await createPet(req.user.id, req.body);
  res.status(201).json({ pet });
}));

router.get('/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const pet = await getPet(req.user.id, req.params.id);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  res.json({ pet });
}));

router.put('/:id', validateParams(idParamSchema), validateBody(petSchema), asyncHandler(async (req, res) => {
  const pet = await updatePet(req.user.id, req.params.id, req.body);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  res.json({ pet });
}));

router.delete('/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  await deletePet(req.user.id, req.params.id);
  res.status(204).send();
}));

router.get('/:id/images', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const images = await listPetImages(req.user.id, req.params.id);
  if (!images) return res.status(404).json({ error: 'Pet not found' });
  res.json({ images });
}));

router.post('/:id/images', validateParams(idParamSchema), validateBody(petImageSchema), asyncHandler(async (req, res) => {
  const image = await addPetImage(req.user.id, req.params.id, req.body);
  if (!image) return res.status(404).json({ error: 'Pet not found' });
  res.status(201).json({ image });
}));

module.exports = router;
