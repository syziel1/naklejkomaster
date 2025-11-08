/*
  # Naklejkomaster Core Schema

  Creates the foundational database structure for the Naklejkomaster MVP app.

  ## New Tables
  
  ### `users_extended`
  - Extends auth.users with app-specific data
  - `id` (uuid, FK to auth.users)
  - `handle` (text, unique) - User's unique nickname
  - `role` (enum: 'child', 'guardian') - User role for GDPR compliance
  - `created_at` (timestamptz)
  
  ### `profiles`
  - User profile and gamification data
  - `user_id` (uuid, PK, FK to auth.users)
  - `avatar_url` (text, nullable)
  - `xp` (integer, default 0) - Experience points
  - `streak` (integer, default 0) - Daily login streak
  - `level` (integer, default 1) - User level (1-10)
  - `updated_at` (timestamptz)

  ### `cards`
  - Master card definitions (catalog)
  - `id` (uuid, PK)
  - `slug` (text, unique) - URL-friendly identifier
  - `name` (text) - Card display name
  - `rarity` (enum: 'common', 'rare', 'epic')
  - `series` (text) - Card series/collection name
  - `description` (text) - Card lore/description
  - `image_url` (text) - Card artwork URL
  - `hp` (integer) - Health points stat
  - `energy` (integer) - Energy stat
  - `abilities` (jsonb) - Array of ability objects
  - `created_at` (timestamptz)

  ### `user_cards`
  - User's card inventory (instances of cards)
  - `id` (uuid, PK)
  - `owner_id` (uuid, FK to auth.users)
  - `card_id` (uuid, FK to cards)
  - `level` (integer, default 1) - Individual card level
  - `acquired_at` (timestamptz)
  - `created_at` (timestamptz)

  ### `challenges`
  - Daily/weekly challenges definitions
  - `id` (uuid, PK)
  - `title` (text) - Challenge name
  - `description` (text) - What to do
  - `periodic` (enum: 'daily', 'weekly')
  - `rule_json` (jsonb) - Verification rules
  - `reward_type` (text) - Type of reward (pack, card, xp)
  - `reward_value` (text) - Reward identifier
  - `active` (boolean, default true)
  - `created_at` (timestamptz)

  ### `challenge_claims`
  - User challenge completion tracking
  - `id` (uuid, PK)
  - `challenge_id` (uuid, FK to challenges)
  - `user_id` (uuid, FK to auth.users)
  - `status` (enum: 'pending', 'approved', 'rejected')
  - `proof_data` (jsonb, nullable) - Evidence of completion
  - `created_at` (timestamptz)
  - `reviewed_at` (timestamptz, nullable)

  ### `qr_offers`
  - QR code card trade offers (short-lived)
  - `id` (uuid, PK)
  - `owner_id` (uuid, FK to auth.users)
  - `card_instance_id` (uuid, FK to user_cards)
  - `hmac` (text) - Security signature
  - `expires_at` (timestamptz) - TTL 120 seconds
  - `consumed_at` (timestamptz, nullable)
  - `consumer_id` (uuid, nullable, FK to auth.users)
  - `created_at` (timestamptz)

  ### `loot_tables`
  - Pack drop probability tables
  - `id` (uuid, PK)
  - `pack_type` (enum: 'common', 'rare', 'epic')
  - `table_json` (jsonb) - Drop rates and card pools
  - `created_at` (timestamptz)

  ### `match_results`
  - Mini-game scores and anti-cheat
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users)
  - `game` (enum: 'runner', 'memory')
  - `score` (integer) - Game score
  - `seed` (text) - Server-provided seed
  - `proof` (text) - Client hash for verification
  - `stars` (integer) - 0-3 stars awarded
  - `created_at` (timestamptz)

  ### `events`
  - Audit log for security and debugging
  - `id` (uuid, PK)
  - `user_id` (uuid, nullable, FK to auth.users)
  - `event_type` (text) - Action identifier
  - `event_data` (jsonb) - Event details
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only read/update their own data
  - Card trades require atomic server-side swap
  - Challenge claims require approval workflow
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('child', 'guardian');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE card_rarity AS ENUM ('common', 'rare', 'epic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE challenge_period AS ENUM ('daily', 'weekly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pack_type AS ENUM ('common', 'rare', 'epic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE game_type AS ENUM ('runner', 'memory');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- users_extended table
CREATE TABLE IF NOT EXISTS users_extended (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'child',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users_extended ENABLE ROW LEVEL SECURITY;

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url text,
  xp integer DEFAULT 0 CHECK (xp >= 0),
  streak integer DEFAULT 0 CHECK (streak >= 0),
  level integer DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- cards table (master catalog)
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  rarity card_rarity NOT NULL DEFAULT 'common',
  series text NOT NULL,
  description text,
  image_url text,
  hp integer DEFAULT 100 CHECK (hp > 0),
  energy integer DEFAULT 100 CHECK (energy > 0),
  abilities jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- user_cards table (inventory)
CREATE TABLE IF NOT EXISTS user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  level integer DEFAULT 1 CHECK (level >= 1),
  acquired_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_cards_owner ON user_cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card ON user_cards(card_id);

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  periodic challenge_period NOT NULL,
  rule_json jsonb DEFAULT '{}'::jsonb,
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- challenge_claims table
CREATE TABLE IF NOT EXISTS challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status claim_status DEFAULT 'pending',
  proof_data jsonb,
  claim_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_challenge_claims_user ON challenge_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_claims_status ON challenge_claims(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_claims_unique_daily 
  ON challenge_claims(challenge_id, user_id, claim_date);

ALTER TABLE challenge_claims ENABLE ROW LEVEL SECURITY;

-- qr_offers table
CREATE TABLE IF NOT EXISTS qr_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_instance_id uuid NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
  hmac text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumer_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_offers_expires ON qr_offers(expires_at) WHERE consumed_at IS NULL;

ALTER TABLE qr_offers ENABLE ROW LEVEL SECURITY;

-- loot_tables table
CREATE TABLE IF NOT EXISTS loot_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type pack_type NOT NULL UNIQUE,
  table_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loot_tables ENABLE ROW LEVEL SECURITY;

-- match_results table
CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game game_type NOT NULL,
  score integer NOT NULL DEFAULT 0,
  seed text NOT NULL,
  proof text NOT NULL,
  stars integer DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_results_user ON match_results(user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_game ON match_results(game);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- events table (audit log)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- users_extended policies
CREATE POLICY "Users can view own extended data"
  ON users_extended FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own extended data"
  ON users_extended FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own extended data"
  ON users_extended FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- cards policies (public read)
CREATE POLICY "Anyone can view cards catalog"
  ON cards FOR SELECT
  TO authenticated
  USING (true);

-- user_cards policies
CREATE POLICY "Users can view own cards"
  ON user_cards FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own cards"
  ON user_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- challenges policies (public read for active)
CREATE POLICY "Users can view active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (active = true);

-- challenge_claims policies
CREATE POLICY "Users can view own claims"
  ON challenge_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own claims"
  ON challenge_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- qr_offers policies
CREATE POLICY "Users can view own offers"
  ON qr_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = consumer_id);

CREATE POLICY "Users can create own offers"
  ON qr_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- loot_tables policies (public read)
CREATE POLICY "Users can view loot tables"
  ON loot_tables FOR SELECT
  TO authenticated
  USING (true);

-- match_results policies
CREATE POLICY "Users can view own match results"
  ON match_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own match results"
  ON match_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- events policies (users can view their own events)
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
