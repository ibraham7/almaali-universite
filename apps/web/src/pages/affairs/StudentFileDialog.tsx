import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import { downloadStaffAttachment, getStudentFile, type StudentFile } from '../../api/affairs';
import { studentStatusLabel } from '../../api/students';
import { StatusChip } from './AffairsBits';
import { CHANNEL_LABEL, DOCUMENT_STATUS_LABEL, errorText, formatDate, formatSize, saveBlob } from './affairsUi';

const PERSONAL_LABELS: [string, string][] = [
  ['fullName', 'الاسم الكامل'], ['firstName', 'الاسم الأول'], ['middleName', 'اسم الأب'], ['familyName', 'اسم العائلة'], ['motherName', 'اسم الأم'],
  ['englishName', 'الاسم بالإنجليزية'], ['gender', 'الجنس'], ['dateOfBirth', 'تاريخ الميلاد'], ['birthPlace', 'مكان الولادة'], ['nationality', 'الجنسية'],
  ['nationalId', 'الرقم الوطني'], ['idOrPassport', 'الهوية / جواز السفر'], ['meritNumber', 'رقم المفاضلة'], ['applicationNumber', 'رقم الاكتتاب'],
];

const FIELD_LABEL: Record<string, string> = Object.fromEntries([...PERSONAL_LABELS, ['phone', 'الهاتف'], ['universityEmail', 'البريد الجامعي'], ['status', 'الحالة'], ['collegeId', 'الكلية'], ['departmentId', 'القسم'], ['programId', 'البرنامج'], ['advisorId', 'المشرف'], ['admissionDate', 'تاريخ القبول'], ['universityId', 'الرقم الجامعي']]);

function Rows({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' }, columnGap: 3, rowGap: 0.5, m: 0 }}>
      {rows.map(([k, v]) => (<Box key={k} sx={{ display: 'contents' }}><Typography component="dt" variant="body2" color="text.secondary">{k}</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{v || '—'}</Typography></Box>))}
    </Box>
  );
}

