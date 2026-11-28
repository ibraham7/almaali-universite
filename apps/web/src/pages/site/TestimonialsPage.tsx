import { Box, Typography } from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import { useSiteContent } from '../../api/site';
import { EmptyNote, SitePage, Wrap } from './siteTheme';
import { T, goldCard } from './siteStyles';

export default function TestimonialsPage() {
  const { content, loading } = useSiteContent();
  const items = content?.testimonials ?? [];
  return (
    <SitePage title="قالوا عن الجامعة" subtitle="آراء طلابنا وخريجينا والعاملين فيها.">
      {!loading && items.length === 0 && <EmptyNote>لا توجد شهادات منشورة حاليًا.</EmptyNote>}
      {items.length > 0 && (
        <Wrap sx={{ py: { xs: 4, md: 6 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5 }}>
          {items.map((item) => (
            <Box data-rv="" data-tilt="" component="figure" key={`${item.name}-${item.text.slice(0, 20)}`} sx={{ ...goldCard, m: 0, p: 3, position: 'relative' }}>
              <FormatQuoteRoundedIcon sx={{ position: 'absolute', top: 10, insetInlineStart: 14, fontSize: 48, color: T.gold2, opacity: 0.6 }} />
              <Typography component="blockquote" sx={{ m: 0, mt: 3, mb: 2, fontSize: 17, lineHeight: 1.9 }}>{item.text}</Typography>
              <Box component="figcaption" sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: T.goldGrad, color: T.ink }}>{item.name.slice(0, 1)}</Box>
                <Box><Typography sx={{ fontWeight: 700, color: T.navy }}>{item.name}</Typography>{item.role && <Typography sx={{ fontSize: 13.5, color: T.muted }}>{item.role}</Typography>}</Box>
              </Box>
            </Box>
          ))}
        </Wrap>
      )}
    </SitePage>
  );
}
