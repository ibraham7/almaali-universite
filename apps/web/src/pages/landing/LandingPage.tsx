import { useEffect } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { siteMediaUrl, useSiteContent, type SiteNewsCard } from '../../api/site';
import { Block, GoldButton, SiteFooter, SiteHeader, Wrap } from '../site/siteTheme';
import { BlueButton, CollegeCard, EventCard, GhostLink, MoreRow, Split, SplitImage } from '../site/siteParts';
import { CountUp, Expandable, PageTransition, SiteChrome, SiteFx, TestimonialSlider } from '../site/siteFx';
import { T, UNIVERSITY, bob, calm, cardIn, drift, floatT, rise, shift, siteNav, spin, wiggle } from '../site/siteStyles';
import { NewsCard } from '../site/NewsPages';

const more = (to: string, label: string) => <MoreRow><BlueButton to={to}>{label} ←</BlueButton></MoreRow>;
const parts = (value: string | null) => {
  if (!value) return { day: '', month: '' };
  const date = new Date(value);
  return { day: date.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric' }), month: date.toLocaleDateString('ar-EG-u-nu-latn', { month: 'short' }) };
};

function AnnouncementRow({ item }: { item: SiteNewsCard }) {
  const { day, month } = parts(item.publishedAt);
  return (
    <Box
      component={RouterLink} to={`/news/${item.id}`} data-rv="side"
      sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.75, borderRadius: '18px', bgcolor: '#fff', textDecoration: 'none', color: T.ink, border: '1px solid rgba(211,154,61,.28)', borderInlineStart: `5px solid ${T.gold}`, boxShadow: T.shadow, transition: 'transform .25s ease-out, border-color .25s, box-shadow .25s', '&:hover': { transform: 'translateX(6px)', borderInlineStartColor: T.navy, boxShadow: '0 12px 30px rgba(11,47,104,.16)' }, '&:hover .arrow': { transform: 'translateX(-4px)' }, ...calm }}
    >
      <Box sx={{ flex: 'none', width: 62, textAlign: 'center', py: 0.75, borderRadius: '14px', background: T.navyGrad, color: '#fff', boxShadow: `inset 0 -3px 0 ${T.gold}` }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{day}</Typography>
        <Typography sx={{ fontSize: 12.5, color: T.goldText }}>{month}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box component="span" sx={{ display: 'inline-block', px: 1.25, borderRadius: 20, fontSize: 12, bgcolor: '#f6ecd0', color: '#7a5a12', mb: 0.25 }}>إعلان</Box>
        <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, color: T.navy }}>{item.title}</Typography>
      </Box>
      <Box className="arrow" aria-hidden sx={{ fontSize: 22, color: T.goldDark, transition: 'transform .25s' }}>←</Box>
    </Box>
  );
}

