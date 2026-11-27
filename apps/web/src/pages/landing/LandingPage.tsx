import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { universityColors } from '../../theme/theme';
import { landingContent } from './landingContent';

const c = landingContent;

const QUICK_LINKS = [
  { title: 'تسجيل الدخول', text: 'ادخل بالرقم الجامعي إلى بوابة الطالب', to: '/login' },
  { title: 'إنشاء حساب', text: 'طالب جديد؟ ابدأ تسجيل بياناتك', to: '/signup' },
  { title: 'التحقق من وثيقة', text: 'تأكد من صحة وثيقة صادرة عن الجامعة', to: '/verify' },
];

function Section({ id, title, intro, alt, children }: { id: string; title: string; intro?: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <Box component="section" id={id} sx={{ py: { xs: 5, md: 7 }, bgcolor: alt ? '#F4F7FB' : '#FFFFFF', scrollMarginTop: '72px' }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: universityColors.navy, mb: 0.5 }}>{title}</Typography>
        {intro && <Typography sx={{ color: universityColors.textSecondary, mb: 3, maxWidth: '60ch' }}>{intro}</Typography>}
        {children}
      </Container>
    </Box>
  );
}

function Cards({ items }: { items: { title: string; text: string }[] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(240px, 1fr))' }, gap: 2 }}>
      {items.map((item) => (
        <Paper key={item.title} variant="outlined" sx={{ p: 2.5, borderColor: universityColors.border }}>
          <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, color: universityColors.navy, mb: 0.5 }}>{item.title}</Typography>
          <Typography sx={{ color: universityColors.textSecondary, fontSize: 15 }}>{item.text}</Typography>
        </Paper>
      ))}
    </Box>
  );
}

