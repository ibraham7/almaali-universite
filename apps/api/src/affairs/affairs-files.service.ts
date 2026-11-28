import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const PAGE_SIZE = 20;

function displayName(s: { fullName: string | null; firstName: string; middleName: string | null; familyName: string }) {
  return s.fullName || [s.firstName, s.middleName, s.familyName].filter(Boolean).join(' ');
}

// Read-only view of the student's electronic file for the affairs staff.
// Everything is tied to Student.id, so history survives a change of university number.
@Injectable()
export class AffairsFilesService {
  constructor(private readonly prisma: PrismaService) {}

  // Search by name, current or previous university number, or national ID.
  // scope: شرط إضافي يحصر الطلاب (للمشرف: طلاب كليته فقط).
  async list(search: string | undefined, page = 1, scope?: object) {
    const term = search?.trim();
    const searchWhere = term
      ? {
          OR: [
            { universityId: { contains: term, mode: 'insensitive' as const } },
            { fullName: { contains: term, mode: 'insensitive' as const } },
            { firstName: { contains: term, mode: 'insensitive' as const } },
            { familyName: { contains: term, mode: 'insensitive' as const } },
            { nationalId: { contains: term } },
            { numberHistory: { some: { universityId: { contains: term, mode: 'insensitive' as const } } } },
          ],
        }
      : {};
    const where = scope ? { AND: [scope, searchWhere] } : searchWhere;
    const [total, rows] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where, orderBy: { universityId: 'asc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: { id: true, universityId: true, fullName: true, firstName: true, middleName: true, familyName: true, status: true, collegeId: true, programId: true },
      }),
    ]);
    const collegeIds = [...new Set(rows.map((r) => r.collegeId).filter((x): x is string => !!x))];
    const colleges = collegeIds.length ? await this.prisma.college.findMany({ where: { id: { in: collegeIds } }, select: { id: true, nameAr: true } }) : [];
    const collegeName = new Map(colleges.map((c) => [c.id, c.nameAr]));
    return {
      total, page, pageSize: PAGE_SIZE,
      items: rows.map((r) => ({ id: r.id, universityId: r.universityId, name: displayName(r), status: r.status, college: r.collegeId ? collegeName.get(r.collegeId) ?? null : null })),
    };
  }

  async get(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        numberHistory: { orderBy: { validTo: 'desc' } },
        dataChanges: { orderBy: { createdAt: 'desc' }, take: 100 },
        documents: { orderBy: { issuedAt: 'desc' }, select: { id: true, number: true, status: true, issuedAt: true, revokedAt: true, revokedReason: true, type: { select: { nameAr: true } } } },
        affairsRequests: {
          orderBy: { createdAt: 'desc' }, take: 100,
          select: {
            id: true, number: true, status: true, channel: true, subject: true, createdAt: true, closedAt: true, service: { select: { nameAr: true } },
            attachments: { where: { isArchived: false }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } },
            referrals: { select: { id: true, target: true, targetName: true, mode: true, status: true, outcome: true, createdAt: true } },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('الطالب غير موجود.');

    const collegeIds = [...new Set([s.collegeId, ...s.numberHistory.map((h) => h.collegeId)].filter((x): x is string => !!x))];
    const [colleges, department, program, advisor, actors] = await Promise.all([
      collegeIds.length ? this.prisma.college.findMany({ where: { id: { in: collegeIds } }, select: { id: true, nameAr: true } }) : Promise.resolve([]),
      s.departmentId ? this.prisma.department.findUnique({ where: { id: s.departmentId }, select: { nameAr: true } }) : Promise.resolve(null),
      s.programId ? this.prisma.program.findUnique({ where: { id: s.programId }, select: { nameAr: true } }) : Promise.resolve(null),
      s.advisorId ? this.prisma.user.findUnique({ where: { id: s.advisorId }, select: { displayName: true, username: true, email: true } }) : Promise.resolve(null),
      this.actorNames([...s.dataChanges.map((c) => c.changedByUserId), ...s.numberHistory.map((h) => h.changedById)]),
    ]);
    const collegeName = new Map(colleges.map((c) => [c.id, c.nameAr]));

    return {
      id: s.id,
      name: displayName(s),
      personal: {
        fullName: s.fullName, firstName: s.firstName, middleName: s.middleName, familyName: s.familyName, englishName: s.englishName, motherName: s.motherName,
        gender: s.gender, dateOfBirth: s.dateOfBirth, birthPlace: s.birthPlace, nationality: s.nationality, nationalId: s.nationalId, idOrPassport: s.idOrPassport,
        meritNumber: s.meritNumber, applicationNumber: s.applicationNumber,
      },
      contact: { phone: s.phone, universityEmail: s.universityEmail },
      university: {
        universityId: s.universityId, status: s.status, admissionDate: s.admissionDate,
        college: s.collegeId ? collegeName.get(s.collegeId) ?? null : null, department: department?.nameAr ?? null, program: program?.nameAr ?? null,
        advisor: advisor ? advisor.displayName || advisor.username || advisor.email : null,
      },
      numberHistory: s.numberHistory.map((h) => ({
        universityId: h.universityId, college: h.collegeId ? collegeName.get(h.collegeId) ?? null : null, replacedBy: h.replacedByUniversityId,
        reason: h.reason, validFrom: h.validFrom, validTo: h.validTo, changedBy: h.changedById ? actors.get(h.changedById) ?? null : null,
      })),
      requests: s.affairsRequests.map((r) => ({
        id: r.id, number: r.number, status: r.status, channel: r.channel, subject: r.subject, createdAt: r.createdAt, closedAt: r.closedAt, service: r.service.nameAr,
        referrals: r.referrals,
      })),
      attachments: s.affairsRequests.flatMap((r) => r.attachments.map((a) => ({ ...a, requestId: r.id, requestNumber: r.number }))),
      documents: s.documents.map((d) => ({ id: d.id, number: d.number, status: d.status, issuedAt: d.issuedAt, revokedAt: d.revokedAt, revokedReason: d.revokedReason, typeName: d.type.nameAr })),
      dataChanges: s.dataChanges.map((c) => ({ id: c.id, field: c.field, oldValue: c.oldValue, newValue: c.newValue, createdAt: c.createdAt, changedBy: c.changedByUserId ? actors.get(c.changedByUserId) ?? null : null })),
    };
  }

  private async actorNames(ids: (string | null)[]) {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map<string, string>();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true, username: true, email: true } });
    return new Map(users.map((u) => [u.id, u.displayName || u.username || u.email]));
  }
}
