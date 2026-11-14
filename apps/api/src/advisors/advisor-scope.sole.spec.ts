import { findSoleAdvisorForStudent } from './advisor-scope.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function db(options: { programs?: string[]; colleges?: string[]; active?: boolean }) {
  return {
    advisorProgramAssignment: { findMany: vi.fn().mockResolvedValue((options.programs ?? []).map((advisorId) => ({ advisorId }))) },
    advisorCollegeAssignment: { findMany: vi.fn().mockResolvedValue((options.colleges ?? []).map((advisorId) => ({ advisorId }))) },
    user: { findFirst: vi.fn().mockResolvedValue(options.active === false ? null : { id: 'ok' }) },
  } as unknown as PrismaService;
}
const student = { programId: 'p1', collegeId: 'c1' };

describe('findSoleAdvisorForStudent', () => {
  it('returns the single advisor covering the program or college', async () => {
    expect(await findSoleAdvisorForStudent(db({ colleges: ['a1'] }), student)).toBe('ok');
    expect(await findSoleAdvisorForStudent(db({ programs: ['a1'], colleges: ['a1'] }), student)).toBe('ok');
  });

  it('returns null when nobody covers the student', async () => {
    expect(await findSoleAdvisorForStudent(db({}), student)).toBeNull();
  });

  it('returns null instead of guessing when several advisors qualify', async () => {
    expect(await findSoleAdvisorForStudent(db({ programs: ['a1'], colleges: ['a2'] }), student)).toBeNull();
  });

  it('returns null when the only candidate is not an active advisor', async () => {
    expect(await findSoleAdvisorForStudent(db({ colleges: ['a1'], active: false }), student)).toBeNull();
  });
});
