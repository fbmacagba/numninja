-- Final Leaderboard Consolidation Script
-- This script trims all names and merges duplicates into single "Best Score" entries.

-- 1. Create a fresh temporary table with strict UNIQUE and Case-Insensitivity
CREATE TABLE IF NOT EXISTS scores_clean (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  alias          TEXT UNIQUE NOT NULL COLLATE NOCASE,
  score          INTEGER NOT NULL,
  attempts       INTEGER NOT NULL,
  level_reached  INTEGER NOT NULL DEFAULT 1,
  timestamp      TEXT NOT NULL
);

-- 2. Consolidate rows: Trim spaces and pick the MAX score for each unique name.
-- level_reached defaults to 1 for rows migrated from the old schema (column didn't exist).
-- We use MIN(attempts) as a tie-breaker for the same score.
INSERT INTO scores_clean (alias, score, attempts, level_reached, timestamp)
SELECT
    TRIM(alias) as clean_alias,
    MAX(score) as best_score,
    MIN(attempts) as best_attempts,
    1 as best_level,
    MAX(timestamp) as latest_time
FROM scores
GROUP BY clean_alias;

-- 3. Replace the old table
DROP TABLE IF EXISTS scores;
ALTER TABLE scores_clean RENAME TO scores;

-- 4. Clean up the users table (Prevents spaces in future JWTs)
UPDATE users SET alias = TRIM(alias);

-- 5. Re-generate performance index
CREATE INDEX IF NOT EXISTS idx_scores_best_unique ON scores (score DESC);
