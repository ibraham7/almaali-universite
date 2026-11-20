import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import {
  getAcademicLevels, getColleges, getDepartments, getPrograms, getSemesters, getStudyPlans,
  type AcademicLevel, type College, type Department, type Program, type Semester, type StudyPlan,
} from '../../api/academicStructure';
import { studyPlanLabel } from '../../api/studyPlan';
import { approveStudentRegistration, type ApproveRegistrationInput } from '../../api/students';

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

  useEffect(() => {
    if (!open || catalog) return;
    let active = true;
    Promise.all([getColleges(), getDepartments(), getPrograms(), getStudyPlans(), getAcademicLevels(), getSemesters()])
      .then(([colleges, departments, programs, plans, years, semesters]) => { if (active) setCatalog({ colleges, departments, programs, plans, years, semesters }); })
      .catch(() => { if (active) setError('تعذر تحميل الخيارات الأكاديمية.'); });
    return () => { active = false; };
  }, [open, catalog]);

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
        <Alert severity="info">
          سيُربط {students.length} طالب بالكلية والبرنامج والخطة والمستوى والفصل المختارة، وبعدها يستطيعون تسجيل المقررات. من لديه خطة مسبقاً يُتخطى. تُسجَّل العملية بسجل العمليات.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {students.slice(0, 5).map((student) => `${student.universityId} — ${student.name}`).join('، ')}{students.length > 5 ? ` ... و${students.length - 5} آخرين` : ''}
        </Typography>
        {catalog ? <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {choose('الكلية', 'collegeId', catalog.colleges.map((item) => ({ id: item.id, label: item.nameAr })), false, ['departmentId', 'programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('القسم / الاختصاص', 'departmentId', catalog.departments.filter((item) => item.collegeId === placement.collegeId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.collegeId, ['programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('البرنامج', 'programId', catalog.programs.filter((item) => item.departmentId === placement.departmentId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.departmentId, ['studyPlanId', 'academicYearId', 'semesterId'])}
          {choose('الخطة الدراسية', 'studyPlanId', catalog.plans.filter((item) => item.programId === placement.programId).map((item) => ({ id: item.id, label: studyPlanLabel(item) })), !placement.programId, ['academicYearId', 'semesterId'])}
          {choose('المستوى الأكاديمي', 'academicYearId', catalog.years.filter((item) => item.studyPlanId === placement.studyPlanId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.studyPlanId, ['semesterId'])}
          {choose('الفصل الدراسي', 'semesterId', catalog.semesters.filter((item) => item.academicYearId === placement.academicYearId).map((item) => ({ id: item.id, label: item.nameAr })), !placement.academicYearId, [])}
        </Box> : <CircularProgress size={22} />}
        {skipped.length > 0 && <Alert severity="warning">
          تم تخطي: {skipped.slice(0, 10).map((item) => `${item.universityId || '؟'} (${item.reason})`).join('، ')}{skipped.length > 10 ? ` ... و${skipped.length - 10} آخرين` : ''}
        </Alert>}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={close}>إغلاق</Button>
      <Button variant="contained" color="success" disabled={busy || !complete || students.length === 0} onClick={() => void approve()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : `اعتماد تسجيل ${students.length} طالب`}
      </Button>
    </DialogActions>
  </Dialog>;
}
