import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCourseSectionDto {
  @IsString()
  @IsNotEmpty()
  sectionNumber!: string;

  @IsUUID()
  courseId!: string;

  @IsUUID()
  semesterId!: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @IsInt()
  @Min(1)
  maxCapacity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minEnrollment?: number;
}