import { db } from '../client';
import {
  personalRecords,
  type PersonalRecord,
  type NewPersonalRecord,
  type PrType,
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export async function getPrsForExercise(exerciseId: string): Promise<PersonalRecord[]> {
  return db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.exerciseId, exerciseId))
    .orderBy(desc(personalRecords.achievedAt));
}

export async function getLatestPrForExercise(
  exerciseId: string,
  prType: PrType,
): Promise<PersonalRecord | null> {
  let orderColumn = desc(personalRecords.achievedAt);
  if (prType === 'max_weight') {
    orderColumn = desc(personalRecords.weight);
  } else if (prType === 'estimated_1rm') {
    orderColumn = desc(personalRecords.estimated1rm);
  } else if (prType === 'best_set_volume' || prType === 'best_volume') {
    orderColumn = desc(personalRecords.volume);
  } else if (prType === 'max_reps') {
    orderColumn = desc(personalRecords.reps);
  }

  const result = await db
    .select()
    .from(personalRecords)
    .where(and(eq(personalRecords.exerciseId, exerciseId), eq(personalRecords.prType, prType)))
    .orderBy(orderColumn)
    .limit(1);
  return result[0] ?? null;
}

export async function getRecentPrs(limit = 10): Promise<PersonalRecord[]> {
  return db
    .select()
    .from(personalRecords)
    .orderBy(desc(personalRecords.achievedAt))
    .limit(limit);
}

export async function savePr(data: Omit<NewPersonalRecord, 'id' | 'createdAt'>): Promise<PersonalRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  const pr: NewPersonalRecord = {
    weight: null,
    reps: null,
    estimated1rm: null,
    volume: null,
    ...data,
    id,
    createdAt: now,
  };
  await db.insert(personalRecords).values(pr);
  const result = await db.select().from(personalRecords).where(eq(personalRecords.id, id)).limit(1);
  return result[0]!;
}
