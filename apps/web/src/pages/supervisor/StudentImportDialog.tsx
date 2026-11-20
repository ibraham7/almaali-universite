import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack,
  Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import axios from 'axios';
import {
  confirmStudentImport, inspectStudentImport, previewStudentImport,
  type ImportDefaults, type ImportError, type ImportInspection, type StudentImportPreview, type UniversityIdSource,
} from '../../api/studentImports';
import {
  getAcademicLevels, getColleges, getDepartments, getPrograms, getSemesters, getStudyPlans,
  type AcademicLevel, type College, type Department, type Program, type Semester, type StudyPlan,
} from '../../api/academicStructure';
import { studyPlanLabel } from '../../api/studyPlan';

const NONE = '';
const STEPS = ['اختيار الملف', 'مطابقة الأعمدة', 'المعاينة والاستيراد'];
const GROUP_LABELS = { identity: 'بيانات الطالب', contact: 'التواصل', academic: 'الربط الأكاديمي' } as const;

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
    if (!error.response) return 'تعذر الاتصال بالخادم أثناء رفع الملف. تحقق من الاتصال وحجم الملف ثم أعد المحاولة.';
    if (status === 413) return 'حجم الملف أكبر من الحد المسموح على الخادم. قسّم الملف إلى أجزاء أصغر أو اطلب رفع الحد.';
    if (status === 502 || status === 504) return 'الخادم تأخر أو توقف أثناء قراءة الملف (خطأ ' + status + '). أعد المحاولة بملف أصغر.';
    return `تعذر قراءة الملف (خطأ ${status ?? 'غير معروف'} من الخادم).`;
  }
  return 'تعذر قراءة الملف.';
}

