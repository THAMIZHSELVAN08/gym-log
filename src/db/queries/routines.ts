import { db } from '../client';
import {
  routines,
  routineExercises,
  exercises,
  type Routine,
  type NewRoutine,
  type RoutineExercise,
  type NewRoutineExercise,
} from '../schema';
import { eq, asc, desc } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export async function getAllRoutines(): Promise<Routine[]> {
  return db
    .select()
    .from(routines)
    .where(eq(routines.isArchived, false))
    .orderBy(desc(routines.updatedAt));
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const result = await db.select().from(routines).where(eq(routines.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createRoutine(data: Omit<NewRoutine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> {
  const id = generateId();
  const now = new Date().toISOString();
  const newRoutine: NewRoutine = {
    description: null,
    colorHex: '#F97316',
    isArchived: false,
    lastPerformedAt: null,
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(routines).values(newRoutine);
  const result = await getRoutineById(id);
  if (!result) throw new Error(`Failed to create routine ${id}`);
  return result;
}

export async function updateRoutine(id: string, data: Partial<Routine>): Promise<void> {
  await db.update(routines).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(routines.id, id));
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.update(routines).set({ isArchived: true }).where(eq(routines.id, id));
}

export async function getRoutineExercises(routineId: string) {
  return db
    .select({ re: routineExercises, exercise: exercises })
    .from(routineExercises)
    .leftJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
    .where(eq(routineExercises.routineId, routineId))
    .orderBy(asc(routineExercises.position));
}

export async function addExerciseToRoutine(data: Omit<NewRoutineExercise, 'id' | 'createdAt'>): Promise<void> {
  const id = generateId();
  const now = new Date().toISOString();
  const newRE: NewRoutineExercise = {
    position: 0,
    defaultSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    restSeconds: 120,
    supersetGroupId: null,
    notes: null,
    ...data,
    id,
    createdAt: now,
  };
  await db.insert(routineExercises).values(newRE);
}

export async function updateRoutineExercise(id: string, data: Partial<RoutineExercise>): Promise<void> {
  await db.update(routineExercises).set(data).where(eq(routineExercises.id, id));
}

export async function removeExerciseFromRoutine(id: string): Promise<void> {
  await db.delete(routineExercises).where(eq(routineExercises.id, id));
}

export async function reorderRoutineExercises(
  exerciseIds: string[],
): Promise<void> {
  for (let i = 0; i < exerciseIds.length; i++) {
    await db.update(routineExercises).set({ position: i }).where(eq(routineExercises.id, exerciseIds[i]!));
  }
}

export async function replaceRoutineExercises(
  routineId: string,
  newExercises: {
    exerciseId: string;
    defaultSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    restSeconds?: number;
    notes?: string | null;
  }[],
): Promise<void> {
  await db.delete(routineExercises).where(eq(routineExercises.routineId, routineId));

  const now = new Date().toISOString();
  for (let i = 0; i < newExercises.length; i++) {
    const item = newExercises[i]!;
    const id = generateId();
    await db.insert(routineExercises).values({
      id,
      routineId,
      exerciseId: item.exerciseId,
      position: i,
      defaultSets: item.defaultSets ?? 3,
      targetRepsMin: item.targetRepsMin ?? 8,
      targetRepsMax: item.targetRepsMax ?? 12,
      restSeconds: item.restSeconds ?? 120,
      notes: item.notes ?? null,
      supersetGroupId: null,
      createdAt: now,
    });
  }
}

export async function duplicateRoutine(id: string, newName?: string): Promise<Routine> {
  const original = await getRoutineById(id);
  if (!original) throw new Error(`Routine ${id} not found`);

  const name = newName || `${original.name} (Copy)`;
  const newRoutine = await createRoutine({
    name,
    description: original.description,
    colorHex: original.colorHex ?? '#F97316',
    isArchived: false,
    lastPerformedAt: null,
  });

  const originalExercises = await getRoutineExercises(id);
  for (let i = 0; i < originalExercises.length; i++) {
    const row = originalExercises[i]!;
    await addExerciseToRoutine({
      routineId: newRoutine.id,
      exerciseId: row.re.exerciseId,
      position: i,
      defaultSets: row.re.defaultSets,
      targetRepsMin: row.re.targetRepsMin,
      targetRepsMax: row.re.targetRepsMax,
      restSeconds: row.re.restSeconds,
      notes: row.re.notes,
    });
  }

  return newRoutine;
}
