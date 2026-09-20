import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProgramsService } from './programs.service.js';

@Controller('programs')
export class ProgramsController {
    constructor(
        private readonly programsService: ProgramsService,
    ) { }

    @Post()
    create(
        @Body()
        body: {
            departmentId: string;
            nameAr: string;
            nameEn?: string;
        },
    ) {
        return this.programsService.create(body);
    }

    @Get()
    findAll() {
        return this.programsService.findAll();
    }

    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId') departmentId: string) {
        return this.programsService.findByDepartment(departmentId);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.programsService.findById(id);
    }
}