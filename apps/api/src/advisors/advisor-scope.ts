import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Resolves the full set of program IDs an advisor can act on: those
 * assigned directly (AdvisorProgramAssignment) plus every program under
 * any college assigned to them wholesale (AdvisorCollegeAssignment),
 * including departments and programs added to that college after the
 * assignment was made. Resolved live on every call, never cached, so a
 * newly added program shows up immediately without re-assigning anyone.
 */
export async function getAdvisorAllowedProgramIds(
  prisma: PrismaService,
  advisorId: string,
): Promise<string[]> {
  const [programAssignments, collegeAssignments] = await Promise.all([
    prisma.advisorProgramAssignment.findMany({
      where: { advisorId },
      select: { programId: true },
    }),
    prisma.advisorCollegeAssignment.findMany({
      where: { advisorId },
      select: { collegeId: true },
    }),
  ]);

  const collegeIds = collegeAssignments.map((row) => row.collegeId);
  const programsUnderColleges = collegeIds.length
    ? await prisma.program.findMany({
        where: {
          OR: [
            { collegeId: { in: collegeIds } },
            { department: { collegeId: { in: collegeIds } } },
          ],
        },
        select: { id: true },
      })
    : [];

  return [
    ...new Set([
      ...programAssignments.map((row) => row.programId),
      ...programsUnderColleges.map((row) => row.id),
    ]),
  ];
}

/** Whether the given program falls within what the advisor is allowed to manage. */
export async function isProgramAllowedForAdvisor(
  prisma: PrismaService,
  advisorId: string,
  programId: string,
): Promise<boolean> {
  const allowed = await getAdvisorAllowedProgramIds(prisma, advisorId);
  return allowed.includes(programId);
}
