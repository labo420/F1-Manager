import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const dbDir = path.resolve("database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, "fantaf1.db");
export const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lobbies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    admin_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lobby_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    lobby_id INTEGER NOT NULL REFERENCES lobbies(id),
    team_name TEXT NOT NULL DEFAULT 'TBD',
    joker_count INTEGER NOT NULL DEFAULT 4,
    driver_jokers INTEGER NOT NULL DEFAULT 4,
    constructor_jokers INTEGER NOT NULL DEFAULT 4,
    role TEXT NOT NULL DEFAULT 'player',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    number INTEGER
  );

  CREATE TABLE IF NOT EXISTS constructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    round INTEGER,
    country TEXT,
    circuit_name TEXT,
    circuit_length TEXT,
    laps INTEGER,
    date TEXT NOT NULL,
    ita_time TEXT,
    is_locked INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    race_id INTEGER NOT NULL REFERENCES races(id),
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    constructor_id INTEGER NOT NULL REFERENCES constructors(id),
    lobby_id INTEGER REFERENCES lobbies(id)
  );

  CREATE TABLE IF NOT EXISTS driver_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id INTEGER NOT NULL REFERENCES races(id),
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    position INTEGER,
    points INTEGER NOT NULL DEFAULT 0,
    overtakes INTEGER NOT NULL DEFAULT 0,
    fastest_lap INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS constructor_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id INTEGER NOT NULL REFERENCES races(id),
    constructor_id INTEGER NOT NULL REFERENCES constructors(id),
    points INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS draft_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lobby_id INTEGER NOT NULL REFERENCES lobbies(id),
    race_id INTEGER NOT NULL REFERENCES races(id),
    draft_order TEXT NOT NULL,
    current_drafter_index INTEGER NOT NULL DEFAULT 0,
    is_complete INTEGER NOT NULL DEFAULT 0
  );
`);

export const db = drizzle(sqlite, { schema });
