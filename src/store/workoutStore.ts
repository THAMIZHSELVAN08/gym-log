import { create } from 'zustand';
import { generateId } from '../utils/id';
import {
  createWorkout,
  getActiveWorkout,
  deleteWorkout,
  addExerciseToWorkout,
  getWorkoutExercisesWithDetails,
  getSetsForWorkoutExercise,
  removeExerciseFromWorkout as dbRemoveExercise,
  addSet as dbAddSet,
  updateSet as dbUpdateSet,
  deleteSet as dbDeleteSet,
  finishWorkout as dbFinishWorkout,
  updateWorkoutExerciseNotes,
  updateWorkoutName as dbUpdateWorkoutName,
  updateWorkoutNotes as dbUpdateWorkoutNotes,
  updateWorkoutExerciseRestSeconds as dbUpdateRestSeconds,
  updateWorkoutExerciseSuperset as dbUpdateSuperset,
  reorderWorkoutExercises as dbReorderExercises,
  replaceWorkoutExercise as dbReplaceExercise,
} from '../db/queries/workouts';
import { updatePinnedNote as dbUpdatePinnedNote, getExerciseById } from '../db/queries/exercises';
import { createRoutine, replaceRoutineExercises } from '../db/queries/routines';
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
  pinnedNote: string | null;
}

export interface WorkoutStore {
  // State
  workoutId: string | null;
  workoutName: string;
  workoutNotes: string | null;
  routineId: string | null;
  startedAt: string | null;
  exercises: ActiveExercise[];
  isActive: boolean;

  // Recent PRs for this workout
  newPrs: PrResult[];

  // Actions
  recoverActiveWorkout: () => Promise<boolean>;
  startWorkout: (name: string, routineId?: string) => Promise<string>;
  updateWorkoutName: (name: string) => Promise<void>;
  updateWorkoutNotes: (notes: string | null) => Promise<void>;
  addExercise: (exercise: {
    exerciseId: string;
    exerciseName: string;
    primaryMuscle: string;
    equipment: string;
    exerciseType: string;
    defaultSets?: number;
    restSeconds?: number;
    pinnedNote?: string | null;
  }) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => void;
  reorderExercise: (workoutExerciseId: string, direction: 'up' | 'down') => Promise<void>;
  replaceExercise: (
    workoutExerciseId: string,
    newExercise: {
      id: string;
      name: string;
      primaryMuscle: string;
      equipment: string;
      exerciseType: string;
      pinnedNote?: string | null;
    },
  ) => Promise<void>;
  updateExerciseRestSeconds: (workoutExerciseId: string, restSeconds: number) => Promise<void>;
  updateExerciseNotes: (workoutExerciseId: string, notes: string | null) => void;
  updatePinnedNote: (exerciseId: string, pinnedNote: string | null) => Promise<void>;
  toggleSuperset: (workoutExerciseId: string, supersetGroupId: string | null) => Promise<void>;
  addSet: (workoutExerciseId: string, setType?: SetType) => Promise<void>;
  addWarmupSets: (workoutExerciseId: string, count?: number) => Promise<void>;
  updateSetType: (workoutExerciseId: string, setId: string, setType: SetType) => Promise<void>;
  updateSetField: (
    workoutExerciseId: string,
    setId: string,
    field: keyof ActiveSet,
    value: number | string | boolean | null,
  ) => void;
  completeSet: (workoutExerciseId: string, setId: string) => Promise<PrResult[]>;
  uncompleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  saveAsTemplate: (name: string) => Promise<string>;
  updateTemplate: (routineId: string) => Promise<void>;
  finishWorkout: () => Promise<{
    workoutId: string;
    durationSeconds: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    prCount: number;
  }>;
  discardWorkout: () => Promise<void>;
  clearPrs: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  workoutId: null,
  workoutName: '',
  workoutNotes: null,
  routineId: null,
  startedAt: null,
  exercises: [],
  isActive: false,
  newPrs: [],

