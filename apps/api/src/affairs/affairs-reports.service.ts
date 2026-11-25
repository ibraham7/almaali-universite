import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AffairsUser } from './affairs.service.js';
import { OPEN_STATUSES } from './affairs.rules.js';
import { canManage } from './affairs-access.js';
import { ReportFiltersDto, RunReportDto } from './dto/affairs.dto.js';
import {
  CATALOG, CHANNEL_AR, MODE_AR, OUTCOME_AR, STATUS_AR, TARGET_AR, checkSelection, dayOf, dayRange, daysBetween, monthOf, sourceOf, toCsv,
} from './affairs-reports.catalog.js';

const MAX_ROWS = 10000;
const SHOWN_ROWS = 500;
const SERIES_LIMIT = 50000;

export const DEFINITIONS = {
  total: 'عدد الطلبات التي قُدّمت ضمن الفترة المختارة (حسب تاريخ التقديم)، بعد تطبيق المرشحات.',
  open: 'الطلبات غير المغلقة: جديد، مسند، قيد المراجعة، بانتظار استكمال، بانتظار جهة أخرى، أو مقبول.',
  completed: 'الطلبات بحالة «مكتمل».',
  rejected: 'الطلبات بحالة «مرفوض».',
  cancelled: 'الطلبات بحالة «ملغى». لا تُحتسب ضمن الطلبات المفتوحة.',
  overdue: 'طلبات مفتوحة تجاوزت «الموعد المتوقع» المحسوب من مدة الخدمة عند التقديم.',
  avgDays: 'متوسط الأيام بين تاريخ التقديم وتاريخ الإغلاق للطلبات «المكتملة» فقط. الطلبات المرفوضة والملغاة لا تدخل في المتوسط.',
  workload: 'لكل موظف: طلباته المفتوحة الآن، وما أنجزه أو رفضه ضمن الفترة. مدير النظام يرى كل الموظفين، والموظف يرى نفسه فقط.',
  documents: 'الوثائق حسب تاريخ الإصدار ضمن الفترة، بحالتها الحالية (نشطة أو ملغاة).',
  referrals: 'الإحالات حسب تاريخ إرسالها ضمن الفترة، بحالتها الحالية.',
  source: 'المصدر: جداول طلبات شؤون الطلاب والوثائق والإحالات في النظام، وتُحسب الأرقام عند فتح الصفحة.',
};

function studentName(s: { fullName: string | null; firstName: string; middleName: string | null; familyName: string }) {
  return s.fullName || [s.firstName, s.middleName, s.familyName].filter(Boolean).join(' ');
}

function staffName(user: { displayName: string | null; username: string | null; email: string } | undefined) {
  return user ? user.displayName || user.username || user.email : 'غير مسند';
}

