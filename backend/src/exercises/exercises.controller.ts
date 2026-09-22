import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
@UseGuards(AuthGuard('jwt'))
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get() findAll() { return this.exercisesService.findAll(); }
  @Get('custom') findCustom(@Request() req: any) { return this.exercisesService.findUserCustom(req.user.id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.exercisesService.findOne(id); }
  @Get(':id/history') getHistory(@Request() req: any, @Param('id') id: string) { return this.exercisesService.getHistory(req.user.id, id); }
  @Post() create(@Request() req: any, @Body() body: any) { return this.exercisesService.create(req.user.id, body); }
}
