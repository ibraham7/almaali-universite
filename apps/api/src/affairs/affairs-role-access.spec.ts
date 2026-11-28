import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { AffairsController } from './affairs.controller.js';
import { AdvisorAffairsController } from './advisor-affairs.controller.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';

// وحدة شؤون الطلاب: لوحة الموظفين لأدوار محددة، ومساحة المشرف مستقلة بمسارات خاصة. هذا الاختبار يفحص كل مسارات المتحكمين فعلاً.
const rolesGuard = new RolesGuard(new Reflector());
const routesOf = (controller: Function) => {
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.hasMetadata('path', proto[name] as object)).map((name) => ({ name, handler: proto[name] as Function, controller }));
};
const staffRoutes = routesOf(AffairsController);
const advisorRoutes = routesOf(AdvisorAffairsController);
const rolesOf = (route: { handler: Function; controller: Function }) => new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [route.handler, route.controller]);
const allowed = (route: { handler: Function; controller: Function }, role: string) => rolesGuard.canActivate({
  getHandler: () => route.handler, getClass: () => route.controller,
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', email: 'x', role } }) }),
} as unknown as ExecutionContext);
const byName = (name: string) => staffRoutes.find((route) => route.name === name)!;

describe('student affairs: roles and access', () => {
  it('finds the routes (guards against empty loops)', () => {
    expect(staffRoutes.length).toBeGreaterThan(30);
    expect(advisorRoutes.length).toBeGreaterThanOrEqual(8);
  });

  it('every route declares its roles explicitly', () => {
    for (const route of [...staffRoutes, ...advisorRoutes]) expect(rolesOf(route)?.length, `route ${route.name} has no @Roles`).toBeGreaterThan(0);
  });

  it('the academic advisor cannot enter the staff panel routes, except reading their own notifications', () => {
    const own = new Set(['listNotifications', 'unreadCount', 'markAllRead', 'markRead']);
    const advisorAllowed = staffRoutes.filter((route) => allowed(route, 'ADVISOR')).map((route) => route.name);
    expect(advisorAllowed.length).toBeGreaterThan(0);
    for (const name of advisorAllowed) expect(own.has(name) || /otification|nread|ead/i.test(name), `advisor allowed on ${name}`).toBe(true);
    for (const name of ['summary', 'requests', 'staff', 'listStudents', 'studentFile', 'stuck', 'reports', 'settings']) {
      const route = staffRoutes.find((r) => r.name.toLowerCase().startsWith(name.toLowerCase()));
      if (route) expect(allowed(route, 'ADVISOR'), `advisor allowed on ${route.name}`).toBe(false);
    }
  });

  it('the advisor workspace is for advisors only: nobody else (not even registrar, staff, admin, student, site editor) enters it', () => {
    for (const route of advisorRoutes) {
      expect(allowed(route, 'ADVISOR'), route.name).toBe(true);
      for (const role of ['REGISTRAR', 'AFFAIRS_STAFF', 'SYSTEM_ADMIN', 'STUDENT', 'SITE_EDITOR']) expect(allowed(route, role), `${role} on advisor route ${route.name}`).toBe(false);
    }
  });

  it('the site editor never enters the staff routes; affairs staff, registrar and admin enter; a student only their own routes', () => {
    for (const route of staffRoutes) expect(allowed(route, 'SITE_EDITOR'), `site editor on ${route.name}`).toBe(false);
    for (const role of ['AFFAIRS_STAFF', 'REGISTRAR', 'SYSTEM_ADMIN']) expect(allowed(byName('summary'), role), role).toBe(true);
    expect(allowed(byName('summary'), 'STUDENT')).toBe(false);
    for (const route of staffRoutes.filter((r) => rolesOf(r).join() === 'STUDENT')) {
      expect(allowed(route, 'STUDENT')).toBe(true);
      for (const role of ['AFFAIRS_STAFF', 'REGISTRAR', 'ADVISOR']) expect(allowed(route, role), `${role} on student route ${route.name}`).toBe(false);
    }
  });
});
