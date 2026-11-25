import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { createAffairsService, getAffairsServices, updateAffairsService, type AffairsServiceItem } from '../../api/affairs';
import { OUTCOME_SERVICE_LABEL, SERVICE_CHANNEL_LABEL, errorText } from './affairsUi';

type Form = { id?: string; code: string; nameAr: string; description: string; expectedDays: string; specialization: string; channel: string; outcome: string; attachmentsNote: string; feeNote: string; workflowNote: string };
const EMPTY: Form = { code: '', nameAr: '', description: '', expectedDays: '5', specialization: '', channel: 'BOTH', outcome: 'NONE', attachmentsNote: '', feeNote: '', workflowNote: '' };

export default function AffairsServicesTab() {
  const [items, setItems] = useState<AffairsServiceItem[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getAffairsServices()
    .then((list) => { setItems(list); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الخدمات.'))), []);
  useEffect(() => { void load(); }, [load]);

  async function toggle(item: AffairsServiceItem) {
    try { await updateAffairsService(item.id, { isActive: !item.isActive }); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  async function save() {
    if (!form) return;
    setBusy(true); setDialogError('');
    const body = { nameAr: form.nameAr.trim(), description: form.description.trim(), expectedDays: Number(form.expectedDays), specialization: form.specialization.trim(), channel: form.channel, outcome: form.outcome, attachmentsNote: form.attachmentsNote.trim(), feeNote: form.feeNote.trim(), workflowNote: form.workflowNote.trim() };
    try {
      if (form.id) await updateAffairsService(form.id, body);
      else await createAffairsService({ ...body, code: form.code.trim() });
      setForm(null); await load();
    } catch (cause) { setDialogError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Alert severity="info" sx={{ flex: 1, me: 2 }}>الخدمات لا تُحذف، يمكن إيقافها فقط.</Alert>
        <Button variant="contained" onClick={() => { setDialogError(''); setForm(EMPTY); }}>إضافة خدمة</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الخدمات">
          <TableHead><TableRow><TableCell>الخدمة</TableCell><TableCell>الرمز</TableCell><TableCell>قناة التقديم</TableCell><TableCell>النتيجة</TableCell><TableCell>الرسوم</TableCell><TableCell>المدة المتوقعة</TableCell><TableCell>الاختصاص</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontWeight: 700 }}>{item.nameAr}</TableCell>
                <TableCell>{item.code}</TableCell>
                <TableCell>{SERVICE_CHANNEL_LABEL[item.channel]}</TableCell>
                <TableCell>{OUTCOME_SERVICE_LABEL[item.outcome]}</TableCell>
                <TableCell>{item.feeNote ?? '—'}</TableCell>
                <TableCell>{item.expectedDays} أيام</TableCell>
                <TableCell>{item.specialization ?? '—'}</TableCell>
                <TableCell>
                  <Switch checked={item.isActive} onChange={() => void toggle(item)} slotProps={{ input: { 'aria-label': `تفعيل ${item.nameAr}` } }} />
                  <Chip size="small" label={item.isActive ? 'فعّالة' : 'متوقفة'} color={item.isActive ? 'success' : 'default'} />
                </TableCell>
                <TableCell><Button size="small" onClick={() => { setDialogError(''); setForm({ id: item.id, code: item.code, nameAr: item.nameAr, description: item.description ?? '', expectedDays: String(item.expectedDays), specialization: item.specialization ?? '', channel: item.channel, outcome: item.outcome, attachmentsNote: item.attachmentsNote ?? '', feeNote: item.feeNote ?? '', workflowNote: item.workflowNote ?? '' }); }}>تعديل</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'تعديل خدمة' : 'إضافة خدمة'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {form && (<>
              <TextField label="رمز الخدمة (أحرف إنجليزية كبيرة)" value={form.code} disabled={Boolean(form.id)} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <TextField label="اسم الخدمة" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              <TextField label="الوصف" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <TextField label="المدة المتوقعة (أيام)" type="number" value={form.expectedDays} onChange={(e) => setForm({ ...form, expectedDays: e.target.value })} />
              <TextField label="الاختصاص" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              <TextField select label="قناة التقديم" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} helperText="الطالب لا يرى الخدمة الحضورية في بوابته">
                {Object.entries(SERVICE_CHANNEL_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField select label="نتيجة الخدمة" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
                {Object.entries(OUTCOME_SERVICE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField label="المرفقات المطلوبة (نص يظهر للطالب)" value={form.attachmentsNote} onChange={(e) => setForm({ ...form, attachmentsNote: e.target.value })} />
              <TextField label="الرسوم (مثال: بدون رسوم، أو القيمة)" value={form.feeNote} onChange={(e) => setForm({ ...form, feeNote: e.target.value })} />
              <TextField label="مسار المعالجة (جهات المراجعة والموافقة)" multiline minRows={2} value={form.workflowNote} onChange={(e) => setForm({ ...form, workflowNote: e.target.value })} />
            </>)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={save} disabled={busy || !form?.nameAr.trim() || (!form?.id && !form?.code.trim())}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
