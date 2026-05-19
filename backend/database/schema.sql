-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);

-- Create refresh_tokens table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PawVerse pet care platform domain
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    species VARCHAR(20) NOT NULL CHECK (species IN ('dog', 'cat')),
    breed VARCHAR(120),
    date_of_birth DATE,
    age_years NUMERIC(4, 1),
    gender VARCHAR(20) DEFAULT 'unknown',
    weight_kg NUMERIC(6, 2),
    allergies JSONB DEFAULT '[]'::jsonb,
    medical_conditions JSONB DEFAULT '[]'::jsonb,
    activity_level VARCHAR(20) DEFAULT 'moderate',
    neutered_spayed BOOLEAN DEFAULT false,
    image_url TEXT,
    predicted_breed VARCHAR(120),
    confirmed_breed VARCHAR(120),
    breed_confidence NUMERIC(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pet_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    predicted_species VARCHAR(20),
    predicted_breed VARCHAR(120),
    confirmed_breed VARCHAR(120),
    confidence NUMERIC(5, 4),
    is_primary BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaccine_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(160) NOT NULL,
    status VARCHAR(30) DEFAULT 'scheduled',
    administered_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE,
    next_booster_at TIMESTAMP WITH TIME ZONE,
    provider VARCHAR(160),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence VARCHAR(30) DEFAULT 'none',
    status VARCHAR(30) DEFAULT 'upcoming',
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL CHECK (type IN ('vaccine', 'feeding', 'medication', 'deworming', 'flea_tick', 'grooming', 'exercise', 'appointment', 'hydration', 'weight')),
    title VARCHAR(160) NOT NULL,
    description TEXT,
    recurrence_rule JSONB NOT NULL DEFAULT '{"frequency":"none","interval":1}'::jsonb,
    preferred_times JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_template_id UUID REFERENCES schedule_templates(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,
    snoozed_until TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'snoozed', 'skipped', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_template_id, due_at)
);

