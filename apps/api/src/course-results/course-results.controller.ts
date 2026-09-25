import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

import {
  CourseResultsService,
} from './course-results.service.js';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface UploadedExcelFile {
  buffer: Buffer;
  originalname: string;
}

@Controller('course-results')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class CourseResultsController {
  constructor(
    private readonly courseResultsService: CourseResultsService,
  ) {}

  @Get(
    'template/:semesterId',
  )
  async template(
    @Param('semesterId')
    semesterId: string,
  ) {
    const result =
      await this.courseResultsService.buildTemplate(
        semesterId,
      );

    return new StreamableFile(
      result.buffer,
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition:
          `attachment; filename="${result.filename}"`,
      },
    );
  }

  @Post(
    'import/:semesterId',
  )
  @UseInterceptors(
    FileInterceptor('file'),
  )
  importExcel(
    @Req()
    request: AuthenticatedRequest,

    @Param('semesterId')
    semesterId: string,

    @UploadedFile()
    file?: UploadedExcelFile,
  ) {
    if (!file) {
      return {
        success: false,
        imported: 0,
        errors: [
          'Excel file is required',
        ],
      };
    }

    return this.courseResultsService.importExcel(
      semesterId,
      file,
      request.user.id,
    );
  }

  @Get(
    'semester/:semesterId',
  )
  findBySemester(
    @Param('semesterId')
    semesterId: string,
  ) {
    return this.courseResultsService.findBySemester(
      semesterId,
    );
  }
}
