import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateCoursePrerequisiteDto } from './dto/create-course-prerequisite.dto.js';

@Injectable()
export class CoursesService {
    constructor(private readonly prisma: PrismaService) { }

    async addPrerequisite(dto: CreateCoursePrerequisiteDto) {
        return this.prisma.coursePrerequisite.create({
            data: {
                courseId: dto.courseId,
                prerequisiteId: dto.prerequisiteId,
            },
        });
    }

    async create(createCourseDto: CreateCourseDto) {
        return this.prisma.course.create({
            data: {
                code: createCourseDto.code,
                nameAr: createCourseDto.nameAr,
                nameEn: createCourseDto.nameEn,
                credits: createCourseDto.credits,
                ects: createCourseDto.ects,
                type: createCourseDto.type,
                requirement: createCourseDto.requirement,
                description: createCourseDto.description,
            },
        });
    }

    async findAvailableForStudent(studentId: string) {
        const student = await this.prisma.student.findUnique({
            where: {
                id: studentId,
            },
            select: {
                id: true,
                universityId: true,
                firstName: true,
                middleName: true,
                familyName: true,
                status: true,
                studyPlanId: true,
                academicYearId: true,
                semesterId: true,
            },
        });

        if (!student) {
            return {
                success: false,
                errors: ['Student not found'],
            };
        }

        if (!student.studyPlanId) {
            return {
                success: false,
                errors: ['Student is not assigned to a study plan'],
            };
        }

        if (!student.academicYearId) {
            return {
                success: false,
                errors: ['Student is not assigned to an academic year'],
            };
        }

        const planCourses = await this.prisma.studyPlanCourse.findMany({
            where: {
                studyPlanId: student.studyPlanId,
                academicYearId: student.academicYearId,
                course: {
                    status: 'ACTIVE',
                },
            },
            include: {
                course: {
                    include: {
                        prerequisites: {
                            include: {
                                prerequisite: true,
                            },
                        },
                    },
                },
                academicYear: true,
            },
            orderBy: {
                priority: 'asc',
            },
        });

        const registrationHistory =
            await this.prisma.enrollmentItem.findMany({
                where: {
                    enrollment: {
                        studentId: student.id,
                        status: {
                            notIn: ['CANCELLED', 'DROPPED'],
                        },
                    },
                },
                select: {
                    courseId: true,
                },
            });

        const registeredCourseIds = new Set(
            registrationHistory.map((item) => item.courseId),
        );

        const courses = planCourses.map((planCourse) => {
            const missingPrerequisites =
                planCourse.course.prerequisites
                    .filter(
                        (prerequisite) =>
                            !registeredCourseIds.has(
                                prerequisite.prerequisiteId,
                            ),
                    )
                    .map((prerequisite) => ({
                        id: prerequisite.prerequisite.id,
                        code: prerequisite.prerequisite.code,
                        nameAr: prerequisite.prerequisite.nameAr,
                    }));

            const alreadyRegistered = registeredCourseIds.has(
                planCourse.courseId,
            );

            return {
                id: planCourse.course.id,
                code: planCourse.course.code,
                nameAr: planCourse.course.nameAr,
                nameEn: planCourse.course.nameEn,
                credits: planCourse.course.credits,
                ects: planCourse.course.ects,
                type: planCourse.course.type,

                requirement: planCourse.requirement,
                priority: planCourse.priority,

                academicYear: {
                    id: planCourse.academicYear.id,
                    nameAr: planCourse.academicYear.nameAr,
                    nameEn: planCourse.academicYear.nameEn,
                },

                alreadyRegistered,
                prerequisitesSatisfied:
                    missingPrerequisites.length === 0,

                missingPrerequisites,

                canRegister:
                    !alreadyRegistered &&
                    missingPrerequisites.length === 0,
            };
        });

        return {
            success: true,

            student: {
                id: student.id,
                universityId: student.universityId,
                firstName: student.firstName,
                middleName: student.middleName,
                familyName: student.familyName,
                status: student.status,
                studyPlanId: student.studyPlanId,
                academicYearId: student.academicYearId,
                semesterId: student.semesterId,
            },

            courses,
        };
    }
}