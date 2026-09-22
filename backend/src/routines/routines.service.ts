import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.routine.findMany({ where: { userId, isArchived: false }, include: { exercises: { include: { exercise: true }, orderBy: { position: 'asc' } } } });
  }

  findOne(userId: string, id: string) {
    return this.prisma.routine.findFirst({ where: { id, userId }, include: { exercises: { include: { exercise: true }, orderBy: { position: 'asc' } } } });
  }

  create(userId: string, data: any) {
    return this.prisma.routine.create({ data: { ...data, userId } });
  }

  update(userId: string, id: string, data: any) {
    return this.prisma.routine.updateMany({ where: { id, userId }, data });
  }

  remove(userId: string, id: string) {
    return this.prisma.routine.updateMany({ where: { id, userId }, data: { isArchived: true } });
  }
}
