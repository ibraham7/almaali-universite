import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Pagination, Paper, Radio, RadioGroup, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  downloadAdvisorAttachment, getAdvisorInbox, getAdvisorOverview, getAdvisorReferral, getAdvisorRequests, getAdvisorStudentFile, getAdvisorStudents, respondAdvisorReferral,
  type AdvisorInboxItem, type AdvisorOverview, type AdvisorReferralDetail, type AdvisorRequestRow,
} from '../../api/advisorAffairs';
import type { StudentFileRow } from '../../api/affairs';
import { studentStatusLabel } from '../../api/students';
import StudentFileDialog from '../affairs/StudentFileDialog';
import { StatusChip } from '../affairs/AffairsBits';
import { REFERRAL_OUTCOME_LABEL, REFERRAL_STATUS_LABEL, STATUS_LABEL, errorText, formatDate, formatSize, saveBlob } from '../affairs/affairsUi';

const OUTCOME_HELP: Record<string, string> = {
  APPROVED: 'موافقة على ما طُلب.', REJECTED: 'رفض (يلزم ذكر السبب).', NOTES: 'ملاحظات ورأي أكاديمي (تلزم الملاحظة).', NEEDS_INFO: 'طلب استكمال معلومات أو وثائق (اكتب المطلوب).',
};

