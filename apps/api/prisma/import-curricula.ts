import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

if (process.env.CONFIRM_CURRICULA_IMPORT !== 'YES') {
  throw new Error('Set CONFIRM_CURRICULA_IMPORT=YES to apply the idempotent curricula import.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');

const data = JSON.parse(await readFile(new URL('./data/curricula.json', import.meta.url), 'utf8')) as {
  formatVersion: number;
  plans: Array<{
    key: string;
    collegeNameAr: string;
    programNameAr: string;
    studyPlanNameAr: string;
    sourceFile: string;
    graduationCredits: number;
    quotas: Record<string, Record<string, { requiredCredits: number; offeredPoolCredits: number }>>;
    courses: Array<{
      code: string;
      nameAr: string;
      credits: number;
      category: 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM';
      requirement: 'MANDATORY' | 'ELECTIVE';
      prerequisiteName: string | null;
      prerequisiteCode?: string;
      sourceRow: number;
    }>;
    placements: unknown[];
    warnings: Array<Record<string, unknown>>;
  }>;
};
if (data.formatVersion !== 1) throw new Error('Unsupported curricula manifest format.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const universities = await prisma.university.findMany({ select: { id: true, nameAr: true } });
  if (universities.length !== 1) {
    throw new Error(`Expected exactly one university record before importing curricula; found ${universities.length}.`);
  }
  const university = universities[0];
  const report: Array<{ plan: string; courses: number; links: number; prerequisites: number; quotas: number; warnings: Array<Record<string, unknown>> }> = [];

  for (const curriculum of data.plans) {
    const result = await prisma.$transaction(async (tx) => {
      const college = await tx.college.upsert({
        where: { universityId_nameAr: { universityId: university.id, nameAr: curriculum.collegeNameAr } },
        update: {},
        create: { universityId: university.id, nameAr: curriculum.collegeNameAr },
      });
      let program = await tx.program.findFirst({
        where: {
          nameAr: curriculum.programNameAr,
          OR: [{ collegeId: college.id }, { department: { collegeId: college.id } }],
        },
      });
      if (!program) program = await tx.program.create({ data: { collegeId: college.id, nameAr: curriculum.programNameAr } });
      const existingPlans = await tx.studyPlan.findMany({ where: { programId: program.id }, select: { id: true, nameAr: true } });
      if (existingPlans.length > 1) {
        throw new Error(`Multiple study plans exist for ${curriculum.programNameAr}; choose the target plan before importing.`);
      }
      const studyPlan = existingPlans[0]
        ? await tx.studyPlan.update({ where: { id: existingPlans[0].id }, data: { graduationCredits: curriculum.graduationCredits } })
        : await tx.studyPlan.create({ data: { programId: program.id, nameAr: curriculum.studyPlanNameAr, graduationCredits: curriculum.graduationCredits } });

      const ids = new Map<string, string>();
      let links = 0;
      for (const item of curriculum.courses) {
        const course = await tx.course.upsert({
          where: { code: item.code },
          update: {
            nameAr: item.nameAr,
            credits: item.credits,
            type: 'UNSPECIFIED',
            requirement: item.requirement,
            status: 'ACTIVE',
            description: `مستورد من ${curriculum.sourceFile}؛ نوع المقرر (نظري/عملي) غير مذكور في المصدر.`,
          },
          create: {
            code: item.code,
            nameAr: item.nameAr,
            credits: item.credits,
            type: 'UNSPECIFIED',
            requirement: item.requirement,
            status: 'ACTIVE',
            description: `مستورد من ${curriculum.sourceFile}؛ نوع المقرر (نظري/عملي) غير مذكور في المصدر.`,
          },
          select: { id: true },
        });
        ids.set(item.code, course.id);
        await tx.studyPlanCurriculumCourse.upsert({
          where: { studyPlanId_courseId_category_requirement: { studyPlanId: studyPlan.id, courseId: course.id, category: item.category, requirement: item.requirement } },
          update: { sourceFile: curriculum.sourceFile, sourceRow: item.sourceRow },
          create: { studyPlanId: studyPlan.id, courseId: course.id, category: item.category, requirement: item.requirement, sourceFile: curriculum.sourceFile, sourceRow: item.sourceRow },
        });
        links++;
      }

      let prerequisites = 0;
      for (const item of curriculum.courses) {
        if (!item.prerequisiteCode) continue;
        const courseId = ids.get(item.code);
        const prerequisiteId = ids.get(item.prerequisiteCode);
        if (!courseId || !prerequisiteId || courseId === prerequisiteId) continue;
        await tx.coursePrerequisite.upsert({
          where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
          update: {},
          create: { courseId, prerequisiteId },
        });
        prerequisites++;
      }

      let quotas = 0;
      for (const [category, entries] of Object.entries(curriculum.quotas)) {
        for (const [requirement, quota] of Object.entries(entries)) {
          await tx.studyPlanCurriculumQuota.upsert({
            where: { studyPlanId_category_requirement: { studyPlanId: studyPlan.id, category: category as 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM', requirement: requirement as 'MANDATORY' | 'ELECTIVE' } },
            update: { requiredCredits: quota.requiredCredits, offeredPoolCredits: quota.offeredPoolCredits },
            create: { studyPlanId: studyPlan.id, category: category as 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM', requirement: requirement as 'MANDATORY' | 'ELECTIVE', requiredCredits: quota.requiredCredits, offeredPoolCredits: quota.offeredPoolCredits },
          });
          quotas++;
        }
      }

      return { plan: curriculum.programNameAr, courses: curriculum.courses.length, links, prerequisites, quotas, warnings: curriculum.warnings };
    });
    report.push(result);
  }

  const digest = createHash('sha256').update(JSON.stringify(report)).digest('hex').slice(0, 12);
  console.log(JSON.stringify({ university: university.nameAr, report, importRun: digest, note: 'No course was placed in a level or semester. Those placements need review/approval first.' }, null, 2));
} finally {
  await prisma.$disconnect();
}
