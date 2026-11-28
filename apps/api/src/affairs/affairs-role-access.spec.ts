import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { AffairsController } from './affairs.controller.js';
import { AffairsAccessGuard } from './affairs-access.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// وحدة شؤون الطلاب: تدخلها أدوار محددة، والمشرف الأكاديمي مشروط بملف موظف فعّال. هذا الاختبار يفحص كل مسارات المتحكم فعلاً.
const rolesGuard = new RolesGuard(new Reflector());
const proto = AffairsController.prototype as unknown as Record<string, unknown>;
const handlers = Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.hasMetadata('path', proto[name] as object));
const STUDENT_ONLY = handlers.filter((name) => new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [proto[name] as Function, AffairsController])?.join() === 'STUDENT');

function contextFor(handler: Function, role: string) {
  return {
    getHandler: () => handler, getClass: () => AffairsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', email: 'x', role } }) }),
  } as unknown as ExecutionContext;
}
const guardFor = (staff: unknown) => new AffairsAccessGuard({ affairsStaff: { findFirst: vi.fn().mockResolvedValue(staff) } } as unknown as PrismaService);

describe('student affairs: roles and access', () => {
  it('finds the controller routes (guards against an empty loop)', () => {
    expect(handlers.length).toBeGreaterThan(30);
    expect(STUDENT_ONLY.length).toBeGreaterThan(3);
  });

  it('every route declares its roles explicitly', () => {
    for (const name of handlers) {
      const roles = new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [proto[name] as Function, AffairsController]);
      expect(roles?.length, `route ${name} has no @Roles`).toBeGreaterThan(0);
    }
  });

  it('the site editor never enters; the affairs staff role, registrar and admin enter the staff routes; a student only their own routes', () => {
    for (const name of handlers) expect(rolesGuard.canActivate(contextFor(proto[name] as Function, 'SITE_EDITOR')), `site editor allowed on ${name}`).toBe(false);
    const summary = proto.summary as Function;
    for (const role of ['AFFAIRS_STAFF', 'REGISTRAR', 'SYSTEM_ADMIN']) expect(rolesGuard.canActivate(contextFor(summary, role)), role).toBe(true);
    expect(rolesGuard.canActivate(contextFor(summary, 'STUDENT'))).toBe(false);
    for (const name of STUDENT_ONLY) {
      expect(rolesGuard.canActivate(contextFor(proto[name] as Function, 'STUDENT'))).toBe(true);
      for (const role of ['AFFAIRS_STAFF', 'REGISTRAR', 'ADVISOR']) expect(rolesGuard.canActivate(contextFor(proto[name] as Function, role)), `${role} on student route ${name}`).toBe(false);
    }
  });

  it('an academic advisor passes the role check but is refused (403) unless an admin added them as an active affairs staff member', async () => {
    const summary = proto.summary as Function;
    expect(rolesGuard.canActivate(contextFor(summary, 'ADVISOR'))).toBe(true);
    await expect(guardFor(null).canActivate(contextFor(summary, 'ADVISOR'))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guardFor(null).canActivate(contextFor(summary, 'ADVISOR'))).rejects.toThrow('لا تملك صلاحية');
    await expect(guardFor({ id: 's1' }).canActivate(contextFor(summary, 'ADVISOR'))).resolves.toBe(true);
    // other roles are not affected by the staff-profile check
    for (const role of ['REGISTRAR', 'SYSTEM_ADMIN', 'AFFAIRS_STAFF', 'STUDENT']) await expect(guardFor(null).canActivate(contextFor(summary, role))).resolves.toBe(true);
  });
});
