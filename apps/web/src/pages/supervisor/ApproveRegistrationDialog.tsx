import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import axios from 'axios';
import {
  getAcademicLevels, getColleges, getDepartments, getPrograms, getSemesters, getStudyPlans, selectableStructure, assignablePlans,
  type AcademicLevel, type College, type Department, type Program, type Semester, type StudyPlan,
} from '../../api/academicStructure';
import { cohortRangeLabel, studyPlanLabel } from '../../api/studyPlan';
import { approveStudentRegistration, approveStudentRegistrationAuto, type ApproveRegistrationInput, type AutoApprovalRow } from '../../api/students';

type Placement = Omit<ApproveRegistrationInput, 'studentIds'>;
const emptyPlacement: Placement = { collegeId: '', departmentId: '', programId: '', studyPlanId: '', academicYearId: '', semesterId: '' };

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    return Array.isArray(message) ? message.join('، ') : typeof message === 'string' ? message : 'تعذر تنفيذ العملية.';
  }
  return 'تعذر تنفيذ العملية.';
}

export default function ApproveRegistrationDialog({ open, students, onClose, onDone }: {
  open: boolean;
  students: Array<{ id: string; universityId: string; name: string }>;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [placement, setPlacement] = useState<Placement>(emptyPlacement);
  const [catalog, setCatalog] = useState<{ colleges: College[]; departments: Department[]; programs: Program[]; plans: StudyPlan[]; years: AcademicLevel[]; semesters: Semester[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState<Array<{ universityId: string; reason: string }>>([]);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [preview, setPreview] = useState<AutoApprovalRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open || catalog) return;
    let active = true;
    Promise.all([getColleges(), getDepartments(), getPrograms(), getStudyPlans(), getAcademicLevels(), getSemesters()])
      .then(([colleges, departments, programs, plans, years, semesters]) => { const open = selectableStructure(colleges, departments, programs); if (active) setCatalog({ colleges: open.colleges, departments: open.departments, programs: open.programs, plans: assignablePlans(plans), years, semesters }); })
      .catch(() => { if (active) setError('تعذر تحميل الخيارات الأكاديمية.'); });
    return () => { active = false; };
  }, [open, catalog]);

  // المعاينة التلقائية: لكل طالب الخطة المناسبة لبرنامجه ودفعته قبل الاعتماد
  useEffect(() => {
    if (!open || mode !== 'auto' || students.length === 0) return;
    let active = true;
    setPreview(null); setPreviewLoading(true); setError('');
    approveStudentRegistrationAuto(students.map((student) => student.id), true)
      .then((result) => { if (active) setPreview(result.rows); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [open, mode, students]);

  const matched = preview?.filter((row) => !row.reason).length ?? 0;

  async function approveAuto() {
    setBusy(true); setError(''); setSkipped([]);
    try {
      const result = await approveStudentRegistrationAuto(students.map((student) => student.id), false);
      if (result.skipped.length) setSkipped(result.skipped);
      onDone(`تم اعتماد تسجيل ${result.approved} طالب وربطهم بالخطة المناسبة لدفعتهم.${result.skipped.length ? ` تم تخطي ${result.skipped.length}.` : ''}`);
      if (!result.skipped.length) onClose();
      else setMode('manual');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const set = (key: keyof Placement, value: string, reset: Array<keyof Placement> = []) =>
    setPlacement((current) => ({ ...current, [key]: value, ...Object.fromEntries(reset.map((item) => [item, ''])) }));
  const complete = Object.values(placement).every(Boolean);

  const choose = (label: string, key: keyof Placement, items: Array<{ id: string; label: string }>, disabled: boolean, reset: Array<keyof Placement>) => (
    <TextField select size="small" fullWidth required label={label} value={placement[key]} disabled={disabled} onChange={(event) => set(key, event.target.value, reset)}>
      {items.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
    </TextField>
  );

  async function approve() {
    setBusy(true); setError(''); setSkipped([]);
    try {
      const result = await approveStudentRegistration({ studentIds: students.map((student) => student.id), ...placement });
      if (result.skipped.length) setSkipped(result.skipped);
      onDone(`تم اعتماد تسجيل ${result.approved} طالب وربطهم بالخطة الدراسية.${result.skipped.length ? ` تم تخطي ${result.skipped.length}.` : ''}`);
      if (!result.skipped.length) { setPlacement(emptyPlacement); onClose(); }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const close = () => { if (!busy) { setSkipped([]); setError(''); onClose(); } };

  return <Dialog open={open} onClose={close} fullWidth maxWidth="md">
    <DialogTitle>اعتماد التسجيل وربط الطلاب بالخطة الدراسية</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Tabs value={mode} onChange={(_, value) => { setMode(value); setSkipped([]); }}>
          <Tab value="auto" label="تلقائي حسب الدفعة (مقترح)" />
          <Tab value="manual" label="يدوي (أحدد الخطة بنفسي)" />
        </Tabs>
        {mode === 'auto' && <>
          <Alert severity="info">
            يُربط كل طالب بآخر إصدار معتمد من خطة برنامجه المناسبة لدفعة قبوله (أو الخطة العامة)، في أول مستوى وأول فصل منها. من لا يُحدَّد له ربط يُتخطى مع السبب. الإصدارات الجديدة لاحقًا لا تنقل من رُبط سابقًا.
          </Alert>
          {previewLoading && <CircularProgress size={22} />}
          {preview && <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader aria-label="معاينة الربط">
              <TableHead><TableRow><TableCell>الطالب</TableCell><TableCell>الدفعة</TableCell><TableCell>الخطة والإصدار</TableCell><TableCell>المستوى / الفصل</TableCell></TableRow></TableHead>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>{row.universityId} — {row.name}</TableCell>
                    <TableCell>{row.admissionYear ?? '—'}</TableCell>
                    <TableCell>{row.plan ? `${row.plan.nameAr} — إصدار ${row.plan.versionNumber}${row.plan.cohortYear ? ` (${cohortRangeLabel(row.plan.cohortYear, row.plan.cohortToYear)})` : ' (عامة)'}` : <Typography component="span" color="warning.main">{row.reason}</Typography>}</TableCell>
                    <TableCell>{row.plan ? `${row.level} / ${row.semester}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>}
          {skipped.length > 0 && <Alert severity="warning">تم تخطي: {skipped.slice(0, 10).map((item) => `${item.universityId || '؟'} (${item.reason})`).join('، ')}</Alert>}
        </>}
        {mode === 'manual' && <Alert severity="info">
          سيُربط {students.length} طالب بالكلية والبرنامج والخطة والمستوى والفصل المختارة، وبعدها يستطيعون تسجيل المقررات. من لديه خطة مسبقاً يُتخطى. تُسجَّل العملية بسجل العمليات.
        </Alert>}
        {mode === 'manual' && <Typography variant="body2" color="text.secondary">
          {students.slice(0, 5).map((student) => `${student.universityId} — ${student.name}`).join('، ')}{students.length > 5 ? ` ... و${students.length - 5} آخرين` : ''}
        </Typography>}
        {mode === 'manual' && catalog ? <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {choose('الكلية', 'collegeId', catalog.colleges.map((item) => ({ id: item.id, label: item.nameAr })), false, ['departmentId', 'programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('القسم / الاختصاص', 'departmentId', catalog.departments.filter((item) => item.collegeId === placement.collegeId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.collegeId, ['programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('البرنامج', 'programId', catalog.programs.filter((item) => item.departmentId === placement.departmentId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.departmentId, ['studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('الخطة الدراسية', 'studyPlanId', catalog.plans.filter((item) => item.programId === placement.programId).map((item) => ({ id: item.id, label: studyPlanLabel(item) })), !placement.programId, ['academicYearId', 'semesterId'])}
          {choose('المستوى الأكاديمي', 'academicYearId', catalog.years.filter((item) => item.studyPlanId === placement.studyPlanId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.studyPlanId, ['semesterId'])}
          {choose('الفصل الدراسي', 'semesterId', catalog.semesters.filter((item) => item.academicYearId === placement.academicYearId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.academicYearId, [])}
        </Box> : mode === 'manual' ? <CircularProgress size={22} /> : null}
        {mode === 'manual' && skipped.length > 0 && <Alert severity="warning">
          تم تخطي: {skipped.slice(0, 10).map((item) => `${item.universityId || '؟'} (${item.reason})`).join('، ')}{skipped.length > 10 ? ` ... و${skipped.length - 10} آخرين` : ''}
        </Alert>}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={close}>إغلاق</Button>
      {mode === 'manual' && <Button variant="contained" color="success" disabled={busy || !complete || students.length === 0} onClick={() => void approve()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : `اعتماد تسجيل ${students.length} طالب`}
      </Button>}
      {mode === 'auto' && <Button variant="contained" color="success" disabled={busy || previewLoading || matched === 0} onClick={() => void approveAuto()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : `اعتماد ${matched} طالب مطابق`}
      </Button>}
    </DialogActions>
  </Dialog>;
}
