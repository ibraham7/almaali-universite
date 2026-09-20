import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';

@Controller('departments')
export class DepartmentsController {
    constructor(
        private readonly departmentsService: DepartmentsService,
    ) { }

    @Post()
    create(
        @Body()
        body: {
            collegeId: string;
            nameAr: string;
            nameEn?: string;
        },
    ) {
        return this.departmentsService.create(body);
    }

    @Get()
    findAll() {
        return this.departmentsService.findAll();
    }

    @Get('college/:collegeId')
    findByCollege(@Param('collegeId') collegeId: string) {
        return this.departmentsService.findByCollege(collegeId);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.departmentsService.findById(id);
    }
}