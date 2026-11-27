import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { CourseRequirement, CurriculumCategory } from '../../generated/prisma/enums.js';

// تعديل خصائص مقرر داخل مسودة الخطة. null يمسح القيمة (الساعات: ترجع لساعات المقرر العامة).
export class UpdateStudyPlanCourseDto {
  @IsOptional()
  @IsEnum(CourseRequirement)
  requirement?: CourseRequirement;

  @IsOptional()
  @IsEnum(CurriculumCategory)
  category?: CurriculumCategory | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  creditsInPlan?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  prerequisiteCourseIds?: string[];
}
