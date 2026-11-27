import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertSelectable } from './active-structure.js';
import { ProgramsService } from '../programs/programs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const on = { nameAr: 'كلية فعّالة', isActive: true };
const off = { nameAr: 'كلية معطّلة', isActive: false };

function db(over: Record<string, unknown> = {}) {
  return {
    college: { findUnique: vi.fn().mockResolvedValue(on) },
    department: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'قسم', isActive: true, college: on }) },
    program: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'بكالوريوس', isActive: true, college: on, department: { nameAr: 'قسم', isActive: true, college: on } }) },
    ...over,
  } as never;
}

describe('disabled college / department / program', () => {
  it('a disabled one cannot be chosen, at any level', async () => {
    await expect(assertSelectable(db({ college: { findUnique: vi.fn().mockResolvedValue(off) } }), { collegeId: 'c1' })).rejects.toThrow('كلية معطّلة');
    await expect(assertSelectable(db({ department: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'قسم', isActive: false, college: on }) } }), { departmentId: 'd1' })).rejects.toThrow('القسم');
    await expect(assertSelectable(db({ program: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'دبلوم', isActive: false, department: null, college: on }) } }), { programId: 'p1' })).rejects.toThrow('البرنامج');
  });

  it('disabling a college disables its departments and programs for new choices', async () => {
    await expect(assertSelectable(db({ department: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'قسم', isActive: true, college: off }) } }), { departmentId: 'd1' })).rejects.toThrow('كلية معطّلة');
    await expect(assertSelectable(db({ program: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'ماجستير', isActive: true, college: off, department: { nameAr: 'قسم', isActive: true, college: off } }) } }), { programId: 'p1' })).rejects.toThrow('كلية معطّلة');
    await expect(assertSelectable(db({ program: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'ماجستير', isActive: true, college: on, department: { nameAr: 'قسم معطّل', isActive: false, college: on } }) } }), { programId: 'p1' })).rejects.toThrow('قسم معطّل');
  });

  it('an unchanged value is not checked, so a student who stayed in a disabled college can still be edited', async () => {
    const find = vi.fn().mockResolvedValue(off);
    await expect(assertSelectable(db({ college: { findUnique: find } }), { collegeId: 'c1' }, { collegeId: 'c1' })).resolves.toBeUndefined();
    expect(find).not.toHaveBeenCalled();
    await expect(assertSelectable(db(), { collegeId: 'c1', departmentId: 'd1', programId: 'p1' })).resolves.toBeUndefined();
  });

  it('a program can be switched off and on, logged, and not switched on under a disabled department', async () => {
    const audit = vi.fn().mockResolvedValue({});
    const update = vi.fn(async ({ data }: any) => ({ id: 'p1', ...data }));
    const program = { id: 'p1', nameAr: 'بكالوريوس', level: 'BACHELOR', isActive: true, departmentId: 'd1', college: on, department: { nameAr: 'قسم', isActive: true, college: on } };
    const prisma = { program: { findUnique: vi.fn().mockResolvedValue(program), update }, auditLog: { create: audit } } as unknown as PrismaService;
    const service = new ProgramsService(prisma);
    await expect(service.update('p1', { isActive: false }, 'u1')).resolves.toMatchObject({ isActive: false });
    expect(update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false } });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'PROGRAM_DISABLED', userId: 'u1' }) });
    // same value: nothing happens
    await expect(service.update('p1', { isActive: true }, 'u1')).resolves.toBe(program);
    // enabling under a disabled department is refused
    const blocked = { ...program, isActive: false, department: { nameAr: 'قسم معطّل', isActive: false, college: on } };
    const refused = new ProgramsService({ program: { findUnique: vi.fn().mockResolvedValue(blocked), update }, auditLog: { create: audit } } as unknown as PrismaService);
    await expect(refused.update('p1', { isActive: true }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
