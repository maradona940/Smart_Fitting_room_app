-- ALTER SCRIPT: Remove "checking-out" status from database
-- Run this in pgAdmin to update your existing database

-- Step 1: Update any rooms with checking-out status to available
UPDATE rooms 
SET status = 'available' 
WHERE status = 'checking-out';

-- Step 2: Drop the old constraint
ALTER TABLE rooms 
DROP CONSTRAINT IF EXISTS rooms_status_check;

-- Step 3: Add new constraint without checking-out
ALTER TABLE rooms 
ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('available', 'occupied', 'alert'));

-- Verify the change
SELECT room_number, status 
FROM rooms 
ORDER BY room_number;

-- Success message
SELECT 'Successfully removed checking-out status. All rooms updated!' as result;
