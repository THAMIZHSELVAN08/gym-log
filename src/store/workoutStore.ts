import { create } from 'zustand';
import { generateId } from '../utils/id';
import {
  createWorkout,
  addExerciseToWorkout,
  addSet as dbAddSet,
  updateSet as dbUpdateSet,
  deleteSet as dbDeleteSet,
  finishWorkout as dbFinishWorkout,
} from '../db/queries/workouts';
import { evaluatePrs } from '../services/prEngine';
import type { WorkoutSet, SetType } from '../db/schema';
import type { PrResult } from '../services/prEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSet {
  id: string;
  workoutExerciseId: string;
  exerciseId: string;
  workoutId: string;
  position: number;
  setType: SetType;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  assistanceWeight: number | null;
  rpe: number | null;
  rir: number | null;
  isCompleted: boolean;
  isPr: boolean;
  notes: string | null;
  completedAt: string | null;
}

export interface ActiveExercise {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  equipment: string;
  exerciseType: string;
  position: number;
  restSeconds: number;
  supersetGroupId: string | null;
  sets: ActiveSet[];
  notes: string | null;
}

export interface WorkoutStore {
  // State
  workoutId: string | null;
  workoutName: string;
  startedAt: string | null;
  exercises: ActiveExercise[];
  isActive: boolean;

  // Recent PRs for this workout (to show badges)
  newPrs: PrResult[];

  // Actions
  startWorkout: (name: string, routineId?: string) => Promise<string>;
  addExercise: (exercise: {
    exerciseId: string;
    exerciseName: string;
    primaryMuscle: string;
    equipment: string;
    exerciseType: string;
    defaultSets?: number;
    restSeconds?: number;
  }) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => void;
  addSet: (workoutExerciseId: string) => Promise<void>;
  updateSetField: (
    workoutExerciseId: string,
    setId: string,
    field: keyof ActiveSet,
    value: number | string | boolean | null,
  ) => void;
  completeSet: (workoutExerciseId: string, setId: string) => Promise<PrResult[]>;
  uncompleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void;
  finishWorkout: () => Promise<{
    workoutId: string;
    durationSeconds: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    prCount: number;
  }>;
  discardWorkout: () => void;
  clearPrs: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  workoutId: null,
  workoutName: '',
  startedAt: null,
  exercises: [],
  isActive: false,
  newPrs: [],

  startWorkout: async (name, routineId) => {
    const startedAt = new Date().toISOString();
    const workout = await createWorkout({
      name,
      routineId: routineId ?? null,
      startedAt,
    });
    set({
      workoutId: workout.id,
      workoutName: name,
      startedAt,
      exercises: [],
      isActive: true,
      newPrs: [],
    });
    return workout.id;
  },

  addExercise: async (exercise) => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    const position = exercises.length;
    const we = await addExerciseToWorkout(
      workoutId,
      exercise.exerciseId,
      position,
      exercise.restSeconds ?? 120,
    );

    const defaultSets = exercise.defaultSets ?? 3;
    const sets: ActiveSet[] = [];

    // Pre-create set rows
    for (let i = 0; i < defaultSets; i++) {
      const setId = generateId();
      const newSet: ActiveSet = {
        id: setId,
        workoutExerciseId: we.id,
        exerciseId: exercise.exerciseId,
        workoutId,
        position: i,
        setType: 'normal',
        weight: null,
        reps: null,
        durationSeconds: null,
        assistanceWeight: null,
        rpe: null,
        rir: null,
        isCompleted: false,
        isPr: false,
        notes: null,
        completedAt: null,
      };
      sets.push(newSet);
      // Save to DB
      await dbAddSet({
        ...newSet,
        isCompleted: false,
        isPr: false,
      });
    }

    const newExercise: ActiveExercise = {
      workoutExerciseId: we.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      exerciseType: exercise.exerciseType,
      position,
      restSeconds: exercise.restSeconds ?? 120,
      supersetGroupId: null,
      sets,
      notes: null,
    };

