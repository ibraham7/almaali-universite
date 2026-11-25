import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { getAffairsRequests, getAffairsServices, type AffairsServiceItem, type RequestRow } from '../../api/affairs';
import AffairsRequestDialog from './AffairsRequestDialog';
import AffairsNewRequestDialog from './AffairsNewRequestDialog';
import StudentFileDialog from './StudentFileDialog';
import { CHANNEL_LABEL, errorText, formatDate } from './affairsUi';
import { StatusChip } from './AffairsBits';

const VIEWS = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'الجديدة' },
  { value: 'mine', label: 'المسندة لي' },
  { value: 'waiting', label: 'بانتظار الاستكمال' },
  { value: 'referred', label: 'المحالة' },
  { value: 'done', label: 'المنجزة والمرفوضة' },
];

export default function AffairsRequestsTab({ role }: { role: string }) {
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [channel, setChannel] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { getAffairsServices().then(setServices).catch(() => undefined); }, []);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);

  const load = useCallback(() => getAffairsRequests({ view, search: query || undefined, serviceId: serviceId || undefined, channel: channel || undefined, page })
    .then((result) => { setRows(result.items); setTotal(result.total); setPageSize(result.pageSize); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الطلبات.'))), [view, query, serviceId, channel, page]);

  useEffect(() => { void load(); }, [load]);

  const [now] = useState(() => Date.now());
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {VIEWS.map((v) => (
            <Chip key={v.value} label={v.label} clickable color={view === v.value ? 'primary' : 'default'} variant={view === v.value ? 'filled' : 'outlined'}
              onClick={() => { setView(v.value); setPage(1); }} />
          ))}
        </Stack>
        <Button variant="contained" onClick={() => setCreating(true)}>طلب جديد</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="بحث (رقم الطلب، الرقم الجامعي، اسم الطالب)" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <TextField select size="small" label="الخدمة" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">كل الخدمات</MenuItem>
          {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="المصدر" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">الكل</MenuItem>
          <MenuItem value="ONLINE">{CHANNEL_LABEL.ONLINE}</MenuItem>
          <MenuItem value="IN_PERSON">{CHANNEL_LABEL.IN_PERSON}</MenuItem>
        </TextField>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الطلبات">
          <TableHead>
            <TableRow>
              <TableCell>الرقم</TableCell><TableCell>الطالب</TableCell><TableCell>الخدمة</TableCell><TableCell>المصدر</TableCell><TableCell>الحالة</TableCell>
              <TableCell>الموظف</TableCell><TableCell>التاريخ</TableCell><TableCell>آخر تحديث</TableCell><TableCell>الموعد</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const late = !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(row.status) && row.dueAt && new Date(row.dueAt).getTime() < now;
              return (
                <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(row.id)}>
                  <TableCell sx={{ fontWeight: 700 }}>{row.number}</TableCell>
                  <TableCell>{row.student.name}<Box component="span" sx={{ color: 'text.secondary', display: 'block', fontSize: 12 }}>{row.student.universityId}</Box></TableCell>
                  <TableCell>{row.service.nameAr}</TableCell>
                  <TableCell>{CHANNEL_LABEL[row.channel]}</TableCell>
                  <TableCell><StatusChip status={row.status} /></TableCell>
                  <TableCell>{row.assignedStaff?.name ?? '—'}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                  <TableCell sx={late ? { color: 'error.main', fontWeight: 700 } : undefined}>{formatDate(row.dueAt)}{late ? ' (متأخر)' : ''}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد طلبات.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, value) => setPage(value)} sx={{ alignSelf: 'center' }} />}

      {openId && <AffairsRequestDialog requestId={openId} role={role} onClose={() => setOpenId(null)} onChanged={() => void load()} onOpenStudent={setFileId} />}
      {fileId && <StudentFileDialog studentId={fileId} onClose={() => setFileId(null)} />}
      {creating && <AffairsNewRequestDialog onClose={() => setCreating(false)} onCreated={(number) => { setCreating(false); setMessage(`تم تقديم الطلب ${number}.`); void load(); }} />}
    </Stack>
  );
}
