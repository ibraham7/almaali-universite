import { useEffect } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useAuth } from '../../auth/AuthContext';
import { siteMediaUrl, useSiteContent, type SiteNewsCard } from '../../api/site';
import { Block, GoldButton, SiteFooter, SiteHeader, Wrap } from '../site/siteTheme';
import { CountUp, Expandable, PageTransition, SiteChrome, SiteFx, TestimonialSlider } from '../site/siteFx';
import { T, UNIVERSITY, bob, calm, cardIn, drift, floatT, goldCard, rise, shift, siteNav, spin, wiggle } from '../site/siteStyles';
import { NewsCard } from '../site/NewsPages';

const more = (to: string, label: string) => <Button component={RouterLink} to={to} data-rv="" sx={{ mt: 3, fontWeight: 700, color: T.goldDark }}>{label} ←</Button>;
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
      sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.75, borderRadius: '18px', bgcolor: '#fff', textDecoration: 'none', color: T.ink, border: '1px solid rgba(211,154,61,.28)', borderInlineStart: `5px solid ${T.navy}`, boxShadow: T.shadow, transition: 'transform .25s ease-out, border-color .25s, box-shadow .25s', '&:hover': { transform: 'translateX(6px)', borderInlineStartColor: T.gold, boxShadow: '0 12px 30px rgba(11,47,104,.16)' }, '&:hover .arrow': { transform: 'translateX(-4px)' }, ...calm }}
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
  const pillars = [
    s.vision && { title: 'الرؤية', text: s.vision, Icon: VisibilityRoundedIcon },
    s.mission && { title: 'الرسالة', text: s.mission, Icon: FlagRoundedIcon },
  ].filter(Boolean) as Array<{ title: string; text: string; Icon: typeof FlagRoundedIcon }>;
  const hasAbout = Boolean(s.aboutIntro || pillars.length);
  const word = (s.presidentWord ?? '').trim();
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
                  <Box sx={stagger(0.55)}><GoldButton to="/login" magnet>بوابة الطالب</GoldButton></Box>
                  {hasAdmission && <Box sx={stagger(0.65)}><GoldButton to="/admission" outline magnet>القبول والتسجيل</GoldButton></Box>}
                  {hasAboutPage && <Box sx={stagger(0.75)}><GoldButton to="/about" outline magnet>تعرّف علينا</GoldButton></Box>}
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

          {hasAbout && (
            <Block id="about" title="نبذة عن الجامعة" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: s.aboutImageId ? '1fr 1.4fr' : '1fr' }, gap: { xs: 2.5, md: 4 }, alignItems: 'center' }}>
                {s.aboutImageId && <Box component="img" data-rv="zoom" src={siteMediaUrl(s.aboutImageId)} alt="" loading="lazy" sx={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: '22px', border: '1px solid rgba(211,154,61,.35)', boxShadow: T.shadow }} />}
                <Box data-rv="">
                  {s.aboutIntro && <Expandable><Typography sx={{ color: T.muted, fontSize: 17, whiteSpace: 'pre-line' }}>{s.aboutIntro}</Typography></Expandable>}
                  {hasAboutPage && more('/about', 'المزيد عن الجامعة')}
                </Box>
              </Box>
              {pillars.length > 0 && (
                <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 2.25 }}>
                  {pillars.map(({ title, text, Icon }) => (
                    <Box key={title} data-rv="" data-tilt="" sx={{ ...goldCard, p: 3, borderTop: `4px solid ${T.gold}`, '&:hover .icon': { transform: 'rotate(-8deg) scale(1.1)', background: T.navyGrad, color: T.goldText } }}>
                      <Box className="icon" sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', mb: 1.5, background: 'linear-gradient(135deg,#fbf2d9,#f6d594)', color: T.goldDark, transition: 'transform .3s, background .3s, color .3s' }}><Icon /></Box>
                      <Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, color: T.navy, mb: 0.5 }}>{title}</Typography>
                      <Typography sx={{ color: T.muted, fontSize: 15.5, whiteSpace: 'pre-line' }}>{text}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Block>
          )}

          {word && (
            <Block id="president" title="كلمة رئيس الجامعة" centered>
              <Box data-rv="" sx={{ bgcolor: '#fff', borderRadius: '22px', p: { xs: 3, md: 4 }, boxShadow: T.shadow, border: '1px solid rgba(211,154,61,.28)', borderInlineStart: `5px solid ${T.gold}`, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-start' } }}>
                {s.presidentPhotoId && <Box component="img" src={siteMediaUrl(s.presidentPhotoId)} alt={s.presidentName ? `صورة ${s.presidentName}` : 'رئيس الجامعة'} loading="lazy" sx={{ width: { xs: 150, md: 190 }, height: { xs: 150, md: 190 }, objectFit: 'cover', borderRadius: '22px', border: `3px solid ${T.gold}`, alignSelf: { xs: 'center', md: 'flex-start' }, flex: 'none' }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Expandable><Typography sx={{ fontSize: 18, whiteSpace: 'pre-line' }}>{word}</Typography></Expandable>
                  {s.presidentName && <Typography sx={{ mt: 2, fontWeight: 700, color: T.goldDark }}>{s.presidentName}</Typography>}
                </Box>
              </Box>
            </Block>
          )}

          {content && content.colleges.length > 0 && (
            <Block id="colleges" title="الكليات والاختصاصات" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fill, minmax(250px, 1fr))' }, gap: 2.25 }}>
                {content.colleges.map((college) => (
                  <Box key={college.nameAr} data-rv="" data-tilt="" sx={{ ...goldCard, overflow: 'hidden', borderTop: `4px solid ${T.gold}`, '&:hover img': { transform: 'scale(1.05)' } }}>
                    {college.mediaId && <Box sx={{ overflow: 'hidden', height: 130 }}><Box component="img" src={siteMediaUrl(college.mediaId)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .5s' }} /></Box>}
                    <Box sx={{ p: 2.75 }}>
                      <Typography component="h3" sx={{ fontSize: 18.5, fontWeight: 700, color: T.navy, mb: 0.5 }}>{college.nameAr}</Typography>
                      {college.summary && <Typography sx={{ color: T.muted, fontSize: 15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{college.summary}</Typography>}
                      <Button component={RouterLink} to="/colleges" sx={{ px: 0, mt: 1, fontWeight: 700, color: T.goldDark }}>عرض التخصصات ←</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
              {more('/colleges', 'عرض كل الكليات')}
            </Block>
          )}

          {content && content.latestNews.length > 0 && (
            <Block id="news" title="الأخبار" centered>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2.25 }}>
                {content.latestNews.map((item) => <NewsCard key={item.id} item={item} />)}
              </Box>
              {more('/news', 'كل الأخبار')}
            </Block>
          )}

          {announcements.length > 0 && (
            <Block id="announcements" title="الإعلانات" centered>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {announcements.map((item) => <AnnouncementRow key={item.id} item={item} />)}
              </Box>
              {more('/news?type=ANNOUNCEMENT', 'كل الإعلانات')}
            </Block>
          )}

          {content && content.admissionSteps.length > 0 && (
            <Block id="admission" title="القبول والتسجيل" centered>
              {s.admissionIntro && <Typography data-rv="" sx={{ color: T.muted, mb: 3, fontSize: 17 }}>{s.admissionIntro}</Typography>}
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(210px, 1fr))' }, gap: 2.25 }}>
                {content.admissionSteps.map((step, i) => (
                  <Box component="li" key={step.title} data-rv="" data-tilt="" sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25, fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{i + 1}</Box>
                    <Typography component="h3" sx={{ fontSize: 17.5, fontWeight: 700, color: T.navy }}>{step.title}</Typography>
                    {step.text && <Typography sx={{ fontSize: 14.5, color: T.muted }}>{step.text}</Typography>}
                  </Box>
                ))}
              </Box>
              {more('/admission', 'شروط القبول والوثائق والمواعيد')}
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
              <Box data-rv="zoom" sx={{ position: 'relative', overflow: 'hidden', borderRadius: '32px', p: { xs: 3.5, md: 6 }, color: '#fff', textAlign: 'center', border: '2px solid rgba(246,213,148,.55)', outline: '2px dotted rgba(246,213,148,.6)', outlineOffset: -14, background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 12s ease infinite`, boxShadow: '0 24px 50px rgba(11,47,104,.3)', ...calm }}>
                <Box aria-hidden sx={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(246,213,148,.12)', top: -80, insetInlineStart: -40, animation: `${drift} 9s ease-in-out infinite`, ...calm }} />
                <Box aria-hidden sx={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(95,149,232,.2)', bottom: -60, insetInlineEnd: -20, animation: `${drift} 11s ease-in-out infinite`, animationDelay: '-3s', ...calm }} />
                <Box sx={{ position: 'relative' }}>
                  <Box aria-hidden sx={{ fontSize: 48, display: 'inline-block', animation: `${wiggle} 3s ease-in-out infinite`, ...calm }}>🎓</Box>
                  <Typography component="h2" sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 800, my: 1 }}>جاهز تبدأ رحلتك الجامعية؟</Typography>
                  <Typography sx={{ color: '#dbe8fb', fontSize: 17, mb: 3 }}>أنشئ حسابك وادخل بالرقم الجامعي لتسجيل المقررات ومتابعة وضعك الأكاديمي.</Typography>
                  <GoldButton to="/signup" pulsing magnet>ابدأ الآن ←</GoldButton>
                </Box>
              </Box>
            </Wrap>
          </Box>

          {/* ---------- بوابة الطالب وروابط سريعة ---------- */}
          <Box component="section" sx={{ pb: { xs: 5, md: 7 } }}>
            <Wrap>
              <Box data-rv="" sx={{ position: 'relative', overflow: 'hidden', borderRadius: '32px', p: { xs: 3, md: 4.5 }, color: '#fff', border: '2px solid rgba(246,213,148,.5)', background: T.navyGrad, boxShadow: '0 18px 40px rgba(11,47,104,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 320px' }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, mb: 0.75 }}>بوابة الطالب</Typography>
                  <Typography sx={{ color: '#dbe8fb', fontSize: 16 }}>ادخل بالرقم الجامعي لتسجيل المقررات ومتابعة حالتك الأكاديمية وتقديم الطلبات ومتابعتها أولاً بأول.</Typography>
                </Box>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <GoldButton to="/login">تسجيل الدخول</GoldButton>
                  <GoldButton to="/signup" outline>إنشاء حساب</GoldButton>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 3 }}>
                {[['التحقق من وثيقة', '/verify'], ['تسجيل الدخول', '/login'], ['إنشاء حساب', '/signup']].map(([label, to]) => (
                  <Button key={to} component={RouterLink} to={to} data-rv="zoom" sx={{ borderRadius: '12px', px: 2.5, bgcolor: '#fff', color: T.navy, fontWeight: 600, border: `1px solid ${T.gold}`, transition: 'background-color .2s, color .2s', '&:hover': { bgcolor: T.navy, color: T.goldText } }}>{label}</Button>
                ))}
              </Stack>
            </Wrap>
          </Box>
        </PageTransition>
      </Box>

      <SiteFooter />
    </Box>
  );
}
