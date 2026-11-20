import { BadRequestException, Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { StudentImportsService, type ImportOptions } from './student-imports.service.js';

interface UploadedExcelFile { buffer: Buffer; originalname: string }

@Controller('students/import')
@UseGuards(JwtGuard, RolesGuard)
@Roles('REGISTRAR', 'SYSTEM_ADMIN')
export class StudentImportsController {
  constructor(private readonly imports: StudentImportsService) {}

  private options(raw?: string): ImportOptions {
    if (!raw) return {};
    try { return JSON.parse(raw) as ImportOptions; }
    catch { throw new BadRequestException('إعدادات الاستيراد غير صالحة'); }
  }

  @Post('inspect')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  inspect(@UploadedFile() file: UploadedExcelFile | undefined, @Body('options') options?: string) {
    const { sheet, headerRow } = this.options(options);
    return this.imports.inspect(file, { sheet, headerRow });
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  preview(@UploadedFile() file: UploadedExcelFile | undefined, @Body('options') options?: string) {
    return this.imports.preview(file, this.options(options));
  }

  @Post('confirm')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  confirm(@UploadedFile() file: UploadedExcelFile | undefined, @Req() request: Request & { user: { id: string } }, @Body('options') options?: string) {
    return this.imports.confirm(file, request.user.id, this.options(options));
  }
}
