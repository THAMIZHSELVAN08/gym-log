import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';

@Module({ imports: [PrismaModule], controllers: [MeasurementsController], providers: [MeasurementsService] })
export class MeasurementsModule {}
