import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  createAffairsStaff, getAffairsMe, getAffairsServices, getAffairsStaff, getStaffCandidates, updateAffairsStaff,
  type AffairsServiceItem, type AffairsStaffItem, type StaffCandidate,
} from '../../api/affairs';
import { errorText } from './affairsUi';

type Form = { id?: string; userId: string; specialization: string; serviceIds: string[]; isManager: boolean };

export default function AffairsStaffTab({ role }: { role: string }) {
  const [staff, setStaff] = useState<AffairsStaffItem[]>([]);
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [candidates, setCandidates] = useState<StaffCandidate[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canManage, setCanManage] = useState(false);
  useEffect(() => { getAffairsMe().then((me) => setCanManage(me.canManage)).catch(() => undefined); }, []);

  const load = useCallback(() => Promise.all([getAffairsStaff(), getAffairsServices()])
    .then(([s, sv]) => { setStaff(s); setServices(sv); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الموظفين.'))), []);
  useEffect(() => { void load(); }, [load]);

  async function openAdd() {
    setDialogError('');
    try { setCandidates(await getStaffCandidates()); } catch (cause) { setDialogError(errorText(cause)); }
    setForm({ userId: '', specialization: '', serviceIds: [], isManager: false });
  }

  async function toggle(member: AffairsStaffItem) {
    try { await updateAffairsStaff(member.id, { isActive: !member.isActive }); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  async function save() {
    if (!form) return;
    setBusy(true); setDialogError('');
    try {
      if (form.id) await updateAffairsStaff(form.id, { specialization: form.specialization.trim(), serviceIds: form.serviceIds, ...(role === 'SYSTEM_ADMIN' ? { isManager: form.isManager } : {}) });
      else await createAffairsStaff({ userId: form.userId, specialization: form.specialization.trim() || undefined, serviceIds: form.serviceIds, isManager: form.isManager });
      setForm(null); await load();
    } catch (cause) { setDialogError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const serviceName = (id: string) => services.find((s) => s.id === id)?.nameAr ?? '—';

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Alert severity="info" sx={{ flex: 1, me: 2 }}>الموظف هو مستخدم بدور «مسجل». إضافة الموظف وتعيين مدير الوحدة لمدير النظام. إعادة توزيع الطلبات لمدير الوحدة أو مدير النظام من داخل الطلب.</Alert>
        {role === 'SYSTEM_ADMIN' && <Button variant="contained" onClick={() => void openAdd()}>إضافة موظف</Button>}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الموظفون">
          <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>الدور في الدائرة</TableCell><TableCell>الاختصاص</TableCell><TableCell>الخدمات</TableCell><TableCell>مفتوح</TableCell><TableCell>منجز</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell sx={{ fontWeight: 700 }}>{member.name}</TableCell>
                <TableCell>{member.isManager ? <Chip size="small" color="primary" label="مدير الوحدة" /> : 'موظف'}</TableCell>
                <TableCell>{member.specialization ?? '—'}</TableCell>
                <TableCell>{member.serviceIds.length ? member.serviceIds.map((id) => <Chip key={id} size="small" label={serviceName(id)} sx={{ m: 0.25 }} />) : '—'}</TableCell>
                <TableCell>{member.open}</TableCell>
                <TableCell>{member.done}</TableCell>
                <TableCell><Switch checked={member.isActive} disabled={!canManage} onChange={() => void toggle(member)} slotProps={{ input: { 'aria-label': `تفعيل ${member.name}` } }} /></TableCell>
                <TableCell>{canManage && <Button size="small" onClick={() => { setDialogError(''); setForm({ id: member.id, userId: member.userId, specialization: member.specialization ?? '', serviceIds: member.serviceIds, isManager: member.isManager }); }}>تعديل</Button>}</TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا يوجد موظفون بعد.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {!canManage && <Typography variant="caption" color="text.secondary">إعادة التوزيع وتعديل الموظفين لمدير الوحدة أو مدير النظام فقط.</Typography>}

      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'تعديل موظف' : 'إضافة موظف'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {form && (<>
              {!form.id && (
                <TextField select label="المستخدم (دوره مسجل)" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  helperText={candidates.length === 0 ? 'لا يوجد مستخدمون بدور مسجل غير مضافين بعد.' : undefined}>
                  {candidates.map((c) => <MenuItem key={c.id} value={c.id}>{c.displayName || c.username || c.email}</MenuItem>)}
                </TextField>
              )}
              <TextField label="الاختصاص" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              {role === 'SYSTEM_ADMIN' && (
                <FormControlLabel label="مدير وحدة شؤون الطلاب (يسند الطلبات ويتابع حجم عمل الجميع)" control={<Checkbox checked={form.isManager} onChange={(e) => setForm({ ...form, isManager: e.target.checked })} />} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 700 }}>الخدمات المسندة</Typography>
              <Stack>
                {services.map((s) => (
                  <FormControlLabel key={s.id} label={s.nameAr + (s.isActive ? '' : ' (متوقفة)')}
                    control={<Checkbox checked={form.serviceIds.includes(s.id)} onChange={(e) => setForm({ ...form, serviceIds: e.target.checked ? [...form.serviceIds, s.id] : form.serviceIds.filter((x) => x !== s.id) })} />} />
                ))}
              </Stack>
            </>)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={save} disabled={busy || !form || (!form.id && !form.userId)}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
