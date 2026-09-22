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
): Promise<PersonalRecord | undefined> {
  const result = await db
    .select()
    .from(personalRecords)
    .where(and(eq(personalRecords.exerciseId, exerciseId), eq(personalRecords.prType, prType)))
    .orderBy(desc(personalRecords.achievedAt))
    .limit(1);
  return result[0];
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
  const pr: NewPersonalRecord = { ...data, id, createdAt: now };
  await db.insert(personalRecords).values(pr);
  const result = await db.select().from(personalRecords).where(eq(personalRecords.id, id)).limit(1);
  return result[0]!;
}
