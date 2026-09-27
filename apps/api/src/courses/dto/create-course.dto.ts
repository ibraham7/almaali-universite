import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @IsInt()
  @Min(1)
  credits!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ects?: number;

  @IsIn(['THEORY', 'PRACTICAL'])
  type!: 'THEORY' | 'PRACTICAL';

  @IsIn(['MANDATORY', 'ELECTIVE'])
  requirement!: 'MANDATORY' | 'ELECTIVE';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  // المقرر عند إنشائه يجب أن يوضع مباشرة داخل مساره الأكاديمي.
  @IsUUID()
  studyPlanId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  semesterId!: string;
}
