import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { getSiteNews, getSiteNewsItem, siteMediaUrl, type SiteNewsCard } from '../../api/site';
import { EmptyNote, Prose, SitePage, Wrap } from './siteTheme';
import { T, goldCard } from './siteStyles';

const typeLabel = (type: string) => (type === 'ANNOUNCEMENT' ? 'إعلان' : 'خبر');
const day = (value: string | null) => (value ? new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

export function NewsListPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'NEWS';
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [data, setData] = useState<{ total: number; pageSize: number; items: SiteNewsCard[] } | null>(null);
  const [failed, setFailed] = useState(false);

  // بحث فوري بعد توقف الكتابة 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => { setTerm(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    getSiteNews(page, type, term).then((result) => { if (active) { setData(result); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [page, type, term]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const choose = (next: 'NEWS' | 'ANNOUNCEMENT') => { setPage(1); setData(null); setParams(next === 'NEWS' ? {} : { type: next }); };
  const toggle = (value: 'NEWS' | 'ANNOUNCEMENT', label: string) => (
    <Button key={value} role="tab" aria-selected={type === value} onClick={() => choose(value)} sx={{ px: 3, py: 1, borderRadius: '14px', fontWeight: 700, fontSize: 16, transition: 'background-color .2s, color .2s', ...(type === value ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, bgcolor: '#fff', border: `1px solid ${T.gold}` }) }}>{label}</Button>
  );

  return (
    <SitePage title="الأخبار والإعلانات" subtitle="آخر أخبار الجامعة وإعلاناتها.">
      <Wrap sx={{ pt: { xs: 4, md: 5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} role="tablist" aria-label="النوع">{toggle('NEWS', '📰 الأخبار')}{toggle('ANNOUNCEMENT', '📢 الإعلانات')}</Stack>
          <TextField size="small" type="search" label="بحث" value={query} onChange={(event) => setQuery(event.target.value)} sx={{ minWidth: { sm: 280 }, bgcolor: '#fff', borderRadius: 1 }} slotProps={{ htmlInput: { maxLength: 80 } }} />
        </Stack>
      </Wrap>
      {failed && <Wrap sx={{ pt: 4 }}><Alert severity="error">تعذر تحميل المحتوى. حاول لاحقًا.</Alert></Wrap>}
      {!data && !failed && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>}
      {data && data.items.length === 0 && <EmptyNote>{term ? 'ما في نتائج مطابقة 🔎' : type === 'NEWS' ? 'لا توجد أخبار منشورة حاليًا.' : 'لا توجد إعلانات منشورة حاليًا.'}</EmptyNote>}
      {data && data.items.length > 0 && (
        <Wrap sx={{ py: { xs: 4, md: 5 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
            {data.items.map((item) => <NewsCard key={item.id} item={item} />)}
          </Box>
          {pages > 1 && (
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 4 }}>
              <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
              <Typography>{page} / {pages}</Typography>
              <Button disabled={page >= pages} onClick={() => setPage(page + 1)}>التالي</Button>
            </Stack>
          )}
        </Wrap>
      )}
    </SitePage>
  );
}

export function NewsCard({ item }: { item: SiteNewsCard }) {
  return (
    <Box data-rv="" data-tilt="" component="article" sx={{ ...goldCard, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {item.coverMediaId && <Box component="img" src={siteMediaUrl(item.coverMediaId)} alt="" loading="lazy" sx={{ width: '100%', height: 170, objectFit: 'cover' }} />}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Chip size="small" label={typeLabel(item.type)} sx={{ bgcolor: '#f6ecd0', color: '#7a5a12' }} />
          <Typography sx={{ fontSize: 13, color: T.muted }}>{day(item.publishedAt)}</Typography>
        </Stack>
        <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, color: T.navy, mb: 0.5 }}>{item.title}</Typography>
        {item.summary && <Typography sx={{ color: T.muted, fontSize: 15, flex: 1 }}>{item.summary}</Typography>}
        <Button component={RouterLink} to={`/news/${item.id}`} sx={{ alignSelf: 'flex-start', mt: 1.5, px: 0, fontWeight: 700, color: T.goldDark }}>اقرأ المزيد ←</Button>
      </Box>
    </Box>
  );
}

export function NewsDetailPage() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<(SiteNewsCard & { body: string }) | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    getSiteNewsItem(id).then((result) => { if (active) { setItem(result); setMissing(false); } }).catch(() => { if (active) { setItem(null); setMissing(true); } });
    return () => { active = false; };
  }, [id]);
  return (
    <SitePage title={item?.title ?? 'الأخبار والإعلانات'}>
      <Wrap sx={{ py: { xs: 4, md: 6 }, maxWidth: 860 }}>
        {missing && <Alert severity="info">هذا الخبر غير متاح. <Button component={RouterLink} to="/news" size="small">كل الأخبار</Button></Alert>}
        {!item && !missing && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>}
        {item && (
          <Box data-rv="" component="article" sx={{ ...goldCard, p: { xs: 2.5, md: 4 }, '&:hover': { transform: 'none' } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <Chip size="small" label={typeLabel(item.type)} sx={{ bgcolor: '#f6ecd0', color: '#7a5a12' }} />
              <Typography sx={{ fontSize: 14, color: T.muted }}>{day(item.publishedAt)}</Typography>
            </Stack>
            {item.coverMediaId && <Box component="img" src={siteMediaUrl(item.coverMediaId)} alt="" sx={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: '14px', mb: 3 }} />}
            {item.summary && <Typography sx={{ fontSize: 19, fontWeight: 600, color: T.navy, mb: 2 }}>{item.summary}</Typography>}
            {item.body && <Prose text={item.body} />}
            <Button component={RouterLink} to="/news" sx={{ mt: 3, fontWeight: 700, color: T.goldDark }}>← كل الأخبار</Button>
          </Box>
        )}
      </Wrap>
    </SitePage>
  );
}
