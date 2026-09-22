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

export async function getRoutineById(id: string): Promise<Routine | undefined> {
  const result = await db.select().from(routines).where(eq(routines.id, id)).limit(1);
  return result[0];
}

export async function createRoutine(data: Omit<NewRoutine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> {
  const id = generateId();
  const now = new Date().toISOString();
  const newRoutine: NewRoutine = { ...data, id, createdAt: now, updatedAt: now };
  await db.insert(routines).values(newRoutine);
  return (await getRoutineById(id))!;
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
  await db.insert(routineExercises).values({ ...data, id, createdAt: now });
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
