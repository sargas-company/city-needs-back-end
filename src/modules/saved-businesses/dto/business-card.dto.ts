import { ApiProperty } from '@nestjs/swagger';

export class SavedBusinessCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'Toronto' })
  city!: string;

  @ApiProperty({ nullable: true, example: 'https://cdn.app/logo.png' })
  logoUrl!: string | null;
}
