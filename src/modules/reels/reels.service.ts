import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, FileType, User, ReelStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);

  private readonly MAX_SIZE_MB = 30;
  private readonly ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime']);
  private readonly MAX_REELS_PER_BUSINESS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ============================================================
  // GET MY REELS
  // ============================================================

  async getMyReels(user: User) {
    const business = await this.getActiveBusinessOrThrow(user);

    return this.prisma.reel.findMany({
      where: { businessId: business.id },
      include: { video: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // CREATE REEL
  // ============================================================

  async createReel(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    this.validateFile(file);

    const business = await this.getActiveBusinessOrThrow(user);

    const ext = this.guessExt(file.mimetype);
    const storageKey = `public/business/${business.id}/reels/${randomUUID()}.${ext}`;

    const uploaded = await this.storage.uploadPublic({
      storageKey,
      contentType: file.mimetype,
      body: file.buffer,
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const activeReelsCount = await tx.reel.count({
          where: {
            businessId: business.id,
            status: { in: [ReelStatus.PENDING, ReelStatus.APPROVED] },
          },
        });

        if (activeReelsCount >= this.MAX_REELS_PER_BUSINESS) {
          throw new BadRequestException('Maximum 5 reels allowed');
        }

        const videoFile = await tx.file.create({
          data: {
            url: uploaded.publicUrl,
            storageKey: uploaded.storageKey,
            type: FileType.REEL_VIDEO,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            originalName: file.originalname,
            businessId: business.id,
          },
        });

        return tx.reel.create({
          data: {
            businessId: business.id,
            videoFileId: videoFile.id,
            submittedAt: new Date(),
          },
          include: { video: true },
        });
      });

      return created;
    } catch (err) {
      await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
    }
  }

  // ============================================================
  // DELETE REEL
  // ============================================================

  async deleteReel(user: User, reelId: string): Promise<void> {
    const business = await this.getActiveBusinessOrThrow(user);

    const reel = await this.prisma.reel.findFirst({
      where: {
        id: reelId,
        businessId: business.id,
      },
      include: { video: true },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reel.delete({ where: { id: reel.id } });
      await tx.file.delete({ where: { id: reel.videoFileId } });
    });

    if (reel.video.storageKey) {
      await this.storage.deleteObject(reel.video.storageKey).catch((e) => {
        this.logger.warn(`Failed to delete reel video: ${String(e)}`);
      });
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async getActiveBusinessOrThrow(user: User) {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
    });

    if (!business || business.status !== BusinessStatus.ACTIVE) {
      throw new ForbiddenException('Active business is required');
    }

    return business;
  }

  private validateFile(file: Express.Multer.File) {
    const maxBytes = this.MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new BadRequestException(`Max file size is ${this.MAX_SIZE_MB}MB`);
    }

    if (!this.ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported video type ${file.mimetype}`);
    }
  }

  private guessExt(mime: string): string {
    if (mime === 'video/mp4') return 'mp4';
    if (mime === 'video/quicktime') return 'mov';
    return 'mp4';
  }
}
