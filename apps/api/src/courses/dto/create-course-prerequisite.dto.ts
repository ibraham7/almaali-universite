import { IsUUID } from 'class-validator';

export class CreateCoursePrerequisiteDto {
  @IsUUID()
  courseId!: string;

  @IsUUID()
  prerequisiteId!: string;
}