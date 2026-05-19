const db = require('../config/database');
const { canSendMessage } = require('../moderation/safetyService');

const normalizeMessage = (row) => row && ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  message: row.message,
  imageUrl: row.image_url,
  readStatus: row.read_status,
  createdAt: row.created_at
});

const listConversations = async (userId) => {
  const result = await db.query(
    `WITH accepted_connections AS (
      SELECT
        c.id AS connection_id,
        CASE WHEN c.requester_id = $1 THEN c.receiver_id ELSE c.requester_id END AS other_user_id,
        c.updated_at AS connected_at
      FROM connections c
      WHERE (c.requester_id = $1 OR c.receiver_id = $1) AND c.status = 'accepted'
    ),
    latest AS (
      SELECT DISTINCT ON (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
        id, sender_id, receiver_id, message, image_url, read_status, created_at,
        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC
    )
    SELECT
      ac.connection_id,
      ac.other_user_id,
      latest.id,
      latest.sender_id,
      latest.receiver_id,
      latest.message,
      latest.image_url,
      latest.read_status,
      latest.created_at,
      u.first_name,
      u.last_name,
      COUNT(unread.id)::int AS unread_count
    FROM accepted_connections ac
    JOIN users u ON u.id = ac.other_user_id
    LEFT JOIN latest ON latest.other_user_id = ac.other_user_id
    LEFT JOIN messages unread ON unread.sender_id = ac.other_user_id AND unread.receiver_id = $1 AND unread.read_status = false
    GROUP BY ac.connection_id, ac.other_user_id, ac.connected_at, latest.id, latest.sender_id, latest.receiver_id,
      latest.message, latest.image_url, latest.read_status, latest.created_at, u.first_name, u.last_name
    ORDER BY COALESCE(latest.created_at, ac.connected_at) DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    userId: row.other_user_id,
    displayName: `${row.first_name} ${row.last_name}`.trim(),
    unreadCount: row.unread_count,
    lastMessage: row.id ? normalizeMessage(row) : null
  }));
};

const listMessages = async (userId, otherUserId) => {
  await db.query(
    `UPDATE messages SET read_status = true
     WHERE sender_id = $2 AND receiver_id = $1 AND read_status = false`,
    [userId, otherUserId]
  );
  const result = await db.query(
    `SELECT * FROM messages
     WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
     ORDER BY created_at ASC
     LIMIT 100`,
    [userId, otherUserId]
  );
  return result.rows.map(normalizeMessage);
};

const sendMessage = async (senderId, receiverId, payload) => {
  const gate = await canSendMessage(senderId, receiverId);
  if (!gate.allowed) return { error: gate.reason };

  const result = await db.query(
    `INSERT INTO messages (sender_id, receiver_id, message, image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [senderId, receiverId, payload.message, payload.imageUrl || null]
  );
  return { message: normalizeMessage(result.rows[0]) };
};

module.exports = {
  listConversations,
  listMessages,
  sendMessage
};
