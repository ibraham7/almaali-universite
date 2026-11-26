import { useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import axios from 'axios';
import { STUDENT_STATUS_LABEL, allowedStudentStatuses, changeStudentStatus, studentStatusLabel } from '../../api/students';

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    return Array.isArray(message) ? message.join('، ') : typeof message === 'string' ? message : 'تعذر تغيير الحالة.';
  }
  return 'تعذر تغيير الحالة.';
}

const WARNING: Record<string, string> = {
  WITHDRAWN: 'المنسحب يعود لاحقاً كطالب جديد بسجل جديد، ولا يعود بنفس السجل.',
  DISMISSED: 'المفصول يطّلع على بياناته فقط، ولا يسجّل مقررات ولا يقدّم طلبات. العودة بقرار استثنائي من مدير النظام.',
  DEREGISTERED: 'ترقين القيد نهائي: يطّلع الطالب على بياناته فقط، ولا يسجّل مقررات ولا يقدّم طلبات.',
  GRADUATED: 'التخرج نهائي. (سيتم لاحقاً تلقائياً عند استيفاء شروط التخرج.)',
  DEFERRED: 'المؤجل لا يستطيع تسجيل المقررات حتى يعود إلى «مستمر».',
};

// تغيير حالة الطالب الأكاديمية/الإدارية: الانتقالات المسموحة فقط، والسبب إلزامي.
export default function ChangeStudentStatusDialog({ open, student, role, onClose, onDone }: {
  open: boolean;
  student: { id: string; universityId: string; name: string; status: string; deferredUntil?: string | null } | null;
  role?: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = student ? allowedStudentStatuses(student.status, role) : [];
  const close = () => { if (!busy) { setStatus(''); setReason(''); setReturnDate(''); setError(''); onClose(); } };
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  async function save() {
    if (!student) return;
    setBusy(true); setError('');
    try {
      await changeStudentStatus(student.id, { status, reason: reason.trim(), ...(status === 'DEFERRED' ? { returnDate } : {}) });
      onDone(status === 'DEFERRED' && student.status === 'DEFERRED' ? `تم تعديل تاريخ عودة ${student.name} إلى ${returnDate}.` : `تم تغيير حالة ${student.name} إلى «${studentStatusLabel(status)}».${status === 'DEFERRED' ? ` يعود تلقائياً «مستمر» بتاريخ ${returnDate}.` : ''}`);
      setStatus(''); setReason(''); setReturnDate('');
      onClose();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
    <DialogTitle>تغيير حالة الطالب</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {student && <Alert severity="info">{`${student.name} — ${student.universityId}. الحالة الحالية: «${studentStatusLabel(student.status)}».`}</Alert>}
        {student && options.length === 0 && <Alert severity="warning">لا توجد انتقالات مسموحة من هذه الحالة لحسابك. بعض التغييرات قرارات استثنائية لا يقوم بها إلا مدير النظام، وبعضها نهائي.</Alert>}
        <TextField select required label="الحالة الجديدة" value={status} disabled={options.length === 0} onChange={(event) => setStatus(event.target.value)}>
          {options.map((value) => <MenuItem key={value} value={value}>{value === student?.status ? 'تعديل تاريخ العودة (يبقى مؤجلاً)' : STUDENT_STATUS_LABEL[value]}</MenuItem>)}
        </TextField>
        {WARNING[status] && <Alert severity="warning">{WARNING[status]}</Alert>}
        {status === 'DEFERRED' && <TextField required type="date" label="تاريخ العودة" value={returnDate} onChange={(event) => setReturnDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: tomorrow } }}
          helperText={student?.deferredUntil ? `التاريخ الحالي: ${student.deferredUntil.slice(0, 10)}. ` + 'عند هذا التاريخ يعود الطالب «مستمر» تلقائياً.' : 'عند هذا التاريخ يعود الطالب «مستمر» تلقائياً، ويستطيع بعدها تسجيل المقررات.'} />}
        <TextField required label="سبب التغيير" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={2}
          helperText="يُسجَّل السبب مع اسمك بسجل الطالب وسجل العمليات." slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={close}>إلغاء</Button>
      <Button variant="contained" disabled={busy || !status || !reason.trim() || (status === 'DEFERRED' && !returnDate)} onClick={() => void save()}>
        {busy ? <CircularProgress size={20} color="inherit" /> : 'تغيير الحالة'}
      </Button>
    </DialogActions>
  </Dialog>;
}
