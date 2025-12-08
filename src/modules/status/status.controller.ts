// src/modules/status/status.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';

import { StatusService } from './status.service';

@Controller('status')
@Public()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getStatus() {
    return this.statusService.check();
  }
}
