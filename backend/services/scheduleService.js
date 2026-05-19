const db = require('../config/database');
const { generateOccurrences } = require('../engines/schedulerEngine');
const { getPet } = require('./petCareStore');

const serialize = (value, fallback) => JSON.stringify(value ?? fallback);

const createTaskLog = async ({ petId, occurrenceId = null, action, notes = null, metadata = {} }) => {
  const result = await db.query(
    `INSERT INTO task_logs (pet_id, occurrence_id, action, notes, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [petId, occurrenceId, action, notes, serialize(metadata, {})]
  );
  return result.rows[0];
};

const createScheduleTemplate = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;

  const existing = await db.query(
    `SELECT st.* FROM schedule_templates st
     JOIN pets p ON p.id = st.pet_id
     WHERE p.user_id = $1
       AND st.pet_id = $2
       AND st.type = $3
       AND lower(st.title) = lower($4)
       AND st.is_active = true
     ORDER BY st.created_at DESC
     LIMIT 1`,
    [userId, payload.petId, payload.type, payload.title]
  );

  if (existing.rows[0]) return existing.rows[0];

  const result = await db.query(
    `INSERT INTO schedule_templates (
      pet_id, type, title, description, recurrence_rule, preferred_times,
      start_date, end_date, timezone, metadata
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10::jsonb)
    RETURNING *`,
    [
      payload.petId,
      payload.type,
      payload.title,
      payload.description || null,
      serialize(payload.recurrenceRule || payload.recurrence_rule, { frequency: 'none', interval: 1 }),
      serialize(payload.preferredTimes || payload.preferred_times, []),
      payload.startDate || payload.start_date || new Date().toISOString().slice(0, 10),
      payload.endDate || payload.end_date || null,
      payload.timezone || 'UTC',
      serialize(payload.metadata, {})
    ]
  );

  return result.rows[0];
};

const listScheduleTemplates = async (userId, petId) => {
  const result = await db.query(
    `SELECT st.* FROM schedule_templates st
     JOIN pets p ON p.id = st.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY st.created_at DESC`,
    [userId, petId || null]
  );
  return result.rows;
};

const upsertOccurrence = async (template, dueAt) => {
  const dueAtIso = dueAt.toISOString();
  const rescheduled = await db.query(
    `SELECT *
     FROM reminder_occurrences
     WHERE schedule_template_id = $1
       AND metadata ? 'rescheduledFrom'
       AND (metadata->>'rescheduledFrom')::timestamptz = $2::timestamptz
     ORDER BY updated_at DESC
     LIMIT 1`,
    [template.id, dueAtIso]
  );

  if (rescheduled.rows[0]) return rescheduled.rows[0];

  const result = await db.query(
    `INSERT INTO reminder_occurrences (schedule_template_id, pet_id, due_at, status, metadata)
     VALUES ($1, $2, $3, 'pending', $4::jsonb)
     ON CONFLICT (schedule_template_id, due_at) DO UPDATE
       SET metadata = reminder_occurrences.metadata
     RETURNING *`,
    [template.id, template.pet_id, dueAtIso, serialize(template.metadata, {})]
  );
  return result.rows[0];
};

const generateOccurrencesForTemplate = async (userId, templateId, options = {}) => {
  const result = await db.query(
    `SELECT st.* FROM schedule_templates st
     JOIN pets p ON p.id = st.pet_id
     WHERE p.user_id = $1 AND st.id = $2 AND st.is_active = true`,
    [userId, templateId]
  );
  const template = result.rows[0];
  if (!template) return null;

  const dueDates = generateOccurrences(template, options);
  const occurrences = [];
  for (const dueAt of dueDates) {
    occurrences.push(await upsertOccurrence(template, dueAt));
  }
  return occurrences;
};

const generateOccurrencesForUser = async (userId, { petId = null, horizonDays = 45 } = {}) => {
  const templates = await listScheduleTemplates(userId, petId);
  const activeTemplates = templates.filter((template) => template.is_active);
  const occurrences = [];

  for (const template of activeTemplates) {
    const dueDates = generateOccurrences(template, { horizonDays });
    for (const dueAt of dueDates) {
      occurrences.push(await upsertOccurrence(template, dueAt));
    }
  }

  return occurrences.sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
};

const listReminderOccurrences = async (userId, { petId = null, status = null } = {}) => {
  await markOverdueOccurrences(userId);
  const result = await db.query(
    `WITH ranked_reminders AS (
       SELECT
         ro.*,
         st.type,
         st.title,
         st.description,
         st.recurrence_rule,
         st.preferred_times,
         st.start_date AS schedule_start_date,
         st.timezone,
         CASE
           WHEN st.type = 'vaccine' THEN row_number() OVER (
             PARTITION BY ro.schedule_template_id
             ORDER BY
               CASE WHEN ro.status IN ('pending', 'overdue', 'snoozed') THEN 0 ELSE 1 END,
               CASE WHEN ro.due_at::date = st.start_date THEN 0 ELSE 1 END,
               CASE WHEN ro.metadata ? 'rescheduledFrom' THEN 0 ELSE 1 END,
               ro.updated_at DESC,
               ro.due_at ASC
           )
           ELSE 1
         END AS visible_rank
       FROM reminder_occurrences ro
       LEFT JOIN schedule_templates st ON st.id = ro.schedule_template_id
       JOIN pets p ON p.id = ro.pet_id
       WHERE p.user_id = $1
         AND ($2::uuid IS NULL OR p.id = $2)
         AND ($3::text IS NULL OR ro.status = $3)
     )
     SELECT *
     FROM ranked_reminders
     WHERE type <> 'vaccine' OR visible_rank = 1
     ORDER BY COALESCE(snoozed_until, due_at) ASC`,
    [userId, petId, status]
  );
  return result.rows;
};

const getOccurrenceForUser = async (userId, occurrenceId) => {
  const result = await db.query(
    `SELECT ro.*, st.type, st.title, st.description, st.recurrence_rule, st.preferred_times, st.start_date AS schedule_start_date, st.timezone
     FROM reminder_occurrences ro
     LEFT JOIN schedule_templates st ON st.id = ro.schedule_template_id
     JOIN pets p ON p.id = ro.pet_id
     WHERE p.user_id = $1 AND ro.id = $2`,
    [userId, occurrenceId]
  );
  return result.rows[0];
};

const updateOccurrenceLifecycle = async (userId, occurrenceId, action, payload = {}) => {
  const occurrence = await getOccurrenceForUser(userId, occurrenceId);
  if (!occurrence) return null;

  const transitions = {
    complete: {
      status: 'completed',
      set: 'completed_at = CURRENT_TIMESTAMP, skipped_at = NULL, snoozed_until = NULL',
      log: 'completed'
    },
    skip: {
      status: 'skipped',
      set: 'skipped_at = CURRENT_TIMESTAMP, snoozed_until = NULL',
      log: 'skipped'
    },
    snooze: {
      status: 'snoozed',
      set: 'snoozed_until = $4',
      extra: payload.snoozedUntil,
      log: 'snoozed'
    },
    reschedule: {
      status: 'pending',
      set: `due_at = $4,
            snoozed_until = NULL,
            metadata = COALESCE(ro.metadata, '{}'::jsonb) || jsonb_build_object(
              'rescheduledFrom',
              COALESCE(ro.metadata->>'rescheduledFrom', ro.due_at::text)
            )`,
      extra: payload.dueAt,
      log: 'rescheduled'
    }
  };

  const transition = transitions[action];
  if (!transition) throw new Error('Unsupported lifecycle action');
  if ((action === 'snooze' && !payload.snoozedUntil) || (action === 'reschedule' && !payload.dueAt)) {
    throw new Error(`${action} requires a target date`);
  }

  const params = [userId, occurrenceId, transition.status];
  if (transition.extra) params.push(transition.extra);

  if (action === 'reschedule' && occurrence.schedule_template_id) {
    await db.query(
      `DELETE FROM reminder_occurrences
       WHERE schedule_template_id = $1
         AND id <> $2
         AND due_at = $3::timestamptz
         AND status IN ('pending', 'overdue', 'snoozed')`,
      [occurrence.schedule_template_id, occurrenceId, payload.dueAt]
    );
  }

  const result = await db.query(
    `UPDATE reminder_occurrences ro
     SET status = $3, ${transition.set}
     FROM pets p
     WHERE p.id = ro.pet_id AND p.user_id = $1 AND ro.id = $2
     RETURNING ro.*`,
    params
  );

  await createTaskLog({
    petId: occurrence.pet_id,
    occurrenceId,
    action: transition.log,
    notes: payload.notes,
    metadata: { type: occurrence.type, previousDueAt: occurrence.due_at, ...payload.metadata }
  });

  if (action === 'reschedule' && occurrence.type === 'vaccine' && occurrence.schedule_template_id) {
    await db.query(
      `UPDATE schedule_templates
       SET start_date = $2::date
       WHERE id = $1`,
      [occurrence.schedule_template_id, payload.dueAt]
    );

    await db.query(
      `DELETE FROM reminder_occurrences
       WHERE schedule_template_id = $1
         AND id <> $2
         AND status IN ('pending', 'overdue', 'snoozed')`,
      [occurrence.schedule_template_id, occurrenceId]
    );
  }

  if ((action === 'complete' || action === 'skip') && occurrence.type !== 'vaccine' && occurrence.schedule_template_id) {
    await generateOccurrencesForTemplate(userId, occurrence.schedule_template_id, { horizonDays: 60 });
  }

  return result.rows[0];
};

const markOverdueOccurrences = async (userId = null) => {
  const result = await db.query(
    `UPDATE reminder_occurrences ro
     SET status = 'overdue'
     FROM pets p
     WHERE p.id = ro.pet_id
       AND (
         (ro.status = 'pending' AND ro.due_at < CURRENT_TIMESTAMP)
         OR (ro.status = 'snoozed' AND ro.snoozed_until < CURRENT_TIMESTAMP)
       )
       AND ($1::uuid IS NULL OR p.user_id = $1)
     RETURNING ro.*`,
    [userId]
  );

  for (const occurrence of result.rows) {
    await createTaskLog({
      petId: occurrence.pet_id,
      occurrenceId: occurrence.id,
      action: 'missed',
      metadata: { automated: true }
    });
  }

  return result.rows;
};

const listTaskLogs = async (userId, petId) => {
  const result = await db.query(
    `SELECT tl.* FROM task_logs tl
     JOIN pets p ON p.id = tl.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY tl.created_at DESC`,
    [userId, petId || null]
  );
  return result.rows;
};

module.exports = {
  createScheduleTemplate,
  createTaskLog,
  generateOccurrencesForTemplate,
  generateOccurrencesForUser,
  listReminderOccurrences,
  listScheduleTemplates,
  listTaskLogs,
  markOverdueOccurrences,
  updateOccurrenceLifecycle
};
