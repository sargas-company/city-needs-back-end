import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileType, Prisma, UploadItemKind, UploadSessionStatus, User } from '@prisma/client';
import convert from 'heic-convert';
import sharp from 'sharp';

import { UploadFileDto } from './dto/upload-file.dto';
import { UploadSessionDto, UploadSessionFileDto } from './dto/upload-session.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

type DraftSessionLoaded = Prisma.UploadSessionGetPayload<{
  include: { items: { include: { file: true } } };
}>;

@Injectable()
export class UploadSessionsService {
  private readonly logger = new Logger(UploadSessionsService.name);

  private readonly MAX_LOGO = 1;
  private readonly MAX_PHOTOS = 4;
  private readonly MAX_DOCUMENTS = 4;
  private readonly MAX_FILE_SIZE_MB = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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

    const counts = this.counts(draft);

    if (dto.kind === UploadItemKind.PHOTO && counts.photosCount >= this.MAX_PHOTOS) {
      throw new BadRequestException(`Max ${this.MAX_PHOTOS} photos allowed`);
    }
    if (dto.kind === UploadItemKind.DOCUMENT && counts.documentsCount >= this.MAX_DOCUMENTS) {
      throw new BadRequestException(`Max ${this.MAX_DOCUMENTS} documents allowed`);
    }

    // Process images (LOGO and PHOTO) - convert to WebP
    let processedBuffer = file.buffer;
    let finalMimeType = file.mimetype;
    let finalExt = this.guessExt(file.mimetype, file.originalname);

    if (dto.kind === UploadItemKind.LOGO || dto.kind === UploadItemKind.PHOTO) {
      // Prepare buffer for processing
      let imageBuffer = file.buffer;

      // Convert HEIC/HEIF to JPEG first (sharp doesn't support them natively)
      if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
        try {
          const jpegBuffer = await convert({
            buffer: file.buffer as unknown as ArrayBufferLike,
            format: 'JPEG',
            quality: 1,
          });
          imageBuffer = Buffer.from(jpegBuffer);
        } catch {
          // heic-convert failed, will attempt to process with sharp directly
          void 0;
        }
      }

      // Convert image to WebP for universal browser support
      const resizeSize = dto.kind === UploadItemKind.LOGO ? 1200 : 1600;
      const webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 85 })
        .resize(resizeSize, resizeSize, { fit: 'inside', withoutEnlargement: true })
        .toBuffer()
        .catch(() => {
          throw new BadRequestException(
            'Unable to process image. Please use JPEG, PNG, WebP, HEIC, or HEIF format.',
          );
        });

      processedBuffer = webpBuffer;
      finalMimeType = 'image/webp';
      finalExt = 'webp';
    }

    // Build storageKey
    const objectId = cryptoRandomUuid();
    const prefix = this.prefixForKind(dto.kind);
    const storageKey = `${prefix}business/${businessId}/${this.kindFolder(dto.kind)}/${objectId}${finalExt ? `.${finalExt}` : ''}`;

    // Upload to S3
    const uploaded = await this.storage.uploadPublic({
      storageKey,
      contentType: finalMimeType,
      body: processedBuffer,
    });

    try {
      // DB transaction: create File + item, and if logo replace old logo item/file in draft
      const saved = await this.prisma.$transaction(async (tx) => {
        // Replace logo if exists
        if (dto.kind === UploadItemKind.LOGO) {
          const oldLogoItem = draft.items.find((i) => i.kind === UploadItemKind.LOGO);
          if (oldLogoItem) {
            // delete DB refs; S3 delete happens after tx
            await tx.uploadSessionItem.delete({ where: { id: oldLogoItem.id } });
            await tx.file.delete({ where: { id: oldLogoItem.fileId } });

            // delete old S3 object after tx
            setImmediate(() => {
              const key = oldLogoItem.file.storageKey;
              if (key)
                this.storage
                  .deleteObject(key)
                  .catch((e) => this.logger.warn(`Failed to delete old logo: ${key} ${String(e)}`));
            });
          }
        }

        const createdFile = await tx.file.create({
          data: {
            url: uploaded.publicUrl,
            storageKey: uploaded.storageKey,
            type: this.fileTypeForKind(dto.kind),
            mimeType: finalMimeType,
            sizeBytes: processedBuffer.length,
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

        const reloaded = await tx.uploadSession.findUniqueOrThrow({
          where: { id: draft.id },
          include: { items: { include: { file: true } } },
        });

        return reloaded;
      });

      return this.toDto(saved);
    } catch (err) {
      // DB failed -> remove uploaded object to avoid orphan
      await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
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
    if (file.size > bytes(this.MAX_FILE_SIZE_MB)) {
      throw new BadRequestException(`Max file size is ${this.MAX_FILE_SIZE_MB}MB`);
    }

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

  private counts(session: DraftSessionLoaded) {
    const logoCount = session.items.filter((i) => i.kind === UploadItemKind.LOGO).length;
    const photosCount = session.items.filter((i) => i.kind === UploadItemKind.PHOTO).length;
    const documentsCount = session.items.filter((i) => i.kind === UploadItemKind.DOCUMENT).length;
    const totalCount = session.items.length;

    return { logoCount, photosCount, documentsCount, totalCount };
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

    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/msword') return 'doc';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      return 'docx';
    if (mime === 'text/plain') return 'txt';

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

    if (c.logoCount > this.MAX_LOGO)
      throw new BadRequestException(`Max ${this.MAX_LOGO} logo allowed`);
    if (c.photosCount > this.MAX_PHOTOS)
      throw new BadRequestException(`Max ${this.MAX_PHOTOS} photos allowed`);
    if (c.documentsCount > this.MAX_DOCUMENTS)
      throw new BadRequestException(`Max ${this.MAX_DOCUMENTS} documents allowed`);
    if (c.totalCount < 1) throw new BadRequestException('At least one file is required');

    const logoItem = draft.items.find((i) => i.kind === UploadItemKind.LOGO) ?? null;

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
    });

    return { committed: true };
  }
}

function cryptoRandomUuid(): string {
  return randomUUID();
}
