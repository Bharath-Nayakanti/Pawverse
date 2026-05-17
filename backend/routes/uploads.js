const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { insertUploadedFile } = require('../services/petCareStore');

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const { fileName, fileType, dataUrl, petId, category = 'document' } = req.body;

  if (!fileName || !dataUrl) {
    return res.status(400).json({ error: 'fileName and dataUrl are required' });
  }

  const file = await insertUploadedFile(req.user.id, {
    petId,
    category,
    fileName,
    fileType,
    fileUrl: dataUrl,
    storageProvider: 'local-data-url',
    metadata: { localOnly: true }
  });

  res.status(201).json({
    file
  });
}));

module.exports = router;
