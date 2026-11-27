import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ApproveRegistrationAutoDto, ApproveRegistrationDto, BulkDeleteStudentsDto, ChangeStudentStatusDto, StudentInputDto, TransferCollegeDto } from './dto/student-input.dto.js';
import { assertSelectable } from '../academic-structure/active-structure.js';
import { pickPlanForAdmission } from '../study-plans/plan-selection.js';
import { admissionYearOf } from './student-admission.js';
import { STUDENT_STATUS_LABEL, parseStudentStatus, transitionRule, type StudentStatus } from './student-status.js';
import { digitVariants, isDigitsOnly, isPersonName, isPlaceName, isSyrianMobile, isSyrianNationalId, normalizeDigits, normalizeGender, normalizeText } from './student-data-validation.js';

interface FindStudentsOptions {
  search?: string;
  status?: string;
  accountStatus?: string;
}

@Injectable()
export class StudentsService implements OnModuleInit, OnModuleDestroy {
  private deferralTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAdvisors() {
    return this.prisma.user.findMany({
      where: { role: { code: 'ADVISOR' }, status: 'ACTIVE' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }

  // current: القيم الحالية عند تعديل طالب موجود (التعطيل يمنع الاختيار الجديد فقط، ولا يمنع تعديل طالب بقي في كلية معطّلة).
  private async validateStructure(data: StudentInputDto, current: { collegeId?: string | null; departmentId?: string | null; programId?: string | null; studyPlanId?: string | null } = {}) {
    const { collegeId, departmentId, programId, studyPlanId, academicYearId, semesterId, advisorId } = data;
    const invalid = () => { throw new BadRequestException('Invalid academic structure or advisor'); };

    if (collegeId && !await this.prisma.college.findUnique({ where: { id: collegeId } })) invalid();
    await assertSelectable(this.prisma, { collegeId, departmentId, programId }, current);
    if (departmentId) {
      const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!collegeId || department?.collegeId !== collegeId) invalid();
    }
    if (programId) {
      const program = await this.prisma.program.findUnique({ where: { id: programId }, select: { departmentId: true, collegeId: true } });
      if (departmentId) {
        if (program?.departmentId !== departmentId) invalid();
      } else if (!collegeId || program?.collegeId !== collegeId || program.departmentId) {
        invalid();
      }
    }
    if (studyPlanId) {
      const plan = await this.prisma.studyPlan.findUnique({ where: { id: studyPlanId } });
      if (!programId || plan?.programId !== programId) invalid();
      // الطالب يُربط بخطة معتمدة فقط. من بقي على إصدار قديم أو بقيت خطته كما هي لا يتأثر.
      if (plan && studyPlanId !== current.studyPlanId) {
        if (plan.status === 'DRAFT') throw new BadRequestException('هذه الخطة ما زالت مسودة. اعتمدها أولاً من صفحة الخطط الدراسية.');
        if (plan.status === 'SUPERSEDED') throw new BadRequestException('هذا إصدار قديم من الخطة. اختر الإصدار المعتمد الحالي.');
      }
    }
    if (academicYearId) {
      const year = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
      if (!studyPlanId || year?.studyPlanId !== studyPlanId) invalid();
    }
    if (semesterId) {
      const semester = await this.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!academicYearId || semester?.academicYearId !== academicYearId) invalid();
    }
    if (advisorId) {
      const advisor = await this.prisma.user.findUnique({ where: { id: advisorId }, include: { role: true } });
      if (advisor?.role.code !== 'ADVISOR' || advisor.status !== 'ACTIVE') invalid();
    }
  }

  private normalize(data: StudentInputDto) {
    const required = ['universityId', 'firstName', 'middleName', 'motherName', 'applicationNumber'] as const;
    for (const field of required) {
      if (!data[field]?.trim()) throw new BadRequestException(`${field} is required`);
    }
    const names: Array<[string, string | null | undefined]> = [
      ['الاسم الأول', data.firstName], ['اسم الأب', data.middleName],
      ['اسم العائلة', data.familyName], ['اسم الأم', data.motherName],
      ['الاسم بالإنجليزية', data.englishName],
    ];
    for (const [label, value] of names) {
      if (value?.trim() && !isPersonName(value)) {
        throw new BadRequestException(`${label}: استخدم الحروف والمسافات والشرطة أو الفاصلة العليا فقط.`);
      }
    }
    for (const [label, value] of [['الرقم الوطني', data.nationalId], ['رقم الاكتتاب', data.applicationNumber]] as const) {
      if (value?.trim() && !isDigitsOnly(value)) {
        throw new BadRequestException(`${label}: أدخل الأرقام فقط.`);
      }
    }
    if (data.nationalId?.trim() && !isSyrianNationalId(data.nationalId)) {
      throw new BadRequestException('الرقم الوطني: أدخل 11 رقمًا.');
    }
    if (data.gender?.trim() && !normalizeGender(data.gender)) {
      throw new BadRequestException('الجنس: اختر ذكرًا أو أنثى.');
    }
    if (data.nationality?.trim() && !isPersonName(data.nationality)) {
      throw new BadRequestException('الجنسية: أدخل اسم الجنسية بالحروف فقط.');
    }
    if (data.birthPlace?.trim() && !isPlaceName(data.birthPlace)) {
      throw new BadRequestException('مكان الولادة: أدخل اسم المكان بصيغة صحيحة.');
    }
    if (data.phone?.trim() && !isSyrianMobile(data.phone)) {
      throw new BadRequestException('رقم الهاتف: أدخل رقمًا سوريًا محليًا من 10 أرقام يبدأ بـ 09.');
    }
    const optional = (value?: string | null) => value?.trim() || null;
    const date = (value?: string | null) => value ? new Date(value) : null;
    if (data.dateOfBirth && Number.isNaN(date(data.dateOfBirth)?.getTime())) throw new BadRequestException('Invalid date of birth');
    if (data.admissionDate && Number.isNaN(date(data.admissionDate)?.getTime())) throw new BadRequestException('Invalid admission date');
    return {
      universityId: normalizeText(data.universityId),
      firstName: normalizeText(data.firstName),
      fullName: [data.firstName, data.middleName, data.familyName].map((value) => value?.trim()).filter(Boolean).join(' '),
      familyName: data.familyName?.trim() ? normalizeText(data.familyName) : '',
      meritNumber: data.meritNumber?.trim() || null,
      middleName: data.middleName?.trim() ? normalizeText(data.middleName) : null,
      motherName: data.motherName?.trim() ? normalizeText(data.motherName) : null,
      nationalId: data.nationalId?.trim() ? normalizeDigits(data.nationalId.trim()) : null,
      applicationNumber: data.applicationNumber?.trim() ? normalizeDigits(data.applicationNumber.trim()) : null,
      birthPlace: optional(data.birthPlace),
      englishName: optional(data.englishName),
      gender: normalizeGender(data.gender),
      dateOfBirth: date(data.dateOfBirth),
      nationality: data.nationality?.trim() ? normalizeText(data.nationality) : null,
      idOrPassport: optional(data.idOrPassport),
      universityEmail: optional(data.universityEmail),
      phone: data.phone?.trim() ? normalizeDigits(data.phone.trim()) : null,
      collegeId: optional(data.collegeId),
      departmentId: optional(data.departmentId),
      programId: optional(data.programId),
      studyPlanId: optional(data.studyPlanId),
      academicYearId: optional(data.academicYearId),
      semesterId: optional(data.semesterId),
      advisorId: optional(data.advisorId),
      admissionDate: date(data.admissionDate),
    };
  }

  // اعتماد التسجيل: يربط الطلاب الذين بلا خطة بالكلية والقسم والبرنامج والخطة والمستوى والفصل.
  // من لديه خطة مسبقاً يُتخطى (يعدَّل من نموذج الطالب)، ويُرجَع سبب كل تخطٍّ.
  async approveRegistration(dto: ApproveRegistrationDto, actingUserId: string) {
    await this.validateStructure(dto as unknown as StudentInputDto);
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds } },
      select: { id: true, universityId: true, studyPlanId: true },
    });
    const found = new Map(students.map((student) => [student.id, student]));
    const skipped: Array<{ studentId: string; universityId: string; reason: string }> = [];
    const approvable: string[] = [];
    for (const id of dto.studentIds) {
      const student = found.get(id);
      if (!student) skipped.push({ studentId: id, universityId: '', reason: 'الطالب غير موجود' });
      else if (student.studyPlanId) skipped.push({ studentId: id, universityId: student.universityId, reason: 'مرتبط بخطة دراسية مسبقاً' });
      else approvable.push(id);
    }
    if (approvable.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.student.updateMany({
          where: { id: { in: approvable }, studyPlanId: null },
          data: {
            collegeId: dto.collegeId, departmentId: dto.departmentId, programId: dto.programId,
            studyPlanId: dto.studyPlanId, academicYearId: dto.academicYearId, semesterId: dto.semesterId,
          },
        });
        // اعتماد التسجيل يحوّل «قيد استكمال التسجيل» إلى «مستمر» (يدويًا الآن؛ سيصبح تلقائيًا بعد الوثائق والقسط الأول).
        const moved = await tx.student.findMany({ where: { id: { in: approvable }, status: 'PENDING_REGISTRATION' }, select: { id: true } });
        if (moved.length) {
          await tx.student.updateMany({ where: { id: { in: moved.map((m) => m.id) }, status: 'PENDING_REGISTRATION' }, data: { status: 'CONTINUING' } });
          await tx.studentDataChange.createMany({ data: moved.map((m) => ({ studentId: m.id, field: 'status', oldValue: 'PENDING_REGISTRATION', newValue: 'CONTINUING', changedByUserId: actingUserId })) });
        }
        await tx.auditLog.create({ data: {
          action: 'STUDENTS_REGISTRATION_APPROVED', entity: 'Student', userId: actingUserId,
          details: JSON.stringify({
            count: approvable.length, studentIds: approvable,
            collegeId: dto.collegeId, departmentId: dto.departmentId, programId: dto.programId,
            studyPlanId: dto.studyPlanId, academicYearId: dto.academicYearId, semesterId: dto.semesterId,
          }),
        } });
      });
    }
    return { approved: approvable.length, skipped };
  }

  // تغيير حالة الطالب الأكاديمية/الإدارية: انتقالات محددة، والسبب مطلوب، ويُسجَّل في سجل الطالب وسجل العمليات.
  async changeStatus(id: string, dto: ChangeStudentStatusDto, user: { id: string; role: string }) {
    const to = parseStudentStatus(dto.status);
    if (!to) throw new BadRequestException('حالة الطالب غير معروفة.');
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('سبب تغيير الحالة مطلوب.');
    const student = await this.prisma.student.findUnique({ where: { id }, select: { id: true, universityId: true, status: true, deferredUntil: true } });
    if (!student) throw new NotFoundException('الطالب غير موجود.');
    // التأجيل يحتاج تاريخ عودة مستقبليًا. ومن هو مؤجل أصلاً يستطيع تعديل التاريخ بنفس الإجراء.
    let returnDate: Date | null = null;
    if (to === 'DEFERRED') {
      returnDate = dto.returnDate ? new Date(dto.returnDate) : null;
      if (!returnDate || Number.isNaN(returnDate.getTime())) throw new BadRequestException('حدّد تاريخ عودة الطالب بعد التأجيل.');
      if (returnDate.getTime() <= Date.now()) throw new BadRequestException('تاريخ العودة يجب أن يكون في المستقبل.');
    }
    const editingDate = to === 'DEFERRED' && student.status === 'DEFERRED';
    if (student.status === to && !editingDate) throw new BadRequestException('الطالب في هذه الحالة أصلاً.');
    const rule = transitionRule(student.status, to);
    if (!rule) throw new BadRequestException(`لا يمكن نقل الطالب من «${STUDENT_STATUS_LABEL[student.status as StudentStatus] ?? student.status}» إلى «${STUDENT_STATUS_LABEL[to]}».`);
    if (rule.adminOnly && user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('هذا التغيير قرار استثنائي لا يقوم به إلا مدير النظام.');
    const dateText = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.student.updateMany({ where: { id, status: student.status }, data: { status: to, deferredUntil: returnDate } });
      if (changed.count !== 1) throw new ConflictException('تغيّرت حالة الطالب أثناء العملية. حدّث الصفحة وأعد المحاولة.');
      if (!editingDate) await tx.studentDataChange.create({ data: { studentId: id, field: 'status', oldValue: student.status, newValue: to, changedByUserId: user.id } });
      if (to === 'DEFERRED' || student.deferredUntil) {
        await tx.studentDataChange.create({ data: { studentId: id, field: 'deferredUntil', oldValue: dateText(student.deferredUntil), newValue: dateText(returnDate), changedByUserId: user.id } });
      }
      await tx.auditLog.create({ data: {
        action: 'STUDENT_STATUS_CHANGED', entity: 'Student', entityId: id, userId: user.id,
        details: JSON.stringify({ universityId: student.universityId, from: student.status, to, reason, ...(to === 'DEFERRED' ? { returnDate: dateText(returnDate) } : {}) }),
      } });
      return { id, status: to, deferredUntil: dateText(returnDate) };
    });
  }

  // عودة المؤجلين الذين انتهت مدة تأجيلهم إلى «مستمر» تلقائيًا (تُستدعى دوريًا وعند فتح قوائم الطلاب وحساب الطالب).
  async returnDueDeferred(now = new Date()) {
    const due = await this.prisma.student.findMany({ where: { status: 'DEFERRED', deferredUntil: { lte: now } }, select: { id: true, universityId: true, deferredUntil: true } });
    let returned = 0;
    for (const student of due) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.student.updateMany({ where: { id: student.id, status: 'DEFERRED', deferredUntil: { lte: now } }, data: { status: 'CONTINUING', deferredUntil: null } });
        if (changed.count !== 1) return;
        await tx.studentDataChange.create({ data: { studentId: student.id, field: 'status', oldValue: 'DEFERRED', newValue: 'CONTINUING', changedByUserId: null } });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_DEFERRAL_ENDED', entity: 'Student', entityId: student.id,
          details: JSON.stringify({ universityId: student.universityId, from: 'DEFERRED', to: 'CONTINUING', reason: 'عودة تلقائية بعد انتهاء مدة التأجيل', returnDate: student.deferredUntil?.toISOString().slice(0, 10) }),
        } });
        returned += 1;
      });
    }
    return returned;
  }

  onModuleInit() {
    const run = () => this.returnDueDeferred().catch((error: unknown) => console.error('تعذر إرجاع المؤجلين المنتهية مدتهم', error));
    void run();
    this.deferralTimer = setInterval(run, 60 * 60 * 1000);
    this.deferralTimer.unref();
  }

  onModuleDestroy() {
    if (this.deferralTimer) clearInterval(this.deferralTimer);
  }

  // اعتماد التسجيل تلقائيًا: يُربط كل طالب بالخطة (والإصدار) المعتمدة المناسبة لبرنامجه ودفعة قبوله، في أول مستوى وأول فصل منها.
  // من لا يُحدَّد له ربط مناسب يُتخطى مع السبب. dryRun: معاينة بلا كتابة. الإصدارات الجديدة لاحقًا لا تنقل من رُبط سابقًا.
  async approveRegistrationAuto(dto: ApproveRegistrationAutoDto, actingUserId: string) {
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds } },
      select: { id: true, universityId: true, firstName: true, middleName: true, familyName: true, admissionDate: true, collegeId: true, departmentId: true, programId: true, studyPlanId: true, status: true },
    });
    const found = new Map(students.map((student) => [student.id, student]));
    const programIds = [...new Set(students.map((student) => student.programId).filter((id): id is string => Boolean(id)))];
    const [programs, plans] = await Promise.all([
      this.prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, nameAr: true, departmentId: true, collegeId: true, department: { select: { collegeId: true } } } }),
      this.prisma.studyPlan.findMany({
        where: { programId: { in: programIds }, status: 'APPROVED' },
        select: {
          id: true, programId: true, nameAr: true, status: true, versionNumber: true, cohortYear: true,
          academicYears: { orderBy: { levelNumber: 'asc' }, take: 1, select: { id: true, nameAr: true, semesters: { orderBy: { semesterNumber: 'asc' }, take: 1, select: { id: true, nameAr: true } } } },
        },
      }),
    ]);
    type Row = { studentId: string; universityId: string; name: string; admissionYear: number | null; plan: { id: string; nameAr: string; versionNumber: number; cohortYear: number | null } | null; level: string | null; semester: string | null; reason: string | null };
    const rows: Row[] = [];
    const placements: Array<{ studentId: string; collegeId: string | null; departmentId: string | null; programId: string; studyPlanId: string; academicYearId: string; semesterId: string; status: string }> = [];
    for (const id of dto.studentIds) {
      const student = found.get(id);
      if (!student) { rows.push({ studentId: id, universityId: '', name: '', admissionYear: null, plan: null, level: null, semester: null, reason: 'الطالب غير موجود' }); continue; }
      const name = [student.firstName, student.middleName, student.familyName].filter(Boolean).join(' ');
      const admissionYear = admissionYearOf(student);
      const base = { studentId: id, universityId: student.universityId, name, admissionYear, plan: null, level: null, semester: null };
      if (student.studyPlanId) { rows.push({ ...base, reason: 'مرتبط بخطة دراسية مسبقاً' }); continue; }
      const program = programs.find((item) => item.id === student.programId);
      if (!program) { rows.push({ ...base, reason: 'البرنامج غير محدد للطالب (حدّده من تعديل البيانات أو اعتمد يدويًا)' }); continue; }
      try { await assertSelectable(this.prisma, { programId: program.id }); } catch (error) { rows.push({ ...base, reason: error instanceof BadRequestException ? 'البرنامج أو قسمه أو كليته معطّل' : 'تعذر التحقق من البرنامج' }); continue; }
      const plan = pickPlanForAdmission(plans.filter((item) => item.programId === program.id), admissionYear);
      if (!plan) { rows.push({ ...base, reason: `لا توجد خطة معتمدة مناسبة${admissionYear ? ` لدفعة ${admissionYear}` : ''} لهذا البرنامج` }); continue; }
      const level = plan.academicYears[0];
      const semester = level?.semesters[0];
      if (!level || !semester) { rows.push({ ...base, reason: 'الخطة المختارة بلا مستويات أو فصول' }); continue; }
      rows.push({ ...base, plan: { id: plan.id, nameAr: plan.nameAr, versionNumber: plan.versionNumber, cohortYear: plan.cohortYear }, level: level.nameAr, semester: semester.nameAr, reason: null });
      placements.push({
        studentId: id, collegeId: student.collegeId ?? program.collegeId ?? program.department?.collegeId ?? null, departmentId: student.departmentId ?? program.departmentId ?? null,
        programId: program.id, studyPlanId: plan.id, academicYearId: level.id, semesterId: semester.id, status: student.status,
      });
    }
    if (!dto.dryRun && placements.length) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of placements) {
          const done = await tx.student.updateMany({
            where: { id: item.studentId, studyPlanId: null },
            data: {
              collegeId: item.collegeId, departmentId: item.departmentId, programId: item.programId, studyPlanId: item.studyPlanId, academicYearId: item.academicYearId, semesterId: item.semesterId,
              ...(item.status === 'PENDING_REGISTRATION' ? { status: 'CONTINUING' } : {}),
            },
          });
          if (done.count !== 1) continue;
          if (item.status === 'PENDING_REGISTRATION') {
            await tx.studentDataChange.create({ data: { studentId: item.studentId, field: 'status', oldValue: 'PENDING_REGISTRATION', newValue: 'CONTINUING', changedByUserId: actingUserId } });
          }
        }
        await tx.auditLog.create({ data: {
          action: 'STUDENTS_REGISTRATION_APPROVED_AUTO', entity: 'Student', userId: actingUserId,
          details: JSON.stringify({ count: placements.length, plans: [...new Set(placements.map((item) => item.studyPlanId))], studentIds: placements.map((item) => item.studentId) }),
        } });
      });
    }
    return { dryRun: Boolean(dto.dryRun), approved: dto.dryRun ? 0 : placements.length, matched: placements.length, rows, skipped: rows.filter((row) => row.reason).map((row) => ({ studentId: row.studentId, universityId: row.universityId, reason: row.reason as string })) };
  }

  // نقل طالب إلى كلية أخرى: يتغير رمز الكلية في رقمه الجامعي (السنة الأصلية تبقى) ويبقى الرقم القديم بالسجل.
  // سجلات الطالب (تسجيلات، نتائج، عمليات) مرتبطة بمعرّفه الداخلي فلا تتأثر. خطته تُفكّ (تابعة للكلية القديمة)
  // فيعود «بانتظار اعتماد التسجيل» ويُربط بخطة الكلية الجديدة. تسجيل الدخول يتبع الرقم الجديد.
  async transferCollege(id: string, dto: TransferCollegeDto, actingUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, universityId: true, collegeId: true, advisorId: true, userId: true, createdAt: true },
    });
    if (!student) throw new NotFoundException('الطالب غير موجود.');
    if (student.collegeId === dto.collegeId) throw new BadRequestException('الطالب مسجل في هذه الكلية أصلاً.');
    const college = await this.prisma.college.findUnique({ where: { id: dto.collegeId }, select: { id: true, nameAr: true, code: true, isActive: true } });
    if (!college) throw new NotFoundException('الكلية المحددة غير موجودة.');
    if (college.isActive === false) throw new BadRequestException(`كلية «${college.nameAr}» معطّلة ولا يمكن النقل إليها.`);
    if (!college.code) throw new BadRequestException(`كلية «${college.nameAr}» ليس لها رمز. أضف رمز الكلية من شاشة الهيكل الأكاديمي أولاً.`);
    const open = await this.prisma.studentEnrollment.count({ where: { studentId: id, status: { in: ['DRAFT', 'PENDING', 'APPROVED'] } } });
    if (open > 0) throw new ConflictException('لدى الطالب تسجيل غير منتهٍ (مسودة أو قيد الموافقة أو معتمد). أنهِه أو ألغِه قبل النقل.');

    const match = /^(\d{2})\d{2}\d{3}$/.exec(student.universityId);
    const year = match ? match[1] : dto.admissionYear ? String(dto.admissionYear).slice(-2) : null;
    if (!year) throw new BadRequestException('رقم الطالب الحالي لا يتبع صيغة (سنة + كلية + تسلسل). أدخل سنة القبول لتوليد الرقم الجديد.');
    const prefix = `${year}${college.code}`;
    const [current, past] = await Promise.all([
      this.prisma.student.findMany({ where: { universityId: { startsWith: prefix } }, select: { universityId: true } }),
      this.prisma.studentNumberHistory.findMany({ where: { universityId: { startsWith: prefix } }, select: { universityId: true } }),
    ]);
    let last = 0;
    for (const item of [...current, ...past]) {
      if (item.universityId.length !== prefix.length + 3) continue;
      const suffix = Number(item.universityId.slice(prefix.length));
      if (Number.isInteger(suffix) && suffix > last) last = suffix;
    }
    if (last >= 999) throw new ConflictException('تجاوز التسلسل 999 لهذه الكلية والسنة.');
    const newNumber = `${prefix}${String(last + 1).padStart(3, '0')}`;

    const previous = await this.prisma.studentNumberHistory.findFirst({ where: { studentId: id }, orderBy: { validTo: 'desc' }, select: { validTo: true } });
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.studentNumberHistory.create({ data: {
          studentId: id, universityId: student.universityId, collegeId: student.collegeId,
          replacedByUniversityId: newNumber, reason: dto.reason?.trim() || null, changedById: actingUserId,
          validFrom: previous?.validTo ?? student.createdAt,
        } });
        await tx.student.update({ where: { id }, data: {
          universityId: newNumber, collegeId: dto.collegeId,
          departmentId: null, programId: null, studyPlanId: null, academicYearId: null, semesterId: null, advisorId: null,
        } });
        if (student.userId) {
          const account = await tx.user.findUnique({ where: { id: student.userId }, select: { email: true } });
          if (account?.email === `${student.universityId}@students.local`) {
            await tx.user.update({ where: { id: student.userId }, data: { email: `${newNumber}@students.local` } });
          }
        }
        await tx.auditLog.create({ data: {
          action: 'STUDENT_COLLEGE_TRANSFER', entity: 'Student', entityId: id, userId: actingUserId,
          details: JSON.stringify({
            oldUniversityId: student.universityId, newUniversityId: newNumber,
            fromCollegeId: student.collegeId, toCollegeId: dto.collegeId, previousAdvisorId: student.advisorId, reason: dto.reason?.trim() || null,
          }),
        } });
      });
    } catch (error) { return this.rethrowDuplicate(error); }
    return { universityId: newNumber, previousUniversityId: student.universityId, college: college.nameAr };
  }

  // مرحلة التجريب فقط: يُفعَّل بالإعداد ALLOW_TEST_DELETE=true على السيرفر، ويُغلَق بإزالته.
  static bulkDeleteEnabled() {
    return process.env.ALLOW_TEST_DELETE === 'true';
  }

  // حذف جماعي لطلاب التجربة مع كل بياناتهم (تسجيلات، نتائج، موافقات، رسائل، حساب الطالب وتذاكره).
  // الحذف النهائي ممنوع عادةً بقاعدة البيانات؛ هنا يُسمح به داخل هذه العملية فقط، وتُسجَّل بسجل العمليات.
  async bulkDelete(dto: BulkDeleteStudentsDto, actingUserId: string) {
    if (!StudentsService.bulkDeleteEnabled()) {
      throw new ForbiddenException('الحذف الجماعي مغلق. يُفعَّل لمرحلة التجريب فقط من إعدادات السيرفر.');
    }
    if (dto.confirm.trim() !== 'حذف') throw new BadRequestException('اكتب كلمة «حذف» للتأكيد.');
    const ids = [...new Set(dto.studentIds)];
    const students = await this.prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, universityId: true, userId: true } });
    if (!students.length) throw new NotFoundException('لم يُعثر على أي من الطلاب المحددين.');
    const foundIds = students.map((student) => student.id);
    const userIds = students.map((student) => student.userId).filter((value): value is string => Boolean(value));

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.allow_hard_delete', 'on', true)`;
      // المقاعد المحجوزة تعود للشعب
      const seats = await tx.enrollmentItem.groupBy({
        by: ['sectionId'], where: { status: 'ACTIVE', enrollment: { studentId: { in: foundIds } } }, _count: { _all: true },
      });
      for (const seat of seats) {
        await tx.courseSection.update({ where: { id: seat.sectionId }, data: { enrolledCount: { decrement: seat._count._all } } });
      }
      if (userIds.length) await tx.supportTicket.deleteMany({ where: { authorId: { in: userIds } } });
      await tx.courseResult.deleteMany({ where: { studentId: { in: foundIds } } });
      await tx.studentEnrollment.deleteMany({ where: { studentId: { in: foundIds } } });
      await tx.studentNumberHistory.deleteMany({ where: { studentId: { in: foundIds } } });
      await tx.student.deleteMany({ where: { id: { in: foundIds } } });
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds }, role: { code: 'STUDENT' } } });
      await tx.auditLog.create({ data: {
        action: 'TEST_PHASE_BULK_DELETE_STUDENTS', entity: 'Student', userId: actingUserId,
        details: JSON.stringify({ count: foundIds.length, universityIds: students.map((student) => student.universityId).slice(0, 200) }),
      } });
    });
    return { deleted: foundIds.length };
  }

  private rethrowDuplicate(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const target = 'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta
        ? String(error.meta.target)
        : '';
      if (target.toLowerCase().includes('nationalid')) throw new ConflictException('الرقم الوطني مسجل لطالب آخر.');
      if (target.toLowerCase().includes('universityid')) throw new ConflictException('الرقم الجامعي مسجل لطالب آخر.');
      throw new ConflictException('توجد بيانات مكررة لهذا الطالب.');
    }
    throw error;
  }

  private async ensureUniqueNationalId(nationalId: string | null, excludeStudentId?: string) {
    if (!nationalId) return;
    const existing = await this.prisma.student.findFirst({
      where: { nationalId: { in: digitVariants(nationalId) }, ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException('الرقم الوطني مسجل لطالب آخر.');
  }

  async create(data: StudentInputDto, actingUserId: string) {
    const normalized = this.normalize(data);
    await this.validateStructure(data);
    await this.ensureUniqueNationalId(normalized.nationalId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        // الطالب الجديد يبدأ «قيد استكمال التسجيل» (حالته لا تتغير من نموذج التعديل بل من «تغيير الحالة»).
        const student = await tx.student.create({ data: { ...normalized, status: parseStudentStatus(data.status) ?? 'PENDING_REGISTRATION' } });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_CREATED', entity: 'Student', entityId: student.id,
          userId: actingUserId, details: JSON.stringify({ universityId: student.universityId }),
        } });
        return student;
      });
    } catch (error) { return this.rethrowDuplicate(error); }
  }

  async update(id: string, data: StudentInputDto, actingUserId: string) {
    const normalized = this.normalize(data);
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');
    await this.validateStructure(data, existing);
    await this.ensureUniqueNationalId(normalized.nationalId, id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const student = await tx.student.update({ where: { id }, data: normalized });
        // Who changed which field, from what to what (shown in the affairs student file).
        const asText = (value: unknown) => (value === null || value === undefined || value === '' ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value));
        const changes = Object.keys(normalized)
          .filter((key) => asText(existing[key as keyof typeof existing]) !== asText(student[key as keyof typeof student]))
          .map((key) => ({ studentId: id, field: key, oldValue: asText(existing[key as keyof typeof existing]), newValue: asText(student[key as keyof typeof student]), changedByUserId: actingUserId }));
        if (changes.length > 0) await tx.studentDataChange.createMany({ data: changes });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_UPDATED', entity: 'Student', entityId: id,
          userId: actingUserId,
          details: JSON.stringify({
            universityId: student.universityId,
            changedFields: Object.keys(normalized).filter((key) =>
              String(existing[key as keyof typeof existing] ?? '') !== String(student[key as keyof typeof student] ?? ''),
            ),
          }),
        } });
        return student;
      });
    } catch (error) { return this.rethrowDuplicate(error); }
  }


  async findMe(userId: string) {
    await this.returnDueDeferred().catch(() => 0);
    const student =
      await this.prisma.student.findUnique({
        where: {
          userId,
        },

        include: {
          enrollments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!student) {
      throw new NotFoundException(
        'No student profile is linked to this user account',
      );
    }

    return student;
  }

  async getMyAcademicStatus(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        universityId: true,
        studyPlanId: true,
        academicYearId: true,
      },
    });

    if (!student) throw new NotFoundException('No student profile is linked to this user account');
    if (!student.studyPlanId) throw new BadRequestException('الطالب غير مرتبط بخطة دراسية. راجع الإدارة.');
    if (!student.academicYearId) throw new BadRequestException('السنة الدراسية للطالب غير محددة. راجع الإدارة.');

    const [studyPlan, academicYear, results, enrollments] = await Promise.all([
      this.prisma.studyPlan.findUnique({
        where: { id: student.studyPlanId },
        select: {
          nameAr: true,
          planCourses: {
            include: { course: true, academicYear: true, semester: true },
            orderBy: [
              { academicYear: { levelNumber: 'asc' } },
              { semester: { semesterNumber: 'asc' } },
              { priority: 'asc' },
            ],
          },
        },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: student.academicYearId },
        select: { id: true, studyPlanId: true, levelNumber: true, nameAr: true },
      }),
      this.prisma.courseResult.findMany({
        where: { studentId: student.id },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { courseId: true, score: true, gradeLabel: true, passed: true, semester: { select: { nameAr: true } } },
      }),
      this.prisma.studentEnrollment.findMany({
        where: { studentId: student.id },
        select: { status: true, items: { where: { status: 'ACTIVE' }, select: { courseId: true } } },
      }),
    ]);
    if (!studyPlan) throw new BadRequestException('الخطة الدراسية للطالب غير موجودة. راجع الإدارة.');
    if (!academicYear || academicYear.studyPlanId !== student.studyPlanId) throw new BadRequestException('السنة الدراسية للطالب غير صحيحة. راجع الإدارة.');

    const latestResultByCourse = new Map<string, typeof results[number]>();
    for (const result of results) {
      if (!latestResultByCourse.has(result.courseId)) latestResultByCourse.set(result.courseId, result);
    }
    const enrolledCourseIds = new Set(
      enrollments
        .filter((enrollment) => ['DRAFT', 'PENDING', 'APPROVED', 'CONFIRMED'].includes(enrollment.status))
        .flatMap((enrollment) => enrollment.items.map((item) => item.courseId)),
    );

    return {
      student: { universityId: student.universityId, currentLevel: academicYear.nameAr },
      studyPlan: studyPlan.nameAr,
      courses: studyPlan.planCourses.map((planCourse) => {
        const result = latestResultByCourse.get(planCourse.courseId);
        const status = result?.passed
          ? 'PASSED'
          : enrolledCourseIds.has(planCourse.courseId)
            ? 'REGISTERED'
            : result
              ? 'FAILED'
              : planCourse.academicYear.levelNumber > academicYear.levelNumber
                ? 'FUTURE'
                : 'NOT_TAKEN';
        return {
          id: planCourse.id,
          courseId: planCourse.courseId,
          code: planCourse.course.code,
          nameAr: planCourse.course.nameAr,
          nameEn: planCourse.course.nameEn,
          credits: planCourse.course.credits,
          academicYear: planCourse.academicYear.nameAr,
          levelNumber: planCourse.academicYear.levelNumber,
          semester: planCourse.semester.nameAr,
          status,
          gradeLabel: result?.gradeLabel ?? null,
          score: result?.score === undefined ? null : Number(result.score),
          resultSemester: result?.semester.nameAr ?? null,
        };
      }),
    };
  }

  async findAll(
    options: FindStudentsOptions = {},
  ) {
    const search =
      options.search?.trim();

    const status =
      options.status?.trim();
    const accountStatus = options.accountStatus?.trim();
    await this.returnDueDeferred().catch(() => 0);

    return this.prisma.student.findMany({
      where: {
        ...(status
          ? {
              status,
            }
          : {}),

        ...(accountStatus === 'NO_ACCOUNT' ? { userId: null } : {}),
        ...(accountStatus === 'HAS_ACCOUNT' ? { userId: { not: null } } : {}),
        ...(accountStatus === 'PENDING_VERIFICATION' ? { user: { is: { status: 'PENDING_VERIFICATION' } } } : {}),

        ...(search
          ? {
              OR: [
                {
                  universityId: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                // الأرقام الجامعية السابقة (بعد النقل بين الكليات)
                {
                  numberHistory: {
                    some: { universityId: { contains: search, mode: 'insensitive' } },
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  middleName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  familyName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  englishName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  universityEmail: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        numberHistory: { select: { universityId: true, validTo: true } },
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            lastLoginAt: true,
            role: {
              select: {
                code: true,
              },
            },
          },
        },

        enrollments: {
          orderBy: {
            createdAt: 'desc',
          },

          take: 1,

          select: {
            id: true,
            semesterId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },

      orderBy: [
        {
          firstName: 'asc',
        },
        {
          familyName: 'asc',
        },
      ],
    });
  }

  async findById(id: string) {
    const student =
      await this.prisma.student.findUnique({
        where: {
          id,
        },

        include: {
          numberHistory: { orderBy: { validTo: 'desc' } },
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              role: {
                select: {
                  code: true,
                },
              },
            },
          },

          enrollments: {
            include: {
              items: {
                where: { status: 'ACTIVE' },
                include: {
                  course: true,

                  section: {
                    include: {
                      teacher: true,
                      classroom: true,
                      schedules: true,
                    },
                  },
                },
              },

              approvals: true,
            },

            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!student) {
      throw new NotFoundException(
        'Student not found',
      );
    }

    return student;
  }
}
