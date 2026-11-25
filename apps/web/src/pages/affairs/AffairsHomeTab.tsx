import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Card, CardActionArea, CardContent, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { getAffairsServices, getAffairsSummary, type AffairsServiceItem, type AffairsSummary } from '../../api/affairs';
import { EVENT_LABEL, STATUS_LABEL, errorText, formatDate } from './affairsUi';

// Each counter opens the list behind it (the requests tab with the same filters), so the number and the list always agree.
const CARDS: { key: keyof AffairsSummary['counts']; label: string; color: string; params: Record<string, string> }[] = [
  { key: 'new', label: 'طلبات جديدة', color: 'info.main', params: { view: 'new' } },
  { key: 'mine', label: 'مسندة لي', color: 'primary.main', params: { view: 'mine' } },
  { key: 'waiting', label: 'بانتظار الاستكمال', color: 'warning.main', params: { view: 'waiting' } },
  { key: 'referred', label: 'محالة', color: 'secondary.main', params: { view: 'referred' } },
  { key: 'doneToday', label: 'منجزة اليوم', color: 'success.main', params: { closedToday: 'true' } },
  { key: 'overdue', label: 'متأخرة', color: 'error.main', params: { overdue: 'true' } },
];

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

export default function AffairsHomeTab({ role }: { role: string }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AffairsSummary | null>(null);
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [period, setPeriod] = useState<'all' | '30' | 'month'>('all');
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState('');

  const filters = useMemo(() => {
    const now = new Date();
    const f: Record<string, string> = {};
    if (period === '30') { f.from = isoDay(new Date(now.getTime() - 29 * 86400000)); f.to = isoDay(now); }
    if (period === 'month') { f.from = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))); f.to = isoDay(now); }
    if (serviceId) f.serviceId = serviceId;
    return f;
  }, [period, serviceId]);

  useEffect(() => { getAffairsServices().then(setServices).catch(() => undefined); }, []);
  useEffect(() => {
    let active = true;
    getAffairsSummary(filters).then((s) => { if (active) { setSummary(s); setError(''); } }).catch((cause) => { if (active) setError(errorText(cause, 'تعذر تحميل الملخص.')); });
    return () => { active = false; };
  }, [filters]);

  function openList(params: Record<string, string>) {
    navigate(`/affairs?${new URLSearchParams({ tab: 'requests', ...filters, ...params }).toString()}`);
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!summary) return <Typography color="text.secondary">جارٍ التحميل...</Typography>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>المؤشرات حسب:</Typography>
        {([['all', 'كل الفترات'], ['30', 'آخر 30 يوماً'], ['month', 'هذا الشهر']] as const).map(([v, l]) => (
          <Chip key={v} size="small" label={l} clickable color={period === v ? 'primary' : 'default'} variant={period === v ? 'filled' : 'outlined'} onClick={() => setPeriod(v)} />
        ))}
        <TextField select size="small" label="الخدمة" value={serviceId} onChange={(e) => setServiceId(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">كل الخدمات</MenuItem>
          {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}
        </TextField>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2 }}>
        {CARDS.map((card) => (
          <Card key={card.key} variant="outlined">
            <CardActionArea onClick={() => openList(card.params)} aria-label={`${card.label}: ${summary.counts[card.key]}`}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 800, color: card.color }} data-testid={`count-${card.key}`}>{summary.counts[card.key]}</Typography>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Typography variant="body2">إجمالي الطلاب: <b data-testid="students-total">{summary.students.total}</b></Typography>
        <Typography variant="body2">الطلاب النشطون (حالتهم «ACTIVE»): <b data-testid="students-active">{summary.students.active}</b></Typography>
      </Stack>

      {role === 'SYSTEM_ADMIN' && summary.staffLoad && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>حجم العمل لكل موظف</Typography>
          <Table size="small" aria-label="حجم العمل">
            <TableHead><TableRow><TableCell>الموظف</TableCell><TableCell>مفتوح</TableCell><TableCell>منجز</TableCell></TableRow></TableHead>
            <TableBody>
              {summary.staffLoad.map((s) => <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => openList({ staffId: s.id, view: 'open' })}><TableCell>{s.name}</TableCell><TableCell>{s.open}</TableCell><TableCell>{s.done}</TableCell></TableRow>)}
              {summary.staffLoad.length === 0 && <TableRow><TableCell colSpan={3} align="center">لا يوجد موظفون بعد.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>آخر الأحداث</Typography>
        <Stack spacing={1}>
          {summary.recentEvents.map((event) => (
            <Typography key={event.id} variant="body2">
              <b>{event.requestNumber}</b> · {event.serviceName} — {EVENT_LABEL[event.type] ?? event.type}
              {event.type === 'STATUS_CHANGED' && event.toStatus ? ` (${STATUS_LABEL[event.toStatus]})` : ''}
              <Box component="span" sx={{ color: 'text.secondary' }}> · {formatDate(event.createdAt, true)}</Box>
            </Typography>
          ))}
          {summary.recentEvents.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد أحداث بعد.</Typography>}
        </Stack>
      </Paper>
    </Stack>
  );
}
