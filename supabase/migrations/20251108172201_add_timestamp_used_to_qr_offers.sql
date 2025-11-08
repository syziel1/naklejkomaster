/*
  # Add timestamp_used Column to qr_offers Table

  ## Purpose
  Stores the exact timestamp string used during HMAC signature generation to enable proper signature verification.

  ## Changes

  1. **Add timestamp_used Column**
     - Add `timestamp_used` column to `qr_offers` table
     - Type: text (stores ISO timestamp string)
     - Required: NOT NULL (critical for security)
     - Purpose: Preserves exact timestamp used in HMAC payload for verification

  ## Security Impact
  - Enables proper HMAC verification by allowing reconstruction of identical payload
  - Prevents timestamp mismatch between generation and verification
  - Critical for trade offer authentication security

  ## Notes
  - This column must be populated by qr-create function when creating offers
  - This column must be used by qr-accept function when verifying HMAC
  - Without this column, HMAC verification cannot function correctly
*/

-- Add timestamp_used column to qr_offers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_offers' AND column_name = 'timestamp_used'
  ) THEN
    ALTER TABLE qr_offers ADD COLUMN timestamp_used text NOT NULL DEFAULT '';
    
    -- Remove default after adding (we only needed it to add the column to existing rows)
    ALTER TABLE qr_offers ALTER COLUMN timestamp_used DROP DEFAULT;
  END IF;
END $$;

-- Add index for performance on timestamp lookups
CREATE INDEX IF NOT EXISTS idx_qr_offers_timestamp_used 
  ON qr_offers(timestamp_used);

-- Add comment explaining the column's purpose
COMMENT ON COLUMN qr_offers.timestamp_used IS 'Exact ISO timestamp string used in HMAC payload generation for signature verification';