// Public home page of the university. A signed-in person goes straight to their dashboard.
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const contactLines = [
    c.contact.address && `العنوان: ${c.contact.address}`,
    c.contact.phone && `الهاتف: ${c.contact.phone}`,
    c.contact.email && `البريد: ${c.contact.email}`,
  ].filter(Boolean) as string[];

  const nav = [
    { id: 'about', label: 'عن الجامعة', show: true },
    { id: 'colleges', label: 'الكليات', show: c.colleges.length > 0 },
    { id: 'admission', label: 'التسجيل', show: c.admission.steps.length > 0 },
    { id: 'news', label: 'الأخبار', show: c.news.length > 0 },
    { id: 'contact', label: 'تواصل معنا', show: contactLines.length > 0 },
  ].filter((n) => n.show);

  return (
    <Box sx={{ bgcolor: '#FFFFFF', color: universityColors.text }}>
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: '#FFFFFF', borderBottom: `1px solid ${universityColors.border}` }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minHeight: 68 }}>
            <Stack component={RouterLink} to="/" direction="row" spacing={1.2} sx={{ alignItems: 'center', textDecoration: 'none', color: universityColors.navy }} aria-label={c.universityName}>
              <Box component="img" src="/logo-md.png" alt="" sx={{ height: 46, width: 'auto' }} />
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{c.universityName}</Typography>
            </Stack>
            <Stack component="nav" aria-label="التنقل الرئيسي" direction="row" spacing={0.5} sx={{ ms: 'auto', display: { xs: 'none', md: 'flex' } }}>
              {nav.map((n) => (
                <Link key={n.id} href={`#${n.id}`} underline="none" sx={{ px: 1.5, py: 0.75, borderRadius: 1, color: universityColors.textSecondary, '&:hover': { bgcolor: '#F4F7FB', color: universityColors.text } }}>{n.label}</Link>
              ))}
            </Stack>
            <Button component={RouterLink} to="/login" variant="contained" color="secondary" sx={{ ms: { xs: 'auto', md: 0 }, fontWeight: 700 }}>دخول الطلاب</Button>
          </Stack>
        </Container>
      </Box>

      <Box component="main">
        <Box sx={{ borderBottom: `4px solid ${universityColors.gold}` }}>
          <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: { xs: 2, md: 6 }, alignItems: 'center', py: { xs: 4, md: 7 } }}>
            <Box sx={{ order: { xs: 2, md: 1 } }}>
              <Typography component="h1" sx={{ fontSize: { xs: 34, md: 52 }, fontWeight: 800, lineHeight: 1.3, color: universityColors.navy, mb: 2 }}>{c.heroTitle}</Typography>
              <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: '#3D5268', maxWidth: '52ch', mb: 3 }}>{c.heroText}</Typography>
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button component={RouterLink} to="/login" size="large" variant="contained" color="secondary" sx={{ fontWeight: 700 }}>بوابة الطالب</Button>
                <Button component={RouterLink} to="/signup" size="large" variant="outlined" sx={{ fontWeight: 700 }}>إنشاء حساب</Button>
              </Stack>
            </Box>
            <Box component="img" src="/logo-md.png" alt="شعار جامعة المعالي" sx={{ order: { xs: 1, md: 2 }, width: { xs: 180, md: 'min(100%, 340px)' }, height: 'auto', justifySelf: 'center' }} />
          </Container>
        </Box>

        <Box sx={{ bgcolor: '#F4F7FB', py: 4 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {QUICK_LINKS.map((q) => (
                <Paper key={q.to} component={RouterLink} to={q.to} variant="outlined" sx={{ p: 2.5, textDecoration: 'none', borderColor: universityColors.border, transition: 'border-color .15s, transform .15s', '&:hover': { borderColor: universityColors.gold, transform: 'translateY(-2px)' }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } } }}>
                  <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700, color: universityColors.navy }}>{q.title}</Typography>
                  <Typography sx={{ fontSize: 14, color: universityColors.textSecondary }}>{q.text}</Typography>
                </Paper>
              ))}
            </Box>
          </Container>
        </Box>

        <Section id="about" title="عن الجامعة" intro={c.about.intro}><Cards items={c.about.items} /></Section>
        {c.colleges.length > 0 && <Section id="colleges" title="الكليات والبرامج" alt><Cards items={c.colleges} /></Section>}
        {c.admission.steps.length > 0 && (
          <Section id="admission" title="التسجيل" intro={c.admission.intro} alt={c.colleges.length === 0}>
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              {c.admission.steps.map((step, i) => (
                <Paper component="li" key={step.title} variant="outlined" sx={{ p: 2.5, borderTop: `3px solid ${universityColors.gold}`, borderColor: universityColors.border, borderTopColor: universityColors.gold }}>
                  <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, color: universityColors.navy }}>{i + 1}. {step.title}</Typography>
                  <Typography sx={{ fontSize: 14, color: universityColors.textSecondary }}>{step.text}</Typography>
                </Paper>
              ))}
            </Box>
          </Section>
        )}

        <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg">
            <Box sx={{ bgcolor: universityColors.navyDark, color: '#FFFFFF', borderRadius: 3, p: { xs: 3, md: 5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 3, alignItems: 'center' }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, mb: 1 }}>بوابة الطالب</Typography>
                <Typography sx={{ color: '#C3D3E6' }}>ادخل بالرقم الجامعي لتسجيل المقررات ومتابعة حالتك الأكاديمية وتقديم الطلبات ومتابعتها أولاً بأول.</Typography>
              </Box>
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button component={RouterLink} to="/login" variant="contained" color="secondary" size="large" sx={{ fontWeight: 700 }}>تسجيل الدخول</Button>
                <Button component={RouterLink} to="/signup" variant="outlined" size="large" sx={{ fontWeight: 700, color: '#FFFFFF', borderColor: '#FFFFFF', '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255,255,255,.12)' } }}>إنشاء حساب</Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        {c.news.length > 0 && (
          <Section id="news" title="آخر الأخبار" alt>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2 }}>
              {c.news.map((item) => (
                <Paper component="article" key={item.title} variant="outlined" sx={{ p: 2.5, borderColor: universityColors.border }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: universityColors.goldDark }}>{item.tag}</Typography>
                  <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
                  <Typography sx={{ color: universityColors.textSecondary, fontSize: 15 }}>{item.text}</Typography>
                </Paper>
              ))}
            </Box>
          </Section>
        )}
      </Box>

      <Box component="footer" id="contact" sx={{ bgcolor: universityColors.navyDark, color: '#C3D3E6', py: 4, scrollMarginTop: '72px' }}>
        <Container maxWidth="lg">
          <Stack spacing={1}>
            <Typography sx={{ color: '#FFFFFF', fontWeight: 700 }}>{c.universityName}</Typography>
            {contactLines.map((line) => <Typography key={line} sx={{ fontSize: 15 }}>{line}</Typography>)}
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', pt: 1 }}>
              <Link component={RouterLink} to="/login" underline="hover" sx={{ color: '#C3D3E6' }}>دخول الطلاب</Link>
              <Link component={RouterLink} to="/signup" underline="hover" sx={{ color: '#C3D3E6' }}>إنشاء حساب</Link>
              <Link component={RouterLink} to="/verify" underline="hover" sx={{ color: '#C3D3E6' }}>التحقق من وثيقة</Link>
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#8FA6BF', borderTop: '1px solid rgba(255,255,255,.14)', pt: 1.5, mt: 1 }}>© {c.universityName}</Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
