-- ============================================================
-- Migration: Remove room_preference from guest_accounts
-- Date: 2026-06-16
-- Author: Sai Nirvana Plaza Engineering
-- 
-- RATIONALE:
--   Room type is now determined exclusively by the bookings table.
--   The room_preference column on guest_accounts was a legacy field
--   that created inconsistencies when a guest booked a different room
--   type than their stated preference. This migration removes it cleanly.
--
-- IMPACT:
--   - No API currently reads room_preference for any business logic.
--   - No dashboard depends on this column after the application update.
--   - The booking.room_id → rooms.room_type is the single source of truth.
--
-- SAFETY:
--   Run this AFTER deploying the updated application code.
--   The application code no longer writes to or reads from this column.
-- ============================================================

USE hotel_management;

-- Step 1: Verify the column exists before attempting removal
SELECT 
  COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM 
  INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = 'hotel_management'
  AND TABLE_NAME = 'guest_accounts'
  AND COLUMN_NAME = 'room_preference';

-- Step 2: Remove the column
-- NOTE: This is a non-reversible DDL operation. 
--       Take a backup of guest_accounts before running if needed.
ALTER TABLE guest_accounts
  DROP COLUMN IF EXISTS room_preference;

-- Step 3: Confirm removal
SELECT 
  COLUMN_NAME 
FROM 
  INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = 'hotel_management'
  AND TABLE_NAME = 'guest_accounts'
ORDER BY ORDINAL_POSITION;
