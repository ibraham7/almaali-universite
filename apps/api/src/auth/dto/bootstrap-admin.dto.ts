import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
