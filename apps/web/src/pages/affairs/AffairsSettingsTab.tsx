import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { getAffairsSettings, updateAffairsSettings, type SettingsView } from '../../api/affairs';
import { errorText } from './affairsUi';

const FIXED_RULES = [
  'الأدوار الأساسية ثابتة: طالب، مشرف أكاديمي، مسجل (موظف شؤون الطلاب)، مدير النظام. إنشاء الحسابات وتعيين الأدوار من صفحة «المستخدمون والصلاحيات».',
  'مدير النظام يملك كل الإجراءات ولا تقيّده هذه المفاتيح، وكذلك مدير الوحدة (موظف يحمل علامة «مدير وحدة» على ملفه).',
  'مدير الوحدة يسند الطلبات ويعيد توزيعها ويتابع حجم عمل الجميع والتقارير الكاملة. تعيينه من مدير النظام. لا يعمل على طلب غير مسند إليه إلا بعد إسناده لنفسه.',
  'الموظف يعمل فقط على الطلبات المسندة إليه، ويقدر يستلم طلباً جديداً غير مسند إذا كان المفتاح مفعّلاً.',
  'الطالب يرى طلباته ووثائقه فقط، ولا يرى الملاحظات الداخلية ولا تفاصيل الإحالات.',
  'لا حذف نهائي لأي سجل: الطلبات والمرفقات والوثائق والإحالات تُغلق أو تُلغى أو تُؤرشف بسبب.',
  'التحقق من الصلاحيات يتم في الخادم، وليس بإخفاء الأزرار فقط.',
];

export default function AffairsSettingsTab({ role }: { role: string }) {
  const isAdmin = role === 'SYSTEM_ADMIN';
  const [view, setView] = useState<SettingsView | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean | number | string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getAffairsSettings().then(setView).catch((cause) => setError(errorText(cause, 'تعذر تحميل الإعدادات.'))); }, []);

  if (!view) return error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">جارٍ التحميل...</Typography>;

  const value = (key: string) => (key in draft ? draft[key] : view.values[key]);
  const changed = Object.entries(draft).filter(([k, v]) => v !== view.values[k]);
  const general = view.definitions.filter((d) => d.group === 'general');
  const caps = view.definitions.filter((d) => d.group === 'capabilities');

  async function save() {
    if (!view) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const payload: Record<string, boolean | number> = {};
      for (const [k, v] of changed) {
        const def = view.definitions.find((d) => d.key === k);
        payload[k] = def?.type === 'int' ? Number(v) : (v as boolean);
      }
      setView(await updateAffairsSettings(payload)); setDraft({}); setMessage('تم حفظ الإعدادات.');
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  return (
    <Stack spacing={2}>
      {!isAdmin && <Alert severity="info">تعديل الإعدادات لمدير النظام فقط. يمكنك الاطلاع عليها.</Alert>}
      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>إعدادات عامة</Typography>
        <Stack spacing={1.5}>
          {general.map((d) => (
            <Box key={d.key} sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography sx={{ fontWeight: 600 }}>{d.label}</Typography>
                <Typography variant="body2" color="text.secondary">{d.description}</Typography>
              </Box>
              {d.type === 'boolean'
                ? <Switch checked={Boolean(value(d.key))} disabled={!isAdmin || busy} onChange={(e) => setDraft({ ...draft, [d.key]: e.target.checked })} slotProps={{ input: { 'aria-label': d.label } }} />
                : <TextField size="small" type="number" label={d.label} sx={{ width: 120 }} disabled={!isAdmin || busy} value={String(value(d.key))} onChange={(e) => setDraft({ ...draft, [d.key]: e.target.value === '' ? '' : Number(e.target.value) })} slotProps={{ htmlInput: { min: d.min, max: d.max } }} />}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>صلاحيات الأدوار (داخل الأدوار الثابتة)</Typography>
        <TableContainer>
          <Table size="small" aria-label="مصفوفة الصلاحيات">
            <TableHead><TableRow><TableCell>الإجراء</TableCell><TableCell>موظف شؤون الطلاب (مسجل)</TableCell><TableCell>مدير النظام</TableCell><TableCell>الطالب</TableCell></TableRow></TableHead>
            <TableBody>
              {caps.map((d) => (
                <TableRow key={d.key}>
                  <TableCell><b>{d.label}</b><br /><Typography variant="caption" color="text.secondary">{d.description}</Typography></TableCell>
                  <TableCell><Switch checked={Boolean(value(d.key))} disabled={!isAdmin || busy} onChange={(e) => setDraft({ ...draft, [d.key]: e.target.checked })} slotProps={{ input: { 'aria-label': `${d.label} للموظف` } }} /></TableCell>
                  <TableCell><Chip size="small" color="success" label="دائماً" /></TableCell>
                  <TableCell><Chip size="small" variant="outlined" label="—" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {isAdmin && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" disabled={busy || changed.length === 0} onClick={save}>حفظ التغييرات{changed.length ? ` (${changed.length})` : ''}</Button>
          <Button disabled={busy || changed.length === 0} onClick={() => setDraft({})}>تراجع</Button>
        </Stack>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>قواعد ثابتة</Typography>
        <Stack component="ul" spacing={0.5} sx={{ m: 0, ps: 2 }}>
          {FIXED_RULES.map((r) => <Typography component="li" variant="body2" key={r}>{r}</Typography>)}
        </Stack>
      </Paper>
    </Stack>
  );
}
