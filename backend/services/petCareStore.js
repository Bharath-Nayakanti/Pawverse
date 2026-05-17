const db = require('../config/database');

const mapPetPayload = (payload) => ({
  name: payload.name,
  species: payload.species,
  breed: payload.breed || null,
  date_of_birth: payload.dateOfBirth || null,
  age_years: payload.ageYears ?? null,
  gender: payload.gender || 'unknown',
  weight_kg: payload.weightKg ?? null,
  allergies: JSON.stringify(payload.allergies || []),
  medical_conditions: JSON.stringify(payload.medicalConditions || []),
  activity_level: payload.activityLevel || 'moderate',
  neutered_spayed: payload.neuteredSpayed || false,
  image_url: payload.imageUrl || null,
  predicted_breed: payload.predictedBreed || null,
  confirmed_breed: payload.confirmedBreed || payload.breed || null,
  breed_confidence: payload.breedConfidence ?? null
});

const normalizePet = (row) => row && ({
  ...row,
  allergies: row.allergies || [],
  medicalConditions: row.medical_conditions || [],
  dateOfBirth: row.date_of_birth,
  ageYears: row.age_years,
  weightKg: row.weight_kg,
  activityLevel: row.activity_level,
  neuteredSpayed: row.neutered_spayed,
  imageUrl: row.image_url,
  predictedBreed: row.predicted_breed,
  confirmedBreed: row.confirmed_breed,
  breedConfidence: row.breed_confidence
});

const listPets = async (userId) => {
  const result = await db.query(
    `SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(normalizePet);
};

const getPet = async (userId, petId) => {
  const result = await db.query(
    `SELECT * FROM pets WHERE user_id = $1 AND id = $2`,
    [userId, petId]
  );
  return normalizePet(result.rows[0]);
};

const createPet = async (userId, payload) => {
  const pet = mapPetPayload(payload);
  const result = await db.query(
    `INSERT INTO pets (
      user_id, name, species, breed, date_of_birth, age_years, gender, weight_kg,
      allergies, medical_conditions, activity_level, neutered_spayed, image_url,
      predicted_breed, confirmed_breed, breed_confidence
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16
    )
    RETURNING *`,
    [
      userId, pet.name, pet.species, pet.breed, pet.date_of_birth, pet.age_years, pet.gender,
      pet.weight_kg, pet.allergies, pet.medical_conditions, pet.activity_level,
      pet.neutered_spayed, pet.image_url, pet.predicted_breed, pet.confirmed_breed,
      pet.breed_confidence
    ]
  );
  return normalizePet(result.rows[0]);
};

const updatePet = async (userId, petId, payload) => {
  const pet = mapPetPayload(payload);
  const result = await db.query(
    `UPDATE pets SET
      name = $3, species = $4, breed = $5, date_of_birth = $6, age_years = $7,
      gender = $8, weight_kg = $9, allergies = $10::jsonb, medical_conditions = $11::jsonb,
      activity_level = $12, neutered_spayed = $13, image_url = $14,
      predicted_breed = $15, confirmed_breed = $16, breed_confidence = $17,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND id = $2
    RETURNING *`,
    [
      userId, petId, pet.name, pet.species, pet.breed, pet.date_of_birth, pet.age_years,
      pet.gender, pet.weight_kg, pet.allergies, pet.medical_conditions, pet.activity_level,
      pet.neutered_spayed, pet.image_url, pet.predicted_breed, pet.confirmed_breed,
      pet.breed_confidence
    ]
  );
  return normalizePet(result.rows[0]);
};

const deletePet = async (userId, petId) => {
  await db.query(`DELETE FROM pets WHERE user_id = $1 AND id = $2`, [userId, petId]);
};

const addPetImage = async (userId, petId, payload) => {
  const pet = await getPet(userId, petId);
  if (!pet) return null;

  const result = await db.query(
    `INSERT INTO pet_images (
      pet_id, image_url, predicted_species, predicted_breed, confirmed_breed, confidence, is_primary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      petId, payload.imageUrl, payload.predictedSpecies, payload.predictedBreed,
      payload.confirmedBreed, payload.confidence, payload.isPrimary
    ]
  );

  if (payload.isPrimary) {
    await db.query(
      `UPDATE pets SET image_url = $3, predicted_breed = COALESCE($4, predicted_breed),
       confirmed_breed = COALESCE($5, confirmed_breed), breed_confidence = COALESCE($6, breed_confidence)
       WHERE user_id = $1 AND id = $2`,
      [userId, petId, payload.imageUrl, payload.predictedBreed, payload.confirmedBreed, payload.confidence]
    );
  }

  return result.rows[0];
};

