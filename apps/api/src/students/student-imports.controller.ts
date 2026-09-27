import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { StudentImportsService } from './student-imports.service.js';

interface UploadedExcelFile { buffer: Buffer; originalname: string }

@Controller('students/import')
@UseGuards(JwtGuard, RolesGuard)
@Roles('REGISTRAR', 'SYSTEM_ADMIN')
export class StudentImportsController {
  constructor(private readonly imports: StudentImportsService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  preview(@UploadedFile() file?: UploadedExcelFile) {
    return this.imports.preview(file);
  }

  @Post('confirm')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  confirm(@UploadedFile() file: UploadedExcelFile | undefined, @Req() request: Request & { user: { id: string } }) {
    return this.imports.confirm(file, request.user.id);
  }
}
