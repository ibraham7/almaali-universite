import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StudentEnrollmentsService } from './student-enrollments.service.js';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';
import { AddEnrollmentItemDto } from './dto/add-enrollment-item.dto.js';
import { DropEnrollmentItemDto } from './dto/drop-enrollment-item.dto.js';
@Controller('student-enrollments')
export class StudentEnrollmentsController {
    @Post('items/drop')
    dropItem(@Body() dto: DropEnrollmentItemDto) {
        return this.studentEnrollmentsService.dropItem(dto);
    }
    @Post(':enrollmentId/confirm')
    confirm(@Param('enrollmentId') enrollmentId: string) {
        return this.studentEnrollmentsService.confirm(enrollmentId);
    }
    @Post('items')
    addItem(@Body() dto: AddEnrollmentItemDto) {
        return this.studentEnrollmentsService.addItem(dto);
    }
    constructor(
        private readonly studentEnrollmentsService: StudentEnrollmentsService,
    ) { }

    @Post()
    create(@Body() dto: CreateStudentEnrollmentDto) {
        return this.studentEnrollmentsService.create(dto);
    }

    @Get()
    findAll() {
        return this.studentEnrollmentsService.findAll();
    }

    @Get('student/:studentId')
    findByStudent(@Param('studentId') studentId: string) {
        return this.studentEnrollmentsService.findByStudent(studentId);
    }
}