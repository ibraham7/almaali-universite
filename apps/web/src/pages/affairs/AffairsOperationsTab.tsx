import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getAffairsOperations, type OperationItem } from '../../api/affairs';
import { EVENT_LABEL, STATUS_LABEL, errorText, formatDate } from './affairsUi';

export default function AffairsOperationsTab() {
  const [items, setItems] = useState<OperationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => getAffairsOperations(page)
    .then((r) => { setItems(r.items); setHasMore(r.hasMore); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل السجل.'))), [page]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="سجل العمليات">
          <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>الطلب</TableCell><TableCell>العملية</TableCell><TableCell>المنفّذ</TableCell><TableCell>السبب / الملاحظة</TableCell></TableRow></TableHead>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{formatDate(e.createdAt, true)}</TableCell>
                <TableCell>{e.requestNumber} · {e.serviceName}</TableCell>
                <TableCell>
                  {EVENT_LABEL[e.type] ?? e.type}
                  {e.type === 'STATUS_CHANGED' && e.fromStatus && e.toStatus ? `: ${STATUS_LABEL[e.fromStatus]} ← ${STATUS_LABEL[e.toStatus]}` : ''}
                </TableCell>
                <TableCell>{e.actor ?? '—'}</TableCell>
                <TableCell>{e.note ?? '—'}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد عمليات بعد.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
        <Button disabled={!hasMore} onClick={() => setPage(page + 1)}>التالي</Button>
      </Stack>
    </Stack>
  );
}
