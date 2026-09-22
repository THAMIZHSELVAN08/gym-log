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
  const newWorkout: NewWorkout = {
    routineId: null,
    notes: null,
    finishedAt: null,
    durationSeconds: 0,
    totalVolume: 0,
    totalSets: 0,
    totalReps: 0,
    prCount: 0,
    syncedAt: null,
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(workouts).values(newWorkout);
  const result = await getWorkoutById(id);
  if (!result) throw new Error(`Failed to create workout ${id}`);
  return result;
}

export async function getWorkoutById(id: string): Promise<Workout | null> {
  const result = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  return result[0] ?? null;
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
    supersetGroupId: null,
    notes: null,
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
  const setWithDefaults: WorkoutSet = {
    ...set,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(workoutSets).values(setWithDefaults);
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

// ─── Analytics & Progress Aggregations ─────────────────────────────────────────

export interface LiftProgressPoint {
  workoutId: string;
  workoutName: string;
  date: string;
  maxWeight: number;
  maxReps: number;
  estimated1rm: number;
  volume: number;
}

export async function getExerciseProgression(exerciseId: string): Promise<LiftProgressPoint[]> {
  const history = await getExerciseHistory(exerciseId, 100);
  // Sort chronologically ascending
  const chronological = history.slice().reverse();

  return chronological
    .map((entry) => {
      const completed = entry.sets.filter((s) => s.isCompleted && (s.weight ?? 0) > 0);
      if (completed.length === 0) return null;

      let topWeight = 0;
      let topReps = 0;
      let topE1rm = 0;
      let vol = 0;

      for (const set of completed) {
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;
        vol += w * r;
        if (w > topWeight || (w === topWeight && r > topReps)) {
          topWeight = w;
          topReps = r;
        }
        const e1rm = r === 1 ? w : w * (1 + r / 30);
        if (e1rm > topE1rm) {
          topE1rm = e1rm;
        }
      }

      return {
        workoutId: entry.workoutId,
        workoutName: entry.workoutName,
        date: entry.startedAt,
        maxWeight: topWeight,
        maxReps: topReps,
        estimated1rm: Math.round(topE1rm * 10) / 10,
        volume: vol,
      };
    })
    .filter((p): p is LiftProgressPoint => p !== null);
}

export interface MuscleVolumeStats {
  muscle: string;
  volume: number;
  sets: number;
  percentage: number;
}

export async function getMuscleVolumeBreakdown(
  startDate: string,
  endDate: string,
): Promise<MuscleVolumeStats[]> {
  const allSets = await db
    .select({
      set: workoutSets,
      workout: workouts,
      exercise: exercises,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(
      and(
        gte(workouts.startedAt, startDate),
        lte(workouts.startedAt, endDate),
        eq(workoutSets.isCompleted, true),
      ),
    );

  const muscleMap: Record<string, { volume: number; sets: number }> = {};
  let totalVolume = 0;

  for (const row of allSets) {
    const muscle = row.exercise.primaryMuscle || 'other';
    const setVol = (row.set.weight ?? 0) * (row.set.reps ?? 0);
    if (!muscleMap[muscle]) {
      muscleMap[muscle] = { volume: 0, sets: 0 };
    }
    muscleMap[muscle].volume += setVol;
    muscleMap[muscle].sets += 1;
    totalVolume += setVol;
  }

  const results: MuscleVolumeStats[] = Object.entries(muscleMap).map(([muscle, data]) => ({
    muscle,
    volume: Math.round(data.volume),
    sets: data.sets,
    percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
  }));

  return results.sort((a, b) => b.volume - a.volume);
}

export interface PeriodStats {
  workoutsCount: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  avgDurationSeconds: number;
}

export async function getPeriodComparison(
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string,
): Promise<{ current: PeriodStats; previous: PeriodStats }> {
  const currentWorkouts = await getWorkoutsInRange(currentStart, currentEnd);
  const prevWorkouts = await getWorkoutsInRange(prevStart, prevEnd);

  const compute = (wList: typeof currentWorkouts): PeriodStats => {
    const workoutsCount = wList.length;
    const totalVolume = wList.reduce((acc, w) => acc + (w.totalVolume ?? 0), 0);
    const totalSets = wList.reduce((acc, w) => acc + (w.totalSets ?? 0), 0);
    const totalReps = wList.reduce((acc, w) => acc + (w.totalReps ?? 0), 0);
    const durations = wList.map((w) => w.durationSeconds ?? 0).filter((d) => d > 0);
    const avgDurationSeconds = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    return {
      workoutsCount,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalReps,
      avgDurationSeconds,
    };
  };

  return {
    current: compute(currentWorkouts),
    previous: compute(prevWorkouts),
  };
}
