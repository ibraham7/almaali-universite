import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DropEnrollmentItemDto {
  @IsUUID()
  enrollmentItemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
