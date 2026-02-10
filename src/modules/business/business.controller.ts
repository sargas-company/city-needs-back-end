// src/modules/business/business.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { SwaggerUpdateMyBusinessProfile } from './business-profile.swagger';
import { BusinessService } from './business.service';
import {
  SwaggerDeleteVerificationFile,
  SwaggerGetBusinessById,
  SwaggerGetBusinessBookings,
  SwaggerGetCurrentVerificationFile,
  SwaggerSubmitVerification,
  SwaggerUpdateMyBusinessLogo,
  SwaggerUploadVerificationFile,
} from './business.swagger';
import { BookingService } from '../booking/booking.service';
import {
  SubmitVerificationDto,
  SubmitVerificationResponseDto,
} from './dto/submit-verification.dto';
import { UpdateBusinessLogoDto } from './dto/update-business-logo.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { GetBusinessBookingsQueryDto } from '../booking/dto/get-business-bookings-query.dto';
import { VerificationFilesService } from '../verification-files/verification-files.service';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly bookingService: BookingService,
    private readonly verificationFilesService: VerificationFilesService,
  ) {}

  @Put('me/logo')
  @SwaggerUpdateMyBusinessLogo()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateBusinessLogoDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async updateBusinessLogo(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const result = await this.businessService.updateLogo(user, file);
    return successResponse(result);
  }

  @Patch('me/profile')
  @SwaggerUpdateMyBusinessProfile()
  async updateMyProfile(@CurrentUser() user: User, @Body() dto: UpdateBusinessProfileDto) {
    const result = await this.businessService.updateProfile(user, dto);
    return successResponse(result);
  }

  @Post('verification-file')
  @SwaggerUploadVerificationFile()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadVerificationFile(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const saved = await this.verificationFilesService.uploadVerificationFile(user, file);
    return successResponse({ file: saved }, 201);
  }

  @Get('verification-file/current')
  @SwaggerGetCurrentVerificationFile()
  async getCurrentVerificationFile(@CurrentUser() user: User) {
    const file = await this.verificationFilesService.getCurrentVerificationFile(user);
    return successResponse({ file });
  }

  @Delete('verification-file/:id')
  @SwaggerDeleteVerificationFile()
  async deleteVerificationFile(@CurrentUser() user: User, @Param('id') fileId: string) {
    await this.verificationFilesService.deleteVerificationFile(user, fileId);
    return successResponse({ deleted: true });
  }

  @Post('verification/submit')
  @SwaggerSubmitVerification()
  async submitVerification(@CurrentUser() user: User, @Body() dto: SubmitVerificationDto) {
    const result = await this.businessService.submitVerification(user, dto.verificationFileId);
    return successResponse<SubmitVerificationResponseDto>(result);
  }

  @Get('bookings')
  @SwaggerGetBusinessBookings()
  async getBusinessBookings(
    @CurrentUser() user: User,
    @Query() query: GetBusinessBookingsQueryDto,
  ) {
    const result = await this.bookingService.getBusinessBookingsCursor(user.id, query);

    return successResponse(result);
  }

  @Get(':id')
  @SwaggerGetBusinessById()
  async getBusinessById(@Param('id') id: string) {
    const result = await this.businessService.getActiveBusinessById(id);
    return successResponse(result);
  }
}
