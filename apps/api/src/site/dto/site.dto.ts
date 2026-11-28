import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const KINDS = ['STAT', 'VALUE', 'GOAL', 'MILESTONE', 'ADMISSION_STEP', 'FAQ', 'NEWS_CATEGORY', 'ORG_NODE', 'QUICK_LINK'] as const;
const ENTRY_KIND_LIST = ['EVENT', 'RESEARCH', 'GRADUATE_STORY', 'GRADUATE_NEWS', 'CAMPUS'] as const;

// قيم النصوص المفردة: المفاتيح المسموحة والحدود تُفحص بالخدمة.
export class UpdateSettingsDto {
  @IsObject()
  values!: Record<string, string>;
}

export class CreateItemDto {
  @IsIn(KINDS)
  kind!: (typeof KINDS)[number];

  @IsString() @IsNotEmpty() @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() @MaxLength(3000)
  text?: string;

  @IsOptional() @IsString() @MaxLength(300)
  extra?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;

  @IsOptional() @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}

export class UpdateItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  text?: string;

  @IsOptional() @IsString() @MaxLength(300)
  extra?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;
}

export class ChangeStatusDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}

export class CreateNewsDto {
  @IsOptional() @IsIn(['NEWS', 'ANNOUNCEMENT'])
  type?: 'NEWS' | 'ANNOUNCEMENT';

  @IsString() @IsNotEmpty() @MaxLength(250)
  title!: string;

  @IsOptional() @IsString() @MaxLength(120)
  category?: string;

  @IsOptional() @IsString() @MaxLength(600)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(20000)
  body?: string;

  @IsOptional() @IsUUID()
  coverMediaId?: string | null;
}

export class UpdateNewsDto {
  @IsOptional() @IsIn(['NEWS', 'ANNOUNCEMENT'])
  type?: 'NEWS' | 'ANNOUNCEMENT';

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250)
  title?: string;

  @IsOptional() @IsString() @MaxLength(120)
  category?: string;

  @IsOptional() @IsString() @MaxLength(600)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(20000)
  body?: string;

  @IsOptional() @IsUUID()
  coverMediaId?: string | null;
}

export class CreateTestimonialDto {
  @IsString() @IsNotEmpty() @MaxLength(1200)
  text!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(160)
  role?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;
}

export class UpdateTestimonialDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(1200)
  text?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(160)
  role?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;
}

export class UpsertProfileDto {
  @IsOptional() @IsString() @MaxLength(2000)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(6000)
  details?: string;

  @IsOptional() @IsUUID()
  mediaId?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isVisible?: boolean;
}

export class UpdateMediaDto {
  @IsOptional() @IsString() @MaxLength(250)
  altText?: string;
}

export class ContactMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  // بريد أو هاتف
  @IsString() @IsNotEmpty() @MaxLength(120)
  contact!: string;

  @IsOptional() @IsString() @MaxLength(200)
  subject?: string;

  @IsString() @IsNotEmpty() @MaxLength(3000)
  message!: string;

  // فخ للروبوتات: حقل مخفي بالنموذج، يجب أن يبقى فارغًا
  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

export class MessageStatusDto {
  @IsEnum({ NEW: 'NEW', READ: 'READ', ARCHIVED: 'ARCHIVED' })
  status!: 'NEW' | 'READ' | 'ARCHIVED';
}

export class CreateEntryDto {
  @IsIn(ENTRY_KIND_LIST)
  kind!: (typeof ENTRY_KIND_LIST)[number];

  @IsString() @IsNotEmpty() @MaxLength(250)
  title!: string;

  @IsOptional() @IsString() @MaxLength(120)
  category?: string;

  @IsOptional() @IsString() @MaxLength(600)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(20000)
  body?: string;

  @IsOptional() @IsString() @MaxLength(250)
  location?: string;

  @IsOptional() @IsDateString()
  startsAt?: string | null;

  @IsOptional() @IsDateString()
  endsAt?: string | null;

  @IsOptional() @IsUUID()
  coverMediaId?: string | null;

  @IsOptional() @IsArray() @ArrayMaxSize(24) @IsUUID(undefined, { each: true })
  galleryIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(400, { each: true })
  videos?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;
}

export class UpdateEntryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250)
  title?: string;

  @IsOptional() @IsString() @MaxLength(120)
  category?: string;

  @IsOptional() @IsString() @MaxLength(600)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(20000)
  body?: string;

  @IsOptional() @IsString() @MaxLength(250)
  location?: string;

  @IsOptional() @IsDateString()
  startsAt?: string | null;

  @IsOptional() @IsDateString()
  endsAt?: string | null;

  @IsOptional() @IsUUID()
  coverMediaId?: string | null;

  @IsOptional() @IsArray() @ArrayMaxSize(24) @IsUUID(undefined, { each: true })
  galleryIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(400, { each: true })
  videos?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(100000) @Type(() => Number)
  sortOrder?: number;
}

// نموذج تحديث بيانات الخريج (عام): يصل لصندوق رسائل الموقع.
export class GraduateUpdateDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  contact!: string;

  @IsOptional() @IsString() @MaxLength(80)
  graduationYear?: string;

  @IsOptional() @IsString() @MaxLength(160)
  program?: string;

  @IsOptional() @IsString() @MaxLength(250)
  workplace?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;

  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}
