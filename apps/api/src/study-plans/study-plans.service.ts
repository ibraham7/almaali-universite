import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { getAdvisorAllowedProgramIds } from '../advisors/advisor-scope.js';
import { assertSelectable } from '../academic-structure/active-structure.js';
import { assertPlanEditable, planLabel } from './plan-status.js';

@Injectable()
export class StudyPlansService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async assignedProgramIds(actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return null;
    return getAdvisorAllowedProgramIds(this.prisma, actor.id);
  }

  private async assertProgramAccess(programId: string, actor: { id: string; role: string }) {
    const allowed = await this.assignedProgramIds(actor);
    if (allowed && !allowed.includes(programId)) {
      throw new ForbiddenException('لا تملك صلاحية إدارة هذا الاختصاص.');
    }
  }

  private async assertPlanAccess(id: string, actor: { id: string; role: string }) {
    const plan = await this.prisma.studyPlan.findUnique({ where: { id }, select: { id: true, programId: true } });
    if (!plan) throw new NotFoundException('الخطة الدراسية غير موجودة');
    await this.assertProgramAccess(plan.programId, actor);
    return plan;
  }

  async create(data: {
    programId: string;
    nameAr: string;
    nameEn?: string;
    cohortYear?: number | null;
    effectiveFrom?: string | null;
    graduationCredits?: number | null;
  }, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertProgramAccess(data.programId, actor);
    await assertSelectable(this.prisma, { programId: data.programId });
    const cohortYear = this.parseCohort(data.cohortYear);
    const effectiveFrom = this.parseDate(data.effectiveFrom);
    // الخطة الجديدة تُنشأ مسودة (إصدار 1) ولا تُستعمل لربط الطلاب إلا بعد الاعتماد.
    return this.prisma.studyPlan.create({
      data: {
        programId: data.programId,
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim(),
        status: 'DRAFT',
        cohortYear,
        effectiveFrom,
        ...(typeof data.graduationCredits === 'number' ? { graduationCredits: data.graduationCredits } : {}),
      },
    });
  }

  private parseCohort(value?: number | null) {
    if (value === undefined || value === null) return null;
    if (!Number.isInteger(value) || value < 2000 || value > 2100) throw new BadRequestException('الدفعة: أدخل سنة القبول (مثل 2026).');
    return value;
  }

  private parseDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('تاريخ بدء التطبيق غير صالح.');
    return date;
  }

  // تعديل بيانات الخطة: للمسودة فقط. المعتمدة مقفلة (إصدار جديد بدل التعديل).
  async update(
    id: string,
    data: {
      nameAr?: string;
      nameEn?: string;
      cohortYear?: number | null;
      effectiveFrom?: string | null;
      graduationCredits?: number | null;
    },
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    await this.assertPlanAccess(id, actor);
    await assertPlanEditable(this.prisma, id);

    return this.prisma.studyPlan.update({
      where: { id },

      data: {
        ...(data.nameAr !== undefined ? { nameAr: data.nameAr.trim() } : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn.trim() || null } : {}),
        ...(data.cohortYear !== undefined ? { cohortYear: this.parseCohort(data.cohortYear) } : {}),
        ...(data.effectiveFrom !== undefined ? { effectiveFrom: this.parseDate(data.effectiveFrom) } : {}),
        ...(data.graduationCredits !== undefined ? { graduationCredits: data.graduationCredits } : {}),
      },
    });
  }

  // اعتماد المسودة: تصبح مقفلة ويستبدل بها إصدارها السابق (يبقى محفوظًا وطلابه عليه).
  async approve(id: string, actor: { id: string; role: string }) {
    await this.assertPlanAccess(id, actor);
    const plan = await this.prisma.studyPlan.findUnique({
      where: { id },
      include: { academicYears: { select: { id: true, nameAr: true, _count: { select: { semesters: true } } } }, _count: { select: { planCourses: { where: { status: 'ACTIVE' } } } } },
    });
    if (!plan) throw new NotFoundException('الخطة الدراسية غير موجودة');
    if (plan.status !== 'DRAFT') throw new BadRequestException('هذه الخطة معتمدة أصلاً.');
    const problems: string[] = [];
    if (plan.academicYears.length === 0) problems.push('أضف مستوى واحدًا على الأقل');
    for (const level of plan.academicYears) if (level._count.semesters === 0) problems.push(`المستوى «${level.nameAr}» بلا فصول`);
    if (plan._count.planCourses === 0) problems.push('أضف مقررًا واحدًا على الأقل');
    if (problems.length) throw new BadRequestException(`لا يمكن اعتماد الخطة: ${problems.join('، ')}.`);
    if (plan.cohortYear) {
      const clash = await this.prisma.studyPlan.findFirst({ where: { programId: plan.programId, cohortYear: plan.cohortYear, status: 'APPROVED', planKey: { not: plan.planKey } }, select: { nameAr: true, versionNumber: true } });
      if (clash) throw new ConflictException(`لهذا البرنامج خطة معتمدة أخرى لدفعة ${plan.cohortYear}: «${clash.nameAr}» (إصدار ${clash.versionNumber}). غيّر الدفعة أو أرشف تلك الخطة بإصدار جديد.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.studyPlan.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'APPROVED', approvedAt: new Date(), approvedById: actor.id || null } });
      if (approved.count !== 1) throw new ConflictException('تغيّرت حالة الخطة. حدّث الصفحة وأعد المحاولة.');
      await tx.studyPlan.updateMany({ where: { planKey: plan.planKey, status: 'APPROVED', id: { not: id } }, data: { status: 'SUPERSEDED' } });
      await tx.auditLog.create({ data: { action: 'STUDY_PLAN_APPROVED', entity: 'StudyPlan', entityId: id, userId: actor.id || null, details: JSON.stringify({ plan: planLabel(plan) }) } });
      return tx.studyPlan.findUniqueOrThrow({ where: { id } });
    });
  }

  // إصدار جديد: نسخة كاملة (مستويات، فصول، مقررات المنهاج) كمسودة. الإصدار الحالي لا يُلمس.
  async createVersion(id: string, actor: { id: string; role: string }) {
    await this.assertPlanAccess(id, actor);
    const source = await this.prisma.studyPlan.findUnique({
      where: { id },
      include: {
        academicYears: { include: { semesters: true } },
        planCourses: { where: { status: 'ACTIVE' } },
        curriculumEntries: true,
        curriculumQuotas: true,
      },
    });
    if (!source) throw new NotFoundException('الخطة الدراسية غير موجودة');
    if (source.status !== 'APPROVED') throw new BadRequestException(source.status === 'DRAFT' ? 'هذه مسودة: عدّلها مباشرة ثم اعتمدها.' : 'أنشئ الإصدار الجديد من الإصدار المعتمد الحالي لهذه الخطة.');
    const open = await this.prisma.studyPlan.findFirst({ where: { planKey: source.planKey, status: 'DRAFT' }, select: { versionNumber: true } });
    if (open) throw new ConflictException(`يوجد مسودة (إصدار ${open.versionNumber}) لهذه الخطة. أكملها أو اعتمدها أولاً.`);
    const last = await this.prisma.studyPlan.findFirst({ where: { planKey: source.planKey }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true } });
    const versionNumber = (last?.versionNumber ?? source.versionNumber) + 1;

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.studyPlan.create({
        data: {
          programId: source.programId, nameAr: source.nameAr, nameEn: source.nameEn, graduationCredits: source.graduationCredits,
          status: 'DRAFT', planKey: source.planKey, versionNumber, previousVersionId: source.id, cohortYear: source.cohortYear, effectiveFrom: null,
        },
      });
      const levelIds = new Map<string, string>();
      const semesterIds = new Map<string, string>();
      for (const level of source.academicYears) {
        const created = await tx.academicYear.create({ data: { studyPlanId: plan.id, nameAr: level.nameAr, nameEn: level.nameEn, levelNumber: level.levelNumber } });
        levelIds.set(level.id, created.id);
        for (const semester of level.semesters) {
          const copy = await tx.semester.create({ data: { academicYearId: created.id, nameAr: semester.nameAr, nameEn: semester.nameEn, semesterNumber: semester.semesterNumber, requireMandatoryCourses: semester.requireMandatoryCourses, isActive: semester.isActive } });
          semesterIds.set(semester.id, copy.id);
        }
      }
      for (const row of source.planCourses) {
        await tx.studyPlanCourse.create({ data: {
          studyPlanId: plan.id, academicYearId: levelIds.get(row.academicYearId)!, semesterId: semesterIds.get(row.semesterId)!,
          courseId: row.courseId, priority: row.priority, requirement: row.requirement,
        } });
      }
      for (const entry of source.curriculumEntries) {
        await tx.studyPlanCurriculumCourse.create({ data: { studyPlanId: plan.id, courseId: entry.courseId, category: entry.category, requirement: entry.requirement, sourceFile: entry.sourceFile, sourceRow: entry.sourceRow } });
      }
      for (const quota of source.curriculumQuotas) {
        await tx.studyPlanCurriculumQuota.create({ data: { studyPlanId: plan.id, category: quota.category, requirement: quota.requirement, requiredCredits: quota.requiredCredits, offeredPoolCredits: quota.offeredPoolCredits } });
      }
      await tx.auditLog.create({ data: { action: 'STUDY_PLAN_VERSION_CREATED', entity: 'StudyPlan', entityId: plan.id, userId: actor.id || null, details: JSON.stringify({ from: source.id, plan: planLabel({ ...source, versionNumber }) }) } });
      return plan;
    });
  }

  // الخطة المناسبة لطالب جديد: آخر إصدار معتمد لدفعته، وإلا الخطة العامة (بلا دفعة) للبرنامج.
  async suggestForAdmission(programId: string, admissionYear?: number) {
    const plans = await this.prisma.studyPlan.findMany({ where: { programId, status: 'APPROVED' }, orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }] });
    const exact = admissionYear ? plans.find((plan) => plan.cohortYear === admissionYear) : undefined;
    return exact ?? plans.find((plan) => plan.cohortYear === null) ?? null;
  }

  async findAll(actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const allowed = await this.assignedProgramIds(actor);
    const plans = await this.prisma.studyPlan.findMany({
      ...(allowed ? { where: { programId: { in: allowed } } } : {}),
      include: {
        program: {
          select: {
            nameAr: true,
            college: { select: { nameAr: true } },
            department: { select: { nameAr: true, college: { select: { nameAr: true } } } },
          },
        },
        _count: { select: { planCourses: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const students = await this.prisma.student.groupBy({ by: ['studyPlanId'], where: { studyPlanId: { in: plans.map((plan) => plan.id) } }, _count: { _all: true } });
    const byPlan = new Map(students.map((row) => [row.studyPlanId, row._count._all]));
    return plans.map(({ _count, ...plan }) => ({ ...plan, coursesCount: _count.planCourses, studentsCount: byPlan.get(plan.id) ?? 0 }));
  }

  async findById(id: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertPlanAccess(id, actor);
    return this.prisma.studyPlan.findUnique({ where: { id } });
  }

  async findByProgram(
    programId: string,
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    await this.assertProgramAccess(programId, actor);
    return this.prisma.studyPlan.findMany({
      where: {
        programId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
