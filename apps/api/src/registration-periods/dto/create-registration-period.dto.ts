import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRegistrationPeriodDto {
  @IsUUID()
  semesterId!: string;

  @IsDateString()
  startDateTime!: string;

  @IsDateString()
  endDateTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minCredits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCredits?: number;

  @IsBoolean()
  advisorApprovalRequired!: boolean;

  @IsBoolean()
  dropAllowed!: boolean;

  @IsOptional()
  @IsDateString()
  addDropDeadline?: string;
}