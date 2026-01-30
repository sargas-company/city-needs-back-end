import { randomUUID } from 'crypto';

import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { BusinessStatus, FileType, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);

  private readonly MAX_SIZE_MB = 30;
  private readonly ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ============================================================
  // GET
  // ============================================================

  async getMyReel(user: User) {
    const business = await this.getActiveBusinessOrThrow(user);

    return this.prisma.reel.findFirst({
      where: { businessId: business.id },
      include: { video: true },
    });
  }

  // ============================================================
  // UPSERT
  // ============================================================

  async upsertReel(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    this.validateFile(file);

    const business = await this.getActiveBusinessOrThrow(user);

    const existing = await this.prisma.reel.findFirst({
      where: { businessId: business.id },
      include: { video: true },
    });

    const ext = this.guessExt(file.mimetype);
    const storageKey = `public/business/${business.id}/reels/${randomUUID()}.${ext}`;

    const uploaded = await this.storage.uploadPublic({
      storageKey,
      contentType: file.mimetype,
      body: file.buffer,
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.reel.delete({ where: { id: existing.id } });
          await tx.file.delete({ where: { id: existing.videoFileId } });
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
          },
          include: { video: true },
        });
      });

      if (existing?.video.storageKey) {
        this.storage
          .deleteObject(existing.video.storageKey)
          .catch((e) => this.logger.warn(`Failed to delete old reel video: ${String(e)}`));
      }

      return created;
    } catch (err) {
      // rollback uploaded file
      await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  async deleteMyReel(user: User): Promise<void> {
    const business = await this.getActiveBusinessOrThrow(user);

    const existing = await this.prisma.reel.findFirst({
      where: { businessId: business.id },
      include: { video: true },
    });

    if (!existing) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.reel.delete({ where: { id: existing.id } });
      await tx.file.delete({ where: { id: existing.videoFileId } });
    });

    if (existing.video.storageKey) {
      await this.storage.deleteObject(existing.video.storageKey).catch((e) => {
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
