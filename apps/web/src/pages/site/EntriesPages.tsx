import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, IconButton, Stack, TextField, Typography } from '@mui/material';
import { getSiteEntries, getSiteEntry, sendGraduateUpdate, siteMediaUrl, useSiteContent, type EntryKind, type SiteEntryCard, type SiteEntryFull } from '../../api/site';
import { EmptyNote, GoldButton, Prose, SitePage, Wrap } from './siteTheme';
import { Cover, EventCard } from './siteParts';
import { T, goldCard } from './siteStyles';

const dateFmt: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
const day = (value: string | null) => (value ? new Date(value).toLocaleDateString('ar-EG-u-nu-latn', dateFmt) : '');
const when = (entry: Pick<SiteEntryCard, 'startsAt' | 'endsAt'>) => {
  if (!entry.startsAt) return '';
  const start = new Date(entry.startsAt);
  const time = start.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  const end = entry.endsAt && new Date(entry.endsAt).toDateString() !== start.toDateString() ? ` — ${day(entry.endsAt)}` : '';
  return `${day(entry.startsAt)}${end} • ${time}`;
};

interface SectionConfig { kind: EntryKind; path: string; title: string; subtitle: string; introKey?: string; empty: string; categories?: string[] }
const SECTIONS: Record<string, SectionConfig> = {
  events: { kind: 'EVENT', path: '/events', title: 'الفعاليات والأنشطة', subtitle: 'فعاليات الجامعة القادمة والأرشيف.', empty: 'لا توجد فعاليات منشورة حاليًا.' },
  research: {
    kind: 'RESEARCH', path: '/research', title: 'البحث العلمي', subtitle: 'أبحاث ومؤتمرات ومبادرات وإنجازات الباحثين.', introKey: 'researchIntro', empty: 'لا توجد مواد منشورة حاليًا.',
    categories: ['أبحاث ودراسات', 'مؤتمرات وندوات علمية', 'مجلات ومنشورات', 'مبادرات ومشاريع بحثية', 'إنجازات الهيئة التدريسية والباحثين'],
  },
  campus: {
    kind: 'CAMPUS', path: '/campus', title: 'الحياة الجامعية', subtitle: 'أنشطة وفعاليات ومرافق وصور من حياة الجامعة.', introKey: 'campusIntro', empty: 'لا توجد مواد منشورة حاليًا.',
    categories: ['أنشطة وفعاليات طلابية', 'مؤتمرات وندوات', 'أنشطة ثقافية واجتماعية ورياضية', 'مرافق وخدمات جامعية', 'صور وتغطيات إعلامية'],
  },
};
const PATH_OF: Record<EntryKind, string> = { EVENT: '/events', RESEARCH: '/research', GRADUATE_STORY: '/graduates', GRADUATE_NEWS: '/graduates', CAMPUS: '/campus' };

export function EntryCard({ item }: { item: SiteEntryCard }) {
  if (item.kind === 'EVENT') return <EventCard item={item} />;
  return (
    <Box data-rv="" data-tilt="" component="article" sx={{ ...goldCard, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ overflow: 'hidden', height: 170 }}><Cover mediaId={item.coverMediaId} /></Box>
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
          {item.category && <Chip size="small" label={item.category} sx={{ bgcolor: '#f6ecd0', color: '#7a5a12' }} />}
          <Typography sx={{ fontSize: 13, color: T.muted }}>{day(item.publishedAt)}</Typography>
        </Stack>
        <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, color: T.navy, mb: 0.5 }}>{item.title}</Typography>
        {item.location && <Typography sx={{ fontSize: 14, color: T.muted, mb: 0.5 }}>📍 {item.location}</Typography>}
        {item.summary && <Typography sx={{ color: T.muted, fontSize: 15, flex: 1 }}>{item.summary}</Typography>}
        <Button component={RouterLink} to={`${PATH_OF[item.kind]}/${item.id}`} sx={{ alignSelf: 'flex-start', mt: 1.5, px: 0, fontWeight: 700, color: T.goldDark }}>التفاصيل ←</Button>
      </Box>
    </Box>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 4 }}>
      <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</Button>
      <Typography>{page} / {pages}</Typography>
      <Button disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</Button>
    </Stack>
  );
}

const tabSx = (active: boolean) => ({ px: 2.5, py: 0.9, borderRadius: '14px', fontWeight: 700, fontSize: 15, transition: 'background-color .2s, color .2s', ...(active ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, bgcolor: '#fff', border: `1px solid ${T.gold}` }) });

