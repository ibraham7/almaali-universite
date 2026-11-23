import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RemoveStudyPlanCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'سبب الإزالة مطلوب.' })
  @MaxLength(500)
  reason!: string;
}
