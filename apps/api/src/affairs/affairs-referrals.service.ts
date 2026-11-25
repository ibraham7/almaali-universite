import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AffairsUser } from './affairs.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { CancelReferralDto, CreateReferralDto, ListReferralsQueryDto, RespondReferralDto } from './dto/affairs.dto.js';
import { audit, loadRequestForAction } from './affairs-access.js';
import { isTerminal, type RequestStatus } from './affairs.rules.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const TARGET_LABEL: Record<string, string> = {
  ACADEMIC_AFFAIRS: 'الشؤون العلمية', FINANCIAL_AFFAIRS: 'الشؤون المالية', COLLEGE: 'الكلية', OTHER: 'جهة أخرى',
};

export const OUTCOME_LABEL: Record<string, string> = {
  APPROVED: 'موافقة', REJECTED: 'رفض', NOTES: 'ملاحظات', DONE: 'تم التنفيذ', NOT_DONE: 'لم يتم التنفيذ',
};

export function targetLabel(target: string, name?: string | null) {
  return name ? `${TARGET_LABEL[target]} (${name})` : TARGET_LABEL[target];
}

// What happens to the request when the receiving body answers.
// OPINION: the request returns to the original staff member (IN_PROGRESS) whatever the answer was.
// EXECUTION: "done" completes the request; "not done" returns it to the staff member.
export function statusAfterResponse(mode: string, outcome: string): RequestStatus {
  if (mode === 'EXECUTION' && outcome === 'DONE') return 'COMPLETED';
  return 'IN_PROGRESS';
}

export function outcomeAllowed(mode: string, outcome: string) {
  return mode === 'OPINION' ? ['APPROVED', 'REJECTED', 'NOTES'].includes(outcome) : ['DONE', 'NOT_DONE'].includes(outcome);
}