// قائمة نوع واحد: الفعاليات (قادمة/سابقة)، والبحث والحياة الجامعية (بتصنيفاتها).
export function EntriesListPage({ section }: { section: 'events' | 'research' | 'campus' }) {
  const config = SECTIONS[section];
  const { content } = useSiteContent();
  const [period, setPeriod] = useState<'upcoming' | 'past'>('upcoming');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [data, setData] = useState<{ total: number; pageSize: number; items: SiteEntryCard[]; categories: string[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const intro = config.introKey ? content?.settings[config.introKey] : undefined;

  // بحث بعد توقف الكتابة 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => { setTerm(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    getSiteEntries(config.kind, page, { when: config.kind === 'EVENT' ? period : undefined, category, q: term }).then((result) => { if (active) { setData(result); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [config.kind, page, period, category, term]);

  const pick = (apply: () => void) => { setData(null); setPage(1); apply(); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const categories = config.categories ?? (data?.categories ?? []);
  return (
    <SitePage title={config.title} subtitle={config.subtitle}>
      <Wrap sx={{ pt: { xs: 4, md: 5 } }}>
        {intro && <Box sx={{ mb: 3 }}><Prose text={intro} /></Box>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.75 }}>
          <TextField type="search" placeholder="🔍 ابحث..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="بحث" sx={{ flex: '1 1 260px', maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: '30px', bgcolor: '#fff', boxShadow: '0 4px 14px rgba(18,72,154,.06)', '& fieldset': { borderColor: 'rgba(211,154,61,.45)' } } }} slotProps={{ htmlInput: { maxLength: 80 } }} />
          {config.kind === 'EVENT' && (
            <Stack direction="row" spacing={1} role="tablist" aria-label="نوع الفعاليات">
              {(['upcoming', 'past'] as const).map((value) => <Button key={value} role="tab" aria-selected={period === value} onClick={() => pick(() => setPeriod(value))} sx={tabSx(period === value)}>{value === 'upcoming' ? 'القادمة' : 'الأرشيف'}</Button>)}
            </Stack>
          )}
        </Stack>
        {categories.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="tablist" aria-label="التصنيف">
            <Button role="tab" aria-selected={!category} onClick={() => pick(() => setCategory(''))} sx={tabSx(!category)}>كل التصنيفات</Button>
            {categories.map((name) => <Button key={name} role="tab" aria-selected={category === name} onClick={() => pick(() => setCategory(name))} sx={tabSx(category === name)}>{name}</Button>)}
          </Stack>
        )}
      </Wrap>
      {failed && <Wrap sx={{ pt: 4 }}><Alert severity="error">تعذر تحميل المحتوى. حاول لاحقًا.</Alert></Wrap>}
      {!data && !failed && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>}
      {data && data.items.length === 0 && <EmptyNote>{config.kind === 'EVENT' ? (period === 'upcoming' ? 'لا توجد فعاليات قادمة حاليًا.' : 'لا توجد فعاليات في الأرشيف.') : config.empty}</EmptyNote>}
      {data && data.items.length > 0 && (
        <Wrap sx={{ py: { xs: 4, md: 5 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
            {data.items.map((item) => <EntryCard key={item.id} item={item} />)}
          </Box>
          <Pager page={page} pages={pages} onPage={(next) => { setData(null); setPage(next); }} />
        </Wrap>
      )}
    </SitePage>
  );
}

// معرض صور بتكبير: أسهم لوحة المفاتيح تتنقل، وEsc يغلق.
function Gallery({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setOpen((current) => (current === null ? null : (current + 1) % ids.length));
      if (event.key === 'ArrowRight') setOpen((current) => (current === null ? null : (current - 1 + ids.length) % ids.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, ids.length]);
  if (ids.length === 0) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, color: T.navy, mb: 1.5 }}>معرض الصور</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.25 }}>
        {ids.map((id, index) => (
          <Box key={id} component="button" type="button" onClick={() => setOpen(index)} aria-label={`تكبير الصورة ${index + 1}`} sx={{ p: 0, border: 0, borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', bgcolor: '#e9edf3', aspectRatio: '4 / 3', '&:hover img': { transform: 'scale(1.06)' } }}>
            <Box component="img" src={siteMediaUrl(id)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .35s' }} />
          </Box>
        ))}
      </Box>
      <Dialog open={open !== null} onClose={() => setOpen(null)} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { bgcolor: '#0b1b36', borderRadius: '18px' } } }}>
        {open !== null && (
          <Box
            onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => { if (touchX.current === null) return; const delta = event.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(delta) > 50) setOpen((open + (delta < 0 ? 1 : -1) + ids.length) % ids.length); }}
            sx={{ position: 'relative', p: 1, textAlign: 'center' }}
          >
            <Box component="img" src={siteMediaUrl(ids[open])} alt="" sx={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }} />
            <IconButton aria-label="إغلاق" onClick={() => setOpen(null)} sx={{ position: 'absolute', top: 8, insetInlineEnd: 8, color: '#fff', bgcolor: 'rgba(0,0,0,.4)' }}>✕</IconButton>
            {ids.length > 1 && (
              <>
                <IconButton aria-label="السابقة" onClick={() => setOpen((open - 1 + ids.length) % ids.length)} sx={{ position: 'absolute', top: '45%', insetInlineStart: 8, color: '#fff', bgcolor: 'rgba(0,0,0,.4)' }}>›</IconButton>
                <IconButton aria-label="التالية" onClick={() => setOpen((open + 1) % ids.length)} sx={{ position: 'absolute', top: '45%', insetInlineEnd: 8, color: '#fff', bgcolor: 'rgba(0,0,0,.4)' }}>‹</IconButton>
                <Typography dir="ltr" sx={{ color: "#cfe0f7", pb: 1 }}>{open + 1} / {ids.length}</Typography>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

const youtubeId = (url: string) => /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(url)?.[1] ?? null;

// فيديوهات: يوتيوب تُضمَّن بدون تتبع، وملف مباشر يُشغَّل بمشغّل المتصفح.
function Videos({ links }: { links: string[] }) {
  if (links.length === 0) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, color: T.navy, mb: 1.5 }}>الفيديوهات</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(300px, 1fr))' }, gap: 1.75 }}>
        {links.map((link) => {
          const id = youtubeId(link);
          return id
            ? <Box key={link} component="iframe" title="فيديو" src={`https://www.youtube-nocookie.com/embed/${id}`} allowFullScreen loading="lazy" sx={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: '18px', bgcolor: '#000', boxShadow: '0 8px 24px rgba(18,72,154,.18)' }} />
            : <Box key={link} component="video" controls preload="metadata" src={link} sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '18px', bgcolor: '#000', boxShadow: '0 8px 24px rgba(18,72,154,.18)' }} />;
        })}
      </Box>
    </Box>
  );
}

