import { describe, expect, it } from 'vitest';
import { allowedTransitions, canRegisterCourses, canRequestServices, parseStudentStatus } from './student-status.js';

describe('student status rules', () => {
  it('only a continuing student registers courses', () => {
    expect(canRegisterCourses('CONTINUING')).toBe(true);
    for (const s of ['PENDING_REGISTRATION', 'DEFERRED', 'WITHDRAWN', 'DISMISSED', 'GRADUATED', 'DEREGISTERED']) expect(canRegisterCourses(s)).toBe(false);
    expect(canRegisterCourses(undefined)).toBe(false);
  });

  it('withdrawn, dismissed and deregistered students cannot request services; the others can', () => {
    for (const s of ['WITHDRAWN', 'DISMISSED', 'DEREGISTERED']) expect(canRequestServices(s)).toBe(false);
    for (const s of ['PENDING_REGISTRATION', 'CONTINUING', 'DEFERRED', 'GRADUATED']) expect(canRequestServices(s)).toBe(true);
  });

  it('reads a status from its code or its Arabic name', () => {
    expect(parseStudentStatus('CONTINUING')).toBe('CONTINUING');
    expect(parseStudentStatus('مستمر')).toBe('CONTINUING');
    expect(parseStudentStatus('قيد استكمال التسجيل')).toBe('PENDING_REGISTRATION');
    expect(parseStudentStatus('ACTIVE')).toBeNull();
    expect(parseStudentStatus('')).toBeNull();
  });

  it('lists the transitions each role may make', () => {
    expect(allowedTransitions('CONTINUING', 'REGISTRAR')).toEqual(['DEFERRED', 'WITHDRAWN', 'DISMISSED', 'DEREGISTERED']);
    expect(allowedTransitions('CONTINUING', 'SYSTEM_ADMIN')).toContain('GRADUATED');
    expect(allowedTransitions('DISMISSED', 'REGISTRAR')).toEqual([]);
    expect(allowedTransitions('DISMISSED', 'SYSTEM_ADMIN')).toEqual(['CONTINUING']);
    expect(allowedTransitions('WITHDRAWN', 'SYSTEM_ADMIN')).toEqual([]);
  });
});