@Injectable()
export class AffairsReferralsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: AffairsSettingsService) {}

  // Send a request to another body. The request becomes REFERRED and stays assigned to the original staff member.
  async create(requestId: string, dto: CreateReferralDto, user: AffairsUser) {
    await this.settings.assertCapability(user, 'capCreateReferrals');
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('سبب الإحالة مطلوب.');
    const targetName = dto.targetName?.trim() || null;
    if ((dto.target === 'COLLEGE' || dto.target === 'OTHER') && !targetName) throw new BadRequestException('اكتب اسم الجهة المحال إليها.');
    return this.prisma.$transaction(async (tx) => {
      const request = await loadRequestForAction(tx as never, requestId, user);
      const from = request.status as RequestStatus;
      if (!['ASSIGNED', 'IN_PROGRESS'].includes(from)) throw new BadRequestException('لا يمكن إحالة الطلب في حالته الحالية.');
      if ((await tx.requestReferral.count({ where: { requestId, status: 'PENDING' } })) > 0) throw new BadRequestException('للطلب إحالة معلّقة بالفعل.');
      const referral = await tx.requestReferral.create({
        data: {
          requestId, mode: dto.mode as 'OPINION' | 'EXECUTION', target: dto.target as 'ACADEMIC_AFFAIRS', targetName, reason,
          requested: dto.requested?.trim() || null, dueAt: dto.dueInDays ? new Date(Date.now() + dto.dueInDays * DAY_MS) : null,
          referredByUserId: user.id,
        },
      });
      const label = targetLabel(dto.target, targetName);
      await tx.studentRequest.update({ where: { id: requestId }, data: { status: 'REFERRED' } });
      // The student sees only that the request is with another body; the details stay internal.
      await tx.studentRequestEvent.create({ data: { requestId, type: 'STATUS_CHANGED', fromStatus: from, toStatus: 'REFERRED', note: `أُحيل الطلب إلى ${label}`, visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      await tx.studentRequestEvent.create({ data: { requestId, type: 'REFERRAL_SENT', note: `${label} (${dto.mode === 'OPINION' ? 'طلب رأي/موافقة' : 'إحالة للتنفيذ'}): ${reason}${referral.requested ? ' — المطلوب: ' + referral.requested : ''}`, visibleToStudent: false, actorUserId: user.id, staffId: request.assignedStaffId } });
      await audit(tx, 'AFFAIRS_REFERRAL_CREATED', requestId, user.id, { number: request.number, referralId: referral.id, mode: dto.mode, target: dto.target, targetName, reason });
      return referral;
    });
  }

  // The receiving bodies have no accounts in the system, so the affairs staff member records their answer.
  async respond(referralId: string, dto: RespondReferralDto, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.requestReferral.findUnique({ where: { id: referralId } });
      if (!referral) throw new NotFoundException('الإحالة غير موجودة.');
      const request = await loadRequestForAction(tx as never, referral.requestId, user);
      if (referral.status !== 'PENDING') throw new BadRequestException('تم الرد على هذه الإحالة أو إلغاؤها.');
      if (!outcomeAllowed(referral.mode, dto.outcome)) throw new BadRequestException('نتيجة الرد لا تناسب نوع الإحالة.');
      const note = (dto.note ?? '').trim();
      if (['REJECTED', 'NOT_DONE'].includes(dto.outcome) && !note) throw new BadRequestException('اكتب سبب الرفض أو عدم التنفيذ.');
      const to = statusAfterResponse(referral.mode, dto.outcome);
      await tx.requestReferral.update({ where: { id: referralId }, data: { status: 'ANSWERED', outcome: dto.outcome as 'APPROVED', responseNote: note || null, respondedByUserId: user.id, respondedAt: new Date() } });
      await tx.studentRequest.update({ where: { id: referral.requestId }, data: { status: to, closedAt: isTerminal(to) ? new Date() : null } });
      const label = targetLabel(referral.target, referral.targetName);
      await tx.studentRequestEvent.create({ data: { requestId: referral.requestId, type: 'REFERRAL_ANSWERED', note: `رد ${label}: ${OUTCOME_LABEL[dto.outcome]}${note ? ' — ' + note : ''}`, visibleToStudent: false, actorUserId: user.id, staffId: request.assignedStaffId } });
      await tx.studentRequestEvent.create({ data: { requestId: referral.requestId, type: 'STATUS_CHANGED', fromStatus: 'REFERRED', toStatus: to, note: to === 'COMPLETED' ? 'نُفّذ الإجراء' : 'عاد الطلب إلى الموظف المختص', visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      await audit(tx, 'AFFAIRS_REFERRAL_ANSWERED', referral.requestId, user.id, { number: request.number, referralId, outcome: dto.outcome, note: note || undefined });
      return { ok: true, status: to };
    });
  }

  async cancel(referralId: string, dto: CancelReferralDto, user: AffairsUser) {
    const why = dto.reason.trim();
    if (!why) throw new BadRequestException('سبب الإلغاء مطلوب.');
    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.requestReferral.findUnique({ where: { id: referralId } });
      if (!referral) throw new NotFoundException('الإحالة غير موجودة.');
      const request = await loadRequestForAction(tx as never, referral.requestId, user);
      if (referral.status !== 'PENDING') throw new BadRequestException('لا يمكن إلغاء إحالة غير معلّقة.');
      await tx.requestReferral.update({ where: { id: referralId }, data: { status: 'CANCELLED', cancelReason: why } });
      await tx.studentRequest.update({ where: { id: referral.requestId }, data: { status: 'IN_PROGRESS' } });
      await tx.studentRequestEvent.create({ data: { requestId: referral.requestId, type: 'REFERRAL_CANCELLED', note: why, visibleToStudent: false, actorUserId: user.id, staffId: request.assignedStaffId } });
      await tx.studentRequestEvent.create({ data: { requestId: referral.requestId, type: 'STATUS_CHANGED', fromStatus: 'REFERRED', toStatus: 'IN_PROGRESS', note: 'عاد الطلب إلى الموظف المختص', visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      await audit(tx, 'AFFAIRS_REFERRAL_CANCELLED', referral.requestId, user.id, { number: request.number, referralId, reason: why });
      return { ok: true };
    });
  }

  async list(query: ListReferralsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = 20;
    const where = query.status ? { status: query.status as 'PENDING' } : {};
    const [total, rows] = await Promise.all([
      this.prisma.requestReferral.count({ where }),
      this.prisma.requestReferral.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { request: { select: { id: true, number: true, status: true, service: { select: { nameAr: true } }, student: { select: { universityId: true, fullName: true, firstName: true, familyName: true } }, assignedStaff: { select: { user: { select: { displayName: true, username: true, email: true } } } } } } },
      }),
    ]);
    return {
      total, page, pageSize,
      items: rows.map((r) => ({
        id: r.id, mode: r.mode, target: r.target, targetName: r.targetName, targetLabel: targetLabel(r.target, r.targetName), reason: r.reason, requested: r.requested,
        dueAt: r.dueAt, status: r.status, outcome: r.outcome, responseNote: r.responseNote, respondedAt: r.respondedAt, createdAt: r.createdAt,
        requestId: r.request.id, requestNumber: r.request.number, requestStatus: r.request.status, serviceName: r.request.service.nameAr,
        studentName: r.request.student.fullName || `${r.request.student.firstName} ${r.request.student.familyName}`.trim(), studentUniversityId: r.request.student.universityId,
        originalStaff: r.request.assignedStaff ? (r.request.assignedStaff.user.displayName || r.request.assignedStaff.user.username || r.request.assignedStaff.user.email) : null,
      })),
    };
  }
}
