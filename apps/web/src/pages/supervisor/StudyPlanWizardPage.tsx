import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack,
  Step, StepButton, Stepper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  approveStudyPlan, createAcademicLevel, createSemester, createStudyPlan, getColleges, getDepartments, getPrograms,
  selectableStructure, updateAcademicLevel, updateSemester, updateStudyPlan,
  type College, type Department, type Program,
} from '../../api/academicStructure';
import {
  PLAN_CATEGORY_LABEL, addCourseToPlan, getCourses, getPlanStructure, removePlanCourse, updatePlanCourse,
  type Course, type PlanCategory, type PlanStructure, type PlanStructureCourse,
  cohortRangeLabel,
} from '../../api/studyPlan';
import { useAuth } from '../../auth/AuthContext';
import PlanStructureTables from './PlanStructureTables';

const STEPS = ['بيانات الخطة', 'المستويات', 'الفصول', 'المقررات', 'المراجعة والاعتماد'];

function errorText(error: unknown, fallback = 'تعذر تنفيذ العملية.') {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

type Info = { collegeId: string; departmentId: string; programId: string; nameAr: string; cohortYear: string; cohortToYear: string; effectiveFrom: string; graduationCredits: string };
const EMPTY_INFO: Info = { collegeId: '', departmentId: '', programId: '', nameAr: '', cohortYear: '', cohortToYear: '', effectiveFrom: '', graduationCredits: '' };
type LevelRow = { id?: string; nameAr: string };
type SemesterRow = { id?: string; nameAr: string };

// معالج إنشاء خطة دراسية بخطوات. كل خطوة تحفظ في مسودة الخطة على الخادم، فالرجوع للخطوات السابقة وتعديلها لا يضيّع شيئًا.
export default function StudyPlanWizardPage() {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = user?.role === 'REGISTRAR' || user?.role === 'SYSTEM_ADMIN';

  const [planId, setPlanId] = useState<string | null>(routePlanId ?? null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(Boolean(routePlanId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [info, setInfo] = useState<Info>(EMPTY_INFO);
  const [structure, setStructure] = useState<PlanStructure | null>(null);
  const [levels, setLevels] = useState<LevelRow[]>([{ nameAr: 'المستوى الأول' }]);
  const [semesters, setSemesters] = useState<Record<number, SemesterRow[]>>({});

  const locked = structure !== null && structure.status !== 'DRAFT';

  const loadStructure = useCallback(async (id: string) => {
    const data = await getPlanStructure(id);
    setStructure(data);
    if (data.levels.length) setLevels(data.levels.map((level) => ({ id: level.id, nameAr: level.nameAr })));
    setSemesters(Object.fromEntries(data.levels.map((level, index) => [index, level.semesters.map((semester) => ({ id: semester.id, nameAr: semester.nameAr }))])));
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getColleges(), getDepartments(), getPrograms()])
      .then(([collegeList, departmentList, programList]) => { if (active) { setColleges(collegeList); setDepartments(departmentList); setPrograms(programList); } })
      .catch(() => { if (active) setError('تعذر تحميل الكليات والأقسام والبرامج.'); });
    return () => { active = false; };
  }, []);

  // متابعة مسودة موجودة: تحميل بياناتها
  useEffect(() => {
    if (!routePlanId || programs.length === 0) return;
    let active = true;
    loadStructure(routePlanId).then((data) => {
      if (!active) return;
      const program = programs.find((item) => item.id === data.programId);
      const department = departments.find((item) => item.id === program?.departmentId);
      setInfo({
        collegeId: program?.collegeId ?? department?.collegeId ?? '', departmentId: program?.departmentId ?? '', programId: data.programId,
        nameAr: data.nameAr, cohortYear: data.cohortYear ? String(data.cohortYear) : '', cohortToYear: data.cohortToYear ? String(data.cohortToYear) : '', effectiveFrom: data.effectiveFrom ? data.effectiveFrom.slice(0, 10) : '',
        graduationCredits: data.graduationCredits ? String(data.graduationCredits) : '',
      });
    }).catch((cause) => { if (active) setError(errorText(cause, 'تعذر تحميل الخطة.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routePlanId, programs, departments, loadStructure]);

  const open = useMemo(() => selectableStructure(colleges, departments, programs, [info.collegeId, info.departmentId, info.programId]), [colleges, departments, programs, info.collegeId, info.departmentId, info.programId]);
  const departmentOptions = open.departments.filter((item) => item.collegeId === info.collegeId);
  const programOptions = open.programs.filter((item) => (info.departmentId ? item.departmentId === info.departmentId : false));

  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  const infoValid = Boolean(info.programId && info.nameAr.trim());

  async function saveInfo() {
    const cohortYear = info.cohortYear.trim() ? Number(info.cohortYear) : null;
    const cohortToYear = info.cohortToYear.trim() ? Number(info.cohortToYear) : null;
    const graduationCredits = info.graduationCredits.trim() ? Number(info.graduationCredits) : null;
    if (planId) {
      await updateStudyPlan(planId, { nameAr: info.nameAr.trim(), cohortYear, cohortToYear, effectiveFrom: info.effectiveFrom || null, graduationCredits });
      return;
    }
    const created = await createStudyPlan({ programId: info.programId, nameAr: info.nameAr.trim(), cohortYear, cohortToYear, effectiveFrom: info.effectiveFrom || null, graduationCredits });
    setPlanId(created.id);
    await loadStructure(created.id);
    navigate(`/supervisor/study-plan/${created.id}/edit`, { replace: true });
  }

  async function saveLevels() {
    if (!planId) return;
    if (levels.some((level) => !level.nameAr.trim())) throw new Error('اكتب اسمًا لكل مستوى.');
    for (const [index, level] of levels.entries()) {
      const nameAr = level.nameAr.trim();
      if (level.id) {
        const current = structure?.levels.find((item) => item.id === level.id);
        if (current && current.nameAr !== nameAr) await updateAcademicLevel(level.id, { nameAr });
      } else {
        await createAcademicLevel({ studyPlanId: planId, nameAr, levelNumber: index + 1 });
      }
    }
    await loadStructure(planId);
  }

  async function saveSemesters() {
    if (!planId || !structure) return;
    for (const [index, level] of structure.levels.entries()) {
      const rows = semesters[index] ?? [];
      if (rows.length === 0) throw new Error(`أضف فصلًا واحدًا على الأقل للمستوى «${level.nameAr}».`);
      if (rows.some((row) => !row.nameAr.trim())) throw new Error('اكتب اسمًا لكل فصل.');
      for (const [position, row] of rows.entries()) {
        const nameAr = row.nameAr.trim();
        if (row.id) {
          const current = level.semesters.find((item) => item.id === row.id);
          if (current && current.nameAr !== nameAr) await updateSemester(row.id, { nameAr });
        } else {
          await createSemester({ academicYearId: level.id, nameAr, semesterNumber: position + 1 });
        }
      }
    }
    await loadStructure(planId);
  }

  async function next() {
    await run(async () => {
      if (step === 0) await saveInfo();
      if (step === 1) {
        await saveLevels();
        // المستويات الجديدة تحتاج صفوف فصول فارغة في الخطوة التالية
        setSemesters((current) => Object.fromEntries(Array.from({ length: levels.length }, (_, index) => [index, current[index] ?? []])));
      }
      if (step === 2) await saveSemesters();
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    });
  }

  function back() { setError(''); setStep((current) => Math.max(current - 1, 0)); }

  function goTo(index: number) {
    if (!planId && index > 0) return;
    setError('');
    setStep(index);
  }

  async function approve() {
    if (!planId) return;
    if (!window.confirm('اعتماد الخطة؟ تصبح مقفلة (لا تُعدَّل)، وتُستعمل لربط الطلاب الجدد بدفعتها. أي تغيير لاحق يكون بإصدار جديد.')) return;
    await run(async () => {
      await approveStudyPlan(planId);
      navigate('/supervisor/study-plan', { replace: true, state: { notice: 'تم اعتماد الخطة.' } });
    });
  }

  const nextDisabled = busy || loading || locked && step < 3 || (step === 0 && !infoValid) || (step === 1 && levels.length === 0);

  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{planId ? 'متابعة إنشاء الخطة الدراسية' : 'إنشاء خطة دراسية جديدة'}</Typography>
          <Typography color="text.secondary">
            {structure ? `${structure.nameAr} — إصدار ${structure.versionNumber} (${structure.status === 'DRAFT' ? 'مسودة' : structure.status === 'APPROVED' ? 'معتمدة' : 'إصدار قديم'})` : 'تُحفظ كل خطوة في مسودة، ويمكنك الرجوع وتعديل ما أدخلته.'}
          </Typography>
        </Box>
        <Button onClick={() => navigate('/supervisor/study-plan')}>خروج</Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stepper nonLinear activeStep={step} alternativeLabel>
          {STEPS.map((label, index) => (
            <Step key={label} completed={index < step}>
              <StepButton color="inherit" onClick={() => goTo(index)} disabled={!planId && index > 0}>{label}</StepButton>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {locked && <Alert severity="warning" sx={{ mb: 2 }}>هذه الخطة {structure?.status === 'APPROVED' ? 'معتمدة' : 'إصدار قديم'} ومقفلة للتعديل. لتعديلها أنشئ إصدارًا جديدًا من صفحة «الهيكل الأكاديمي».</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        {step === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5, alignItems: 'start', maxWidth: 900 }}>
            <TextField select required label="الكلية" value={info.collegeId} disabled={Boolean(planId)}
              onChange={(event) => setInfo({ ...info, collegeId: event.target.value, departmentId: '', programId: '' })}>
              {open.colleges.map((item) => <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>)}
            </TextField>
            <TextField select required label="القسم / الاختصاص" value={info.departmentId} disabled={Boolean(planId) || !info.collegeId}
              onChange={(event) => setInfo({ ...info, departmentId: event.target.value, programId: '' })}>
              {departmentOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>)}
            </TextField>
            <TextField select required label="البرنامج (بكالوريوس، دبلوم...)" value={info.programId} disabled={Boolean(planId) || !info.departmentId}
              onChange={(event) => setInfo({ ...info, programId: event.target.value })}>
              {programOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>)}
            </TextField>
            <TextField required label="اسم الخطة" value={info.nameAr} onChange={(event) => setInfo({ ...info, nameAr: event.target.value })} disabled={locked} />
              <TextField label="من دفعة (سنة القبول)" value={info.cohortYear} disabled={locked}
                onChange={(event) => setInfo({ ...info, cohortYear: event.target.value.replace(/\D/g, '').slice(0, 4) })} helperText="أول دفعة تسري عليها الخطة. فارغة مع «إلى دفعة» فارغة = خطة عامة لكل الدفعات." />
              <TextField label="إلى دفعة (اختياري)" value={info.cohortToYear} disabled={locked || !info.cohortYear}
                onChange={(event) => setInfo({ ...info, cohortToYear: event.target.value.replace(/\D/g, '').slice(0, 4) })} helperText="اتركها فارغة إذا كانت الخطة ما زالت سارية على الدفعات الجديدة. لدفعة واحدة اكتب نفس السنة." />
              <TextField label="رقم الإصدار" value={structure?.versionNumber ?? 1} disabled helperText="الإصدارات الجديدة تُنشأ من الخطة المعتمدة" />
              <TextField type="date" label="تاريخ بدء التطبيق" value={info.effectiveFrom} disabled={locked}
                onChange={(event) => setInfo({ ...info, effectiveFrom: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="ساعات التخرج (اختياري)" value={info.graduationCredits} disabled={locked}
                onChange={(event) => setInfo({ ...info, graduationCredits: event.target.value.replace(/\D/g, '').slice(0, 3) })} />
          </Box>
        )}

        {step === 1 && (
          <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
            <Typography color="text.secondary">أضف مستويات الخطة وسمّها (مثل: السنة الأولى، المستوى الثاني). الترتيب هو رقم المستوى.</Typography>
            {levels.map((level, index) => (
              <Stack key={level.id ?? `new-${index}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip label={`المستوى ${index + 1}`} />
                <TextField fullWidth size="small" label="اسم المستوى" value={level.nameAr} disabled={locked}
                  onChange={(event) => setLevels((current) => current.map((row, position) => (position === index ? { ...row, nameAr: event.target.value } : row)))} />
                {!level.id && !locked && <Button color="warning" size="small" onClick={() => setLevels((current) => current.filter((_, position) => position !== index))}>إزالة</Button>}
              </Stack>
            ))}
            {!locked && <Box><Button variant="outlined" onClick={() => setLevels((current) => [...current, { nameAr: '' }])}>إضافة مستوى</Button></Box>}
            <Typography variant="caption" color="text.secondary">المستوى المحفوظ لا يُحذف، يمكن تعديل اسمه فقط.</Typography>
          </Stack>
        )}

        {step === 2 && structure && (
          <Stack spacing={3}>
            <Typography color="text.secondary">حدّد الفصول الدراسية التابعة لكل مستوى.</Typography>
            {structure.levels.map((level, index) => (
              <Box key={level.id}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{level.nameAr}</Typography>
                <Stack spacing={1} sx={{ maxWidth: 560 }}>
                  {(semesters[index] ?? []).map((row, position) => (
                    <Stack key={row.id ?? `n-${position}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip size="small" label={`الفصل ${position + 1}`} />
                      <TextField fullWidth size="small" label="اسم الفصل" value={row.nameAr} disabled={locked}
                        onChange={(event) => setSemesters((current) => ({ ...current, [index]: (current[index] ?? []).map((item, at) => (at === position ? { ...item, nameAr: event.target.value } : item)) }))} />
                      {!row.id && !locked && <Button color="warning" size="small" onClick={() => setSemesters((current) => ({ ...current, [index]: (current[index] ?? []).filter((_, at) => at !== position) }))}>إزالة</Button>}
                    </Stack>
                  ))}
                  {!locked && <Box><Button size="small" variant="outlined" onClick={() => setSemesters((current) => ({ ...current, [index]: [...(current[index] ?? []), { nameAr: '' }] }))}>إضافة فصل</Button></Box>}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {step === 3 && structure && planId && (
          <CoursesStep planId={planId} structure={structure} locked={locked} onChanged={() => loadStructure(planId).then(() => undefined)} onError={setError} />
        )}

        {step === 4 && structure && <ReviewStep structure={structure} />}
      </Paper>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Button onClick={back} disabled={step === 0 || busy}>السابق</Button>
        <Stack direction="row" spacing={1}>
          {step < STEPS.length - 1 && <Button variant="contained" onClick={() => void next()} disabled={Boolean(nextDisabled)}>{busy ? <CircularProgress size={20} color="inherit" /> : step === 0 && !planId ? 'حفظ كمسودة والمتابعة' : 'التالي'}</Button>}
          {step === STEPS.length - 1 && (<>
            <Button variant="outlined" onClick={() => navigate('/supervisor/study-plan')}>حفظ كمسودة والخروج</Button>
            {canApprove && !locked && <Button variant="contained" color="success" disabled={busy} onClick={() => void approve()}>اعتماد الخطة</Button>}
          </>)}
        </Stack>
      </Stack>
    </Box>
  );
}

type CourseForm = { courseId: string; requirement: 'MANDATORY' | 'ELECTIVE'; category: PlanCategory | ''; credits: string; prerequisiteIds: string[] };

function CoursesStep({ planId, structure, locked, onChanged, onError }: {
  planId: string; structure: PlanStructure; locked: boolean; onChanged: () => Promise<void>; onError: (message: string) => void;
}) {
  const semesterOptions = structure.levels.flatMap((level) => level.semesters.map((semester) => ({ level, semester })));
  const [semesterId, setSemesterId] = useState(semesterOptions[0]?.semester.id ?? '');
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [dialog, setDialog] = useState<{ editing: PlanStructureCourse | null; form: CourseForm } | null>(null);
  const [removing, setRemoving] = useState<PlanStructureCourse | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  useEffect(() => { getCourses().then(setCatalog).catch(() => onError('تعذر تحميل المقررات.')); }, [onError]);

  const current = semesterOptions.find((item) => item.semester.id === semesterId);
  const used = new Set(structure.levels.flatMap((level) => level.semesters.flatMap((semester) => semester.courses.map((course) => course.courseId))));

  // المتطلب السابق: مقرر من الخطة في فصل أبكر (نفس شرط الخادم)
  const earlier = (courseId: string | undefined) => {
    if (!current) return [] as PlanStructureCourse[];
    return structure.levels.flatMap((level) => level.semesters.filter((semester) => level.levelNumber < current.level.levelNumber
      || (level.levelNumber === current.level.levelNumber && semester.semesterNumber < current.semester.semesterNumber)).flatMap((semester) => semester.courses))
      .filter((course) => course.courseId !== courseId);
  };

  function openAdd() {
    setDialogError('');
    setDialog({ editing: null, form: { courseId: '', requirement: 'MANDATORY', category: '', credits: '', prerequisiteIds: [] } });
  }

  function openEdit(course: PlanStructureCourse) {
    setDialogError('');
    setDialog({ editing: course, form: { courseId: course.courseId, requirement: course.requirement as 'MANDATORY' | 'ELECTIVE', category: course.category ?? '', credits: course.creditsInPlan !== null ? String(course.creditsInPlan) : '', prerequisiteIds: course.prerequisites.map((item) => item.courseId) } });
  }

  async function save() {
    if (!dialog || !current) return;
    const { form, editing } = dialog;
    if (!form.category) { setDialogError('اختر نوع المتطلب (جامعة / كلية / قسم).'); return; }
    setBusy(true); setDialogError('');
    try {
      const creditsInPlan = form.credits.trim() ? Number(form.credits) : undefined;
      if (editing) {
        await updatePlanCourse(editing.id, { requirement: form.requirement, category: form.category, creditsInPlan: creditsInPlan ?? null, prerequisiteCourseIds: form.prerequisiteIds });
      } else {
        const priority = Math.max(0, ...current.semester.courses.map((course) => course.priority)) + 1;
        const result = await addCourseToPlan({ studyPlanId: planId, academicYearId: current.level.id, semesterId: current.semester.id, courseId: form.courseId, priority, requirement: form.requirement, category: form.category, creditsInPlan, prerequisiteCourseIds: form.prerequisiteIds });
        if (!result.success) throw new Error((result as { errors?: string[] }).errors?.join('، ') ?? 'تعذر إضافة المقرر.');
      }
      setDialog(null);
      await onChanged();
    } catch (cause) { setDialogError(cause instanceof Error && !axios.isAxiosError(cause) ? cause.message : errorText(cause)); } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try { await removePlanCourse(removing.id, reason.trim()); setRemoving(null); setReason(''); await onChanged(); } catch (cause) { onError(errorText(cause)); } finally { setBusy(false); }
  }

  if (semesterOptions.length === 0) return <Alert severity="info">أضف فصولًا للمستويات أولاً (الخطوة 3).</Alert>;

  const selectedCourse = catalog.find((course) => course.id === dialog?.form.courseId);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField select size="small" label="المستوى / الفصل" value={semesterId} onChange={(event) => setSemesterId(event.target.value)} sx={{ minWidth: 280 }}>
          {semesterOptions.map(({ level, semester }) => <MenuItem key={semester.id} value={semester.id}>{level.nameAr} ← {semester.nameAr}</MenuItem>)}
        </TextField>
        {current && <Typography color="text.secondary">{`${current.semester.courses.length} مقرر • ${current.semester.credits} ساعة معتمدة`}</Typography>}
        <Box sx={{ flex: 1 }} />
        {!locked && <Button variant="contained" onClick={openAdd}>إضافة مقرر</Button>}
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="مقررات الفصل">
          <TableHead><TableRow><TableCell>الرمز</TableCell><TableCell>المقرر</TableCell><TableCell>نوع المتطلب</TableCell><TableCell>إجباري/اختياري</TableCell><TableCell>الساعات</TableCell><TableCell>المتطلبات السابقة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {current?.semester.courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.code}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{course.nameAr}</TableCell>
                <TableCell>{course.category ? PLAN_CATEGORY_LABEL[course.category] : <Chip size="small" color="warning" label="غير محدد" />}</TableCell>
                <TableCell>{course.requirement === 'MANDATORY' ? 'إجباري' : 'اختياري'}</TableCell>
                <TableCell>{course.credits}{course.creditsInPlan !== null && course.creditsInPlan !== course.courseCredits ? ` (المقرر: ${course.courseCredits})` : ''}</TableCell>
                <TableCell>{course.prerequisites.length ? course.prerequisites.map((item) => item.nameAr).join('، ') : '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {!locked && <Button size="small" onClick={() => openEdit(course)}>تعديل</Button>}
                  {!locked && <Button size="small" color="warning" onClick={() => { setReason(''); setRemoving(course); }}>إزالة</Button>}
                </TableCell>
              </TableRow>
            ))}
            {current && current.semester.courses.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا مقررات في هذا الفصل بعد.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(dialog)} onClose={busy ? undefined : () => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.editing ? 'تعديل مقرر في الخطة' : 'إضافة مقرر إلى الفصل'}</DialogTitle>
        <DialogContent>
          {dialog && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {dialogError && <Alert severity="error">{dialogError}</Alert>}
              {dialog.editing ? <Typography sx={{ fontWeight: 700 }}>{dialog.editing.code} — {dialog.editing.nameAr}</Typography> : (
                <Autocomplete
                  options={catalog.filter((course) => course.status === 'ACTIVE' && !used.has(course.id))}
                  getOptionLabel={(course) => `${course.code} — ${course.nameAr}`}
                  value={selectedCourse ?? null}
                  onChange={(_, value) => setDialog({ ...dialog, form: { ...dialog.form, courseId: value?.id ?? '', credits: '' } })}
                  renderInput={(params) => <TextField {...params} required label="المقرر" helperText="المقررات المضافة لأي فصل من الخطة لا تظهر هنا" />}
                  noOptionsText="لا مقررات متاحة"
                />
              )}
              <TextField select required label="نوع المتطلب" value={dialog.form.category} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, category: event.target.value as PlanCategory } })}>
                {(Object.keys(PLAN_CATEGORY_LABEL) as PlanCategory[]).map((key) => <MenuItem key={key} value={key}>{PLAN_CATEGORY_LABEL[key]}</MenuItem>)}
              </TextField>
              <TextField select label="إجباري / اختياري" value={dialog.form.requirement} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, requirement: event.target.value as 'MANDATORY' | 'ELECTIVE' } })}>
                <MenuItem value="MANDATORY">إجباري</MenuItem><MenuItem value="ELECTIVE">اختياري</MenuItem>
              </TextField>
              <TextField label="الساعات المعتمدة ضمن الخطة" value={dialog.form.credits} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, credits: event.target.value.replace(/\D/g, '').slice(0, 2) } })}
                helperText={(dialog.editing ? dialog.editing.courseCredits : selectedCourse?.credits) !== undefined ? `اتركها فارغة لاستعمال ساعات المقرر (${dialog.editing ? dialog.editing.courseCredits : selectedCourse?.credits})` : 'اتركها فارغة لاستعمال ساعات المقرر'} />
              <Autocomplete
                multiple
                options={earlier(dialog.editing?.courseId ?? dialog.form.courseId)}
                getOptionLabel={(course) => `${course.code} — ${course.nameAr}`}
                value={earlier(dialog.editing?.courseId ?? dialog.form.courseId).filter((course) => dialog.form.prerequisiteIds.includes(course.courseId))}
                onChange={(_, value) => setDialog({ ...dialog, form: { ...dialog.form, prerequisiteIds: value.map((course) => course.courseId) } })}
                renderInput={(params) => <TextField {...params} label="المتطلبات السابقة (اختياري)" helperText="مقررات من هذه الخطة في فصول أبكر" />}
                noOptionsText="لا مقررات في فصول أبكر"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={() => void save()} disabled={busy || (!dialog?.editing && !dialog?.form.courseId)}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(removing)} onClose={busy ? undefined : () => setRemoving(null)} fullWidth maxWidth="xs">
        <DialogTitle>إزالة مقرر من الخطة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>{removing?.code} — {removing?.nameAr}</Typography>
            <TextField required label="سبب الإزالة" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)} disabled={busy}>إلغاء</Button>
          <Button color="warning" variant="contained" onClick={() => void remove()} disabled={busy || !reason.trim()}>إزالة</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ReviewStep({ structure }: { structure: PlanStructure }) {
  const problems: string[] = [];
  if (structure.levels.length === 0) problems.push('لا توجد مستويات.');
  for (const level of structure.levels) {
    if (level.semesters.length === 0) problems.push(`المستوى «${level.nameAr}» بلا فصول.`);
    for (const semester of level.semesters) if (semester.courses.length === 0) problems.push(`الفصل «${semester.nameAr}» (${level.nameAr}) بلا مقررات.`);
  }
  if (structure.totals.byCategory.UNSPECIFIED > 0) problems.push('بعض المقررات بلا نوع متطلب.');
  if (structure.graduationCredits && structure.totals.credits !== structure.graduationCredits) problems.push(`مجموع ساعات الخطة ${structure.totals.credits} يختلف عن ساعات التخرج ${structure.graduationCredits}.`);
  const category = structure.totals.byCategory;
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Chip label={`${structure.totals.courses} مقرر`} />
        <Chip color="primary" label={`${structure.totals.credits} ساعة معتمدة`} />
        <Chip variant="outlined" label={`جامعة: ${category.UNIVERSITY}`} />
        <Chip variant="outlined" label={`كلية: ${category.COLLEGE}`} />
        <Chip variant="outlined" label={`قسم: ${category.PROGRAM}`} />
        {category.UNSPECIFIED > 0 && <Chip color="warning" label={`غير محدد: ${category.UNSPECIFIED}`} />}
        <Chip variant="outlined" label={cohortRangeLabel(structure.cohortYear, structure.cohortToYear)} />
        {structure.effectiveFrom && <Chip variant="outlined" label={`تبدأ ${structure.effectiveFrom.slice(0, 10)}`} />}
      </Stack>
      {problems.length > 0 ? <Alert severity="warning">{problems.map((item) => <div key={item}>{item}</div>)}</Alert> : <Alert severity="success">الخطة مكتملة وجاهزة للاعتماد.</Alert>}
      <PlanStructureTables structure={structure} />
    </Stack>
  );
}
