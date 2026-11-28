import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Alert, Box, Link, Stack, TextField, Typography } from '@mui/material';
import { sendSiteMessage, useSiteContent } from '../../api/site';
import { GoldButton, SitePage, SocialLinks, Wrap } from './siteTheme';
import { T, goldCard } from './siteStyles';

// التواصل: بيانات الجامعة من لوحة الموقع (ما فاضي يُخفى) + نموذج رسالة تصل للوحة الموقع.
export default function ContactPage() {
  const { content } = useSiteContent();
  const s = content?.settings ?? {};
  const lines: Array<[string, string, string?]> = [
    ['العنوان', s.contactAddress], ['الهاتف', s.contactPhone, s.contactPhone && `tel:${s.contactPhone.replace(/\s/g, '')}`],
    ['البريد الإلكتروني', s.contactEmail, s.contactEmail && `mailto:${s.contactEmail}`], ['ساعات الدوام', s.contactHours],
  ].filter((line) => line[1]) as Array<[string, string, string?]>;
  const hasInfo = lines.length > 0 || Object.keys(s).some((key) => key.startsWith('social') || key === 'contactMapUrl');
  const [form, setForm] = useState({ name: '', contact: '', subject: '', message: '', website: '' });
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; text?: string }>({ kind: 'idle' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState({ kind: 'sending' });
    try {
      await sendSiteMessage(form);
      setForm({ name: '', contact: '', subject: '', message: '', website: '' });
      setState({ kind: 'done' });
    } catch (error) {
      const message = axios.isAxiosError(error) ? (error.response?.status === 429 ? 'أرسلت رسائل كثيرة. حاول لاحقًا.' : (Array.isArray(error.response?.data?.message) ? error.response?.data?.message.join('، ') : error.response?.data?.message)) : undefined;
      setState({ kind: 'error', text: message || 'تعذر إرسال الرسالة. حاول لاحقًا.' });
    }
  }

  const field = (key: 'name' | 'contact' | 'subject', label: string, required = true) => (
    <TextField required={required} label={label} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} slotProps={{ htmlInput: { maxLength: key === 'subject' ? 200 : 120 } }} />
  );

  return (
    <SitePage title="اتصل بنا" subtitle="يسعدنا استقبال استفساراتكم.">
      <Wrap sx={{ py: { xs: 4, md: 6 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: hasInfo ? '1fr 1.2fr' : '1fr' }, gap: 3, maxWidth: hasInfo ? undefined : 680 }}>
        {hasInfo && (
          <Box data-rv="" sx={{ ...goldCard, p: 3, borderTop: `4px solid ${T.gold}`, alignSelf: 'start', '&:hover': { transform: 'none' } }}>
            <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800, color: T.navy, mb: 2 }}>بيانات التواصل</Typography>
            <Stack spacing={1.75}>
              {lines.map(([label, value, href]) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 13.5, color: T.muted }}>{label}</Typography>
                  {href ? <Link href={href} underline="hover" sx={{ fontSize: 17, fontWeight: 600, color: T.navy }} dir="ltr">{value}</Link> : <Typography sx={{ fontSize: 17, fontWeight: 600 }}>{value}</Typography>}
                </Box>
              ))}
              <SocialLinks settings={s} />
              {/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(s.contactMapUrl ?? '') && <Box component="iframe" title="خريطة الموقع" src={s.contactMapUrl} loading="lazy" referrerPolicy="no-referrer" sx={{ width: '100%', height: 260, border: 0, borderRadius: '14px' }} />}
              {s.contactMapUrl && <Link href={s.contactMapUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontWeight: 700, color: T.goldDark }}>عرض الموقع على الخريطة ←</Link>}
            </Stack>
          </Box>
        )}
        <Box data-rv="" component="form" onSubmit={submit} sx={{ ...goldCard, p: { xs: 2.5, md: 3.5 }, '&:hover': { transform: 'none' } }}>
          <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800, color: T.navy, mb: 2 }}>أرسل لنا رسالة</Typography>
          <Stack spacing={2}>
            {state.kind === 'done' && <Alert severity="success">وصلتنا رسالتك، وسنتواصل معك قريبًا.</Alert>}
            {state.kind === 'error' && <Alert severity="error">{state.text}</Alert>}
            {field('name', 'الاسم')}
            {field('contact', 'البريد الإلكتروني أو رقم الهاتف')}
            {field('subject', 'الموضوع', false)}
            <TextField required multiline minRows={4} label="الرسالة" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} slotProps={{ htmlInput: { maxLength: 3000 } }} />
            {/* فخ للروبوتات: مخفي عن المستخدم وقارئات الشاشة، ويجب أن يبقى فارغًا */}
            <Box aria-hidden sx={{ position: 'absolute', insetInlineStart: -9999, width: 1, height: 1, overflow: 'hidden' }}>
              <label>الموقع<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
            </Box>
            <Box><GoldButton type="submit" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'جارٍ الإرسال...' : 'إرسال'}</GoldButton></Box>
          </Stack>
        </Box>
      </Wrap>
    </SitePage>
  );
}
