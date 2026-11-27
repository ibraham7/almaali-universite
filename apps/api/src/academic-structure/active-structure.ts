import { BadRequestException } from '@nestjs/common';

// الكلية/القسم/البرنامج المعطّلة تبقى ببياناتها، لكنها لا تُختار لطلاب جدد ولا لخطط جديدة.
// القسم يتبع كليته والبرنامج يتبع قسمه وكليته: تعطيل الأعلى يعطّل ما تحته عند الاختيار.
interface Db {
  college: { findUnique: (args: any) => Promise<any> };
  department: { findUnique: (args: any) => Promise<any> };
  program: { findUnique: (args: any) => Promise<any> };
}

type Ids = { collegeId?: string | null; departmentId?: string | null; programId?: string | null };

// current: القيم الحالية للسجل المعدَّل. ما لم يتغير لا يُفحص، فيبقى تعديل طالب في كلية معطّلة ممكنًا.
export async function assertSelectable(db: Db, ids: Ids, current: Ids = {}) {
  const off = (kind: string, name: string) => { throw new BadRequestException(`${kind} «${name}» معطّلة ولا يمكن اختيارها. فعّلها من الهيكل الأكاديمي أو اختر غيرها.`); };
  if (ids.collegeId && ids.collegeId !== current.collegeId) {
    const college = await db.college.findUnique({ where: { id: ids.collegeId }, select: { nameAr: true, isActive: true } });
    if (college && college.isActive === false) off('الكلية', college.nameAr);
  }
  if (ids.departmentId && ids.departmentId !== current.departmentId) {
    const department = await db.department.findUnique({ where: { id: ids.departmentId }, select: { nameAr: true, isActive: true, college: { select: { nameAr: true, isActive: true } } } });
    if (department && department.isActive === false) off('القسم', department.nameAr);
    if (department?.college && department.college.isActive === false) off('الكلية', department.college.nameAr);
  }
  if (ids.programId && ids.programId !== current.programId) {
    const program = await db.program.findUnique({ where: { id: ids.programId }, select: { nameAr: true, isActive: true, college: { select: { nameAr: true, isActive: true } }, department: { select: { nameAr: true, isActive: true, college: { select: { nameAr: true, isActive: true } } } } } });
    if (program && program.isActive === false) off('البرنامج', program.nameAr);
    if (program?.department && program.department.isActive === false) off('القسم', program.department.nameAr);
    const college = program?.department?.college ?? program?.college;
    if (college && college.isActive === false) off('الكلية', college.nameAr);
  }
}
