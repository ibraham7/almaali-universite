import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  createMyAffairsRequest, getMyAffairsRequest, getMyAffairsRequests, getMyAffairsServices,
  type StudentMyRequest, type StudentMyRequestDetails,
} from '../../api/affairs';
import { errorText, formatDate } from '../affairs/affairsUi';
import { StatusChip, Timeline } from '../affairs/AffairsBits';

export default function StudentRequestsPage() {
  const [rows, setRows] = useState<StudentMyRequest[]>([]);
  const [services, setServices] = useState<Awaited<ReturnType<typeof getMyAffairsServices>>>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [detail, setDetail] = useState<StudentMyRequestDetails | null>(null);

  const load = useCallback(() => getMyAffairsRequests()
    .then((list) => { setRows(list); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل طلباتك.'))), []);
  useEffect(() => { void load(); getMyAffairsServices().then(setServices).catch(() => undefined); }, [load]);

  async function submit() {
    setBusy(true); setDialogError('');
    try {
      const created = await createMyAffairsRequest({ serviceId, subject: subject.trim(), details: details.trim() || undefined });
      setCreating(false); setServiceId(''); setSubject(''); setDetails('');
      setMessage(`تم تقديم طلبك برقم ${created.number}.`);
      await load();
    } catch (cause) { setDialogError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function open(id: string) {
    try { setDetail(await getMyAffairsRequest(id)); } catch (cause) { setError(errorText(cause, 'تعذر تحميل الطلب.')); }
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>طلباتي</Typography>
        <Button variant="contained" onClick={() => { setDialogError(''); setCreating(true); }}>طلب جديد</Button>
      </Stack>
      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="طلباتي">
          <TableHead><TableRow><TableCell>الرقم</TableCell><TableCell>الخدمة</TableCell><TableCell>الموضوع</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => void open(r.id)}>
                <TableCell sx={{ fontWeight: 700 }}>{r.number}</TableCell>
                <TableCell>{r.service.nameAr}</TableCell>
                <TableCell>{r.subject ?? '—'}</TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>لم تقدّم أي طلب بعد.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={creating} onClose={busy ? undefined : () => setCreating(false)} fullWidth maxWidth="sm">
        <DialogTitle>طلب جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <TextField select label="الخدمة" value={serviceId} onChange={(e) => setServiceId(e.target.value)}
              helperText={selectedService ? `المدة المتوقعة: ${selectedService.expectedDays} أيام${selectedService.description ? ' — ' + selectedService.description : ''}` : undefined}>
              {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}
            </TextField>
            <TextField label="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <TextField label="التفاصيل" multiline minRows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={submit} disabled={busy || !serviceId || !subject.trim()}>تقديم الطلب</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detail && <>طلب {detail.number} <StatusChip status={detail.status} /></>}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2"><b>الخدمة:</b> {detail.service.nameAr}</Typography>
                <Typography variant="body2"><b>الموعد المتوقع:</b> {formatDate(detail.dueAt)}</Typography>
                {detail.subject && <Typography sx={{ fontWeight: 700, mt: 1 }}>{detail.subject}</Typography>}
                {detail.details && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{detail.details}</Typography>}
              </Box>
              {detail.decisionReason && <Alert severity="info">السبب: {detail.decisionReason}</Alert>}
              <Typography sx={{ fontWeight: 700 }}>متابعة الطلب</Typography>
              <Timeline events={detail.events} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>إغلاق</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
