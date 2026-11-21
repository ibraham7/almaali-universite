import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getAffairsSummary, type AffairsSummary } from '../../api/affairs';
import { EVENT_LABEL, STATUS_LABEL, errorText, formatDate } from './affairsUi';

const CARDS: { key: keyof AffairsSummary['counts']; label: string; color: string }[] = [
  { key: 'new', label: 'طلبات جديدة', color: 'info.main' },
  { key: 'mine', label: 'مسندة لي', color: 'primary.main' },
  { key: 'waiting', label: 'بانتظار الاستكمال', color: 'warning.main' },
  { key: 'referred', label: 'محالة', color: 'secondary.main' },
  { key: 'doneToday', label: 'منجزة اليوم', color: 'success.main' },
  { key: 'overdue', label: 'متأخرة', color: 'error.main' },
];

export default function AffairsHomeTab({ role }: { role: string }) {
  const [summary, setSummary] = useState<AffairsSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { getAffairsSummary().then(setSummary).catch((cause) => setError(errorText(cause, 'تعذر تحميل الملخص.'))); }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!summary) return <Typography color="text.secondary">جارٍ التحميل...</Typography>;

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2 }}>
        {CARDS.map((card) => (
          <Card key={card.key} variant="outlined">
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 800, color: card.color }} data-testid={`count-${card.key}`}>{summary.counts[card.key]}</Typography>
              <Typography variant="body2" color="text.secondary">{card.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {role === 'SYSTEM_ADMIN' && summary.staffLoad && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>حجم العمل لكل موظف</Typography>
          <Table size="small" aria-label="حجم العمل">
            <TableHead><TableRow><TableCell>الموظف</TableCell><TableCell>مفتوح</TableCell><TableCell>منجز</TableCell></TableRow></TableHead>
            <TableBody>
              {summary.staffLoad.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.open}</TableCell><TableCell>{s.done}</TableCell></TableRow>)}
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
