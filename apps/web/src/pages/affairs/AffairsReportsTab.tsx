import { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { getColleges, type College } from '../../api/academicStructure';
import { exportReport, getAffairsServices, getAffairsStaff, getReportOverview, type AffairsServiceItem, type AffairsStaffItem, type ReportFilters, type ReportOverview } from '../../api/affairs';
import { BarList, ColumnSeries } from './charts';
import ReportBuilder from './ReportBuilder';
import ReportDrilldownDialog from './ReportDrilldownDialog';
import { STATUS_LABEL, errorText, formatDate, saveBlob } from './affairsUi';

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function preset(kind: 'last30' | 'month' | 'all') {
  const now = new Date();
  if (kind === 'all') return { from: '', to: '' };
  if (kind === 'month') return { from: isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to: isoDay(now) };
  return { from: isoDay(new Date(now.getTime() - 29 * 86400000)), to: isoDay(now) };
}

type Drill = { title: string; params: Record<string, string | undefined> } | null;

function Overview({ role }: { role: string }) {
  const [range, setRange] = useState(preset('last30'));
  const [serviceId, setServiceId] = useState('');
  const [channel, setChannel] = useState('');
  const [staffId, setStaffId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [staff, setStaff] = useState<AffairsStaffItem[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [data, setData] = useState<ReportOverview | null>(null);
  const [error, setError] = useState('');
  const [drill, setDrill] = useState<Drill>(null);

  useEffect(() => {
    getAffairsServices().then(setServices).catch(() => undefined);
    getColleges().then(setColleges).catch(() => undefined);
    getAffairsStaff().then(setStaff).catch(() => undefined);
  }, []);

  const filters: ReportFilters = useMemo(() => ({ from: range.from || undefined, to: range.to || undefined, serviceId: serviceId || undefined, channel: channel || undefined, staffId: staffId || undefined, collegeId: collegeId || undefined }), [range, serviceId, channel, staffId, collegeId]);

  useEffect(() => {
    let active = true;
    getReportOverview(filters).then((r) => { if (active) { setData(r); setError(''); } }).catch((cause) => { if (active) setError(errorText(cause, 'تعذر تحميل التقرير.')); });
    return () => { active = false; };
  }, [filters]);

  const open = (title: string, extra: Record<string, string | undefined>) => setDrill({ title, params: { ...(filters as Record<string, string | undefined>), ...extra } });
  const periodText = range.from || range.to ? `${range.from ? formatDate(range.from) : 'البداية'} — ${range.to ? formatDate(range.to) : 'اليوم'}` : 'كل الفترات';

  async function exportByService() {
    try { saveBlob(await exportReport({ source: 'requests', columns: [], groupBy: 'service', filters: { from: filters.from, to: filters.to, serviceId: filters.serviceId, channel: filters.channel } }), 'requests-by-service.csv'); }
    catch (cause) { setError(errorText(cause)); }
  }

  const kpis = data ? [
    { label: 'إجمالي الطلبات', value: data.totals.total, params: {}, color: 'text.primary', def: 'total' },
    { label: 'مفتوحة', value: data.totals.open, params: { view: 'open' }, color: 'primary.main', def: 'open' },
    { label: 'مكتملة', value: data.totals.completed, params: { status: 'COMPLETED' }, color: 'success.main', def: 'completed' },
    { label: 'مرفوضة', value: data.totals.rejected, params: { status: 'REJECTED' }, color: 'error.main', def: 'rejected' },
    { label: 'ملغاة', value: data.totals.cancelled, params: { status: 'CANCELLED' }, color: 'text.secondary', def: 'cancelled' },
    { label: 'متأخرة', value: data.totals.overdue, params: { overdue: 'true' }, color: 'error.main', def: 'overdue' },
  ] : [];

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>الفترة:</Typography>
            <Chip size="small" label="آخر 30 يوماً" clickable onClick={() => setRange(preset('last30'))} />
            <Chip size="small" label="هذا الشهر" clickable onClick={() => setRange(preset('month'))} />
            <Chip size="small" label="كل الفترات" clickable onClick={() => setRange(preset('all'))} />
            <TextField size="small" type="date" label="من" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="إلى" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <TextField select size="small" label="الخدمة" value={serviceId} onChange={(e) => setServiceId(e.target.value)}><MenuItem value="">كل الخدمات</MenuItem>{services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}</TextField>
            <TextField select size="small" label="الكلية" value={collegeId} onChange={(e) => setCollegeId(e.target.value)}><MenuItem value="">كل الكليات</MenuItem>{colleges.map((c) => <MenuItem key={c.id} value={c.id}>{c.nameAr}</MenuItem>)}</TextField>
            <TextField select size="small" label="مصدر الطلب" value={channel} onChange={(e) => setChannel(e.target.value)}><MenuItem value="">الكل</MenuItem><MenuItem value="ONLINE">إلكتروني</MenuItem><MenuItem value="IN_PERSON">حضوري</MenuItem></TextField>
            {data?.scope.canSeeAll && <TextField select size="small" label="الموظف" value={staffId} onChange={(e) => setStaffId(e.target.value)}><MenuItem value="">كل الموظفين</MenuItem>{staff.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>}
          </Box>
          <Typography variant="caption" color="text.secondary">الفترة تُحسب على تاريخ تقديم الطلب. المعروض: {periodText}.</Typography>
        </Stack>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <Typography color="text.secondary">جارٍ التحميل...</Typography>}
      {data && (
        <>
          {data.truncated && <Alert severity="warning">البيانات كبيرة: الرسم والمتوسطات محسوبة على أحدث 50000 طلب فقط. ضيّق الفترة.</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(7, 1fr)' }, gap: 1.5 }}>
            {kpis.map((k) => (
              <Paper key={k.label} variant="outlined" component="button" type="button" onClick={() => open(k.label, k.params)} aria-label={`${k.label}: ${k.value}`}
                sx={{ all: 'unset', cursor: 'pointer', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', '&:hover': { borderColor: 'primary.main' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                <Typography variant="body2" color="text.secondary">{k.label}</Typography>
              </Paper>
            ))}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{data.totals.avgDays ?? '—'}</Typography>
              <Typography variant="body2" color="text.secondary">متوسط أيام الإنجاز</Typography>
            </Paper>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>الطلبات حسب الحالة</Typography>
              <BarList rows={data.byStatus.map((s) => ({ key: s.status, label: STATUS_LABEL[s.status] ?? s.label, value: s.count }))} onSelect={(status) => open(STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status, { status })} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>الطلبات حسب المصدر</Typography>
              <BarList color="secondary.main" rows={data.byChannel.map((c) => ({ key: c.channel, label: c.label, value: c.count }))} onSelect={(channelKey) => open(channelKey === 'ONLINE' ? 'إلكتروني' : 'حضوري', { channel: channelKey })} />
              <Typography sx={{ fontWeight: 700, mt: 2, mb: 1 }}>الوثائق والإحالات</Typography>
              <Typography variant="body2">وثائق صادرة: <b>{data.documents.issued}</b> · ملغاة: <b>{data.documents.revoked}</b></Typography>
              <Typography variant="body2">إحالات: <b>{data.referrals.total}</b> · بانتظار الرد: <b>{data.referrals.pending}</b> · تم الرد: <b>{data.referrals.answered}</b></Typography>
            </Paper>
          </Box>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>الطلبات المقدّمة {data.series.granularity === 'month' ? 'شهرياً' : 'يومياً'}</Typography>
            {data.series.points.length > 0 ? <ColumnSeries points={data.series.points} label="عدد الطلبات المقدّمة عبر الزمن" /> : <Typography variant="body2" color="text.secondary">لا توجد طلبات في هذه الفترة.</Typography>}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>حسب الخدمة</Typography>
              <Button size="small" onClick={exportByService}>تصدير CSV</Button>
            </Stack>
            <TableContainer>
              <Table size="small" aria-label="الطلبات حسب الخدمة">
                <TableHead><TableRow><TableCell>الخدمة</TableCell><TableCell>الإجمالي</TableCell><TableCell>مفتوحة</TableCell><TableCell>مكتملة</TableCell><TableCell>مرفوضة</TableCell><TableCell>ملغاة</TableCell><TableCell>متوسط أيام الإنجاز</TableCell></TableRow></TableHead>
                <TableBody>
                  {data.byService.map((s) => (
                    <TableRow key={s.serviceId} hover sx={{ cursor: 'pointer' }} onClick={() => open(s.name, { serviceId: s.serviceId })}>
                      <TableCell sx={{ fontWeight: 700 }}>{s.name}</TableCell><TableCell>{s.total}</TableCell><TableCell>{s.open}</TableCell><TableCell>{s.completed}</TableCell><TableCell>{s.rejected}</TableCell><TableCell>{s.cancelled}</TableCell><TableCell>{s.avgDays ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {data.byService.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد طلبات.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>حجم العمل {data.scope.canSeeAll ? 'حسب الموظف' : '(لك)'}</Typography>
            <TableContainer>
              <Table size="small" aria-label="حجم العمل">
                <TableHead><TableRow><TableCell>الموظف</TableCell><TableCell>مفتوح</TableCell><TableCell>مكتمل</TableCell><TableCell>مرفوض</TableCell><TableCell>متوسط أيام الإنجاز</TableCell></TableRow></TableHead>
                <TableBody>
                  {data.staffWorkload.map((w) => (
                    <TableRow key={w.staffId} hover sx={{ cursor: 'pointer' }} onClick={() => open(w.name, { staffId: w.staffId })}>
                      <TableCell sx={{ fontWeight: 700 }}>{w.name}</TableCell><TableCell>{w.open}</TableCell><TableCell>{w.completed}</TableCell><TableCell>{w.rejected}</TableCell><TableCell>{w.avgDays ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {data.staffWorkload.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد بيانات.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary><Typography sx={{ fontWeight: 700 }}>تعريف المؤشرات ومصدر البيانات</Typography></AccordionSummary>
            <AccordionDetails>
              <Stack spacing={0.5} component="ul" sx={{ m: 0, ps: 2 }}>
                {Object.entries(data.definitions).map(([k, v]) => <Typography component="li" variant="body2" key={k}>{v}</Typography>)}
                <Typography component="li" variant="body2" color="text.secondary">آخر تحديث للأرقام: {formatDate(data.generatedAt, true)}</Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
      {drill && <ReportDrilldownDialog title={drill.title} params={drill.params} role={role} onClose={() => setDrill(null)} />}
    </Stack>
  );
}

export default function AffairsReportsTab({ role }: { role: string }) {
  const [section, setSection] = useState<'overview' | 'builder'>('overview');
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Chip label="نظرة عامة" clickable color={section === 'overview' ? 'primary' : 'default'} variant={section === 'overview' ? 'filled' : 'outlined'} onClick={() => setSection('overview')} />
        <Chip label="منشئ التقارير" clickable color={section === 'builder' ? 'primary' : 'default'} variant={section === 'builder' ? 'filled' : 'outlined'} onClick={() => setSection('builder')} />
      </Stack>
      {section === 'overview' ? <Overview role={role} /> : <ReportBuilder />}
    </Stack>
  );
}