  recoverActiveWorkout: async () => {
    try {
      const active = await getActiveWorkout();
      if (!active) return false;

      const workoutExercises = await getWorkoutExercisesWithDetails(active.id);
      const exercisesList: ActiveExercise[] = [];

      for (const { we, exercise } of workoutExercises) {
        if (!exercise) continue;
        const setsFromDb = await getSetsForWorkoutExercise(we.id);

        const sets: ActiveSet[] = setsFromDb.map((s) => ({
          id: s.id,
          workoutExerciseId: s.workoutExerciseId,
          exerciseId: s.exerciseId,
          workoutId: s.workoutId,
          position: s.position,
          setType: s.setType as SetType,
          weight: s.weight,
          reps: s.reps,
          durationSeconds: s.durationSeconds,
          assistanceWeight: s.assistanceWeight,
          rpe: s.rpe,
          rir: s.rir,
          isCompleted: s.isCompleted,
          isPr: s.isPr,
          notes: s.notes,
          completedAt: s.completedAt,
        }));

        exercisesList.push({
          workoutExerciseId: we.id,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          exerciseType: exercise.exerciseType,
          position: we.position,
          restSeconds: we.restSeconds ?? 120,
          supersetGroupId: we.supersetGroupId,
          sets,
          notes: we.notes,
          pinnedNote: exercise.pinnedNote,
        });
      }

      set({
        workoutId: active.id,
        workoutName: active.name,
        workoutNotes: active.notes,
        routineId: active.routineId,
        startedAt: active.startedAt,
        exercises: exercisesList,
        isActive: true,
        newPrs: [],
      });
      return true;
    } catch (err) {
      console.error('Failed to recover active workout:', err);
      return false;
    }
  },

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
      workoutNotes: null,
      routineId: routineId ?? null,
      startedAt,
      exercises: [],
      isActive: true,
      newPrs: [],
    });
    return workout.id;
  },

  updateWorkoutName: async (name) => {
    const { workoutId } = get();
    if (!workoutId) return;
    set({ workoutName: name });
    await dbUpdateWorkoutName(workoutId, name).catch((err) => {
      console.error('Failed to update workout name in DB:', err);
    });
  },

  updateWorkoutNotes: async (notes) => {
    const { workoutId } = get();
    if (!workoutId) return;
    set({ workoutNotes: notes });
    await dbUpdateWorkoutNotes(workoutId, notes).catch((err) => {
      console.error('Failed to update workout notes in DB:', err);
    });
  },

  addExercise: async (exercise) => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    // Retrieve pinned note if not provided
    let pinnedNote = exercise.pinnedNote ?? null;
    if (pinnedNote === undefined || pinnedNote === null) {
      const exData = await getExerciseById(exercise.exerciseId);
      if (exData) pinnedNote = exData.pinnedNote;
    }

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
      pinnedNote,
    };

    set((state) => ({ exercises: [...state.exercises, newExercise] }));
  },

  removeExercise: (workoutExerciseId) => {
    set((state) => ({
      exercises: state.exercises.filter((e) => e.workoutExerciseId !== workoutExerciseId),
    }));
    dbRemoveExercise(workoutExerciseId).catch((err) => {
      console.error('Failed to remove exercise from DB:', err);
    });
  },

  reorderExercise: async (workoutExerciseId, direction) => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    const index = exercises.findIndex((e) => e.workoutExerciseId === workoutExerciseId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const reordered = [...exercises];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved!);

    // Re-assign positions
    const updated = reordered.map((ex, pos) => ({ ...ex, position: pos }));
    set({ exercises: updated });

    await dbReorderExercises(workoutId, updated.map((e) => e.workoutExerciseId)).catch((err) => {
      console.error('Failed to persist exercise reorder in DB:', err);
    });
  },

  replaceExercise: async (workoutExerciseId, newExercise) => {
    const { exercises } = get();
    const current = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!current) return;

    let pinnedNote = newExercise.pinnedNote ?? null;
    if (!pinnedNote) {
      const dbEx = await getExerciseById(newExercise.id);
      if (dbEx) pinnedNote = dbEx.pinnedNote;
    }

    // Update in DB
    await dbReplaceExercise(workoutExerciseId, newExercise.id);

    // Update local state
    set((state) => ({
      exercises: state.exercises.map((e) => {
        if (e.workoutExerciseId !== workoutExerciseId) return e;
        return {
          ...e,
          exerciseId: newExercise.id,
          exerciseName: newExercise.name,
          primaryMuscle: newExercise.primaryMuscle,
          equipment: newExercise.equipment,
          exerciseType: newExercise.exerciseType,
          pinnedNote,
          sets: e.sets.map((s) => ({ ...s, exerciseId: newExercise.id })),
        };
      }),
    }));
  },

  updateExerciseRestSeconds: async (workoutExerciseId, restSeconds) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId ? { ...e, restSeconds } : e,
      ),
    }));
    await dbUpdateRestSeconds(workoutExerciseId, restSeconds).catch((err) => {
      console.error('Failed to update rest seconds in DB:', err);
    });
  },

  updateExerciseNotes: (workoutExerciseId, notes) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId ? { ...e, notes } : e,
      ),
    }));
    updateWorkoutExerciseNotes(workoutExerciseId, notes).catch((err) => {
      console.error('Failed to update exercise notes in DB:', err);
    });
  },

  updatePinnedNote: async (exerciseId, pinnedNote) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.exerciseId === exerciseId ? { ...e, pinnedNote } : e,
      ),
    }));
    await dbUpdatePinnedNote(exerciseId, pinnedNote).catch((err) => {
      console.error('Failed to update pinned note in DB:', err);
    });
  },

  toggleSuperset: async (workoutExerciseId, supersetGroupId) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId ? { ...e, supersetGroupId } : e,
      ),
    }));
    await dbUpdateSuperset(workoutExerciseId, supersetGroupId).catch((err) => {
      console.error('Failed to update superset group in DB:', err);
    });
  },

  addSet: async (workoutExerciseId, setType = 'normal') => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    const exercise = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!exercise) return;

    const position = exercise.sets.length;
    const lastSet = exercise.sets[exercise.sets.length - 1];

    const setId = generateId();
    const newSet: ActiveSet = {
      id: setId,
      workoutExerciseId,
      exerciseId: exercise.exerciseId,
      workoutId,
      position,
      setType,
      weight: lastSet?.weight ?? null,
      reps: lastSet?.reps ?? null,
      durationSeconds: lastSet?.durationSeconds ?? null,
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

  addWarmupSets: async (workoutExerciseId, count = 2) => {
    const { workoutId, exercises } = get();
    if (!workoutId) return;

    const exercise = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!exercise) return;

    const workingWeight = exercise.sets.find((s) => (s.weight ?? 0) > 0)?.weight ?? 50;

    // Create warmup sets with 50% and 70% of working weight
    const warmupMultipliers = count === 1 ? [0.6] : [0.5, 0.75];
    const newWarmupSets: ActiveSet[] = [];

    for (let i = 0; i < count; i++) {
      const mult = warmupMultipliers[i] ?? 0.5;
      const w = Math.round((workingWeight * mult) / 2.5) * 2.5;
      const setId = generateId();
      const ws: ActiveSet = {
        id: setId,
        workoutExerciseId,
        exerciseId: exercise.exerciseId,
        workoutId,
        position: i,
        setType: 'warmup',
        weight: Math.max(20, w),
        reps: i === 0 ? 10 : 6,
        durationSeconds: null,
        assistanceWeight: null,
        rpe: null,
        rir: null,
        isCompleted: false,
        isPr: false,
        notes: null,
        completedAt: null,
      };
      newWarmupSets.push(ws);
      await dbAddSet({ ...ws, isCompleted: false, isPr: false });
    }

    // Prepend warmup sets before existing sets
    const existingSets = exercise.sets.map((s, idx) => ({ ...s, position: count + idx }));
    for (const s of existingSets) {
      await dbUpdateSet(s.id, { position: s.position });
    }

    const merged = [...newWarmupSets, ...existingSets];

    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId ? { ...e, sets: merged } : e,
      ),
    }));
  },

  updateSetType: async (workoutExerciseId, setId, setType) => {
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, setType } : s)),
            }
          : e,
      ),
    }));
    await dbUpdateSet(setId, { setType }).catch((err) => {
      console.error('Failed to update set type in DB:', err);
    });
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

    dbUpdateSet(setId, { [field]: value }).catch((err) => {
      console.error('Failed to update set in DB:', err);
    });
  },

  completeSet: async (workoutExerciseId, setId) => {
    const { exercises } = get();
    const exercise = exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
    if (!exercise) return [];

    const activeSet = exercise.sets.find((s) => s.id === setId);
    if (!activeSet) return [];

    const completedAt = new Date().toISOString();

    await dbUpdateSet(setId, {
      weight: activeSet.weight ?? undefined,
      reps: activeSet.reps ?? undefined,
      durationSeconds: activeSet.durationSeconds ?? undefined,
      isCompleted: true,
      completedAt,
    });

    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.workoutExerciseId === workoutExerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, isCompleted: true, completedAt } : s,
              ),
            }
          : e,
      ),
    }));

    // PR evaluation (skip warmup sets for max PRs if setType === 'warmup')
    if (activeSet.setType !== 'warmup') {
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
        return prs;
      }
    }

    return [];
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

  saveAsTemplate: async (name) => {
    const { exercises } = get();
    const routine = await createRoutine({
      name,
      description: `Saved from active workout on ${new Date().toLocaleDateString()}`,
      colorHex: '#F97316',
    });

    const templateExercises = exercises.map((e) => ({
      exerciseId: e.exerciseId,
      defaultSets: e.sets.length > 0 ? e.sets.length : 3,
      restSeconds: e.restSeconds,
      notes: e.notes,
    }));

    await replaceRoutineExercises(routine.id, templateExercises);
    return routine.id;
  },

  updateTemplate: async (routineId) => {
    const { exercises } = get();
    const templateExercises = exercises.map((e) => ({
      exerciseId: e.exerciseId,
      defaultSets: e.sets.length > 0 ? e.sets.length : 3,
      restSeconds: e.restSeconds,
      notes: e.notes,
    }));
    await replaceRoutineExercises(routineId, templateExercises);
  },

  finishWorkout: async () => {
    const { workoutId, startedAt, exercises } = get();
    if (!workoutId || !startedAt) throw new Error('No active workout');

    const finishedAt = new Date().toISOString();
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(finishedAt).getTime();
    const durationSeconds = Math.max(1, Math.floor((endTime - startTime) / 1000));

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
      workoutNotes: null,
      routineId: null,
      startedAt: null,
      exercises: [],
      isActive: false,
      newPrs: [],
    });

    return result;
  },

  discardWorkout: async () => {
    const { workoutId } = get();
    if (workoutId) {
      try {
        await deleteWorkout(workoutId);
      } catch (err) {
        console.error('Failed to delete discarded workout from DB:', err);
      }
    }
    set({
      workoutId: null,
      workoutName: '',
      workoutNotes: null,
      routineId: null,
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
