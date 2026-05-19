const db = require('../config/database');

const SPAM_WINDOW_MINUTES = 10;
const MESSAGE_LIMIT = 30;
const REQUEST_LIMIT = 20;

const assertNotBlocked = async (userId, otherUserId) => {
  const result = await db.query(
    `SELECT id FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userId, otherUserId]
  );
  return !result.rows.length;
};

const canSendMessage = async (senderId, receiverId) => {
  const [blockResult, connectionResult, preferenceResult, recentResult] = await Promise.all([
    db.query(
      `SELECT id FROM user_blocks
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1`,
      [senderId, receiverId]
    ),
    db.query(
      `SELECT id FROM connections
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1))
       LIMIT 1`,
      [senderId, receiverId]
    ),
    db.query(`SELECT messages_allowed FROM user_locations WHERE user_id = $1`, [receiverId]),
    db.query(
      `SELECT COUNT(*)::int AS sent_count FROM messages
       WHERE sender_id = $1 AND created_at > NOW() - ($2 || ' minutes')::interval`,
      [senderId, SPAM_WINDOW_MINUTES]
    )
  ]);

  if (blockResult.rows.length) return { allowed: false, reason: 'Messaging is unavailable for this connection.' };
  if (!connectionResult.rows.length) return { allowed: false, reason: 'You can message connected users only.' };
  if (preferenceResult.rows[0]?.messages_allowed === false) return { allowed: false, reason: 'This user is not accepting messages.' };
  if (recentResult.rows[0]?.sent_count >= MESSAGE_LIMIT) return { allowed: false, reason: 'Message limit reached. Please slow down and try again soon.' };
  return { allowed: true };
};

const canSendConnectionRequest = async (requesterId, receiverId) => {
  const [blockResult, preferenceResult, recentResult] = await Promise.all([
    db.query(
      `SELECT id FROM user_blocks
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1`,
      [requesterId, receiverId]
    ),
    db.query(`SELECT connection_requests_allowed FROM user_locations WHERE user_id = $1`, [receiverId]),
    db.query(
      `SELECT COUNT(*)::int AS sent_count FROM connections
       WHERE requester_id = $1 AND created_at > NOW() - ($2 || ' minutes')::interval`,
      [requesterId, SPAM_WINDOW_MINUTES]
    )
  ]);

  if (blockResult.rows.length) return { allowed: false, reason: 'Connection request is unavailable.' };
  if (preferenceResult.rows[0]?.connection_requests_allowed === false) return { allowed: false, reason: 'This user is not accepting connection requests.' };
  if (recentResult.rows[0]?.sent_count >= REQUEST_LIMIT) return { allowed: false, reason: 'Connection request limit reached. Please try later.' };
  return { allowed: true };
};

const blockUser = async (blockerId, blockedId, reason) => {
  await db.query(
    `INSERT INTO user_blocks (blocker_id, blocked_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET reason = EXCLUDED.reason`,
    [blockerId, blockedId, reason || null]
  );
  await db.query(
    `UPDATE connections SET status = 'blocked'
     WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
    [blockerId, blockedId]
  );
};

const reportUser = async (reporterId, payload) => {
  const result = await db.query(
    `INSERT INTO user_reports (reporter_id, reported_user_id, target_type, target_id, reason, details)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      reporterId,
      payload.reportedUserId || null,
      payload.targetType || 'user',
      payload.targetId || null,
      payload.reason,
      payload.details || null
    ]
  );
  return result.rows[0];
};

module.exports = {
  assertNotBlocked,
  blockUser,
  canSendConnectionRequest,
  canSendMessage,
  reportUser
};