const listPetImages = async (userId, petId) => {
  const pet = await getPet(userId, petId);
  if (!pet) return null;
  const result = await db.query(`SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY created_at DESC`, [petId]);
  return result.rows;
};

const insertReminder = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  const result = await db.query(
    `INSERT INTO reminders (pet_id, type, title, description, due_at, recurrence, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *`,
    [
      payload.petId, payload.type, payload.title, payload.description, payload.dueAt,
      payload.recurrence, payload.status, JSON.stringify(payload.metadata || {})
    ]
  );
  return result.rows[0];
};

const listReminders = async (userId, petId) => {
  const values = [userId];
  const petFilter = petId ? 'AND p.id = $2' : '';
  if (petId) values.push(petId);
  const result = await db.query(
    `SELECT r.* FROM reminders r
     JOIN pets p ON p.id = r.pet_id
     WHERE p.user_id = $1 ${petFilter}
     ORDER BY r.due_at ASC`,
    values
  );
  return result.rows;
};

const updateReminderStatus = async (userId, reminderId, status) => {
  const result = await db.query(
    `UPDATE reminders r SET status = $3, completed_at = CASE WHEN $3 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
     FROM pets p
     WHERE p.id = r.pet_id AND p.user_id = $1 AND r.id = $2
     RETURNING r.*`,
    [userId, reminderId, status]
  );
  return result.rows[0];
};

const insertVaccineRecord = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  const result = await db.query(
    `INSERT INTO vaccine_records (pet_id, vaccine_name, status, administered_at, due_at, next_booster_at, provider, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.petId, payload.vaccineName, payload.status, payload.administeredAt,
      payload.dueAt, payload.nextBoosterAt, payload.provider, payload.notes
    ]
  );
  return result.rows[0];
};

const listVaccineRecords = async (userId, petId) => {
  const result = await db.query(
    `SELECT v.* FROM vaccine_records v
     JOIN pets p ON p.id = v.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY COALESCE(v.due_at, v.administered_at, v.created_at) ASC`,
    [userId, petId || null]
  );
  return result.rows;
};

const upsertFeedingPlan = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  if (payload.isActive) {
    await db.query(`UPDATE feeding_plans SET is_active = false WHERE pet_id = $1`, [payload.petId]);
    await db.query(`UPDATE feeding_preferences SET is_active = false WHERE pet_id = $1`, [payload.petId]);
  }
  await db.query(
    `INSERT INTO feeding_preferences (
      pet_id, calories_per_day, meals_per_day, feeding_times, diet_type, hydration_goal, metadata, is_active
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8)`,
    [
      payload.petId,
      payload.caloriesPerDay,
      payload.mealsPerDay,
      JSON.stringify(payload.feedingTimes || payload.feeding_times || []),
      payload.dietType || null,
      payload.hydrationGoalMl || payload.hydrationGoal || null,
      JSON.stringify({ quantityPerMeal: payload.quantityPerMeal, foodSuggestions: payload.foodSuggestions || [] }),
      payload.isActive
    ]
  );
  const result = await db.query(
    `INSERT INTO feeding_plans (pet_id, calories_per_day, meals_per_day, quantity_per_meal, hydration_goal_ml, food_suggestions, notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      payload.petId, payload.caloriesPerDay, payload.mealsPerDay, payload.quantityPerMeal,
      payload.hydrationGoalMl, JSON.stringify(payload.foodSuggestions || []), payload.notes, payload.isActive
    ]
  );
  return result.rows[0];
};

