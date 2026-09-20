import {
  IsEnum,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';

import { CourseRequirement } from '../../generated/prisma/enums.js';

export class CreateStudyPlanCourseDto {
  @IsUUID()
  studyPlanId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  courseId!: string;

  @IsInt()
  @Min(1)
  priority!: number;

  @IsEnum(CourseRequirement)
  requirement!: CourseRequirement;
}