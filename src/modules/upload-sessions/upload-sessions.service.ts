import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { unlink } from 'fs/promises';
import { promisify } from 'util';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FileType,
  Prisma,
  UploadItemKind,
  UploadSessionStatus,
  User,
  VideoProcessingStatus,
} from '@prisma/client';
import convert from 'heic-convert';
import sharp from 'sharp';

import { UploadFileDto } from './dto/upload-file.dto';
import { UploadSessionDto, UploadSessionFileDto } from './dto/upload-session.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { VideoProcessingService } from '../video-processing/video-processing.service';

type DraftSessionLoaded = Prisma.UploadSessionGetPayload<{
  include: { items: { include: { file: true } } };
}>;

const execFileAsync = promisify(execFile);
const MAX_VIDEO_DURATION_SECONDS = 60;

@Injectable()
export class UploadSessionsService {
  private readonly logger = new Logger(UploadSessionsService.name);

  private readonly MAX_LOGO = 1;
  private readonly MAX_PHOTOS = 15;
  private readonly MIN_PHOTOS = 1;
  private readonly MAX_DOCUMENTS = 4;
  private readonly MAX_VIDEOS = 1;
  private readonly MAX_FILE_SIZE_MB = 15;
  private readonly MAX_VIDEO_SIZE_MB = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly videoProcessing: VideoProcessingService,
  ) {}

  async getOrCreateDraft(user: User): Promise<UploadSessionDto> {
    const businessId = await this.getBusinessIdOrThrow(user);

    const existing = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return this.toDto(existing);

    // Create new DRAFT (DB: 1 draft - partial unique index)
    const created = await this.prisma.uploadSession.create({
      data: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
    });

    return this.toDto(created);
  }

  async getDraft(user: User): Promise<UploadSessionDto> {
    const businessId = await this.getBusinessIdOrThrow(user);

    const existing = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      throw new NotFoundException('Draft upload session not found');
    }

    return this.toDto(existing);
  }

  async uploadFile(
    user: User,
    dto: UploadFileDto,
    file: Express.Multer.File,
  ): Promise<UploadSessionDto> {
    if (!file) throw new BadRequestException('file is required');

    const businessId = await this.getBusinessIdOrThrow(user);

    const draft = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!draft) {
      throw new ConflictException(
        'Draft upload session is required. Call POST /onboarding/upload-session.',
      );
    }

    this.validateUpload(dto.kind, file);

    if (dto.kind === UploadItemKind.VIDEO) {
      await this.validateVideoDuration(file.path);
    }

    const counts = this.counts(draft);

    if (dto.kind === UploadItemKind.PHOTO && counts.photosCount >= this.MAX_PHOTOS) {
      throw new BadRequestException(`Max ${this.MAX_PHOTOS} photos allowed`);
    }

    if (dto.kind === UploadItemKind.DOCUMENT && counts.documentsCount >= this.MAX_DOCUMENTS) {
      throw new BadRequestException(`Max ${this.MAX_DOCUMENTS} documents allowed`);
    }

    // VIDEO: no count check — replacement handled in transaction

    const objectId = cryptoRandomUuid();
    const prefix = this.prefixForKind(dto.kind);
    const finalExt = this.guessExt(file.mimetype, file.originalname);
    const storageKey = `${prefix}business/${businessId}/${this.kindFolder(
      dto.kind,
    )}/${objectId}${finalExt ? `.${finalExt}` : ''}`;

    let uploaded: { storageKey: string; publicUrl: string } | null = null;

    try {
      // =============================
      // IMAGE (LOGO / PHOTO)
      // =============================
      if (dto.kind === UploadItemKind.LOGO || dto.kind === UploadItemKind.PHOTO) {
        const fileBuffer = await fs.readFile(file.path);
        let imageBuffer = fileBuffer;

        if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
          const jpegBuffer = await convert({
            buffer: fileBuffer as unknown as ArrayBufferLike,
            format: 'JPEG',
            quality: 1,
          });
          imageBuffer = Buffer.from(jpegBuffer);
        }

        const resizeSize = dto.kind === UploadItemKind.LOGO ? 1200 : 1600;

        const webpBuffer = await sharp(imageBuffer)
          .webp({ quality: 85 })
          .resize(resizeSize, resizeSize, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        uploaded = await this.storage.uploadPublic({
          storageKey,
          contentType: 'image/webp',
          body: webpBuffer,
        });
      } else {
        // =============================
        // VIDEO or DOCUMENT → STREAM
        // =============================
        uploaded = await this.storage.uploadPublic({
          storageKey,
          contentType: file.mimetype,
          body: createReadStream(file.path),
        });
      }

      if (!uploaded) {
        throw new InternalServerErrorException('Upload failed unexpectedly');
      }
      const safeUploaded = uploaded;

      // =============================
      // DB TRANSACTION
      // =============================
      const saved = await this.prisma.$transaction(async (tx) => {
        // Replace LOGO
        if (dto.kind === UploadItemKind.LOGO) {
          const oldLogoItem = draft.items.find((i) => i.kind === UploadItemKind.LOGO);
          if (oldLogoItem) {
            await tx.uploadSessionItem.delete({ where: { id: oldLogoItem.id } });
            await tx.file.delete({ where: { id: oldLogoItem.fileId } });

            if (oldLogoItem.file.storageKey) {
              setImmediate(
                () =>
                  void this.storage
                    .deleteObject(oldLogoItem.file.storageKey!)
                    .catch((e) =>
                      this.logger.warn(
                        `Failed to delete old logo S3: ${oldLogoItem.file.storageKey} ${String(e)}`,
                      ),
                    ),
              );
            }
          }
        }

        // Replace VIDEO (max 1)
        if (dto.kind === UploadItemKind.VIDEO) {
          const oldVideoItem = draft.items.find((i) => i.kind === UploadItemKind.VIDEO);
          if (oldVideoItem) {
            await tx.uploadSessionItem.delete({ where: { id: oldVideoItem.id } });
            await tx.file.delete({ where: { id: oldVideoItem.fileId } });

            if (oldVideoItem.file.storageKey) {
              setImmediate(
                () =>
                  void this.storage
                    .deleteObject(oldVideoItem.file.storageKey!)
                    .catch((e) =>
                      this.logger.warn(
                        `Failed to delete old video S3: ${oldVideoItem.file.storageKey} ${String(e)}`,
                      ),
                    ),
              );
            }
          }
        }

        const createdFile = await tx.file.create({
          data: {
            url: safeUploaded.publicUrl,
            storageKey: safeUploaded.storageKey,
            type: this.fileTypeForKind(dto.kind),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            originalName: file.originalname,
            businessId: null,
          },
        });

        await tx.uploadSessionItem.create({
          data: {
            sessionId: draft.id,
            fileId: createdFile.id,
            kind: dto.kind,
          },
        });

        return tx.uploadSession.findUniqueOrThrow({
          where: { id: draft.id },
          include: { items: { include: { file: true } } },
        });
      });

      return this.toDto(saved);
    } catch (err) {
      // If DB fails → cleanup uploaded S3 object
      if (uploaded?.storageKey) {
        await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      }

      throw err;
    } finally {
      // Always remove temp file
      await unlink(file.path).catch(() => undefined);
    }
  }

  async deleteFile(user: User, fileId: string): Promise<UploadSessionDto> {
    const businessId = await this.getBusinessIdOrThrow(user);

    const draft = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!draft) {
      throw new NotFoundException('Draft upload session not found');
    }

    const item = draft.items.find((i) => i.fileId === fileId);
    if (!item) {
      throw new NotFoundException('File not found in current draft session');
    }

    const storageKey = item.file.storageKey;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.uploadSessionItem.delete({ where: { id: item.id } });
      await tx.file.delete({ where: { id: fileId } });

      return tx.uploadSession.findUniqueOrThrow({
        where: { id: draft.id },
        include: { items: { include: { file: true } } },
      });
    });

    if (storageKey) {
      await this.storage.deleteObject(storageKey).catch((e) => {
        this.logger.warn(`Failed to delete S3 object after DB delete: ${storageKey} ${String(e)}`);
      });
    }

    return this.toDto(updated);
  }

  async abortDraft(user: User): Promise<{ aborted: true }> {
    const businessId = await this.getBusinessIdOrThrow(user);

    const draft = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!draft) return { aborted: true };

    const keys = draft.items.map((i) => i.file.storageKey).filter(Boolean) as string[];

    await this.prisma.$transaction(async (tx) => {
      // Keep history: mark session ABORTED, delete items+files
      await tx.uploadSession.update({
        where: { id: draft.id },
        data: { status: UploadSessionStatus.ABORTED },
      });

      // delete items first (FK)
      await tx.uploadSessionItem.deleteMany({ where: { sessionId: draft.id } });

      // delete files records that were only for the draft
      await tx.file.deleteMany({ where: { id: { in: draft.items.map((i) => i.fileId) } } });
    });

    // S3 cleanup
    await Promise.allSettled(keys.map((k) => this.storage.deleteObject(k)));

    return { aborted: true };
  }

  // Helpers

  private async getBusinessIdOrThrow(user: User): Promise<string> {
    // User -> Business is 1:1 via Business.ownerUserId unique
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, ownerUserId: true },
    });

    if (!business) {
      throw new ForbiddenException('Business is required for this action');
    }

    return business.id;
  }

  private validateUpload(kind: UploadItemKind, file: Express.Multer.File) {
    const bytes = (mb: number) => mb * 1024 * 1024;

    const allowedImages = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    const allowedDocs = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]);
    const allowedVideos = new Set(['video/mp4', 'video/quicktime']);

    if (kind === UploadItemKind.VIDEO) {
      if (file.size > bytes(this.MAX_VIDEO_SIZE_MB)) {
        throw new BadRequestException(`Max video file size is ${this.MAX_VIDEO_SIZE_MB}MB`);
      }
      if (!allowedVideos.has(file.mimetype)) {
        throw new BadRequestException(
          `Invalid mimetype ${file.mimetype} for VIDEO. Allowed: mp4, mov`,
        );
      }
      return;
    }

    if (file.size > bytes(this.MAX_FILE_SIZE_MB)) {
      throw new BadRequestException(`Max file size is ${this.MAX_FILE_SIZE_MB}MB`);
    }

    if (kind === UploadItemKind.LOGO || kind === UploadItemKind.PHOTO) {
      if (!allowedImages.has(file.mimetype)) {
        throw new BadRequestException(`Invalid mimetype ${file.mimetype} for ${kind}`);
      }
    }

    if (kind === UploadItemKind.DOCUMENT) {
      if (!allowedDocs.has(file.mimetype)) {
        throw new BadRequestException(`Invalid mimetype ${file.mimetype} for DOCUMENT`);
      }
    }
  }

  private async validateVideoDuration(filePath: string): Promise<void> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const duration = Number(data.format?.duration);

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new BadRequestException('Unable to read video duration. File may be corrupted.');
      }

      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        throw new BadRequestException(
          `Video duration ${Math.round(duration)}s exceeds max ${MAX_VIDEO_DURATION_SECONDS}s`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unable to read video file. Ensure it is a valid video.');
    }
  }

  private counts(session: DraftSessionLoaded) {
    const logoCount = session.items.filter((i) => i.kind === UploadItemKind.LOGO).length;
    const photosCount = session.items.filter((i) => i.kind === UploadItemKind.PHOTO).length;
    const documentsCount = session.items.filter((i) => i.kind === UploadItemKind.DOCUMENT).length;
    const videosCount = session.items.filter((i) => i.kind === UploadItemKind.VIDEO).length;
    const totalCount = session.items.length;

    return { logoCount, photosCount, documentsCount, videosCount, totalCount };
  }

  private toDto(session: DraftSessionLoaded): UploadSessionDto {
    const c = this.counts(session);

    const files: UploadSessionFileDto[] = session.items.map((i) => ({
      id: i.file.id,
      type: i.file.type,
      url: i.file.url,
      storageKey: i.file.storageKey ?? null,
      originalName: i.file.originalName ?? null,
      mimeType: i.file.mimeType ?? null,
      sizeBytes: i.file.sizeBytes ?? null,
      kind: i.kind,
    }));

    return {
      id: session.id,
      status: session.status,
      logoCount: c.logoCount,
      photosCount: c.photosCount,
      documentsCount: c.documentsCount,
      videosCount: c.videosCount,
      totalCount: c.totalCount,
      files,
    };
  }

  private fileTypeForKind(kind: UploadItemKind): FileType {
    switch (kind) {
      case UploadItemKind.LOGO:
        return FileType.BUSINESS_LOGO;
      case UploadItemKind.PHOTO:
        return FileType.BUSINESS_PHOTO;
      case UploadItemKind.DOCUMENT:
        return FileType.BUSINESS_DOCUMENT;
      case UploadItemKind.VIDEO:
        return FileType.BUSINESS_VIDEO;
      default:
        return FileType.OTHER;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private prefixForKind(_kind: UploadItemKind) {
    // private/
    return 'public/';
  }

  private kindFolder(kind: UploadItemKind) {
    if (kind === UploadItemKind.LOGO) return 'logo';
    if (kind === UploadItemKind.PHOTO) return 'photos';
    if (kind === UploadItemKind.VIDEO) return 'videos';
    return 'documents';
  }

  private guessExt(mime: string, originalName: string): string | null {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
    if (lower.endsWith('.png')) return 'png';
    if (lower.endsWith('.webp')) return 'webp';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc')) return 'doc';
    if (lower.endsWith('.docx')) return 'docx';
    if (lower.endsWith('.txt')) return 'txt';
    if (lower.endsWith('.mp4')) return 'mp4';
    if (lower.endsWith('.mov')) return 'mov';

    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/msword') return 'doc';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      return 'docx';
    if (mime === 'text/plain') return 'txt';
    if (mime === 'video/mp4') return 'mp4';
    if (mime === 'video/quicktime') return 'mov';

    return null;
  }

  async commitDraftForOnboarding(user: User): Promise<{ committed: true }> {
    const businessId = await this.getBusinessIdOrThrow(user);

    const draft = await this.prisma.uploadSession.findFirst({
      where: { businessId, status: UploadSessionStatus.DRAFT },
      include: { items: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!draft) {
      throw new ConflictException('Draft upload session not found');
    }

    const c = this.counts(draft);

    if (c.logoCount < 1) throw new BadRequestException('Logo is required');
    if (c.logoCount > this.MAX_LOGO)
      throw new BadRequestException(`Max ${this.MAX_LOGO} logo allowed`);
    if (c.photosCount < this.MIN_PHOTOS)
      throw new BadRequestException(`At least ${this.MIN_PHOTOS} photo is required`);
    if (c.photosCount > this.MAX_PHOTOS)
      throw new BadRequestException(`Max ${this.MAX_PHOTOS} photos allowed`);
    if (c.documentsCount > this.MAX_DOCUMENTS)
      throw new BadRequestException(`Max ${this.MAX_DOCUMENTS} documents allowed`);
    if (c.videosCount > this.MAX_VIDEOS)
      throw new BadRequestException(`Max ${this.MAX_VIDEOS} video allowed`);

    const logoItem = draft.items.find((i) => i.kind === UploadItemKind.LOGO) ?? null;
    const videoItem = draft.items.find((i) => i.kind === UploadItemKind.VIDEO) ?? null;

    // Block commit if existing video is still being processed
    if (videoItem) {
      const existingVideo = await this.prisma.businessVideo.findUnique({
        where: { businessId },
        select: { processingStatus: true },
      });

      if (
        existingVideo &&
        existingVideo.processingStatus !== VideoProcessingStatus.READY &&
        existingVideo.processingStatus !== VideoProcessingStatus.FAILED
      ) {
        throw new ConflictException(
          'Existing video is still being processed. Please wait until it finishes.',
        );
      }
    }

    // Collect old BusinessVideo S3 keys to delete AFTER transaction
    const oldVideoS3Keys: string[] = [];
    let createdVideoId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.uploadSession.update({
        where: { id: draft.id },
        data: { status: UploadSessionStatus.COMMITTED },
      });

      await tx.file.updateMany({
        where: { id: { in: draft.items.map((i) => i.fileId) } },
        data: { businessId },
      });

      if (logoItem) {
        await tx.business.update({
          where: { id: businessId },
          data: { logoId: logoItem.fileId },
        });
      }

      if (videoItem) {
        // Cleanup old BusinessVideo if exists
        const oldVideo = await tx.businessVideo.findUnique({
          where: { businessId },
          include: { videoFile: { select: { storageKey: true } } },
        });

        if (oldVideo) {
          if (oldVideo.processedUrl) {
            const key = this.extractStorageKey(oldVideo.processedUrl);
            if (key) oldVideoS3Keys.push(key);
          }
          if (oldVideo.thumbnailUrl) {
            const key = this.extractStorageKey(oldVideo.thumbnailUrl);
            if (key) oldVideoS3Keys.push(key);
          }
          if (oldVideo.videoFile.storageKey) {
            oldVideoS3Keys.push(oldVideo.videoFile.storageKey);
          }

          await tx.businessVideo.delete({ where: { id: oldVideo.id } });
          await tx.file.delete({ where: { id: oldVideo.videoFileId } });
        }

        // Create new BusinessVideo
        const created = await tx.businessVideo.create({
          data: {
            businessId,
            videoFileId: videoItem.fileId,
            processingStatus: 'UPLOADED',
          },
        });
        createdVideoId = created.id;
      }
    });

    // After transaction: cleanup old S3 files
    if (oldVideoS3Keys.length > 0) {
      await Promise.allSettled(
        oldVideoS3Keys.map((key) =>
          this.storage.deleteObject(key).catch((e) => {
            this.logger.warn(`Failed to delete old video S3 object: ${key} ${String(e)}`);
          }),
        ),
      );
    }

    // After transaction: enqueue video processing (fire-and-forget so Redis downtime doesn't block the response)
    if (createdVideoId) {
      this.videoProcessing.enqueue(createdVideoId).catch((err) => {
        this.logger.error(
          `Failed to enqueue video ${createdVideoId}: ${String(err)}. Video stays in UPLOADED.`,
        );
      });
    }

    return { committed: true };
  }

  private extractStorageKey(publicUrl: string): string | null {
    const idx = publicUrl.indexOf('public/');
    if (idx === -1) return null;
    return decodeURI(publicUrl.slice(idx));
  }
}

function cryptoRandomUuid(): string {
  return randomUUID();
}
