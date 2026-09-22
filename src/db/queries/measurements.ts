import { db } from '../client';
import {
  bodyMeasurements,
  type BodyMeasurement,
  type NewBodyMeasurement,
  type MeasurementType,
} from '../schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export async function getMeasurements(type: MeasurementType, limit = 50): Promise<BodyMeasurement[]> {
  return db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.type, type))
    .orderBy(desc(bodyMeasurements.measuredAt))
    .limit(limit);
}

export async function getLatestMeasurement(type: MeasurementType): Promise<BodyMeasurement | undefined> {
  const result = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.type, type))
    .orderBy(desc(bodyMeasurements.measuredAt))
    .limit(1);
  return result[0];
}

export async function addMeasurement(
  data: Omit<NewBodyMeasurement, 'id' | 'createdAt'>,
): Promise<BodyMeasurement> {
  const id = generateId();
  const now = new Date().toISOString();
  const measurement: NewBodyMeasurement = { ...data, id, createdAt: now };
  await db.insert(bodyMeasurements).values(measurement);
  const result = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.id, id)).limit(1);
  return result[0]!;
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.delete(bodyMeasurements).where(eq(bodyMeasurements.id, id));
}

export async function getWeightHistory(limit = 60): Promise<BodyMeasurement[]> {
  return getMeasurements('weight', limit);
}
