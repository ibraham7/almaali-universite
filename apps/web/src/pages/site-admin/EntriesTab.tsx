import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  ENTRY_CATEGORIES, ENTRY_KIND_LABEL, SITE_STATUS_LABEL, createSiteEntry, deleteSiteEntry, getSiteEntriesAdmin, setSiteEntryStatus, updateSiteEntry,
  type EntryKind, type SiteEntryRow, type SiteStatus,
} from '../../api/siteAdmin';
import { siteMediaUrl } from '../../api/site';
import { ImagePicker } from './shared';
import { errorText, useMediaList } from './adminHelpers';

type Form = { id?: string; title: string; category: string; summary: string; body: string; location: string; startsAt: string; endsAt: string; coverMediaId: string | null; galleryIds: string[]; videos: string; sortOrder: string };

// <input type="datetime-local"> يستخدم التوقيت المحلي بلا منطقة: نحوّل منه وإليه بدقة.
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
const chipColor = (status: SiteStatus) => (status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warning' : 'default');
const empty = (count: number): Form => ({ title: '', category: '', summary: '', body: '', location: '', startsAt: '', endsAt: '', coverMediaId: null, galleryIds: [], videos: '', sortOrder: String(count + 1) });

// الفعاليات والبحث العلمي والخريجون والحياة الجامعية: نموذج واحد بحقول تُعرض حسب النوع. الحذف نهائي ويُسجَّل.
export default function EntriesTab() {
  const [kind, setKind] = useState<EntryKind>('EVENT');
  const [rows, setRows] = useState<SiteEntryRow[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteEntryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { images } = useMediaList();
  const categories = ENTRY_CATEGORIES[kind];
  const load = useCallback(() => getSiteEntriesAdmin(kind).then(setRows).catch((cause) => setError(errorText(cause))), [kind]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const body = {
        title: form.title.trim(), category: form.category, summary: form.summary.trim(), body: form.body.trim(), location: form.location.trim(),
        startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt), coverMediaId: form.coverMediaId, galleryIds: form.galleryIds, videos: form.videos.split(/\n+/).map((line) => line.trim()).filter(Boolean), sortOrder: Number(form.sortOrder) || 0,
      };
      if (form.id) await updateSiteEntry(form.id, body); else await createSiteEntry(kind, body);
      setForm(null); await load();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  async function status(row: SiteEntryRow, next: SiteStatus) {
    try { await setSiteEntryStatus(row.id, next); await load(); } catch (cause) { setError(errorText(cause)); }
  }
  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try { await deleteSiteEntry(confirmDelete.id); setConfirmDelete(null); await load(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  const toggleGallery = (id: string) => form && setForm({ ...form, galleryIds: form.galleryIds.includes(id) ? form.galleryIds.filter((item) => item !== id) : [...form.galleryIds, id].slice(0, 24) });

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField select size="small" label="القسم" value={kind} onChange={(event) => { setRows([]); setKind(event.target.value as EntryKind); }} sx={{ minWidth: 280 }}>
          {(Object.keys(ENTRY_KIND_LABEL) as EntryKind[]).map((key) => <MenuItem key={key} value={key}>{ENTRY_KIND_LABEL[key]}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={() => setForm(empty(rows.length))}>إضافة</Button>
      </Stack>
      <Alert severity="info">يُحفظ العنصر مسودة ولا يظهر بالموقع حتى تضغط «نشر». {kind === 'EVENT' ? 'الفعالية تنتقل تلقائيًا من «قادمة» إلى «سابقة» بعد موعدها.' : ''} الحذف نهائي ولا يمكن التراجع عنه، والأرشفة تخفي العنصر مع إمكانية استعادته.</Alert>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={ENTRY_KIND_LABEL[kind]}>
          <TableHead><TableRow><TableCell>العنوان</TableCell>{categories.length > 0 && <TableCell>التصنيف</TableCell>}{kind === 'EVENT' && <TableCell>الموعد</TableCell>}<TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ opacity: row.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <TableCell sx={{ fontWeight: 700 }}>{row.title}</TableCell>
                {categories.length > 0 && <TableCell>{row.category || '—'}</TableCell>}
                {kind === 'EVENT' && <TableCell>{row.startsAt ? new Date(row.startsAt).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</TableCell>}
                <TableCell><Chip size="small" color={chipColor(row.status)} label={SITE_STATUS_LABEL[row.status]} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => setForm({ id: row.id, title: row.title, category: row.category, summary: row.summary, body: row.body, location: row.location, startsAt: toLocal(row.startsAt), endsAt: toLocal(row.endsAt), coverMediaId: row.coverMediaId, galleryIds: row.galleryIds, videos: row.videos.join('\n'), sortOrder: String(row.sortOrder) })}>تعديل</Button>
                  {row.status !== 'PUBLISHED' && <Button size="small" color="success" onClick={() => void status(row, 'PUBLISHED')}>{row.status === 'ARCHIVED' ? 'استعادة ونشر' : 'نشر'}</Button>}
                  {row.status === 'PUBLISHED' && <Button size="small" onClick={() => void status(row, 'DRAFT')}>إلغاء النشر</Button>}
                  {row.status !== 'ARCHIVED' && <Button size="small" color="warning" onClick={() => void status(row, 'ARCHIVED')}>أرشفة</Button>}
                  <Button size="small" color="error" onClick={() => setConfirmDelete(row)}>حذف</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا عناصر. الصفحة المقابلة مخفية بالموقع حتى تنشر عنصرًا.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="md">
        <DialogTitle>{form?.id ? 'تعديل' : 'إضافة'} — {ENTRY_KIND_LABEL[kind]}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="العنوان" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} slotProps={{ htmlInput: { maxLength: 250 } }} />
              {kind === 'EVENT' && <TextField label="التصنيف (مثل: مؤتمرات وندوات، أنشطة رياضية)" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} helperText="التصنيفات المستخدمة تظهر كأزرار فلترة في صفحة الفعاليات." slotProps={{ htmlInput: { maxLength: 120 } }} />}
              {categories.length > 0 && (
                <TextField select size="small" label="التصنيف" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <MenuItem value="">بدون تصنيف</MenuItem>
                  {categories.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
                </TextField>
              )}
              {kind === 'EVENT' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField required fullWidth type="datetime-local" label="بداية الفعالية" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField fullWidth type="datetime-local" label="نهاية الفعالية (اختياري)" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </Stack>
              )}
              {(kind === 'EVENT' || kind === 'CAMPUS' || kind === 'GRADUATE_NEWS') && <TextField label="المكان" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} slotProps={{ htmlInput: { maxLength: 250 } }} />}
              <TextField label="ملخص قصير (يظهر في البطاقة)" multiline minRows={2} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} slotProps={{ htmlInput: { maxLength: 600 } }} />
              <TextField label="الوصف / النص الكامل" multiline minRows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} helperText="الفقرات تُفصل بسطر فارغ." slotProps={{ htmlInput: { maxLength: 20000 } }} />
              <ImagePicker label="صورة الغلاف" value={form.coverMediaId} images={images} onChange={(id) => setForm({ ...form, coverMediaId: id })} />
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>معرض الصور ({form.galleryIds.length} / 24)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>اضغط الصور لإضافتها أو إزالتها. ارفع الصور أولًا من تبويب «الوسائط».</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 1, maxHeight: 220, overflow: 'auto' }}>
                  {images.map((image) => {
                    const on = form.galleryIds.includes(image.id);
                    return (
                      <Box key={image.id} component="button" type="button" aria-pressed={on} aria-label={image.altText || image.fileName} onClick={() => toggleGallery(image.id)} sx={{ p: 0, aspectRatio: '1', borderRadius: 1, overflow: 'hidden', cursor: 'pointer', border: '3px solid', borderColor: on ? 'primary.main' : 'transparent', opacity: on ? 1 : 0.7 }}>
                        <Box component="img" src={siteMediaUrl(image.id)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    );
                  })}
                  {images.length === 0 && <Typography variant="body2" color="text.secondary">لا صور مرفوعة بعد.</Typography>}
                </Box>
              </Box>
              <TextField label="روابط الفيديو (رابط في كل سطر)" multiline minRows={2} value={form.videos} onChange={(event) => setForm({ ...form, videos: event.target.value })} helperText="يوتيوب أو ملف mp4/webm بعنوان https (حتى 6). لا نرفع الفيديو إلى الموقع." slotProps={{ htmlInput: { dir: 'ltr' } }} />
              {kind !== 'EVENT' && <TextField label="الترتيب" type="number" size="small" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} sx={{ maxWidth: 160 }} />}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button><Button variant="contained" onClick={() => void save()} disabled={busy || !form?.title.trim() || (kind === 'EVENT' && !form?.startsAt)}>حفظ</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={busy ? undefined : () => setConfirmDelete(null)}>
        <DialogTitle>حذف نهائي</DialogTitle>
        <DialogContent><Typography>سيُحذف «{confirmDelete?.title}» نهائيًا ولا يمكن استعادته. إن أردت إخفاءه فقط فاستخدم «أرشفة».</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDelete(null)} disabled={busy}>إلغاء</Button><Button color="error" variant="contained" onClick={() => void remove()} disabled={busy}>حذف نهائيًا</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
