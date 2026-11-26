import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StudentInputDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  universityId!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @IsOptional() @IsString() @MaxLength(100)
  familyName?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  meritNumber?: string | null;

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

// اعتماد التسجيل: ربط طلاب مستوردين (بدون خطة) بخطتهم الدراسية.
export class ApproveRegistrationDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5000) @IsString({ each: true })
  studentIds!: string[];

  @IsString() @IsNotEmpty()
  collegeId!: string;

  @IsString() @IsNotEmpty()
  departmentId!: string;

  @IsString() @IsNotEmpty()
  programId!: string;

  @IsString() @IsNotEmpty()
  studyPlanId!: string;

  @IsString() @IsNotEmpty()
  academicYearId!: string;

  @IsString() @IsNotEmpty()
  semesterId!: string;
}

// نقل الطالب إلى كلية أخرى: رقم جامعي جديد برمز الكلية الجديدة (السنة الأصلية نفسها)، والرقم القديم يُحفظ.
export class TransferCollegeDto {
  @IsString() @IsNotEmpty()
  collegeId!: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;

  // يُستخدم فقط إذا كان رقم الطالب الحالي لا يتبع صيغة (سنة + كلية + تسلسل)
  @IsOptional() @IsInt() @Min(2000) @Max(2099)
  admissionYear?: number;
}

// حذف جماعي للطلاب: مرحلة التجريب فقط، ويتطلب كتابة كلمة التأكيد.
export class BulkDeleteStudentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5000) @IsString({ each: true })
  studentIds!: string[];

  @IsString() @IsNotEmpty()
  confirm!: string;
}

// تغيير حالة الطالب (أكاديمية/إدارية): السبب إلزامي.
export class ChangeStudentStatusDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  status!: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;

  // مطلوب عند التأجيل: تاريخ العودة (YYYY-MM-DD). يرجع الطالب «مستمر» تلقائيًا عند وصوله.
  @IsOptional() @IsDateString()
  returnDate?: string;
}
