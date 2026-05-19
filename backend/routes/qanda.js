const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../utils/petCareValidation');
const {
  acceptAnswer,
  createAnswer,
  createQuestion,
  createReport,
  findSimilarQuestions,
  followTag,
  getQuestionDetail,
  getReputation,
  listModerationQueue,
  listNotifications,
  listQuestions,
  listSavedQuestions,
  toggleSaveQuestion,
  voteAnswer,
  voteQuestion
} = require('../services/qandaService');

const router = express.Router();

const idParamSchema = Joi.object({ id: Joi.string().uuid().required() });
const answerIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
  answerId: Joi.string().uuid().required()
});

const questionSchema = Joi.object({
  title: Joi.string().trim().min(8).max(220).required(),
  body: Joi.string().trim().min(12).max(8000).required(),
  tags: Joi.array().items(Joi.string().trim().min(2).max(80)).default([]),
  petType: Joi.string().valid('dog', 'cat', 'bird', 'fish', 'exotic', 'general').default('general'),
  category: Joi.string().trim().max(60).default('General'),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([]),
  locationLabel: Joi.string().trim().max(180).allow('', null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null)
});

const answerSchema = Joi.object({
  questionId: Joi.string().uuid().allow(null),
  body: Joi.string().trim().min(2).max(8000).required(),
  parentAnswerId: Joi.string().uuid().allow(null),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([])
});

const voteSchema = Joi.object({
  value: Joi.number().valid(-1, 1).required()
});

const reportSchema = Joi.object({
  questionId: Joi.string().uuid().allow(null),
  answerId: Joi.string().uuid().allow(null),
  reason: Joi.string().trim().min(2).max(80).required(),
  details: Joi.string().trim().max(1000).allow('', null)
});

const tagSchema = Joi.object({
  tag: Joi.string().trim().min(2).max(80).required()
});

router.get('/questions', asyncHandler(async (req, res) => {
  const questions = await listQuestions(req.user.id, req.query);
  res.json({
    questions,
    nextOffset: questions.length ? Number(req.query.offset || 0) + questions.length : null
  });
}));

router.post('/questions', validateBody(questionSchema), asyncHandler(async (req, res) => {
  const result = await createQuestion(req.user.id, req.body);
  const status = result.question?.status === 'published' ? 201 : 202;
  res.status(status).json(result);
}));

router.get('/questions/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const detail = await getQuestionDetail(req.user.id, req.params.id, req.query.sort || 'top');
  if (!detail.question) return res.status(404).json({ error: 'Question not found' });
  res.json(detail);
}));

router.post('/questions/:id/answers', validateParams(idParamSchema), validateBody(answerSchema), asyncHandler(async (req, res) => {
  const result = await createAnswer(req.user.id, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Question not found' });
  res.status(result.answer.status === 'published' ? 201 : 202).json(result);
}));

router.post('/answers/:id/replies', validateParams(idParamSchema), validateBody(answerSchema), asyncHandler(async (req, res) => {
  const result = await createAnswer(req.user.id, req.body.questionId, { ...req.body, parentAnswerId: req.params.id });
  if (!result) return res.status(404).json({ error: 'Question not found' });
  res.status(result.answer.status === 'published' ? 201 : 202).json(result);
}));

router.post('/questions/:id/vote', validateParams(idParamSchema), validateBody(voteSchema), asyncHandler(async (req, res) => {
  res.json({ question: await voteQuestion(req.user.id, req.params.id, req.body.value) });
}));

router.post('/answers/:id/vote', validateParams(idParamSchema), validateBody(voteSchema), asyncHandler(async (req, res) => {
  await voteAnswer(req.user.id, req.params.id, req.body.value);
  res.status(204).send();
}));

router.post('/questions/:id/save', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  res.json(await toggleSaveQuestion(req.user.id, req.params.id));
}));

router.post('/questions/:id/accept/:answerId', validateParams(answerIdParamSchema), asyncHandler(async (req, res) => {
  const detail = await acceptAnswer(req.user.id, req.params.id, req.params.answerId);
  if (!detail) return res.status(403).json({ error: 'Only the question owner can accept an answer' });
  res.json(detail);
}));

router.post('/tags/follow', validateBody(tagSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ tag: await followTag(req.user.id, req.body.tag) });
}));

router.get('/saved', asyncHandler(async (req, res) => {
  res.json({ questions: await listSavedQuestions(req.user.id) });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  res.json({ notifications: await listNotifications(req.user.id) });
}));

router.get('/reputation', asyncHandler(async (req, res) => {
  res.json({ reputation: await getReputation(req.user.id) });
}));

router.post('/reports', validateBody(reportSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ report: await createReport(req.user.id, req.body) });
}));

router.get('/similar', asyncHandler(async (req, res) => {
  res.json({ questions: await findSimilarQuestions(req.user.id, req.query.q || '') });
}));

router.get('/moderation', asyncHandler(async (req, res) => {
  res.json({ queue: await listModerationQueue() });
}));

module.exports = router;
