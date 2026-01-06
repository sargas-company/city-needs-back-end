import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileType, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';

import { UpdateMeDto } from './dto/update-me.dto';

import type { auth } from 'firebase-admin';

const AUTH_TIME_WINDOW_SECONDS = 5 * 60;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async updateAvatar(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Invalid avatar file type');
    }

    // Load current avatar before anything else
    const userWithAvatar = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { avatar: true },
    });

    if (!userWithAvatar) {
      throw new NotFoundException('User not found');
    }

    const oldAvatarId = userWithAvatar.avatar?.id ?? null;
    const oldAvatarStorageKey = userWithAvatar.avatar?.storageKey ?? null;

    // Upload new avatar to S3
    const ext = this.guessExt(file.mimetype);
    const storageKey = `public/users/${user.id}/avatar/${randomUUID()}.${ext}`;

    const uploaded = await this.storage.uploadPublic({
      storageKey,
      contentType: file.mimetype,
      body: file.buffer,
    });

    try {
      // Replace avatar in DB (transaction)
      const newFile = await this.prisma.$transaction(async (tx) => {
        const createdFile = await tx.file.create({
          data: {
            url: uploaded.publicUrl,
            storageKey: uploaded.storageKey,
            type: FileType.AVATAR,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            originalName: file.originalname,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { avatarId: createdFile.id },
        });

        if (oldAvatarId) {
          await tx.file.delete({
            where: { id: oldAvatarId },
          });
        }

        return createdFile;
      });

      // delete old avatar from S3 (AFTER DB commit)
      if (oldAvatarStorageKey) {
        this.storage
          .deleteObject(oldAvatarStorageKey)
          .catch((e) =>
            this.logger.warn(
              `Failed to delete old avatar from S3: ${oldAvatarStorageKey} ${String(e)}`,
            ),
          );
      }

      return {
        id: newFile.id,
        url: uploaded.publicUrl,
      };
    } catch (err) {
      // Rollback uploaded file if DB failed
      await this.storage.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
    }
  }

  async updateMe(user: User, firebaseUser: auth.DecodedIdToken, dto: UpdateMeDto) {
    const { username, email, phone, password } = dto;

    const hasAnyField =
      username !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      password !== undefined;

    if (!hasAnyField) {
      return this.prisma.user.findUnique({ where: { id: user.id } });
    }

    // 🔐 auth_time check (ONLY if sensitive fields)
    if (email || password) {
      const authTime = firebaseUser.auth_time;
      const now = Math.floor(Date.now() / 1000);

      if (!authTime || now - authTime > AUTH_TIME_WINDOW_SECONDS) {
        throw new ForbiddenException('Recent authentication required to change email or password');
      }
    }

    if (email && email !== user.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailOwner && emailOwner.id !== user.id) {
        throw new ConflictException('Email already in use');
      }
    }

    if (phone !== undefined && phone !== null && phone !== user.phone) {
      const phoneOwner = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (phoneOwner && phoneOwner.id !== user.id) {
        throw new ConflictException('Phone already in use');
      }
    }

    try {
      if (email && email !== user.email) {
        await this.firebaseUpdateEmail(firebaseUser.uid, email);
      }

      if (password) {
        await this.firebaseUpdatePassword(firebaseUser.uid, password);
      }
    } catch (e) {
      this.logger.warn(`Firebase update failed: ${String(e)}`);
      throw new BadRequestException('Failed to update authentication credentials');
    }

    const updateData: any = {};

    if (username !== undefined && username !== null) {
      updateData.username = username;
    }

    if (email !== undefined && email !== null) {
      updateData.email = email;
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return updated;
  }

  private guessExt(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'bin';
  }

  private async firebaseUpdateEmail(uid: string, email: string) {
    const admin = await import('firebase-admin');
    await admin.auth().updateUser(uid, { email });
  }

  private async firebaseUpdatePassword(uid: string, password: string) {
    const admin = await import('firebase-admin');
    await admin.auth().updateUser(uid, { password });
  }
}
