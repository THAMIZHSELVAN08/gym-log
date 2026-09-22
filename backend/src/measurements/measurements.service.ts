import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, type?: string) {
    return this.prisma.bodyMeasurement.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { measuredAt: 'desc' },
    });
  }

  create(userId: string, data: any) {
    return this.prisma.bodyMeasurement.create({ data: { ...data, userId } });
  }

  remove(userId: string, id: string) {
    return this.prisma.bodyMeasurement.deleteMany({ where: { id, userId } });
  }
}
