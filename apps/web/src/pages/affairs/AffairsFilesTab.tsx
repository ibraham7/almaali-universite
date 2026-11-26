import { useCallback, useEffect, useState } from 'react';
import { Alert, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { getStudentFiles, type StudentFileRow } from '../../api/affairs';
import StudentFileDialog from './StudentFileDialog';
import { studentStatusLabel } from '../../api/students';
import { errorText } from './affairsUi';

export default function AffairsFilesTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StudentFileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);

  const load = useCallback(() => getStudentFiles({ search: query || undefined, page })
    .then((r) => { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الملفات.'))), [query, page]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      <TextField size="small" label="بحث بالاسم أو الرقم الجامعي (الحالي أو السابق) أو الرقم الوطني" value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="ملفات الطلاب">
          <TableHead><TableRow><TableCell>الرقم الجامعي</TableCell><TableCell>الاسم</TableCell><TableCell>الكلية</TableCell><TableCell>الحالة</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r.id)}>
                <TableCell sx={{ fontWeight: 700 }}>{r.universityId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.college ?? '—'}</TableCell><TableCell>{studentStatusLabel(r.status)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد نتائج.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} sx={{ alignSelf: 'center' }} />}
      {openId && <StudentFileDialog studentId={openId} onClose={() => setOpenId(null)} />}
    </Stack>
  );
}
