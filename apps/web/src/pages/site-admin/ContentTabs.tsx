import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  SITE_KIND_EXTRA, SITE_KIND_LABEL, SITE_STATUS_LABEL, createSiteItem, getSiteItems, getSiteMessages, getSiteSettings, saveSiteSettings, setSiteItemStatus, setSiteMessageStatus, updateSiteItem,
  type SettingDef, type SiteItemKind, type SiteItemRow, type SiteMessageRow, type SiteStatus,
} from '../../api/siteAdmin';
import { ImagePicker } from './shared';
import { errorText, useMediaList } from './adminHelpers';

const GROUPS: Record<string, string> = { home: 'الرئيسية', about: 'من نحن وكلمة الرئيس', admission: 'القبول والتسجيل', contact: 'التواصل والحسابات الاجتماعية والخريطة', sections: 'مقدمات الصفحات الجديدة' };

// النصوص المفردة: الشعار، نبذة، رؤية ورسالة، كلمة الرئيس، نصوص القبول، بيانات التواصل. الحقل الفارغ يُخفى من الموقع.
export function SettingsTab() {
  const [defs, setDefs] = useState<SettingDef[]>([]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { images } = useMediaList();

  const load = useCallback(() => getSiteSettings().then((data) => { setDefs(data.defs); setSaved(data.values); setValues(data.values); }).catch((cause) => setMessage({ ok: false, text: errorText(cause) })), []);
  useEffect(() => { void load(); }, [load]);

  const changed = Object.fromEntries(defs.filter((def) => (values[def.key] ?? '') !== (saved[def.key] ?? '')).map((def) => [def.key, values[def.key] ?? '']));

  async function save() {
    setBusy(true); setMessage(null);
    try { await saveSiteSettings(changed); setMessage({ ok: true, text: 'تم الحفظ.' }); await load(); } catch (cause) { setMessage({ ok: false, text: errorText(cause) }); } finally { setBusy(false); }
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">أي حقل تتركه فارغًا لا يظهر في الموقع، وما تكتبه هنا هو ما يراه الزوار. الفقرات تُفصل بسطر فارغ.</Alert>
      {message && <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {Object.entries(GROUPS).map(([group, title]) => (
        <Paper key={group} variant="outlined" sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>{title}</Typography>
          <Stack spacing={2}>
            {defs.filter((def) => def.group === group).map((def) => def.kind === 'media' ? (
              <ImagePicker key={def.key} label={def.label} value={values[def.key] || null} images={images} onChange={(id) => setValues({ ...values, [def.key]: id ?? '' })} />
            ) : (
              <TextField key={def.key} label={def.label} value={values[def.key] ?? ''} multiline={def.multiline} minRows={def.multiline ? 3 : undefined} onChange={(event) => setValues({ ...values, [def.key]: event.target.value })}
                helperText={`${(values[def.key] ?? '').length} / ${def.max}`} error={(values[def.key] ?? '').length > def.max} slotProps={{ htmlInput: { dir: def.kind === 'url' || def.key === 'contactEmail' ? 'ltr' : undefined } }} />
            ))}
          </Stack>
        </Paper>
      ))}
      <Box><Button variant="contained" disabled={busy || Object.keys(changed).length === 0} onClick={() => void save()}>{busy ? 'جارٍ الحفظ...' : `حفظ التغييرات (${Object.keys(changed).length})`}</Button></Box>
    </Stack>
  );
}

type ItemForm = { id?: string; title: string; text: string; extra: string; sortOrder: string };

// العناصر المتكررة: أرقام، قيم، أهداف، مراحل تاريخية، خطوات تقديم، أسئلة شائعة. الأرشفة بدل الحذف.
export function ItemsTab() {
  const [kind, setKind] = useState<SiteItemKind>('STAT');
  const [items, setItems] = useState<SiteItemRow[]>([]);
  const [form, setForm] = useState<ItemForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => getSiteItems().then(setItems).catch((cause) => setError(errorText(cause))), []);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => items.filter((item) => item.kind === kind), [items, kind]);

  async function save() {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const body = { title: form.title.trim(), text: form.text.trim(), extra: form.extra.trim(), sortOrder: Number(form.sortOrder) || 0 };
      if (form.id) await updateSiteItem(form.id, body); else await createSiteItem({ kind, ...body });
      setForm(null); await load();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  async function status(item: SiteItemRow, next: SiteStatus) {
    try { await setSiteItemStatus(item.id, next); await load(); } catch (cause) { setError(errorText(cause)); }
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField select size="small" label="النوع" value={kind} onChange={(event) => setKind(event.target.value as SiteItemKind)} sx={{ minWidth: 280 }}>
          {(Object.keys(SITE_KIND_LABEL) as SiteItemKind[]).map((key) => <MenuItem key={key} value={key}>{SITE_KIND_LABEL[key]}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={() => setForm({ title: '', text: '', extra: '', sortOrder: String(rows.length + 1) })}>إضافة</Button>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={SITE_KIND_LABEL[kind]}>
          <TableHead><TableRow><TableCell>الترتيب</TableCell>{SITE_KIND_EXTRA[kind] && <TableCell>{SITE_KIND_EXTRA[kind]}</TableCell>}<TableCell>العنوان</TableCell><TableCell>النص</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id} sx={{ opacity: item.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <TableCell>{item.sortOrder}</TableCell>
                {SITE_KIND_EXTRA[kind] && <TableCell>{item.extra ?? '—'}</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>{item.title}</TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{item.text || '—'}</TableCell>
                <TableCell><Chip size="small" color={item.status === 'PUBLISHED' ? 'success' : 'default'} label={SITE_STATUS_LABEL[item.status]} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => setForm({ id: item.id, title: item.title, text: item.text, extra: item.extra ?? '', sortOrder: String(item.sortOrder) })}>تعديل</Button>
                  {item.status === 'ARCHIVED' ? <Button size="small" color="success" onClick={() => void status(item, 'PUBLISHED')}>استعادة</Button> : <Button size="small" color="warning" onClick={() => void status(item, 'ARCHIVED')}>أرشفة</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا عناصر. القسم المقابل مخفي في الموقع.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(form)} onClose={busy ? undefined : () => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'تعديل' : 'إضافة'} — {SITE_KIND_LABEL[kind]}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="العنوان" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
              {SITE_KIND_EXTRA[kind] && <TextField label={SITE_KIND_EXTRA[kind]} value={form.extra} onChange={(event) => setForm({ ...form, extra: event.target.value })} slotProps={{ htmlInput: { maxLength: 60 } }} />}
              <TextField label="النص" multiline minRows={3} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} slotProps={{ htmlInput: { maxLength: 3000 } }} />
              <TextField label="الترتيب" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setForm(null)} disabled={busy}>إلغاء</Button><Button variant="contained" onClick={() => void save()} disabled={busy || !form?.title.trim()}>حفظ</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

// رسائل نموذج التواصل
export function MessagesTab() {
  const [rows, setRows] = useState<SiteMessageRow[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(() => getSiteMessages().then(setRows).catch((cause) => setError(errorText(cause))), []);
  useEffect(() => { void load(); }, [load]);
  async function mark(row: SiteMessageRow, status: 'NEW' | 'READ' | 'ARCHIVED') {
    try { await setSiteMessageStatus(row.id, status); await load(); } catch (cause) { setError(errorText(cause)); }
  }
  const label = { NEW: 'جديدة', READ: 'مقروءة', ARCHIVED: 'مؤرشفة' } as const;
  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="رسائل التواصل">
          <TableHead><TableRow><TableCell>التاريخ</TableCell><TableCell>الاسم</TableCell><TableCell>وسيلة التواصل</TableCell><TableCell>الموضوع</TableCell><TableCell>الرسالة</TableCell><TableCell>الحالة</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ fontWeight: row.status === 'NEW' ? 700 : 400, opacity: row.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <TableCell>{row.createdAt.slice(0, 10)}</TableCell><TableCell>{row.name}</TableCell><TableCell dir="ltr">{row.contact}</TableCell><TableCell>{row.subject || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 380, whiteSpace: 'pre-line' }}>{row.message}</TableCell>
                <TableCell><Chip size="small" color={row.status === 'NEW' ? 'warning' : 'default'} label={label[row.status]} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {row.status !== 'READ' && <Button size="small" onClick={() => void mark(row, 'READ')}>تمت القراءة</Button>}
                  {row.status !== 'ARCHIVED' ? <Button size="small" color="warning" onClick={() => void mark(row, 'ARCHIVED')}>أرشفة</Button> : <Button size="small" onClick={() => void mark(row, 'NEW')}>إعادة كجديدة</Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>لا رسائل.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