    set((state) => ({ exercises: [...state.exercises, newExercise] }));
  },

  removeExercise: (workoutExerciseId) => {
    set((state) => ({
      exercises: state.exercises.filter((e) => e.workoutExerciseId !== workoutExerciseId),
    }));
  },

  addSet: async (workoutExerciseId) => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    const exercise = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!exercise) return;

    const position = exercise.sets.length;
    const lastCompletedSet = [...exercise.sets].reverse().find((s) => s.isCompleted);

    const setId = generateId();
    const newSet: ActiveSet = {
      id: setId,
      workoutExerciseId,
      exerciseId: exercise.exerciseId,
      workoutId,
      position,
      setType: 'normal',
      weight: lastCompletedSet?.weight ?? null,
      reps: lastCompletedSet?.reps ?? null,
      durationSeconds: null,
      assistanceWeight: null,
      rpe: null,
      rir: null,
      isCompleted: false,
      isPr: false,
      notes: null,
      completedAt: null,
    };

    await dbAddSet({ ...newSet, isCompleted: false, isPr: false });

    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? { ...e, sets: [...e.sets, newSet] }
          : e,
      ),
    }));
  },

  updateSetField: (workoutExerciseId, setId, field, value) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    }));
  },

  completeSet: async (workoutExerciseId, setId) => {
    const { exercises } = get();
    const exercise = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!exercise) return [];

    const activeSet = exercise.sets.find((s) => s.id === setId);
    if (!activeSet) return [];

    const completedAt = new Date().toISOString();

    // Update DB immediately (offline-first)
    await dbUpdateSet(setId, {
      weight: activeSet.weight ?? undefined,
      reps: activeSet.reps ?? undefined,
      isCompleted: true,
      completedAt,
    });

    // Update local state
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? { ...s, isCompleted: true, completedAt }
                  : s,
              ),
            }
          : e,
      ),
    }));

    // Evaluate PRs asynchronously
    const setForPr: WorkoutSet = {
      id: setId,
      workoutExerciseId,
      exerciseId: activeSet.exerciseId,
      workoutId: get().workoutId!,
      position: activeSet.position,
      setType: activeSet.setType,
      weight: activeSet.weight,
      reps: activeSet.reps,
      durationSeconds: activeSet.durationSeconds,
      assistanceWeight: activeSet.assistanceWeight,
      rpe: activeSet.rpe,
      rir: activeSet.rir,
      isCompleted: true,
      isPr: false,
      notes: activeSet.notes,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    };

    const prs = await evaluatePrs(setForPr);

    if (prs.length > 0) {
      // Mark set as PR in DB and local state
      await dbUpdateSet(setId, { isPr: true });
      set((state) => ({
        exercises: state.exercises.map((e) =>
          e.workoutExerciseId === workoutExerciseId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, isPr: true } : s,
                ),
              }
            : e,
        ),
        newPrs: [...state.newPrs, ...prs],
      }));
    }

    return prs;
  },

  uncompleteSet: async (workoutExerciseId, setId) => {
    await dbUpdateSet(setId, { isCompleted: false, completedAt: undefined, isPr: false });
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? { ...s, isCompleted: false, completedAt: null, isPr: false }
                  : s,
              ),
            }
          : e,
      ),
    }));
  },

  deleteSet: async (workoutExerciseId, setId) => {
    await dbDeleteSet(setId);
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e,
      ),
    }));
  },

  updateExerciseNotes: (workoutExerciseId, notes) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId ? { ...e, notes } : e,
      ),
    }));
  },

  finishWorkout: async () => {
    const { workoutId, startedAt, exercises } = get();
    if (!workoutId || !startedAt) throw new Error('No active workout');

    const finishedAt = new Date().toISOString();
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(finishedAt).getTime();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let prCount = 0;

    for (const exercise of exercises) {
      for (const s of exercise.sets) {
        if (s.isCompleted) {
          totalSets++;
          if (s.reps) totalReps += s.reps;
          if (s.weight && s.reps) totalVolume += s.weight * s.reps;
          if (s.isPr) prCount++;
        }
      }
    }

    await dbFinishWorkout(workoutId, finishedAt, durationSeconds, totalVolume, totalSets, totalReps, prCount);

    const result = { workoutId, durationSeconds, totalVolume, totalSets, totalReps, prCount };

    set({
      workoutId: null,
      workoutName: '',
      startedAt: null,
      exercises: [],
      isActive: false,
      newPrs: [],
    });

    return result;
  },

  discardWorkout: () => {
    set({
      workoutId: null,
      workoutName: '',
      startedAt: null,
      exercises: [],
      isActive: false,
      newPrs: [],
    });
  },

  clearPrs: () => {
    set({ newPrs: [] });
  },
}));
