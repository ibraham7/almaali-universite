import { useEffect, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { cancelReferral, createReferral, getAffairsAdvisorOptions, getAffairsCollegeOptions, respondReferral, type ReferralItem, type ReferralOutcome, type RequestDetails } from '../../api/affairs';
import { MODE_LABEL, REFERRAL_OUTCOME_LABEL, REFERRAL_STATUS_LABEL, TARGET_LABEL, errorText, formatDate } from './affairsUi';

const OPINION_OUTCOMES: ReferralOutcome[] = ['APPROVED', 'REJECTED', 'NOTES', 'NEEDS_INFO'];
const EXECUTION_OUTCOMES: ReferralOutcome[] = ['DONE', 'NOT_DONE'];

function label(r: ReferralItem) {
  return r.targetName ? `${TARGET_LABEL[r.target]} (${r.targetName})` : TARGET_LABEL[r.target];
}

// Referrals of one request: history, the pending one (record the answer / cancel) and a form to send a new one.
export default function ReferralPanel({ data, onChanged }: { data: RequestDetails; onChanged: () => void }) {
  const pending = data.pendingReferral;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ open: false, mode: 'OPINION', target: 'ACADEMIC_AFFAIRS', targetName: '', reason: '', requested: '', dueInDays: '', collegeId: '', advisorUserId: '', decisionAllowed: true });
  const [colleges, setColleges] = useState<Array<{ id: string; nameAr: string }>>([]);
  const [advisors, setAdvisors] = useState<Array<{ id: string; name: string }>>([]);
  const [outcome, setOutcome] = useState<ReferralOutcome | ''>('');
  const [note, setNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  async function run(work: () => Promise<unknown>, after?: () => void) {
    setBusy(true); setError('');
    try { await work(); after?.(); onChanged(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  const toCollege = form.target === 'COLLEGE';
  const needsName = form.target === 'OTHER';
  useEffect(() => { if (form.open && toCollege && colleges.length === 0) getAffairsCollegeOptions().then(setColleges).catch(() => undefined); }, [form.open, toCollege, colleges.length]);
  const pickedCollege = form.collegeId;
  useEffect(() => {
    let active = true;
    if (!toCollege || !pickedCollege) return undefined;
    getAffairsAdvisorOptions(pickedCollege).then((list) => { if (active) setAdvisors(list); }).catch(() => { if (active) setAdvisors([]); });
    return () => { active = false; };
  }, [toCollege, pickedCollege]);
  // A new request nobody took yet can be referred too: the staff member who refers it takes it, an admin refers it as is.
  const canSend = !pending && ((data.canAct && ['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(data.status) && (Boolean(data.assignedStaff) || data.canTake)) || (data.canTake && data.status === 'NEW'));
  // الملكية: الإحالة لا تنقل المعاملة إلى أحد، فلا تُحال معاملة بلا مالك.
  const needsOwner = !pending && data.canAct && !data.assignedStaff && !data.canTake && ['NEW'].includes(data.status);
  const outcomes = pending?.mode === 'EXECUTION' ? EXECUTION_OUTCOMES : OPINION_OUTCOMES;
  const noteRequired = outcome === 'REJECTED' || outcome === 'NOT_DONE';

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontWeight: 700 }}>الإحالات</Typography>
      <Typography variant="body2" color="text.secondary">الإحالة لا تنقل ملكية المعاملة: يبقى {data.assignedStaff?.name ?? 'الموظف المسؤول'} مالكها الأساسي حتى إغلاقها.</Typography>
      {needsOwner && <Alert severity="info">أسند الطلب إلى موظف مسؤول أولاً، ثم يمكن إحالته.</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {data.referrals.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد إحالات.</Typography>}
      {data.referrals.map((r) => (
        <Box key={r.id} sx={{ border: 1, borderColor: r.status === 'PENDING' ? 'secondary.main' : 'divider', borderRadius: 1, p: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{label(r)} — {MODE_LABEL[r.mode]} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({REFERRAL_STATUS_LABEL[r.status]})</Box></Typography>
          <Typography variant="body2">السبب: {r.reason}</Typography>
          {r.requested && <Typography variant="body2">المطلوب: {r.requested}</Typography>}
          <Typography variant="caption" color="text.secondary">أُرسلت {formatDate(r.createdAt, true)}{r.dueAt ? ` · المدة المستهدفة حتى ${formatDate(r.dueAt)}` : ''}</Typography>
          {r.outcome && <Typography variant="body2" sx={{ mt: 0.5 }}>الرد: <b>{REFERRAL_OUTCOME_LABEL[r.outcome]}</b>{r.responseNote ? ` — ${r.responseNote}` : ''} <Box component="span" sx={{ color: 'text.secondary' }}>({formatDate(r.respondedAt, true)})</Box></Typography>}
          {r.cancelReason && <Typography variant="body2">سبب الإلغاء: {r.cancelReason}</Typography>}
        </Box>
      ))}

      {pending && data.canAct && (
        <Stack spacing={1} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>تسجيل رد الجهة: {label(pending)}</Typography>
          <TextField select size="small" label="نتيجة الرد" value={outcome} onChange={(e) => setOutcome(e.target.value as ReferralOutcome)}>
            {outcomes.map((o) => <MenuItem key={o} value={o}>{REFERRAL_OUTCOME_LABEL[o]}</MenuItem>)}
          </TextField>
          <TextField size="small" multiline minRows={2} label={noteRequired ? 'السبب (مطلوب)' : 'ملاحظة الجهة (اختياري)'} value={note} onChange={(e) => setNote(e.target.value)} />
          <Box><Button variant="contained" disabled={busy || !outcome || (noteRequired && !note.trim())}
            onClick={() => run(() => respondReferral(pending.id, { outcome, note: note.trim() || undefined }), () => { setOutcome(''); setNote(''); })}>حفظ الرد</Button></Box>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="سبب إلغاء الإحالة" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="outlined" color="warning" disabled={busy || !cancelReason.trim()} onClick={() => run(() => cancelReferral(pending.id, { reason: cancelReason.trim() }), () => setCancelReason(''))}>إلغاء الإحالة</Button>
          </Stack>
        </Stack>
      )}

      {canSend && !form.open && <Box><Button variant="outlined" onClick={() => setForm({ ...form, open: true })}>إحالة الطلب إلى جهة</Button></Box>}
      {canSend && form.open && (
        <Stack spacing={1} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
          <TextField select size="small" label="نوع الإحالة" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <MenuItem value="OPINION">{MODE_LABEL.OPINION} (تعود المعاملة إليّ بعد الرد)</MenuItem>
            <MenuItem value="EXECUTION" disabled={toCollege}>{MODE_LABEL.EXECUTION} (الجهة تتم الإجراء)</MenuItem>
          </TextField>
          <TextField select size="small" label="الجهة" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value, mode: e.target.value === 'COLLEGE' ? 'OPINION' : form.mode, collegeId: '', advisorUserId: '' })}>
            {(Object.keys(TARGET_LABEL) as (keyof typeof TARGET_LABEL)[]).map((t) => <MenuItem key={t} value={t}>{TARGET_LABEL[t]}</MenuItem>)}
          </TextField>
          {needsName && <TextField size="small" label="اسم الجهة (مطلوب)" value={form.targetName} onChange={(e) => setForm({ ...form, targetName: e.target.value })} />}
          {toCollege && (
            <>
              <TextField select size="small" label="الكلية (مطلوبة)" value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value, advisorUserId: '' })}>
                {colleges.map((c) => <MenuItem key={c.id} value={c.id}>{c.nameAr}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="المشرف (اختياري)" value={form.advisorUserId} disabled={!form.collegeId} onChange={(e) => setForm({ ...form, advisorUserId: e.target.value })}
                helperText={form.collegeId ? (advisors.length ? 'اتركه فارغًا لتصل الإحالة لكل مشرفي الكلية.' : 'لا مشرفين مسندين لهذه الكلية بعد، فلن يصل أحدًا. أسندهم من «المستخدمون والصلاحيات».') : undefined}>
                <MenuItem value="">كل مشرفي الكلية</MenuItem>
                {advisors.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <FormControlLabel control={<Switch checked={form.decisionAllowed} onChange={(e) => setForm({ ...form, decisionAllowed: e.target.checked })} />} label={form.decisionAllowed ? 'للمشرف الموافقة أو الرفض (رأي وموافقة)' : 'رأي فقط: ملاحظات أو طلب استكمال بلا موافقة أو رفض'} />
            </>
          )}
          <TextField size="small" multiline minRows={2} label="سبب الإحالة (مطلوب)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <TextField size="small" label="المطلوب من الجهة" value={form.requested} onChange={(e) => setForm({ ...form, requested: e.target.value })} />
          <TextField size="small" type="number" label="المدة المستهدفة (أيام، اختياري)" value={form.dueInDays} onChange={(e) => setForm({ ...form, dueInDays: e.target.value })} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={busy || !form.reason.trim() || (needsName && !form.targetName.trim()) || (toCollege && !form.collegeId)}
              onClick={() => run(() => createReferral(data.id, {
                mode: form.mode, target: form.target, targetName: needsName ? form.targetName.trim() : undefined, reason: form.reason.trim(),
                requested: form.requested.trim() || undefined, dueInDays: form.dueInDays ? Number(form.dueInDays) : undefined,
                ...(toCollege ? { collegeId: form.collegeId, advisorUserId: form.advisorUserId || undefined, decisionAllowed: form.decisionAllowed } : {}),
              }), () => setForm({ open: false, mode: 'OPINION', target: 'ACADEMIC_AFFAIRS', targetName: '', reason: '', requested: '', dueInDays: '', collegeId: '', advisorUserId: '', decisionAllowed: true }))}>إرسال الإحالة</Button>
            <Button onClick={() => setForm({ ...form, open: false })}>إلغاء</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
