import { useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useSiteContent } from '../../api/site';
import { EmptyNote, SitePage, Wrap } from './siteTheme';
import { CollegeCard, Split, SplitImage } from './siteParts';
import { T, goldCard } from './siteStyles';

const searchSx = { flex: '1 1 260px', maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: '30px', bgcolor: '#fff', boxShadow: '0 4px 14px rgba(18,72,154,.06)', '& fieldset': { borderColor: 'rgba(211,154,61,.45)' } } };

// الكليات: بحث وشبكة بطاقات. الأسماء من الهيكل الأكاديمي، والنبذة والصورة من لوحة الموقع. كلية بلا قرار ظهور لا تظهر.
export default function CollegesPage() {
  const { content, loading } = useSiteContent();
  const [query, setQuery] = useState('');
  const colleges = useMemo(() => (content?.colleges ?? []).filter((college) => !query.trim() || college.nameAr.includes(query.trim()) || college.summary.includes(query.trim())), [content, query]);
  return (
    <SitePage title="الكليات" subtitle="الكليات والأقسام والبرامج الأكاديمية في الجامعة.">
      {!loading && (content?.colleges.length ?? 0) === 0 && <EmptyNote>سيتم نشر الكليات والاختصاصات قريبًا.</EmptyNote>}
      {(content?.colleges.length ?? 0) > 0 && (
        <Wrap sx={{ py: { xs: 4, md: 6 } }}>
          <TextField type="search" placeholder="🔍 ابحث عن كلية..." aria-label="بحث عن كلية" value={query} onChange={(event) => setQuery(event.target.value)} sx={{ ...searchSx, mb: 3, display: 'flex' }} slotProps={{ htmlInput: { maxLength: 80 } }} />
          {colleges.length === 0 ? <Typography sx={{ textAlign: 'center', color: T.muted, p: 4 }}>لا توجد نتائج مطابقة.</Typography> : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.75 }}>
              {colleges.map((college) => <CollegeCard key={college.id} college={college} />)}
            </Box>
          )}
        </Wrap>
      )}
    </SitePage>
  );
}

// صفحة الكلية: نبذة وتفاصيل بصورتها، وتحتها الأقسام وبرامج كل قسم.
export function CollegeDetailPage() {
  const { id = '' } = useParams();
  const { content, loading } = useSiteContent();
  const college = content?.colleges.find((item) => item.id === id);
  return (
    <SitePage title={college?.nameAr ?? 'الكليات'}>
      <Wrap sx={{ py: { xs: 4, md: 6 } }}>
        {!loading && !college && <Alert severity="info">هذه الكلية غير متاحة. <Button component={RouterLink} to="/colleges" size="small">كل الكليات</Button></Alert>}
        {college && (
          <>
            <Button component={RouterLink} to="/colleges" sx={{ mb: 2.5, px: 2.25, borderRadius: '30px', fontWeight: 700, bgcolor: '#f8ecd6', color: '#8a5a1c', '&:hover': { bgcolor: '#f3dfb8' } }}>← كل الكليات</Button>
            <Split image={college.mediaId ? <SplitImage mediaId={college.mediaId} alt={college.nameAr} /> : undefined}>
              <Box data-rv="">
                {college.summary && <Typography sx={{ fontSize: 17, mb: 1.5, whiteSpace: 'pre-line' }}>{college.summary}</Typography>}
                {college.details && <Typography sx={{ fontSize: 17, whiteSpace: 'pre-line' }}>{college.details}</Typography>}
              </Box>
            </Split>
            <Typography component="h2" data-rv="" data-rv-line="" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: T.navy, mb: 2.5, '&::after': { content: '""', display: 'block', width: 64, height: 5, borderRadius: 5, mt: 0.75, background: `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>الأقسام والاختصاصات</Typography>
            {college.departments.length === 0 ? <Typography sx={{ color: T.muted, textAlign: 'center', p: 3 }}>لم تُضف أقسام بعد.</Typography> : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2 }}>
                {college.departments.map((department) => (
                  <Box key={department.nameAr} data-rv="" sx={{ ...goldCard, p: 2.5, borderTop: `4px solid ${T.gold}`, '&:hover': { transform: 'none' } }}>
                    <Typography component="h3" sx={{ fontWeight: 700, color: T.navy, mb: 1.5, fontSize: 18 }}>🏷️ {department.nameAr}</Typography>
                    {department.summary && <Typography sx={{ color: T.muted, fontSize: 14.5, mb: 1 }}>{department.summary}</Typography>}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {department.programs.map((program) => <Box key={program.nameAr} component="span" title={program.summary || undefined} sx={{ px: 2, py: 0.5, borderRadius: 30, fontWeight: 600, fontSize: 14.5, bgcolor: '#fbefd6', color: '#7d521a', transition: 'background-color .2s, color .2s, transform .2s', '&:hover': { bgcolor: T.navy, color: T.goldText, transform: 'translateY(-2px)' } }}>{program.nameAr}</Box>)}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Wrap>
    </SitePage>
  );
}
