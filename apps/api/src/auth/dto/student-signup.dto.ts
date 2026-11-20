import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StudentSignupDto {
  @IsString() @MinLength(1) @MaxLength(50)
  universityId!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  fullName!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  fatherName!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  motherName!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  applicationNumber!: string;
  // اختيارية: تُطلب فقط إذا كانت مسجلة في سجل الطالب (ملف الوزارة لا يتضمن الرقم الوطني ومكان الولادة)
  @IsOptional() @IsString() @MaxLength(100)
  nationalId?: string;
  @IsOptional() @IsString() @MaxLength(100)
  birthPlace?: string;
  @IsOptional() @IsString() @MaxLength(20)
  dateOfBirth?: string;
}

export class CompleteStudentSignupDto {
  @IsString() @MinLength(1)
  verificationToken!: string;
  @IsString() @MinLength(12) @MaxLength(128)
  password!: string;
}
