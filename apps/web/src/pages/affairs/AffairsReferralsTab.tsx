import { useCallback, useEffect, useState } from 'react';
import { Alert, Chip, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getReferrals, type ReferralRow } from '../../api/affairs';
import AffairsRequestDialog from './AffairsRequestDialog';
import { MODE_LABEL, REFERRAL_OUTCOME_LABEL, REFERRAL_STATUS_LABEL, errorText, formatDate } from './affairsUi';

const FILTERS = [{ value: '', label: 'الكل' }, { value: 'PENDING', label: 'بانتظار الرد' }, { value: 'ANSWERED', label: 'تم الرد' }, { value: 'CANCELLED', label: 'ملغاة' }];

export default function AffairsReferralsTab({ role }: { role: string }) {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => getReferrals({ status: status || undefined, page })
    .then((r) => { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الإحالات.'))), [status, page]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      <Alert severity="info">الجهات المستقبلة ليس لها حسابات في النظام حالياً، فيسجّل الموظف المسؤول ردّها من الطلب. افتح الإحالة لتسجيل الرد.</Alert>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {FILTERS.map((f) => <Chip key={f.value} label={f.label} clickable color={status === f.value ? 'primary' : 'default'} variant={status === f.value ? 'filled' : 'outlined'} onClick={() => { setStatus(f.value); setPage(1); }} />)}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الإحالات">
          <TableHead><TableRow><TableCell>الطلب</TableCell><TableCell>الطالب</TableCell><TableCell>الجهة</TableCell><TableCell>النوع</TableCell><TableCell>الموظف الأصلي</TableCell><TableCell>الحالة</TableCell><TableCell>المدة المستهدفة</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r.requestId)}>
                <TableCell sx={{ fontWeight: 700 }}>{r.requestNumber}<br /><small>{r.serviceName}</small></TableCell>
                <TableCell>{r.studentName}<br /><small>{r.studentUniversityId}</small></TableCell>
                <TableCell>{r.targetLabel}</TableCell>
                <TableCell>{MODE_LABEL[r.mode]}</TableCell>
                <TableCell>{r.originalStaff ?? '—'}</TableCell>
                <TableCell>{REFERRAL_STATUS_LABEL[r.status]}{r.outcome ? ` — ${REFERRAL_OUTCOME_LABEL[r.outcome]}` : ''}</TableCell>
                <TableCell>{formatDate(r.dueAt)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد إحالات.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} sx={{ alignSelf: 'center' }} />}
      {openId && <AffairsRequestDialog requestId={openId} role={role} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </Stack>
  );
}
