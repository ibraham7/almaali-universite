import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  SITE_STATUS_LABEL, archiveSiteMedia, createSiteNews, createSiteTestimonial, getSiteAcademic, getSiteItems, getSiteMedia, getSiteNewsAdmin, getSiteTestimonials, restoreSiteMedia, saveSiteProfile,
  setSiteNewsStatus, setSiteTestimonialStatus, updateSiteMedia, updateSiteNews, updateSiteTestimonial, uploadSiteMedia,
  type AcademicNode, type SiteMediaRow, type SiteNewsRow, type SiteStatus, type SiteTestimonialRow,
} from '../../api/siteAdmin';
import { siteMediaUrl } from '../../api/site';
import { ImagePicker } from './shared';
import { errorText, useMediaList } from './adminHelpers';

const chipColor = (status: SiteStatus) => (status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warning' : 'default');

// الأخبار والإعلانات: تبدأ مسودة، النشر يضع التاريخ، والأرشفة تخفيها دون حذف.
export function NewsTab() {
  const [rows, setRows] = useState<SiteNewsRow[]>([]);
  const [form, setForm] = useState<{ id?: string; type: string; category: string; title: string; summary: string; body: string; coverMediaId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { images } = useMediaList();
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => { getSiteItems().then((items) => setCategories(items.filter((item) => item.kind === 'NEWS_CATEGORY' && item.status === 'PUBLISHED').map((item) => item.title))).catch(() => undefined); }, []);
  const load = useCallback(() => getSiteNewsAdmin().then(setRows).catch((cause) => setError(errorText(cause))), []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const body = { type: form.type, category: form.category, title: form.title.trim(), summary: form.summary.trim(), body: form.body.trim(), coverMediaId: form.coverMediaId };
      if (form.id) await updateSiteNews(form.id, body); else await createSiteNews(body);
      setForm(null); await load();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function status(row: SiteNewsRow, next: SiteStatus) {
    try { await setSiteNewsStatus(row.id, next); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Box><Button variant="contained" onClick={() => setForm({ type: 'NEWS', category: '', title: '', summary: '', body: '', coverMediaId: null })}>إضافة خبر أو إعلان</Button></Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الأخبار">
          <TableHead><TableRow><TableCell>العنوان</TableCell><TableCell>النوع</TableCell><TableCell>التصنيف</TableCell><TableCell>تاريخ النشر</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ opacity: row.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <TableCell sx={{ fontWeight: 700 }}>{row.title}</TableCell>
                <TableCell>{row.type === 'ANNOUNCEMENT' ? 'إعلان' : 'خبر'}</TableCell>
                <TableCell>{row.category || '—'}</TableCell>
                <TableCell>{row.publishedAt?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell><Chip size="small" color={chipColor(row.status)} label={SITE_STATUS_LABEL[row.status]} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => setForm({ id: row.id, type: row.type, category: row.category, title: row.title, summary: row.summary, body: row.body, coverMediaId: row.coverMediaId })}>تعديل</Button>
                  {row.status !== 'PUBLISHED' && <Button size="small" color="success" onClick={() => void status(row, 'PUBLISHED')}>{row.status === 'ARCHIVED' ? 'استعادة ونشر' : 'نشر'}</Button>}
                  {row.status === 'PUBLISHED' && <Button size="small" onClick={() => void status(row, 'DRAFT')}>إلغاء النشر</Button>}
                  {row.status !== 'ARCHIVED' && <Button size="small" color="warning" onClick={() => void status(row, 'ARCHIVED')}>أرشفة</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا أخبار.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="md">
        <DialogTitle>{form?.id ? 'تعديل' : 'إضافة'} خبر أو إعلان</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField select size="small" label="النوع" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><MenuItem value="NEWS">خبر</MenuItem><MenuItem value="ANNOUNCEMENT">إعلان</MenuItem></TextField>
              <TextField select size="small" label="التصنيف" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} helperText="تُدار التصنيفات من تبويب «عناصر المحتوى» ← تصنيفات الأخبار."><MenuItem value="">بدون تصنيف</MenuItem>{[...new Set([...(form.category ? [form.category] : []), ...categories])].map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}</TextField>
              <TextField required label="العنوان" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} slotProps={{ htmlInput: { maxLength: 250 } }} />
              <TextField label="ملخص قصير (يظهر في البطاقة)" multiline minRows={2} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} slotProps={{ htmlInput: { maxLength: 600 } }} />
              <TextField label="النص الكامل" multiline minRows={6} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} helperText="الفقرات تُفصل بسطر فارغ." slotProps={{ htmlInput: { maxLength: 20000 } }} />
              <ImagePicker label="صورة الغلاف" value={form.coverMediaId} images={images} onChange={(id) => setForm({ ...form, coverMediaId: id })} />
              <Alert severity="info">يُحفظ الخبر مسودة، ولا يظهر بالموقع حتى تضغط «نشر».</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button><Button variant="contained" onClick={() => void save()} disabled={busy || !form?.title.trim()}>حفظ</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

export function TestimonialsTab() {
  const [rows, setRows] = useState<SiteTestimonialRow[]>([]);
  const [form, setForm] = useState<{ id?: string; text: string; name: string; role: string; sortOrder: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(() => getSiteTestimonials().then(setRows).catch((cause) => setError(errorText(cause))), []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const body = { text: form.text.trim(), name: form.name.trim(), role: form.role.trim(), sortOrder: Number(form.sortOrder) || 0 };
      if (form.id) await updateSiteTestimonial(form.id, body); else await createSiteTestimonial(body);
      setForm(null); await load();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function status(row: SiteTestimonialRow, next: SiteStatus) {
    try { await setSiteTestimonialStatus(row.id, next); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Alert severity="info">انشر فقط آراء حقيقية من طلاب أو خريجين أو عاملين وافقوا على نشرها.</Alert>
      <Box><Button variant="contained" onClick={() => setForm({ text: '', name: '', role: '', sortOrder: String(rows.length + 1) })}>إضافة شهادة</Button></Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="الشهادات">
          <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>الصفة</TableCell><TableCell>النص</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ opacity: row.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell><TableCell>{row.role || '—'}</TableCell><TableCell sx={{ maxWidth: 380 }}>{row.text}</TableCell>
                <TableCell><Chip size="small" color={chipColor(row.status)} label={SITE_STATUS_LABEL[row.status]} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => setForm({ id: row.id, text: row.text, name: row.name, role: row.role, sortOrder: String(row.sortOrder) })}>تعديل</Button>
                  {row.status !== 'PUBLISHED' && <Button size="small" color="success" onClick={() => void status(row, 'PUBLISHED')}>{row.status === 'ARCHIVED' ? 'استعادة ونشر' : 'نشر'}</Button>}
                  {row.status === 'PUBLISHED' && <Button size="small" onClick={() => void status(row, 'DRAFT')}>إلغاء النشر</Button>}
                  {row.status !== 'ARCHIVED' && <Button size="small" color="warning" onClick={() => void status(row, 'ARCHIVED')}>أرشفة</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا شهادات. صفحة «قالوا عن الجامعة» مخفية.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'تعديل' : 'إضافة'} شهادة</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="النص" multiline minRows={3} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} slotProps={{ htmlInput: { maxLength: 1200 } }} />
              <TextField required label="الاسم" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
              <TextField label="الصفة (طالب، خريج...)" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} slotProps={{ htmlInput: { maxLength: 160 } }} />
              <TextField label="الترتيب" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button><Button variant="contained" onClick={() => void save()} disabled={busy || !form?.text.trim() || !form?.name.trim()}>حفظ</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

type Kind = 'COLLEGE' | 'DEPARTMENT' | 'PROGRAM';

function ProfileRow({ node, kind, images, depth, onSaved, onError, children }: { node: AcademicNode; kind: Kind; images: SiteMediaRow[]; depth: number; onSaved: () => void; onError: (message: string) => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ summary: node.summary, details: node.details, mediaId: node.mediaId, sortOrder: String(node.sortOrder), isVisible: node.isVisible });
  const [busy, setBusy] = useState(false);
  const dirty = form.summary !== node.summary || form.details !== node.details || form.mediaId !== node.mediaId || Number(form.sortOrder) !== node.sortOrder || form.isVisible !== node.isVisible;
  const hideLabel = kind === 'COLLEGE' ? 'يظهر بالموقع' : 'يظهر (افتراضيًا نعم)';

  async function save() {
    setBusy(true);
    try { await saveSiteProfile(kind, node.id, { summary: form.summary, details: form.details, mediaId: form.mediaId, sortOrder: Number(form.sortOrder) || 0, isVisible: form.isVisible }); onSaved(); } catch (cause) { onError(errorText(cause)); } finally { setBusy(false); }
  }

  return (
    <Box sx={{ marginInlineStart: depth * 3, mb: 1 }}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Typography sx={{ fontWeight: depth === 0 ? 800 : 600, flex: 1, minWidth: 160 }}>{node.nameAr}</Typography>
          <FormControlLabel control={<Switch checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} />} label={hideLabel} />
          <Button size="small" onClick={() => setOpen(!open)}>{open ? 'إغلاق' : 'نبذة وصورة وترتيب'}</Button>
          <Button size="small" variant="contained" disabled={busy || !dirty} onClick={() => void save()}>حفظ</Button>
        </Stack>
        <Collapse in={open} unmountOnExit>
          <Stack spacing={1.5} sx={{ pt: 1.5 }}>
            <TextField label="نبذة" multiline minRows={2} size="small" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            {kind === 'COLLEGE' && <TextField label="تفاصيل إضافية (تظهر في صفحة الكلية)" multiline minRows={3} size="small" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} slotProps={{ htmlInput: { maxLength: 6000 } }} />}
            {kind === 'COLLEGE' && <ImagePicker label="الصورة" value={form.mediaId} images={images} onChange={(id) => setForm({ ...form, mediaId: id })} />}
            <TextField label="الترتيب" type="number" size="small" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} sx={{ maxWidth: 140 }} />
          </Stack>
        </Collapse>
      </Paper>
      {children}
    </Box>
  );
}

