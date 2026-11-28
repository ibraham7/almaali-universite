import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { getStuckRequests, setDelayReason, type StuckItem } from '../../api/affairs';
import AffairsRequestDialog from './AffairsRequestDialog';
import { StatusChip } from './AffairsBits';
import { errorText, formatDate } from './affairsUi';

// المعاملات المتعثرة (للمدير ومدير الوحدة): متأخرة، أو عالقة عند جهة أو بانتظار استكمال، أو بلا مالك. مع سبب التأخير ومكان تسجيله.
export default function AffairsStuckTab({ role }: { role: string }) {
  const [data, setData] = useState<{ total: number; withoutReason: number; items: StuckItem[] } | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StuckItem | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getStuckRequests().then((result) => { setData(result); setError(''); }).catch((cause) => setError(errorText(cause, 'تعذر تحميل المعاملات المتعثرة.'))), []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try { await setDelayReason(editing.id, reason.trim()); setEditing(null); await load(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info">معاملات مفتوحة تجاوزت موعدها، أو عند جهة أكثر من 3 أيام، أو بانتظار استكمال الطالب أكثر من 7 أيام، أو جديدة بلا مالك أكثر من يومين. سجّل سبب التأخير لكل معاملة ليظهر هنا وللمتابعة.</Alert>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {data && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Chip color={data.total ? 'warning' : 'success'} label={`متعثرة: ${data.total}`} />
          <Chip color={data.withoutReason ? 'error' : 'default'} variant={data.withoutReason ? 'filled' : 'outlined'} label={`بلا سبب مسجّل: ${data.withoutReason}`} />
        </Stack>
      )}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="المعاملات المتعثرة">
          <TableHead><TableRow><TableCell>الطلب</TableCell><TableCell>الطالب</TableCell><TableCell>الحالة</TableCell><TableCell>المالك</TableCell><TableCell>سبب التعثر</TableCell><TableCell>سبب التأخير المسجَّل</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{item.number}<br /><small>{item.serviceName}</small></TableCell>
                <TableCell>{item.studentName}<br /><small>{item.studentUniversityId}</small></TableCell>
                <TableCell><StatusChip status={item.status} /></TableCell>
                <TableCell>{item.owner ?? <Typography component="span" color="error" variant="body2">بلا مالك</Typography>}</TableCell>
                <TableCell>{item.reasons.map((r) => <Box key={r.kind} component="div" sx={{ fontSize: 13 }}>{r.label}</Box>)}</TableCell>
                <TableCell sx={{ maxWidth: 260 }}>{item.delayReason ? <><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.delayReason}</Typography><Typography variant="caption" color="text.secondary">{formatDate(item.delayReasonAt, true)}</Typography></> : <Typography variant="body2" color="warning.main">لم يُسجَّل</Typography>}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => { setEditing(item); setReason(item.delayReason ?? ''); }}>{item.delayReason ? 'تعديل السبب' : 'تسجيل السبب'}</Button>
                  <Button size="small" onClick={() => setOpenId(item.id)}>فتح</Button>
                </TableCell>
              </TableRow>
            ))}
            {data && data.items.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد معاملات متعثرة حاليًا.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(editing)} onClose={busy ? undefined : () => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>سبب التأخير — {editing?.number}</DialogTitle>
        <DialogContent><TextField autoFocus fullWidth multiline minRows={3} sx={{ mt: 1 }} label="سبب التأخير (داخلي، لا يراه الطالب)" value={reason} onChange={(event) => setReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} /></DialogContent>
        <DialogActions><Button onClick={() => setEditing(null)} disabled={busy}>إلغاء</Button><Button variant="contained" onClick={() => void save()} disabled={busy || !reason.trim()}>حفظ</Button></DialogActions>
      </Dialog>
      {openId && <AffairsRequestDialog requestId={openId} role={role} onClose={() => { setOpenId(null); void load(); }} onChanged={() => void load()} />}
    </Stack>
  );
}
