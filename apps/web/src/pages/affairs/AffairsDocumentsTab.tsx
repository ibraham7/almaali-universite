import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Pagination, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { createDocumentType, getDocumentTypes, getIssuedDocuments, revokeDocument, updateDocumentType, type DocumentTypeItem, type IssuedDocumentRow } from '../../api/affairs';
import { DOCUMENT_STATUS_LABEL, errorText, formatDate } from './affairsUi';

type TypeForm = { id?: string; code: string; nameAr: string; titleAr: string; issuingBody: string; bodyTemplate: string; footerNote: string; includesResults: boolean };
const EMPTY_TYPE: TypeForm = { code: '', nameAr: '', titleAr: '', issuingBody: 'دائرة شؤون الطلاب', bodyTemplate: '', footerNote: '', includesResults: false };
const PLACEHOLDER_HELP = '{{studentName}} {{universityId}} {{college}} {{department}} {{program}} {{status}} {{date}}';

function IssuedList() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<IssuedDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revoking, setRevoking] = useState<IssuedDocumentRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);

  const load = useCallback(() => getIssuedDocuments({ search: query || undefined, status: status || undefined, page })
    .then((r) => { setRows(r.items); setTotal(r.total); setPageSize(r.pageSize); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الوثائق.'))), [query, status, page]);
  useEffect(() => { void load(); }, [load]);

  async function revoke() {
    if (!revoking) return;
    setBusy(true);
    try { await revokeDocument(revoking.id, reason.trim()); setMessage(`أُلغيت الوثيقة ${revoking.number}.`); setRevoking(null); setReason(''); await load(); }
    catch (cause) { setError(errorText(cause)); setRevoking(null); }
    finally { setBusy(false); }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="بحث (رقم الوثيقة، الرقم الجامعي، الاسم)" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1}>
          {[['', 'الكل'], ['ACTIVE', 'نشطة'], ['REVOKED', 'ملغاة']].map(([v, l]) => (
            <Chip key={v} label={l} clickable color={status === v ? 'primary' : 'default'} variant={status === v ? 'filled' : 'outlined'} onClick={() => { setStatus(v); setPage(1); }} />
          ))}
        </Stack>
      </Stack>
      <Alert severity="info">تُصدر الوثيقة من الطلب نفسه بعد قبوله أو إكماله (زر «إصدار وثيقة» داخل الطلب). الوثيقة لا تُحذف، تُلغى بسبب فقط.</Alert>
      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الوثائق الصادرة">
          <TableHead><TableRow><TableCell>رقم الوثيقة</TableCell><TableCell>النوع</TableCell><TableCell>الطالب</TableCell><TableCell>الطلب</TableCell><TableCell>تاريخ الإصدار</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell sx={{ fontWeight: 700 }}>{d.number}</TableCell>
                <TableCell>{d.typeName}</TableCell>
                <TableCell>{d.studentName}<br /><small>{d.universityId}</small></TableCell>
                <TableCell>{d.requestNumber ?? '—'}</TableCell>
                <TableCell>{formatDate(d.issuedAt)}</TableCell>
                <TableCell><Chip size="small" color={d.status === 'ACTIVE' ? 'success' : 'error'} label={DOCUMENT_STATUS_LABEL[d.status]} />{d.revokedReason && <><br /><small>{d.revokedReason}</small></>}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" component="a" href={`/documents/${d.id}`} target="_blank" rel="noopener noreferrer">عرض / طباعة</Button>
                  {d.status === 'ACTIVE' && <Button size="small" color="warning" onClick={() => { setRevoking(d); setReason(''); }}>إلغاء</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا توجد وثائق.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} sx={{ alignSelf: 'center' }} />}
      <Dialog open={Boolean(revoking)} onClose={busy ? undefined : () => setRevoking(null)} fullWidth maxWidth="xs">
        <DialogTitle>إلغاء الوثيقة {revoking?.number}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="سبب الإلغاء (مطلوب)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Typography variant="caption" color="text.secondary">تبقى الوثيقة محفوظة بحالة «ملغاة»، وصفحة التحقق تعرضها ملغاة.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevoking(null)} disabled={busy}>تراجع</Button>
          <Button color="warning" variant="contained" onClick={revoke} disabled={busy || !reason.trim()}>تأكيد الإلغاء</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function TypesList({ role }: { role: string }) {
  const isAdmin = role === 'SYSTEM_ADMIN';
  const [types, setTypes] = useState<DocumentTypeItem[]>([]);
  const [form, setForm] = useState<TypeForm | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getDocumentTypes().then((list) => { setTypes(list); setError(''); }).catch((cause) => setError(errorText(cause, 'تعذر تحميل الأنواع.'))), []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form) return;
    setBusy(true); setDialogError('');
    const body = { nameAr: form.nameAr.trim(), titleAr: form.titleAr.trim(), issuingBody: form.issuingBody.trim(), bodyTemplate: form.bodyTemplate.trim(), footerNote: form.footerNote.trim(), includesResults: form.includesResults };
    try {
      if (form.id) await updateDocumentType(form.id, body); else await createDocumentType({ ...body, code: form.code.trim() });
      setForm(null); await load();
    } catch (cause) { setDialogError(errorText(cause)); } finally { setBusy(false); }
  }

  async function toggle(t: DocumentTypeItem) {
    try { await updateDocumentType(t.id, { isActive: !t.isActive }); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Alert severity="info" sx={{ flex: 1, me: 2 }}>القالب الرسمي (الشعار والترقيم ورمز QR والتوقيع) موحّد لكل الوثائق. هنا تعدّل نص كل نوع وجهته المصدرة. تعديل النص لا يغيّر وثائق صدرت سابقاً.{!isAdmin && ' التعديل لمدير النظام فقط.'}</Alert>
        {isAdmin && <Button variant="contained" onClick={() => { setDialogError(''); setForm(EMPTY_TYPE); }}>إضافة نوع</Button>}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="أنواع الوثائق">
          <TableHead><TableRow><TableCell>النوع</TableCell><TableCell>العنوان على الوثيقة</TableCell><TableCell>الجهة المصدرة</TableCell><TableCell>جدول علامات</TableCell><TableCell>الحالة</TableCell>{isAdmin && <TableCell />}</TableRow></TableHead>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ fontWeight: 700 }}>{t.nameAr}</TableCell><TableCell>{t.titleAr}</TableCell><TableCell>{t.issuingBody}</TableCell><TableCell>{t.includesResults ? 'نعم' : 'لا'}</TableCell>
                <TableCell>{isAdmin ? <Switch checked={t.isActive} onChange={() => void toggle(t)} slotProps={{ input: { 'aria-label': `تفعيل ${t.nameAr}` } }} /> : null}<Chip size="small" label={t.isActive ? 'فعّال' : 'موقوف'} color={t.isActive ? 'success' : 'default'} /></TableCell>
                {isAdmin && <TableCell><Button size="small" onClick={() => { setDialogError(''); setForm({ id: t.id, code: t.code, nameAr: t.nameAr, titleAr: t.titleAr, issuingBody: t.issuingBody, bodyTemplate: t.bodyTemplate, footerNote: t.footerNote ?? '', includesResults: t.includesResults }); }}>تعديل</Button></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="md">
        <DialogTitle>{form?.id ? 'تعديل نوع وثيقة' : 'إضافة نوع وثيقة'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {form && (<>
              <TextField label="رمز النوع (أحرف إنجليزية كبيرة)" value={form.code} disabled={Boolean(form.id)} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <TextField label="اسم النوع" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              <TextField label="العنوان على الوثيقة" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
              <TextField label="الجهة المصدرة" value={form.issuingBody} onChange={(e) => setForm({ ...form, issuingBody: e.target.value })} />
              <TextField label="نص الوثيقة" multiline minRows={6} value={form.bodyTemplate} onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })} helperText={`المتغيرات المتاحة: ${PLACEHOLDER_HELP}. السطر الذي قيمه فارغة يُحذف تلقائياً.`} slotProps={{ htmlInput: { dir: 'rtl' } }} />
              <TextField label="ملاحظة أسفل الوثيقة" value={form.footerNote} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} />
              <FormControlLabel label="تتضمن جدول علامات الطالب" control={<Checkbox checked={form.includesResults} onChange={(e) => setForm({ ...form, includesResults: e.target.checked })} />} />
            </>)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={save} disabled={busy || !form || !form.nameAr.trim() || !form.titleAr.trim() || !form.bodyTemplate.trim() || (!form.id && !form.code.trim())}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default function AffairsDocumentsTab({ role }: { role: string }) {
  const [section, setSection] = useState<'issued' | 'types'>('issued');
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Chip label="الوثائق الصادرة" clickable color={section === 'issued' ? 'primary' : 'default'} variant={section === 'issued' ? 'filled' : 'outlined'} onClick={() => setSection('issued')} />
        <Chip label="أنواع الوثائق وقوالبها" clickable color={section === 'types' ? 'primary' : 'default'} variant={section === 'types' ? 'filled' : 'outlined'} onClick={() => setSection('types')} />
      </Stack>
      {section === 'issued' ? <IssuedList /> : <TypesList role={role} />}
    </Stack>
  );
}
