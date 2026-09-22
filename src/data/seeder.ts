import { db } from '../db/client';
import { exercises } from '../db/schema';
import { BUILT_IN_EXERCISES } from './exercises';
import { eq } from 'drizzle-orm';

/**
 * Seeds built-in exercises into the database on first launch.
 * Safe to call multiple times — will not duplicate.
 */
export async function seedExercises(): Promise<void> {
  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.isCustom, false))
    .limit(1);

  if (existing.length > 0) {
    // Already seeded
    return;
  }

  // Insert all built-in exercises
  const now = new Date().toISOString();
  const exercisesWithTimestamps = BUILT_IN_EXERCISES.map((ex) => ({
    ...ex,
    createdAt: now,
    updatedAt: now,
  }));

  // Insert in chunks to avoid SQL parameter limits
  const chunkSize = 20;
  for (let i = 0; i < exercisesWithTimestamps.length; i += chunkSize) {
    const chunk = exercisesWithTimestamps.slice(i, i + chunkSize);
    await db.insert(exercises).values(chunk).onConflictDoNothing();
  }

  console.log(`[Seed] Inserted ${exercisesWithTimestamps.length} built-in exercises.`);
}
