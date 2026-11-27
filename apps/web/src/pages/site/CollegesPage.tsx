import { Box, Typography } from '@mui/material';
import { siteMediaUrl, useSiteContent } from '../../api/site';
import { EmptyNote, SitePage, Wrap } from './siteTheme';
import { T, goldCard } from './siteStyles';

// الكليات والاختصاصات: الأسماء من الهيكل الأكاديمي، والنبذة والصورة من لوحة الموقع. كلية بلا قرار ظهور لا تظهر.
export default function CollegesPage() {
  const { content, loading } = useSiteContent();
  const colleges = content?.colleges ?? [];
  return (
    <SitePage title="الكليات والاختصاصات" subtitle="الكليات والأقسام والبرامج الأكاديمية في الجامعة.">
      {!loading && colleges.length === 0 && <EmptyNote>سيتم نشر الكليات والاختصاصات قريبًا.</EmptyNote>}
      {colleges.length > 0 && (
        <Wrap sx={{ py: { xs: 4, md: 6 }, display: 'grid', gap: 3 }}>
          {colleges.map((college) => (
            <Box component="article" key={college.nameAr} sx={{ ...goldCard, overflow: 'hidden', borderTop: `4px solid ${T.gold}`, '&:hover': { transform: 'none' } }}>
              {college.mediaId && <Box component="img" src={siteMediaUrl(college.mediaId)} alt={`صورة ${college.nameAr}`} loading="lazy" sx={{ width: '100%', height: { xs: 160, md: 220 }, objectFit: 'cover', display: 'block' }} />}
              <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography component="h2" sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, color: T.navy }}>{college.nameAr}</Typography>
                {college.summary && <Typography sx={{ color: T.muted, mt: 1, mb: 2, whiteSpace: 'pre-line', fontSize: 16 }}>{college.summary}</Typography>}
                {college.departments.length > 0 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(240px, 1fr))' }, gap: 2, mt: 2 }}>
                    {college.departments.map((department) => (
                      <Box key={department.nameAr} sx={{ p: 2, borderRadius: '12px', bgcolor: T.cream, border: '1px solid rgba(201,154,46,.25)' }}>
                        <Typography component="h3" sx={{ fontWeight: 700, color: T.navy }}>{department.nameAr}</Typography>
                        {department.summary && <Typography sx={{ color: T.muted, fontSize: 14.5, my: 0.5 }}>{department.summary}</Typography>}
                        {department.programs.length > 0 && (
                          <Box component="ul" sx={{ m: 0, mt: 1, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {department.programs.map((program) => <Box component="li" key={program.nameAr} sx={{ px: 1.25, py: 0.25, borderRadius: 20, fontSize: 13.5, bgcolor: '#f6ecd0', color: '#6b4e10' }}>{program.nameAr}</Box>)}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Wrap>
      )}
    </SitePage>
  );
}
