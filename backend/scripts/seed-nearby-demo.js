const bcrypt = require('bcryptjs');
const db = require('../config/database');

const TEST_USER_EMAIL = process.env.SEED_NEARBY_BASE_EMAIL || 'test1@gmail.com';
const DEMO_USER_EMAIL = process.env.SEED_NEARBY_DEMO_EMAIL || 'nearby.bruno@example.com';
const REQUEST_DEMO_EMAIL = process.env.SEED_NEARBY_REQUEST_EMAIL || 'nearby.luna@example.com';

async function seedNearbyDemoUser() {
  const baseResult = await db.query(
    `SELECT u.id, ul.latitude::float AS latitude, ul.longitude::float AS longitude, ul.area_label
     FROM users u
     JOIN user_locations ul ON ul.user_id = u.id
     WHERE u.email = $1`,
    [TEST_USER_EMAIL]
  );

  const base = baseResult.rows[0];
  if (!base) {
    throw new Error(`No saved location found for ${TEST_USER_EMAIL}`);
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);
  const userResult = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name
     RETURNING id, email, first_name, last_name`,
    [DEMO_USER_EMAIL, passwordHash, 'Aarav', 'Kapoor']
  );

  const demoUser = userResult.rows[0];
  await db.query(
    `INSERT INTO user_locations (
       user_id, latitude, longitude, area_label, visibility_mode, visibility_radius_km,
       is_visible, pets_visible, messages_allowed, connection_requests_allowed,
       manual_location, location_updated_at
     ) VALUES ($1, $2, $3, $4, 'nearby', 10, true, true, true, true, true, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       area_label = EXCLUDED.area_label,
       visibility_mode = 'nearby',
       visibility_radius_km = 10,
       is_visible = true,
       pets_visible = true,
       messages_allowed = true,
       connection_requests_allowed = true,
       location_updated_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [
      demoUser.id,
      base.latitude + 0.008,
      base.longitude + 0.006,
      `${base.area_label || 'Saved area'} nearby`
    ]
  );

  await db.query(
    `INSERT INTO pets (
       user_id, name, species, breed, age_years, gender, weight_kg,
       activity_level, neutered_spayed, confirmed_breed, image_url
     )
     SELECT $1, 'Bruno', 'dog', 'Golden Retriever', 3, 'male', 28,
       'high', true, 'Golden Retriever', NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM pets WHERE user_id = $1 AND name = 'Bruno'
     )`,
    [demoUser.id]
  );

  const requestUserResult = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name
     RETURNING id, email, first_name, last_name`,
    [REQUEST_DEMO_EMAIL, passwordHash, 'Meera', 'Shah']
  );

  const requestDemoUser = requestUserResult.rows[0];
  await db.query(
    `INSERT INTO user_locations (
       user_id, latitude, longitude, area_label, visibility_mode, visibility_radius_km,
       is_visible, pets_visible, messages_allowed, connection_requests_allowed,
       manual_location, location_updated_at
     ) VALUES ($1, $2, $3, $4, 'nearby', 10, true, true, true, true, true, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       area_label = EXCLUDED.area_label,
       visibility_mode = 'nearby',
       visibility_radius_km = 10,
       is_visible = true,
       pets_visible = true,
       messages_allowed = true,
       connection_requests_allowed = true,
       location_updated_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [
      requestDemoUser.id,
      base.latitude + 0.014,
      base.longitude - 0.004,
      `${base.area_label || 'Saved area'} nearby`
    ]
  );

  await db.query(
    `INSERT INTO pets (
       user_id, name, species, breed, age_years, gender, weight_kg,
       activity_level, neutered_spayed, confirmed_breed, image_url
     )
     SELECT $1, 'Luna', 'cat', 'Indian Shorthair', 2, 'female', 4.5,
       'moderate', true, 'Indian Shorthair', NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM pets WHERE user_id = $1 AND name = 'Luna'
     )`,
    [requestDemoUser.id]
  );

  await db.query(
    `DELETE FROM connections
     WHERE status <> 'accepted'
       AND (requester_id = $1 OR receiver_id = $1)`,
    [requestDemoUser.id]
  );

  return {
    baseUser: TEST_USER_EMAIL,
    demoUser,
    requestDemoUser,
    approximateDistance: '~1 km away',
    pets: ['Bruno, Golden Retriever', 'Luna, Indian Shorthair']
  };
}

seedNearbyDemoUser()
  .then(async (result) => {
    console.log(JSON.stringify(result, null, 2));
    await db.pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await db.pool.end();
    process.exit(1);
  });
