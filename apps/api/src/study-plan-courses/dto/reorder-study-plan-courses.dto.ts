import { Type } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class StudyPlanCourseOrderItemDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  priority!: number;
}

export class ReorderStudyPlanCoursesDto {
  @IsUUID()
  studyPlanId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudyPlanCourseOrderItemDto)
  items!: StudyPlanCourseOrderItemDto[];
}