// الكليات والأقسام والبرامج: الأسماء من الهيكل الأكاديمي (لا تُكرَّر)، والموقع يحفظ النبذة والصورة والترتيب والظهور فقط.
export function AcademicTab() {
  const [tree, setTree] = useState<AcademicNode[]>([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const { images } = useMediaList();
  const load = useCallback(() => getSiteAcademic().then((data) => { setTree(data); setVersion((current) => current + 1); }).catch((cause) => setError(errorText(cause))), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <Stack spacing={1.5}>
      <Alert severity="info">الكلية لا تظهر في الموقع إلا إذا فعّلت «يظهر بالموقع». الأقسام والبرامج تظهر تحتها تلقائيًا إلا إذا أخفيتها. الكليات والأقسام والبرامج المعطّلة في الهيكل الأكاديمي لا تظهر هنا.</Alert>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {tree.map((college) => (
        <ProfileRow key={`${college.id}-${version}`} node={college} kind="COLLEGE" images={images} depth={0} onSaved={load} onError={setError}>
          {(college.departments ?? []).map((department) => (
            <ProfileRow key={`${department.id}-${version}`} node={department} kind="DEPARTMENT" images={images} depth={1} onSaved={load} onError={setError}>
              {(department.programs ?? []).map((program) => <ProfileRow key={`${program.id}-${version}`} node={program} kind="PROGRAM" images={images} depth={1} onSaved={load} onError={setError} />)}
            </ProfileRow>
          ))}
        </ProfileRow>
      ))}
      {tree.length === 0 && <Alert severity="warning">لا توجد كليات فعّالة في الهيكل الأكاديمي.</Alert>}
    </Stack>
  );
}

const size = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// الوسائط: PDF وJPG وPNG وWebP (حتى 4 ميغابايت). الأرشفة بدل الحذف.
export function MediaTab() {
  const [rows, setRows] = useState<SiteMediaRow[]>([]);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; altText: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(() => getSiteMedia(true).then(setRows).catch((cause) => setMessage({ ok: false, text: errorText(cause) })), []);
  useEffect(() => { void load(); }, [load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMessage(null);
    try { await uploadSiteMedia(file, alt); setAlt(''); setMessage({ ok: true, text: 'تم رفع الملف.' }); await load(); } catch (cause) { setMessage({ ok: false, text: errorText(cause) }); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function toggle(row: SiteMediaRow) {
    try { if (row.isArchived) await restoreSiteMedia(row.id); else await archiveSiteMedia(row.id); await load(); } catch (cause) { setMessage({ ok: false, text: errorText(cause) }); }
  }
  async function saveAlt() {
    if (!editing) return;
    try { await updateSiteMedia(editing.id, editing.altText); setEditing(null); await load(); } catch (cause) { setMessage({ ok: false, text: errorText(cause) }); }
  }

  return (
    <Stack spacing={2}>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <TextField size="small" label="وصف الصورة (للقارئات الصوتية)" value={alt} onChange={(event) => setAlt(event.target.value)} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 250 } }} />
          <Button variant="contained" component="label" disabled={busy}>
            {busy ? 'جارٍ الرفع...' : 'رفع ملف'}
            <input ref={input} hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} />
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">PDF أو JPG أو PNG أو WebP، حتى 4 ميغابايت. يُفحص نوع الملف من محتواه.</Typography>
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {rows.map((row) => (
          <Paper key={row.id} variant="outlined" sx={{ p: 1.5, opacity: row.isArchived ? 0.55 : 1 }}>
            {row.mimeType.startsWith('image/') && !row.isArchived
              ? <Box component="img" src={siteMediaUrl(row.id)} alt={row.altText ?? ''} sx={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 1 }} />
              : <Box sx={{ height: 110, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', borderRadius: 1, color: 'text.secondary' }}>{row.mimeType === 'application/pdf' ? 'PDF' : 'مؤرشفة'}</Box>}
            <Typography sx={{ fontWeight: 700, mt: 1, fontSize: 14, wordBreak: 'break-all' }}>{row.fileName}</Typography>
            <Typography variant="caption" color="text.secondary">{size(row.sizeBytes)} • {row.createdAt.slice(0, 10)}</Typography>
            {row.altText && <Typography variant="body2">{row.altText}</Typography>}
            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
              <Button size="small" onClick={() => setEditing({ id: row.id, altText: row.altText ?? '' })}>الوصف</Button>
              <Button size="small" color={row.isArchived ? 'success' : 'warning'} onClick={() => void toggle(row)}>{row.isArchived ? 'استعادة' : 'أرشفة'}</Button>
            </Stack>
          </Paper>
        ))}
      </Box>
      {rows.length === 0 && <Alert severity="info">لا ملفات بعد.</Alert>}
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>وصف الصورة</DialogTitle>
        <DialogContent><TextField fullWidth sx={{ mt: 1 }} label="الوصف" value={editing?.altText ?? ''} onChange={(event) => editing && setEditing({ ...editing, altText: event.target.value })} slotProps={{ htmlInput: { maxLength: 250 } }} /></DialogContent>
        <DialogActions><Button onClick={() => setEditing(null)}>إلغاء</Button><Button variant="contained" onClick={() => void saveAlt()}>حفظ</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