// تفاصيل الإحالة وردّ المشرف. بعد الرد تعود المعاملة إلى موظف الشؤون المالك ولا تتغير ملكيتها.
function ReferralDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<AdvisorReferralDetail | null>(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);

  const load = useCallback(() => getAdvisorReferral(id).then(setData).catch((cause) => setError(errorText(cause, 'تعذر تحميل الإحالة.'))), [id]);
  useEffect(() => { void load(); }, [load]);

  async function submit() {
    setBusy(true); setError('');
    try { await respondAdvisorReferral(id, { outcome, note: note.trim() }); onChanged(); onClose(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function download(attId: string, name: string) {
    try { saveBlob(await downloadAdvisorAttachment(id, attId), name); } catch (cause) { setError(errorText(cause)); }
  }
  const needsNote = ['REJECTED', 'NOTES', 'NEEDS_INFO'].includes(outcome);

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="advisor-referral-title">
      <DialogTitle id="advisor-referral-title">{data ? `معاملة ${data.request.number} — ${data.request.serviceName}` : 'معاملة محالة'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {!data && !error && <Typography color="text.secondary">جارٍ التحميل...</Typography>}
        {data && (
          <Stack spacing={2.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              <Typography variant="body2"><b>الطالب:</b> {data.request.student.name} ({data.request.student.universityId}) <Button size="small" onClick={() => setFileId(data.request.student.id)}>ملف الطالب</Button></Typography>
              <Typography variant="body2"><b>الكلية / البرنامج:</b> {data.request.student.college ?? '—'} / {data.request.student.program ?? '—'}</Typography>
              <Typography variant="body2"><b>حالة المعاملة:</b> <StatusChip status={data.request.status} /></Typography>
              <Typography variant="body2"><b>موظف الشؤون المالك:</b> {data.request.owner ?? '—'}</Typography>
              <Typography variant="body2"><b>تاريخ التقديم:</b> {formatDate(data.request.createdAt, true)}</Typography>
              <Typography variant="body2"><b>الموعد المطلوب للرد:</b> {formatDate(data.dueAt)}</Typography>
            </Box>
            {(data.request.subject || data.request.details) && <Box><Typography sx={{ fontWeight: 700 }}>{data.request.subject ?? 'تفاصيل الطلب'}</Typography>{data.request.details && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{data.request.details}</Typography>}</Box>}

            <Paper variant="outlined" sx={{ p: 2, borderColor: 'secondary.main' }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>المطلوب منك ({data.decisionAllowed ? 'رأي أو موافقة' : 'رأي فقط'})</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}><b>سبب الإحالة:</b> {data.reason}</Typography>
              {data.requested && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}><b>المطلوب:</b> {data.requested}</Typography>}
            </Paper>

            {data.request.attachments.length > 0 && (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>المرفقات</Typography>
                <Stack spacing={0.5}>{data.request.attachments.map((a) => <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography variant="body2">{a.fileName} ({formatSize(a.sizeBytes)})</Typography><Button size="small" onClick={() => void download(a.id, a.fileName)}>تنزيل</Button></Stack>)}</Stack>
              </Box>
            )}
            {data.request.timeline.length > 0 && (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>مسار المعاملة</Typography>
                {data.request.timeline.map((e) => <Typography key={e.id} variant="body2" color="text.secondary">{formatDate(e.createdAt, true)} — {e.toStatus ? STATUS_LABEL[e.toStatus] : e.type}{e.note ? `: ${e.note}` : ''}</Typography>)}
              </Box>
            )}
            {data.request.otherReferrals.length > 0 && (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>إحالات أخرى للمعاملة</Typography>
                {data.request.otherReferrals.map((o) => <Typography key={o.id} variant="body2" color="text.secondary">{o.targetLabel} — {REFERRAL_STATUS_LABEL[o.status as 'PENDING']}{o.outcome ? ` (${REFERRAL_OUTCOME_LABEL[o.outcome]})` : ''}{o.responseNote ? `: ${o.responseNote}` : ''}</Typography>)}
              </Box>
            )}

            {data.status === 'PENDING' ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>ردّك</Typography>
                {!data.decisionAllowed && <Alert severity="info" sx={{ mb: 1 }}>هذه الإحالة لإبداء الرأي فقط، فلا موافقة ولا رفض.</Alert>}
                <RadioGroup value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                  {data.allowedOutcomes.map((o) => <FormControlLabel key={o} value={o} control={<Radio />} label={<span><b>{REFERRAL_OUTCOME_LABEL[o]}</b> — {OUTCOME_HELP[o]}</span>} />)}
                </RadioGroup>
                <TextField fullWidth multiline minRows={3} label={needsNote ? 'الملاحظة (مطلوبة)' : 'ملاحظة (اختيارية)'} value={note} onChange={(event) => setNote(event.target.value)} sx={{ mt: 1.5 }} slotProps={{ htmlInput: { maxLength: 2000 } }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>بعد الرد تعود المعاملة إلى موظف الشؤون المالك لاستكمال الإجراء.</Typography>
              </Paper>
            ) : (
              <Alert severity="success">{REFERRAL_STATUS_LABEL[data.status]}{data.outcome ? ` — ${REFERRAL_OUTCOME_LABEL[data.outcome]}` : ''}{data.responseNote ? `: ${data.responseNote}` : ''} ({formatDate(data.respondedAt, true)})</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إغلاق</Button>
        {data?.status === 'PENDING' && <Button variant="contained" onClick={() => void submit()} disabled={busy || !outcome || (needsNote && !note.trim())}>{busy ? 'جارٍ الإرسال...' : 'إرسال الرد'}</Button>}
      </DialogActions>
      {fileId && <StudentFileDialog studentId={fileId} onClose={() => setFileId(null)} loader={getAdvisorStudentFile} canDownload={false} />}
    </Dialog>
  );
}

function Filter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, next: string | null) => next && onChange(next)} aria-label="تصفية">
      {options.map(([key, label]) => <ToggleButton key={key} value={key} sx={{ px: 2 }}>{label}</ToggleButton>)}
    </ToggleButtonGroup>
  );
}

function InboxTab({ onOpen, refresh }: { onOpen: (id: string) => void; refresh: number }) {
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdvisorInboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getAdvisorInbox(filter, page).then((r) => { if (active) { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); } }).catch((cause) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [filter, page, refresh]);
  return (
    <Stack spacing={2}>
      <Filter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[['pending', 'بانتظار ردّي'], ['answered', 'تم الرد'], ['all', 'الكل']]} />
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="المعاملات المحالة إليّ">
          <TableHead><TableRow><TableCell>الطلب</TableCell><TableCell>الخدمة</TableCell><TableCell>الطالب</TableCell><TableCell>المطلوب</TableCell><TableCell>الموعد</TableCell><TableCell>الحالة</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(r.id)}>
                <TableCell sx={{ fontWeight: 700 }}>{r.requestNumber}</TableCell><TableCell>{r.serviceName}</TableCell>
                <TableCell>{r.studentName}<br /><small>{r.studentUniversityId}</small></TableCell>
                <TableCell>{r.decisionAllowed ? 'رأي أو موافقة' : 'رأي فقط'}</TableCell>
                <TableCell>{formatDate(r.dueAt)}{r.overdue && <Chip size="small" color="error" label="متأخرة" sx={{ ms: 1 }} />}</TableCell>
                <TableCell>{REFERRAL_STATUS_LABEL[r.status]}{r.outcome ? ` — ${REFERRAL_OUTCOME_LABEL[r.outcome]}` : ''}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{filter === 'pending' ? 'لا توجد معاملات بانتظار ردّك.' : 'لا توجد معاملات.'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, value) => setPage(value)} sx={{ alignSelf: 'center' }} />}
    </Stack>
  );
}

function RequestsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdvisorRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getAdvisorRequests(filter, page).then((r) => { if (active) { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); } }).catch((cause) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [filter, page]);
  return (
    <Stack spacing={2}>
      <Filter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[['open', 'المفتوحة'], ['overdue', 'المتأخرة'], ['pending', 'المحالة إليّ'], ['all', 'الكل']]} />
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="معاملات طلاب كليتي">
          <TableHead><TableRow><TableCell>الطلب</TableCell><TableCell>الخدمة</TableCell><TableCell>الطالب</TableCell><TableCell>الحالة</TableCell><TableCell>موظف الشؤون</TableCell><TableCell>الموعد</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ fontWeight: 700 }}>{r.number}</TableCell><TableCell>{r.serviceName}</TableCell><TableCell>{r.studentName}<br /><small>{r.studentUniversityId}</small></TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell><TableCell>{r.owner ?? '—'}</TableCell>
                <TableCell>{formatDate(r.dueAt)}{r.overdue && <Chip size="small" color="error" label="متأخرة" sx={{ ms: 1 }} />}</TableCell>
                <TableCell>{r.pendingReferralId && <Button size="small" variant="outlined" onClick={() => onOpen(r.pendingReferralId!)}>الرد على الإحالة</Button>}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد معاملات.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, value) => setPage(value)} sx={{ alignSelf: 'center' }} />}
    </Stack>
  );
}

function FilesTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StudentFileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    let active = true;
    getAdvisorStudents(query || undefined, page).then((r) => { if (active) { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); } }).catch((cause) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [query, page]);
  return (
    <Stack spacing={2}>
      <Alert severity="info">ملفات طلاب كلياتك وبرامجك المسندة إليك فقط.</Alert>
      <TextField size="small" label="بحث بالاسم أو الرقم الجامعي أو الرقم الوطني" value={search} onChange={(event) => setSearch(event.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="ملفات طلاب كليتي">
          <TableHead><TableRow><TableCell>الرقم الجامعي</TableCell><TableCell>الاسم</TableCell><TableCell>الكلية</TableCell><TableCell>الحالة</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r.id)}><TableCell sx={{ fontWeight: 700 }}>{r.universityId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.college ?? '—'}</TableCell><TableCell>{studentStatusLabel(r.status)}</TableCell></TableRow>)}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد نتائج ضمن نطاقك.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, value) => setPage(value)} sx={{ alignSelf: 'center' }} />}
      {openId && <StudentFileDialog studentId={openId} onClose={() => setOpenId(null)} loader={getAdvisorStudentFile} canDownload={false} />}
    </Stack>
  );
}

function OverviewTab() {
  const [data, setData] = useState<AdvisorOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getAdvisorOverview().then(setData).catch((cause) => setError(errorText(cause))); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Typography color="text.secondary">جارٍ التحميل...</Typography>;
  const cards: Array<[string, number, string]> = [['بانتظار ردّي', data.pendingReferrals, 'secondary.main'], ['ردود الـ30 يومًا', data.answeredLast30Days, 'success.main'], ['معاملات مفتوحة', data.open, 'primary.main'], ['متأخرة', data.overdue, 'error.main'], ['إجمالي المعاملات', data.total, 'text.primary']];
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{data.colleges.length ? `نطاقك: ${data.colleges.join('، ')}` : 'لا كليات مسندة إليك بعد، فلا تظهر معاملات. تُسند الكليات من «المستخدمون والصلاحيات».'}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        {cards.map(([label, value, color]) => <Paper key={label} variant="outlined" sx={{ p: 2, textAlign: 'center' }}><Typography sx={{ fontSize: 30, fontWeight: 800, color }}>{value}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Paper>)}
      </Box>
      {Object.keys(data.byStatus).length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>المعاملات حسب الحالة</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>{Object.entries(data.byStatus).map(([status, count]) => <Chip key={status} label={`${STATUS_LABEL[status as 'NEW'] ?? status}: ${count}`} />)}</Stack>
        </Paper>
      )}
    </Stack>
  );
}

const TABS = [['inbox', 'المحالة إليّ'], ['requests', 'معاملات كليتي'], ['files', 'ملفات الطلاب'], ['overview', 'إحصاءات كليتي']] as const;

// شؤون الطلاب للمشرف الأكاديمي: ما أُحيل إليه ليرد عليه، ومتابعة معاملات طلاب كليته، وملفاتهم، وإحصاءاتها. كله ضمن نطاقه.
export default function AdvisorAffairsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find(([id]) => id === params.get('tab'))?.[0] ?? 'inbox';
  const [openId, setOpenId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');

  // فتح إحالة من إشعار: ?request=<معرّف الطلب>
  const requestParam = params.get('request');
  useEffect(() => {
    if (!requestParam) return;
    let active = true;
    getAdvisorInbox('all', 1).then((r) => { const hit = r.items.find((item) => item.requestId === requestParam); if (active && hit) setOpenId(hit.id); }).catch(() => undefined);
    return () => { active = false; };
  }, [requestParam]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>شؤون الطلاب — المشرف الأكاديمي</Typography>
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, value: string) => setParams({ tab: value })} variant="scrollable" scrollButtons="auto" aria-label="أقسام شؤون الطلاب للمشرف">
          {TABS.map(([id, label]) => <Tab key={id} value={id} label={label} />)}
        </Tabs>
      </Paper>
      <Box>
        {tab === 'inbox' && <InboxTab onOpen={setOpenId} refresh={refresh} />}
        {tab === 'requests' && <RequestsTab onOpen={setOpenId} />}
        {tab === 'files' && <FilesTab />}
        {tab === 'overview' && <OverviewTab />}
      </Box>
      {openId && <ReferralDialog id={openId} onClose={() => { setOpenId(null); if (requestParam) setParams({ tab }); }} onChanged={() => { setRefresh((value) => value + 1); setNotice('أُرسل ردّك، وعادت المعاملة إلى موظف الشؤون المالك.'); }} />}
    </Stack>
  );
}
