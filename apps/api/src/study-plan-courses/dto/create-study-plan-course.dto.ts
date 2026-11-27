import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { CourseRequirement, CurriculumCategory } from '../../generated/prisma/enums.js';

export class CreateStudyPlanCourseDto {
  @IsUUID()
  studyPlanId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  semesterId!: string;

  @IsUUID()
  courseId!: string;

  @IsInt()
  @Min(1)
  priority!: number;

  @IsEnum(CourseRequirement)
  requirement!: CourseRequirement;

  // نوع المتطلب: جامعة / كلية / برنامج.
  @IsOptional()
  @IsEnum(CurriculumCategory)
  category?: CurriculumCategory;

  // الساعات المعتمدة ضمن الخطة (الفارغ = ساعات المقرر العامة).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  creditsInPlan?: number;

  // المتطلبات السابقة ضمن الخطة (مقررات من الخطة نفسها وفصول أبكر). إن أُرسلت (حتى فارغة) تصبح هي المعتمدة لهذه الخطة.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  prerequisiteCourseIds?: string[];
}
