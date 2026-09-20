import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateStudentEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  semesterId!: string;
}