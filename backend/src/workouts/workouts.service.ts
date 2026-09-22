import { Injectable, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: { workoutExercises: { include: { exercise: true, sets: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    return this.prisma.workout.findFirst({
      where: { id, userId },
      include: { workoutExercises: { include: { exercise: true, sets: true } } },
    });
  }

  async create(userId: string, data: any) {
    return this.prisma.workout.create({ data: { ...data, userId } });
  }

  async update(userId: string, id: string, data: any) {
    return this.prisma.workout.updateMany({ where: { id, userId }, data });
  }

  async remove(userId: string, id: string) {
    return this.prisma.workout.deleteMany({ where: { id, userId } });
  }
}
