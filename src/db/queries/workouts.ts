import { db } from '../client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  type Workout,
  type NewWorkout,
  type WorkoutExercise,
  type WorkoutSet,
} from '../schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { generateId } from '../../utils/id';

// ─── Workout CRUD ─────────────────────────────────────────────────────────────

export async function createWorkout(data: Omit<NewWorkout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
  const id = generateId();
  const now = new Date().toISOString();
  const newWorkout: NewWorkout = { ...data, id, createdAt: now, updatedAt: now };
  await db.insert(workouts).values(newWorkout);
  return (await getWorkoutById(id))!;
}

export async function getWorkoutById(id: string): Promise<Workout | undefined> {
  const result = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  return result[0];
}

export async function getAllWorkouts(): Promise<Workout[]> {
  return db.select().from(workouts).orderBy(desc(workouts.startedAt));
}

export async function getWorkoutsInRange(startDate: string, endDate: string): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(and(gte(workouts.startedAt, startDate), lte(workouts.startedAt, endDate)))
    .orderBy(desc(workouts.startedAt));
}

export async function getRecentWorkouts(limit = 10): Promise<Workout[]> {
  return db.select().from(workouts).orderBy(desc(workouts.startedAt)).limit(limit);
}

export async function updateWorkout(id: string, data: Partial<Workout>): Promise<void> {
  await db.update(workouts).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(workouts.id, id));
}

export async function finishWorkout(
  id: string,
  finishedAt: string,
  durationSeconds: number,
  totalVolume: number,
  totalSets: number,
  totalReps: number,
  prCount: number,
): Promise<void> {
  await db.update(workouts).set({
    finishedAt,
    durationSeconds,
    totalVolume,
    totalSets,
    totalReps,
    prCount,
    updatedAt: new Date().toISOString(),
  }).where(eq(workouts.id, id));
}

// ─── Workout Exercises ────────────────────────────────────────────────────────

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  position: number,
  restSeconds = 120,
): Promise<WorkoutExercise> {
  const id = generateId();
  const now = new Date().toISOString();
  const newWE = {
    id,
    workoutId,
    exerciseId,
    position,
    restSeconds,
    createdAt: now,
  };
  await db.insert(workoutExercises).values(newWE);
  const result = await db.select().from(workoutExercises).where(eq(workoutExercises.id, id)).limit(1);
  return result[0]!;
}

export async function getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
  return db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.position);
}

export async function getWorkoutExercisesWithDetails(workoutId: string) {
  return db
    .select({
      we: workoutExercises,
      exercise: exercises,
    })
    .from(workoutExercises)
    .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.position);
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
  await db.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId));
}

// ─── Workout Sets ─────────────────────────────────────────────────────────────

export async function addSet(set: Omit<WorkoutSet, 'createdAt' | 'updatedAt'>): Promise<WorkoutSet> {
  const now = new Date().toISOString();
  await db.insert(workoutSets).values({ ...set, createdAt: now, updatedAt: now });
  const result = await db.select().from(workoutSets).where(eq(workoutSets.id, set.id)).limit(1);
  return result[0]!;
}

export async function updateSet(id: string, data: Partial<WorkoutSet>): Promise<void> {
  await db.update(workoutSets).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(workoutSets.id, id));
}

export async function deleteSet(id: string): Promise<void> {
  await db.delete(workoutSets).where(eq(workoutSets.id, id));
}

export async function getSetsForWorkoutExercise(workoutExerciseId: string): Promise<WorkoutSet[]> {
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseId, workoutExerciseId))
    .orderBy(workoutSets.position);
}

export async function getSetsForWorkout(workoutId: string): Promise<WorkoutSet[]> {
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, workoutId))
    .orderBy(workoutSets.position);
}

// ─── Exercise History ─────────────────────────────────────────────────────────

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  sets: WorkoutSet[];
}

export async function getExerciseHistory(
  exerciseId: string,
  limit = 20,
): Promise<ExerciseHistoryEntry[]> {
  // Get workout exercises for this exercise
  const wes = await db
    .select({ we: workoutExercises, w: workouts })
    .from(workoutExercises)
    .leftJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId)))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);

  const results: ExerciseHistoryEntry[] = [];

  for (const { we, w } of wes) {
    if (!w) continue;
    const sets = await getSetsForWorkoutExercise(we.id);
    results.push({
      workoutId: w.id,
      workoutName: w.name,
      startedAt: w.startedAt,
      sets: sets.filter((s) => s.isCompleted),
    });
  }

  return results;
}

export async function getLastPerformance(exerciseId: string): Promise<ExerciseHistoryEntry | null> {
  const history = await getExerciseHistory(exerciseId, 1);
  return history[0] ?? null;
}
