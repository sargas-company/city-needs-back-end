import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseWrapperDto } from 'src/common/dto/response-wrapper.dto';

import { GetStatusDtoResponse } from './dto/get-status.dto';
import { StatusService } from './status.service';
import { SwaggerGetStatus } from './status.swagger';

@Controller('status')
@Public()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @SwaggerGetStatus()
  async getStatus(): Promise<ResponseWrapperDto<GetStatusDtoResponse>> {
    const data = await this.statusService.check();

    return {
      code: 200,
      data,
    };
  }
}
