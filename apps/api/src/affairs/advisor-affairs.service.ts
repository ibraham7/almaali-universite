import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AffairsFilesService } from './affairs-files.service.js';
import { audit } from './affairs-access.js';
import { notifyUsers, studentStatusMessage } from './affairs-notifications.js';
import { NOTE_REQUIRED_OUTCOMES, OUTCOME_LABEL, outcomeAllowed, statusAfterResponse, targetLabel } from './affairs-referrals.service.js';
import { OPEN_STATUSES, isTerminal } from './affairs.rules.js';
import { advisorCollegeIds, advisorStudentWhere } from './advisor-scope.js';
import type { AffairsUser } from './affairs.service.js';
import type { RespondReferralDto } from './dto/affairs.dto.js';

const PAGE_SIZE = 20;
const nameOf = (s: { fullName: string | null; firstName: string; middleName?: string | null; familyName: string }) => s.fullName || [s.firstName, s.middleName, s.familyName].filter(Boolean).join(' ');
const staffName = (s: { user: { displayName: string | null; username: string | null; email: string } } | null | undefined) => (s ? s.user.displayName || s.user.username || s.user.email : null);

// مساحة المشرف الأكاديمي في شؤون الطلاب: كل ما فيها محصور بنطاقه (كلياته وبرامجه المسندة له بالنظام) وبما أُحيل إليه.
// المشرف لا يرى لوحة الموظفين ولا يغيّر ملكية المعاملة: يردّ على الإحالة فتعود المعاملة إلى موظف الشؤون المالك.
@Injectable()
export class AdvisorAffairsService {
  constructor(private readonly prisma: PrismaService, private readonly files: AffairsFilesService) {}

  // الإحالات الموجّهة له: باسمه، أو لكلية يغطيها دون تحديد مشرف.
  private async referralWhere(userId: string) {
    const collegeIds = await advisorCollegeIds(this.prisma, userId);
    return { target: 'COLLEGE' as const, OR: [{ advisorUserId: userId }, { advisorUserId: null, collegeId: { in: collegeIds } }] };
  }

  async inbox(user: AffairsUser, filter: string | undefined, page = 1) {
    const base = await this.referralWhere(user.id);
    const where = { ...base, ...(filter === 'answered' ? { status: { in: ['ANSWERED', 'CANCELLED'] as Array<'ANSWERED' | 'CANCELLED'> } } : filter === 'all' ? {} : { status: 'PENDING' as const }) };
    const [total, rows] = await Promise.all([
      this.prisma.requestReferral.count({ where }),
      this.prisma.requestReferral.findMany({
        where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        include: { request: { select: { id: true, number: true, status: true, dueAt: true, service: { select: { nameAr: true } }, student: { select: { universityId: true, fullName: true, firstName: true, familyName: true } } } } },
      }),
    ]);
    const now = Date.now();
    return {
      total, page, pageSize: PAGE_SIZE,
      items: rows.map((r) => ({
        id: r.id, requestId: r.request.id, requestNumber: r.request.number, serviceName: r.request.service.nameAr,
        studentName: nameOf(r.request.student), studentUniversityId: r.request.student.universityId,
        mode: r.mode, decisionAllowed: r.decisionAllowed, reason: r.reason, requested: r.requested, dueAt: r.dueAt,
        status: r.status, outcome: r.outcome, createdAt: r.createdAt, respondedAt: r.respondedAt,
        overdue: r.status === 'PENDING' && !!r.dueAt && r.dueAt.getTime() < now, targetLabel: targetLabel(r.target, r.targetName),
      })),
    };
  }

  // إحالة ضمن نطاقه، وإلا 404 (لا نكشف وجود إحالات غيره).
  private async loadScoped(id: string, user: AffairsUser) {
    const referral = await this.prisma.requestReferral.findFirst({ where: { id, ...(await this.referralWhere(user.id)) } });
    if (!referral) throw new NotFoundException('الإحالة غير موجودة أو ليست موجّهة إليك.');
    return referral;
  }

