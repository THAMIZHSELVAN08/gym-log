import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MeasurementsService } from './measurements.service';

@Controller('measurements')
@UseGuards(AuthGuard('jwt'))
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get() findAll(@Request() req: any, @Query('type') type?: string) { return this.measurementsService.findAll(req.user.id, type); }
  @Post() create(@Request() req: any, @Body() body: any) { return this.measurementsService.create(req.user.id, body); }
  @Delete(':id') remove(@Request() req: any, @Param('id') id: string) { return this.measurementsService.remove(req.user.id, id); }
}
