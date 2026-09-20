import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddEnrollmentItemDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  enrollmentId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  sectionId!: string;
}