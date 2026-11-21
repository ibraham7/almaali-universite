import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_COMPLETION', 'REFERRED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export class CreateServiceDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,39}$/, { message: 'رمز الخدمة: أحرف إنجليزية كبيرة وأرقام و _ فقط.' })
  code!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  nameAr!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsInt() @Min(1) @Max(365)
  expectedDays?: number;

  @IsOptional() @IsString() @MaxLength(150)
  specialization?: string;
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  nameAr?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsInt() @Min(1) @Max(365)
  expectedDays?: number;

  @IsOptional() @IsString() @MaxLength(150)
  specialization?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class CreateStaffDto {
  @IsUUID()
  userId!: string;

  @IsOptional() @IsString() @MaxLength(150)
  specialization?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true })
  serviceIds?: string[];
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @MaxLength(150)
  specialization?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true })
  serviceIds?: string[];
}

export class ListRequestsQueryDto {
  @IsOptional() @IsIn(['all', 'new', 'mine', 'waiting', 'referred', 'done'])
  view?: string;

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsUUID()
  serviceId?: string;

  @IsOptional() @IsIn(['NEW', ...STATUSES])
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class ProxyCreateRequestDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  serviceId!: string;

  @IsOptional() @IsString() @MaxLength(200)
  subject?: string;

  @IsOptional() @IsString() @MaxLength(4000)
  details?: string;
}

export class StudentCreateRequestDto {
  @IsUUID()
  serviceId!: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  subject!: string;

  @IsOptional() @IsString() @MaxLength(4000)
  details?: string;
}

export class AssignRequestDto {
  // Omit to take the request yourself (staff) — SYSTEM_ADMIN must name the staff member.
  @IsOptional() @IsUUID()
  staffId?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  reason?: string;
}

export class ChangeStatusDto {
  @IsIn(STATUSES)
  status!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  note?: string;
}

export class CommentDto {
  @IsString() @IsNotEmpty() @MaxLength(2000)
  note!: string;
}

export class StudentSearchQueryDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  q!: string;
}
