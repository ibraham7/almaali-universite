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

const TEST_SEMESTER_ID = 'TEST-SEMESTER-2026-FALL';
const TEST_STUDENT_UNIVERSITY_ID = 'TEST-STUDENT-001';

const TEST_STUDENT_EMAIL = 'student.test@university.local';
const TEST_STUDENT_PASSWORD = 'Student123!';

async function main() {
  console.log('Starting test data seed...');

  // ============================================================
  // 1. البحث عن المقررات التجريبية
  // ============================================================

  const cs101 = await prisma.course.findUnique({
    where: {
      code: 'CS101',
    },
  });

  const cs102 = await prisma.course.findUnique({
    where: {
      code: 'CS102',
    },
  });

  if (!cs101) {
    throw new Error('Course CS101 was not found');
  }

  if (!cs102) {
    throw new Error('Course CS102 was not found');
  }

  console.log('Courses found: CS101, CS102');

  // ============================================================
  // 2. البحث عن دور الطالب
  // ============================================================

  const studentRole = await prisma.role.findUnique({
    where: {
      code: 'STUDENT',
    },
  });

  if (!studentRole) {
    throw new Error(
      'STUDENT role was not found',
    );
  }

  console.log(
    `Student role found: ${studentRole.id}`,
  );

  // ============================================================
  // 3. إنشاء حساب مستخدم تجريبي للطالب
  // ============================================================

  const passwordHash = await argon2.hash(
    TEST_STUDENT_PASSWORD,
  );

  const studentUser = await prisma.user.upsert({
    where: {
      email: TEST_STUDENT_EMAIL,
    },

    update: {
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

  console.log(
    `Student user created/found: ${studentUser.id}`,
  );

  // ============================================================
  // 4. إنشاء الطالب وربطه بحساب المستخدم
  // ============================================================

  const student = await prisma.student.upsert({
    where: {
      universityId: TEST_STUDENT_UNIVERSITY_ID,
    },

    update: {
      userId: studentUser.id,
      universityEmail: TEST_STUDENT_EMAIL,
      status: 'ACTIVE',
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

      status: 'ACTIVE',

      userId: studentUser.id,

      admissionDate: new Date(),

      semesterId: TEST_SEMESTER_ID,
    },
  });

  console.log(
    `Test student created/found: ${student.id}`,
  );

  console.log(
    `Student linked to user: ${studentUser.id}`,
  );

  // ============================================================
  // 5. إنشاء فترة تسجيل تجريبية مفتوحة
  // ============================================================

  const now = new Date();

  const startDateTime = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  );

  const endDateTime = new Date(
    now.getTime() +
      30 * 24 * 60 * 60 * 1000,
  );

  const addDropDeadline = new Date(
    now.getTime() +
      15 * 24 * 60 * 60 * 1000,
  );

  let registrationPeriod =
    await prisma.registrationPeriod.findFirst({
      where: {
        semesterId: TEST_SEMESTER_ID,
      },
    });

  if (!registrationPeriod) {
    registrationPeriod =
      await prisma.registrationPeriod.create({
        data: {
          semesterId: TEST_SEMESTER_ID,

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
    `Registration period created/found: ${registrationPeriod.id}`,
  );

  // ============================================================
  // 6. إنشاء شعبة CS101
  // ============================================================

  let cs101Section =
    await prisma.courseSection.findFirst({
      where: {
        courseId: cs101.id,
        semesterId: TEST_SEMESTER_ID,
        sectionNumber: 'TEST-01',
      },
    });

  if (!cs101Section) {
    cs101Section =
      await prisma.courseSection.create({
        data: {
          sectionNumber: 'TEST-01',

          courseId: cs101.id,
          semesterId: TEST_SEMESTER_ID,

          maxCapacity: 30,
          enrolledCount: 0,

          status: 'OPEN',

          minEnrollment: 1,
        },
      });
  }

  console.log(
    `CS101 section created/found: ${cs101Section.id}`,
  );

  // ============================================================
  // 7. إنشاء شعبة CS102
  // ============================================================

  let cs102Section =
    await prisma.courseSection.findFirst({
      where: {
        courseId: cs102.id,
        semesterId: TEST_SEMESTER_ID,
        sectionNumber: 'TEST-01',
      },
    });

  if (!cs102Section) {
    cs102Section =
      await prisma.courseSection.create({
        data: {
          sectionNumber: 'TEST-01',

          courseId: cs102.id,
          semesterId: TEST_SEMESTER_ID,

          maxCapacity: 30,
          enrolledCount: 0,

          status: 'OPEN',

          minEnrollment: 1,
        },
      });
  }

  console.log(
    `CS102 section created/found: ${cs102Section.id}`,
  );

  // ============================================================
  // 8. جدول CS101
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
  // 9. جدول CS102
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

  console.log('Test schedules created/found');

  // ============================================================
  // 10. عرض بيانات الاختبار
  // ============================================================

  console.log('\n========================================');

  console.log('TEST DATA READY');

  console.log('========================================');

  console.log(
    `Student User ID: ${studentUser.id}`,
  );

  console.log(
    `Student ID: ${student.id}`,
  );

  console.log(
    `University ID: ${student.universityId}`,
  );

  console.log(
    `Student Email: ${TEST_STUDENT_EMAIL}`,
  );

  console.log(
    `Student Password: ${TEST_STUDENT_PASSWORD}`,
  );

  console.log(
    `Semester ID: ${TEST_SEMESTER_ID}`,
  );

  console.log(
    `Registration Period ID: ${registrationPeriod.id}`,
  );

  console.log(
    `CS101 ID: ${cs101.id}`,
  );

  console.log(
    `CS101 Section ID: ${cs101Section.id}`,
  );

  console.log(
    `CS102 ID: ${cs102.id}`,
  );

  console.log(
    `CS102 Section ID: ${cs102Section.id}`,
  );

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