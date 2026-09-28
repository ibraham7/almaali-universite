import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateStaffUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'اسم الدخول يجب أن يتكوّن من أحرف لاتينية أو أرقام أو . _ -' })
  username!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsIn(['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN'])
  roleCode!: 'ADVISOR' | 'REGISTRAR' | 'SYSTEM_ADMIN';
}
