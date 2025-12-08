import { Body, Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request } from 'express';

import { UsersService } from './users.service';

type RequestWithUser = Request & { dbUser?: User };

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    const dbUser = req.dbUser;

    if (!dbUser) {
      throw new UnauthorizedException('Authenticated user not found on request');
    }

    return dbUser;
  }

  // @Patch('me')
  // async updateMe(
  //   @Req() req: RequestWithUser,
  //   @Body() dto: UpdateMeDto,
  // ) {
  //   const dbUser = req.dbUser;

  //   if (!dbUser) {
  //     throw new UnauthorizedException('Authenticated user not found on request');
  //   }

  //   const updated = await this.usersService.updateProfile(dbUser.id, dto);
  //   return updated;
  // }
}
