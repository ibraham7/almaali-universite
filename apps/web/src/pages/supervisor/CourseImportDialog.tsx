import { useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { confirmCourseImport, downloadCourseTemplate, previewCourseImport, type CourseImportPreview, type CourseImportResult, type CourseRowAction } from '../../api/courseImports';

const ACTION_LABEL: Record<CourseRowAction, string> = { NEW: 'جديد', UPDATE: 'تحديث', UNCHANGED: 'بلا تغيير', SKIPPED: 'موجود (متجاوز)', ERROR: 'خطأ' };
const ACTION_COLOR: Record<CourseRowAction, 'success' | 'info' | 'default' | 'warning' | 'error'> = { NEW: 'success', UPDATE: 'info', UNCHANGED: 'default', SKIPPED: 'warning', ERROR: 'error' };

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
  }
  return 'تعذر تنفيذ العملية.';
}

// استيراد المقررات من ملف Excel: اختر الملف، عاين النتيجة (جديد/تحديث/أخطاء)، ثم أكّد.
export default function CourseImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [preview, setPreview] = useState<CourseImportPreview | null>(null);
  const [result, setResult] = useState<CourseImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const options = { updateExisting, skipInvalid };

  async function runPreview(nextFile = file, nextOptions = options) {
    if (!nextFile) return;
    setBusy(true); setError(''); setResult(null);
    try { setPreview(await previewCourseImport(nextFile, nextOptions)); } catch (cause) { setPreview(null); setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!file) return;
    setBusy(true); setError('');
    try { setResult(await confirmCourseImport(file, options)); setPreview(null); onImported(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function template() {
    try {
      const url = URL.createObjectURL(await downloadCourseTemplate());
      const link = document.createElement('a');
      link.href = url; link.download = 'قالب-استيراد-المقررات.xlsx'; link.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(errorText(cause)); }
  }
  const totals = preview?.totals;
  const importable = totals ? totals.new + totals.update + (preview?.rows.some((row) => row.action === 'UNCHANGED' && row.prerequisites.length > 0) ? 1 : 0) : 0;
  const blocked = Boolean(totals && totals.errors > 0 && !skipInvalid);

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="course-import-title">
      <DialogTitle id="course-import-title">استيراد المقررات من Excel</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          {result && (
            <Alert severity="success">
              تم الاستيراد: {result.created} مقرر جديد، {result.updated} محدَّث، {result.prerequisitesAdded} متطلب سابق مضاف
              {result.skippedExisting ? `، ${result.skippedExisting} موجود تم تجاوزه` : ''}{result.invalidRows ? `، ${result.invalidRows} صف خاطئ تم تجاوزه` : ''}.
            </Alert>
          )}
          <Typography color="text.secondary" variant="body2">
            الأعمدة المطلوبة: رمز المقرر، اسم المقرر، الساعات المعتمدة. الباقي اختياري (الاسم بالإنجليزية، ECTS، النوع، طبيعة المقرر، الوصف، الحالة، المتطلبات السابقة). المقررات تُضاف إلى كتالوج المقررات، ثم تُربط بالخطط من «الخطط الدراسية».
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="outlined" onClick={() => void template()}>تنزيل القالب</Button>
            <Button variant="contained" onClick={() => input.current?.click()} disabled={busy}>{file ? 'تغيير الملف' : 'اختيار ملف Excel'}</Button>
            <input ref={input} type="file" hidden accept=".xlsx" onChange={(event) => { const picked = event.target.files?.[0] ?? null; event.target.value = ''; setFile(picked); setResult(null); setPreview(null); if (picked) void runPreview(picked); }} />
            {file && <Typography variant="body2" sx={{ fontWeight: 700 }}>{file.name}</Typography>}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <FormControlLabel control={<Switch checked={updateExisting} onChange={(event) => { setUpdateExisting(event.target.checked); if (file) void runPreview(file, { updateExisting: event.target.checked, skipInvalid }); }} />} label="تحديث المقررات الموجودة (بنفس الرمز)" />
            <FormControlLabel control={<Switch checked={skipInvalid} onChange={(event) => setSkipInvalid(event.target.checked)} />} label="تجاوز الصفوف الخاطئة واستيراد الباقي" />
          </Stack>

          {totals && (
            <>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip label={`الصفوف: ${totals.rows}`} />
                <Chip color="success" label={`جديد: ${totals.new}`} />
                <Chip color="info" label={`تحديث: ${totals.update}`} />
                <Chip label={`بلا تغيير: ${totals.unchanged}`} />
                <Chip color="warning" label={`موجود (متجاوز): ${totals.skipped}`} />
                <Chip color={totals.errors ? 'error' : 'default'} label={`أخطاء: ${totals.errors}`} />
              </Stack>
              {totals.skipped > 0 && !updateExisting && <Alert severity="info">{totals.skipped} مقرر موجود بنفس الرمز سيُتجاوز. فعّل «تحديث المقررات الموجودة» لتعديلها من الملف.</Alert>}
              {totals.errors > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 180, overflow: 'auto' }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>الأخطاء</Typography>
                  {preview?.errors.map((item, index) => <Typography key={`${item.rowNumber}-${index}`} variant="body2" color="error">الصف {item.rowNumber}{item.code ? ` (${item.code})` : ''}{item.column ? ` — ${item.column}` : ''}: {item.message}</Typography>)}
                </Paper>
              )}
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader aria-label="معاينة الاستيراد">
                  <TableHead><TableRow><TableCell>الصف</TableCell><TableCell>الرمز</TableCell><TableCell>الاسم</TableCell><TableCell>الإجراء</TableCell><TableCell>التفاصيل</TableCell></TableRow></TableHead>
                  <TableBody>
                    {preview?.rows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell><TableCell sx={{ fontWeight: 700 }}>{row.code}</TableCell><TableCell>{row.nameAr}</TableCell>
                        <TableCell><Chip size="small" color={ACTION_COLOR[row.action]} label={ACTION_LABEL[row.action]} /></TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>{row.changes.length ? row.changes.join('، ') : ''}{row.prerequisites.length ? <Box component="div" sx={{ fontSize: 12, color: 'text.secondary' }}>متطلبات: {row.prerequisites.join('، ')}</Box> : null}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {preview?.truncated && <Typography variant="caption" color="text.secondary">المعروض أول 400 صف فقط، والاستيراد يشمل كل الصفوف.</Typography>}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{result ? 'إغلاق' : 'إلغاء'}</Button>
        {preview && !result && <Button variant="contained" onClick={() => void confirm()} disabled={busy || blocked || importable === 0}>{busy ? 'جارٍ الاستيراد...' : blocked ? 'صحّح الأخطاء أو فعّل التجاوز' : 'تأكيد الاستيراد'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
