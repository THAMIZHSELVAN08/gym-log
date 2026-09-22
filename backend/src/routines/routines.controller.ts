import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoutinesService } from './routines.service';

@Controller('routines')
@UseGuards(AuthGuard('jwt'))
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get() findAll(@Request() req: any) { return this.routinesService.findAll(req.user.id); }
  @Get(':id') findOne(@Request() req: any, @Param('id') id: string) { return this.routinesService.findOne(req.user.id, id); }
  @Post() create(@Request() req: any, @Body() body: any) { return this.routinesService.create(req.user.id, body); }
  @Put(':id') update(@Request() req: any, @Param('id') id: string, @Body() body: any) { return this.routinesService.update(req.user.id, id, body); }
  @Delete(':id') remove(@Request() req: any, @Param('id') id: string) { return this.routinesService.remove(req.user.id, id); }
}
