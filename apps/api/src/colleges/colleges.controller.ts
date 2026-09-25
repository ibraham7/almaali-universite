import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  CollegesService,
} from './colleges.service.js';

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

@Controller('colleges')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class CollegesController {
  constructor(
    private readonly collegesService: CollegesService,
  ) { }

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      universityId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.collegesService.create(
      body,
    );
  }

  @Patch(':id')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      nameAr?: string;
      nameEn?: string;
    },
  ) {
    return this.collegesService.update(
      id,
      body,
    );
  }

  @Get()
  findAll() {
    return this.collegesService.findAll();
  }

  @Get(
    'university/:universityId',
  )
  findByUniversity(
    @Param('universityId')
    universityId: string,
  ) {
    return this.collegesService.findByUniversity(
      universityId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.collegesService.findById(
      id,
    );
  }
}