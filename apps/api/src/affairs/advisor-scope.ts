import { getAdvisorAllowedProgramIds } from '../advisors/advisor-scope.js';

// نطاق المشرف في شؤون الطلاب = تعييناته الحالية بالنظام (كليات كاملة وبرامج محددة)، تُحسب عند كل طلب ولا تُخزَّن.
// `db` هو عميل Prisma أو معاملة.

// الكليات التي يغطيها المشرف: المسندة له مباشرة + كلية كل برنامج مسند له.
export async function advisorCollegeIds(db: any, advisorId: string): Promise<string[]> {
  const [colleges, programs] = await Promise.all([
    db.advisorCollegeAssignment.findMany({ where: { advisorId }, select: { collegeId: true } }),
    db.advisorProgramAssignment.findMany({ where: { advisorId }, select: { program: { select: { collegeId: true, department: { select: { collegeId: true } } } } } }),
  ]);
  const ids = new Set<string>(colleges.map((row: { collegeId: string }) => row.collegeId));
  for (const row of programs as Array<{ program: { collegeId: string | null; department: { collegeId: string } | null } }>) {
    const id = row.program.collegeId ?? row.program.department?.collegeId;
    if (id) ids.add(id);
  }
  return [...ids];
}

// شرط يحصر الطلاب بنطاق المشرف: طلاب كلياته أو برامجه.
export async function advisorStudentWhere(db: any, advisorId: string) {
  const [collegeIds, programIds] = await Promise.all([advisorCollegeIds(db, advisorId), getAdvisorAllowedProgramIds(db, advisorId)]);
  if (collegeIds.length === 0 && programIds.length === 0) return { id: { in: [] as string[] } };
  return { OR: [{ collegeId: { in: collegeIds } }, { programId: { in: programIds } }] };
}

export async function advisorCoversCollege(db: any, advisorId: string, collegeId: string) {
  return (await advisorCollegeIds(db, advisorId)).includes(collegeId);
}

// المشرفون الفعّالون الذين يغطون الكلية (لإشعارهم بإحالة وُجّهت للكلية).
export async function advisorsOfCollege(db: any, collegeId: string): Promise<string[]> {
  const rows = await db.user.findMany({
    where: {
      status: 'ACTIVE', role: { code: 'ADVISOR' },
      OR: [
        { advisorCollegeAssignments: { some: { collegeId } } },
        { advisorProgramAssignments: { some: { program: { OR: [{ collegeId }, { department: { collegeId } }] } } } },
      ],
    },
    select: { id: true, displayName: true, username: true, email: true },
  });
  return rows.map((row: { id: string }) => row.id);
}