export function EntryDetailPage() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<SiteEntryFull | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    getSiteEntry(id).then((result) => { if (active) { setItem(result); setMissing(false); } }).catch(() => { if (active) { setItem(null); setMissing(true); } });
    return () => { active = false; };
  }, [id]);
  const back = item ? PATH_OF[item.kind] : '/';
  const upcoming = Boolean(item?.startsAt && (new Date(item.startsAt) >= new Date() || (item.endsAt && new Date(item.endsAt) >= new Date())));
  return (
    <SitePage title={item?.title ?? 'التفاصيل'}>
      <Wrap sx={{ py: { xs: 4, md: 6 }, maxWidth: 900 }}>
        {missing && <Alert severity="info">هذه الصفحة غير متاحة. <Button component={RouterLink} to="/" size="small">الرئيسية</Button></Alert>}
        {!item && !missing && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>}
        {item && (
          <Box data-rv="" component="article" sx={{ ...goldCard, p: { xs: 2.5, md: 4 }, '&:hover': { transform: 'none' } }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              {item.kind === 'EVENT' && <Chip size="small" label={upcoming ? 'قادمة' : 'أرشيف'} sx={upcoming ? { background: T.goldGrad, color: T.ink, fontWeight: 700 } : { bgcolor: T.navy, color: '#fff', fontWeight: 700 }} />}
              {item.category && <Chip size="small" label={item.category} sx={{ bgcolor: '#f6ecd0', color: '#7a5a12' }} />}
              <Typography sx={{ fontSize: 14, color: T.muted }}>{item.kind === 'EVENT' ? when(item) : day(item.publishedAt)}</Typography>
            </Stack>
            {item.location && <Typography sx={{ fontSize: 16, color: T.navy, fontWeight: 700, mb: 2 }}>📍 {item.location}</Typography>}
            {item.coverMediaId && <Box component="img" src={siteMediaUrl(item.coverMediaId)} alt="" sx={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: '14px', mb: 3 }} />}
            {item.summary && <Typography sx={{ fontSize: 19, fontWeight: 600, color: T.navy, mb: 2 }}>{item.summary}</Typography>}
            {item.body && <Prose text={item.body} />}
            <Gallery ids={item.galleryIds} />
            <Videos links={item.videos} />
            <Button component={RouterLink} to={back} sx={{ mt: 3, px: 2.25, borderRadius: '30px', fontWeight: 700, bgcolor: '#f8ecd6', color: '#8a5a1c', '&:hover': { bgcolor: '#f3dfb8' } }}>← رجوع</Button>
          </Box>
        )}
      </Wrap>
    </SitePage>
  );
}