// Read-only electronic file of a student. Data is edited from the Students page (and every edit is logged here).
export default function StudentFileDialog({ studentId, onClose, loader = getStudentFile, canDownload = true }: { studentId: string; onClose: () => void; loader?: (id: string) => Promise<StudentFile>; canDownload?: boolean }) {
  const [file, setFile] = useState<StudentFile | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('data');

  useEffect(() => {
    loader(studentId).then(setFile).catch((cause) => setError(errorText(cause, 'تعذر تحميل الملف.')));
  }, [studentId, loader]);

  async function download(requestId: string, id: string, name: string) {
    try { saveBlob(await downloadStaffAttachment(requestId, id), name); } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="student-file-title">
      <DialogTitle id="student-file-title">{file ? `ملف الطالب: ${file.name} (${file.university.universityId})` : 'ملف الطالب'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!file && !error && <Typography color="text.secondary">جارٍ التحميل...</Typography>}
        {file && (
          <Stack spacing={2}>
            <Tabs value={tab} onChange={(_, v: string) => setTab(v)} variant="scrollable" scrollButtons="auto" aria-label="أقسام ملف الطالب">
              <Tab value="data" label="البيانات" />
              <Tab value="numbers" label="الأرقام الجامعية" />
              <Tab value="requests" label={`الطلبات (${file.requests.length})`} />
              <Tab value="attachments" label={`المرفقات (${file.attachments.length})`} />
              <Tab value="changes" label="سجل التعديلات" />
              <Tab value="documents" label={`الوثائق (${file.documents.length})`} />
            </Tabs>

            {tab === 'data' && (
              <Stack spacing={2}>
                <Box><Typography sx={{ fontWeight: 700, mb: 1 }}>البيانات الجامعية</Typography>
                  <Rows rows={[['الرقم الجامعي الحالي', file.university.universityId], ['الكلية', file.university.college], ['القسم', file.university.department], ['البرنامج', file.university.program],
                    ['الوضع الدراسي', studentStatusLabel(file.university.status)], ['المشرف الأكاديمي', file.university.advisor], ['تاريخ القبول', file.university.admissionDate ? formatDate(file.university.admissionDate) : null]]} /></Box>
                <Box><Typography sx={{ fontWeight: 700, mb: 1 }}>البيانات الشخصية</Typography>
                  <Rows rows={PERSONAL_LABELS.map(([k, label]) => [label, k === 'dateOfBirth' && file.personal[k] ? formatDate(file.personal[k]) : file.personal[k]])} /></Box>
                <Box><Typography sx={{ fontWeight: 700, mb: 1 }}>بيانات التواصل</Typography>
                  <Rows rows={[['الهاتف', file.contact.phone], ['البريد الجامعي', file.contact.universityEmail]]} /></Box>
                <Typography variant="caption" color="text.secondary">لتعديل البيانات استخدم صفحة «الطلاب». كل تعديل يظهر في «سجل التعديلات».</Typography>
              </Stack>
            )}

            {tab === 'numbers' && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="الأرقام الجامعية">
                  <TableHead><TableRow><TableCell>الرقم</TableCell><TableCell>الكلية</TableCell><TableCell>من</TableCell><TableCell>إلى</TableCell><TableCell>استُبدل بـ</TableCell><TableCell>السبب</TableCell></TableRow></TableHead>
                  <TableBody>
                    <TableRow><TableCell sx={{ fontWeight: 700 }}>{file.university.universityId} (الحالي)</TableCell><TableCell>{file.university.college ?? '—'}</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>
                    {file.numberHistory.map((h) => (
                      <TableRow key={h.universityId}><TableCell>{h.universityId}</TableCell><TableCell>{h.college ?? '—'}</TableCell><TableCell>{formatDate(h.validFrom)}</TableCell><TableCell>{formatDate(h.validTo)}</TableCell><TableCell>{h.replacedBy}</TableCell><TableCell>{h.reason ?? '—'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tab === 'requests' && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="طلبات الطالب">
                  <TableHead><TableRow><TableCell>الرقم</TableCell><TableCell>الخدمة</TableCell><TableCell>المصدر</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>إحالات</TableCell></TableRow></TableHead>
                  <TableBody>
                    {file.requests.map((r) => (
                      <TableRow key={r.id}><TableCell sx={{ fontWeight: 700 }}>{r.number}</TableCell><TableCell>{r.service}</TableCell><TableCell>{CHANNEL_LABEL[r.channel]}</TableCell><TableCell><StatusChip status={r.status} /></TableCell><TableCell>{formatDate(r.createdAt)}</TableCell><TableCell>{r.referrals.length}</TableCell></TableRow>
                    ))}
                    {file.requests.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد طلبات.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tab === 'attachments' && (
              <Stack spacing={1}>
                {file.attachments.length === 0 && <Typography color="text.secondary">لا توجد مرفقات.</Typography>}
                {file.attachments.map((a) => (
                  <Stack key={a.id} direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 140, overflowWrap: 'anywhere' }}>{a.fileName} <Box component="span" sx={{ color: 'text.secondary' }}>· الطلب {a.requestNumber}</Box></Typography>
                    <Typography variant="caption" color="text.secondary">{formatSize(a.sizeBytes)} · {formatDate(a.createdAt)}</Typography>
                    {canDownload && <Button size="small" onClick={() => void download(a.requestId, a.id, a.fileName)}>تنزيل</Button>}
                  </Stack>
                ))}
              </Stack>
            )}

            {tab === 'changes' && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="سجل تعديلات البيانات">
                  <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>الحقل</TableCell><TableCell>القيمة السابقة</TableCell><TableCell>القيمة الجديدة</TableCell><TableCell>بواسطة</TableCell></TableRow></TableHead>
                  <TableBody>
                    {file.dataChanges.map((c) => (
                      <TableRow key={c.id}><TableCell>{formatDate(c.createdAt, true)}</TableCell><TableCell>{FIELD_LABEL[c.field] ?? c.field}</TableCell><TableCell>{c.oldValue ?? '—'}</TableCell><TableCell>{c.newValue ?? '—'}</TableCell><TableCell>{c.changedBy ?? '—'}</TableCell></TableRow>
                    ))}
                    {file.dataChanges.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد تعديلات مسجّلة. التعديلات السابقة لهذه الميزة لا تحمل القيم.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tab === 'documents' && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="وثائق الطالب">
                  <TableHead><TableRow><TableCell>الرقم</TableCell><TableCell>النوع</TableCell><TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {file.documents.map((d) => (
                      <TableRow key={d.id}><TableCell sx={{ fontWeight: 700 }}>{d.number}</TableCell><TableCell>{d.typeName}</TableCell><TableCell>{formatDate(d.issuedAt)}</TableCell><TableCell>{DOCUMENT_STATUS_LABEL[d.status]}{d.revokedReason ? ` — ${d.revokedReason}` : ''}</TableCell>
                        <TableCell><Button size="small" component="a" href={`/documents/${d.id}`} target="_blank" rel="noopener noreferrer">عرض / طباعة</Button></TableCell></TableRow>
                    ))}
                    {file.documents.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا توجد وثائق صادرة.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>إغلاق</Button></DialogActions>
    </Dialog>
  );
}
