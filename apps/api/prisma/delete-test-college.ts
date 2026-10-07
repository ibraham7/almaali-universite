import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const collegeName = 'كلية الآداب';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const colleges = await prisma.college.findMany({
    where: { nameAr: collegeName, nameEn: collegeName },
    select: { id: true, universityId: true, nameAr: true, nameEn: true },
  });

  if (colleges.length !== 1) {
    throw new Error(
      `Expected exactly one college named "${collegeName}" with the same subtitle; found ${colleges.length}. No data was changed.`,
    );
  }

  const college = colleges[0];
  const departments = await prisma.department.findMany({
    where: { collegeId: college.id },
    select: { id: true },
  });
  const departmentIds = departments.map(({ id }) => id);
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { collegeId: college.id },
        ...(departmentIds.length ? [{ departmentId: { in: departmentIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const programIds = programs.map(({ id }) => id);
  const plans = programIds.length
    ? await prisma.studyPlan.findMany({ where: { programId: { in: programIds } }, select: { id: true } })
    : [];
  const planIds = plans.map(({ id }) => id);
  const levels = planIds.length
    ? await prisma.academicYear.findMany({ where: { studyPlanId: { in: planIds } }, select: { id: true } })
    : [];
  const levelIds = levels.map(({ id }) => id);
  const semesters = levelIds.length
    ? await prisma.semester.findMany({ where: { academicYearId: { in: levelIds } }, select: { id: true } })
    : [];
  const semesterIds = semesters.map(({ id }) => id);

  const studentWhere = {
    OR: [
      { collegeId: college.id },
      ...(departmentIds.length ? [{ departmentId: { in: departmentIds } }] : []),
      ...(programIds.length ? [{ programId: { in: programIds } }] : []),
      ...(planIds.length ? [{ studyPlanId: { in: planIds } }] : []),
      ...(levelIds.length ? [{ academicYearId: { in: levelIds } }] : []),
      ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
    ],
  };
  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, universityId: true, userId: true },
  });
  const studentIds = students.map(({ id }) => id);
  const studentUserIds = students.flatMap(({ userId }) => userId ? [userId] : []);
  const studentUsers = studentUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: studentUserIds } }, select: { id: true, role: { select: { code: true } } } })
    : [];
  if (studentUsers.some(({ role }) => role.code !== 'STUDENT')) {
    throw new Error('A linked account is not a student account. No data was changed.');
  }

  const semesterEnrollmentWhere = semesterIds.length ? { semesterId: { in: semesterIds } } : undefined;
  const outsideEnrollmentCount = semesterEnrollmentWhere
    ? await prisma.studentEnrollment.count({
        where: { ...semesterEnrollmentWhere, ...(studentIds.length ? { studentId: { notIn: studentIds } } : {}) },
      })
    : 0;
  const outsideResultCount = semesterIds.length
    ? await prisma.courseResult.count({
        where: { semesterId: { in: semesterIds }, ...(studentIds.length ? { studentId: { notIn: studentIds } } : {}) },
      })
    : 0;
  if (outsideEnrollmentCount || outsideResultCount) {
    throw new Error(
      `The college has ${outsideEnrollmentCount} enrollment(s) or ${outsideResultCount} result(s) for students not assigned to it. No data was changed.`,
    );
  }

  const sections = semesterIds.length
    ? await prisma.courseSection.findMany({ where: { semesterId: { in: semesterIds } }, select: { id: true } })
    : [];
  const sectionIds = sections.map(({ id }) => id);
  const [enrollmentCount, resultCount, ticketCount] = await Promise.all([
    studentIds.length || semesterIds.length
      ? prisma.studentEnrollment.count({
          where: {
            OR: [
              ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
              ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
            ],
          },
        })
      : Promise.resolve(0),
    studentIds.length || semesterIds.length
      ? prisma.courseResult.count({
          where: {
            OR: [
              ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
              ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
            ],
          },
        })
      : Promise.resolve(0),
    studentUserIds.length
      ? prisma.supportTicket.count({ where: { authorId: { in: studentUserIds } } })
      : Promise.resolve(0),
  ]);

  const preview = {
    college: { id: college.id, nameAr: college.nameAr, nameEn: college.nameEn },
    departments: departmentIds.length,
    programs: programIds.length,
    plans: planIds.length,
    students: students.length,
    studentAccounts: studentUserIds.length,
    enrollments: enrollmentCount,
    results: resultCount,
    sections: sectionIds.length,
    supportTickets: ticketCount,
  };

  console.log(JSON.stringify(preview, null, 2));

  if (process.env.CONFIRM_DELETE_TEST_COLLEGE_ID !== college.id) {
    console.log(`Preview only. To apply, rerun with CONFIRM_DELETE_TEST_COLLEGE_ID=${college.id}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const currentCollege = await tx.college.findUnique({ where: { id: college.id } });
    if (!currentCollege || currentCollege.nameAr !== collegeName || currentCollege.nameEn !== collegeName) {
      throw new Error('Target college changed after preview. No data was deleted.');
    }

    if (studentIds.length || semesterIds.length) {
      await tx.courseResult.deleteMany({
        where: {
          OR: [
            ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
            ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
          ],
        },
      });
      await tx.studentEnrollment.deleteMany({
        where: {
          OR: [
            ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
            ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
          ],
        },
      });
    }

    if (studentIds.length) await tx.student.deleteMany({ where: { id: { in: studentIds } } });
    if (studentUserIds.length) {
      await tx.supportTicket.deleteMany({ where: { authorId: { in: studentUserIds } } });
      await tx.user.deleteMany({ where: { id: { in: studentUserIds }, role: { code: 'STUDENT' } } });
    }
    if (semesterIds.length) await tx.registrationPeriod.deleteMany({ where: { semesterId: { in: semesterIds } } });
    if (sectionIds.length) {
      await tx.sectionSchedule.deleteMany({ where: { sectionId: { in: sectionIds } } });
      await tx.courseSection.deleteMany({ where: { id: { in: sectionIds } } });
    }
    if (planIds.length) {
      await tx.studyPlanCourse.deleteMany({ where: { studyPlanId: { in: planIds } } });
      await tx.studyPlanCurriculumCourse.deleteMany({ where: { studyPlanId: { in: planIds } } });
      await tx.studyPlanCurriculumQuota.deleteMany({ where: { studyPlanId: { in: planIds } } });
    }
    if (semesterIds.length) await tx.semester.deleteMany({ where: { id: { in: semesterIds } } });
    if (levelIds.length) await tx.academicYear.deleteMany({ where: { id: { in: levelIds } } });
    if (planIds.length) await tx.studyPlan.deleteMany({ where: { id: { in: planIds } } });
    if (programIds.length) await tx.program.deleteMany({ where: { id: { in: programIds } } });
    if (departmentIds.length) await tx.department.deleteMany({ where: { id: { in: departmentIds } } });
    await tx.college.delete({ where: { id: college.id } });
    await tx.auditLog.create({
      data: {
        action: 'TEST_COLLEGE_AND_DATA_DELETED',
        entity: 'College',
        entityId: college.id,
        details: JSON.stringify(preview),
      },
    });
  }, { maxWait: 10_000, timeout: 120_000 });

  console.log('Deletion completed.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
