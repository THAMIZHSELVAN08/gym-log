import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(AuthGuard('jwt'))
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(@Request() req: any, @Body() body: { events: any[] }) {
    return this.syncService.push(req.user.id, body.events ?? []);
  }
}
