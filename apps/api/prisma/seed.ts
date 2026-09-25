import 'dotenv/config';

import * as argon2 from 'argon2';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const TEST_STUDENT_UNIVERSITY_ID = 'TEST-STUDENT-001';
const TEST_STUDENT_EMAIL = 'student.test@university.local';
const TEST_STUDENT_PASSWORD = 'Student123!';

const TEST_ADVISOR_EMAIL = 'advisor.test@university.local';
const TEST_ADVISOR_PASSWORD = 'Advisor123!';

const TEST_ADMIN_EMAIL = 'admin.test@university.local';
const TEST_ADMIN_PASSWORD = 'Admin123!';

const OLD_TEST_SEMESTER_ID = 'TEST-SEMESTER-2026-FALL';

async function main() {
  console.log('Starting university test data seed...');

  // ============================================================
  // 1. دور الطالب
  // ============================================================

  const studentRole = await prisma.role.upsert({
    where: {
      code: 'STUDENT',
    },
    update: {
      name: 'Student',
      isActive: true,
    },
    create: {
      code: 'STUDENT',
      name: 'Student',
      isActive: true,
    },
  });

  console.log(`Student role ready: ${studentRole.id}`);

  const advisorRole = await prisma.role.upsert({
    where: {
      code: 'ADVISOR',
    },
    update: {
      name: 'Advisor',
      isActive: true,
    },
    create: {
      code: 'ADVISOR',
      name: 'Advisor',
      isActive: true,
    },
  });

  console.log(`Advisor role ready: ${advisorRole.id}`);

  const systemAdminRole = await prisma.role.upsert({
    where: {
      code: 'SYSTEM_ADMIN',
    },

    update: {
      name: 'System Administrator',
      isActive: true,
    },

    create: {
      code: 'SYSTEM_ADMIN',
      name: 'System Administrator',
      description: 'Full system administration access',
      isActive: true,
    },
  });

  console.log(
    `System admin role ready: ${systemAdminRole.id}`,
  );

  // ============================================================
  // 2. الجامعة
  // ============================================================

  let university = await prisma.university.findFirst();

  if (!university) {
    university = await prisma.university.create({
      data: {
        nameAr: 'جامعة اختبار',
        nameEn: 'Test University',
        minGpaForFutureYears: 2,
        allowedFutureYears: 1,
        requiredElectiveCredits: 12,
      },
    });
  }

  console.log(`University ready: ${university.id}`);

  // ============================================================
  // 3. الكلية
  // ============================================================

  let college = await prisma.college.findFirst({
    where: {
      universityId: university.id,
    },
  });

  if (!college) {
    college = await prisma.college.create({
      data: {
        universityId: university.id,
        nameAr: 'كلية اختبار',
        nameEn: 'Test College',
      },
    });
  }

  console.log(`College ready: ${college.id}`);

  // ============================================================
  // 4. قسم اختبار مستقل
  //
  // خيار تنفيذ لبيانات التطوير فقط:
  // لا نربط CS101 و CS102 بأحد الأقسام الحقيقية.
  // ============================================================

  const department = await prisma.department.upsert({
    where: {
      collegeId_nameAr: {
        collegeId: college.id,
        nameAr: 'قسم اختبار النظام',
      },
    },
    update: {
      nameEn: 'System Test Department',
    },
    create: {
      collegeId: college.id,
      nameAr: 'قسم اختبار النظام',
      nameEn: 'System Test Department',
    },
  });

  console.log(`Department ready: ${department.id}`);

  // ============================================================
  // 5. البرنامج
  // ============================================================

  const program = await prisma.program.upsert({
    where: {
      departmentId_nameAr: {
        departmentId: department.id,
        nameAr: 'برنامج اختبار التسجيل',
      },
    },
    update: {
      nameEn: 'Registration Test Program',
    },
    create: {
      departmentId: department.id,
      nameAr: 'برنامج اختبار التسجيل',
      nameEn: 'Registration Test Program',
    },
  });

  console.log(`Program ready: ${program.id}`);

  // ============================================================
  // 6. الخطة الدراسية
  // ============================================================

  const studyPlan = await prisma.studyPlan.upsert({
    where: {
      programId_nameAr: {
        programId: program.id,
        nameAr: 'الخطة التجريبية',
      },
    },
    update: {
      nameEn: 'Test Study Plan',
    },
    create: {
      programId: program.id,
      nameAr: 'الخطة التجريبية',
      nameEn: 'Test Study Plan',
    },
  });

  console.log(`Study plan ready: ${studyPlan.id}`);

  // ============================================================
  // 7. المستوى الأول
  //
  // AcademicYear حاليًا يمثل المستوى داخل الخطة.
  // أبقينا الاسم للحفاظ على توافق الكود الموجود.
  // ============================================================

  const levelOne = await prisma.academicYear.upsert({
    where: {
      studyPlanId_levelNumber: {
        studyPlanId: studyPlan.id,
        levelNumber: 1,
      },
    },
    update: {
      nameAr: 'المستوى الأول',
      nameEn: 'Level 1',
    },
    create: {
      studyPlanId: studyPlan.id,
      nameAr: 'المستوى الأول',
      nameEn: 'Level 1',
      levelNumber: 1,
    },
  });

  console.log(`Level ready: ${levelOne.id}`);

  // ============================================================
  // 8. الفصل الأول
  // ============================================================

  const semesterOne = await prisma.semester.upsert({
    where: {
      academicYearId_semesterNumber: {
        academicYearId: levelOne.id,
        semesterNumber: 1,
      },
    },
    update: {
      nameAr: 'الفصل الأول',
      nameEn: 'Semester 1',
      requireMandatoryCourses: false,
    },
    create: {
      academicYearId: levelOne.id,
      nameAr: 'الفصل الأول',
      nameEn: 'Semester 1',
      semesterNumber: 1,
      requireMandatoryCourses: false,
    },
  });

  console.log(`Semester ready: ${semesterOne.id}`);

  // ============================================================
  // 9. المقررات
  // ============================================================

  const cs101 = await prisma.course.upsert({
    where: {
      code: 'CS101',
    },
    update: {
      nameAr: 'مقدمة في علوم الحاسوب',
      nameEn: 'Introduction to Computer Science',
      credits: 3,
      type: 'THEORY',
      requirement: 'MANDATORY',
      status: 'ACTIVE',
    },
    create: {
      code: 'CS101',
      nameAr: 'مقدمة في علوم الحاسوب',
      nameEn: 'Introduction to Computer Science',
      credits: 3,
      type: 'THEORY',
      requirement: 'MANDATORY',
      status: 'ACTIVE',
    },
  });

  const cs102 = await prisma.course.upsert({
    where: {
      code: 'CS102',
    },
    update: {
      nameAr: 'البرمجة 2',
      nameEn: 'Programming 2',
      credits: 3,
      type: 'THEORY',
      requirement: 'MANDATORY',
      status: 'ACTIVE',
    },
    create: {
      code: 'CS102',
      nameAr: 'البرمجة 2',
      nameEn: 'Programming 2',
      credits: 3,
      type: 'THEORY',
      requirement: 'MANDATORY',
      status: 'ACTIVE',
    },
  });

  console.log('Courses ready: CS101, CS102');

  // ============================================================
  // 10. ربط المقررات بالخطة والمستوى والفصل
  //
  // priority للترتيب فقط.
  // لا يمثل prerequisite.
  //
  // CS102 اختياري هنا فقط لاختبار الواجهة.
  // هذا ليس قرارًا جامعيًا.
  // ============================================================

  await prisma.studyPlanCourse.upsert({
    where: {
      studyPlanId_academicYearId_semesterId_courseId: {
        studyPlanId: studyPlan.id,
        academicYearId: levelOne.id,
        semesterId: semesterOne.id,
        courseId: cs101.id,
      },
    },
    update: {
      priority: 1,
      requirement: 'MANDATORY',
    },
    create: {
      studyPlanId: studyPlan.id,
      academicYearId: levelOne.id,
      semesterId: semesterOne.id,
      courseId: cs101.id,
      priority: 1,
      requirement: 'MANDATORY',
    },
  });

  await prisma.studyPlanCourse.upsert({
    where: {
      studyPlanId_academicYearId_semesterId_courseId: {
        studyPlanId: studyPlan.id,
        academicYearId: levelOne.id,
        semesterId: semesterOne.id,
        courseId: cs102.id,
      },
    },
    update: {
      priority: 2,
      requirement: 'ELECTIVE',
    },
    create: {
      studyPlanId: studyPlan.id,
      academicYearId: levelOne.id,
      semesterId: semesterOne.id,
      courseId: cs102.id,
      priority: 2,
      requirement: 'ELECTIVE',
    },
  });

  console.log('Study plan courses ready');

  // ============================================================
  // 11. حساب الطالب
  // ============================================================

  const passwordHash = await argon2.hash(
    TEST_STUDENT_PASSWORD,
  );

  const studentUser = await prisma.user.upsert({
    where: {
      email: TEST_STUDENT_EMAIL,
    },
    update: {
      passwordHash,
      roleId: studentRole.id,
      status: 'ACTIVE',
    },
    create: {
      email: TEST_STUDENT_EMAIL,
      passwordHash,
      roleId: studentRole.id,
      status: 'ACTIVE',
    },
  });

  console.log(`Student user ready: ${studentUser.id}`);

  // ============================================================
  // 11.1 حساب المرشد الأكاديمي التجريبي
  //
  // حساب تطوير لاختبار واجهات وصلاحيات ADVISOR.
  // لا ننشئ له Student record لأنه ليس طالبًا.
  // ============================================================

  const advisorPasswordHash = await argon2.hash(
    TEST_ADVISOR_PASSWORD,
  );

  const advisorUser = await prisma.user.upsert({
    where: {
      email: TEST_ADVISOR_EMAIL,
    },
    update: {
      passwordHash: advisorPasswordHash,
      roleId: advisorRole.id,
      status: 'ACTIVE',
    },
    create: {
      email: TEST_ADVISOR_EMAIL,
      passwordHash: advisorPasswordHash,
      roleId: advisorRole.id,
      status: 'ACTIVE',
    },
  });

  console.log(`Advisor user ready: ${advisorUser.id}`);

  // ============================================================
  // 11.2 حساب مدير النظام التجريبي
  //
  // حساب تطوير لاختبار إدارة المستخدمين والصلاحيات.
  // ============================================================

  const adminPasswordHash = await argon2.hash(
    TEST_ADMIN_PASSWORD,
  );

  const adminUser = await prisma.user.upsert({
    where: {
      email: TEST_ADMIN_EMAIL,
    },

    update: {
      passwordHash: adminPasswordHash,
      roleId: systemAdminRole.id,
      status: 'ACTIVE',
    },

    create: {
      email: TEST_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      roleId: systemAdminRole.id,
      status: 'ACTIVE',
    },
  });

  console.log(
    `System admin user ready: ${adminUser.id}`,
  );

  // ============================================================
  // 12. الطالب
  // ============================================================

  const student = await prisma.student.upsert({
    where: {
      universityId: TEST_STUDENT_UNIVERSITY_ID,
    },
    update: {
      firstName: 'Test',
      middleName: 'Registration',
      familyName: 'Student',
      englishName: 'Test Registration Student',

      universityEmail: TEST_STUDENT_EMAIL,

      collegeId: college.id,
      departmentId: department.id,
      programId: program.id,
      studyPlanId: studyPlan.id,

      academicYearId: levelOne.id,
      semesterId: semesterOne.id,

      status: 'ACTIVE',
      advisorId: advisorUser.id,

      userId: studentUser.id,
    },
    create: {
      universityId: TEST_STUDENT_UNIVERSITY_ID,

      firstName: 'Test',
      middleName: 'Registration',
      familyName: 'Student',

      englishName: 'Test Registration Student',

      gender: 'TEST',
      nationality: 'TEST',

      universityEmail: TEST_STUDENT_EMAIL,

      collegeId: college.id,
      departmentId: department.id,
      programId: program.id,
      studyPlanId: studyPlan.id,

      academicYearId: levelOne.id,
      semesterId: semesterOne.id,

      status: 'ACTIVE',
      advisorId: advisorUser.id,

      userId: studentUser.id,

      admissionDate: new Date(),
    },
  });

  console.log(`Student ready: ${student.id}`);

  // ============================================================
  // 13. تنظيف Enrollment القديم الخاص ببيانات الاختبار
  // ============================================================

  const oldEnrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        studentId: student.id,
        semesterId: OLD_TEST_SEMESTER_ID,
      },
      select: {
        id: true,
      },
    });

  const oldEnrollmentIds = oldEnrollments.map(
    (enrollment) => enrollment.id,
  );

  if (oldEnrollmentIds.length > 0) {
    await prisma.enrollmentItem.deleteMany({
      where: {
        enrollmentId: {
          in: oldEnrollmentIds,
        },
      },
    });

    await prisma.advisorApproval.deleteMany({
      where: {
        enrollmentId: {
          in: oldEnrollmentIds,
        },
      },
    });

    await prisma.studentEnrollment.deleteMany({
      where: {
        id: {
          in: oldEnrollmentIds,
        },
      },
    });
  }

  // ============================================================
  // 14. تنظيف فترة التسجيل القديمة
  // ============================================================

  await prisma.registrationPeriod.deleteMany({
    where: {
      semesterId: OLD_TEST_SEMESTER_ID,
    },
  });

  // ============================================================
  // 15. تنظيف الشعب القديمة
  //
  // نحذف الجداول أولًا لأن SectionSchedule مرتبط بالشعبة.
  // ============================================================

  const oldSections = await prisma.courseSection.findMany({
    where: {
      semesterId: OLD_TEST_SEMESTER_ID,
    },
    select: {
      id: true,
    },
  });

  const oldSectionIds = oldSections.map(
    (section) => section.id,
  );

  if (oldSectionIds.length > 0) {
    await prisma.sectionSchedule.deleteMany({
      where: {
        sectionId: {
          in: oldSectionIds,
        },
      },
    });

    await prisma.courseSection.deleteMany({
      where: {
        id: {
          in: oldSectionIds,
        },
      },
    });
  }

  console.log('Old test registration data cleaned');

  // ============================================================
  // 16. فترة التسجيل
  // ============================================================

  const now = new Date();

  const startDateTime = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  );

  const endDateTime = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const addDropDeadline = new Date(
    now.getTime() + 15 * 24 * 60 * 60 * 1000,
  );

  let registrationPeriod =
    await prisma.registrationPeriod.findFirst({
      where: {
        semesterId: semesterOne.id,
      },
    });

  if (registrationPeriod) {
    registrationPeriod =
      await prisma.registrationPeriod.update({
        where: {
          id: registrationPeriod.id,
        },
        data: {
          startDateTime,
          endDateTime,

          minCredits: 3,
          maxCredits: 18,

          // بيانات اختبار مؤقتة.
          advisorApprovalRequired: false,

          dropAllowed: true,
          addDropDeadline,
        },
      });
  } else {
    registrationPeriod =
      await prisma.registrationPeriod.create({
        data: {
          semesterId: semesterOne.id,

          startDateTime,
          endDateTime,

          minCredits: 3,
          maxCredits: 18,

          advisorApprovalRequired: false,

          dropAllowed: true,
          addDropDeadline,
        },
      });
  }

  console.log(
    `Registration period ready: ${registrationPeriod.id}`,
  );

  // ============================================================
  // 17. شعبة CS101
  // ============================================================

  let cs101Section =
    await prisma.courseSection.findFirst({
      where: {
        courseId: cs101.id,
        semesterId: semesterOne.id,
        sectionNumber: 'TEST-01',
      },
    });

  if (!cs101Section) {
    cs101Section = await prisma.courseSection.create({
      data: {
        sectionNumber: 'TEST-01',

        courseId: cs101.id,
        semesterId: semesterOne.id,

        maxCapacity: 30,
        enrolledCount: 0,

        status: 'OPEN',
        minEnrollment: 1,
      },
    });
  }

  // ============================================================
  // 18. شعبة CS102
  // ============================================================

  let cs102Section =
    await prisma.courseSection.findFirst({
      where: {
        courseId: cs102.id,
        semesterId: semesterOne.id,
        sectionNumber: 'TEST-01',
      },
    });

  if (!cs102Section) {
    cs102Section = await prisma.courseSection.create({
      data: {
        sectionNumber: 'TEST-01',

        courseId: cs102.id,
        semesterId: semesterOne.id,

        maxCapacity: 30,
        enrolledCount: 0,

        status: 'OPEN',
        minEnrollment: 1,
      },
    });
  }

  console.log('Course sections ready');

  // ============================================================
  // 19. جدول CS101
  // ============================================================

  const cs101Schedule =
    await prisma.sectionSchedule.findFirst({
      where: {
        sectionId: cs101Section.id,
      },
    });

  if (!cs101Schedule) {
    await prisma.sectionSchedule.create({
      data: {
        sectionId: cs101Section.id,
        day: 'MONDAY',
        startTime: '09:00',
        endTime: '10:30',
      },
    });
  }

  // ============================================================
  // 20. جدول CS102
  // ============================================================

  const cs102Schedule =
    await prisma.sectionSchedule.findFirst({
      where: {
        sectionId: cs102Section.id,
      },
    });

  if (!cs102Schedule) {
    await prisma.sectionSchedule.create({
      data: {
        sectionId: cs102Section.id,
        day: 'TUESDAY',
        startTime: '09:00',
        endTime: '10:30',
      },
    });
  }

  console.log('Course schedules ready');

  // ============================================================
  // 21. النتيجة
  // ============================================================

  console.log('\n========================================');
  console.log('TEST DATA READY');
  console.log('========================================');

  console.log(`University ID: ${university.id}`);
  console.log(`College ID: ${college.id}`);
  console.log(`Department ID: ${department.id}`);

  console.log(`Program ID: ${program.id}`);
  console.log(`Study Plan ID: ${studyPlan.id}`);

  console.log(`Level ID: ${levelOne.id}`);
  console.log(`Semester ID: ${semesterOne.id}`);

  console.log(`Student User ID: ${studentUser.id}`);
  console.log(`Student ID: ${student.id}`);

  console.log(
    `University Student ID: ${student.universityId}`,
  );

  console.log(`Student Email: ${TEST_STUDENT_EMAIL}`);
  console.log(`Student Password: ${TEST_STUDENT_PASSWORD}`);

  console.log(`Advisor User ID: ${advisorUser.id}`);
  console.log(`Advisor Email: ${TEST_ADVISOR_EMAIL}`);
  console.log(`Advisor Password: ${TEST_ADVISOR_PASSWORD}`);

  console.log(`Admin User ID: ${adminUser.id}`);
  console.log(`Admin Email: ${TEST_ADMIN_EMAIL}`);
  console.log(`Admin Password: ${TEST_ADMIN_PASSWORD}`);

  console.log(
    `Registration Period ID: ${registrationPeriod.id}`,
  );

  console.log(`CS101 ID: ${cs101.id}`);
  console.log(`CS101 Section ID: ${cs101Section.id}`);

  console.log(`CS102 ID: ${cs102.id}`);
  console.log(`CS102 Section ID: ${cs102Section.id}`);

  console.log('========================================\n');
}

main()
  .catch((error) => {
    console.error('Seed failed:');
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });