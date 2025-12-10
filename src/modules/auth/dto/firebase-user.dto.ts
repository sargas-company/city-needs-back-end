// src/modules/auth/dto/firebase-user.dto.ts
export class FirebaseUserDto {
  uid!: string;
  email?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  picture?: string | null;
  name?: string | null;
}
