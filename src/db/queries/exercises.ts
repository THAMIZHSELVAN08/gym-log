import { db } from '../client';
import {
  exercises,
  type Exercise,
  type NewExercise,
  type MuscleGroup,
} from '../schema';
import { eq, like, and, asc } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export async function getAllExercises(): Promise<Exercise[]> {
  return db.select().from(exercises).where(eq(exercises.isArchived, false)).orderBy(asc(exercises.name));
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(eq(exercises.isArchived, false), like(exercises.name, `%${query}%`)))
    .orderBy(asc(exercises.name))
    .limit(50);
}

export async function getExercisesByMuscle(muscle: MuscleGroup): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(eq(exercises.isArchived, false), eq(exercises.primaryMuscle, muscle)))
    .orderBy(asc(exercises.name));
}

export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  const result = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return result[0];
}

export async function createExercise(data: Omit<NewExercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exercise> {
  const id = generateId();
  const now = new Date().toISOString();
  const newExercise: NewExercise = {
    ...data,
    id,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(exercises).values(newExercise);
  return (await getExerciseById(id))!;
}

export async function updateExercise(id: string, data: Partial<Exercise>): Promise<void> {
  await db.update(exercises).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(exercises.id, id));
}

export async function archiveExercise(id: string): Promise<void> {
  await db.update(exercises).set({ isArchived: true }).where(eq(exercises.id, id));
}