  async referral(id: string, user: AffairsUser) {
    const referral = await this.loadScoped(id, user);
    const request = await this.prisma.studentRequest.findUniqueOrThrow({
      where: { id: referral.requestId },
      include: {
        student: { select: { id: true, universityId: true, fullName: true, firstName: true, middleName: true, familyName: true, status: true, collegeId: true, programId: true } },
        service: { select: { nameAr: true, workflowNote: true } },
        assignedStaff: { select: { user: { select: { displayName: true, username: true, email: true } } } },
        attachments: { where: { isArchived: false }, orderBy: { createdAt: 'asc' }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } },
        events: { where: { visibleToStudent: true }, orderBy: { createdAt: 'asc' }, select: { id: true, type: true, note: true, toStatus: true, createdAt: true } },
        referrals: { where: { id: { not: referral.id } }, orderBy: { createdAt: 'desc' }, select: { id: true, target: true, targetName: true, status: true, outcome: true, responseNote: true, createdAt: true } },
      },
    });
    const [college, program] = await Promise.all([
      request.student.collegeId ? this.prisma.college.findUnique({ where: { id: request.student.collegeId }, select: { nameAr: true } }) : null,
      request.student.programId ? this.prisma.program.findUnique({ where: { id: request.student.programId }, select: { nameAr: true } }) : null,
    ]);
    return {
      id: referral.id, mode: referral.mode, decisionAllowed: referral.decisionAllowed, reason: referral.reason, requested: referral.requested, dueAt: referral.dueAt,
      status: referral.status, outcome: referral.outcome, responseNote: referral.responseNote, respondedAt: referral.respondedAt, createdAt: referral.createdAt,
      allowedOutcomes: referral.status === 'PENDING' ? (['APPROVED', 'REJECTED', 'NOTES', 'NEEDS_INFO'] as const).filter((o) => outcomeAllowed(referral.mode, o, referral.decisionAllowed)) : [],
      request: {
        id: request.id, number: request.number, status: request.status, subject: request.subject, details: request.details, dueAt: request.dueAt, createdAt: request.createdAt,
        serviceName: request.service.nameAr, workflowNote: request.service.workflowNote, owner: staffName(request.assignedStaff),
        student: { id: request.student.id, universityId: request.student.universityId, name: nameOf(request.student), status: request.student.status, college: college?.nameAr ?? null, program: program?.nameAr ?? null },
        attachments: request.attachments, timeline: request.events, otherReferrals: request.referrals.map((o) => ({ ...o, targetLabel: targetLabel(o.target, o.targetName) })),
      },
    };
  }

  // رد المشرف: رأي/ملاحظات/موافقة/رفض (إن كان مخوّلًا) أو طلب استكمال. تعود المعاملة إلى موظف الشؤون المالك، ولا تتغير ملكيتها.
  async respond(id: string, dto: RespondReferralDto, user: AffairsUser) {
    const note = (dto.note ?? '').trim();
    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.requestReferral.findFirst({ where: { id, ...(await this.referralWhere(user.id)) } });
      if (!referral) throw new NotFoundException('الإحالة غير موجودة أو ليست موجّهة إليك.');
      if (referral.status !== 'PENDING') throw new BadRequestException('تم الرد على هذه الإحالة أو إلغاؤها.');
      if (referral.mode !== 'OPINION' || !outcomeAllowed(referral.mode, dto.outcome, referral.decisionAllowed)) {
        throw new ForbiddenException(referral.decisionAllowed ? 'نتيجة الرد غير مسموحة.' : 'هذه الإحالة لإبداء الرأي فقط: أضف ملاحظات أو اطلب استكمالًا، دون موافقة أو رفض.');
      }
      if ((NOTE_REQUIRED_OUTCOMES.includes(dto.outcome) || dto.outcome === 'NOTES') && !note) throw new BadRequestException('اكتب الملاحظات أو السبب أو المعلومات المطلوبة.');
      const request = await tx.studentRequest.findUniqueOrThrow({ where: { id: referral.requestId }, include: { assignedStaff: { select: { userId: true } }, student: { select: { userId: true } } } });
      if (isTerminal(request.status as never)) throw new BadRequestException('المعاملة منتهية.');
      const claimed = await tx.requestReferral.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'ANSWERED', outcome: dto.outcome as 'APPROVED', responseNote: note || null, respondedByUserId: user.id, respondedAt: new Date() } });
      if (claimed.count !== 1) throw new BadRequestException('تم الرد على هذه الإحالة للتو.');
      const to = statusAfterResponse(referral.mode, dto.outcome);
      await tx.studentRequest.update({ where: { id: request.id }, data: { status: to, closedAt: null } });
      const label = targetLabel(referral.target, referral.targetName);
      await tx.studentRequestEvent.create({ data: { requestId: request.id, type: 'REFERRAL_ANSWERED', note: `رد المشرف (${label}): ${OUTCOME_LABEL[dto.outcome]}${note ? ' — ' + note : ''}`, visibleToStudent: false, actorUserId: user.id, staffId: request.assignedStaffId } });
      await tx.studentRequestEvent.create({ data: { requestId: request.id, type: 'STATUS_CHANGED', fromStatus: 'REFERRED', toStatus: to, note: 'عاد الطلب إلى الموظف المختص', visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      await audit(tx, 'AFFAIRS_REFERRAL_ANSWERED_BY_ADVISOR', request.id, user.id, { number: request.number, referralId: id, outcome: dto.outcome, note: note || undefined });
      await notifyUsers(tx, [request.assignedStaff?.userId], { kind: 'REFERRAL_ANSWERED', title: 'ردّ المشرف على معاملة محالة', body: `الطلب ${request.number} — ${OUTCOME_LABEL[dto.outcome]}${note ? ': ' + note : ''}`, requestId: request.id });
      await notifyUsers(tx, [request.student.userId], { ...studentStatusMessage(request.number, to, null, true), requestId: request.id });
      return { ok: true, status: to };
    });
  }

  async attachment(referralId: string, attachmentId: string, user: AffairsUser) {
    const referral = await this.loadScoped(referralId, user);
    const att = await this.prisma.studentRequestAttachment.findFirst({ where: { id: attachmentId, requestId: referral.requestId, isArchived: false } });
    if (!att) throw new NotFoundException('المرفق غير موجود.');
    return att;
  }

  // معاملات طلاب كلياته: للمتابعة فقط (المتأخرة، أو المحالة إليه).
  async requests(user: AffairsUser, filter: string | undefined, page = 1) {
    const [studentWhere, referralWhere] = await Promise.all([advisorStudentWhere(this.prisma, user.id), this.referralWhere(user.id)]);
    const now = new Date();
    const where = {
      student: studentWhere,
      ...(filter === 'overdue' ? { status: { in: OPEN_STATUSES }, dueAt: { lt: now } } : filter === 'pending' ? { referrals: { some: { ...referralWhere, status: 'PENDING' as const } } } : filter === 'open' ? { status: { in: OPEN_STATUSES } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.studentRequest.count({ where }),
      this.prisma.studentRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: {
          id: true, number: true, status: true, dueAt: true, createdAt: true, service: { select: { nameAr: true } },
          student: { select: { universityId: true, fullName: true, firstName: true, familyName: true } },
          assignedStaff: { select: { user: { select: { displayName: true, username: true, email: true } } } },
          referrals: { where: { ...referralWhere, status: 'PENDING' }, select: { id: true }, take: 1 },
        },
      }),
    ]);
    return {
      total, page, pageSize: PAGE_SIZE,
      items: rows.map((r) => ({
        id: r.id, number: r.number, serviceName: r.service.nameAr, studentName: nameOf(r.student), studentUniversityId: r.student.universityId,
        status: r.status, dueAt: r.dueAt, createdAt: r.createdAt, overdue: OPEN_STATUSES.includes(r.status as never) && !!r.dueAt && r.dueAt < now,
        owner: staffName(r.assignedStaff), pendingReferralId: r.referrals[0]?.id ?? null,
      })),
    };
  }

  async students(user: AffairsUser, search: string | undefined, page = 1) {
    return this.files.list(search, page, await advisorStudentWhere(this.prisma, user.id));
  }

  async studentFile(user: AffairsUser, studentId: string) {
    const inScope = await this.prisma.student.findFirst({ where: { AND: [{ id: studentId }, await advisorStudentWhere(this.prisma, user.id)] }, select: { id: true } });
    if (!inScope) throw new NotFoundException('الطالب غير موجود ضمن نطاقك.');
    return this.files.get(studentId);
  }

  // أرقام كليته: معاملات طلابه بحالاتها، والمتأخرة، والإحالات إليه.
  async overview(user: AffairsUser) {
    const [studentWhere, referralWhere] = await Promise.all([advisorStudentWhere(this.prisma, user.id), this.referralWhere(user.id)]);
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [byStatus, overdue, pending, answered, colleges] = await Promise.all([
      this.prisma.studentRequest.groupBy({ by: ['status'], where: { student: studentWhere }, _count: { _all: true } }),
      this.prisma.studentRequest.count({ where: { student: studentWhere, status: { in: OPEN_STATUSES }, dueAt: { lt: now } } }),
      this.prisma.requestReferral.count({ where: { ...referralWhere, status: 'PENDING' } }),
      this.prisma.requestReferral.count({ where: { ...referralWhere, status: 'ANSWERED', respondedAt: { gte: since } } }),
      advisorCollegeIds(this.prisma, user.id).then((ids) => (ids.length ? this.prisma.college.findMany({ where: { id: { in: ids } }, select: { nameAr: true } }) : [])),
    ]);
    const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
    return {
      colleges: colleges.map((c) => c.nameAr), byStatus: counts, total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      open: byStatus.filter((row) => OPEN_STATUSES.includes(row.status as never)).reduce((sum, row) => sum + row._count._all, 0),
      overdue, pendingReferrals: pending, answeredLast30Days: answered,
    };
  }
}
