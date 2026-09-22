import * as SQLite from 'expo-sqlite';

/**
 * Runs the database migrations on app start.
 * Uses expo-sqlite's built-in runAsync for raw SQL DDL.
 */
export async function runMigrations(): Promise<void> {
  const db = SQLite.openDatabaseSync('gymlog.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_muscle TEXT NOT NULL,
      secondary_muscles TEXT NOT NULL DEFAULT '[]',
      equipment TEXT NOT NULL DEFAULT 'barbell',
      movement_type TEXT NOT NULL DEFAULT 'compound',
      exercise_type TEXT NOT NULL DEFAULT 'weight_reps',
      instructions TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS exercises_primary_muscle_idx ON exercises(primary_muscle);
    CREATE INDEX IF NOT EXISTS exercises_name_idx ON exercises(name);

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color_hex TEXT DEFAULT '#F97316',
      is_archived INTEGER NOT NULL DEFAULT 0,
      last_performed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL DEFAULT 0,
      default_sets INTEGER NOT NULL DEFAULT 3,
      target_reps_min INTEGER DEFAULT 8,
      target_reps_max INTEGER DEFAULT 12,
      rest_seconds INTEGER DEFAULT 120,
      superset_group_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS routine_exercises_routine_idx ON routine_exercises(routine_id);

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      routine_id TEXT,
      name TEXT NOT NULL,
      notes TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration_seconds INTEGER,
      total_volume REAL DEFAULT 0,
      total_sets INTEGER DEFAULT 0,
      total_reps INTEGER DEFAULT 0,
      pr_count INTEGER DEFAULT 0,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS workouts_started_at_idx ON workouts(started_at);

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL DEFAULT 0,
      superset_group_id TEXT,
      notes TEXT,
      rest_seconds INTEGER DEFAULT 120,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS workout_exercises_workout_idx ON workout_exercises(workout_id);

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      set_type TEXT NOT NULL DEFAULT 'normal',
      weight REAL,
      reps INTEGER,
      duration_seconds INTEGER,
      assistance_weight REAL,
      rpe REAL,
      rir INTEGER,
      is_completed INTEGER NOT NULL DEFAULT 0,
      is_pr INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS workout_sets_workout_idx ON workout_sets(workout_id);
    CREATE INDEX IF NOT EXISTS workout_sets_exercise_idx ON workout_sets(exercise_id);

    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      workout_id TEXT NOT NULL REFERENCES workouts(id),
      workout_set_id TEXT NOT NULL REFERENCES workout_sets(id),
      pr_type TEXT NOT NULL,
      weight REAL,
      reps INTEGER,
      estimated_1rm REAL,
      volume REAL,
      achieved_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS personal_records_exercise_idx ON personal_records(exercise_id);
    CREATE INDEX IF NOT EXISTS personal_records_type_idx ON personal_records(pr_type);

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      notes TEXT,
      measured_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS body_measurements_type_idx ON body_measurements(type);
    CREATE INDEX IF NOT EXISTS body_measurements_measured_at_idx ON body_measurements(measured_at);

    CREATE TABLE IF NOT EXISTS sync_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS sync_events_entity_idx ON sync_events(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS sync_events_synced_at_idx ON sync_events(synced_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
