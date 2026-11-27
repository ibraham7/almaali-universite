import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useAuth } from '../../auth/AuthContext';
import { siteMediaUrl, useSiteContent } from '../../api/site';
import { Block, GoldButton, SiteFooter, SiteHeader, Wrap } from '../site/siteTheme';
import { T, UNIVERSITY, calm, drift, float, goldCard, rise, shift, siteNav } from '../site/siteStyles';
import { NewsCard } from '../site/NewsPages';

// Home page of the university. Everything it shows comes from the site panel (the database): a section
// with no data is simply not shown, so nothing invented ever appears. A signed-in person goes to the dashboard.
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { content } = useSiteContent();
  const [slide, setSlide] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    document.title = `${UNIVERSITY.name} ${UNIVERSITY.suffix}`;
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const s = content?.settings ?? {};
  const stats = content?.stats ?? [];
  const testimonials = content?.testimonials ?? [];
  const t = testimonials[slide % Math.max(testimonials.length, 1)];
  const hasAdmission = siteNav(content).some((item) => item.to === '/admission');
  const pillars = [
    s.vision && { title: 'الرؤية', text: s.vision, Icon: VisibilityRoundedIcon },
    s.mission && { title: 'الرسالة', text: s.mission, Icon: FlagRoundedIcon },
  ].filter(Boolean) as Array<{ title: string; text: string; Icon: typeof FlagRoundedIcon }>;
  const hasAbout = Boolean(s.aboutIntro || pillars.length);
  const word = (s.presidentWord ?? '').trim();
  const wordShort = word.length > 520 ? `${word.slice(0, 520).replace(/\s+\S*$/, '')}...` : word;
  const more = (to: string, label: string) => <Button component={RouterLink} to={to} sx={{ mt: 3, fontWeight: 700, color: T.goldDark }}>{label} ←</Button>;

  return (
    <Box sx={{ bgcolor: T.cream, color: T.ink, direction: 'rtl' }}>
      <SiteHeader />

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
          <Wrap sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center', py: { xs: 5, md: 8 }, pb: { xs: 12, md: stats.length ? 14 : 11 }, textAlign: { xs: 'center', md: 'start' } }}>
            <Box sx={{ order: { xs: 2, md: 1 }, '& > *': { animation: `${rise} .8s cubic-bezier(.2,.7,.2,1) both`, ...calm }, '& > :nth-of-type(2)': { animationDelay: '.15s' }, '& > :nth-of-type(3)': { animationDelay: '.3s' }, '& > :nth-of-type(4)': { animationDelay: '.45s' } }}>
              <Box component="span" sx={{ display: 'inline-block', px: 2, py: 0.3, mb: 1.75, borderRadius: 30, fontSize: 14, bgcolor: 'rgba(255,255,255,.14)', border: '1px solid rgba(236,200,114,.6)', color: '#f6e2ae', backdropFilter: 'blur(6px)' }}>أهلاً بك في</Box>
              <Typography component="h1" sx={{ fontSize: { xs: 40, md: 58 }, fontWeight: 800, lineHeight: 1.25, mb: 1.5 }}>
                {UNIVERSITY.name}{' '}
                <Box component="span" sx={{ background: 'linear-gradient(90deg,#f6dd9c,#d9a93c 60%,#f0cf80)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{UNIVERSITY.suffix}</Box>
              </Typography>
              {s.tagline && <Typography sx={{ fontSize: { xs: 18, md: 21 }, color: '#e6eefb', mb: 1, fontWeight: 500 }}>{s.tagline}</Typography>}
              {s.heroText && <Typography sx={{ fontSize: 16, color: '#cfdcf0', maxWidth: 540, mb: 3.5, mx: { xs: 'auto', md: 0 } }}>{s.heroText}</Typography>}
              {!s.heroText && <Box sx={{ mb: 3.5 }} />}
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <GoldButton to="/login">بوابة الطالب</GoldButton>
                {hasAdmission && <GoldButton to="/admission" outline>القبول والتسجيل</GoldButton>}
              </Stack>
            </Box>
            <Box sx={{ order: { xs: 1, md: 2 }, justifySelf: 'center', bgcolor: '#fff', borderRadius: '32px', p: { xs: '16px 22px', md: '28px 34px' }, transform: 'rotate(-2deg)', animation: `${float} 6s ease-in-out infinite`, boxShadow: '0 30px 60px rgba(0,0,0,.28), 0 0 0 6px rgba(236,200,114,.45)', ...calm }}>
              <Box component="img" src="/logo-md.png" alt="شعار جامعة المعالي" sx={{ height: { xs: 150, md: 240 }, width: 'auto', display: 'block', mx: 'auto' }} />
            </Box>
          </Wrap>
        </Box>


        {stats.length > 0 && (
          <Wrap sx={{ mt: '-56px', position: 'relative', zIndex: 2, pb: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.75 }}>
              {stats.map((stat) => (
                <Box key={stat.title} sx={{ position: 'relative', bgcolor: '#fff', borderRadius: '18px', boxShadow: '0 12px 34px rgba(3,61,101,.15)', p: 2, textAlign: 'center', borderBottom: `4px solid ${T.gold}`, '&::before': { content: '""', position: 'absolute', top: 0, insetInline: '30%', height: 3, borderRadius: '0 0 4px 4px', background: T.goldGrad } }}>
                  <Typography sx={{ fontSize: 30, fontWeight: 800, background: T.navyGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{stat.extra}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 14.5 }}>{stat.title}</Typography>
                </Box>
              ))}
            </Box>
          </Wrap>
        )}

        {hasAbout && (
          <Block id="about" title="من نحن">
            {s.aboutIntro && <Typography sx={{ color: T.muted, mb: 3, maxWidth: '70ch', fontSize: 17, whiteSpace: 'pre-line' }}>{s.aboutIntro.length > 420 ? `${s.aboutIntro.slice(0, 420).replace(/\s+\S*$/, '')}...` : s.aboutIntro}</Typography>}
            {pillars.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 2.25 }}>
                {pillars.map(({ title, text, Icon }) => (
                  <Box key={title} sx={{ ...goldCard, p: 3, borderTop: `4px solid ${T.gold}` }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', mb: 1.5, background: 'linear-gradient(135deg,#fbf2d9,#f0d890)', color: T.goldDark }}><Icon /></Box>
                    <Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, color: T.navy, mb: 0.5 }}>{title}</Typography>
                    <Typography sx={{ color: T.muted, fontSize: 15.5, whiteSpace: 'pre-line' }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {more('/about', 'تعرّف أكثر على الجامعة')}
          </Block>
        )}

        {word && (
          <Block id="president" title="كلمة رئيس الجامعة">
            <Box sx={{ ...goldCard, p: { xs: 3, md: 4 }, borderInlineStart: `5px solid ${T.gold}`, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, '&:hover': { transform: 'none' } }}>
              {s.presidentPhotoId && <Box component="img" src={siteMediaUrl(s.presidentPhotoId)} alt={s.presidentName ? `صورة ${s.presidentName}` : 'رئيس الجامعة'} sx={{ width: { xs: 140, md: 170 }, height: { xs: 140, md: 170 }, objectFit: 'cover', borderRadius: '20px', border: `3px solid ${T.gold}`, alignSelf: { xs: 'center', md: 'flex-start' } }} />}
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 18, lineHeight: 2, whiteSpace: 'pre-line' }}>{wordShort}</Typography>
                {s.presidentName && <Typography sx={{ mt: 2, fontWeight: 700, color: T.goldDark }}>{s.presidentName}</Typography>}
              </Box>
            </Box>
            {word.length > 520 && more('/about', 'اقرأ الكلمة كاملة')}
          </Block>
        )}

        {content && content.colleges.length > 0 && (
          <Block id="colleges" title="الكليات والاختصاصات">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.25 }}>
              {content.colleges.map((college) => (
                <Box key={college.nameAr} sx={{ ...goldCard, overflow: 'hidden', borderTop: `4px solid ${T.gold}` }}>
                  {college.mediaId && <Box component="img" src={siteMediaUrl(college.mediaId)} alt="" loading="lazy" sx={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />}
                  <Box sx={{ p: 2.75 }}>
                    <Typography component="h3" sx={{ fontSize: 18.5, fontWeight: 700, color: T.navy, mb: 0.5 }}>{college.nameAr}</Typography>
                    {college.summary && <Typography sx={{ color: T.muted, fontSize: 15 }}>{college.summary.length > 140 ? `${college.summary.slice(0, 140).replace(/\s+\S*$/, '')}...` : college.summary}</Typography>}
                  </Box>
                </Box>
              ))}
            </Box>
            {more('/colleges', 'كل الكليات والاختصاصات')}
          </Block>
        )}

        {content && content.admissionSteps.length > 0 && (
          <Block id="admission" title="القبول والتسجيل">
            {s.admissionIntro && <Typography sx={{ color: T.muted, mb: 3, fontSize: 17 }}>{s.admissionIntro}</Typography>}
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(210px, 1fr))' }, gap: 2.25 }}>
              {content.admissionSteps.map((step, i) => (
                <Box component="li" key={step.title} sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25, fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{i + 1}</Box>
                  <Typography component="h3" sx={{ fontSize: 17.5, fontWeight: 700, color: T.navy }}>{step.title}</Typography>
                  {step.text && <Typography sx={{ fontSize: 14.5, color: T.muted }}>{step.text}</Typography>}
                </Box>
              ))}
            </Box>
            {more('/admission', 'شروط القبول والوثائق والمواعيد')}
          </Block>
        )}

        {content && content.latestNews.length > 0 && (
          <Block id="news" title="الأخبار والإعلانات">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2.25 }}>
              {content.latestNews.map((item) => <NewsCard key={item.id} item={item} />)}
            </Box>
            {more('/news', 'كل الأخبار')}
          </Block>
        )}

        {testimonials.length > 0 && t && (
          <Block id="testimonials" title="قالوا عن الجامعة" dark>
            <Box sx={{ maxWidth: 640, mx: 'auto', p: 3.5, borderRadius: '24px', bgcolor: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(236,200,114,.55)', position: 'relative' }}>
              <FormatQuoteRoundedIcon sx={{ position: 'absolute', top: 10, insetInlineStart: 14, fontSize: 56, color: T.gold2, opacity: 0.45 }} />
              <Typography role="status" sx={{ fontSize: 19, lineHeight: 1.9, mt: 2, mb: 2.5 }}>{t.text}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: T.goldGrad, color: T.ink }}>{t.name.slice(0, 1)}</Box>
                <Box><Typography sx={{ fontWeight: 700 }}>{t.name}</Typography>{t.role && <Typography sx={{ fontSize: 13.5, color: '#e4d3a0' }}>{t.role}</Typography>}</Box>
              </Stack>
            </Box>
            {testimonials.length > 1 && (
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2.5 }}>
                <Button aria-label="الشهادة السابقة" onClick={() => setSlide((slide + testimonials.length - 1) % testimonials.length)} sx={{ color: '#fff', border: '1px solid rgba(236,200,114,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>→</Button>
                <Button aria-label="الشهادة التالية" onClick={() => setSlide((slide + 1) % testimonials.length)} sx={{ color: '#fff', border: '1px solid rgba(236,200,114,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>←</Button>
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

      <SiteFooter />

      {showTop && (
        <Button aria-label="إلى أعلى الصفحة" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 30, minWidth: 44, height: 44, borderRadius: '50%', background: T.navyGrad, color: T.goldText, border: `2px solid ${T.gold}`, '&:hover': { background: T.gold, color: T.ink } }}>↑</Button>
      )}
    </Box>
  );
}
