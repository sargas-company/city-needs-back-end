// src/modules/verification-files/verification-files.service.ts
import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BusinessVerificationStatus, FileType, User, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class VerificationFilesService {
  private readonly logger = new Logger(VerificationFilesService.name);

  private readonly MAX_FILE_SIZE_MB = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadVerificationFile(user: User, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    if (user.role !== UserRole.BUSINESS_OWNER) throw new ForbiddenException('Only BUSINESS_OWNER');

    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!business) throw new ForbiddenException('Business is required for this action');

    const lastVerification = await this.prisma.businessVerification.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, verificationFileId: true },
    });

    if (
      lastVerification &&
      (lastVerification.status === 'PENDING' || lastVerification.status === 'APPROVED')
    ) {
      throw new ConflictException(
        'Verification is already in progress or approved. New file upload is not allowed',
      );
    }

    if (lastVerification && lastVerification.status === 'REJECTED') {
      const oldFile = await this.prisma.file.findUnique({
        where: { id: lastVerification.verificationFileId },
        select: { id: true, storageKey: true },
      });

      await this.prisma.businessVerification.delete({ where: { id: lastVerification.id } });

      if (oldFile) {
        await this.prisma.file.delete({ where: { id: oldFile.id } });

        if (oldFile.storageKey) {
          await this.storage.deleteObject(oldFile.storageKey).catch((e) => {
            this.logger.warn(
              `Failed to delete rejected verification file from S3: ${oldFile.storageKey} ${String(e)}`,
            );
          });
        }
      }
    }

    // Delete only draft files (not attached to any verification)
    const existingCurrent = await this.prisma.file.findFirst({
      where: {
        businessId: business.id,
        type: FileType.BUSINESS_VERIFICATION_DOCUMENT,
        verification: null, // Only delete files not attached to verification
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, storageKey: true },
    });

    if (existingCurrent) {
      await this.prisma.file.delete({ where: { id: existingCurrent.id } });
      if (existingCurrent.storageKey) {
        await this.storage.deleteObject(existingCurrent.storageKey).catch((e) => {
          this.logger.warn(
            `Failed to delete old draft verification file from S3: ${existingCurrent.storageKey} ${String(e)}`,
          );
        });
      }
    }

    this.validateVerificationUpload(file);

    const ext = this.guessExt(file.mimetype, file.originalname);
    const objectId = randomUUID();
    const storageKey = `private/business/${business.id}/verification/${objectId}${ext ? `.${ext}` : ''}`;

    await this.storage.uploadPrivate({
      storageKey,
      contentType: file.mimetype,
      body: file.buffer,
    });

    try {
      const created = await this.prisma.file.create({
        data: {
          url: '',
          storageKey,
          type: FileType.BUSINESS_VERIFICATION_DOCUMENT,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          originalName: file.originalname,
          businessId: business.id,
        },
        select: {
          id: true,
          url: true,
          type: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      });

      const url = `/files/${created.id}/signed-url`;

      const updated = await this.prisma.file.update({
        where: { id: created.id },
        data: { url },
        select: {
          id: true,
          url: true,
          type: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      });

      return {
        id: updated.id,
        url: updated.url,
        type: updated.type,
        originalName: updated.originalName ?? null,
        mimeType: updated.mimeType ?? null,
        sizeBytes: updated.sizeBytes ?? null,
      };
    } catch (err) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw err;
    }
  }

  async getCurrentVerificationFile(user: User) {
    if (user.role !== UserRole.BUSINESS_OWNER) throw new ForbiddenException('Only BUSINESS_OWNER');

    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!business) throw new ForbiddenException('Business is required for this action');

    // 1. First check for submitted verification (file attached to verification)
    const verification = await this.prisma.businessVerification.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        verificationFile: true,
      },
    });

    if (verification?.verificationFile) {
      const file = verification.verificationFile;
      return {
        id: file.id,
        url: file.url,
        type: file.type,
        originalName: file.originalName ?? null,
        mimeType: file.mimeType ?? null,
        sizeBytes: file.sizeBytes ?? null,
        createdAt: file.createdAt,
        lock: {
          id: verification.id,
          status: verification.status,
          rejectionReason: verification.rejectionReason ?? null,
          reviewedAt: verification.reviewedAt ?? null,
        },
      };
    }

    // 2. Fallback — draft file (not yet submitted)
    const draftFile = await this.prisma.file.findFirst({
      where: {
        businessId: business.id,
        type: FileType.BUSINESS_VERIFICATION_DOCUMENT,
        verification: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        type: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    if (!draftFile) return null;

    return {
      id: draftFile.id,
      url: draftFile.url,
      type: draftFile.type,
      originalName: draftFile.originalName ?? null,
      mimeType: draftFile.mimeType ?? null,
      sizeBytes: draftFile.sizeBytes ?? null,
      createdAt: draftFile.createdAt,
      lock: null,
    };
  }

  async getSignedUrl(user: User, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, businessId: true, storageKey: true, type: true },
    });

    if (!file) throw new NotFoundException('File not found');

    if (file.type !== FileType.BUSINESS_VERIFICATION_DOCUMENT) {
      throw new ForbiddenException('Not a verification file');
    }
    if (!file.storageKey || !file.storageKey.startsWith('private/')) {
      throw new ForbiddenException('File is not private');
    }

    await this.assertOwnerOrAdmin(user, file.businessId);

    const signedUrl = await this.storage.getSignedDownloadUrl(file.storageKey, 300);
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    return { url: signedUrl, expiresAt };
  }

  async deleteVerificationFile(user: User, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, businessId: true, storageKey: true, type: true },
    });
    if (!file) throw new NotFoundException('File not found');

    if (file.type !== FileType.BUSINESS_VERIFICATION_DOCUMENT) {
      throw new ForbiddenException('Not a verification file');
    }

    await this.assertOwnerOrAdmin(user, file.businessId);

    // Block deletion of files attached to ANY verification (preserve history)
    const attached = await this.prisma.businessVerification.findFirst({
      where: { verificationFileId: file.id },
      select: { id: true, status: true },
    });

    if (attached) {
      throw new ConflictException(
        `Cannot delete file attached to verification (status: ${attached.status}). Only draft files can be deleted.`,
      );
    }

    const storageKey = file.storageKey;

    await this.prisma.file.delete({ where: { id: file.id } });

    if (storageKey) {
      await this.storage.deleteObject(storageKey).catch((e) => {
        this.logger.warn(`Failed to delete S3 object: ${storageKey} ${String(e)}`);
      });
    }
  }

  private async assertVerificationNotLockedForUpload(businessId: string) {
    const locked = await this.prisma.businessVerification.findFirst({
      where: {
        businessId,
        status: { in: [BusinessVerificationStatus.PENDING, BusinessVerificationStatus.APPROVED] },
      },
      select: { id: true, status: true },
    });

    if (locked) {
      throw new ConflictException(
        `Verification is locked (${locked.status}). You cannot upload a new verification file.`,
      );
    }
  }

  private async assertOwnerOrAdmin(user: User, businessId: string | null) {
    if (user.role === UserRole.ADMIN) return;

    if (user.role !== UserRole.BUSINESS_OWNER) throw new ForbiddenException('Forbidden');
    if (!businessId) throw new ForbiddenException('Forbidden');

    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!business || business.id !== businessId) throw new ForbiddenException('Forbidden');
  }

  private validateVerificationUpload(file: Express.Multer.File) {
    const bytes = (mb: number) => mb * 1024 * 1024;
    if (file.size > bytes(this.MAX_FILE_SIZE_MB)) {
      throw new BadRequestException(`Max file size is ${this.MAX_FILE_SIZE_MB}MB`);
    }

    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]);

    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(`Invalid mimetype ${file.mimetype} for verification document`);
    }
  }

  private guessExt(mime: string, originalName: string): string | null {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
    if (lower.endsWith('.png')) return 'png';
    if (lower.endsWith('.webp')) return 'webp';
    if (lower.endsWith('.heic')) return 'heic';
    if (lower.endsWith('.heif')) return 'heif';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc')) return 'doc';
    if (lower.endsWith('.docx')) return 'docx';
    if (lower.endsWith('.txt')) return 'txt';

    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/heic') return 'heic';
    if (mime === 'image/heif') return 'heif';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/msword') return 'doc';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      return 'docx';
    if (mime === 'text/plain') return 'txt';

    return null;
  }
}
