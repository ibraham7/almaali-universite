import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateCourseDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    code?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    nameAr?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    nameEn?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    credits?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    ects?: number;

    @IsOptional()
    @IsIn([
        'THEORY',
        'PRACTICAL',
    ])
    type?:
        | 'THEORY'
        | 'PRACTICAL';

    @IsOptional()
    @IsIn([
        'MANDATORY',
        'ELECTIVE',
    ])
    requirement?:
        | 'MANDATORY'
        | 'ELECTIVE';

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsIn([
        'ACTIVE',
        'INACTIVE',
    ])
    status?:
        | 'ACTIVE'
        | 'INACTIVE';
}