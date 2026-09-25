import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CollegesModule } from './colleges/colleges.module.js';
import { UniversityModule } from './university/university.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { AcademicYearsModule } from './academic-years/academic-years.module.js';
import { SemestersModule } from './semesters/semesters.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { StudentsModule } from './students/students.module.js';
import { AdvisorsModule } from './advisors/advisors.module.js';
import { ClassroomsModule } from './classrooms/classrooms.module.js';
import { CourseSectionsModule } from './course-sections/course-sections.module.js';
import { SectionSchedulesModule } from './section-schedules/section-schedules.module.js';
import { RegistrationPeriodsModule } from './registration-periods/registration-periods.module.js';
import { StudentEnrollmentsModule } from './student-enrollments/student-enrollments.module.js';
import { AdvisorApprovalsModule } from './advisor-approvals/advisor-approvals.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { StudyPlansModule } from './study-plans/study-plans.module.js';
import { StudyPlanCoursesModule } from './study-plan-courses/study-plan-courses.module.js';
import { GradeScalesModule } from './grade-scales/grade-scales.module.js';
import { CourseResultsModule } from './course-results/course-results.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    CollegesModule,
    UniversityModule,
    DepartmentsModule,
    ProgramsModule,
    AcademicYearsModule,
    SemestersModule,
    CoursesModule,
    TeachersModule,
    StudentsModule,
    AdvisorsModule,
    ClassroomsModule,
    CourseSectionsModule,
    SectionSchedulesModule,
    RegistrationPeriodsModule,
    StudentEnrollmentsModule,
    AdvisorApprovalsModule,
    AuditLogsModule,
    NotificationsModule,
    StudyPlansModule,
    StudyPlanCoursesModule,
    GradeScalesModule,
    CourseResultsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}