@Injectable()
export class AffairsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(user: AffairsUser) {
    const isAdmin = await canManage(this.prisma, user);
    return CATALOG.map((s) => ({
      ...s, columns: s.columns.filter((c) => !c.adminOnly || isAdmin), dimensions: s.dimensions.filter((d) => !d.adminOnly || isAdmin),
    }));
  }

  private requestWhere(f: ReportFiltersDto, seeAll: boolean) {
    const where: Record<string, unknown> = {};
    const created = dayRange(f.from, f.to);
    if (created) where.createdAt = created;
    if (f.serviceId) where.serviceId = f.serviceId;
    if (f.channel) where.channel = f.channel;
    if (f.collegeId) where.student = { collegeId: f.collegeId };
    if (f.staffId && seeAll) where.assignedStaffId = f.staffId;
    return where;
  }

  // ---------- overview (all aggregation happens here, in the database or in this method) ----------
  async overview(f: ReportFiltersDto, user: AffairsUser) {
    const isAdmin = await canManage(this.prisma, user);
    const where = this.requestWhere(f, isAdmin);
    const now = new Date();

    const [grouped, channels, overdue, completedRows, createdRows, services, staffRows] = await Promise.all([
      this.prisma.studentRequest.groupBy({ by: ['serviceId', 'status'], where, _count: { _all: true } }),
      this.prisma.studentRequest.groupBy({ by: ['channel'], where, _count: { _all: true } }),
      this.prisma.studentRequest.count({ where: { AND: [where, { status: { in: OPEN_STATUSES }, dueAt: { lt: now } }] } }),
      this.prisma.studentRequest.findMany({ where: { AND: [where, { status: 'COMPLETED', closedAt: { not: null } }] }, select: { serviceId: true, assignedStaffId: true, createdAt: true, closedAt: true }, take: SERIES_LIMIT }),
      this.prisma.studentRequest.findMany({ where, select: { createdAt: true }, orderBy: { createdAt: 'asc' }, take: SERIES_LIMIT }),
      this.prisma.affairsService.findMany({ select: { id: true, nameAr: true } }),
      this.prisma.studentRequest.groupBy({ by: ['assignedStaffId', 'status'], where: { AND: [where, { assignedStaffId: { not: null } }] }, _count: { _all: true } }),
    ]);

    const serviceName = new Map(services.map((s) => [s.id, s.nameAr]));
    const isOpen = (s: string) => OPEN_STATUSES.includes(s as never);

    const byServiceMap = new Map<string, { serviceId: string; name: string; total: number; open: number; completed: number; rejected: number; cancelled: number; avgDays: number | null }>();
    const byStatusMap = new Map<string, number>();
    const totals = { total: 0, open: 0, completed: 0, rejected: 0, cancelled: 0, overdue };
    for (const g of grouped) {
      const n = g._count._all;
      const row = byServiceMap.get(g.serviceId) ?? { serviceId: g.serviceId, name: serviceName.get(g.serviceId) ?? '—', total: 0, open: 0, completed: 0, rejected: 0, cancelled: 0, avgDays: null };
      row.total += n; totals.total += n;
      if (isOpen(g.status)) { row.open += n; totals.open += n; }
      if (g.status === 'COMPLETED') { row.completed += n; totals.completed += n; }
      if (g.status === 'REJECTED') { row.rejected += n; totals.rejected += n; }
      if (g.status === 'CANCELLED') { row.cancelled += n; totals.cancelled += n; }
      byServiceMap.set(g.serviceId, row);
      byStatusMap.set(g.status, (byStatusMap.get(g.status) ?? 0) + n);
    }

    // average processing time (completed only), per service and per staff member
    const svcDays = new Map<string, number[]>();
    const staffDays = new Map<string, number[]>();
    const allDays: number[] = [];
    for (const r of completedRows) {
      const d = daysBetween(r.createdAt, r.closedAt as Date);
      allDays.push(d);
      svcDays.set(r.serviceId, [...(svcDays.get(r.serviceId) ?? []), d]);
      if (r.assignedStaffId) staffDays.set(r.assignedStaffId, [...(staffDays.get(r.assignedStaffId) ?? []), d]);
    }
    const avg = (list: number[] | undefined) => (list && list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null);
    for (const row of byServiceMap.values()) row.avgDays = avg(svcDays.get(row.serviceId));

    // created-per-period series: days when the range is short, months otherwise
    const first = createdRows[0]?.createdAt;
    const spanDays = first ? daysBetween(first, createdRows[createdRows.length - 1].createdAt) : 0;
    const monthly = spanDays > 92;
    const series = new Map<string, number>();
    for (const r of createdRows) {
      const key = monthly ? monthOf(r.createdAt) : dayOf(r.createdAt);
      series.set(key, (series.get(key) ?? 0) + 1);
    }

    // workload per staff member (a registrar sees only their own row)
    const staffIds = [...new Set(staffRows.map((r) => r.assignedStaffId).filter((x): x is string => !!x))];
    const staff = staffIds.length ? await this.prisma.affairsStaff.findMany({ where: { id: { in: staffIds } }, select: { id: true, userId: true, user: { select: { displayName: true, username: true, email: true } } } }) : [];
    const workload = staff
      .filter((s) => isAdmin || s.userId === user.id)
      .map((s) => {
        const mine = staffRows.filter((r) => r.assignedStaffId === s.id);
        const count = (pred: (st: string) => boolean) => mine.filter((r) => pred(r.status)).reduce((a, r) => a + r._count._all, 0);
        return { staffId: s.id, name: staffName(s.user), open: count(isOpen), completed: count((st) => st === 'COMPLETED'), rejected: count((st) => st === 'REJECTED'), avgDays: avg(staffDays.get(s.id)) };
      })
      .sort((a, b) => b.open - a.open);

    // documents and referrals in the same period
    const issued = dayRange(f.from, f.to);
    const docWhere: Record<string, unknown> = {};
    if (issued) docWhere.issuedAt = issued;
    if (f.collegeId) docWhere.student = { collegeId: f.collegeId };
    const refWhere: Record<string, unknown> = {};
    if (issued) refWhere.createdAt = issued;
    const reqFilter: Record<string, unknown> = {};
    if (f.serviceId) reqFilter.serviceId = f.serviceId;
    if (f.collegeId) reqFilter.student = { collegeId: f.collegeId };
    if (Object.keys(reqFilter).length) refWhere.request = reqFilter;
    const [docGroups, docTypes, refGroups] = await Promise.all([
      this.prisma.issuedDocument.groupBy({ by: ['typeId', 'status'], where: docWhere, _count: { _all: true } }),
      this.prisma.documentType.findMany({ select: { id: true, nameAr: true } }),
      this.prisma.requestReferral.groupBy({ by: ['target', 'status'], where: refWhere, _count: { _all: true } }),
    ]);
    const typeName = new Map(docTypes.map((t) => [t.id, t.nameAr]));
    const docByType = new Map<string, { type: string; issued: number; revoked: number }>();
    for (const g of docGroups) {
      const row = docByType.get(g.typeId) ?? { type: typeName.get(g.typeId) ?? '—', issued: 0, revoked: 0 };
      if (g.status === 'ACTIVE') row.issued += g._count._all; else row.revoked += g._count._all;
      docByType.set(g.typeId, row);
    }
    const refTotals = { total: 0, pending: 0, answered: 0, cancelled: 0 };
    const refByTarget = new Map<string, number>();
    for (const g of refGroups) {
      const n = g._count._all;
      refTotals.total += n;
      if (g.status === 'PENDING') refTotals.pending += n; else if (g.status === 'ANSWERED') refTotals.answered += n; else refTotals.cancelled += n;
      refByTarget.set(g.target, (refByTarget.get(g.target) ?? 0) + n);
    }

    return {
      period: { from: f.from ?? null, to: f.to ?? null },
      scope: { canSeeAll: isAdmin },
      totals: { ...totals, avgDays: avg(allDays) },
      byService: [...byServiceMap.values()].sort((a, b) => b.total - a.total),
      byStatus: [...byStatusMap.entries()].map(([status, count]) => ({ status, label: STATUS_AR[status] ?? status, count })).sort((a, b) => b.count - a.count),
      byChannel: channels.map((c) => ({ channel: c.channel, label: CHANNEL_AR[c.channel], count: c._count._all })),
      series: { granularity: monthly ? 'month' : 'day', points: [...series.entries()].map(([date, count]) => ({ date, count })) },
      staffWorkload: workload,
      documents: { issued: [...docByType.values()].reduce((a, d) => a + d.issued, 0), revoked: [...docByType.values()].reduce((a, d) => a + d.revoked, 0), byType: [...docByType.values()] },
      referrals: { ...refTotals, byTarget: [...refByTarget.entries()].map(([target, count]) => ({ target, label: TARGET_AR[target], count })) },
      truncated: createdRows.length >= SERIES_LIMIT || completedRows.length >= SERIES_LIMIT,
      definitions: DEFINITIONS,
      generatedAt: now.toISOString(),
    };
  }

  // ---------- builder ----------
  private async fetchRows(body: RunReportDto, isAdmin: boolean) {
    const f = body.filters ?? {};
    const range = dayRange(f.from, f.to);
    const status = f.status && sourceOf(body.source)?.statuses.includes(f.status) ? f.status : undefined;
    if (f.status && !status) throw new BadRequestException('الحالة المختارة لا تناسب هذا المصدر.');
    type Row = { cells: Record<string, string | number>; keys: Record<string, string>; days?: number };
    const rows: Row[] = [];
    const date = (d: Date | null | undefined) => (d ? dayOf(d) : '');

    if (body.source === 'requests') {
      const where: Record<string, unknown> = {};
      if (range) where.createdAt = range;
      if (status) where.status = status;
      if (f.serviceId) where.serviceId = f.serviceId;
      if (f.channel) where.channel = f.channel;
      const data = await this.prisma.studentRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, take: MAX_ROWS,
        include: {
          student: { select: { universityId: true, fullName: true, firstName: true, middleName: true, familyName: true, collegeId: true } },
          service: { select: { nameAr: true } },
          assignedStaff: { select: { user: { select: { displayName: true, username: true, email: true } } } },
        },
      });
      const collegeIds = [...new Set(data.map((r) => r.student.collegeId).filter((x): x is string => !!x))];
      const colleges = collegeIds.length ? await this.prisma.college.findMany({ where: { id: { in: collegeIds } }, select: { id: true, nameAr: true } }) : [];
      const collegeName = new Map(colleges.map((c) => [c.id, c.nameAr]));
      for (const r of data) {
        const days = r.status === 'COMPLETED' && r.closedAt ? daysBetween(r.createdAt, r.closedAt) : undefined;
        rows.push({
          days,
          cells: {
            number: r.number, student: studentName(r.student), universityId: r.student.universityId, service: r.service.nameAr, status: STATUS_AR[r.status], channel: CHANNEL_AR[r.channel],
            staff: isAdmin ? staffName(r.assignedStaff?.user) : '', createdAt: date(r.createdAt), dueAt: date(r.dueAt), closedAt: date(r.closedAt), days: days ?? '',
          },
          keys: { service: r.service.nameAr, status: STATUS_AR[r.status], channel: CHANNEL_AR[r.channel], staff: staffName(r.assignedStaff?.user), month: monthOf(r.createdAt), college: r.student.collegeId ? collegeName.get(r.student.collegeId) ?? 'غير محدد' : 'غير محدد' },
        });
      }
    } else if (body.source === 'documents') {
      const where: Record<string, unknown> = {};
      if (range) where.issuedAt = range;
      if (status) where.status = status;
      const data = await this.prisma.issuedDocument.findMany({
        where, orderBy: { issuedAt: 'desc' }, take: MAX_ROWS,
        include: { type: { select: { nameAr: true } }, student: { select: { universityId: true, fullName: true, firstName: true, middleName: true, familyName: true } } },
      });
      for (const d of data) {
        rows.push({
          cells: { number: d.number, type: d.type.nameAr, student: studentName(d.student), universityId: d.student.universityId, status: STATUS_AR[d.status], issuedAt: date(d.issuedAt), revokedAt: date(d.revokedAt) },
          keys: { type: d.type.nameAr, status: STATUS_AR[d.status], month: monthOf(d.issuedAt) },
        });
      }
    } else {
      const where: Record<string, unknown> = {};
      if (range) where.createdAt = range;
      if (status) where.status = status;
      const data = await this.prisma.requestReferral.findMany({ where, orderBy: { createdAt: 'desc' }, take: MAX_ROWS, include: { request: { select: { number: true } } } });
      for (const r of data) {
        rows.push({
          cells: { request: r.request.number, target: r.targetName ? `${TARGET_AR[r.target]} (${r.targetName})` : TARGET_AR[r.target], mode: MODE_AR[r.mode], status: STATUS_AR[r.status], outcome: r.outcome ? OUTCOME_AR[r.outcome] : '', createdAt: date(r.createdAt), respondedAt: date(r.respondedAt) },
          keys: { target: TARGET_AR[r.target], mode: MODE_AR[r.mode], status: STATUS_AR[r.status], month: monthOf(r.createdAt) },
        });
      }
    }
    return { rows, truncated: rows.length >= MAX_ROWS };
  }

  async run(body: RunReportDto, user: AffairsUser, limit = SHOWN_ROWS) {
    const isAdmin = await canManage(this.prisma, user);
    const problem = checkSelection(body.source, body.columns ?? [], body.groupBy, isAdmin);
    if (problem) {
      if (problem.includes('لمدير النظام فقط')) throw new ForbiddenException(problem);
      throw new BadRequestException(problem);
    }
    const source = sourceOf(body.source)!;
    const { rows, truncated } = await this.fetchRows(body, isAdmin);

    if (body.groupBy) {
      const dim = source.dimensions.find((d) => d.id === body.groupBy)!;
      const groups = new Map<string, { label: string; count: number; days: number[] }>();
      for (const r of rows) {
        const label = r.keys[body.groupBy] || '—';
        const g = groups.get(label) ?? { label, count: 0, days: [] };
        g.count += 1;
        if (r.days !== undefined) g.days.push(r.days);
        groups.set(label, g);
      }
      const withAvg = body.source === 'requests';
      const list = [...groups.values()].sort((a, b) => (body.groupBy === 'month' ? a.label.localeCompare(b.label) : b.count - a.count));
      return {
        source: body.source, groupBy: body.groupBy, truncated, total: rows.length,
        columns: [{ id: 'label', label: dim.label }, { id: 'count', label: 'العدد' }, ...(withAvg ? [{ id: 'avgDays', label: 'متوسط أيام المعالجة (للمكتمل)' }] : [])],
        rows: list.map((g) => ({ label: g.label, count: g.count, ...(withAvg ? { avgDays: g.days.length ? Math.round((g.days.reduce((a, b) => a + b, 0) / g.days.length) * 10) / 10 : '' } : {}) })),
      };
    }

    const cols = source.columns.filter((c) => body.columns.includes(c.id));
    return {
      source: body.source, groupBy: null, truncated, total: rows.length, shown: Math.min(rows.length, limit),
      columns: cols.map((c) => ({ id: c.id, label: c.label })),
      rows: rows.slice(0, limit).map((r) => Object.fromEntries(cols.map((c) => [c.id, r.cells[c.id]]))),
    };
  }

  async exportCsv(body: RunReportDto, user: AffairsUser) {
    const result = await this.run(body, user, MAX_ROWS);
    return toCsv(result.columns.map((c) => c.label), result.rows.map((row) => result.columns.map((c) => (row as Record<string, unknown>)[c.id])));
  }
}
