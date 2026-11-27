import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, IconButton, Link, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import { useAuth } from '../../auth/AuthContext';
import { landingContent } from './landingContent';

// Visual identity of the approved site design: deep blue gradient hero with soft waves, glass header,
// gold accents on a warm cream background, tilted logo card, floating figures and a glass testimonial.
const T = {
  navy: '#033d65', navyDark: '#022c4a', blue: '#2f5f9f', sky: '#a9c3ee',
  gold: '#c99a2e', gold2: '#ecc872', goldDark: '#9a7218', goldText: '#f4dc9b',
  cream: '#f8f6f1', cream2: '#f1ecdf', ink: '#14263a', muted: '#5a6b7d',
  goldGrad: 'linear-gradient(135deg,#f0cf80,#c99a2e 55%,#a77c1c)',
  navyGrad: 'linear-gradient(135deg,#022c4a,#033d65)',
  shadow: '0 4px 18px rgba(3,61,101,.10)',
};

const float = keyframes`50% { transform: rotate(-2deg) translateY(-10px); }`;
const drift = keyframes`50% { transform: translate(18px,-22px) scale(1.12); }`;
const rise = keyframes`from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; }`;
const shift = keyframes`50% { background-position: 100% 0; }`;
const pulse = keyframes`0% { box-shadow: 0 0 0 0 rgba(236,200,114,.7); } 70% { box-shadow: 0 0 0 18px rgba(236,200,114,0); } 100% { box-shadow: 0 0 0 0 rgba(236,200,114,0); }`;
const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', opacity: '1 !important', transform: 'none !important' } };

const c = landingContent;
const ABOUT_ICONS = [VisibilityRoundedIcon, FlagRoundedIcon, DiamondRoundedIcon];

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ width: 'min(1120px, 100% - 32px)', mx: 'auto', ...sx }}>{children}</Box>;
}