CREATE TABLE IF NOT EXISTS task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES reminder_occurrences(id) ON DELETE SET NULL,
    action VARCHAR(40) NOT NULL CHECK (action IN ('created', 'completed', 'missed', 'skipped', 'snoozed', 'rescheduled', 'note_added')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(160) NOT NULL,
    administered_at TIMESTAMP WITH TIME ZONE,
    next_due_at TIMESTAMP WITH TIME ZONE,
    veterinarian VARCHAR(160),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feeding_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    calories_per_day INTEGER,
    meals_per_day INTEGER DEFAULT 2,
    feeding_times JSONB NOT NULL DEFAULT '[]'::jsonb,
    diet_type VARCHAR(120),
    hydration_goal INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feeding_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    calories_per_day INTEGER,
    meals_per_day INTEGER DEFAULT 2,
    quantity_per_meal VARCHAR(120),
    hydration_goal_ml INTEGER,
    food_suggestions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(30),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(60) DEFAULT 'document',
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(120),
    file_url TEXT NOT NULL,
    storage_provider VARCHAR(80) DEFAULT 'local',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vet_name VARCHAR(160),
    clinic_name VARCHAR(180),
    reason VARCHAR(180) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    dosage VARCHAR(120),
    frequency VARCHAR(120),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptom_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    severity VARCHAR(30),
    urgency_score INTEGER,
    recommendation TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    type VARCHAR(60) NOT NULL,
    severity VARCHAR(30) DEFAULT 'low',
    title VARCHAR(180) NOT NULL,
    summary TEXT,
    confidence NUMERIC(5, 4),
    status VARCHAR(30) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_images_pet_id ON pet_images(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_pet_id ON vaccine_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_due_at ON vaccine_records(due_at);
CREATE INDEX IF NOT EXISTS idx_reminders_pet_id ON reminders(pet_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_at ON reminders(due_at);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_pet_id ON schedule_templates(pet_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_occurrences_pet_id ON reminder_occurrences(pet_id);
CREATE INDEX IF NOT EXISTS idx_reminder_occurrences_due_at ON reminder_occurrences(due_at);
CREATE INDEX IF NOT EXISTS idx_reminder_occurrences_status ON reminder_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_task_logs_pet_id ON task_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_occurrence_id ON task_logs(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_pet_id ON vaccination_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_next_due_at ON vaccination_records(next_due_at);
CREATE INDEX IF NOT EXISTS idx_feeding_preferences_pet_id ON feeding_preferences(pet_id);
CREATE INDEX IF NOT EXISTS idx_feeding_plans_pet_id ON feeding_plans(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_records_pet_id ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_records_occurred_at ON health_records(occurred_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_pet_id ON uploaded_files(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medications_pet_id ON medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_pet_id ON symptom_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_pet_id ON ai_insights(pet_id);

DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vaccine_records_updated_at ON vaccine_records;
CREATE TRIGGER update_vaccine_records_updated_at BEFORE UPDATE ON vaccine_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON schedule_templates;
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminder_occurrences_updated_at ON reminder_occurrences;
CREATE TRIGGER update_reminder_occurrences_updated_at BEFORE UPDATE ON reminder_occurrences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vaccination_records_updated_at ON vaccination_records;
CREATE TRIGGER update_vaccination_records_updated_at BEFORE UPDATE ON vaccination_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feeding_preferences_updated_at ON feeding_preferences;
CREATE TRIGGER update_feeding_preferences_updated_at BEFORE UPDATE ON feeding_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feeding_plans_updated_at ON feeding_plans;
CREATE TRIGGER update_feeding_plans_updated_at BEFORE UPDATE ON feeding_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_records_updated_at ON health_records;
CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON health_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PawVerse local social and community ecosystem
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    area_label VARCHAR(160),
    visibility_mode VARCHAR(40) NOT NULL DEFAULT 'nearby' CHECK (visibility_mode IN ('invisible', 'nearby', 'friends_only', 'pet_only', 'hidden_location')),
    visibility_radius_km NUMERIC(6, 2) NOT NULL DEFAULT 10,
    is_visible BOOLEAN DEFAULT true,
    pets_visible BOOLEAN DEFAULT true,
    messages_allowed BOOLEAN DEFAULT true,
    connection_requests_allowed BOOLEAN DEFAULT true,
    manual_location BOOLEAN DEFAULT false,
    location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'removed', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (requester_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair_unique
ON connections (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    image_url TEXT,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (sender_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(160) NOT NULL,
    description TEXT,
    location VARCHAR(160),
    category VARCHAR(60) DEFAULT 'community',
    visibility VARCHAR(30) DEFAULT 'public' CHECK (visibility IN ('public', 'nearby', 'friends_only', 'private')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS meetups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    meetup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    approximate_location VARCHAR(180) NOT NULL,
    visibility VARCHAR(30) DEFAULT 'nearby' CHECK (visibility IN ('public', 'nearby', 'friends_only', 'group')),
    max_participants INTEGER,
    category VARCHAR(60) DEFAULT 'playdate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetup_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'going' CHECK (status IN ('going', 'interested', 'cancelled')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meetup_id, user_id)
);

CREATE TABLE IF NOT EXISTS lost_pet_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    last_seen_area VARCHAR(180) NOT NULL,
    description TEXT,
    photo_url TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'found', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(40) DEFAULT 'user',
    target_id UUID,
    reason VARCHAR(80) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'queued' CHECK (status IN ('queued', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_visible ON user_locations(is_visible, visibility_mode);
CREATE INDEX IF NOT EXISTS idx_user_locations_lat_lng ON user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_groups_category ON community_groups(category);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_meetups_time ON meetups(meetup_time);
CREATE INDEX IF NOT EXISTS idx_lost_pet_alerts_status ON lost_pet_alerts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);

DROP TRIGGER IF EXISTS update_user_locations_updated_at ON user_locations;
CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_groups_updated_at ON community_groups;
CREATE TRIGGER update_community_groups_updated_at BEFORE UPDATE ON community_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetups_updated_at ON meetups;
CREATE TRIGGER update_meetups_updated_at BEFORE UPDATE ON meetups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lost_pet_alerts_updated_at ON lost_pet_alerts;
CREATE TRIGGER update_lost_pet_alerts_updated_at BEFORE UPDATE ON lost_pet_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PawVerse pet-only community Q&A
CREATE TABLE IF NOT EXISTS qa_user_reputation (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role_label VARCHAR(40) DEFAULT 'New User' CHECK (role_label IN ('New User', 'Trusted Owner', 'Experienced Owner', 'Verified Vet', 'Trainer', 'Breeder')),
    reputation_points INTEGER DEFAULT 0,
    contribution_score INTEGER DEFAULT 0,
    helpful_answer_score INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) UNIQUE NOT NULL,
    slug VARCHAR(90) UNIQUE NOT NULL,
    category VARCHAR(60) DEFAULT 'general',
    follower_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(220) NOT NULL,
    body TEXT NOT NULL,
    pet_type VARCHAR(40) DEFAULT 'general' CHECK (pet_type IN ('dog', 'cat', 'bird', 'fish', 'exotic', 'general')),
    category VARCHAR(60) DEFAULT 'general',
    urgency VARCHAR(30) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'medium', 'high', 'emergency')),
    images JSONB DEFAULT '[]'::jsonb,
    location_label VARCHAR(180),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    status VARCHAR(30) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'rejected', 'flagged', 'closed')),
    moderation_label VARCHAR(40),
    moderation_confidence NUMERIC(5, 4),
    moderation_action VARCHAR(30),
    ai_summary TEXT,
    view_count INTEGER DEFAULT 0,
    answer_count INTEGER DEFAULT 0,
    vote_score INTEGER DEFAULT 0,
    saved_count INTEGER DEFAULT 0,
    accepted_answer_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_question_tags (
    question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES qa_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

CREATE TABLE IF NOT EXISTS qa_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'published' CHECK (status IN ('published', 'rejected', 'flagged', 'deleted')),
    moderation_label VARCHAR(40),
    moderation_confidence NUMERIC(5, 4),
    is_accepted BOOLEAN DEFAULT false,
    helpful_score INTEGER DEFAULT 0,
    vote_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    value INTEGER NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (question_id IS NOT NULL AND answer_id IS NULL)
      OR (question_id IS NULL AND answer_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_votes_question_unique ON qa_votes(user_id, question_id) WHERE question_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_votes_answer_unique ON qa_votes(user_id, answer_id) WHERE answer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS qa_saved_questions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS qa_tag_follows (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES qa_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS qa_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    reason VARCHAR(80) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    label VARCHAR(60),
    confidence NUMERIC(5, 4),
    action VARCHAR(30),
    categories JSONB DEFAULT '{}'::jsonb,
    reasons JSONB DEFAULT '[]'::jsonb,
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES qa_answers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_question_views (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 1,
    watch_seconds INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, question_id)
);

ALTER TABLE qa_questions
  DROP CONSTRAINT IF EXISTS fk_qa_questions_accepted_answer;
ALTER TABLE qa_questions
  ADD CONSTRAINT fk_qa_questions_accepted_answer
  FOREIGN KEY (accepted_answer_id) REFERENCES qa_answers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qa_questions_feed ON qa_questions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_questions_pet_type ON qa_questions(pet_type);
CREATE INDEX IF NOT EXISTS idx_qa_questions_category ON qa_questions(category);
CREATE INDEX IF NOT EXISTS idx_qa_questions_location ON qa_questions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON qa_answers(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_user ON qa_notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_reports_status ON qa_reports(status);

DROP TRIGGER IF EXISTS update_qa_questions_updated_at ON qa_questions;
CREATE TRIGGER update_qa_questions_updated_at BEFORE UPDATE ON qa_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qa_answers_updated_at ON qa_answers;
CREATE TRIGGER update_qa_answers_updated_at BEFORE UPDATE ON qa_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qa_user_reputation_updated_at ON qa_user_reputation;
CREATE TRIGGER update_qa_user_reputation_updated_at BEFORE UPDATE ON qa_user_reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
