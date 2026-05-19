const db = require('../config/database');
const { moderateQuestion } = require('../ai/qandaModeration');

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 90);

const serialize = (value, fallback) => JSON.stringify(value ?? fallback);

const normalizeQuestion = (row) => row && ({
  id: row.id,
  userId: row.user_id,
  authorName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
  authorRole: row.role_label || 'New User',
  title: row.title,
  body: row.body,
  petType: row.pet_type,
  category: row.category,
  urgency: row.urgency,
  images: row.images || [],
  locationLabel: row.location_label,
  latitude: row.latitude,
  longitude: row.longitude,
  status: row.status,
  moderationLabel: row.moderation_label,
  moderationConfidence: Number(row.moderation_confidence || 0),
  moderationAction: row.moderation_action,
  aiSummary: row.ai_summary,
  viewCount: Number(row.view_count || 0),
  answerCount: Number(row.answer_count || 0),
  voteScore: Number(row.vote_score || 0),
  savedCount: Number(row.saved_count || 0),
  acceptedAnswerId: row.accepted_answer_id,
  tags: row.tags || [],
  isSaved: Boolean(row.is_saved),
  userVote: Number(row.user_vote || 0),
  recommendationScore: Number(row.recommendation_score || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const normalizeAnswer = (row) => row && ({
  id: row.id,
  questionId: row.question_id,
  userId: row.user_id,
  parentAnswerId: row.parent_answer_id,
  authorName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
  authorRole: row.role_label || 'New User',
  body: row.body,
  images: row.images || [],
  status: row.status,
  isAccepted: row.is_accepted,
  helpfulScore: Number(row.helpful_score || 0),
  voteScore: Number(row.vote_score || 0),
  userVote: Number(row.user_vote || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const ensureReputation = async (userId) => {
  const result = await db.query(
    `INSERT INTO qa_user_reputation (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId]
  );
  if (result.rows[0]) return result.rows[0];
  const existing = await db.query(`SELECT * FROM qa_user_reputation WHERE user_id = $1`, [userId]);
  return existing.rows[0];
};

const adjustReputation = async (userId, { reputation = 0, contribution = 0, helpful = 0 } = {}) => {
  await ensureReputation(userId);
  await db.query(
    `UPDATE qa_user_reputation
     SET reputation_points = GREATEST(0, reputation_points + $2),
         contribution_score = GREATEST(0, contribution_score + $3),
         helpful_answer_score = GREATEST(0, helpful_answer_score + $4),
         role_label = CASE
           WHEN reputation_points + $2 >= 1500 THEN 'Experienced Owner'
           WHEN reputation_points + $2 >= 500 THEN 'Trusted Owner'
           ELSE role_label
         END
     WHERE user_id = $1`,
    [userId, reputation, contribution, helpful]
  );
};

const upsertTags = async (tagNames = [], category = 'general') => {
  const cleaned = [...new Set(tagNames.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 10);
  const tags = [];
  for (const name of cleaned) {
    const slug = slugify(name);
    if (!slug) continue;
    const result = await db.query(
      `INSERT INTO qa_tags (name, slug, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = qa_tags.name
       RETURNING *`,
      [name.slice(0, 80), slug, category]
    );
    tags.push(result.rows[0]);
  }
  return tags;
};

const attachQuestionTags = async (questionId, tags) => {
  for (const tag of tags) {
    await db.query(
      `INSERT INTO qa_question_tags (question_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [questionId, tag.id]
    );
  }
};

const logModeration = async ({ userId, questionId = null, answerId = null, inputText, moderation }) => {
  await db.query(
    `INSERT INTO qa_moderation_logs (
      user_id, question_id, answer_id, input_text, label, confidence, action, categories, reasons, raw_response
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)`,
    [
      userId,
      questionId,
      answerId,
      inputText,
      moderation.label,
      moderation.confidence || 0,
      moderation.action,
      serialize(moderation.categories, {}),
      serialize(moderation.reasons, []),
      serialize(moderation, {})
    ]
  );
};

const createQuestion = async (userId, payload) => {
  const moderation = await moderateQuestion(payload);
  const status = moderation.action === 'approve' ? 'published' : moderation.action === 'flag' ? 'flagged' : 'rejected';
  const categories = moderation.categories || {};
  const mergedTags = [...(payload.tags || []), ...(categories.tags || [])];
  const tags = await upsertTags(mergedTags, categories.category || payload.category || 'general');

  const result = await db.query(
    `INSERT INTO qa_questions (
      user_id, title, body, pet_type, category, urgency, images, location_label, latitude, longitude,
      status, moderation_label, moderation_confidence, moderation_action, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
    RETURNING *`,
    [
      userId,
      payload.title,
      payload.body,
      categories.petType || payload.petType || 'general',
      categories.category || payload.category || 'General',
      categories.urgency || 'normal',
      serialize(payload.images, []),
      payload.locationLabel || null,
      payload.latitude || null,
      payload.longitude || null,
      status,
      moderation.label,
      moderation.confidence || 0,
      moderation.action,
      serialize({ moderationSource: moderation.source }, {})
    ]
  );

  const question = result.rows[0];
  await attachQuestionTags(question.id, tags);
  await logModeration({ userId, questionId: question.id, inputText: `${payload.title}\n${payload.body}`, moderation });
  if (status === 'published') await adjustReputation(userId, { reputation: 5, contribution: 3 });

  return {
    question: await getQuestion(userId, question.id),
    moderation,
    similar: await findSimilarQuestions(userId, `${payload.title} ${payload.body}`, question.id)
  };
};

const questionSelect = (userParam = '$1') => `
  SELECT q.*, u.first_name, u.last_name, rep.role_label,
    COALESCE(json_agg(DISTINCT jsonb_build_object('name', t.name, 'slug', t.slug, 'category', t.category))
      FILTER (WHERE t.id IS NOT NULL), '[]') AS tags,
    EXISTS(SELECT 1 FROM qa_saved_questions sq WHERE sq.question_id = q.id AND sq.user_id = ${userParam}) AS is_saved,
    COALESCE((SELECT value FROM qa_votes v WHERE v.question_id = q.id AND v.user_id = ${userParam} LIMIT 1), 0) AS user_vote
  FROM qa_questions q
  JOIN users u ON u.id = q.user_id
  LEFT JOIN qa_user_reputation rep ON rep.user_id = q.user_id
  LEFT JOIN qa_question_tags qt ON qt.question_id = q.id
  LEFT JOIN qa_tags t ON t.id = qt.tag_id
`;

const listQuestions = async (userId, filters = {}) => {
  const limit = Math.min(Number(filters.limit || 12), 30);
  const offset = Math.max(Number(filters.offset || 0), 0);
  const params = [userId];
  const where = [`q.status = 'published'`];

  if (filters.petType && filters.petType !== 'all') {
    params.push(filters.petType);
    where.push(`q.pet_type = $${params.length}`);
  }
  if (filters.category && filters.category !== 'all') {
    params.push(filters.category);
    where.push(`lower(q.category) = lower($${params.length})`);
  }
  if (filters.tag) {
    params.push(slugify(filters.tag));
    where.push(`EXISTS (
      SELECT 1 FROM qa_question_tags fqt JOIN qa_tags ft ON ft.id = fqt.tag_id
      WHERE fqt.question_id = q.id AND ft.slug = $${params.length}
    )`);
  }
  if (filters.feed === 'unanswered') where.push(`q.answer_count = 0`);

  const order = {
    newest: `q.created_at DESC`,
    answered: `q.answer_count DESC, q.created_at DESC`,
    trending: `(q.vote_score * 3 + q.answer_count * 2 + q.saved_count + GREATEST(0, 72 - EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 3600)) DESC`,
    personalized: `(q.vote_score * 3 + q.answer_count * 2 + q.saved_count + CASE WHEN EXISTS (
      SELECT 1 FROM qa_question_tags pqt JOIN qa_tag_follows tf ON tf.tag_id = pqt.tag_id
      WHERE pqt.question_id = q.id AND tf.user_id = $1
    ) THEN 20 ELSE 0 END + GREATEST(0, 72 - EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 3600)) DESC`,
    nearby: `CASE WHEN q.location_label IS NULL THEN 1 ELSE 0 END, q.created_at DESC`
  }[filters.feed] || `q.created_at DESC`;

  params.push(limit, offset);
  const result = await db.query(
    `${questionSelect('$1')}
     WHERE ${where.join(' AND ')}
     GROUP BY q.id, u.first_name, u.last_name, rep.role_label
     ORDER BY ${order}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows.map(normalizeQuestion);
};

const getQuestion = async (userId, questionId) => {
  const result = await db.query(
    `${questionSelect('$1')}
     WHERE q.id = $2
     GROUP BY q.id, u.first_name, u.last_name, rep.role_label`,
    [userId, questionId]
  );
  return normalizeQuestion(result.rows[0]);
};

const getQuestionDetail = async (userId, questionId, sort = 'top') => {
  await db.query(`UPDATE qa_questions SET view_count = view_count + 1 WHERE id = $1`, [questionId]);
  await db.query(
    `INSERT INTO qa_question_views (user_id, question_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, question_id) DO UPDATE
       SET view_count = qa_question_views.view_count + 1, updated_at = CURRENT_TIMESTAMP`,
    [userId, questionId]
  );

  const question = await getQuestion(userId, questionId);
  const order = sort === 'newest'
    ? 'a.created_at DESC'
    : sort === 'helpful'
      ? 'a.helpful_score DESC, a.vote_score DESC, a.created_at DESC'
      : 'a.is_accepted DESC, a.vote_score DESC, a.created_at DESC';

  const answers = await db.query(
    `SELECT a.*, u.first_name, u.last_name, rep.role_label,
       COALESCE((SELECT value FROM qa_votes v WHERE v.answer_id = a.id AND v.user_id = $2 LIMIT 1), 0) AS user_vote
     FROM qa_answers a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN qa_user_reputation rep ON rep.user_id = a.user_id
     WHERE a.question_id = $1 AND a.status = 'published'
     ORDER BY ${order}`,
    [questionId, userId]
  );

  return { question, answers: answers.rows.map(normalizeAnswer) };
};

const createAnswer = async (userId, questionId, payload) => {
  const question = await getQuestion(userId, questionId);
  if (!question) return null;
  const moderation = await moderateQuestion({ title: question.title, body: payload.body, tags: question.tags?.map((tag) => tag.name) || [], petType: question.petType });
  const status = moderation.action === 'reject' ? 'rejected' : moderation.action === 'flag' ? 'flagged' : 'published';
  const result = await db.query(
    `INSERT INTO qa_answers (question_id, user_id, parent_answer_id, body, images, status, moderation_label, moderation_confidence)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING *`,
    [questionId, userId, payload.parentAnswerId || null, payload.body, serialize(payload.images, []), status, moderation.label, moderation.confidence || 0]
  );
  const answer = result.rows[0];
  await logModeration({ userId, questionId, answerId: answer.id, inputText: payload.body, moderation });

  if (status === 'published') {
    await db.query(`UPDATE qa_questions SET answer_count = answer_count + 1 WHERE id = $1`, [questionId]);
    await adjustReputation(userId, { reputation: 10, contribution: 5 });
    if (question.userId !== userId) {
      await createNotification(question.userId, userId, questionId, answer.id, 'answer', 'Your question received a new answer.');
    }
  }

  return { answer: normalizeAnswer({ ...answer, first_name: '', last_name: '' }), moderation };
};

const voteQuestion = async (userId, questionId, value) => {
  const current = await db.query(`SELECT value FROM qa_votes WHERE user_id = $1 AND question_id = $2`, [userId, questionId]);
  const previous = current.rows[0]?.value || 0;
  const next = previous === value ? 0 : value;
  if (next === 0) {
    await db.query(`DELETE FROM qa_votes WHERE user_id = $1 AND question_id = $2`, [userId, questionId]);
  } else {
    await db.query(
      `INSERT INTO qa_votes (user_id, question_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, question_id) WHERE question_id IS NOT NULL
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, value]
    );
  }
  await db.query(`UPDATE qa_questions SET vote_score = vote_score + $2 WHERE id = $1`, [questionId, next - previous]);
  return getQuestion(userId, questionId);
};

const voteAnswer = async (userId, answerId, value) => {
  const current = await db.query(`SELECT value FROM qa_votes WHERE user_id = $1 AND answer_id = $2`, [userId, answerId]);
  const previous = current.rows[0]?.value || 0;
  const next = previous === value ? 0 : value;
  if (next === 0) {
    await db.query(`DELETE FROM qa_votes WHERE user_id = $1 AND answer_id = $2`, [userId, answerId]);
  } else {
    await db.query(
      `INSERT INTO qa_votes (user_id, answer_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, answer_id) WHERE answer_id IS NOT NULL
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [userId, answerId, value]
    );
  }
  const result = await db.query(
    `UPDATE qa_answers SET vote_score = vote_score + $2, helpful_score = helpful_score + GREATEST($2, 0)
     WHERE id = $1 RETURNING user_id`,
    [answerId, next - previous]
  );
  if (next - previous > 0 && result.rows[0]?.user_id) await adjustReputation(result.rows[0].user_id, { reputation: 2, helpful: 1 });
  return result.rows[0];
};

const toggleSaveQuestion = async (userId, questionId) => {
  const existing = await db.query(`SELECT 1 FROM qa_saved_questions WHERE user_id = $1 AND question_id = $2`, [userId, questionId]);
  if (existing.rows[0]) {
    await db.query(`DELETE FROM qa_saved_questions WHERE user_id = $1 AND question_id = $2`, [userId, questionId]);
    await db.query(`UPDATE qa_questions SET saved_count = GREATEST(0, saved_count - 1) WHERE id = $1`, [questionId]);
    return { saved: false };
  }
  await db.query(`INSERT INTO qa_saved_questions (user_id, question_id) VALUES ($1, $2)`, [userId, questionId]);
  await db.query(`UPDATE qa_questions SET saved_count = saved_count + 1 WHERE id = $1`, [questionId]);
  return { saved: true };
};

const acceptAnswer = async (userId, questionId, answerId) => {
  const owner = await db.query(`SELECT user_id FROM qa_questions WHERE id = $1`, [questionId]);
  if (owner.rows[0]?.user_id !== userId) return null;
  await db.query(`UPDATE qa_answers SET is_accepted = false WHERE question_id = $1`, [questionId]);
  const result = await db.query(
    `UPDATE qa_answers SET is_accepted = true, helpful_score = helpful_score + 5 WHERE id = $1 AND question_id = $2 RETURNING user_id`,
    [answerId, questionId]
  );
  await db.query(`UPDATE qa_questions SET accepted_answer_id = $1 WHERE id = $2`, [answerId, questionId]);
  if (result.rows[0]?.user_id) await adjustReputation(result.rows[0].user_id, { reputation: 25, helpful: 5 });
  return getQuestionDetail(userId, questionId);
};

const followTag = async (userId, tagName) => {
  const [tag] = await upsertTags([tagName]);
  await db.query(`INSERT INTO qa_tag_follows (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, tag.id]);
  await db.query(`UPDATE qa_tags SET follower_count = follower_count + 1 WHERE id = $1`, [tag.id]);
  return tag;
};

const createReport = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO qa_reports (reporter_id, question_id, answer_id, reason, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, payload.questionId || null, payload.answerId || null, payload.reason, payload.details || null]
  );
  return result.rows[0];
};

const createNotification = async (userId, actorId, questionId, answerId, type, message) => {
  await db.query(
    `INSERT INTO qa_notifications (user_id, actor_id, question_id, answer_id, type, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, actorId, questionId, answerId, type, message]
  );
};

const listNotifications = async (userId) => {
  const result = await db.query(
    `SELECT n.*, q.title
     FROM qa_notifications n
     LEFT JOIN qa_questions q ON q.id = n.question_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
};

const listSavedQuestions = async (userId) => {
  const result = await db.query(
    `${questionSelect('$1')}
     JOIN qa_saved_questions sq ON sq.question_id = q.id AND sq.user_id = $1
     WHERE q.status = 'published'
     GROUP BY q.id, u.first_name, u.last_name, rep.role_label, sq.created_at
     ORDER BY sq.created_at DESC`,
    [userId]
  );
  return result.rows.map(normalizeQuestion);
};

const getReputation = async (userId) => {
  const rep = await ensureReputation(userId);
  return {
    roleLabel: rep.role_label,
    reputationPoints: rep.reputation_points,
    contributionScore: rep.contribution_score,
    helpfulAnswerScore: rep.helpful_answer_score,
    badges: rep.badges || []
  };
};

const findSimilarQuestions = async (userId, text, excludeId = null) => {
  const terms = slugify(text).split('-').filter((term) => term.length > 3).slice(0, 8);
  if (!terms.length) return [];
  const result = await db.query(
    `${questionSelect('$1')}
     WHERE q.status = 'published'
       AND ($2::uuid IS NULL OR q.id <> $2)
       AND (${terms.map((_, index) => `(lower(q.title || ' ' || q.body) LIKE $${index + 3})`).join(' OR ')})
     GROUP BY q.id, u.first_name, u.last_name, rep.role_label
     ORDER BY q.vote_score DESC, q.answer_count DESC
     LIMIT 5`,
    [userId, excludeId, ...terms.map((term) => `%${term}%`)]
  );
  return result.rows.map(normalizeQuestion);
};

const listModerationQueue = async () => {
  const result = await db.query(
    `SELECT l.*, q.title, u.first_name, u.last_name
     FROM qa_moderation_logs l
     LEFT JOIN qa_questions q ON q.id = l.question_id
     LEFT JOIN users u ON u.id = l.user_id
     WHERE l.action IN ('reject', 'flag')
     ORDER BY l.created_at DESC
     LIMIT 80`
  );
  return result.rows;
};

module.exports = {
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
};
