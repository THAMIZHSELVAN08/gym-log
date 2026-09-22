import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  index,
} from 'drizzle-orm/sqlite-core';

// ─── EXERCISES ────────────────────────────────────────────────────────────────

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  primaryMuscle: text('primary_muscle').notNull(), // e.g. "chest"
  secondaryMuscles: text('secondary_muscles').notNull().default('[]'), // JSON array
  equipment: text('equipment').notNull().default('barbell'), // barbell | dumbbell | machine | cable | bodyweight | band | other
  movementType: text('movement_type').notNull().default('compound'), // compound | isolation
  exerciseType: text('exercise_type').notNull().default('weight_reps'), // weight_reps | bodyweight | duration | assisted_bodyweight
  instructions: text('instructions'),
  pinnedNote: text('pinned_note'), // Persistent reminder across all workouts
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('exercises_primary_muscle_idx').on(t.primaryMuscle),
  index('exercises_name_idx').on(t.name),
]);

// ─── ROUTINES (Templates) ─────────────────────────────────────────────────────

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  colorHex: text('color_hex').default('#F97316'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  lastPerformedAt: text('last_performed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const routineExercises = sqliteTable('routine_exercises', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  position: integer('position').notNull().default(0),
  defaultSets: integer('default_sets').notNull().default(3),
  targetRepsMin: integer('target_reps_min').default(8),
  targetRepsMax: integer('target_reps_max').default(12),
  restSeconds: integer('rest_seconds').default(120),
  supersetGroupId: text('superset_group_id'), // null = not in superset
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('routine_exercises_routine_idx').on(t.routineId),
]);

// ─── WORKOUTS (Completed — immutable records) ─────────────────────────────────

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  routineId: text('routine_id'), // nullable — empty workouts have no routine
  name: text('name').notNull(),
  notes: text('notes'),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  durationSeconds: integer('duration_seconds'),
  totalVolume: real('total_volume').default(0), // kg × reps
  totalSets: integer('total_sets').default(0),
  totalReps: integer('total_reps').default(0),
  prCount: integer('pr_count').default(0),
  syncedAt: text('synced_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('workouts_started_at_idx').on(t.startedAt),
]);

export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  position: integer('position').notNull().default(0),
  supersetGroupId: text('superset_group_id'),
  notes: text('notes'),
  restSeconds: integer('rest_seconds').default(120),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('workout_exercises_workout_idx').on(t.workoutId),
]);

export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),

  // Set type
  setType: text('set_type').notNull().default('normal'), // normal | warmup | working | failure | drop | duration | assisted_bodyweight | bodyweight

  // Values
  weight: real('weight'), // kg
  reps: integer('reps'),
  durationSeconds: integer('duration_seconds'),
  assistanceWeight: real('assistance_weight'), // for assisted bodyweight

  // Optional advanced
  rpe: real('rpe'), // 1–10
  rir: integer('rir'), // 0–5

  // State
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  isPr: integer('is_pr', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),

  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('workout_sets_workout_idx').on(t.workoutId),
  index('workout_sets_exercise_idx').on(t.exerciseId),
]);

// ─── PERSONAL RECORDS ─────────────────────────────────────────────────────────

export const personalRecords = sqliteTable('personal_records', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  workoutId: text('workout_id').notNull().references(() => workouts.id),
  workoutSetId: text('workout_set_id').notNull().references(() => workoutSets.id),

  prType: text('pr_type').notNull(), // max_weight | max_reps | estimated_1rm | best_volume | best_set_volume

  weight: real('weight'),
  reps: integer('reps'),
  estimated1rm: real('estimated_1rm'),
  volume: real('volume'), // weight × reps

  achievedAt: text('achieved_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('personal_records_exercise_idx').on(t.exerciseId),
  index('personal_records_type_idx').on(t.prType),
]);

// ─── BODY MEASUREMENTS ────────────────────────────────────────────────────────

export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // weight | waist | chest | left_arm | right_arm | left_thigh | right_thigh | left_calf | right_calf | body_fat
  value: real('value').notNull(),
  unit: text('unit').notNull().default('kg'), // kg | lb | cm | in | %
  notes: text('notes'),
  measuredAt: text('measured_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('body_measurements_type_idx').on(t.type),
  index('body_measurements_measured_at_idx').on(t.measuredAt),
]);

// ─── SYNC EVENTS ──────────────────────────────────────────────────────────────

export const syncEvents = sqliteTable('sync_events', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // workout | routine | exercise | measurement | pr
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(), // create | update | delete
  payload: text('payload'), // JSON
  syncedAt: text('synced_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('sync_events_entity_idx').on(t.entityType, t.entityId),
  index('sync_events_synced_at_idx').on(t.syncedAt),
]);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─── TYPE EXPORTS ─────────────────────────────────────────────────────────────

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;

export type RoutineExercise = typeof routineExercises.$inferSelect;
export type NewRoutineExercise = typeof routineExercises.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;

export type SyncEvent = typeof syncEvents.$inferSelect;

// ─── ENUM-LIKE CONSTANTS ──────────────────────────────────────────────────────

export const MuscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'full_body',
] as const;

export type MuscleGroup = typeof MuscleGroups[number];

export const EquipmentTypes = [
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell', 'smith_machine', 'other',
] as const;

export type EquipmentType = typeof EquipmentTypes[number];

export const SetTypes = [
  'normal', 'warmup', 'working', 'failure', 'drop', 'duration', 'assisted_bodyweight', 'bodyweight',
] as const;

export type SetType = typeof SetTypes[number];

export const PrTypes = [
  'max_weight', 'max_reps', 'estimated_1rm', 'best_volume', 'best_set_volume',
] as const;

export type PrType = typeof PrTypes[number];

export const MeasurementTypes = [
  'weight', 'waist', 'chest', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh',
  'left_calf', 'right_calf', 'body_fat', 'neck', 'hips',
] as const;

export type MeasurementType = typeof MeasurementTypes[number];