// الصفحة الرئيسية: كل ما تعرضه يأتي من لوحة الموقع (قاعدة البيانات)، والقسم بلا بيانات يُخفى فلا يظهر شيء مختلق.
// تفتح بهيرو متحرك (دخول متتابع، حلقة ذهبية، ميلان بالمؤشر)، والحركات كلها تحترم prefers-reduced-motion.
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { content } = useSiteContent();
  useEffect(() => { document.title = `${UNIVERSITY.name} ${UNIVERSITY.suffix}`; }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const s = content?.settings ?? {};
  const stats = content?.stats ?? [];
  const testimonials = content?.testimonials ?? [];
  const announcements = content?.latestAnnouncements ?? [];
  const hasAdmission = siteNav(content).some((item) => item.to === '/admission');
  const hasAboutPage = siteNav(content).some((item) => item.to === '/about');
  const events = content?.upcomingEvents ?? [];
  const quick = content?.quickLinks ?? [];
  const word = (s.presidentWord ?? '').trim();
  const heroImage = s.heroImageId ? siteMediaUrl(s.heroImageId) : undefined;
  const stagger = (delay: number) => ({ animation: `${rise} .8s ${T.ease} both`, animationDelay: `${delay}s`, ...calm });

  return (
    <Box sx={{ bgcolor: T.cream, color: T.ink, direction: 'rtl' }}>
      <SiteFx />
      <SiteChrome />
      <SiteHeader />

      <Box component="main">
        <PageTransition>
          {/* ---------- الهيرو ---------- */}
          <Box id="top" data-hero="" sx={{ mt: '-76px', pt: '76px', position: 'relative', overflow: 'hidden', borderRadius: '0 0 44px 44px', color: '#fff', minHeight: { md: 640 }, background: `linear-gradient(135deg,${T.navyDark},${T.navy} 55%,${T.blue})` }}>
            {heroImage && <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(90deg,rgba(13,55,103,.94),rgba(26,85,175,.62)), url("${heroImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', pointerEvents: 'none' }} />}
            <Box aria-hidden sx={{ position: 'absolute', inset: '-6%', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1.6px, transparent 1.7px)', backgroundSize: '48px 48px', transform: 'translate(var(--px, 0%), var(--py, 0%))', transition: 'transform .3s ease-out', pointerEvents: 'none', ...calm }} />
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(520px circle at var(--mx, 70%) var(--my, 30%), rgba(255,255,255,.16), transparent 60%)', pointerEvents: 'none' }} />
            <Box aria-hidden sx={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', bgcolor: 'rgba(95,149,232,.26)', top: -240, insetInlineEnd: -120, animation: `${drift} 11s ease-in-out infinite`, pointerEvents: 'none', ...calm }} />
            <Box aria-hidden sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(246,213,148,.3), transparent 70%)', top: -120, insetInlineStart: -80, animation: `${drift} 9s ease-in-out infinite`, animationDelay: '-4s', pointerEvents: 'none', ...calm }} />
            <Box component="svg" aria-hidden viewBox="0 0 1600 300" preserveAspectRatio="none" sx={{ position: 'absolute', insetInline: 0, bottom: 0, width: '100%', height: 190, pointerEvents: 'none' }}>
              <path d="M0 160 Q400 60 800 160 T1600 120 V300 H0Z" fill="#fff" fillOpacity=".06" />
              <path d="M0 220 Q420 140 860 220 T1600 190 V300 H0Z" fill="#fff" fillOpacity=".05" />
            </Box>
            <Wrap sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center', py: { xs: 5, md: 8 }, pb: { xs: 12, md: stats.length ? 14 : 11 }, textAlign: { xs: 'center', md: 'start' } }}>
              <Box sx={{ order: { xs: 2, md: 1 } }}>
                <Box component="span" sx={{ display: 'inline-block', px: 2, py: 0.3, mb: 1.75, borderRadius: 30, fontSize: 14, bgcolor: 'rgba(255,255,255,.14)', border: '1px solid rgba(246,213,148,.6)', color: '#fbe6b4', backdropFilter: 'blur(6px)', ...stagger(0.1) }}>أهلاً بك في</Box>
                <Typography component="h1" sx={{ fontSize: { xs: 40, md: 58 }, fontWeight: 800, lineHeight: 1.25, mb: 1.5, ...stagger(0.25) }}>
                  {UNIVERSITY.name}{' '}
                  <Box component="span" sx={{ background: 'linear-gradient(90deg,#fbe6b4,#d9a04a 60%,#f6d594)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{UNIVERSITY.suffix}</Box>
                </Typography>
                {s.tagline && <Typography sx={{ fontSize: { xs: 18, md: 21 }, color: '#e6eefb', mb: 1, fontWeight: 500, ...stagger(0.4) }}>{s.tagline}</Typography>}
                {s.heroText && <Typography sx={{ fontSize: 16, color: '#cfdcf0', maxWidth: 540, mb: 3.5, mx: { xs: 'auto', md: 0 }, ...stagger(0.45) }}>{s.heroText}</Typography>}
                {!s.heroText && <Box sx={{ mb: 3.5 }} />}
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  {hasAdmission ? <Box sx={stagger(0.55)}><GoldButton to="/admission" magnet>القبول والتسجيل</GoldButton></Box> : <Box sx={stagger(0.55)}><GoldButton to="/login" magnet>بوابة الطالب</GoldButton></Box>}
                  {hasAboutPage && <Box sx={stagger(0.65)}><GoldButton to="/about" outline magnet>تعرّف علينا</GoldButton></Box>}
                </Stack>
              </Box>
              <Box sx={{ order: { xs: 1, md: 2 }, justifySelf: 'center', position: 'relative', animation: `${cardIn} .9s ${T.ease} .3s both, ${floatT} 6s ease-in-out 1.2s infinite`, ...calm }}>
                <Box aria-hidden sx={{ position: 'absolute', inset: { xs: -14, md: -22 }, borderRadius: '44px', border: '3px dashed rgba(246,213,148,.85)', animation: `${spin} 40s linear infinite`, pointerEvents: 'none', ...calm }} />
                <Box data-tilt3d="" sx={{ bgcolor: '#fff', borderRadius: '32px', p: { xs: '16px 22px', md: '28px 34px' }, transition: 'transform .25s ease-out', boxShadow: '0 30px 60px rgba(0,0,0,.28), 0 0 0 6px rgba(246,213,148,.5)' }}>
                  <Box component="img" src="/logo-md.png" alt="شعار جامعة المعالي" sx={{ height: { xs: 150, md: 240 }, width: 'auto', display: 'block', mx: 'auto' }} />
                </Box>
              </Box>
            </Wrap>
          </Box>

          {stats.length > 0 && (
            <Wrap sx={{ mt: '-56px', position: 'relative', zIndex: 2, pb: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.75 }}>
                {stats.map((stat, i) => (
                  <Box key={stat.title} data-rv="zoom" sx={{ position: 'relative', bgcolor: '#fff', borderRadius: '22px', boxShadow: '0 12px 34px rgba(11,47,104,.15)', p: 2, textAlign: 'center', borderBottom: `4px solid ${T.gold}`, animation: `${bob} ${4.2 + (i % 3) * 0.8}s ease-in-out ${i * 0.4}s infinite`, '&::before': { content: '""', position: 'absolute', top: 0, insetInline: '30%', height: 3, borderRadius: '0 0 4px 4px', background: T.goldGrad }, ...calm }}>
                    <Typography sx={{ fontSize: 30, fontWeight: 800, background: T.navyGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{stat.extra ? <CountUp value={stat.extra} /> : null}</Typography>
                    <Typography sx={{ color: T.muted, fontSize: 14.5 }}>{stat.title}</Typography>
                  </Box>
                ))}
              </Box>
            </Wrap>
          )}

          {(s.aboutIntro || word) && (
            <Box component="section" id="about" sx={{ py: { xs: 5, md: 7 }, scrollMarginTop: '88px' }}>
              <Wrap>
                {s.aboutIntro && (
                  <Split image={s.aboutImageId ? <SplitImage mediaId={s.aboutImageId} /> : undefined}>
                    <Box data-rv="">
                      <Typography component="h2" data-rv-line="" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: T.navy, mb: 2.5, '&::after': { content: '""', display: 'block', width: 64, height: 5, borderRadius: 5, mt: 0.75, background: `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>نبذة عن الجامعة</Typography>
                      <Expandable><Typography sx={{ color: T.ink, fontSize: 17, whiteSpace: 'pre-line' }}>{s.aboutIntro}</Typography></Expandable>
                    </Box>
                  </Split>
                )}
                {word && (
                  <Split reverse image={s.presidentPhotoId ? <SplitImage portrait mediaId={s.presidentPhotoId} alt={s.presidentName ? `صورة ${s.presidentName}` : 'رئيس الجامعة'} /> : undefined}>
                    <Box data-rv="" sx={{ bgcolor: '#fff', borderRadius: '26px', p: { xs: 2.5, md: '26px 30px' }, boxShadow: '0 10px 30px rgba(18,72,154,.08)', border: '1px solid rgba(211,154,61,.3)', borderInlineStart: `5px solid ${T.gold}` }}>
                      <Typography component="h2" data-rv-line="" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: T.navy, mb: 2.5, '&::after': { content: '""', display: 'block', width: 64, height: 5, borderRadius: 5, mt: 0.75, background: `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>كلمة رئيس الجامعة</Typography>
                      <Expandable><Typography sx={{ fontSize: 17, whiteSpace: 'pre-line' }}>{word}</Typography></Expandable>
                      {s.presidentName && <Typography sx={{ mt: 1.5, fontWeight: 700, color: T.goldDark }}>— {s.presidentName}</Typography>}
                    </Box>
                  </Split>
                )}
                {hasAboutPage && <MoreRow><GhostLink to="/about">المزيد عن الجامعة ←</GhostLink></MoreRow>}
              </Wrap>
            </Box>
          )}

          {content && content.colleges.length > 0 && (
            <Block id="colleges" title="الكليات والاختصاصات" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.75 }}>
                {content.colleges.slice(0, 6).map((college) => <CollegeCard key={college.id} college={college} />)}
              </Box>
              {more('/colleges', 'عرض كل الكليات')}
            </Block>
          )}

          {events.length > 0 && (
            <Block id="events" title="الفعاليات القادمة" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.75 }}>
                {events.map((item) => <EventCard key={item.id} item={item} />)}
              </Box>
              {more('/events', 'كل الفعاليات والأرشيف')}
            </Block>
          )}

          {content && content.latestNews.length > 0 && (
            <Block id="news" title="الأخبار" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.75 }}>
                {content.latestNews.map((item) => <NewsCard key={item.id} item={item} />)}
              </Box>
              {more('/news', 'كل الأخبار')}
            </Block>
          )}

          {announcements.length > 0 && (
            <Block id="announcements" title="الإعلانات" centered>
              <Box sx={{ display: 'grid', gap: 1.5, maxWidth: 880, mx: 'auto' }}>
                {announcements.map((item) => <AnnouncementRow key={item.id} item={item} />)}
              </Box>
              {more('/news?type=ANNOUNCEMENT', 'كل الإعلانات')}
            </Block>
          )}

          {testimonials.length > 0 && (
            <Block id="testimonials" title="قالوا عن الجامعة" dark centered>
              <TestimonialSlider items={testimonials} />
            </Block>
          )}

          {/* ---------- دعوة (CTA) ---------- */}
          <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
            <Wrap>
              <Box data-rv="zoom" sx={{ position: 'relative', overflow: 'hidden', borderRadius: '32px', p: { xs: '28px 22px', md: '44px 40px' }, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, flexWrap: 'wrap', border: '2px solid rgba(246,213,148,.5)', outline: '2px dashed rgba(246,213,148,.7)', outlineOffset: -14, background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 12s ease infinite`, boxShadow: '0 24px 50px rgba(11,47,104,.3)', ...calm }}>
                <Box aria-hidden sx={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(246,213,148,.12)', top: -80, insetInlineStart: -40, animation: `${drift} 9s ease-in-out infinite`, ...calm }} />
                <Box aria-hidden sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(246,213,148,.12)', bottom: -50, insetInlineStart: '34%', animation: `${drift} 11s ease-in-out infinite`, animationDelay: '-3s', ...calm }} />
                <Box aria-hidden sx={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(246,213,148,.12)', top: 20, insetInlineEnd: '30%', animation: `${drift} 13s ease-in-out infinite`, animationDelay: '-6s', ...calm }} />
                <Box sx={{ position: 'relative', flex: '1 1 320px' }}>
                  <Box aria-hidden sx={{ display: 'inline-grid', placeItems: 'center', width: 54, height: 54, borderRadius: '16px', bgcolor: 'rgba(240,199,120,.22)', fontSize: 28, backdropFilter: 'blur(6px)', animation: `${wiggle} 3s ease-in-out infinite`, ...calm }}>🎓</Box>
                  <Typography component="h2" sx={{ fontSize: { xs: 26, md: 35 }, fontWeight: 800, my: 1, lineHeight: 1.3 }}>جاهز تبدأ رحلتك الجامعية؟</Typography>
                  <Typography sx={{ color: '#dbe8fb', fontSize: 17 }}>استكمل تسجيلك إلكترونياً أو تواصل معنا لأي استفسار.</Typography>
                </Box>
                <Box sx={{ position: 'relative' }}><GoldButton to={hasAdmission ? '/admission' : '/signup'} pulsing magnet>ابدأ الآن ←</GoldButton></Box>
              </Box>
            </Wrap>
          </Box>

          {quick.length > 0 && (
            <Block id="quick" title="روابط سريعة" centered>
              <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                {quick.map((link) => (
                  <Box key={link.title} data-rv="zoom">
                    {link.extra?.startsWith('/') ? <GhostLink to={link.extra}>{link.title}</GhostLink>
                      : <Button component="a" href={link.extra ?? '#'} target="_blank" rel="noopener noreferrer" sx={{ px: 3, py: 1.1, borderRadius: '14px', fontWeight: 700, bgcolor: '#fff', color: T.navy, border: '1px solid rgba(211,154,61,.55)', '&:hover': { bgcolor: '#fbefd6' } }}>{link.title}</Button>}
                  </Box>
                ))}
              </Stack>
            </Block>
          )}
        </PageTransition>
      </Box>

      <SiteFooter />
    </Box>
  );
}
