const db = require('../config/database');
const { canSendConnectionRequest } = require('../moderation/safetyService');

const normalizeConnection = (row, currentUserId) => row && ({
  id: row.id,
  requesterId: row.requester_id,
  receiverId: row.receiver_id,
  status: row.status,
  createdAt: row.created_at,
  direction: row.requester_id === currentUserId ? 'outgoing' : 'incoming',
  user: {
    id: row.other_user_id,
    displayName: `${row.first_name} ${row.last_name}`.trim()
  }
});

const listConnections = async (userId) => {
  const result = await db.query(
    `SELECT c.*,
      CASE WHEN c.requester_id = $1 THEN c.receiver_id ELSE c.requester_id END AS other_user_id,
      u.first_name, u.last_name
     FROM connections c
     JOIN users u ON u.id = CASE WHEN c.requester_id = $1 THEN c.receiver_id ELSE c.requester_id END
     WHERE (c.requester_id = $1 OR c.receiver_id = $1) AND c.status <> 'removed'
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => normalizeConnection(row, userId));
};

const requestConnection = async (requesterId, receiverId) => {
  const gate = await canSendConnectionRequest(requesterId, receiverId);
  if (!gate.allowed) return { error: gate.reason };

  const result = await db.query(
    `INSERT INTO connections (requester_id, receiver_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id))
     DO UPDATE SET
       requester_id = EXCLUDED.requester_id,
       receiver_id = EXCLUDED.receiver_id,
       status = CASE WHEN connections.status IN ('rejected', 'removed') THEN 'pending' ELSE connections.status END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [requesterId, receiverId]
  );
  return { connection: result.rows[0] };
};

const updateConnectionStatus = async (userId, connectionId, status) => {
  const result = await db.query(
    `UPDATE connections SET status = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND (requester_id = $2 OR receiver_id = $2)
       AND (
         $3 IN ('removed', 'blocked')
         OR (receiver_id = $2 AND status = 'pending' AND $3 IN ('accepted', 'rejected'))
       )
     RETURNING *`,
    [connectionId, userId, status]
  );
  return result.rows[0];
};

const listGroups = async (userId) => {
  const result = await db.query(
    `SELECT g.*,
      COUNT(gm.id)::int AS member_count,
      BOOL_OR(gm.user_id = $1) AS is_member
     FROM community_groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    category: row.category,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    memberCount: row.member_count,
    isMember: row.is_member
  }));
};

const createGroup = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO community_groups (title, description, location, category, visibility, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [payload.title, payload.description || null, payload.location || null, payload.category || 'community', payload.visibility || 'public', userId]
  );
  await db.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
    [result.rows[0].id, userId]
  );
  return result.rows[0];
};

const joinGroup = async (userId, groupId) => {
  await db.query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [groupId, userId]
  );
};

const listMeetups = async (userId) => {
  const result = await db.query(
    `SELECT m.*, u.first_name, u.last_name,
      COUNT(mp.id)::int AS participant_count,
      BOOL_OR(mp.user_id = $1) AS is_joined
     FROM meetups m
     JOIN users u ON u.id = m.organizer_id
     LEFT JOIN meetup_participants mp ON mp.meetup_id = m.id AND mp.status <> 'cancelled'
     WHERE m.meetup_time >= NOW() - interval '1 day'
     GROUP BY m.id, u.first_name, u.last_name
     ORDER BY m.meetup_time ASC
     LIMIT 50`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    organizerId: row.organizer_id,
    organizerName: `${row.first_name} ${row.last_name}`.trim(),
    title: row.title,
    description: row.description,
    meetupTime: row.meetup_time,
    approximateLocation: row.approximate_location,
    visibility: row.visibility,
    maxParticipants: row.max_participants,
    category: row.category,
    participantCount: row.participant_count,
    isJoined: row.is_joined,
    createdAt: row.created_at
  }));
};

const createMeetup = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO meetups (organizer_id, title, description, meetup_time, approximate_location, visibility, max_participants, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      payload.title,
      payload.description || null,
      payload.meetupTime,
      payload.approximateLocation,
      payload.visibility || 'nearby',
      payload.maxParticipants || null,
      payload.category || 'playdate'
    ]
  );
  await joinMeetup(userId, result.rows[0].id);
  return result.rows[0];
};

const joinMeetup = async (userId, meetupId) => {
  await db.query(
    `INSERT INTO meetup_participants (meetup_id, user_id, status)
     VALUES ($1, $2, 'going')
     ON CONFLICT (meetup_id, user_id) DO UPDATE SET status = 'going'`,
    [meetupId, userId]
  );
};

const listLostPetAlerts = async () => {
  const result = await db.query(
    `SELECT l.*, p.name AS pet_name, p.species, p.breed, p.image_url, u.first_name, u.last_name
     FROM lost_pet_alerts l
     LEFT JOIN pets p ON p.id = l.pet_id
     JOIN users u ON u.id = l.user_id
     WHERE l.status = 'active'
     ORDER BY l.created_at DESC
     LIMIT 50`
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    petName: row.pet_name,
    species: row.species,
    breed: row.breed,
    imageUrl: row.photo_url || row.image_url,
    reporterName: `${row.first_name} ${row.last_name}`.trim(),
    lastSeenArea: row.last_seen_area,
    description: row.description,
    status: row.status,
    createdAt: row.created_at
  }));
};

const createLostPetAlert = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO lost_pet_alerts (user_id, pet_id, last_seen_area, description, photo_url, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     RETURNING *`,
    [userId, payload.petId || null, payload.lastSeenArea, payload.description || null, payload.photoUrl || null]
  );
  return result.rows[0];
};

const getSocialSummary = async (userId) => {
  const [connections, meetups, alerts, messages] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM connections WHERE receiver_id = $1 AND status = 'pending'`, [userId]),
    db.query(`SELECT COUNT(*)::int AS count FROM meetups WHERE meetup_time >= NOW()`, []),
    db.query(`SELECT COUNT(*)::int AS count FROM lost_pet_alerts WHERE status = 'active'`, []),
    db.query(`SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND read_status = false`, [userId])
  ]);
  return {
    pendingRequests: connections.rows[0].count,
    upcomingMeetups: meetups.rows[0].count,
    activeLostPetAlerts: alerts.rows[0].count,
    unreadMessages: messages.rows[0].count
  };
};

module.exports = {
  createGroup,
  createLostPetAlert,
  createMeetup,
  getSocialSummary,
  joinGroup,
  joinMeetup,
  listConnections,
  listGroups,
  listLostPetAlerts,
  listMeetups,
  requestConnection,
  updateConnectionStatus
};
