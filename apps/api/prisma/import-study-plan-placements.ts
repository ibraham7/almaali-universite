import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import placementData from "./data/teacher-class-placements.json" with { type: "json" };

// Places catalog courses (already imported by import-curricula.ts, sitting
// without a level/semester) into their level and semester per the
// university's own "indicative plan" (الخطة الاسترشادية) document — pure
// structural data entry. This does NOT open any course for registration:
// that still requires a supervisor to create an actual CourseSection for
// the real term, exactly as before. Safe to re-run: every write is an
// upsert keyed on the plan's natural unique constraints.

if (process.env.CONFIRM_PLACEMENT_IMPORT !== "YES") {
  throw new Error(
    "Set CONFIRM_PLACEMENT_IMPORT=YES to apply the idempotent study-plan placement import.",
  );
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function newCourseCode(nameAr: string) {
  return "IMP-" + createHash("sha256").update(nameAr).digest("hex").slice(0, 12).toUpperCase();
}

const levelNameAr = ["", "السنة الأولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة"];
const semesterNameAr = ["", "الفصل الأول", "الفصل الثاني"];

async function main() {
  const program = await prisma.program.findFirst({
    where: { nameAr: "معلم الصف", college: { nameAr: "كلية التربية" } },
    select: { id: true, studyPlans: { select: { id: true, nameAr: true } } },
  });
  if (!program) throw new Error("لم يتم العثور على برنامج (معلم الصف) بكلية التربية. استورد الكتالوج أولاً.");
  if (program.studyPlans.length !== 1) {
    throw new Error(`عدد الخطط الدراسية لهذا البرنامج ${program.studyPlans.length}، متوقع خطة واحدة فقط.`);
  }
  const studyPlanId = program.studyPlans[0].id;

  const report = { levelsCreated: 0, semestersCreated: 0, coursesCreated: 0, placementsLinked: 0 };

  for (const level of placementData.levels) {
    const existingYear = await prisma.academicYear.findUnique({
      where: { studyPlanId_levelNumber: { studyPlanId, levelNumber: level.levelNumber } },
      select: { id: true },
    });
    const academicYear = existingYear
      ?? (await prisma.academicYear.create({
        data: { studyPlanId, levelNumber: level.levelNumber, nameAr: levelNameAr[level.levelNumber] },
        select: { id: true },
      }));
    if (!existingYear) report.levelsCreated++;

    const existingSemester = await prisma.semester.findUnique({
      where: { academicYearId_semesterNumber: { academicYearId: academicYear.id, semesterNumber: level.semesterNumber } },
      select: { id: true },
    });
    const semester = existingSemester
      ?? (await prisma.semester.create({
        data: {
          academicYearId: academicYear.id,
          semesterNumber: level.semesterNumber,
          nameAr: semesterNameAr[level.semesterNumber],
        },
        select: { id: true },
      }));
    if (!existingSemester) report.semestersCreated++;

    for (const item of level.items) {
      let course = await prisma.course.findFirst({ where: { nameAr: item.course }, select: { id: true } });
      if (!course) {
        if (!item.isNewCourse) {
          throw new Error(`المقرر "${item.course}" غير موجود بالكتالوج ولم يُعلَّم كمقرر جديد.`);
        }
        course = await prisma.course.create({
          data: {
            code: newCourseCode(item.course),
            nameAr: item.course,
            credits: item.credits,
            type: "UNSPECIFIED",
            requirement: item.requirement as "MANDATORY" | "ELECTIVE",
            status: "ACTIVE",
            description: `مستورد من ${placementData.sourceFile}؛ مقرر غير موجود في قائمة المقررات الأصلية.`,
          },
          select: { id: true },
        });
        report.coursesCreated++;
      }

      await prisma.studyPlanCourse.upsert({
        where: {
          studyPlanId_academicYearId_semesterId_courseId: {
            studyPlanId,
            academicYearId: academicYear.id,
            semesterId: semester.id,
            courseId: course.id,
          },
        },
        update: { priority: item.priority, requirement: item.requirement as "MANDATORY" | "ELECTIVE" },
        create: {
          studyPlanId,
          academicYearId: academicYear.id,
          semesterId: semester.id,
          courseId: course.id,
          priority: item.priority,
          requirement: item.requirement as "MANDATORY" | "ELECTIVE",
        },
      });
      report.placementsLinked++;
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
