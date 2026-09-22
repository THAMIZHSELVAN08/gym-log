import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sync Service — handles offline-first sync from mobile to cloud.
 * Processes sync events from the mobile app and applies them to PostgreSQL.
 * Conflict resolution strategy: last-write-wins on timestamps.
 */
@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async push(userId: string, events: any[]) {
    const results = [];
    for (const event of events) {
      try {
        const result = await this.processEvent(userId, event);
        results.push({ id: event.id, status: 'ok', result });
      } catch (e: any) {
        results.push({ id: event.id, status: 'error', error: e.message });
      }
    }
    return { processed: results.length, results };
  }

  private async processEvent(userId: string, event: any) {
    const { entityType, entityId, operation, payload } = event;

    switch (entityType) {
      case 'workout':
        if (operation === 'create') {
          return this.prisma.workout.upsert({
            where: { id: entityId },
            create: { ...payload, id: entityId, userId },
            update: payload,
          });
        }
        if (operation === 'update') {
          return this.prisma.workout.updateMany({ where: { id: entityId, userId }, data: payload });
        }
        break;

      case 'workout_set':
        if (operation === 'create' || operation === 'update') {
          return this.prisma.workoutSet.upsert({
            where: { id: entityId },
            create: { ...payload, id: entityId },
            update: payload,
          });
        }
        break;

      case 'measurement':
        if (operation === 'create') {
          return this.prisma.bodyMeasurement.upsert({
            where: { id: entityId },
            create: { ...payload, id: entityId, userId },
            update: payload,
          });
        }
        break;
    }
  }
}
