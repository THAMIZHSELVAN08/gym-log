import { db, sqlite } from '../client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  personalRecords,
  exercises,
  type Workout,
  type NewWorkout,
  type WorkoutExercise,
  type WorkoutSet,
} from '../schema';
import { eq, desc, and, gte, lte, isNull, isNotNull, ne } from 'drizzle-orm';
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

export async function getActiveWorkout(): Promise<Workout | null> {
  // Only recover workouts started in the last 24h — prevents picking up old abandoned sessions
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const result = await db
    .select()
    .from(workouts)
    .where(and(isNull(workouts.finishedAt), gte(workouts.startedAt, oneDayAgo)))
    .orderBy(desc(workouts.startedAt))
    .limit(1);
  return result[0] ?? null;
}

export async function deleteWorkout(id: string): Promise<void> {
  // Use atomic SQLite execution to guarantee complete deletion without foreign key deadlocks
  await sqlite.execAsync(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM personal_records WHERE workout_id = '${id}';
    DELETE FROM workout_sets WHERE workout_id = '${id}';
    DELETE FROM workout_exercises WHERE workout_id = '${id}';
    DELETE FROM workouts WHERE id = '${id}';
    PRAGMA foreign_keys = ON;
  `);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .orderBy(desc(workouts.startedAt));
}

export async function getWorkoutsInRange(startDate: string, endDate: string): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(and(isNotNull(workouts.finishedAt), gte(workouts.startedAt, startDate), lte(workouts.startedAt, endDate)))
    .orderBy(desc(workouts.startedAt));
}

export async function getRecentWorkouts(limit = 10): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);
}

export async function updateWorkout(id: string, data: Partial<Workout>): Promise<void> {
  await db.update(workouts).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(workouts.id, id));
}

export async function updateWorkoutName(id: string, name: string): Promise<void> {
  await db.update(workouts).set({ name, updatedAt: new Date().toISOString() }).where(eq(workouts.id, id));
}

export async function updateWorkoutNotes(id: string, notes: string | null): Promise<void> {
  await db.update(workouts).set({ notes, updatedAt: new Date().toISOString() }).where(eq(workouts.id, id));
}

export async function updateWorkoutDate(id: string, startedAt: string): Promise<void> {
  await db.update(workouts).set({ startedAt, updatedAt: new Date().toISOString() }).where(eq(workouts.id, id));
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

export async function updateWorkoutExerciseNotes(workoutExerciseId: string, notes: string | null): Promise<void> {
  await db.update(workoutExercises).set({ notes }).where(eq(workoutExercises.id, workoutExerciseId));
}

export async function updateWorkoutExerciseRestSeconds(workoutExerciseId: string, restSeconds: number): Promise<void> {
  await db.update(workoutExercises).set({ restSeconds }).where(eq(workoutExercises.id, workoutExerciseId));
}

export async function updateWorkoutExerciseSuperset(workoutExerciseId: string, supersetGroupId: string | null): Promise<void> {
  await db.update(workoutExercises).set({ supersetGroupId }).where(eq(workoutExercises.id, workoutExerciseId));
}

export async function reorderWorkoutExercises(workoutId: string, orderedExerciseIds: string[]): Promise<void> {
  for (let i = 0; i < orderedExerciseIds.length; i++) {
    const weId = orderedExerciseIds[i]!;
    await db.update(workoutExercises).set({ position: i }).where(eq(workoutExercises.id, weId));
  }
}

export async function replaceWorkoutExercise(workoutExerciseId: string, newExerciseId: string): Promise<void> {
  await db.update(workoutExercises).set({ exerciseId: newExerciseId }).where(eq(workoutExercises.id, workoutExerciseId));
  // Update exerciseId in associated workout sets as well
  await db.update(workoutSets).set({ exerciseId: newExerciseId }).where(eq(workoutSets.workoutExerciseId, workoutExerciseId));
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

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  sets: WorkoutSet[];
}

export async function getExerciseHistory(
  exerciseId: string,
  limit = 20,
  excludeWorkoutId?: string,
): Promise<ExerciseHistoryEntry[]> {
  const conditions = [
    eq(workoutExercises.exerciseId, exerciseId),
    isNotNull(workouts.finishedAt),
  ];
  if (excludeWorkoutId) {
    conditions.push(ne(workouts.id, excludeWorkoutId));
  }

  // Get workout exercises for this exercise from finished workouts
  const wes = await db
    .select({ we: workoutExercises, w: workouts })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(...conditions))
    .orderBy(desc(workouts.startedAt))
    .limit(limit * 2);

  const results: ExerciseHistoryEntry[] = [];

  for (const { we, w } of wes) {
    if (!w) continue;
    const sets = await getSetsForWorkoutExercise(we.id);
    const completedSets = sets.filter((s) => s.isCompleted);
    if (completedSets.length > 0) {
      results.push({
        workoutId: w.id,
        workoutName: w.name,
        startedAt: w.startedAt,
        sets: completedSets,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function getLastPerformance(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<ExerciseHistoryEntry | null> {
  const history = await getExerciseHistory(exerciseId, 1, excludeWorkoutId);
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

export async function getLastWorkoutMuscles(workoutId: string): Promise<string[]> {
  const result = await db
    .select({ muscle: exercises.primaryMuscle })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId));

  const unique = Array.from(new Set(result.map((r) => r.muscle).filter(Boolean)));
  return unique;
}

export interface MuscleRecoveryItem {
  muscle: string;
  daysAgo: number | null;
  lastDate: string | null;
}

export async function getMusclesRecovery(): Promise<MuscleRecoveryItem[]> {
  const majorMuscles = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  
  const rows = await db
    .select({
      muscle: exercises.primaryMuscle,
      startedAt: workouts.startedAt,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(and(gte(workouts.startedAt, thirtyDaysAgo), isNotNull(workouts.finishedAt)))
    .orderBy(desc(workouts.startedAt));

  const muscleMap: Record<string, string> = {};
  for (const row of rows) {
    const m = row.muscle?.toLowerCase();
    if (m && !muscleMap[m]) {
      muscleMap[m] = row.startedAt;
    }
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return majorMuscles.map((muscle) => {
    const lastDate = muscleMap[muscle] ?? null;
    if (!lastDate) {
      return { muscle, daysAgo: null, lastDate: null };
    }
    const d = new Date(lastDate);
    const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const daysAgo = Math.max(0, Math.floor((todayMidnight - dMidnight) / 86400000));
    return { muscle, daysAgo, lastDate };
  });
}

export async function getStreakStats(): Promise<{
  currentStreak: number;
  bestStreak: number;
  daysSinceLastWorkout: number | null;
  hasTrainedToday: boolean;
}> {
  const all = await db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .orderBy(desc(workouts.startedAt));
  if (all.length === 0) {
    return { currentStreak: 0, bestStreak: 0, daysSinceLastWorkout: null, hasTrainedToday: false };
  }

  const uniqueDateStrs = Array.from(
    new Set(
      all.map((w) => {
        const d = new Date(w.startedAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    )
  ).sort().reverse();

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const latestDateStr = uniqueDateStrs[0];
  const todayDate = new Date();
  const todayStr = toDateStr(todayDate);
  const yesterday = new Date(todayDate.getTime() - 86400000);
  const yesterdayStr = toDateStr(yesterday);

  const hasTrainedToday = uniqueDateStrs.includes(todayStr);
  const hasTrainedYesterday = uniqueDateStrs.includes(yesterdayStr);

  // Compare date strings directly to avoid DST issues
  const latestDate = latestDateStr ? new Date(latestDateStr + 'T00:00:00') : null;
  const daysSinceLastWorkout = latestDate
    ? Math.round((new Date(todayStr + 'T00:00:00').getTime() - latestDate.getTime()) / 86400000)
    : null;

  let currentStreak = 0;
  if (hasTrainedToday || hasTrainedYesterday) {
    let expected = hasTrainedToday ? todayDate : yesterday;
    for (const dateStr of uniqueDateStrs) {
      const d = new Date(dateStr);
      const diff = Math.floor((expected.getTime() - d.getTime()) / 86400000);
      if (diff === 0) {
        currentStreak++;
        expected = new Date(expected.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  const ascDates = [...uniqueDateStrs].reverse().map((s) => new Date(s));
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const d of ascDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
      if (diff === 1) {
        tempStreak++;
      } else if (diff > 1) {
        tempStreak = 1;
      }
    }
    prevDate = d;
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    daysSinceLastWorkout,
    hasTrainedToday,
  };
}
