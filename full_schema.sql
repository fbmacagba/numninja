-- NumNinja Unified Database Schema
-- Run this in the Cloudflare D1 Console to prepare the environment.

-- 1. Users table (Case-insensitive unique aliases)
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  alias          TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Scores table (Unique alias with track of level_reached)
CREATE TABLE IF NOT EXISTS scores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  alias          TEXT UNIQUE NOT NULL COLLATE NOCASE,
  score          INTEGER NOT NULL,
  attempts       INTEGER NOT NULL,
  level_reached  INTEGER NOT NULL DEFAULT 1,
  timestamp      TEXT NOT NULL
);

-- Index for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_scores_best ON scores (score DESC);
