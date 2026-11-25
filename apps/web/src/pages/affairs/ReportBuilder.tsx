import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { exportReport, getAffairsServices, getReportCatalog, runReport, type AffairsServiceItem, type CatalogSource, type RunReportResult } from '../../api/affairs';
import { STATUS_LABEL, errorText, saveBlob } from './affairsUi';

const STATUS_NAMES: Record<string, string> = { ...STATUS_LABEL, ACTIVE: 'نشطة', REVOKED: 'ملغاة', PENDING: 'بانتظار الرد', ANSWERED: 'تم الرد' };

// Report builder: the user can only pick things from the server's catalogue (source, columns, grouping, filters). No free SQL.
export default function ReportBuilder() {
  const [catalog, setCatalog] = useState<CatalogSource[]>([]);
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [sourceId, setSourceId] = useState('requests');
  const [columns, setColumns] = useState<string[]>(['number', 'student', 'service', 'status']);
  const [groupBy, setGroupBy] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [channel, setChannel] = useState('');
  const [result, setResult] = useState<RunReportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getReportCatalog().then(setCatalog).catch((cause) => setError(errorText(cause, 'تعذر تحميل كتالوج التقارير.')));
    getAffairsServices().then(setServices).catch(() => undefined);
  }, []);

  const source = catalog.find((s) => s.id === sourceId);
  const body = () => ({ source: sourceId, columns: groupBy ? [] : columns, groupBy: groupBy || undefined, filters: { from: from || undefined, to: to || undefined, status: status || undefined, serviceId: sourceId === 'requests' ? serviceId || undefined : undefined, channel: sourceId === 'requests' ? channel || undefined : undefined } });

  function changeSource(id: string) {
    const next = catalog.find((s) => s.id === id);
    setSourceId(id); setResult(null); setGroupBy(''); setStatus(''); setServiceId(''); setChannel('');
    setColumns((next?.columns ?? []).slice(0, 4).map((c) => c.id));
  }

  async function run() {
    setBusy(true); setError('');
    try { setResult(await runReport(body())); } catch (cause) { setError(errorText(cause)); setResult(null); } finally { setBusy(false); }
  }

  async function download() {
    setBusy(true); setError('');
    try { saveBlob(await exportReport(body()), 'report.csv'); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  const canRun = !busy && (groupBy !== '' || columns.length > 0);

  return (
    <Stack spacing={2}>
      <Alert severity="info">اختر مصدر البيانات والأعمدة والمرشحات من القوائم الجاهزة. لا يوجد إدخال استعلامات حرة. الحد الأقصى 10000 صف.</Alert>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            <TextField select size="small" label="المصدر" value={sourceId} onChange={(e) => changeSource(e.target.value)}>
              {catalog.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="تجميع حسب (اختياري)" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} helperText={groupBy ? 'يظهر العدد لكل مجموعة' : 'بدون تجميع تظهر الصفوف نفسها'}>
              <MenuItem value="">بدون تجميع (قائمة)</MenuItem>
              {source?.dimensions.map((d) => <MenuItem key={d.id} value={d.id}>{d.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">كل الحالات</MenuItem>
              {source?.statuses.map((s) => <MenuItem key={s} value={s}>{STATUS_NAMES[s] ?? s}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label={`من (${source?.dateLabel ?? 'التاريخ'})`} value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="إلى" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            {sourceId === 'requests' && (
              <TextField select size="small" label="الخدمة" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <MenuItem value="">كل الخدمات</MenuItem>
                {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}
              </TextField>
            )}
            {sourceId === 'requests' && (
              <TextField select size="small" label="المصدر (إلكتروني/حضوري)" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <MenuItem value="">الكل</MenuItem><MenuItem value="ONLINE">إلكتروني</MenuItem><MenuItem value="IN_PERSON">حضوري</MenuItem>
              </TextField>
            )}
          </Box>
          {!groupBy && source && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>الأعمدة</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2 }}>
                {source.columns.map((c) => (
                  <FormControlLabel key={c.id} label={c.label} control={<Checkbox size="small" checked={columns.includes(c.id)} onChange={(e) => setColumns(e.target.checked ? [...columns, c.id] : columns.filter((x) => x !== c.id))} />} />
                ))}
              </Box>
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={run} disabled={!canRun}>عرض التقرير</Button>
            <Button variant="outlined" onClick={download} disabled={!canRun}>تصدير CSV</Button>
          </Stack>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {result && (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {result.groupBy ? `${result.total} سجل ضمن المجموعات التالية.` : `${result.total} صف${result.shown !== undefined && result.shown < result.total ? ` (يُعرض أول ${result.shown}، والتصدير يشمل الكل)` : ''}.`}
            {result.truncated && ' تم الاقتصار على أول 10000 سجل.'}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="نتيجة التقرير">
              <TableHead><TableRow>{result.columns.map((c) => <TableCell key={c.id}>{c.label}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {result.rows.map((row, i) => <TableRow key={i}>{result.columns.map((c) => <TableCell key={c.id}>{row[c.id] === '' || row[c.id] === undefined ? '—' : row[c.id]}</TableCell>)}</TableRow>)}
                {result.rows.length === 0 && <TableRow><TableCell colSpan={result.columns.length} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد بيانات.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Stack>
  );
}
