import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class SetCoursePrerequisitesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  prerequisiteIds!: string[];
}
