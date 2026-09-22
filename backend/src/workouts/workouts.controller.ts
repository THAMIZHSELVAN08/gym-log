import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkoutsService } from './workouts.service';

@Controller('workouts')
@UseGuards(AuthGuard('jwt'))
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.workoutsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.workoutsService.findOne(req.user.id, id);
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.workoutsService.create(req.user.id, body);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workoutsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.workoutsService.remove(req.user.id, id);
  }
}
