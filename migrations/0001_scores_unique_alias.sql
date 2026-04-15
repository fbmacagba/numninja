-- Migration: enforce one leaderboard entry per player (alias)
-- Run this against the numninja-db D1 database before deploying the upsert route.

-- 1. Recreate scores table with UNIQUE constraint on alias
CREATE TABLE IF NOT EXISTS scores_new (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  alias     TEXT UNIQUE NOT NULL,
  score     INTEGER NOT NULL,
  attempts  INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

-- 2. Copy only the best score per alias from the old table
INSERT INTO scores_new (alias, score, attempts, timestamp)
SELECT alias, MAX(score) AS score, attempts, timestamp
FROM scores
GROUP BY alias;

-- 3. Swap tables
DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;
