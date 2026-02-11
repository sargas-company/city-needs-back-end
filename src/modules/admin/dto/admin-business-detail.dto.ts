import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

import { AdminBusinessVerificationDto } from './admin-business-verification.dto';

export class AdminBusinessDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      url: { type: 'string' },
      type: { type: 'string' },
    },
  })
  logo!: {
    id: string;
    url: string;
    type: string;
  } | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      email: { type: 'string', nullable: true },
      username: { type: 'string', nullable: true },
    },
  })
  owner!: {
    id: string;
    email: string | null;
    username: string | null;
  };

  @ApiProperty({
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      requiresVerification: { type: 'boolean' },
      gracePeriodHours: { type: 'number', nullable: true },
    },
  })
  category!: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    requiresVerification: boolean;
    gracePeriodHours: number | null;
  };

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      countryCode: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string', nullable: true },
      zip: { type: 'string', nullable: true },
    },
  })
  address!: {
    id: string;
    countryCode: string;
    city: string;
    state: string;
    addressLine1: string;
    addressLine2: string | null;
    zip: string | null;
  } | null;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        type: { type: 'string' },
        mimeType: { type: 'string', nullable: true },
        sizeBytes: { type: 'number', nullable: true },
        originalName: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
        reel: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            submittedAt: { type: 'string', nullable: true },
            reviewedAt: { type: 'string', nullable: true },
            rejectionReason: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  })
  files!: Array<{
    id: string;
    url: string;
    type: string;
    mimeType: string | null;
    sizeBytes: number | null;
    originalName: string | null;
    createdAt: string;
    reel: {
      id: string;
      status: string;
      submittedAt: string | null;
      reviewedAt: string | null;
      rejectionReason: string | null;
      createdAt: string;
    } | null;
  }>;

  @ApiProperty({
    type: [AdminBusinessVerificationDto],
  })
  verifications!: AdminBusinessVerificationDto[];
}
