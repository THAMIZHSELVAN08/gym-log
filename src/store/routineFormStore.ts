import { create } from 'zustand';
import { generateId } from '../utils/id';

export interface RoutineFormExercise {
  id: string; // temp id for form tracking
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  defaultSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes: string | null;
}

export interface RoutineFormStore {
  mode: 'create' | 'edit';
  routineId: string | null;
  name: string;
  description: string;
  colorHex: string;
  exercises: RoutineFormExercise[];

  initCreate: () => void;
  initEdit: (
    routineId: string,
    name: string,
    description: string | null,
    colorHex: string | null,
    exercises: RoutineFormExercise[],
  ) => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setColorHex: (color: string) => void;
  addExercise: (exercise: {
    id: string;
    name: string;
    primaryMuscle: string;
    defaultSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    restSeconds?: number;
  }) => void;
  removeExercise: (id: string) => void;
  updateExercise: (
    id: string,
    field: keyof RoutineFormExercise,
    value: string | number | null,
  ) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

export const useRoutineFormStore = create<RoutineFormStore>((set) => ({
  mode: 'create',
  routineId: null,
  name: '',
  description: '',
  colorHex: '#F97316',
  exercises: [],

  initCreate: () =>
    set({
      mode: 'create',
      routineId: null,
      name: '',
      description: '',
      colorHex: '#F97316',
      exercises: [],
    }),

  initEdit: (routineId, name, description, colorHex, exercises) =>
    set({
      mode: 'edit',
      routineId,
      name,
      description: description ?? '',
      colorHex: colorHex ?? '#F97316',
      exercises,
    }),

  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setColorHex: (colorHex) => set({ colorHex }),

  addExercise: (exercise) =>
    set((state) => {
      // If already added, don't duplicate or allow adding again
      const newEx: RoutineFormExercise = {
        id: generateId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        defaultSets: exercise.defaultSets ?? 3,
        targetRepsMin: exercise.targetRepsMin ?? 8,
        targetRepsMax: exercise.targetRepsMax ?? 12,
        restSeconds: exercise.restSeconds ?? 120,
        notes: null,
      };
      return { exercises: [...state.exercises, newEx] };
    }),

  removeExercise: (id) =>
    set((state) => ({
      exercises: state.exercises.filter((e) => e.id !== id),
    })),

  updateExercise: (id, field, value) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    })),

  reorderExercises: (fromIndex, toIndex) =>
    set((state) => {
      const copy = [...state.exercises];
      const [moved] = copy.splice(fromIndex, 1);
      if (moved) {
        copy.splice(toIndex, 0, moved);
      }
      return { exercises: copy };
    }),

  reset: () =>
    set({
      mode: 'create',
      routineId: null,
      name: '',
      description: '',
      colorHex: '#F97316',
      exercises: [],
    }),
}));
