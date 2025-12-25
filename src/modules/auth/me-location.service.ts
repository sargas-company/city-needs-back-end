import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { MeLocationDto } from './dto/location/me-location.dto';
import { UpdateMyLocationDto } from './dto/location/update-my-location.dto';

type LocationSelect = Prisma.UserLocationGetPayload<{
  select: {
    lat: true;
    lng: true;
    source: true;
    provider: true;
    placeId: true;
    formattedAddress: true;
    updatedAt: true;
  };
}>;

@Injectable()
export class MeLocationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertLocation(userId: string, dto: UpdateMyLocationDto): Promise<MeLocationDto> {
    const location = await this.prisma.userLocation.upsert({
      where: { userId },
      create: {
        userId,
        lat: dto.lat,
        lng: dto.lng,
        source: dto.source,
        provider: dto.provider,
        placeId: dto.placeId,
        formattedAddress: dto.formattedAddress,
      },
      update: {
        lat: dto.lat,
        lng: dto.lng,
        source: dto.source,
        provider: dto.provider,
        placeId: dto.placeId,
        formattedAddress: dto.formattedAddress,
      },
      select: {
        lat: true,
        lng: true,
        source: true,
        provider: true,
        placeId: true,
        formattedAddress: true,
        updatedAt: true,
      },
    });

    return this.toDto(location);
  }

  async getLocation(userId: string): Promise<MeLocationDto | null> {
    const location = await this.prisma.userLocation.findUnique({
      where: { userId },
      select: {
        lat: true,
        lng: true,
        source: true,
        provider: true,
        placeId: true,
        formattedAddress: true,
        updatedAt: true,
      },
    });

    return location ? this.toDto(location) : null;
  }

  private toDto(location: LocationSelect): MeLocationDto {
    return {
      lat: location.lat,
      lng: location.lng,
      source: location.source,
      provider: location.provider,
      placeId: location.placeId,
      formattedAddress: location.formattedAddress,
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
