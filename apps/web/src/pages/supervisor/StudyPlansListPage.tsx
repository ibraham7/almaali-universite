import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { STUDY_PLAN_STATUS_LABEL, approveStudyPlan, createStudyPlanVersion, type StudyPlanStatus } from '../../api/academicStructure';
import { apiClient } from '../../api/client';
import { getPlanStructure, type PlanStructure } from '../../api/studyPlan';
import { useAuth } from '../../auth/AuthContext';
import PlanStructureTables from './PlanStructureTables';

interface PlanRow {
  id: string; nameAr: string; status: StudyPlanStatus; versionNumber: number; planKey: string; cohortYear: number | null;
  effectiveFrom: string | null; approvedAt: string | null; coursesCount: number; studentsCount: number; totalCredits: number; graduationCredits: number | null;
  program?: { nameAr: string; college?: { nameAr: string } | null; department?: { nameAr: string; college?: { nameAr: string } | null } | null } | null;
}

interface VersionRow {
  id: string; versionNumber: number; status: StudyPlanStatus; cohortYear: number | null; effectiveFrom: string | null; approvedAt: string | null;
  approvedByName: string | null; studentsCount: number; createdAt: string;
}

const STATUS_COLOR: Record<StudyPlanStatus, 'default' | 'success' | 'warning'> = { DRAFT: 'warning', APPROVED: 'success', SUPERSEDED: 'default' };
const date = (value?: string | null) => (value ? value.slice(0, 10) : '—');

