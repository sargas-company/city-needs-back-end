import { ApiProperty } from '@nestjs/swagger';

export class GetUserDto {
  @ApiProperty()
  declare clerkId: string;

  @ApiProperty({ nullable: true })
  declare username?: string;
}
