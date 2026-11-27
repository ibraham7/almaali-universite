import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import axios from 'axios';
import { getColleges, type College } from '../../api/academicStructure';
import { transferStudentCollege } from '../../api/students';

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    return Array.isArray(message) ? message.join('، ') : typeof message === 'string' ? message : 'تعذر تنفيذ النقل.';
  }
  return 'تعذر تنفيذ النقل.';
}

export default function TransferCollegeDialog({ open, student, onClose, onDone }: {
  open: boolean;
  student: { id: string; universityId: string; name: string; collegeId?: string | null } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [reason, setReason] = useState('');
  const [year, setYear] = useState('');
  const [needsYear, setNeedsYear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    getColleges().then((items) => { if (active) setColleges(items.filter((item) => item.isActive !== false)); }).catch(() => { if (active) setError('تعذر تحميل الكليات.'); });
    return () => { active = false; };
  }, [open]);

  const close = () => { if (!busy) { setCollegeId(''); setReason(''); setYear(''); setNeedsYear(false); setError(''); onClose(); } };

  async function transfer() {
    if (!student) return;
    setBusy(true); setError('');
    try {
      const result = await transferStudentCollege(student.id, {
        collegeId, reason: reason.trim() || undefined, ...(year ? { admissionYear: Number(year) } : {}),
      });
      onDone(`تم نقل الطالب إلى ${result.college}. الرقم الجامعي الجديد ${result.universityId} (السابق ${result.previousUniversityId} محفوظ بسجل الطالب).`);
      setCollegeId(''); setReason(''); setYear(''); setNeedsYear(false);
      onClose();
    } catch (cause) {
      const text = errorText(cause);
      if (text.includes('أدخل سنة القبول')) setNeedsYear(true);
      setError(text);
    } finally { setBusy(false); }
  }

  const target = colleges.find((college) => college.id === collegeId);
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
    <DialogTitle>نقل الطالب إلى كلية أخرى</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Alert severity="info">
          {student ? `${student.name} — ${student.universityId}. ` : ''}
          سيأخذ الطالب رقماً جامعياً جديداً برمز الكلية الجديدة (وسنة القبول الأصلية نفسها)، ويُحفظ رقمه القديم بسجله، وتبقى كل سجلاته مرتبطة به. تسجيل الدخول يصير بالرقم الجديد. تُفكّ خطته الحالية ويعود «بانتظار اعتماد التسجيل» ليُربط بخطة الكلية الجديدة، ويُلغى ارتباطه بالمرشد.
        </Alert>
        <TextField select required label="الكلية الجديدة" value={collegeId} onChange={(event) => setCollegeId(event.target.value)}>
          {colleges.filter((college) => college.id !== student?.collegeId).map((college) => (
            <MenuItem key={college.id} value={college.id}>{college.nameAr}{college.code ? ` (رمز ${college.code})` : ' (بلا رمز)'}</MenuItem>
          ))}
        </TextField>
        {target && !target.code && <Alert severity="warning">هذه الكلية ليس لها رمز. أضف رمزها من «الهيكل الأكاديمي» أولاً.</Alert>}
        {needsYear && <TextField label="سنة القبول (4 خانات)" value={year} placeholder="2027" onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
          helperText="رقم الطالب الحالي لا يتبع صيغة (سنة + كلية + تسلسل)، فأدخل سنة قبوله لتوليد الرقم الجديد." />}
        <TextField label="سبب النقل (اختياري)" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={close}>إلغاء</Button>
      <Button variant="contained" color="warning" disabled={busy || !collegeId || Boolean(target && !target.code)} onClick={() => void transfer()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : 'تنفيذ النقل'}
      </Button>
    </DialogActions>
  </Dialog>;
}