function errorText(error: unknown, fallback = 'تعذر تنفيذ العملية.') {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

// عرض الخطط الدراسية بجداول: بيانات الخطة الأساسية، وعرض هيكل كل خطة وسجل إصداراتها. الإنشاء بشاشة مستقلة (معالج بخطوات).
export default function StudyPlansListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canApprove = user?.role === 'REGISTRAR' || user?.role === 'SYSTEM_ADMIN';

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<PlanRow | null>(null);
  const [structure, setStructure] = useState<PlanStructure | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const load = useCallback(async () => {
    try { setPlans((await apiClient.get<PlanRow[]>('/study-plans')).data); setError(''); } catch (cause) { setError(errorText(cause, 'تعذر تحميل الخطط.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => plans
    .filter((plan) => !status || plan.status === status)
    .filter((plan) => !search.trim() || [plan.nameAr, plan.program?.nameAr, plan.program?.department?.nameAr, plan.program?.college?.nameAr, plan.program?.department?.college?.nameAr, plan.cohortYear].filter(Boolean).join(' ').includes(search.trim()))
    .sort((a, b) => (a.program?.nameAr ?? '').localeCompare(b.program?.nameAr ?? '') || a.nameAr.localeCompare(b.nameAr) || b.versionNumber - a.versionNumber), [plans, status, search]);

  async function open(plan: PlanRow) {
    setViewing(plan); setStructure(null); setVersions([]); setViewLoading(true);
    try {
      const [tree, history] = await Promise.all([getPlanStructure(plan.id), apiClient.get<VersionRow[]>(`/study-plans/${plan.id}/versions`)]);
      setStructure(tree); setVersions(history.data);
    } catch (cause) { setError(errorText(cause, 'تعذر تحميل الخطة.')); setViewing(null); } finally { setViewLoading(false); }
  }

  async function act(kind: 'approve' | 'version', plan: PlanRow) {
    const ask = kind === 'approve'
      ? `اعتماد الخطة «${plan.nameAr}» (إصدار ${plan.versionNumber})؟\nتصبح مقفلة، ويحل هذا الإصدار محل المعتمد السابق للطلاب الجدد. الطلاب الحاليون يبقون على إصدارهم.`
      : `إنشاء إصدار جديد من «${plan.nameAr}»؟\nتُنسخ الخطة كاملة كمسودة تعدّلها بحرية، والإصدار الحالي وطلابه لا يتأثرون.`;
    if (!window.confirm(ask)) return;
    try {
      setError('');
      if (kind === 'approve') await approveStudyPlan(plan.id);
      else { const created = await createStudyPlanVersion(plan.id); navigate(`/supervisor/study-plan/${created.id}/edit`); return; }
      setNotice(`تم اعتماد الخطة «${plan.nameAr}».`);
      await load();
    } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>الخطط الدراسية</Typography>
          <Typography color="text.secondary">كل خطة بإصداراتها ودفعتها وحالتها. المعتمدة مقفلة، وأي تعديل يكون بإصدار جديد لا يؤثر على طلابها.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/supervisor/study-plan/manage')}>إدارة المقررات والمتطلبات</Button>
          <Button variant="contained" onClick={() => navigate('/supervisor/study-plan/new')}>إنشاء خطة جديدة</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" label="بحث (الخطة، البرنامج، القسم، الكلية، الدفعة)" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ flex: 1 }} />
        <TextField select size="small" label="الحالة" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">كل الحالات</MenuItem>
          {(Object.keys(STUDY_PLAN_STATUS_LABEL) as StudyPlanStatus[]).map((key) => <MenuItem key={key} value={key}>{STUDY_PLAN_STATUS_LABEL[key]}</MenuItem>)}
        </TextField>
      </Stack>

      {loading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="الخطط الدراسية">
            <TableHead>
              <TableRow>
                <TableCell>الخطة</TableCell><TableCell>الكلية</TableCell><TableCell>القسم</TableCell><TableCell>البرنامج</TableCell><TableCell>الدفعة</TableCell><TableCell>الإصدار</TableCell>
                <TableCell>الحالة</TableCell><TableCell>تاريخ البدء</TableCell><TableCell>تاريخ الاعتماد</TableCell><TableCell>المقررات</TableCell><TableCell>الساعات</TableCell><TableCell>الطلاب</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((plan) => (
                <TableRow key={plan.id} hover sx={{ opacity: plan.status === 'SUPERSEDED' ? 0.65 : 1 }}>
                  <TableCell sx={{ fontWeight: 700 }}>{plan.nameAr}</TableCell>
                  <TableCell>{plan.program?.college?.nameAr ?? plan.program?.department?.college?.nameAr ?? '—'}</TableCell>
                  <TableCell>{plan.program?.department?.nameAr ?? '—'}</TableCell>
                  <TableCell>{plan.program?.nameAr ?? '—'}</TableCell>
                  <TableCell>{plan.cohortYear ?? 'كل الدفعات'}</TableCell>
                  <TableCell>{plan.versionNumber}</TableCell>
                  <TableCell><Chip size="small" color={STATUS_COLOR[plan.status]} label={STUDY_PLAN_STATUS_LABEL[plan.status]} /></TableCell>
                  <TableCell>{date(plan.effectiveFrom)}</TableCell>
                  <TableCell>{date(plan.approvedAt)}</TableCell>
                  <TableCell>{plan.coursesCount}</TableCell>
                  <TableCell>{plan.totalCredits}{plan.graduationCredits ? ` / ${plan.graduationCredits}` : ''}</TableCell>
                  <TableCell>{plan.studentsCount}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => void open(plan)}>عرض</Button>
                    {plan.status === 'DRAFT' && <Button size="small" onClick={() => navigate(`/supervisor/study-plan/${plan.id}/edit`)}>متابعة الإنشاء</Button>}
                    {plan.status === 'DRAFT' && canApprove && <Button size="small" color="success" onClick={() => void act('approve', plan)}>اعتماد</Button>}
                    {plan.status === 'APPROVED' && canApprove && <Button size="small" color="warning" onClick={() => void act('version', plan)}>إصدار جديد</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد خطط مطابقة.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="lg">
        <DialogTitle>{viewing ? `${viewing.nameAr} — إصدار ${viewing.versionNumber}` : ''}</DialogTitle>
        <DialogContent dividers>
          {viewLoading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}
          {structure && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip color={STATUS_COLOR[structure.status]} label={STUDY_PLAN_STATUS_LABEL[structure.status]} />
                <Chip variant="outlined" label={structure.cohortYear ? `دفعة ${structure.cohortYear}` : 'كل الدفعات'} />
                {structure.effectiveFrom && <Chip variant="outlined" label={`تبدأ ${date(structure.effectiveFrom)}`} />}
                <Chip color="primary" label={`${structure.totals.courses} مقرر • ${structure.totals.credits} ساعة`} />
                <Chip variant="outlined" label={`جامعة ${structure.totals.byCategory.UNIVERSITY} • كلية ${structure.totals.byCategory.COLLEGE} • قسم ${structure.totals.byCategory.PROGRAM}`} />
              </Stack>
              {versions.length > 1 && (
                <Box>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>سجل الإصدارات</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead><TableRow><TableCell>الإصدار</TableCell><TableCell>الحالة</TableCell><TableCell>الدفعة</TableCell><TableCell>تاريخ البدء</TableCell><TableCell>تاريخ الاعتماد</TableCell><TableCell>اعتمدها</TableCell><TableCell>الطلاب</TableCell></TableRow></TableHead>
                      <TableBody>
                        {versions.map((item) => (
                          <TableRow key={item.id} selected={item.id === viewing?.id}>
                            <TableCell>{item.versionNumber}</TableCell>
                            <TableCell><Chip size="small" color={STATUS_COLOR[item.status]} label={STUDY_PLAN_STATUS_LABEL[item.status]} /></TableCell>
                            <TableCell>{item.cohortYear ?? 'كل الدفعات'}</TableCell>
                            <TableCell>{date(item.effectiveFrom)}</TableCell>
                            <TableCell>{date(item.approvedAt)}</TableCell>
                            <TableCell>{item.approvedByName ?? '—'}</TableCell>
                            <TableCell>{item.studentsCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              <PlanStructureTables structure={structure} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewing(null)}>إغلاق</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
