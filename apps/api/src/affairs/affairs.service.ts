import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { dayRange } from './affairs-reports.catalog.js';
import { canManage, isAffairsStaffRole, isUnitManager } from './affairs-access.js';
import { managerRecipients, notifyUsers, studentStatusMessage } from './affairs-notifications.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { SERVICES_BLOCKED_MESSAGE, canRequestServices } from '../students/student-status.js';
import {
  AssignRequestDto, ChangeStatusDto, CommentDto, CreateServiceDto, CreateStaffDto, ListRequestsQueryDto,
  ProxyCreateRequestDto, StudentCreateRequestDto, UpdateServiceDto, UpdateStaffDto,
} from './dto/affairs.dto.js';
import {
  OPEN_STATUSES, RequestStatus, TERMINAL_STATUSES, TRANSITIONS, canTransition, isTerminal, pickLeastLoaded, reasonRequired, requestNumber, serviceMissing,
} from './affairs.rules.js';

export interface AffairsUser {
  id: string;
  role: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AffairsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: AffairsSettingsService) {}

  // ---------- helpers ----------
  private studentName(s: { fullName: string | null; firstName: string; middleName: string | null; familyName: string }) {
    return s.fullName || [s.firstName, s.middleName, s.familyName].filter(Boolean).join(' ');
  }

  private cleanReason(text?: string | null) {
    return (text ?? '').trim();
  }

  private audit(tx: any, action: string, entityId: string, userId: string, details: Record<string, unknown>) {
    return tx.auditLog.create({ data: { action, entity: 'StudentRequest', entityId, userId, details: JSON.stringify(details) } });
  }

  private async staffOf(userId: string) {
    return this.prisma.affairsStaff.findUnique({ where: { userId } });
  }

  async me(user: AffairsUser) {
    const staff = await this.prisma.affairsStaff.findUnique({ where: { userId: user.id }, select: { id: true, isManager: true, isActive: true } });
    return { role: user.role, staffId: staff?.id ?? null, isStaff: !!staff, isActiveStaff: !!staff && staff.isActive, isManager: !!staff && staff.isManager && staff.isActive, canManage: await canManage(this.prisma, user) };
  }

  // قائمة الكليات لمرشّحات التقارير: ضمن مسارات الشؤون حتى لا يحتاج موظف الشؤون صلاحية على الهيكل الأكاديمي.
  collegeOptions() {
    return this.prisma.college.findMany({ where: { isActive: true }, orderBy: { nameAr: 'asc' }, select: { id: true, nameAr: true } });
  }

  // ---------- services ----------
  // كل خدمة مع ما ينقصها من الحقول الإلزامية (missing) لتظهر علامة «ناقصة» في الجدول.
  async listServices() {
    const services = await this.prisma.affairsService.findMany({ orderBy: { createdAt: 'asc' }, include: { staff: { where: { isActive: true, staff: { isActive: true } }, select: { staffId: true } } } });
    return services.map(({ staff, ...service }) => ({ ...service, missing: serviceMissing(service, (staff ?? []).length) }));
  }

  async createService(dto: CreateServiceDto, user: AffairsUser) {
    const exists = await this.prisma.affairsService.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('رمز الخدمة مستخدم مسبقاً.');
    const missing = serviceMissing(dto);
    if (missing.length) throw new BadRequestException(`أكمل الحقول الإلزامية: ${missing.join('، ')}.`);
    const created = await this.prisma.affairsService.create({
      data: {
        // تُنشأ متوقفة: لا تُفعَّل إلا بعد ربط موظف مسؤول واحد على الأقل.
        isActive: false,
        code: dto.code, nameAr: dto.nameAr.trim(), description: dto.description?.trim() || null,
        expectedDays: dto.expectedDays ?? 5, specialization: dto.specialization?.trim() || null,
        channel: (dto.channel as 'ONLINE' | 'IN_PERSON' | 'BOTH' | undefined) ?? 'BOTH',
        outcome: (dto.outcome as 'NONE' | 'DOCUMENT' | 'ACTION' | 'BOTH' | undefined) ?? 'NONE',
        attachmentsNote: dto.attachmentsNote?.trim() || null, feeNote: dto.feeNote?.trim() || null, workflowNote: dto.workflowNote?.trim() || null,
        requiredData: dto.requiredData?.trim() || null,
        documentTypeId: dto.documentTypeId ?? null,
      },
    });
    await this.prisma.auditLog.create({ data: { action: 'AFFAIRS_SERVICE_CREATED', entity: 'AffairsService', entityId: created.id, userId: user.id, details: JSON.stringify({ code: created.code }) } });
    return created;
  }

  async updateService(id: string, dto: UpdateServiceDto, user: AffairsUser) {
    const found = await this.prisma.affairsService.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('الخدمة غير موجودة.');
    const data: Record<string, unknown> = {};
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.expectedDays !== undefined) data.expectedDays = dto.expectedDays;
    if (dto.specialization !== undefined) data.specialization = dto.specialization.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.outcome !== undefined) data.outcome = dto.outcome;
    if (dto.attachmentsNote !== undefined) data.attachmentsNote = dto.attachmentsNote.trim() || null;
    if (dto.feeNote !== undefined) data.feeNote = dto.feeNote.trim() || null;
    if (dto.workflowNote !== undefined) data.workflowNote = dto.workflowNote.trim() || null;
    if (dto.requiredData !== undefined) data.requiredData = dto.requiredData.trim() || null;
    if (dto.documentTypeId !== undefined) {
      if (dto.documentTypeId && !(await this.prisma.documentType.findUnique({ where: { id: dto.documentTypeId } }))) throw new BadRequestException('نوع الوثيقة غير موجود.');
      data.documentTypeId = dto.documentTypeId;
    }
    // الخدمة الفعّالة لا تُحفظ ناقصة: الحقول الإلزامية وموظف فعّال واحد على الأقل. الإيقاف لا يتطلب شيئًا.
    const result = { ...found, ...data } as typeof found;
    if (result.isActive) {
      const staffCount = await this.prisma.affairsStaffService.count({ where: { serviceId: id, isActive: true, staff: { isActive: true } } });
      const missing = serviceMissing(result, staffCount);
      if (missing.length) throw new BadRequestException(`أكمل الحقول الإلزامية قبل حفظ الخدمة الفعّالة: ${missing.join('، ')}. أو أوقف الخدمة.`);
    }
    const updated = await this.prisma.affairsService.update({ where: { id }, data });
    await this.prisma.auditLog.create({ data: { action: 'AFFAIRS_SERVICE_UPDATED', entity: 'AffairsService', entityId: id, userId: user.id, details: JSON.stringify(data) } });
    return updated;
  }

  // ---------- staff ----------
  async listStaff() {
    const staff = await this.prisma.affairsStaff.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, displayName: true, username: true } },
        services: { where: { isActive: true }, select: { serviceId: true } },
      },
    });
    const load = await this.loadByStaff();
    return staff.map((s) => ({
      id: s.id, userId: s.userId, name: s.user.displayName || s.user.username || s.user.email, email: s.user.email,
      specialization: s.specialization, isActive: s.isActive, isManager: s.isManager, serviceIds: s.services.map((x) => x.serviceId),
      open: load.get(s.id)?.open ?? 0, done: load.get(s.id)?.done ?? 0,
    }));
  }

  private async loadByStaff() {
    const groups = await this.prisma.studentRequest.groupBy({ by: ['assignedStaffId', 'status'], where: { assignedStaffId: { not: null } }, _count: { _all: true } });
    const map = new Map<string, { open: number; done: number }>();
    for (const g of groups) {
      if (!g.assignedStaffId) continue;
      const entry = map.get(g.assignedStaffId) ?? { open: 0, done: 0 };
      if (OPEN_STATUSES.includes(g.status as RequestStatus)) entry.open += g._count._all;
      else if (g.status === 'COMPLETED') entry.done += g._count._all;
      map.set(g.assignedStaffId, entry);
    }
    return map;
  }

  staffCandidates() {
    return this.prisma.user.findMany({
      where: { role: { code: { in: ['REGISTRAR', 'AFFAIRS_STAFF', 'ADVISOR'] } }, status: 'ACTIVE', affairsStaff: null },
      select: { id: true, email: true, displayName: true, username: true },
      orderBy: { email: 'asc' },
    });
  }

  private async assertServicesExist(serviceIds: string[]) {
    if (serviceIds.length === 0) return;
    const count = await this.prisma.affairsService.count({ where: { id: { in: serviceIds } } });
    if (count !== new Set(serviceIds).size) throw new BadRequestException('إحدى الخدمات المختارة غير موجودة.');
  }

  async createStaff(dto: CreateStaffDto, user: AffairsUser) {
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId }, include: { role: true, affairsStaff: true } });
    if (!target || !isAffairsStaffRole(target.role.code)) throw new BadRequestException('المستخدم يجب أن يكون مسجّلاً أو موظف شؤون طلاب أو مشرفًا أكاديميًا.');
    if (target.affairsStaff) throw new ConflictException('هذا المستخدم مضاف كموظف مسبقاً.');
    const serviceIds = [...new Set(dto.serviceIds ?? [])];
    await this.assertServicesExist(serviceIds);
    const created = await this.prisma.affairsStaff.create({
      data: {
        userId: dto.userId, specialization: dto.specialization?.trim() || null, isManager: dto.isManager ?? false,
        services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
    await this.prisma.auditLog.create({ data: { action: 'AFFAIRS_STAFF_CREATED', entity: 'AffairsStaff', entityId: created.id, userId: user.id, details: JSON.stringify({ userId: dto.userId, serviceIds }) } });
    return created;
  }

  async updateStaff(id: string, dto: UpdateStaffDto, user: AffairsUser) {
    if (!(await canManage(this.prisma, user))) throw new ForbiddenException('إدارة الموظفين لمدير النظام أو مدير الوحدة.');
    if (dto.isManager !== undefined && user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('تعيين مدير الوحدة لمدير النظام فقط.');
    const found = await this.prisma.affairsStaff.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('الموظف غير موجود.');
    const serviceIds = dto.serviceIds ? [...new Set(dto.serviceIds)] : undefined;
    if (serviceIds) await this.assertServicesExist(serviceIds);
    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (dto.specialization !== undefined) data.specialization = dto.specialization.trim() || null;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.isManager !== undefined) data.isManager = dto.isManager;
      const row = await tx.affairsStaff.update({ where: { id }, data });
      if (serviceIds) {
        // Never delete link rows: switch them on/off instead.
        await tx.affairsStaffService.updateMany({ where: { staffId: id, serviceId: { notIn: serviceIds } }, data: { isActive: false } });
        await tx.affairsStaffService.updateMany({ where: { staffId: id, serviceId: { in: serviceIds } }, data: { isActive: true } });
        await tx.affairsStaffService.createMany({ data: serviceIds.map((serviceId) => ({ staffId: id, serviceId })), skipDuplicates: true });
      }
      await tx.auditLog.create({ data: { action: 'AFFAIRS_STAFF_UPDATED', entity: 'AffairsStaff', entityId: id, userId: user.id, details: JSON.stringify({ ...data, serviceIds }) } });
      return row;
    });
    return updated;
  }

  // ---------- student lookup (proxy requests) ----------
  async searchStudents(q: string) {
    const term = q.trim();
    const students = await this.prisma.student.findMany({
      where: {
        OR: [
          { universityId: { contains: term, mode: 'insensitive' } },
          { fullName: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { familyName: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 10, orderBy: { universityId: 'asc' },
      select: { id: true, universityId: true, fullName: true, firstName: true, middleName: true, familyName: true },
    });
    return students.map((s) => ({ id: s.id, universityId: s.universityId, name: this.studentName(s) }));
  }

  // ---------- creating requests ----------
  async createForStudent(studentId: string, serviceId: string, subject: string | undefined, details: string | undefined, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.affairsService.findUnique({ where: { id: serviceId } });
      if (!service) throw new NotFoundException('الخدمة غير موجودة.');
      if (!service.isActive) throw new BadRequestException('هذه الخدمة متوقفة حالياً.');
      if (user.role === 'STUDENT' && !(await this.settings.get<boolean>('studentOnlineSubmission'))) throw new BadRequestException('استقبال الطلبات الإلكترونية متوقف مؤقتاً. راجع دائرة شؤون الطلاب.');
      if (user.role === 'STUDENT' && service.channel === 'IN_PERSON') throw new BadRequestException('هذه الخدمة تُقدَّم حضورياً فقط، راجع دائرة شؤون الطلاب.');
      const student = await tx.student.findUnique({ where: { id: studentId }, select: { id: true, userId: true, status: true } });
      if (!student) throw new NotFoundException('الطالب غير موجود.');
      // المنسحب والمفصول والمرقّن قيده: اطلاع فقط، لا يقدّمون طلبات خدمات من حسابهم (الموظف يقدّم عنهم عند اللزوم).
      if (user.role === 'STUDENT' && !canRequestServices(student.status)) throw new ForbiddenException(SERVICES_BLOCKED_MESSAGE(student.status));

      const now = new Date();
      const counter = await tx.affairsRequestCounter.upsert({
        where: { year: now.getFullYear() }, create: { year: now.getFullYear(), last: 1 }, update: { last: { increment: 1 } },
      });
      const number = requestNumber(now.getFullYear(), counter.last);

      const autoAssign = await this.settings.get<boolean>('autoAssign');
      const candidates = autoAssign ? await tx.affairsStaff.findMany({ where: { isActive: true, services: { some: { serviceId, isActive: true } } }, select: { id: true } }) : [];
      const loads = candidates.length
        ? await tx.studentRequest.groupBy({ by: ['assignedStaffId'], where: { assignedStaffId: { in: candidates.map((c) => c.id) }, status: { in: OPEN_STATUSES } }, _count: { _all: true } })
        : [];
      const openBy = new Map(loads.map((l) => [l.assignedStaffId, l._count._all]));
      const staffId = pickLeastLoaded(candidates.map((c) => ({ id: c.id, open: openBy.get(c.id) ?? 0 })));

      const request = await tx.studentRequest.create({
        data: {
          number, studentId, serviceId, status: staffId ? 'ASSIGNED' : 'NEW', assignedStaffId: staffId,
          channel: user.role === 'STUDENT' ? 'ONLINE' : 'IN_PERSON',
          subject: subject?.trim() || null, details: details?.trim() || null, createdByUserId: user.id,
          dueAt: new Date(now.getTime() + service.expectedDays * DAY_MS),
        },
      });
      await tx.studentRequestEvent.create({ data: { requestId: request.id, type: 'CREATED', toStatus: 'NEW', visibleToStudent: true, actorUserId: user.id, note: user.role === 'STUDENT' ? null : 'قُدّم الطلب بالنيابة عن الطالب' } });
      await this.audit(tx, 'AFFAIRS_REQUEST_CREATED', request.id, user.id, { number, serviceId, onBehalf: user.role !== 'STUDENT' });
      if (staffId) {
        await tx.studentRequestEvent.create({ data: { requestId: request.id, type: 'ASSIGNED', fromStatus: 'NEW', toStatus: 'ASSIGNED', visibleToStudent: true, actorUserId: user.id, staffId, note: 'أُسند الطلب تلقائياً إلى موظف مختص' } });
        await this.audit(tx, 'AFFAIRS_REQUEST_ASSIGNED', request.id, user.id, { number, staffId, auto: true });
      }
      // Notifications: the student gets a receipt; the staff member (or the managers when nobody is assigned) is told there is work.
      const line = `الطلب ${number} — ${service.nameAr}`;
      await notifyUsers(tx, [student.userId], { kind: 'REQUEST_CREATED', title: 'تم استلام طلبك', body: line, requestId: request.id });
      if (staffId) {
        const staff = await tx.affairsStaff.findUnique({ where: { id: staffId }, select: { userId: true } });
        await notifyUsers(tx, [staff?.userId].filter((id) => id !== user.id), { kind: 'REQUEST_ASSIGNED', title: 'أُسند إليك طلب جديد', body: line, requestId: request.id });
      } else {
        await notifyUsers(tx, (await managerRecipients(tx)).filter((id) => id !== user.id), { kind: 'REQUEST_UNASSIGNED', title: 'طلب جديد بانتظار الإسناد', body: line, requestId: request.id });
      }
      return request;
    });
  }

  async createByProxy(dto: ProxyCreateRequestDto, user: AffairsUser) {
    await this.settings.assertCapability(user, 'capCreateRequestsOnBehalf');
    return this.createForStudent(dto.studentId, dto.serviceId, dto.subject, dto.details, user);
  }

  // ---------- listing / details ----------
  private viewWhere(view: string | undefined, userId: string) {
    switch (view) {
      case 'open': return { status: { in: OPEN_STATUSES } };
      case 'new': return { status: 'NEW' as const };
      case 'mine': return { assignedStaff: { userId }, status: { in: OPEN_STATUSES } };
      case 'waiting': return { status: 'WAITING_COMPLETION' as const };
      case 'referred': return { status: 'REFERRED' as const };
      case 'done': return { status: { in: TERMINAL_STATUSES } };
      default: return {};
    }
  }

  async listRequests(query: ListRequestsQueryDto, user: AffairsUser) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: Record<string, unknown> = { ...this.viewWhere(query.view, user.id) };
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    const extra: Record<string, unknown>[] = [];
    const created = dayRange(query.from, query.to);
    if (created) extra.push({ createdAt: created });
    if (query.staffId) extra.push({ assignedStaffId: query.staffId });
    if (query.collegeId) extra.push({ student: { collegeId: query.collegeId } });
    if (query.overdue) extra.push({ status: { in: OPEN_STATUSES }, dueAt: { lt: new Date() } });
    if (query.closedToday) { const start = new Date(); start.setHours(0, 0, 0, 0); extra.push({ status: 'COMPLETED', closedAt: { gte: start } }); }
    if (extra.length) where.AND = extra;
    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { number: { contains: term, mode: 'insensitive' } },
        { student: { universityId: { contains: term, mode: 'insensitive' } } },
        { student: { fullName: { contains: term, mode: 'insensitive' } } },
        { student: { firstName: { contains: term, mode: 'insensitive' } } },
        { student: { familyName: { contains: term, mode: 'insensitive' } } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.studentRequest.count({ where }),
      this.prisma.studentRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: {
          student: { select: { id: true, universityId: true, fullName: true, firstName: true, middleName: true, familyName: true } },
          service: { select: { id: true, code: true, nameAr: true } },
          assignedStaff: { select: { id: true, user: { select: { displayName: true, username: true, email: true } } } },
        },
      }),
    ]);
    return {
      total, page, pageSize,
      items: rows.map((r) => ({
        id: r.id, number: r.number, status: r.status, channel: r.channel, subject: r.subject, createdAt: r.createdAt, dueAt: r.dueAt, closedAt: r.closedAt, updatedAt: r.updatedAt,
        student: { id: r.student.id, universityId: r.student.universityId, name: this.studentName(r.student) },
        service: r.service,
        assignedStaff: r.assignedStaff ? { id: r.assignedStaff.id, name: r.assignedStaff.user.displayName || r.assignedStaff.user.username || r.assignedStaff.user.email } : null,
      })),
    };
  }

  async getRequest(id: string, user: AffairsUser) {
    const r = await this.prisma.studentRequest.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, userId: true, universityId: true, fullName: true, firstName: true, middleName: true, familyName: true, phone: true, status: true, universityEmail: true } },
        service: { select: { id: true, code: true, nameAr: true, attachmentsNote: true, feeNote: true, workflowNote: true, requiredData: true, documentType: { select: { nameAr: true, isActive: true } } } },
        assignedStaff: { select: { id: true, userId: true, user: { select: { displayName: true, username: true, email: true } } } },
        events: { orderBy: { createdAt: 'asc' } },
        attachments: { where: { isArchived: false }, orderBy: { createdAt: 'asc' }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, visibleToStudent: true, uploadedByUserId: true, createdAt: true } },
        referrals: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { issuedAt: 'desc' }, select: { id: true, number: true, status: true, issuedAt: true, type: { select: { nameAr: true } } } },
      },
    });
    if (!r) throw new NotFoundException('الطلب غير موجود.');
    const actorIds = [...new Set(r.events.map((e) => e.actorUserId).filter((x): x is string => !!x))];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true, username: true, email: true } }) : [];
    const actorName = new Map(actors.map((a) => [a.id, a.displayName || a.username || a.email]));
    const canAct = user.role === 'SYSTEM_ADMIN' || (isAffairsStaffRole(user.role) && r.assignedStaff?.userId === user.id);
    return {
      id: r.id, number: r.number, status: r.status, channel: r.channel, subject: r.subject, details: r.details, decisionReason: r.decisionReason,
      createdAt: r.createdAt, dueAt: r.dueAt, closedAt: r.closedAt, updatedAt: r.updatedAt,
      attachments: r.attachments.map((a) => ({ ...a, uploadedBy: a.uploadedByUserId === r.student.userId ? 'student' : 'staff' })),
      referrals: r.referrals,
      documents: r.documents.map((d) => ({ id: d.id, number: d.number, status: d.status, issuedAt: d.issuedAt, typeName: d.type.nameAr })),
      documentTypeName: r.service.documentType?.nameAr ?? null,
      canIssueDocument: canAct && !!r.service.documentType?.isActive && ['ACCEPTED', 'COMPLETED'].includes(r.status) && !r.documents.some((d) => d.status === 'ACTIVE'),
      pendingReferral: r.referrals.find((x) => x.status === 'PENDING') ?? null,
      student: { id: r.student.id, universityId: r.student.universityId, name: this.studentName(r.student), phone: r.student.phone, status: r.student.status, universityEmail: r.student.universityEmail },
      service: r.service,
      assignedStaff: r.assignedStaff ? { id: r.assignedStaff.id, name: r.assignedStaff.user.displayName || r.assignedStaff.user.username || r.assignedStaff.user.email } : null,
      canAct, canTake: isAffairsStaffRole(user.role) && r.status === 'NEW' && !r.assignedStaff,
      canAssign: (await canManage(this.prisma, user)) && !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status),
      allowedStatuses: canAct ? TRANSITIONS[r.status as RequestStatus].filter((s) => s !== 'ASSIGNED' && s !== 'REFERRED' && !(r.status === 'REFERRED' && r.referrals.some((x) => x.status === 'PENDING'))) : [],
      events: r.events.map((e) => ({ id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, visibleToStudent: e.visibleToStudent, createdAt: e.createdAt, actor: e.actorUserId ? actorName.get(e.actorUserId) ?? null : null })),
    };
  }

  // ---------- actions ----------
  private async loadForAction(tx: any, id: string, user: AffairsUser) {
    const r = await tx.studentRequest.findUnique({ where: { id }, include: { assignedStaff: { select: { userId: true } } } });
    if (!r) throw new NotFoundException('الطلب غير موجود.');
    const isOwner = r.assignedStaff?.userId === user.id;
    if (user.role !== 'SYSTEM_ADMIN' && !(isAffairsStaffRole(user.role) && isOwner)) throw new ForbiddenException('هذا الطلب غير مسند لك.');
    return r;
  }

  async assign(id: string, dto: AssignRequestDto, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.studentRequest.findUnique({ where: { id }, include: { assignedStaff: true } });
      if (!r) throw new NotFoundException('الطلب غير موجود.');
      if (isTerminal(r.status as RequestStatus)) throw new BadRequestException('الطلب منتهٍ ولا يمكن تغييره.');
      const reason = this.cleanReason(dto.reason);
      let targetStaffId: string;

      const manage = user.role === 'SYSTEM_ADMIN' || (await isUnitManager(tx, user));
      if (!manage) {
        await this.settings.assertCapability(user, 'capTakeNewRequests');
        // A staff member may only pick up a new request nobody has taken yet.
        if (r.status !== 'NEW' || r.assignedStaffId) throw new ForbiddenException('لا يمكنك استلام هذا الطلب.');
        const me = await tx.affairsStaff.findUnique({ where: { userId: user.id }, include: { services: { where: { isActive: true } } } });
        if (!me || !me.isActive) throw new ForbiddenException('حسابك غير مضاف كموظف في دائرة شؤون الطلاب.');
        if (dto.staffId && dto.staffId !== me.id) throw new ForbiddenException('يمكنك استلام الطلب لنفسك فقط.');
        if (!me.services.some((s: { serviceId: string }) => s.serviceId === r.serviceId)) throw new ForbiddenException('هذه الخدمة ليست ضمن اختصاصك.');
        targetStaffId = me.id;
      } else {
        if (!dto.staffId) throw new BadRequestException('اختر الموظف.');
        const target = await tx.affairsStaff.findUnique({ where: { id: dto.staffId }, include: { services: { where: { isActive: true } } } });
        if (!target || !target.isActive) throw new BadRequestException('الموظف غير موجود أو موقوف.');
        if (!target.services.some((s: { serviceId: string }) => s.serviceId === r.serviceId)) throw new BadRequestException('هذه الخدمة غير مسندة لهذا الموظف.');
        if (r.assignedStaffId === target.id) throw new BadRequestException('الطلب مسند لهذا الموظف أصلاً.');
        targetStaffId = target.id;
      }

      const isReassign = !!r.assignedStaffId;
      if (isReassign && !reason) throw new BadRequestException('سبب إعادة الإسناد مطلوب.');
      const nextStatus = r.status === 'NEW' ? 'ASSIGNED' : r.status;
      const updated = await tx.studentRequest.update({ where: { id }, data: { assignedStaffId: targetStaffId, status: nextStatus } });
      await tx.studentRequestEvent.create({
        data: {
          requestId: id, type: isReassign ? 'REASSIGNED' : 'ASSIGNED', fromStatus: r.status, toStatus: nextStatus,
          note: reason || null, visibleToStudent: !isReassign, actorUserId: user.id, staffId: targetStaffId,
        },
      });
      await this.audit(tx, isReassign ? 'AFFAIRS_REQUEST_REASSIGNED' : 'AFFAIRS_REQUEST_ASSIGNED', id, user.id, { number: r.number, from: r.assignedStaffId, to: targetStaffId, reason: reason || undefined });
      const assignee = await tx.affairsStaff.findUnique({ where: { id: targetStaffId }, select: { userId: true } });
      await notifyUsers(tx, [assignee?.userId].filter((uid) => uid !== user.id), { kind: 'REQUEST_ASSIGNED', title: isReassign ? 'أُعيد إسناد طلب إليك' : 'أُسند إليك طلب', body: `الطلب ${r.number}${reason ? ` — ${reason}` : ''}`, requestId: id });
      return updated;
    });
  }

  async changeStatus(id: string, dto: ChangeStatusDto, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.loadForAction(tx, id, user);
      const from = r.status as RequestStatus;
      const to = dto.status as RequestStatus;
      if (to === 'ASSIGNED') throw new BadRequestException('الإسناد يتم من خيار الإسناد.');
      if (to === 'REFERRED') throw new BadRequestException('الإحالة تتم من خيار الإحالة.');
      if (from === 'REFERRED' && (await tx.requestReferral.count({ where: { requestId: id, status: 'PENDING' } })) > 0) throw new BadRequestException('للطلب إحالة معلّقة: سجّل رد الجهة أو ألغِ الإحالة أولاً.');
      if (isTerminal(from)) throw new BadRequestException('الطلب منتهٍ ولا يمكن تغيير حالته.');
      if (!canTransition(from, to)) throw new BadRequestException('لا يمكن الانتقال من هذه الحالة إلى الحالة المطلوبة.');
      const note = this.cleanReason(dto.note);
      if (reasonRequired(to) && !note) throw new BadRequestException('السبب مطلوب لهذه الحالة.');
      const closing = isTerminal(to);
      const updated = await tx.studentRequest.update({
        where: { id },
        data: { status: to, closedAt: closing ? new Date() : null, decisionReason: to === 'REJECTED' || to === 'CANCELLED' ? note : r.decisionReason },
      });
      await tx.studentRequestEvent.create({ data: { requestId: id, type: 'STATUS_CHANGED', fromStatus: from, toStatus: to, note: note || null, visibleToStudent: true, actorUserId: user.id, staffId: r.assignedStaffId } });
      await this.audit(tx, 'AFFAIRS_REQUEST_STATUS_CHANGED', id, user.id, { number: r.number, from, to, reason: note || undefined });
      const owner = await tx.student.findUnique({ where: { id: r.studentId }, select: { userId: true } });
      await notifyUsers(tx, [owner?.userId], { ...studentStatusMessage(r.number, to, note), requestId: id });
      return updated;
    });
  }

  async comment(id: string, dto: CommentDto, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.loadForAction(tx, id, user);
      const note = this.cleanReason(dto.note);
      if (!note) throw new BadRequestException('اكتب التعليق.');
      const event = await tx.studentRequestEvent.create({ data: { requestId: id, type: 'COMMENT', note, visibleToStudent: false, actorUserId: user.id, staffId: r.assignedStaffId } });
      await this.audit(tx, 'AFFAIRS_REQUEST_COMMENTED', id, user.id, { number: r.number });
      return event;
    });
  }

  // ---------- summary ----------
  async summary(user: AffairsUser, filters: { from?: string; to?: string; serviceId?: string } = {}) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    // Optional filters (period, service) narrow every counter; the lists behind each counter use the same filters.
    const base: Record<string, unknown> = {};
    const created = dayRange(filters.from, filters.to);
    if (created) base.createdAt = created;
    if (filters.serviceId) base.serviceId = filters.serviceId;
    const withBase = (extra: Record<string, unknown>) => ({ AND: [base, extra] });
    const [fresh, mine, waiting, referred, doneToday, overdue, events, studentsTotal, studentsActive] = await Promise.all([
      this.prisma.studentRequest.count({ where: withBase({ status: 'NEW' }) }),
      this.prisma.studentRequest.count({ where: withBase({ assignedStaff: { userId: user.id }, status: { in: OPEN_STATUSES } }) }),
      this.prisma.studentRequest.count({ where: withBase({ status: 'WAITING_COMPLETION' }) }),
      this.prisma.studentRequest.count({ where: withBase({ status: 'REFERRED' }) }),
      this.prisma.studentRequest.count({ where: withBase({ status: 'COMPLETED', closedAt: { gte: startOfDay } }) }),
      this.prisma.studentRequest.count({ where: withBase({ status: { in: OPEN_STATUSES }, dueAt: { lt: new Date() } }) }),
      this.prisma.studentRequestEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { request: { select: { id: true, number: true, service: { select: { nameAr: true } } } } } }),
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'CONTINUING' } }),
    ]);
    const result: Record<string, unknown> = {
      counts: { new: fresh, mine, waiting, referred, doneToday, overdue },
      students: { total: studentsTotal, active: studentsActive },
      recentEvents: events.map((e) => ({ id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, createdAt: e.createdAt, requestId: e.request.id, requestNumber: e.request.number, serviceName: e.request.service.nameAr })),
    };
    if (await canManage(this.prisma, user)) result.staffLoad = (await this.listStaff()).filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, open: s.open, done: s.done }));
    return result;
  }

  // ---------- operations log (request events) ----------
  async operations(page = 1) {
    const pageSize = 30;
    const rows = await this.prisma.studentRequestEvent.findMany({
      orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize + 1,
      include: { request: { select: { id: true, number: true, service: { select: { nameAr: true } } } } },
    });
    const actorIds = [...new Set(rows.map((e) => e.actorUserId).filter((x): x is string => !!x))];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true, username: true, email: true } }) : [];
    const name = new Map(actors.map((a) => [a.id, a.displayName || a.username || a.email]));
    return {
      page, hasMore: rows.length > pageSize,
      items: rows.slice(0, pageSize).map((e) => ({
        id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, createdAt: e.createdAt,
        actor: e.actorUserId ? name.get(e.actorUserId) ?? null : null, requestId: e.request.id, requestNumber: e.request.number, serviceName: e.request.service.nameAr,
      })),
    };
  }

  // ---------- student side ----------
  private async studentOf(user: AffairsUser) {
    const student = await this.prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!student) throw new ForbiddenException('حسابك غير مرتبط بملف طالب.');
    return student;
  }

  myServices() {
    return this.prisma.affairsService.findMany({ where: { isActive: true, channel: { not: 'IN_PERSON' } }, orderBy: { createdAt: 'asc' }, select: { id: true, code: true, nameAr: true, description: true, expectedDays: true, attachmentsNote: true, feeNote: true, requiredData: true } });
  }

  async myRequests(user: AffairsUser) {
    const student = await this.studentOf(user);
    return this.prisma.studentRequest.findMany({
      where: { studentId: student.id }, orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, number: true, status: true, subject: true, createdAt: true, closedAt: true, service: { select: { nameAr: true } } },
    });
  }

  async createMine(dto: StudentCreateRequestDto, user: AffairsUser) {
    const student = await this.studentOf(user);
    const created = await this.createForStudent(student.id, dto.serviceId, dto.subject, dto.details, user);
    return { id: created.id, number: created.number, status: created.status };
  }

  async myRequest(id: string, user: AffairsUser) {
    const student = await this.studentOf(user);
    const r = await this.prisma.studentRequest.findFirst({
      where: { id, studentId: student.id },
      include: {
        service: { select: { nameAr: true } }, events: { where: { visibleToStudent: true }, orderBy: { createdAt: 'asc' } },
        attachments: { where: { isArchived: false, visibleToStudent: true }, orderBy: { createdAt: 'asc' }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } },
        documents: { orderBy: { issuedAt: 'desc' }, select: { id: true, number: true, status: true, issuedAt: true, type: { select: { nameAr: true } } } },
      },
    });
    if (!r) throw new NotFoundException('الطلب غير موجود.');
    return {
      id: r.id, number: r.number, status: r.status, subject: r.subject, details: r.details, decisionReason: r.decisionReason,
      createdAt: r.createdAt, dueAt: r.dueAt, closedAt: r.closedAt, service: r.service, channel: r.channel, attachments: r.attachments,
      documents: r.documents.map((d) => ({ id: d.id, number: d.number, status: d.status, issuedAt: d.issuedAt, typeName: d.type.nameAr })),
      events: r.events.map((e) => ({ id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, createdAt: e.createdAt })),
    };
  }
}
