import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import axios from 'axios';
import { confirmStudentImport, previewStudentImport, type StudentImportPreview } from '../../api/studentImports';

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    return Array.isArray(message) ? message.join('، ') : typeof message === 'string' ? message : 'تعذر قراءة الملف.';
  }
  return 'تعذر قراءة الملف.';
}

function downloadErrors(errors: StudentImportPreview['errors']) {
  const csvCell = (value: string) => {
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [['رقم الصف', 'الرقم الجامعي', 'الخطأ'], ...errors.map((item) => [String(item.rowNumber), item.universityId, item.message])];
  const blob = new Blob(['\uFEFF', lines.map((line) => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'student-import-errors.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudentImportDialog({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setError('');
    setSuccess('');
  }

  async function inspect() {
    if (!file) return;
    setBusy(true);
    setError('');
    try { setPreview(await previewStudentImport(file)); }
    catch (cause) { setPreview(null); setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (!file || !preview || preview.errorCount) return;
    setBusy(true);
    setError('');
    try {
      const result = await confirmStudentImport(file);
      setSuccess(`تمت العملية بنجاح: إضافة ${result.imported} وتحديث ${result.updated} طالب.`);
      setPreview(null);
      setFile(null);
      onImported();
    } catch (cause) {
      setError(`${errorText(cause)} أعد معاينة الملف قبل المحاولة التالية.`);
      setPreview(null);
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onClose={busy ? undefined : () => { reset(); onClose(); }} fullWidth maxWidth="md">
    <DialogTitle>استيراد الطلاب من Excel</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        <Alert severity="info">استخدم هذا القالب وأدخل بيانات التحقق كما تظهر في سجل الجامعة؛ يحتاج الطالب إليها لإنشاء حسابه. الرقم الجامعي الموجود يحدّث بيانات الطالب، والحقول الاختيارية الفارغة لا تمسح البيانات الحالية.</Alert>
        <Button component="a" href="/templates/students-temp.xlsx" download="قالب-استيراد-الطلاب-مؤقت.xlsx" variant="outlined">تنزيل القالب المؤقت</Button>
        <Button component="label" variant="outlined" disabled={busy}>
          اختيار ملف Excel
          <input type="file" hidden accept=".xlsx" onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null); setError(''); setSuccess('');
            event.target.value = '';
          }} />
        </Button>
        {file && <Typography variant="body2">الملف: {file.name}</Typography>}
        <Button variant="contained" disabled={!file || busy} onClick={() => void inspect()}>
          {busy ? <CircularProgress size={20} color="inherit" /> : 'معاينة وفحص البيانات'}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {preview && <>
          <Alert severity={preview.errorCount ? 'warning' : 'success'}>
            إجمالي الصفوف: {preview.total} | الصالحة: {preview.validCount} (إضافة {preview.validCount - preview.updateCount}، تحديث {preview.updateCount}) | التي تحتوي أخطاء: {preview.errorCount} | المكررة داخل الملف: {preview.duplicateCount}
          </Alert>
          {preview.errors.length > 0 && <>
            <Button onClick={() => downloadErrors(preview.errors)}>تنزيل تقرير الأخطاء CSV</Button>
            <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
              <Table size="small"><TableHead><TableRow><TableCell>الصف</TableCell><TableCell>الرقم الجامعي</TableCell><TableCell>الخطأ</TableCell></TableRow></TableHead>
                <TableBody>{preview.errors.slice(0, 30).map((item) => <TableRow key={item.rowNumber}><TableCell>{item.rowNumber}</TableCell><TableCell>{item.universityId}</TableCell><TableCell>{item.message}</TableCell></TableRow>)}</TableBody>
              </Table>
            </Box>
          </>}
          {preview.rows.length > 0 && <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>معاينة الصفوف الصالحة</Typography>
            <Table size="small"><TableHead><TableRow><TableCell>الصف</TableCell><TableCell>العملية</TableCell><TableCell>الرقم الجامعي</TableCell><TableCell>الاسم</TableCell><TableCell>الكلية</TableCell><TableCell>البرنامج</TableCell></TableRow></TableHead>
              <TableBody>{preview.rows.slice(0, 30).map((item) => <TableRow key={item.rowNumber}><TableCell>{item.rowNumber}</TableCell><TableCell>{item.action}</TableCell><TableCell>{item.universityId}</TableCell><TableCell>{item.name}</TableCell><TableCell>{item.college || '—'}</TableCell><TableCell>{item.program || '—'}</TableCell></TableRow>)}</TableBody>
            </Table>
            {preview.rows.length > 30 && <Typography variant="caption">تُعرض أول 30 نتيجة من أصل {preview.rows.length}.</Typography>}
          </Box>}
          <Button variant="contained" color="success" disabled={busy || preview.errorCount > 0 || preview.validCount === 0} onClick={() => void importRows()}>
            تأكيد إضافة وتحديث {preview.validCount} طالب
          </Button>
        </>}
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={() => { reset(); onClose(); }}>إغلاق</Button></DialogActions>
  </Dialog>;
}