function downloadErrors(errors: ImportError[]) {
  const csvCell = (value: string) => {
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [['رقم الصف', 'الرقم الجامعي', 'العمود', 'سبب الخطأ'], ...errors.map((item) => [item.rowNumber ? String(item.rowNumber) : 'الملف كله', item.universityId, item.column ?? '', item.message])];
  const blob = new Blob(['﻿', lines.map((line) => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'student-import-errors.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// يحفظ مطابقة الأعمدة لنفس شكل الملف حتى لا تُعاد بكل مرة
function signature(info: ImportInspection) {
  return `student-import-mapping:${info.columns.map((column) => column.header).join('|')}`;
}
function loadSavedMapping(info: ImportInspection): Record<string, number | null> | null {
  try {
    const raw = localStorage.getItem(signature(info));
    return raw ? (JSON.parse(raw) as Record<string, number | null>) : null;
  } catch { return null; }
}
function saveMapping(info: ImportInspection, mapping: Record<string, number | null>) {
  try { localStorage.setItem(signature(info), JSON.stringify(mapping)); } catch { /* التخزين المحلي غير متاح */ }
}

export default function StudentImportDialog({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<ImportInspection | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [defaults, setDefaults] = useState<ImportDefaults>({});
  const [idSource, setIdSource] = useState<UniversityIdSource>({ mode: 'column', prefix: String(new Date().getFullYear()) });
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<{ colleges: College[]; departments: Department[]; programs: Program[]; plans: StudyPlan[]; years: AcademicLevel[]; semesters: Semester[] } | null>(null);

  useEffect(() => {
    if (!open || catalog) return;
    let active = true;
    Promise.all([getColleges(), getDepartments(), getPrograms(), getStudyPlans(), getAcademicLevels(), getSemesters()])
      .then(([colleges, departments, programs, plans, years, semesters]) => { if (active) setCatalog({ colleges, departments, programs, plans, years, semesters }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [open, catalog]);

  function reset() {
    setStep(0); setFile(null); setInfo(null); setMapping({}); setDefaults({}); setIdSource({ mode: 'column', prefix: String(new Date().getFullYear()) }); setPreview(null); setError(''); setSuccess('');
  }

  async function inspect(nextFile: File, options?: { sheet?: string; headerRow?: number }) {
    setBusy(true); setError('');
    try {
      const result = await inspectStudentImport(nextFile, options);
      setInfo(result);
      setMapping(loadSavedMapping(result) ?? result.suggestedMapping);
      setPreview(null);
      setStep(1);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function runPreview() {
    if (!file || !info) return;
    setBusy(true); setError('');
    try {
      saveMapping(info, mapping);
      setPreview(await previewStudentImport(file, { sheet: info.sheet, headerRow: info.headerRow, mapping, defaults, universityIdSource: idSource }));
      setStep(2);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (!file || !info || !preview || preview.errorCount) return;
    setBusy(true); setError('');
    try {
      const result = await confirmStudentImport(file, { sheet: info.sheet, headerRow: info.headerRow, mapping, defaults, universityIdSource: idSource });
      setSuccess(`تمت العملية بنجاح: إضافة ${result.imported} وتحديث ${result.updated} طالب.`);
      setPreview(null); setFile(null); setInfo(null); setStep(0);
      onImported();
    } catch (cause) {
      setError(`${errorText(cause)} أعد معاينة الملف قبل المحاولة التالية.`);
      setPreview(null); setStep(1);
    } finally { setBusy(false); }
  }

  const groups = useMemo(() => info ? (['identity', 'contact', 'academic'] as const).map((group) => ({ group, fields: info.fields.filter((field) => field.group === group) })) : [], [info]);
  const usedColumns = useMemo(() => new Set(Object.values(mapping).filter((value): value is number => value !== null && value !== undefined)), [mapping]);
  const missingRequired = info ? info.fields.filter((field) => field.required && (mapping[field.key] === null || mapping[field.key] === undefined) && !(field.key === 'universityId' && idSource.mode !== 'column')) : [];

  const placement = catalog ? {
    departments: catalog.departments.filter((item) => item.collegeId === defaults.collegeId),
    programs: catalog.programs.filter((item) => item.departmentId === defaults.departmentId),
    plans: catalog.plans.filter((item) => item.programId === defaults.programId),
    years: catalog.years.filter((item) => item.studyPlanId === defaults.studyPlanId),
    semesters: catalog.semesters.filter((item) => item.academicYearId === defaults.academicYearId),
  } : null;
  const setDefault = (key: keyof ImportDefaults, value: string, reset: Array<keyof ImportDefaults> = []) =>
    setDefaults((current) => ({ ...current, [key]: value || undefined, ...Object.fromEntries(reset.map((item) => [item, undefined])) }));

  const selectField = (label: string, key: keyof ImportDefaults, items: Array<{ id: string; label: string }>, disabled: boolean, reset: Array<keyof ImportDefaults>) => (
    <TextField select size="small" fullWidth label={label} value={defaults[key] ?? NONE} disabled={disabled} onChange={(event) => setDefault(key, event.target.value, reset)}>
      <MenuItem value={NONE}>— بدون —</MenuItem>
      {items.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
    </TextField>
  );

  const close = () => { if (!busy) { reset(); onClose(); } };

  return <Dialog open={open} onClose={close} fullWidth maxWidth="lg">
    <DialogTitle>استيراد الطلاب من Excel</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        <Stepper activeStep={step} alternativeLabel>{STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {step === 0 && <>
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>شروط الاستيراد</Typography>
            <Box component="ul" sx={{ m: 0, pr: 2.5 }}>
              {(info?.rules ?? [
                'صيغة الملف: مصنف Excel (.xlsx)، وحجمه حتى 10 ميغابايت، وحتى 5000 طالب في المرة الواحدة. لا يهم اسم الملف.',
                'لا يشترط تعديل أسماء الأعمدة أو ترتيبها ولا اسم ورقة العمل: تربط الأعمدة بحقول المنظومة في الخطوة التالية.',
                'الحقول المطلوبة لإنشاء طالب جديد: الرقم الجامعي، الاسم الأول، اسم الأب، اسم العائلة، اسم الأم، الرقم الوطني، رقم الاكتتاب، مكان الولادة.',
                'الرقم الوطني 11 رقماً، والهاتف السوري 10 أرقام يبدأ بـ 09، والجنس ذكر أو أنثى، والتواريخ بصيغة YYYY-MM-DD أو DD/MM/YYYY.',
                'لربط الطالب بخطته يلزم الكلية والبرنامج والخطة والمستوى والفصل، بأعمدة بالملف أو بقيم افتراضية تختارها في الخطوة التالية.',
                'الرقم الجامعي الموجود مسبقاً يحدّث بيانات الطالب، والحقول الفارغة لا تمسح البيانات الحالية.',
                'تظهر كل الأخطاء دفعة واحدة مع الصف والعمود والسبب، ولا يتم الاستيراد إلا بعد المعاينة.',
              ]).map((rule) => <li key={rule}><Typography variant="body2">{rule}</Typography></li>)}
            </Box>
          </Alert>
          <Button component="a" href="/templates/students-temp.xlsx" download="قالب-استيراد-الطلاب-مؤقت.xlsx" variant="outlined">تنزيل قالب جاهز (اختياري)</Button>
          <Button component="label" variant="contained" disabled={busy}>
            {busy ? <CircularProgress size={20} color="inherit" /> : 'اختيار ملف Excel'}
            <input type="file" hidden onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              event.target.value = '';
              setSuccess('');
              if (chosen) { setFile(chosen); void inspect(chosen); }
            }} />
          </Button>
        </>}

        {step === 1 && info && <>
          <Typography variant="body2" color="text.secondary">الملف: {file?.name} — {info.dataRowCount} صف بيانات</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select size="small" label="ورقة العمل" value={info.sheet} sx={{ minWidth: 220 }}
              onChange={(event) => file && void inspect(file, { sheet: event.target.value })}>
              {info.sheets.map((sheet) => <MenuItem key={sheet.name} value={sheet.name}>{sheet.name} ({sheet.rowCount} صف)</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="رقم صف العناوين" value={info.headerRow} sx={{ width: 180 }}
              slotProps={{ htmlInput: { min: 1 } }}
              onChange={(event) => { const row = Number(event.target.value); if (file && row >= 1) void inspect(file, { sheet: info.sheet, headerRow: row }); }} />
          </Stack>
          {missingRequired.length > 0 && <Alert severity="warning">
            حقول مطلوبة غير مربوطة بعد: {missingRequired.map((field) => field.label).join('، ')}. اربطها بالأعمدة المناسبة (أو ستظهر كخطأ في المعاينة).
          </Alert>}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>مصدر الرقم الجامعي</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              إذا كان ملف الطلاب لا يحتوي على الرقم الجامعي (يعطيه الجامعة عادةً)، اختر من أين يؤخذ. الطالب الموجود بنفس الرقم الوطني يحتفظ برقمه.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select size="small" label="مصدر الرقم الجامعي" value={idSource.mode} sx={{ minWidth: 300 }}
                onChange={(event) => setIdSource((current) => ({ ...current, mode: event.target.value as UniversityIdSource['mode'] }))}>
                <MenuItem value="column">عمود في الملف (يُربط بالأسفل)</MenuItem>
                <MenuItem value="applicationNumber">استخدام رقم الاكتتاب كرقم جامعي</MenuItem>
                <MenuItem value="generate">توليد تلقائي: بادئة + رقم تسلسلي</MenuItem>
              </TextField>
              {idSource.mode === 'generate' && <TextField size="small" label="بادئة الرقم الجامعي" value={idSource.prefix ?? ''} sx={{ width: 220 }}
                helperText="مثال: 2026 فيصير 20260001"
                onChange={(event) => setIdSource((current) => ({ ...current, prefix: event.target.value }))} />}
            </Stack>
          </Box>
          {groups.map(({ group, fields }) => <Box key={group}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{GROUP_LABELS[group]}</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell sx={{ width: '28%' }}>حقل المنظومة</TableCell><TableCell sx={{ width: '32%' }}>عمود الملف</TableCell><TableCell>أمثلة من الملف</TableCell></TableRow></TableHead>
              <TableBody>{fields.map((field) => {
                const column = mapping[field.key];
                const selected = info.columns.find((item) => item.index === column);
                return <TableRow key={field.key}>
                  <TableCell>{field.label} {field.required && <Chip size="small" color="warning" label="مطلوب" sx={{ ml: 0.5 }} />}</TableCell>
                  <TableCell>
                    <TextField select size="small" fullWidth value={column === null || column === undefined ? NONE : String(column)}
                      onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value === NONE ? null : Number(event.target.value) }))}>
                      <MenuItem value={NONE}>— غير مربوط —</MenuItem>
                      {info.columns.map((item) => <MenuItem key={item.index} value={String(item.index)} disabled={usedColumns.has(item.index) && item.index !== column}>
                        {item.header || `العمود ${item.letter}`} ({item.letter})
                      </MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{selected?.samples.join(' | ') || '—'}</Typography></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          </Box>)}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>القيم الافتراضية للربط الأكاديمي (اختياري)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              تُطبَّق على الطلاب الجدد الذين لا يحمل ملفهم هذه القيم، ولا تغيّر خطة طالب موجود.
            </Typography>
            {catalog && placement ? <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {selectField('الكلية', 'collegeId', catalog.colleges.map((item) => ({ id: item.id, label: item.nameAr })), false, ['departmentId', 'programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
              {selectField('القسم / الاختصاص', 'departmentId', placement.departments.map((item) => ({ id: item.id, label: item.nameAr })), !defaults.collegeId, ['programId', 'studyPlanId', 'academicYearId', 'semesterId'])}
              {selectField('البرنامج', 'programId', placement.programs.map((item) => ({ id: item.id, label: item.nameAr })), !defaults.departmentId, ['studyPlanId', 'academicYearId', 'semesterId'])}
              {selectField('الخطة الدراسية', 'studyPlanId', placement.plans.map((item) => ({ id: item.id, label: studyPlanLabel(item) })), !defaults.programId, ['academicYearId', 'semesterId'])}
              {selectField('المستوى الأكاديمي', 'academicYearId', placement.years.map((item) => ({ id: item.id, label: item.nameAr })), !defaults.studyPlanId, ['semesterId'])}
              {selectField('الفصل الدراسي', 'semesterId', placement.semesters.map((item) => ({ id: item.id, label: item.nameAr })), !defaults.academicYearId, [])}
            </Box> : <CircularProgress size={22} />}
          </Box>
        </>}

        {step === 2 && preview && <>
          <Alert severity={preview.errorCount ? 'warning' : 'success'}>
            إجمالي الصفوف: {preview.total} | الصالحة: {preview.validCount} (إضافة {preview.validCount - preview.updateCount}، تحديث {preview.updateCount}) | الصفوف التي فيها أخطاء: {preview.errorCount} | عدد الأخطاء: {preview.problemCount} | المكررة داخل الملف: {preview.duplicateCount}
          </Alert>
          {preview.notes?.map((note) => <Alert key={note} severity="info">{note}</Alert>)}
          {preview.errors.length > 0 && <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>الأخطاء ({preview.errors.length})</Typography>
              <Button size="small" onClick={() => downloadErrors(preview.errors)}>تنزيل تقرير الأخطاء CSV</Button>
            </Stack>
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>الصف</TableCell><TableCell>الرقم الجامعي</TableCell><TableCell>العمود</TableCell><TableCell>سبب الخطأ</TableCell></TableRow></TableHead>
                <TableBody>{preview.errors.slice(0, 500).map((item, index) => <TableRow key={`${item.rowNumber}-${index}`}>
                  <TableCell>{item.rowNumber || 'الملف كله'}</TableCell><TableCell>{item.universityId || '—'}</TableCell><TableCell>{item.column ?? '—'}</TableCell><TableCell>{item.message}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
              {preview.errors.length > 500 && <Typography variant="caption">تُعرض أول 500 خطأ، وتقرير CSV يحتوي كلها.</Typography>}
            </Box>
          </>}
          {preview.rows.length > 0 && <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>معاينة الصفوف الصالحة</Typography>
            <Table size="small"><TableHead><TableRow><TableCell>الصف</TableCell><TableCell>العملية</TableCell><TableCell>الرقم الجامعي</TableCell><TableCell>الاسم</TableCell><TableCell>الكلية</TableCell><TableCell>البرنامج</TableCell></TableRow></TableHead>
              <TableBody>{preview.rows.slice(0, 30).map((item) => <TableRow key={item.rowNumber}><TableCell>{item.rowNumber}</TableCell><TableCell>{item.action}</TableCell><TableCell>{item.universityId}</TableCell><TableCell>{item.name}</TableCell><TableCell>{item.college || '—'}</TableCell><TableCell>{item.program || '—'}</TableCell></TableRow>)}</TableBody>
            </Table>
            {preview.rows.length > 30 && <Typography variant="caption">تُعرض أول 30 نتيجة من أصل {preview.rows.length}.</Typography>}
          </Box>}
        </>}
      </Stack>
    </DialogContent>
    <DialogActions>
      {step === 2 && <Button disabled={busy} onClick={() => setStep(1)}>رجوع لمطابقة الأعمدة</Button>}
      {step === 1 && <Button disabled={busy} onClick={() => { setStep(0); setInfo(null); setFile(null); }}>تغيير الملف</Button>}
      {step === 1 && <Button variant="contained" disabled={busy || !info} onClick={() => void runPreview()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : 'معاينة وفحص البيانات'}
      </Button>}
      {step === 2 && preview && <Button variant="contained" color="success" disabled={busy || preview.errorCount > 0 || preview.validCount === 0} onClick={() => void importRows()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : `تأكيد إضافة وتحديث ${preview.validCount} طالب`}
      </Button>}
      <Button disabled={busy} onClick={close}>إغلاق</Button>
    </DialogActions>
  </Dialog>;
}
