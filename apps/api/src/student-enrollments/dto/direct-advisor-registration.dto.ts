import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';

export class DirectRegistrationItemDto {
  @IsString() @IsNotEmpty() @IsUUID()
  courseId!: string;

  @IsString() @IsNotEmpty() @IsUUID()
  sectionId!: string;
}

export class DirectAdvisorRegistrationDto {
  @IsString() @IsNotEmpty()
  universityId!: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DirectRegistrationItemDto)
  items!: DirectRegistrationItemDto[];
}