const insertVaccinationRecord = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  const result = await db.query(
    `INSERT INTO vaccination_records (pet_id, vaccine_name, administered_at, next_due_at, veterinarian, notes, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      payload.petId,
      payload.vaccineName,
      payload.administeredAt || null,
      payload.nextDueAt || payload.dueAt || null,
      payload.veterinarian || payload.provider || null,
      payload.notes || null,
      JSON.stringify(payload.metadata || {})
    ]
  );
  return result.rows[0];
};

const listVaccinationRecords = async (userId, petId) => {
  const result = await db.query(
    `SELECT vr.* FROM vaccination_records vr
     JOIN pets p ON p.id = vr.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY COALESCE(vr.next_due_at, vr.administered_at, vr.created_at) ASC`,
    [userId, petId || null]
  );
  return result.rows;
};

const listFeedingPreferences = async (userId, petId) => {
  const result = await db.query(
    `SELECT fp.* FROM feeding_preferences fp
     JOIN pets p ON p.id = fp.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY fp.created_at DESC`,
    [userId, petId || null]
  );
  return result.rows;
};

const listFeedingPlans = async (userId, petId) => {
  const result = await db.query(
    `SELECT f.* FROM feeding_plans f
     JOIN pets p ON p.id = f.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY f.created_at DESC`,
    [userId, petId || null]
  );
  return result.rows;
};

const insertHealthRecord = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  const result = await db.query(
    `INSERT INTO health_records (pet_id, type, title, description, occurred_at, severity, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      payload.petId, payload.type, payload.title, payload.description,
      payload.occurredAt, payload.severity, JSON.stringify(payload.metadata || {})
    ]
  );
  return result.rows[0];
};

const listHealthRecords = async (userId, petId) => {
  const result = await db.query(
    `SELECT h.* FROM health_records h
     JOIN pets p ON p.id = h.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY h.occurred_at DESC`,
    [userId, petId || null]
  );
  return result.rows;
};

const insertAppointment = async (userId, payload) => {
  const pet = await getPet(userId, payload.petId);
  if (!pet) return null;
  const result = await db.query(
    `INSERT INTO appointments (pet_id, vet_name, clinic_name, reason, scheduled_at, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [payload.petId, payload.vetName, payload.clinicName, payload.reason, payload.scheduledAt, payload.status, payload.notes]
  );
  return result.rows[0];
};

const listAppointments = async (userId, petId) => {
  const result = await db.query(
    `SELECT a.* FROM appointments a
     JOIN pets p ON p.id = a.pet_id
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2)
     ORDER BY a.scheduled_at ASC`,
    [userId, petId || null]
  );
  return result.rows;
};

const insertUploadedFile = async (userId, payload) => {
  const result = await db.query(
    `INSERT INTO uploaded_files (pet_id, user_id, category, file_name, file_type, file_url, storage_provider, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *`,
    [
      payload.petId || null,
      userId,
      payload.category || 'document',
      payload.fileName,
      payload.fileType,
      payload.fileUrl,
      payload.storageProvider || 'local-data-url',
      JSON.stringify(payload.metadata || {})
    ]
  );
  return result.rows[0];
};

module.exports = {
  addPetImage,
  createPet,
  deletePet,
  getPet,
  insertAppointment,
  insertHealthRecord,
  insertReminder,
  insertUploadedFile,
  insertVaccinationRecord,
  insertVaccineRecord,
  listAppointments,
  listFeedingPlans,
  listFeedingPreferences,
  listHealthRecords,
  listPetImages,
  listPets,
  listReminders,
  listVaccineRecords,
  listVaccinationRecords,
  normalizePet,
  updatePet,
  updateReminderStatus,
  upsertFeedingPlan
};
