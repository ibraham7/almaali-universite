import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import axios from 'axios';
import {
  getColleges, getDepartments, getPrograms, getStudyPlans, getAcademicLevels, getSemesters,
  type College, type Department, type Program, type StudyPlan, type AcademicLevel, type Semester,
} from '../../api/academicStructure';
import { createStudent, updateStudent, getStudentAdvisors, type StudentInput, type StudentListItem } from '../../api/students';
import { normalizeStudentDigits, STUDENT_BIRTH_PLACES, STUDENT_NATIONALITIES, STUDENT_OTHER_OPTION } from '../../constants/student-options';

type Catalog = {
  colleges: College[];
  departments: Department[];
  programs: Program[];
  plans: StudyPlan[];
  years: AcademicLevel[];
  semesters: Semester[];
  advisors: Array<{ id: string; email: string }>;
};

const empty: StudentInput = { universityId: '', firstName: '', familyName: '', status: 'ACTIVE' };

type StudentFieldErrors = Partial<Record<keyof StudentInput, string>>;

function validateStudentField(key: keyof StudentInput, value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  const nameFields: Array<keyof StudentInput> = ['firstName', 'middleName', 'familyName', 'motherName', 'englishName'];
  const namePattern = /^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u;
  if (nameFields.includes(key) && !namePattern.test(normalized)) {
    const labels: Partial<Record<keyof StudentInput, string>> = {
      firstName: 'الاسم الأول', middleName: 'اسم الأب', familyName: 'اسم العائلة',
      motherName: 'اسم الأم', englishName: 'الاسم بالإنجليزية',
    };
    return `${labels[key]} يجب أن يحتوي على أحرف فقط.`;
  }
  if (key === 'nationalId' || key === 'applicationNumber') {
    if (!/^[0-9٠-٩۰-۹]+$/.test(normalized)) return key === 'nationalId'
      ? 'الرقم الوطني يجب أن يحتوي على أرقام فقط.'
      : 'رقم الاكتتاب يجب أن يحتوي على أرقام فقط.';
    if (key === 'nationalId' && normalizeStudentDigits(normalized).length !== 11)
      return 'الرقم الوطني يجب أن يتكون من 11 رقمًا.';
  }
  if (key === 'phone' && !/^09\d{8}$/.test(normalizeStudentDigits(normalized)))
    return 'أدخل رقمًا سوريًا محليًا من 10 أرقام يبدأ بـ 09.';
  if (key === 'nationality' && !namePattern.test(normalized))
    return 'الجنسية يجب أن تحتوي على أحرف فقط.';
  if (key === 'birthPlace' && !/^[\p{L}\p{M}\d]+(?:[\s,.'\u2019()/-]+[\p{L}\p{M}\d]+)*$/u.test(normalized))
    return 'أدخل مكان الولادة بصيغة صحيحة.';
  return '';
}
function initialValues(student: StudentListItem | null): StudentInput {
  if (!student) return { ...empty };
  const rawGender = student.gender?.trim().toLocaleLowerCase();
  const gender = ['ذكر', 'male', 'm'].includes(rawGender ?? '') ? 'ذكر'
    : ['أنثى', 'انثى', 'female', 'f'].includes(rawGender ?? '') ? 'أنثى' : '';
  return {
    universityId: student.universityId, firstName: student.firstName, familyName: student.familyName,
    middleName: student.middleName, motherName: student.motherName, nationalId: student.nationalId,
    applicationNumber: student.applicationNumber, birthPlace: student.birthPlace,
    englishName: student.englishName, gender,
    dateOfBirth: student.dateOfBirth?.slice(0, 10), nationality: student.nationality,
    idOrPassport: student.idOrPassport, universityEmail: student.universityEmail, phone: student.phone,
    status: student.status, collegeId: student.collegeId, departmentId: student.departmentId,
    programId: student.programId, studyPlanId: student.studyPlanId,
    academicYearId: student.academicYearId, semesterId: student.semesterId,
    advisorId: student.advisorId, admissionDate: student.admissionDate?.slice(0, 10),
  };
}

export default function StudentFormDialog({ open, student, onClose, onSaved }: {
  open: boolean;
  student: StudentListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StudentInput>({ ...empty });
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [birthPlaceOtherSelected, setBirthPlaceOtherSelected] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialValues(student));
    setFieldErrors({});
    setSubmitted(false);
    setBirthPlaceOtherSelected(Boolean(student?.birthPlace && !STUDENT_BIRTH_PLACES.slice(0, -1).includes(student.birthPlace)));
    setError('');
    let active = true;
    Promise.all([
      getColleges(), getDepartments(), getPrograms(), getStudyPlans(),
      getAcademicLevels(), getSemesters(), getStudentAdvisors(),
    ]).then(([colleges, departments, programs, plans, years, semesters, advisors]) => {
      if (active) setCatalog({ colleges, departments, programs, plans, years, semesters, advisors });
    }).catch(() => { if (active) setError('تعذر تحميل الخيارات الأكاديمية.'); });
    return () => { active = false; };
  }, [open, student]);

  function field(key: keyof StudentInput, label: string, required = false, type = 'text') {
    const numericField = key === 'nationalId' || key === 'applicationNumber' || key === 'phone';
    const helperText = ['firstName', 'middleName', 'familyName', 'motherName', 'englishName'].includes(key)
      ? 'حروف ومسافات فقط.'
      : key === 'nationalId' ? '11 رقمًا؛ تُقبل الأرقام العربية أو الإنجليزية.'
        : key === 'phone' ? 'اختياري: رقم سوري محلي من 10 أرقام يبدأ بـ 09.'
          : numericField ? 'أرقام فقط. تُقبل الأرقام العربية أو الإنجليزية.' : undefined;
    const value = String(form[key] ?? '');
    const validationError = fieldErrors[key] || (submitted && required && !value.trim() ? `${label} مطلوب.` : '');
    return <TextField key={key} label={label} required={required} type={key === 'phone' ? 'tel' : type} fullWidth
      error={Boolean(validationError)}
      helperText={validationError ? <>{helperText && <span>{helperText}</span>}<Typography component="span" color="error" sx={{ display: 'block' }}>{validationError}</Typography></> : helperText}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        setForm((current) => ({ ...current, [key]: nextValue }));
        setFieldErrors((current) => ({ ...current, [key]: validateStudentField(key, nextValue) }));
      }}
      slotProps={{ ...(type === 'date' ? { inputLabel: { shrink: true } } : {}),
        ...(numericField ? { htmlInput: { inputMode: 'numeric', pattern: '[0-9٠-٩۰-۹]+', ...(key === 'nationalId' ? { maxLength: 11 } : key === 'phone' ? { maxLength: 10 } : {}) } } : {}) }} />;
  }

  function controlledList(key: 'nationality' | 'birthPlace', label: string, options: string[]) {
    const value = form[key] ?? '';
    const isKnown = options.slice(0, -1).includes(value);
    const otherSelected = key === 'birthPlace' ? birthPlaceOtherSelected : !isKnown;
    const selectedValue = isKnown ? value : otherSelected ? STUDENT_OTHER_OPTION : '';
    const validationError = fieldErrors[key] || (submitted && key === 'birthPlace' && !value.trim() ? 'مكان الولادة مطلوب.' : '');
    return <Box key={key} sx={{ display: 'grid', gap: 2 }}>
      <TextField select label={label} required={key === 'birthPlace'} fullWidth value={selectedValue}
        error={submitted && key === 'birthPlace' && !selectedValue}
        helperText={submitted && key === 'birthPlace' && !selectedValue ? 'اختر مكان الولادة.' : undefined}
        onChange={(event) => {
          const selected = event.target.value;
          if (key === 'birthPlace') {
            const chooseOther = selected === STUDENT_OTHER_OPTION;
            setBirthPlaceOtherSelected(chooseOther);
            setForm((current) => ({ ...current, [key]: chooseOther ? '' : selected }));
          } else {
            setForm((current) => ({ ...current, [key]: selected === STUDENT_OTHER_OPTION ? '' : selected }));
          }
          setFieldErrors((current) => ({ ...current, [key]: '' }));
        }}>
        {key === 'birthPlace' && <MenuItem value="">اختر مكان الولادة</MenuItem>}
        {options.slice(0, -1).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        <MenuItem value={STUDENT_OTHER_OPTION}>{options.at(-1)}</MenuItem>
      </TextField>
      {otherSelected && <TextField key={`${key}-other`} label={key === 'nationality' ? 'الجنسية الأخرى' : 'مكان الولادة الآخر'}
        required={key === 'birthPlace'} fullWidth value={value}
        error={Boolean(validationError)}
        helperText={validationError || 'اختر من القائمة إن كان الخيار متاحًا، وإلا أدخل القيمة كما في السجل الرسمي.'}
        onChange={(event) => {
          const nextValue = event.target.value;
          setForm((current) => ({ ...current, [key]: nextValue }));
          setFieldErrors((current) => ({ ...current, [key]: validateStudentField(key, nextValue) }));
        }} />}
    </Box>;
  }

  function select(key: keyof StudentInput, label: string, options: Array<{ id: string; nameAr?: string; email?: string }>, clear: Array<keyof StudentInput> = []) {
    return <TextField select key={key} label={label} fullWidth value={form[key] ?? ''}
      onChange={(event) => setForm((current) => {
        const next: StudentInput = { ...current, [key]: event.target.value || null };
        clear.forEach((dependent) => { next[dependent] = ''; });
        return next;
      })}>
      <MenuItem value="">غير محدد</MenuItem>
      {options.map((option) => <MenuItem key={option.id} value={option.id}>{option.nameAr ?? option.email}</MenuItem>)}
    </TextField>;
  }

  async function save() {
    setSubmitted(true);
    setError('');
    const requiredKeys: Array<keyof StudentInput> = [
      'universityId', 'firstName', 'middleName', 'familyName', 'motherName',
      'nationalId', 'applicationNumber', 'birthPlace',
    ];
    const validationKeys: Array<keyof StudentInput> = [
      ...requiredKeys, 'englishName', 'phone', 'nationality',
    ];
    const nextErrors: StudentFieldErrors = {};
    for (const key of validationKeys) {
      const value = String(form[key] ?? '');
      const label: Partial<Record<keyof StudentInput, string>> = {
        universityId: 'الرقم الجامعي', firstName: 'الاسم الأول', middleName: 'اسم الأب',
        familyName: 'اسم العائلة', motherName: 'اسم الأم', nationalId: 'الرقم الوطني',
        applicationNumber: 'رقم الاكتتاب', birthPlace: birthPlaceOtherSelected ? 'مكان الولادة الآخر' : 'مكان الولادة',
        englishName: 'الاسم بالإنجليزية', phone: 'رقم الهاتف', nationality: 'الجنسية',
      };
      if (requiredKeys.includes(key) && !value.trim()) nextErrors[key] = `${label[key]} مطلوب.`;
      else {
        const message = validateStudentField(key, value);
        if (message) nextErrors[key] = message;
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const payload: StudentInput = { ...form,
        universityEmail: form.universityEmail?.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        admissionDate: form.admissionDate || null,
      };
      if (student) await updateStudent(student.id, payload);
      else await createStudent(payload);
      onSaved();
      onClose();
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
      setError(cause && axios.isAxiosError(cause) && cause.response?.status === 409
        ? 'الرقم الجامعي مسجل مسبقًا.'
        : Array.isArray(message) ? message.join('، ') : typeof message === 'string' ? message : 'تعذر حفظ بيانات الطالب.');
    } finally { setBusy(false); }
  }

  const fields = [
    field('universityId', 'الرقم الجامعي', true), field('firstName', 'الاسم الأول', true),
    field('middleName', 'اسم الأب', true), field('familyName', 'اسم العائلة', true),
    field('motherName', 'اسم الأم', true), field('nationalId', 'الرقم الوطني', true),
    field('applicationNumber', 'رقم الاكتتاب', true), field('birthPlace', 'مكان الولادة', true),
    field('englishName', 'الاسم بالإنجليزية'),
    <TextField select key="gender" label="الجنس" fullWidth value={form.gender ?? ''}
      onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value || null }))}>
      <MenuItem value="">غير محدد</MenuItem><MenuItem value="ذكر">ذكر</MenuItem><MenuItem value="أنثى">أنثى</MenuItem>
    </TextField>,
    field('dateOfBirth', 'تاريخ الميلاد', false, 'date'), controlledList('nationality', 'الجنسية', STUDENT_NATIONALITIES),
    field('idOrPassport', 'رقم الهوية أو جواز السفر'), field('universityEmail', 'البريد الجامعي', false, 'email'),
    field('phone', 'رقم الهاتف'), field('status', 'حالة الطالب'),
    field('admissionDate', 'تاريخ القبول', false, 'date'),
  ];
  const academic = catalog ? [
    select('collegeId', 'الكلية', catalog.colleges, ['departmentId', 'programId', 'studyPlanId', 'academicYearId', 'semesterId']),
    select('departmentId', 'القسم', catalog.departments.filter((item) => item.collegeId === form.collegeId), ['programId', 'studyPlanId', 'academicYearId', 'semesterId']),
    select('programId', 'البرنامج / التخصص', catalog.programs.filter((item) => form.departmentId
      ? item.departmentId === form.departmentId
      : !item.departmentId && item.collegeId === form.collegeId), ['studyPlanId', 'academicYearId', 'semesterId']),
    select('studyPlanId', 'الخطة الدراسية', catalog.plans.filter((item) => item.programId === form.programId), ['academicYearId', 'semesterId']),
    select('academicYearId', 'المستوى الأكاديمي', catalog.years.filter((item) => item.studyPlanId === form.studyPlanId), ['semesterId']),
    select('semesterId', 'الفصل الدراسي', catalog.semesters.filter((item) => item.academicYearId === form.academicYearId)),
    select('advisorId', 'المرشد الأكاديمي', catalog.advisors),
  ] : [];

  const studentFields = fields.map((item, index) => index === 7
    ? controlledList('birthPlace', 'مكان الولادة', STUDENT_BIRTH_PLACES)
    : item);

  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
    <DialogTitle>{student ? 'تعديل بيانات الطالب' : 'إضافة طالب'}</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography color="text.secondary" sx={{ mb: 2 }}>أدخل البيانات المعتمدة في سجل الطالب. إنشاء حساب الدخول للطالب خطوة منفصلة.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {studentFields}
        {catalog ? academic : <CircularProgress size={24} />}
      </Box>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={busy}>إلغاء</Button>
      <Button variant="contained" onClick={() => void save()} disabled={busy || !catalog}>
        {busy ? 'جارٍ الحفظ...' : 'حفظ'}
      </Button>
    </DialogActions>
  </Dialog>;
}
