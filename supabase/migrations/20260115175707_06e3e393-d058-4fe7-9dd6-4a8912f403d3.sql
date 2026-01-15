-- Add updated_at column to game_cycles
ALTER TABLE game_cycles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to auto-update on any row change
CREATE OR REPLACE FUNCTION update_game_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS set_game_cycles_updated_at ON game_cycles;
CREATE TRIGGER set_game_cycles_updated_at
  BEFORE UPDATE ON game_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_game_cycles_updated_at();

-- Set existing rows to use actual_end_at or created_at as initial value
UPDATE game_cycles SET updated_at = COALESCE(actual_end_at, created_at) WHERE updated_at IS NULL;

-- Clean up existing cancelled games
DELETE FROM cycle_participants WHERE cycle_id IN (SELECT id FROM game_cycles WHERE status = 'cancelled');
DELETE FROM cycle_comments WHERE cycle_id IN (SELECT id FROM game_cycles WHERE status = 'cancelled');
DELETE FROM cycle_winners WHERE cycle_id IN (SELECT id FROM game_cycles WHERE status = 'cancelled');
DELETE FROM game_cycles WHERE status = 'cancelled';