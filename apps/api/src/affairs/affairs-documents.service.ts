import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { STUDENT_STATUS_LABEL } from '../students/student-status.js';
import type { AffairsUser } from './affairs.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { audit, loadRequestForAction } from './affairs-access.js';
import { notifyUsers } from './affairs-notifications.js';
import { CODE_PATTERN, ISSUABLE_REQUEST_STATUSES, documentNumber, generateVerificationCode, maskName, renderTemplate } from './affairs-documents.rules.js';
import { CreateDocumentTypeDto, ListDocumentsQueryDto, UpdateDocumentTypeDto } from './dto/affairs.dto.js';

const PAGE_SIZE = 20;

function studentName(s: { fullName: string | null; firstName: string; middleName: string | null; familyName: string }) {
  return s.fullName || [s.firstName, s.middleName, s.familyName].filter(Boolean).join(' ');
}

// النص الرسمي في الوثيقة: المستمر «مقيّد»، وغيره باسم حالته (قيد استكمال التسجيل، مؤجل، منسحب...).
const STATUS_TEXT: Record<string, string> = { ...STUDENT_STATUS_LABEL, CONTINUING: 'مقيّد' };

@Injectable()
export class AffairsDocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: AffairsSettingsService) {}

  // ---------- document types (wording of each document) ----------
  listTypes() {
    return this.prisma.documentType.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createType(dto: CreateDocumentTypeDto, user: AffairsUser) {
    if (await this.prisma.documentType.findUnique({ where: { code: dto.code } })) throw new ConflictException('رمز نوع الوثيقة مستخدم.');
    const created = await this.prisma.documentType.create({
      data: {
        code: dto.code, nameAr: dto.nameAr.trim(), titleAr: dto.titleAr.trim(), issuingBody: dto.issuingBody.trim(), bodyTemplate: dto.bodyTemplate.trim(),
        footerNote: dto.footerNote?.trim() || null, includesResults: dto.includesResults ?? false,
      },
    });
    await this.prisma.auditLog.create({ data: { action: 'AFFAIRS_DOCUMENT_TYPE_CREATED', entity: 'DocumentType', entityId: created.id, userId: user.id, details: JSON.stringify({ code: created.code }) } });
    return created;
  }

  async updateType(id: string, dto: UpdateDocumentTypeDto, user: AffairsUser) {
    if (!(await this.prisma.documentType.findUnique({ where: { id } }))) throw new NotFoundException('نوع الوثيقة غير موجود.');
    const data: Record<string, unknown> = {};
    for (const key of ['nameAr', 'titleAr', 'issuingBody', 'bodyTemplate'] as const) if (dto[key] !== undefined) data[key] = dto[key]!.trim();
    if (dto.footerNote !== undefined) data.footerNote = dto.footerNote.trim() || null;
    if (dto.includesResults !== undefined) data.includesResults = dto.includesResults;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    const updated = await this.prisma.documentType.update({ where: { id }, data });
    await this.prisma.auditLog.create({ data: { action: 'AFFAIRS_DOCUMENT_TYPE_UPDATED', entity: 'DocumentType', entityId: id, userId: user.id, details: JSON.stringify({ fields: Object.keys(data) }) } });
    return updated;
  }

  // ---------- issuing ----------
  // A document is issued from a request that was accepted or completed, by the assigned staff member or a system admin.
  async issue(requestId: string, user: AffairsUser) {
    await this.settings.assertCapability(user, 'capIssueDocuments');
    return this.prisma.$transaction(async (tx) => {
      await loadRequestForAction(tx as never, requestId, user);
      const request = await tx.studentRequest.findUnique({
        where: { id: requestId },
        include: { student: true, service: { include: { documentType: true } } },
      });
      if (!request) throw new NotFoundException('الطلب غير موجود.');
      const type = request.service.documentType;
      if (!type || !type.isActive) throw new BadRequestException('هذه الخدمة غير مرتبطة بنوع وثيقة فعّال.');
      if (!ISSUABLE_REQUEST_STATUSES.includes(request.status)) throw new BadRequestException('تُصدر الوثيقة بعد قبول الطلب أو إكماله.');
      if ((await tx.issuedDocument.count({ where: { requestId, status: 'ACTIVE' } })) > 0) throw new ConflictException('صدرت وثيقة نشطة لهذا الطلب. ألغِها أولاً إذا لزم إصدار غيرها.');

      const s = request.student;
      const [college, department, program, issuer] = await Promise.all([
        s.collegeId ? tx.college.findUnique({ where: { id: s.collegeId }, select: { nameAr: true } }) : null,
        s.departmentId ? tx.department.findUnique({ where: { id: s.departmentId }, select: { nameAr: true } }) : null,
        s.programId ? tx.program.findUnique({ where: { id: s.programId }, select: { nameAr: true } }) : null,
        tx.user.findUnique({ where: { id: user.id }, select: { displayName: true, username: true, email: true } }),
      ]);
      const now = new Date();
      const dateText = new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'long' }).format(now);
      const info = {
        studentName: studentName(s), universityId: s.universityId, college: college?.nameAr ?? null, department: department?.nameAr ?? null,
        program: program?.nameAr ?? null, status: STATUS_TEXT[s.status] ?? s.status, date: dateText,
      };

      let results: unknown[] | undefined;
      if (type.includesResults) {
        const rows = await tx.courseResult.findMany({
          where: { studentId: s.id }, orderBy: [{ createdAt: 'asc' }],
          include: { course: { select: { code: true, nameAr: true, credits: true } }, semester: { select: { nameAr: true } } },
        });
        results = rows.map((r) => ({ semester: r.semester.nameAr, code: r.course.code, name: r.course.nameAr, credits: r.course.credits, score: r.score.toString(), grade: r.gradeLabel, passed: r.passed }));
      }

      const counter = await tx.documentCounter.upsert({ where: { year: now.getFullYear() }, create: { year: now.getFullYear(), last: 1 }, update: { last: { increment: 1 } } });
      const number = documentNumber(now.getFullYear(), counter.last);
      const payload = {
        type: { nameAr: type.nameAr, titleAr: type.titleAr, issuingBody: type.issuingBody, footerNote: type.footerNote },
        student: info, body: renderTemplate(type.bodyTemplate, info), results: results ?? null, issuedDate: dateText,
        issuedBy: issuer ? issuer.displayName || issuer.username || issuer.email : null, requestNumber: request.number,
      };
      const doc = await tx.issuedDocument.create({
        data: { number, verificationCode: generateVerificationCode(), typeId: type.id, studentId: s.id, requestId, payload: payload as never, issuedByUserId: user.id, issuedAt: now },
        select: { id: true, number: true, verificationCode: true, status: true, issuedAt: true },
      });
      await tx.studentRequestEvent.create({ data: { requestId, type: 'DOCUMENT_ISSUED', note: `صدرت الوثيقة ${number} (${type.nameAr})`, visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      await audit(tx, 'AFFAIRS_DOCUMENT_ISSUED', requestId, user.id, { number: request.number, documentId: doc.id, documentNumber: number, type: type.code });
      await notifyUsers(tx, [s.userId], { kind: 'DOCUMENT_ISSUED', title: 'صدرت وثيقتك', body: `${type.nameAr} رقم ${number} (الطلب ${request.number})`, requestId });

      // A document-only service is finished once its document is issued.
      if (request.status === 'ACCEPTED' && request.service.outcome === 'DOCUMENT') {
        await tx.studentRequest.update({ where: { id: requestId }, data: { status: 'COMPLETED', closedAt: now } });
        await tx.studentRequestEvent.create({ data: { requestId, type: 'STATUS_CHANGED', fromStatus: 'ACCEPTED', toStatus: 'COMPLETED', note: 'صدرت الوثيقة المطلوبة', visibleToStudent: true, actorUserId: user.id, staffId: request.assignedStaffId } });
      }
      return doc;
    });
  }

  // ---------- reading ----------
  private async docRow(id: string) {
    return this.prisma.issuedDocument.findUnique({
      where: { id },
      include: { student: { select: { id: true, userId: true, universityId: true } }, type: { select: { nameAr: true } } },
    });
  }

  async get(id: string, user: AffairsUser) {
    const doc = await this.docRow(id);
    if (!doc || (user.role === 'STUDENT' && doc.student.userId !== user.id)) throw new NotFoundException('الوثيقة غير موجودة.');
    return {
      id: doc.id, number: doc.number, verificationCode: doc.verificationCode, status: doc.status, issuedAt: doc.issuedAt, typeName: doc.type.nameAr, payload: doc.payload,
      revokedAt: doc.revokedAt, revokedReason: user.role === 'STUDENT' ? null : doc.revokedReason, requestId: doc.requestId, studentId: doc.student.id,
    };
  }

  async list(query: ListDocumentsQueryDto) {
    const page = query.page ?? 1;
    const term = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status as 'ACTIVE' } : {}),
      ...(term ? { OR: [
        { number: { contains: term, mode: 'insensitive' as const } },
        { student: { universityId: { contains: term, mode: 'insensitive' as const } } },
        { student: { fullName: { contains: term, mode: 'insensitive' as const } } },
        { student: { firstName: { contains: term, mode: 'insensitive' as const } } },
        { student: { familyName: { contains: term, mode: 'insensitive' as const } } },
      ] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.issuedDocument.count({ where }),
      this.prisma.issuedDocument.findMany({
        where, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        include: { type: { select: { nameAr: true } }, student: { select: { universityId: true, fullName: true, firstName: true, middleName: true, familyName: true } }, request: { select: { number: true } } },
      }),
    ]);
    return {
      total, page, pageSize: PAGE_SIZE,
      items: rows.map((d) => ({ id: d.id, number: d.number, typeName: d.type.nameAr, status: d.status, issuedAt: d.issuedAt, revokedAt: d.revokedAt, revokedReason: d.revokedReason, studentName: studentName(d.student), universityId: d.student.universityId, requestNumber: d.request?.number ?? null, requestId: d.requestId })),
    };
  }

  async ofStudent(studentId: string) {
    const rows = await this.prisma.issuedDocument.findMany({ where: { studentId }, orderBy: { issuedAt: 'desc' }, include: { type: { select: { nameAr: true } } } });
    return rows.map((d) => ({ id: d.id, number: d.number, typeName: d.type.nameAr, status: d.status, issuedAt: d.issuedAt, revokedAt: d.revokedAt, revokedReason: d.revokedReason }));
  }

  async mine(user: AffairsUser) {
    const student = await this.prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!student) throw new ForbiddenException('حسابك غير مرتبط بملف طالب.');
    return (await this.ofStudent(student.id)).map((d) => ({ ...d, revokedReason: undefined }));
  }

  // ---------- revoking (never deleted) ----------
  // Allowed for a system admin or the person who issued the document.
  async revoke(id: string, reason: string, user: AffairsUser) {
    const why = (reason ?? '').trim();
    if (!why) throw new BadRequestException('سبب الإلغاء مطلوب.');
    await this.settings.assertCapability(user, 'capRevokeOwnDocuments');
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.issuedDocument.findUnique({ where: { id }, include: { student: { select: { userId: true } } } });
      if (!doc) throw new NotFoundException('الوثيقة غير موجودة.');
      if (user.role !== 'SYSTEM_ADMIN' && doc.issuedByUserId !== user.id) throw new ForbiddenException('لا تملك صلاحية إلغاء هذه الوثيقة.');
      if (doc.status === 'REVOKED') throw new BadRequestException('الوثيقة ملغاة مسبقاً.');
      await tx.issuedDocument.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: why, revokedByUserId: user.id } });
      if (doc.requestId) {
        await tx.studentRequestEvent.create({ data: { requestId: doc.requestId, type: 'DOCUMENT_REVOKED', note: `أُلغيت الوثيقة ${doc.number}`, visibleToStudent: true, actorUserId: user.id } });
        await tx.studentRequestEvent.create({ data: { requestId: doc.requestId, type: 'DOCUMENT_REVOKED', note: `سبب إلغاء ${doc.number}: ${why}`, visibleToStudent: false, actorUserId: user.id } });
      }
      await audit(tx, 'AFFAIRS_DOCUMENT_REVOKED', doc.requestId ?? doc.id, user.id, { documentId: id, documentNumber: doc.number, reason: why });
      await notifyUsers(tx, [doc.student?.userId], { kind: 'DOCUMENT_REVOKED', title: 'أُلغيت وثيقة', body: `الوثيقة رقم ${doc.number}`, requestId: doc.requestId });
      return { ok: true };
    });
  }

  // ---------- public check (no login): the least data needed ----------
  async verify(code: string) {
    if (!CODE_PATTERN.test(code ?? '')) return { status: 'NOT_FOUND' as const };
    const doc = await this.prisma.issuedDocument.findUnique({
      where: { verificationCode: code },
      include: { type: { select: { nameAr: true, issuingBody: true } }, student: { select: { fullName: true, firstName: true, middleName: true, familyName: true } } },
    });
    if (!doc) return { status: 'NOT_FOUND' as const };
    return {
      status: doc.status === 'ACTIVE' ? ('VALID' as const) : ('REVOKED' as const),
      number: doc.number, typeName: doc.type.nameAr, issuingBody: doc.type.issuingBody, issuedAt: doc.issuedAt,
      studentName: maskName(studentName(doc.student)), revokedAt: doc.status === 'REVOKED' ? doc.revokedAt : null,
    };
  }
}
