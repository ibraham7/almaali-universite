import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class StudentInputDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  universityId!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  familyName!: string;

  @IsOptional() @IsString() @MaxLength(100)
  middleName?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  motherName?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  nationalId?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  applicationNumber?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  birthPlace?: string | null;

  @IsOptional() @IsString() @MaxLength(200)
  englishName?: string | null;

  @IsOptional() @IsString() @MaxLength(30)
  gender?: string | null;

  @IsOptional() @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  nationality?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  idOrPassport?: string | null;

  @IsOptional() @IsEmail() @MaxLength(200)
  universityEmail?: string | null;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  status?: string;

  @IsOptional() @IsString()
  collegeId?: string | null;

  @IsOptional() @IsString()
  departmentId?: string | null;

  @IsOptional() @IsString()
  programId?: string | null;

  @IsOptional() @IsString()
  studyPlanId?: string | null;

  @IsOptional() @IsString()
  academicYearId?: string | null;

  @IsOptional() @IsString()
  semesterId?: string | null;

  @IsOptional() @IsString()
  advisorId?: string | null;

  @IsOptional() @IsDateString()
  admissionDate?: string | null;
}

// An edit is submitted as a complete form, so the same validation applies.
export class UpdateStudentDto extends StudentInputDto {}
