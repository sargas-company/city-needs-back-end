import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, FileType, User, VideoProcessingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ReelProcessingService } from '../video-processing/reel-processing.service';

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);

  private readonly MAX_SIZE_MB = 100;
  private readonly ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly reelProcessing: ReelProcessingService,
  ) {}

  // ============================================================
  // GET
  // ============================================================

  async getMyReel(user: User) {
    const business = await this.getActiveBusinessOrThrow(user);

    // Prefer READY reel; if none, return the latest (could be UPLOADED/PROCESSING)
    const ready = await this.prisma.reel.findFirst({
      where: { businessId: business.id, processingStatus: VideoProcessingStatus.READY },
      include: { video: true },
    });

    if (ready) return ready;

    return this.prisma.reel.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: { video: true },
    });
  }

  // ============================================================
  // UPSERT (two-phase replacement)
  // ============================================================

  async upsertReel(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    this.validateFile(file);

    const business = await this.getActiveBusinessOrThrow(user);

    // Block if there's already a reel being processed (UPLOADED or PROCESSING)
    const pending = await this.prisma.reel.findFirst({
      where: {
        businessId: business.id,
        processingStatus: {
          in: [VideoProcessingStatus.UPLOADED, VideoProcessingStatus.PROCESSING],
        },
      },
      select: { id: true },
    });

    if (pending) {
      throw new BadRequestException(
        'A reel is already being processed. Please wait until it finishes.',
      );
    }

    const ext = this.guessExt(file.mimetype);
    const storageKey = `public/business/${business.id}/reels/${randomUUID()}.${ext}`;

    let uploaded: { storageKey: string; publicUrl: string } | null = null;

    try {
      uploaded = await this.storage.uploadPublic({
        storageKey,
        contentType: file.mimetype,
        body: createReadStream(file.path),
      });

      // Create new reel WITHOUT deleting the old one.
      // Old READY reel will be cleaned up after the new one reaches READY.
      const created = await this.prisma.$transaction(async (tx) => {
        const videoFile = await tx.file.create({
          data: {
            url: uploaded!.publicUrl,
            storageKey: uploaded!.storageKey,
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

      this.reelProcessing.enqueue(created.id).catch((err) => {
        this.logger.warn(`Failed to enqueue reel ${created.id}: ${String(err)}`);
      });

      return created;
    } catch (err) {
      if (uploaded?.storageKey) {
        await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      }

      throw err;
    } finally {
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  async deleteMyReel(user: User, reelId: string): Promise<void> {
    const business = await this.getActiveBusinessOrThrow(user);

    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      include: { video: true },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.businessId !== business.id) {
      throw new ForbiddenException('Reel does not belong to your business');
    }

    if (
      reel.processingStatus !== VideoProcessingStatus.READY &&
      reel.processingStatus !== VideoProcessingStatus.FAILED
    ) {
      throw new BadRequestException('Reel can only be deleted when status is READY or FAILED');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reel.delete({ where: { id: reelId } });
      await tx.file.delete({ where: { id: reel.videoFileId } });
    });

    // S3 cleanup after transaction
    const keysToDelete = this.collectS3Keys([reel]);
    for (const key of keysToDelete) {
      this.storage
        .deleteObject(key)
        .catch((e) => this.logger.warn(`Failed to delete reel S3 object: ${key} ${String(e)}`));
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private collectS3Keys(
    reels: Array<{
      video: { storageKey: string | null };
      processedUrl: string | null;
      thumbnailUrl: string | null;
    }>,
  ): string[] {
    const keys: string[] = [];

    for (const reel of reels) {
      if (reel.video.storageKey) {
        keys.push(reel.video.storageKey);
      }
      if (reel.processedUrl) {
        const key = this.extractStorageKey(reel.processedUrl);
        if (key) keys.push(key);
      }
      if (reel.thumbnailUrl) {
        const key = this.extractStorageKey(reel.thumbnailUrl);
        if (key) keys.push(key);
      }
    }

    return keys;
  }

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

  private extractStorageKey(publicUrl: string): string | null {
    const idx = publicUrl.indexOf('public/');
    if (idx === -1) return null;
    return decodeURI(publicUrl.slice(idx));
  }
}
