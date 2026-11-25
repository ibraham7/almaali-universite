import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getAffairsRequests, type RequestRow } from '../../api/affairs';
import AffairsRequestDialog from './AffairsRequestDialog';
import { StatusChip } from './AffairsBits';
import { CHANNEL_LABEL, errorText, formatDate } from './affairsUi';

// The list behind a report figure: the same request list endpoint with the same filters, so the numbers always match.
export default function ReportDrilldownDialog({ title, params, role, onClose }: { title: string; params: Record<string, string | undefined>; role: string; onClose: () => void }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const key = JSON.stringify(params);
  const load = useCallback(() => getAffairsRequests({ ...JSON.parse(key), page })
    .then((r) => { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل القائمة.'))), [key, page]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="drill-title">
      <DialogTitle id="drill-title">{title} ({total})</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="الطلبات">
            <TableHead><TableRow><TableCell>الرقم</TableCell><TableCell>الطالب</TableCell><TableCell>الخدمة</TableCell><TableCell>المصدر</TableCell><TableCell>الحالة</TableCell><TableCell>الموظف</TableCell><TableCell>التاريخ</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r.id)}>
                  <TableCell sx={{ fontWeight: 700 }}>{r.number}</TableCell><TableCell>{r.student.name}</TableCell><TableCell>{r.service.nameAr}</TableCell><TableCell>{CHANNEL_LABEL[r.channel]}</TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell><TableCell>{r.assignedStaff?.name ?? '—'}</TableCell><TableCell>{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد طلبات.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }} />}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>إغلاق</Button></DialogActions>
      {openId && <AffairsRequestDialog requestId={openId} role={role} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </Dialog>
  );
}