// الخريجون: تعريف، قصص النجاح، أخبار وفعاليات الخريجين، ونموذج تحديث البيانات.
export function GraduatesPage() {
  const { content } = useSiteContent();
  const [stories, setStories] = useState<SiteEntryCard[]>([]);
  const [news, setNews] = useState<SiteEntryCard[]>([]);
  const [form, setForm] = useState({ name: '', contact: '', graduationYear: '', program: '', workplace: '', message: '', website: '' });
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; text?: string }>({ kind: 'idle' });
  useEffect(() => {
    let active = true;
    getSiteEntries('GRADUATE_STORY', 1).then((result) => { if (active) setStories(result.items); }).catch(() => undefined);
    getSiteEntries('GRADUATE_NEWS', 1).then((result) => { if (active) setNews(result.items); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState({ kind: 'sending' });
    try {
      await sendGraduateUpdate(form);
      setForm({ name: '', contact: '', graduationYear: '', program: '', workplace: '', message: '', website: '' });
      setState({ kind: 'done' });
    } catch (error) {
      const message = axios.isAxiosError(error) ? (error.response?.status === 429 ? 'أرسلت طلبات كثيرة. حاول لاحقًا.' : (Array.isArray(error.response?.data?.message) ? error.response?.data?.message.join('، ') : error.response?.data?.message)) : undefined;
      setState({ kind: 'error', text: message || 'تعذر الإرسال. حاول لاحقًا.' });
    }
  }
  const text = (key: 'name' | 'contact' | 'graduationYear' | 'program' | 'workplace', label: string, required = false) => (
    <TextField required={required} label={label} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} slotProps={{ htmlInput: { maxLength: 160 } }} />
  );
  const intro = content?.settings.graduatesIntro;
  const section = (title: string, items: SiteEntryCard[]) => items.length > 0 && (
    <Box sx={{ mt: 5 }}>
      <Typography component="h2" data-rv="" sx={{ fontSize: 26, fontWeight: 800, color: T.navy, mb: 2.5 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>{items.map((item) => <EntryCard key={item.id} item={item} />)}</Box>
    </Box>
  );
  return (
    <SitePage title="الخريجون" subtitle="خريجو الجامعة وإنجازاتهم.">
      <Wrap sx={{ py: { xs: 4, md: 6 } }}>
        {intro && <Prose text={intro} />}
        {section('قصص النجاح والإنجازات', stories)}
        {section('أخبار وفعاليات الخريجين', news)}
        <Box data-rv="" component="form" onSubmit={submit} sx={{ ...goldCard, p: 3, mt: 5, borderTop: `4px solid ${T.gold}`, '&:hover': { transform: 'none' } }}>
          <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800, color: T.navy, mb: 0.5 }}>هل أنت خريج؟ حدّث بياناتك</Typography>
          <Typography sx={{ color: T.muted, mb: 2 }}>نرغب بالتواصل معك ومتابعة مسيرتك.</Typography>
          <Stack spacing={2}>
            {state.kind === 'done' && <Alert severity="success">وصلتنا بياناتك، شكرًا لك.</Alert>}
            {state.kind === 'error' && <Alert severity="error">{state.text}</Alert>}
            {text('name', 'الاسم', true)}
            {text('contact', 'البريد الإلكتروني أو رقم الهاتف', true)}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{text('graduationYear', 'سنة التخرج')}{text('program', 'البرنامج / الاختصاص')}</Stack>
            {text('workplace', 'العمل الحالي')}
            <TextField label="ملاحظات" multiline minRows={3} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            <Box aria-hidden sx={{ position: 'absolute', insetInlineStart: '-9999px' }}><input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Box>
            <Box><GoldButton type="submit" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'جارٍ الإرسال...' : 'إرسال'}</GoldButton></Box>
          </Stack>
        </Box>
      </Wrap>
    </SitePage>
  );
}
