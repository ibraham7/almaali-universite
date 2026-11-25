import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

// REFERRED is reached only through a referral record (see the referral endpoints).
const STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_COMPLETION', 'REFERRED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

class ServiceSetupDto {
  @IsOptional() @IsIn(['ONLINE', 'IN_PERSON', 'BOTH'])
  channel?: string;

  @IsOptional() @IsIn(['NONE', 'DOCUMENT', 'ACTION', 'BOTH'])
  outcome?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  attachmentsNote?: string;

  @IsOptional() @IsString() @MaxLength(300)
  feeNote?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  workflowNote?: string;

  // Document this service issues (null removes the link).
  @IsOptional() @IsUUID()
  documentTypeId?: string | null;
}

export class CreateServiceDto extends ServiceSetupDto {
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

export class UpdateServiceDto extends ServiceSetupDto {
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

  @IsOptional() @IsIn(['ONLINE', 'IN_PERSON'])
  channel?: string;

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

export class CreateReferralDto {
  @IsIn(['OPINION', 'EXECUTION'])
  mode!: string;

  @IsIn(['ACADEMIC_AFFAIRS', 'FINANCIAL_AFFAIRS', 'COLLEGE', 'OTHER'])
  target!: string;

  // Name of the college / body (required for COLLEGE and OTHER).
  @IsOptional() @IsString() @MaxLength(150)
  targetName?: string;

  @IsString() @IsNotEmpty() @MaxLength(1000)
  reason!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  requested?: string;

  @IsOptional() @IsInt() @Min(1) @Max(365)
  dueInDays?: number;
}

export class RespondReferralDto {
  @IsIn(['APPROVED', 'REJECTED', 'NOTES', 'DONE', 'NOT_DONE'])
  outcome!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  note?: string;
}

export class CancelReferralDto {
  @IsString() @IsNotEmpty() @MaxLength(1000)
  reason!: string;
}

export class ListReferralsQueryDto {
  @IsOptional() @IsIn(['PENDING', 'ANSWERED', 'CANCELLED'])
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;
}

export class ListStudentsQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;
}

export class ArchiveAttachmentDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}

export class CreateDocumentTypeDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,39}$/, { message: 'رمز النوع: أحرف إنجليزية كبيرة وأرقام و _ فقط.' })
  code!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  nameAr!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  titleAr!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  issuingBody!: string;

  @IsString() @IsNotEmpty() @MaxLength(4000)
  bodyTemplate!: string;

  @IsOptional() @IsString() @MaxLength(500)
  footerNote?: string;

  @IsOptional() @IsBoolean()
  includesResults?: boolean;
}

export class UpdateDocumentTypeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  nameAr?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  titleAr?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  issuingBody?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(4000)
  bodyTemplate?: string;

  @IsOptional() @IsString() @MaxLength(500)
  footerNote?: string;

  @IsOptional() @IsBoolean()
  includesResults?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class RevokeDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}

export class ListDocumentsQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsIn(['ACTIVE', 'REVOKED'])
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;
}
