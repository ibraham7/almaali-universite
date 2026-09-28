import { IsString, MaxLength, MinLength } from 'class-validator';

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
  nationalId!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  applicationNumber!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  birthPlace!: string;
}

export class CompleteStudentSignupDto {
  @IsString() @MinLength(1)
  verificationToken!: string;
  @IsString() @MinLength(12) @MaxLength(128)
  password!: string;
}
