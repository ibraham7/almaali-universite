import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const targets = [
  {
    label: 'كلية الآداب (العنوان الفرعي: كلية الآداب)',
    optional: true,
    where: { nameAr: 'كلية الآداب', nameEn: 'كلية الآداب' },
    expected: { nameAr: 'كلية الآداب', nameEn: 'كلية الآداب' },
  },
  {
    label: 'أصول الدين',
    where: { nameAr: 'أصول الدين', OR: [{ nameEn: null }, { nameEn: '' }] },
    expected: { nameAr: 'أصول الدين', nameEn: null },
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const matches = await Promise.all(
    targets.map(async (target) => ({
      target,
      rows: await prisma.college.findMany({
        where: target.where,
        select: { id: true, universityId: true, nameAr: true, nameEn: true },
      }),
    })),
  );

  const missingOrAmbiguous = matches.filter(
    ({ target, rows }) => rows.length > 1 || (rows.length === 0 && !target.optional),
  );
  if (missingOrAmbiguous.length) {
    throw new Error(
      `Expected exactly one record for each requested card. ${missingOrAmbiguous
        .map(({ target, rows }) => `${target.label}: found ${rows.length}`)
        .join('; ')}. No data was changed.`,
    );
  }

  const foundMatches = matches.filter(({ rows }) => rows.length === 1);
  const missingTargets = matches.filter(({ rows }) => rows.length === 0).map(({ target }) => target.label);
  const colleges = foundMatches.map(({ rows }) => rows[0]);
  if (!colleges.length) throw new Error('No target college was found. No data was changed.');
  const collegeIds = colleges.map(({ id }) => id);
  const confirmationIds = [...collegeIds].sort().join(',');
  const departments = await prisma.department.findMany({
    where: { collegeId: { in: collegeIds } },
    select: { id: true },
  });
  const departmentIds = departments.map(({ id }) => id);
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { collegeId: { in: collegeIds } },
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
      { collegeId: { in: collegeIds } },
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
  const studentUserIds = students.flatMap(({ userId }) => (userId ? [userId] : []));
  const studentUsers = studentUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: studentUserIds } },
        select: { id: true, role: { select: { code: true } } },
      })
    : [];
  if (studentUsers.some(({ role }) => role.code !== 'STUDENT')) {
    throw new Error('A linked account is not a student account. No data was changed.');
  }

  const outsideEnrollmentCount = semesterIds.length
    ? await prisma.studentEnrollment.count({
        where: {
          semesterId: { in: semesterIds },
          ...(studentIds.length ? { studentId: { notIn: studentIds } } : {}),
        },
      })
    : 0;
  const outsideResultCount = semesterIds.length
    ? await prisma.courseResult.count({
        where: {
          semesterId: { in: semesterIds },
          ...(studentIds.length ? { studentId: { notIn: studentIds } } : {}),
        },
      })
    : 0;
  if (outsideEnrollmentCount || outsideResultCount) {
    throw new Error(
      `The target colleges have ${outsideEnrollmentCount} enrollment(s) or ${outsideResultCount} result(s) for students not assigned to them. No data was changed.`,
    );
  }

  const sections = semesterIds.length
    ? await prisma.courseSection.findMany({ where: { semesterId: { in: semesterIds } }, select: { id: true } })
    : [];
  const sectionIds = sections.map(({ id }) => id);
  const enrollmentFilter = {
    OR: [
      ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
      ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
    ],
  };
  const [enrollmentCount, resultCount, ticketCount] = await Promise.all([
    studentIds.length || semesterIds.length
      ? prisma.studentEnrollment.count({ where: enrollmentFilter })
      : Promise.resolve(0),
    studentIds.length || semesterIds.length
      ? prisma.courseResult.count({ where: enrollmentFilter })
      : Promise.resolve(0),
    studentUserIds.length
      ? prisma.supportTicket.count({ where: { authorId: { in: studentUserIds } } })
      : Promise.resolve(0),
  ]);

  const preview = {
    colleges: colleges.map(({ id, nameAr, nameEn }) => ({ id, nameAr, nameEn })),
    notFoundAndPreserved: missingTargets,
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

  if (process.env.CONFIRM_DELETE_TEST_COLLEGE_IDS !== confirmationIds) {
    console.log(`Preview only. To apply, rerun with CONFIRM_DELETE_TEST_COLLEGE_IDS='${confirmationIds}'`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < foundMatches.length; i += 1) {
        const current = await tx.college.findUnique({ where: { id: colleges[i].id } });
        const subtitleMatches =
          foundMatches[i].target.expected.nameEn === null
            ? current?.nameEn === null || current?.nameEn === ''
            : current?.nameEn === foundMatches[i].target.expected.nameEn;
        if (!current || current.nameAr !== foundMatches[i].target.expected.nameAr || !subtitleMatches) {
          throw new Error(`Target changed after preview (${foundMatches[i].target.label}). No data was deleted.`);
        }
      }

      if (studentIds.length || semesterIds.length) {
        await tx.courseResult.deleteMany({ where: enrollmentFilter });
        await tx.studentEnrollment.deleteMany({ where: enrollmentFilter });
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

      for (const college of colleges) {
        await tx.college.delete({ where: { id: college.id } });
        await tx.auditLog.create({
          data: {
            action: 'TEST_COLLEGE_AND_DATA_DELETED',
            entity: 'College',
            entityId: college.id,
            details: JSON.stringify(preview),
          },
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  console.log('Deletion completed.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
