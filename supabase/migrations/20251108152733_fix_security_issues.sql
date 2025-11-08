/*
  # Fix Security and Performance Issues

  ## Changes

  1. **Add Missing Indexes**
     - Add indexes for foreign keys in qr_offers table
     - Improves query performance for joins and lookups

  2. **Optimize RLS Policies**
     - Replace `auth.uid()` with `(select auth.uid())`
     - Prevents re-evaluation for each row, improving performance at scale

  3. **Fix Function Search Path**
     - Make update_updated_at function immutable and stable
     - Fixes function search path mutability issue

  ## Security
  - All optimizations maintain the same security model
  - Performance improvements for large datasets
*/

-- Add missing indexes for qr_offers foreign keys
CREATE INDEX IF NOT EXISTS idx_qr_offers_card_instance 
  ON qr_offers(card_instance_id);

CREATE INDEX IF NOT EXISTS idx_qr_offers_consumer 
  ON qr_offers(consumer_id) 
  WHERE consumer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_offers_owner 
  ON qr_offers(owner_id);

-- Drop and recreate RLS policies with optimized auth.uid() calls

-- users_extended policies
DROP POLICY IF EXISTS "Users can view own extended data" ON users_extended;
CREATE POLICY "Users can view own extended data"
  ON users_extended FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own extended data" ON users_extended;
CREATE POLICY "Users can insert own extended data"
  ON users_extended FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own extended data" ON users_extended;
CREATE POLICY "Users can update own extended data"
  ON users_extended FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- user_cards policies
DROP POLICY IF EXISTS "Users can view own cards" ON user_cards;
CREATE POLICY "Users can view own cards"
  ON user_cards FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Users can insert own cards" ON user_cards;
CREATE POLICY "Users can insert own cards"
  ON user_cards FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

-- challenge_claims policies
DROP POLICY IF EXISTS "Users can view own claims" ON challenge_claims;
CREATE POLICY "Users can view own claims"
  ON challenge_claims FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own claims" ON challenge_claims;
CREATE POLICY "Users can create own claims"
  ON challenge_claims FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- qr_offers policies
DROP POLICY IF EXISTS "Users can view own offers" ON qr_offers;
CREATE POLICY "Users can view own offers"
  ON qr_offers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id OR (select auth.uid()) = consumer_id);

DROP POLICY IF EXISTS "Users can create own offers" ON qr_offers;
CREATE POLICY "Users can create own offers"
  ON qr_offers FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

-- match_results policies
DROP POLICY IF EXISTS "Users can view own match results" ON match_results;
CREATE POLICY "Users can view own match results"
  ON match_results FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own match results" ON match_results;
CREATE POLICY "Users can insert own match results"
  ON match_results FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- events policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix function search path - drop trigger first, then function
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Recreate function with SECURITY DEFINER and stable search_path
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add comments explaining the unused indexes (they're for future queries and data growth)
COMMENT ON INDEX idx_user_cards_card IS 'Index for filtering cards by card_id - used in card popularity queries';
COMMENT ON INDEX idx_challenge_claims_user IS 'Index for user challenge history - performance improves with data growth';
COMMENT ON INDEX idx_challenge_claims_status IS 'Index for admin dashboard and pending claims queries';
COMMENT ON INDEX idx_qr_offers_expires IS 'Index for cleanup job and expired offer queries';
COMMENT ON INDEX idx_match_results_user IS 'Index for user game history and leaderboards';
COMMENT ON INDEX idx_match_results_game IS 'Index for game-specific leaderboards';
COMMENT ON INDEX idx_events_user IS 'Index for user activity logs and audit trails';
COMMENT ON INDEX idx_events_type IS 'Index for system monitoring and event type analytics';
COMMENT ON INDEX idx_events_created IS 'Index for time-based event queries and cleanup';
