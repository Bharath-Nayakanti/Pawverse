const db = require('../config/database');

const EARTH_RADIUS_KM = 6371;
const PRIVACY_DISTANCE_PRECISION_KM = 0.5;

const toRadians = (degrees) => (Number(degrees) * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const approximateDistance = (distanceKm) => {
  if (distanceKm < 1) return '<1 km away';
  const rounded = Math.max(1, Math.round(distanceKm / PRIVACY_DISTANCE_PRECISION_KM) * PRIVACY_DISTANCE_PRECISION_KM);
  return `~${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} km away`;
};

const normalizeVisibility = (row) => row && ({
  id: row.id,
  userId: row.user_id,
  areaLabel: row.area_label || 'Nearby area',
  visibilityMode: row.visibility_mode,
  visibilityRadiusKm: Number(row.visibility_radius_km),
  isVisible: row.is_visible,
  petsVisible: row.pets_visible,
  messagesAllowed: row.messages_allowed,
  connectionRequestsAllowed: row.connection_requests_allowed,
  manualLocation: row.manual_location,
  locationUpdatedAt: row.location_updated_at
});

const getUserLocation = async (userId, includePrivate = false) => {
  const result = await db.query('SELECT * FROM user_locations WHERE user_id = $1', [userId]);
  const row = result.rows[0];
  if (!row) return null;
  const publicShape = normalizeVisibility(row);
  if (!includePrivate) return publicShape;
  return {
    ...publicShape,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  };
};

const upsertUserLocation = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO user_locations (
      user_id, latitude, longitude, area_label, visibility_mode, visibility_radius_km,
      is_visible, pets_visible, messages_allowed, connection_requests_allowed, manual_location, location_updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      area_label = EXCLUDED.area_label,
      visibility_mode = EXCLUDED.visibility_mode,
      visibility_radius_km = EXCLUDED.visibility_radius_km,
      is_visible = EXCLUDED.is_visible,
      pets_visible = EXCLUDED.pets_visible,
      messages_allowed = EXCLUDED.messages_allowed,
      connection_requests_allowed = EXCLUDED.connection_requests_allowed,
      manual_location = EXCLUDED.manual_location,
      location_updated_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      userId,
      payload.latitude,
      payload.longitude,
      payload.areaLabel || null,
      payload.visibilityMode || 'nearby',
      payload.visibilityRadiusKm || 10,
      payload.isVisible ?? true,
      payload.petsVisible ?? true,
      payload.messagesAllowed ?? true,
      payload.connectionRequestsAllowed ?? true,
      payload.manualLocation ?? false
    ]
  );
  return normalizeVisibility(result.rows[0]);
};

const discoverNearbyProfiles = async (userId, filters = {}) => {
  const ownLocation = await getUserLocation(userId, true);
  if (!ownLocation || !ownLocation.isVisible || ownLocation.visibilityMode === 'invisible') {
    return [];
  }

  const radiusKm = Math.min(Number(filters.radiusKm || ownLocation.visibilityRadiusKm || 10), 100);
  const result = await db.query(
    `SELECT
      u.id AS user_id,
      u.first_name,
      u.last_name,
      ul.latitude,
      ul.longitude,
      ul.area_label,
      ul.visibility_mode,
      ul.visibility_radius_km,
      ul.pets_visible,
      ul.messages_allowed,
      ul.connection_requests_allowed,
      c.id AS connection_id,
      c.status AS connection_status,
      CASE
        WHEN c.requester_id = $1 THEN 'outgoing'
        WHEN c.receiver_id = $1 THEN 'incoming'
        ELSE NULL
      END AS connection_direction,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'species', p.species,
            'breed', COALESCE(p.confirmed_breed, p.breed, p.predicted_breed),
            'ageYears', p.age_years,
            'activityLevel', p.activity_level,
            'imageUrl', p.image_url,
            'vaccinationStatus', CASE WHEN EXISTS (
              SELECT 1 FROM vaccine_records vr WHERE vr.pet_id = p.id AND vr.status IN ('completed', 'scheduled')
            ) THEN 'tracked' ELSE 'unknown' END
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
      ) AS pets
    FROM user_locations ul
    JOIN users u ON u.id = ul.user_id
    LEFT JOIN connections c ON (
      ((c.requester_id = $1 AND c.receiver_id = ul.user_id) OR (c.requester_id = ul.user_id AND c.receiver_id = $1))
      AND c.status <> 'removed'
    )
    LEFT JOIN pets p ON p.user_id = u.id AND ul.pets_visible = true
    WHERE ul.user_id <> $1
      AND ul.is_visible = true
      AND ul.visibility_mode IN ('nearby', 'pet_only', 'hidden_location')
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = $1 AND b.blocked_id = ul.user_id)
           OR (b.blocker_id = ul.user_id AND b.blocked_id = $1)
      )
    GROUP BY u.id, u.first_name, u.last_name, ul.latitude, ul.longitude, ul.area_label,
      ul.visibility_mode, ul.visibility_radius_km, ul.pets_visible, ul.messages_allowed,
      ul.connection_requests_allowed, c.id, c.status, c.requester_id, c.receiver_id`,
    [userId]
  );

  return result.rows
    .map((row) => {
      const distanceKm = haversineKm(ownLocation.latitude, ownLocation.longitude, row.latitude, row.longitude);
      return {
        userId: row.user_id,
        displayName: row.visibility_mode === 'pet_only' ? 'Nearby pet owner' : `${row.first_name} ${row.last_name?.[0] || ''}.`.trim(),
        areaLabel: row.visibility_mode === 'hidden_location' ? 'Approximate nearby area' : (row.area_label || 'Nearby area'),
        distanceKm,
        approximateDistance: approximateDistance(distanceKm),
        messagesAllowed: row.messages_allowed,
        connectionRequestsAllowed: row.connection_requests_allowed,
        connection: row.connection_id ? {
          id: row.connection_id,
          status: row.connection_status,
          direction: row.connection_direction
        } : null,
        pets: (row.pets || []).filter((pet) => {
          if (filters.species && pet.species !== filters.species) return false;
          if (filters.breed && !String(pet.breed || '').toLowerCase().includes(String(filters.breed).toLowerCase())) return false;
          if (filters.activityLevel && pet.activityLevel !== filters.activityLevel) return false;
          if (filters.ageGroup === 'young' && Number(pet.ageYears || 0) > 3) return false;
          if (filters.ageGroup === 'adult' && (Number(pet.ageYears || 0) <= 3 || Number(pet.ageYears || 0) > 8)) return false;
          if (filters.ageGroup === 'senior' && Number(pet.ageYears || 0) <= 8) return false;
          return true;
        })
      };
    })
    .filter((profile) => profile.distanceKm <= radiusKm && (!filters.species || profile.pets.length))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50)
    .map(({ distanceKm, ...profile }) => profile);
};

module.exports = {
  approximateDistance,
  discoverNearbyProfiles,
  getUserLocation,
  haversineKm,
  upsertUserLocation
};
