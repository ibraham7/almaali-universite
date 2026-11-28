import { BadRequestException, Body, Controller, Get, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CourseImportsService, MAX_FILE_BYTES, type CourseImportOptions } from './course-imports.service.js';

interface UploadedExcelFile { buffer: Buffer; originalname: string }

// استيراد كتالوج المقررات من Excel: للمسجّل ومدير النظام فقط.
@Controller('courses/import')
@UseGuards(JwtGuard, RolesGuard)
@Roles('REGISTRAR', 'SYSTEM_ADMIN')
export class CourseImportsController {
  constructor(private readonly imports: CourseImportsService) {}

  private options(raw?: string): CourseImportOptions {
    if (!raw) return {};
    try { const parsed = JSON.parse(raw) as CourseImportOptions; return { sheet: typeof parsed.sheet === 'string' ? parsed.sheet : undefined, updateExisting: parsed.updateExisting === true, skipInvalid: parsed.skipInvalid === true }; }
    catch { throw new BadRequestException('إعدادات الاستيراد غير صالحة'); }
  }

  @Get('template')
  template(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''%D9%82%D8%A7%D9%84%D8%A8-%D8%A7%D8%B3%D8%AA%D9%8A%D8%B1%D8%A7%D8%AF-%D8%A7%D9%84%D9%85%D9%82%D8%B1%D8%B1%D8%A7%D8%AA.xlsx");
    res.send(this.imports.template());
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES + 1 } }))
  preview(@UploadedFile() file: UploadedExcelFile | undefined, @Body('options') options?: string) { return this.imports.preview(file, this.options(options)); }

  @Post('confirm')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES + 1 } }))
  confirm(@UploadedFile() file: UploadedExcelFile | undefined, @Req() request: Request & { user: { id: string } }, @Body('options') options?: string) {
    return this.imports.confirm(file, request.user.id, this.options(options));
  }
}
