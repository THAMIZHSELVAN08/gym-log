import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.exercise.findMany({ where: { isArchived: false, OR: [{ userId: null }, { isCustom: false }] }, orderBy: { name: 'asc' } });
  }

  findUserCustom(userId: string) {
    return this.prisma.exercise.findMany({ where: { userId, isCustom: true, isArchived: false } });
  }

  findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
  }

  getHistory(userId: string, exerciseId: string) {
    return this.prisma.workoutSet.findMany({
      where: { exerciseId, workout: { userId }, isCompleted: true },
      include: { workout: { select: { startedAt: true, name: true } } },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
  }

  create(userId: string, data: any) {
    return this.prisma.exercise.create({ data: { ...data, userId, isCustom: true } });
  }
}