function Block({ id, title, children, dark }: { id: string; title: string; children: ReactNode; dark?: boolean }) {
  return (
    <Box
      component="section" id={id}
      sx={{
        py: { xs: 5, md: 7 }, scrollMarginTop: '88px', position: 'relative', overflow: 'hidden',
        ...(dark
          ? { background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 14s ease infinite`, color: '#fff', borderBlock: '2px solid rgba(236,200,114,.45)' }
          : { '&:nth-of-type(even)': { background: `linear-gradient(180deg,${T.cream2},${T.cream})` } }),
        ...calm,
      }}
    >
      <Wrap>
        <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: dark ? '#fff' : T.navy, mb: 3, '&::after': { content: '""', display: 'block', width: 70, height: 4, borderRadius: 4, mt: 0.75, background: dark ? T.goldGrad : `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>{title}</Typography>
        {children}
      </Wrap>
    </Box>
  );
}

const goldCard = { bgcolor: '#fff', borderRadius: '14px', boxShadow: T.shadow, border: '1px solid rgba(201,154,46,.22)', transition: '.25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 38px rgba(3,61,101,.18), 0 0 0 2px rgba(201,154,46,.45)' }, ...calm };

function GoldButton({ to, href, children, outline, pulsing }: { to?: string; href?: string; children: ReactNode; outline?: boolean; pulsing?: boolean }) {
  const common = { px: 3.5, py: 1.4, borderRadius: '14px', fontWeight: 700, fontSize: 16, transition: '.2s', '&:hover': { transform: 'translateY(-2px)' } };
  const sx = outline
    ? { ...common, color: '#f6e2ae', border: '1px solid rgba(236,200,114,.8)', '&:hover': { ...common['&:hover'], bgcolor: 'rgba(236,200,114,.15)' } }
    : { ...common, background: T.goldGrad, color: T.ink, boxShadow: '0 10px 26px rgba(201,154,46,.45)', ...(pulsing ? { animation: `${pulse} 2.2s infinite` } : {}), '&:hover': { ...common['&:hover'], background: T.goldGrad, filter: 'brightness(1.05)' } };
  return to ? <Button component={RouterLink} to={to} sx={{ ...sx, ...calm }}>{children}</Button> : <Button component="a" href={href} sx={{ ...sx, ...calm }}>{children}</Button>;
}

// Public home page of the university. A signed-in person goes straight to their dashboard.
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState('top');
  const [showTop, setShowTop] = useState(false);
  const [slide, setSlide] = useState(0);

  const contactLines = [
    c.contact.address && `العنوان: ${c.contact.address}`,
    c.contact.phone && `الهاتف: ${c.contact.phone}`,
    c.contact.email && `البريد: ${c.contact.email}`,
  ].filter(Boolean) as string[];
  const hasPresident = Boolean(c.president.word.trim());

  const nav = [
    { id: 'top', label: 'الرئيسية', show: true },
    { id: 'about', label: 'من نحن', show: true },
    { id: 'colleges', label: 'الكليات', show: c.colleges.length > 0 },
    { id: 'admission', label: 'القبول والتسجيل', show: c.admission.steps.length > 0 },
    { id: 'news', label: 'الأخبار', show: c.news.length > 0 },
    { id: 'contact', label: 'اتصل بنا', show: contactLines.length > 0 },
  ].filter((n) => n.show);

  // Highlights the menu item of the section being read.
  useEffect(() => {
    if (isAuthenticated) return;
    const ids = nav.map((n) => n.id);
    const observer = new IntersectionObserver(
      (entries) => { const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (hit) setActive(hit.target.id); },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.1, 0.5] },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const t = c.testimonials[slide % Math.max(c.testimonials.length, 1)];

  return (
    <Box sx={{ bgcolor: T.cream, color: T.ink, direction: 'rtl' }}>
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, pt: 1.5, pointerEvents: 'none' }}>
        <Wrap sx={{ pointerEvents: 'auto' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 64, px: 2, borderRadius: '20px', bgcolor: 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)', border: '1px solid rgba(201,154,46,.4)', boxShadow: '0 8px 30px rgba(3,61,101,.16)' }}>
            <Stack component={RouterLink} to="/" direction="row" spacing={1.2} sx={{ alignItems: 'center', textDecoration: 'none', color: T.navy }} aria-label={`${c.universityName} ${c.universitySuffix}`}>
              <Box component="img" src="/logo-md.png" alt="" sx={{ height: 44, width: 'auto' }} />
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 18 } }}>{c.universityName} {c.universitySuffix}</Typography>
            </Stack>
            <Stack component="nav" aria-label="التنقل الرئيسي" direction="row" spacing={0.5} sx={{ ms: 'auto', display: { xs: 'none', md: 'flex' } }}>
              {nav.map((n) => (
                <Link
                  key={n.id} href={`#${n.id}`} underline="none" aria-current={active === n.id ? 'true' : undefined}
                  sx={{ px: 1.75, py: 0.9, borderRadius: '12px', fontSize: 15, fontWeight: 500, transition: '.2s', ...(active === n.id ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, '&:hover': { bgcolor: '#f3ead2' } }) }}
                >{n.label}</Link>
              ))}
            </Stack>
            <Button component={RouterLink} to="/login" sx={{ ms: { xs: 'auto', md: 1 }, borderRadius: '12px', fontWeight: 700, background: T.goldGrad, color: T.ink, px: 2.25, '&:hover': { background: T.goldGrad, filter: 'brightness(1.05)' } }}>دخول الطلاب</Button>
          </Stack>
        </Wrap>
      </Box>

      <Box component="main">
        {/* ---------- hero ---------- */}
        <Box id="top" sx={{ mt: '-76px', pt: '76px', position: 'relative', overflow: 'hidden', borderRadius: '0 0 44px 44px', color: '#fff', minHeight: { md: 640 }, background: `linear-gradient(135deg,${T.navyDark},${T.navy} 60%,${T.blue})` }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1.6px, transparent 1.7px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
          <Box aria-hidden sx={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', bgcolor: 'rgba(91,132,196,.28)', top: -240, insetInlineEnd: -120, pointerEvents: 'none' }} />
          <Box aria-hidden sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,200,114,.3), transparent 70%)', top: -120, insetInlineStart: -80, animation: `${drift} 11s ease-in-out infinite`, pointerEvents: 'none', ...calm }} />
          <Box component="svg" aria-hidden viewBox="0 0 1600 300" preserveAspectRatio="none" sx={{ position: 'absolute', insetInline: 0, bottom: 0, width: '100%', height: 190, pointerEvents: 'none' }}>
            <path d="M0 160 Q400 60 800 160 T1600 120 V300 H0Z" fill="#fff" fillOpacity=".06" />
            <path d="M0 220 Q420 140 860 220 T1600 190 V300 H0Z" fill="#fff" fillOpacity=".05" />
          </Box>
          <Wrap sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center', py: { xs: 5, md: 8 }, pb: { xs: 12, md: c.stats.length ? 14 : 11 }, textAlign: { xs: 'center', md: 'start' } }}>
            <Box sx={{ order: { xs: 2, md: 1 }, '& > *': { animation: `${rise} .8s cubic-bezier(.2,.7,.2,1) both`, ...calm }, '& > :nth-of-type(2)': { animationDelay: '.15s' }, '& > :nth-of-type(3)': { animationDelay: '.3s' }, '& > :nth-of-type(4)': { animationDelay: '.45s' } }}>
              <Box component="span" sx={{ display: 'inline-block', px: 2, py: 0.3, mb: 1.75, borderRadius: 30, fontSize: 14, bgcolor: 'rgba(255,255,255,.14)', border: '1px solid rgba(236,200,114,.6)', color: '#f6e2ae', backdropFilter: 'blur(6px)' }}>أهلاً بك في</Box>
              <Typography component="h1" sx={{ fontSize: { xs: 40, md: 58 }, fontWeight: 800, lineHeight: 1.25, mb: 1.5 }}>
                {c.universityName}{' '}
                <Box component="span" sx={{ background: 'linear-gradient(90deg,#f6dd9c,#d9a93c 60%,#f0cf80)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{c.universitySuffix}</Box>
              </Typography>
              <Typography sx={{ fontSize: { xs: 18, md: 21 }, color: '#e6eefb', mb: 1, fontWeight: 500 }}>{c.tagline}</Typography>
              <Typography sx={{ fontSize: 16, color: '#cfdcf0', maxWidth: 540, mb: 3.5, mx: { xs: 'auto', md: 0 } }}>{c.heroText}</Typography>
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <GoldButton to="/login">بوابة الطالب</GoldButton>
                <GoldButton href="#admission" outline>القبول والتسجيل</GoldButton>
              </Stack>
            </Box>
            <Box sx={{ order: { xs: 1, md: 2 }, justifySelf: 'center', bgcolor: '#fff', borderRadius: '32px', p: { xs: '16px 22px', md: '28px 34px' }, transform: 'rotate(-2deg)', animation: `${float} 6s ease-in-out infinite`, boxShadow: '0 30px 60px rgba(0,0,0,.28), 0 0 0 6px rgba(236,200,114,.45)', ...calm }}>
              <Box component="img" src="/logo-md.png" alt="شعار جامعة المعالي" sx={{ height: { xs: 150, md: 240 }, width: 'auto', display: 'block', mx: 'auto' }} />
            </Box>
          </Wrap>
        </Box>

        {c.stats.length > 0 && (
          <Wrap sx={{ mt: '-56px', position: 'relative', zIndex: 2, pb: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.75 }}>
              {c.stats.map((s) => (
                <Box key={s.label} sx={{ position: 'relative', bgcolor: '#fff', borderRadius: '18px', boxShadow: '0 12px 34px rgba(3,61,101,.15)', p: 2, textAlign: 'center', borderBottom: `4px solid ${T.gold}`, '&::before': { content: '""', position: 'absolute', top: 0, insetInline: '30%', height: 3, borderRadius: '0 0 4px 4px', background: T.goldGrad } }}>
                  <Typography sx={{ fontSize: 30, fontWeight: 800, background: T.navyGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.value}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 14.5 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Wrap>
        )}

        {/* ---------- about ---------- */}
        <Block id="about" title="من نحن">
          <Typography sx={{ color: T.muted, mb: 3, maxWidth: '60ch', fontSize: 17 }}>{c.about.intro}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 2.25 }}>
            {c.about.items.map((item, i) => {
              const Icon = ABOUT_ICONS[i % ABOUT_ICONS.length];
              return (
                <Box key={item.title} sx={{ ...goldCard, p: 3, borderTop: `4px solid ${T.gold}` }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', mb: 1.5, background: 'linear-gradient(135deg,#fbf2d9,#f0d890)', color: T.goldDark }}><Icon /></Box>
                  <Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, color: T.navy, mb: 0.5 }}>{item.title}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 15.5 }}>{item.text}</Typography>
                </Box>
              );
            })}
          </Box>
        </Block>

        {hasPresident && (
          <Block id="president" title="كلمة رئيس الجامعة">
            <Box sx={{ ...goldCard, p: { xs: 3, md: 4 }, borderInlineStart: `5px solid ${T.gold}` }}>
              <Typography sx={{ fontSize: 18, lineHeight: 2, whiteSpace: 'pre-line' }}>{c.president.word}</Typography>
              {c.president.name && <Typography sx={{ mt: 2, fontWeight: 700, color: T.goldDark }}>{c.president.name}</Typography>}
            </Box>
          </Block>
        )}

        {c.colleges.length > 0 && (
          <Block id="colleges" title="الكليات والاختصاصات">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.25 }}>
              {c.colleges.map((college) => (
                <Box key={college.title} sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                  <Typography component="h3" sx={{ fontSize: 18.5, fontWeight: 700, color: T.navy, mb: 0.5 }}>{college.title}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 15 }}>{college.text}</Typography>
                </Box>
              ))}
            </Box>
          </Block>
        )}

        {c.admission.steps.length > 0 && (
          <Block id="admission" title="القبول والتسجيل">
            <Typography sx={{ color: T.muted, mb: 3, fontSize: 17 }}>{c.admission.intro}</Typography>
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.25 }}>
              {c.admission.steps.map((step, i) => (
                <Box component="li" key={step.title} sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25, fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{i + 1}</Box>
                  <Typography component="h3" sx={{ fontSize: 17.5, fontWeight: 700, color: T.navy }}>{step.title}</Typography>
                  <Typography sx={{ fontSize: 14.5, color: T.muted }}>{step.text}</Typography>
                </Box>
              ))}
            </Box>
          </Block>
        )}

        {c.news.length > 0 && (
          <Block id="news" title="الأخبار والإعلانات">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2.25 }}>
              {c.news.map((item) => (
                <Box component="article" key={item.title} sx={{ ...goldCard, p: 2.75 }}>
                  <Box component="span" sx={{ display: 'inline-block', px: 1.5, borderRadius: 20, fontSize: 12.5, bgcolor: '#f6ecd0', color: '#7a5a12', mb: 1 }}>{item.tag}</Box>
                  <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, color: T.navy, mb: 0.5 }}>{item.title}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 15 }}>{item.text}</Typography>
                </Box>
              ))}
            </Box>
          </Block>
        )}

        {c.testimonials.length > 0 && t && (
          <Block id="testimonials" title="قالوا عن الجامعة" dark>
            <Box sx={{ maxWidth: 640, mx: 'auto', p: 3.5, borderRadius: '24px', bgcolor: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(236,200,114,.55)', position: 'relative' }}>
              <FormatQuoteRoundedIcon sx={{ position: 'absolute', top: 10, insetInlineStart: 14, fontSize: 56, color: T.gold2, opacity: 0.45 }} />
              <Typography role="status" sx={{ fontSize: 19, lineHeight: 1.9, mt: 2, mb: 2.5 }}>{t.text}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: T.goldGrad, color: T.ink }}>{t.name.slice(0, 1)}</Box>
                <Box><Typography sx={{ fontWeight: 700 }}>{t.name}</Typography><Typography sx={{ fontSize: 13.5, color: '#e4d3a0' }}>{t.role}</Typography></Box>
              </Stack>
            </Box>
            {c.testimonials.length > 1 && (
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2.5 }}>
                <Button aria-label="الشهادة السابقة" onClick={() => setSlide((slide + c.testimonials.length - 1) % c.testimonials.length)} sx={{ color: '#fff', border: '1px solid rgba(236,200,114,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>→</Button>
                <Button aria-label="الشهادة التالية" onClick={() => setSlide((slide + 1) % c.testimonials.length)} sx={{ color: '#fff', border: '1px solid rgba(236,200,114,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>←</Button>
              </Stack>
            )}
          </Block>
        )}

        {/* ---------- student portal call to action ---------- */}
        <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
          <Wrap>
            <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '32px', p: { xs: 3.5, md: 6 }, color: '#fff', border: '2px solid rgba(236,200,114,.5)', background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 12s ease infinite`, boxShadow: '0 24px 50px rgba(3,61,101,.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap', ...calm }}>
              <Box aria-hidden sx={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(236,200,114,.12)', top: -80, insetInlineStart: -40, animation: `${drift} 9s ease-in-out infinite`, ...calm }} />
              <Box sx={{ position: 'relative', flex: '1 1 320px' }}>
                <Typography component="h2" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 800, mb: 1 }}>بوابة الطالب</Typography>
                <Typography sx={{ color: '#dbe8fb', fontSize: 17 }}>ادخل بالرقم الجامعي لتسجيل المقررات ومتابعة حالتك الأكاديمية وتقديم الطلبات ومتابعتها أولاً بأول.</Typography>
              </Box>
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ position: 'relative', flexWrap: 'wrap' }}>
                <GoldButton to="/login" pulsing>تسجيل الدخول</GoldButton>
                <GoldButton to="/signup" outline>إنشاء حساب</GoldButton>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 3 }}>
              {[['التحقق من وثيقة', '/verify'], ['تسجيل الدخول', '/login'], ['إنشاء حساب', '/signup']].map(([label, to]) => (
                <Button key={to} component={RouterLink} to={to} sx={{ borderRadius: '12px', px: 2.5, bgcolor: '#f6ecd0', color: '#6b4e10', fontWeight: 600, '&:hover': { bgcolor: T.navy, color: T.goldText } }}>{label}</Button>
              ))}
            </Stack>
          </Wrap>
        </Box>
      </Box>

      <Box component="footer" id="contact" sx={{ borderTop: `4px solid ${T.gold}`, background: T.navyGrad, color: '#dbe8fb', py: 5, scrollMarginTop: '88px' }}>
        <Wrap>
          <Stack spacing={1.25}>
            <Box component="img" src="/logo-md.png" alt="" sx={{ height: 64, width: 64, objectFit: 'contain', bgcolor: '#fff', borderRadius: '12px', p: 0.5, boxShadow: '0 0 0 3px rgba(236,200,114,.5)' }} />
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{c.universityName} {c.universitySuffix}</Typography>
            {contactLines.map((line) => <Typography key={line} sx={{ fontSize: 15 }}>{line}</Typography>)}
            <Stack direction="row" spacing={2.5} useFlexGap sx={{ flexWrap: 'wrap', pt: 1 }}>
              <Link component={RouterLink} to="/login" underline="hover" sx={{ color: T.goldText }}>دخول الطلاب</Link>
              <Link component={RouterLink} to="/signup" underline="hover" sx={{ color: T.goldText }}>إنشاء حساب</Link>
              <Link component={RouterLink} to="/verify" underline="hover" sx={{ color: T.goldText }}>التحقق من وثيقة</Link>
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#9fb4d0', borderTop: '1px solid rgba(255,255,255,.14)', pt: 1.5, mt: 1 }}>© {c.universityName} {c.universitySuffix}</Typography>
          </Stack>
        </Wrap>
      </Box>

      {showTop && (
        <IconButton aria-label="إلى أعلى الصفحة" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 30, background: T.navyGrad, color: T.goldText, border: `2px solid ${T.gold}`, '&:hover': { bgcolor: T.gold, background: T.gold, color: T.ink } }}>
          <ArrowUpwardRoundedIcon />
        </IconButton>
      )}
    </Box>
  );
}
