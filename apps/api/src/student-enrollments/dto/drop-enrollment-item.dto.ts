import { IsUUID } from 'class-validator';

export class DropEnrollmentItemDto {
  @IsUUID()
  enrollmentItemId!: string;
}