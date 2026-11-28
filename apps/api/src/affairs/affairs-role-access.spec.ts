import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { AffairsController } from './affairs.controller.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';

// أي مسار بلوحة شؤون الطلاب: المشرف الأكاديمي (ADVISOR) ممنوع منه (403 من RolesGuard). هذا الاختبار يفحص كل مسارات المتحكم فعلاً.
const guard = new RolesGuard(new Reflector());
const proto = AffairsController.prototype as unknown as Record<string, unknown>;
const handlers = Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.hasMetadata('path', proto[name] as object));

function contextFor(handler: Function, role: string) {
  return {
    getHandler: () => handler, getClass: () => AffairsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', email: 'x', role } }) }),
  } as unknown as ExecutionContext;
}

describe('student affairs routes and roles', () => {
  it('finds the controller routes (guards against an empty loop)', () => {
    expect(handlers.length).toBeGreaterThan(30);
  });

  it('every route declares its roles explicitly (none is open to any signed-in user)', () => {
    for (const name of handlers) {
      const roles = new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [proto[name] as Function, AffairsController]);
      expect(roles?.length, `route ${name} has no @Roles`).toBeGreaterThan(0);
    }
  });

  it('the academic advisor is refused on every affairs route (the guard returns false, which Nest turns into 403)', () => {
    for (const name of handlers) {
      expect(guard.canActivate(contextFor(proto[name] as Function, 'ADVISOR')), `advisor allowed on ${name}`).toBe(false);
    }
  });

  it('the site editor is refused too, while an affairs employee (registrar) and the system admin are allowed on the staff routes', () => {
    for (const name of handlers) expect(guard.canActivate(contextFor(proto[name] as Function, 'SITE_EDITOR')), `site editor allowed on ${name}`).toBe(false);
    const summary = proto.summary as Function;
    expect(guard.canActivate(contextFor(summary, 'REGISTRAR'))).toBe(true);
    expect(guard.canActivate(contextFor(summary, 'SYSTEM_ADMIN'))).toBe(true);
    expect(guard.canActivate(contextFor(summary, 'STUDENT'))).toBe(false);
  });
});
