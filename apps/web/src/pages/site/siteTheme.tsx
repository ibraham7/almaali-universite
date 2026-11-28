import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, NavLink, useLocation } from 'react-router-dom';
import { Box, Button, Link, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useSiteContent } from '../../api/site';
import { PageTransition, SiteChrome, SiteFx } from './siteFx';
import { T, UNIVERSITY, calm, drift, goldCard, pulse, rise, shift, siteNav } from './siteStyles';

export function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ width: 'min(1120px, 100% - 32px)', mx: 'auto', ...sx }}>{children}</Box>;
}

// عنوان قسم: بالصفحة الرئيسية بين خطّين ذهبيين (— العنوان —)، وبالصفحات الداخلية خط ذهبي ينمو تحته.
export function SectionTitle({ children, dark, centered }: { children: ReactNode; dark?: boolean; centered?: boolean }) {
  const line = { content: '""', height: 3, borderRadius: 3, flex: 1, background: dark ? T.goldGrad : `linear-gradient(90deg,transparent,${T.gold})` };
  if (centered) {
    return (
      <Box component="h2" data-rv="" sx={{ display: 'flex', alignItems: 'center', gap: 2, m: 0, mb: 4, fontSize: { xs: 26, md: 34 }, fontWeight: 800, color: dark ? '#fff' : T.navy, '&::before': line, '&::after': { ...line, background: dark ? T.goldGrad : `linear-gradient(270deg,transparent,${T.gold})` } }}>{children}</Box>
    );
  }
  return (
    <Typography component="h2" data-rv-line="" data-rv="" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: dark ? '#fff' : T.navy, mb: 3, '&::after': { content: '""', display: 'block', width: 70, height: 4, borderRadius: 4, mt: 0.75, background: dark ? T.goldGrad : `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>{children}</Typography>
  );
}

export function Block({ id, title, children, dark, centered }: { id?: string; title: string; children: ReactNode; dark?: boolean; centered?: boolean }) {
  return (
    <Box
      component="section" id={id}
      sx={{
        py: { xs: 5, md: 7 }, scrollMarginTop: '88px', position: 'relative', overflow: 'hidden',
        ...(dark
          ? { background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 14s ease infinite`, color: '#fff', borderRadius: { xs: '28px', md: '44px' }, mx: { xs: 1, md: 2 }, border: '2px solid rgba(246,213,148,.45)' }
          : { '&:nth-of-type(even)': { background: `linear-gradient(180deg,${T.cream2},${T.cream})` } }),
        ...calm,
      }}
    >
      {dark && <Box aria-hidden sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(246,213,148,.10)', top: -110, insetInlineStart: -70, animation: `${drift} 10s ease-in-out infinite`, pointerEvents: 'none', ...calm }} />}
      <Wrap sx={{ position: 'relative' }}>
        <SectionTitle dark={dark} centered={centered}>{title}</SectionTitle>
        {children}
      </Wrap>
    </Box>
  );
}

export function GoldButton({ to, href, children, outline, pulsing, onClick, type, disabled, magnet }: { to?: string; href?: string; children: ReactNode; outline?: boolean; pulsing?: boolean; onClick?: () => void; type?: 'submit' | 'button'; disabled?: boolean; magnet?: boolean }) {
  const common = { px: 3.5, py: 1.4, borderRadius: '14px', fontWeight: 700, fontSize: 16, transition: 'background-color .2s, box-shadow .2s, filter .2s, transform .15s ease-out' };
  const sx = outline
    ? { ...common, color: '#fbe6b4', border: '1px solid rgba(246,213,148,.85)', '&:hover': { bgcolor: 'rgba(246,213,148,.16)' } }
    : { ...common, background: T.goldGrad, color: T.ink, boxShadow: '0 10px 26px rgba(211,154,61,.45)', ...(pulsing ? { animation: `${pulse} 2.2s infinite` } : {}), '&:hover': { background: T.goldGrad, filter: 'brightness(1.06)' } };
  const extra = magnet ? { 'data-magnet': '' } : {};
  if (to) return <Button component={RouterLink} to={to} sx={{ ...sx, ...calm }} {...extra}>{children}</Button>;
  if (href) return <Button component="a" href={href} sx={{ ...sx, ...calm }} {...extra}>{children}</Button>;
  return <Button type={type ?? 'button'} onClick={onClick} disabled={disabled} sx={{ ...sx, ...calm }} {...extra}>{children}</Button>;
}

// النصوص الطويلة من لوحة الموقع: فقرات بسيطة (سطر فارغ = فقرة جديدة) بدون أي HTML، فلا مجال لحقن شيفرة.
export function Prose({ text, light }: { text: string; light?: boolean }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <Stack spacing={1.5}>
      {blocks.map((block, index) => <Typography key={index} sx={{ lineHeight: 2, fontSize: 17, color: light ? '#e6eefb' : T.ink, whiteSpace: 'pre-line' }}>{block}</Typography>)}
    </Stack>
  );
}

export function SiteHeader() {
  const { content } = useSiteContent();
  const nav = siteNav(content);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const { pathname } = useLocation();
  // الصفحات الأساسية في الشريط، والإضافية (بحث، خريجون، مرافق، آراء) تحت «المزيد» حتى لا ينكسر الهيدر.
  const primary = nav.filter((item) => !item.secondary);
  const more = nav.filter((item) => item.secondary);
  const moreActive = more.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, pt: 1.5, pointerEvents: 'none' }}>
      <Wrap sx={{ pointerEvents: 'auto' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: scrolled ? { xs: 56, md: 66 } : { xs: 64, md: 84 }, px: 2, borderRadius: '20px', bgcolor: scrolled ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)', border: '1px solid rgba(211,154,61,.45)', boxShadow: scrolled ? '0 12px 34px rgba(11,47,104,.24)' : '0 8px 30px rgba(11,47,104,.14)', transition: `min-height .3s ${T.ease}, box-shadow .3s, background-color .3s`, ...calm }}>
          <Stack component={RouterLink} to="/" direction="row" spacing={1.2} sx={{ alignItems: 'center', textDecoration: 'none', color: T.navy }} aria-label={`${UNIVERSITY.name} ${UNIVERSITY.suffix}`}>
            <Box component="img" src="/logo-md.png" alt="" sx={{ height: scrolled ? { xs: 40, md: 52 } : { xs: 48, md: 68 }, width: 'auto', transition: 'height .3s' }} />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 18 }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, lineHeight: 1.25 }}>{UNIVERSITY.name} {UNIVERSITY.suffix}</Typography>
          </Stack>
          <Stack component="nav" aria-label="التنقل الرئيسي" direction="row" spacing={0.5} sx={{ flex: 1, justifyContent: 'flex-end', display: { xs: 'none', md: 'flex' } }}>
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Box component="span" aria-current={isActive ? 'page' : undefined} sx={{ position: 'relative', display: 'inline-block', px: 1.5, py: 0.9, borderRadius: '12px', fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', transition: 'background-color .2s, color .2s', ...(isActive ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, '&::after': { content: '""', position: 'absolute', insetInline: 14, bottom: 3, height: 2, borderRadius: 2, background: T.gold, transform: 'scaleX(0)', transition: `transform .25s ${T.ease}` }, '&:hover': { bgcolor: '#f6efdb' }, '&:hover::after': { transform: 'scaleX(1)' } }) }}>{item.label}</Box>
                )}
              </NavLink>
            ))}
            {more.length > 0 && (
              <>
                <Button aria-haspopup="menu" aria-expanded={Boolean(moreAnchor)} onClick={(event) => setMoreAnchor(event.currentTarget)} sx={{ px: 1.5, py: 0.9, minWidth: 0, borderRadius: '12px', fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', ...(moreActive ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, '&:hover': { bgcolor: '#f6efdb' } }) }}>المزيد ▾</Button>
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.gold}`, mt: 1, minWidth: 190 } } }}>
                  {more.map((item) => <MenuItem key={item.to} component={RouterLink} to={item.to} onClick={() => setMoreAnchor(null)} sx={{ fontWeight: 600, color: T.navy }}>{item.label}</MenuItem>)}
                </Menu>
              </>
            )}
          </Stack>
          <Box aria-hidden sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />
          <Button component={RouterLink} to="/login" sx={{ flex: 'none', marginInlineStart: { md: 1 }, borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap', background: T.goldGrad, color: T.ink, px: 2.25, '&:hover': { background: T.goldGrad, filter: 'brightness(1.05)' } }}>دخول الطلاب</Button>
          <Button aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minWidth: 44, color: T.navy, fontSize: 22 }}>{open ? '✕' : '☰'}</Button>
        </Stack>
        {open && (
          <Stack component="nav" aria-label="التنقل (جوال)" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' }, mt: 1, p: 1.5, borderRadius: '20px', bgcolor: 'rgba(255,255,255,.97)', border: '1px solid rgba(211,154,61,.45)', boxShadow: '0 8px 30px rgba(11,47,104,.16)' }}>
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                {({ isActive }) => <Box component="span" sx={{ display: 'block', px: 2, py: 1.1, borderRadius: '12px', fontWeight: 600, ...(isActive ? { background: T.navyGrad, color: T.goldText } : { color: T.navy }) }}>{item.label}</Box>}
              </NavLink>
            ))}
          </Stack>
        )}
      </Wrap>
    </Box>
  );
}

const SOCIAL: Array<[string, string]> = [['socialFacebook', 'فيسبوك'], ['socialInstagram', 'إنستغرام'], ['socialYoutube', 'يوتيوب'], ['socialTelegram', 'تلغرام'], ['socialX', 'إكس'], ['socialLinkedin', 'لينكدإن']];

// حسابات التواصل الاجتماعي: تظهر فقط ما أُدخل منها (روابط https).
export function SocialLinks({ settings, dark }: { settings: Record<string, string>; dark?: boolean }) {
  const links = SOCIAL.filter(([key]) => /^https:\/\//i.test(settings[key] ?? ''));
  if (links.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} aria-label="حسابات التواصل الاجتماعي">
      {links.map(([key, label]) => (
        <Link key={key} href={settings[key]} target="_blank" rel="noopener noreferrer" underline="none" sx={{ px: 1.75, py: 0.6, borderRadius: '999px', fontSize: 14, fontWeight: 700, border: `1px solid ${dark ? 'rgba(246,213,148,.6)' : T.gold}`, color: dark ? T.goldText : T.navy, transition: 'background-color .2s', '&:hover': { bgcolor: dark ? 'rgba(246,213,148,.15)' : '#f6efdb' } }}>{label}</Link>
      ))}
    </Stack>
  );
}

export function SiteFooter() {
  const { content } = useSiteContent();
  const s = content?.settings ?? {};
  const lines = [s.contactAddress && `العنوان: ${s.contactAddress}`, s.contactPhone && `الهاتف: ${s.contactPhone}`, s.contactEmail && `البريد: ${s.contactEmail}`, s.contactHours && `ساعات الدوام: ${s.contactHours}`].filter(Boolean) as string[];
  return (
    <Box component="footer" id="contact" sx={{ borderTop: `4px solid ${T.gold}`, borderRadius: '36px 36px 0 0', background: T.navyGrad, color: '#dbe8fb', py: 5, scrollMarginTop: '88px', mt: 'auto' }}>
      <Wrap>
        <Stack spacing={1.25}>
          <Box component="img" src="/logo-md.png" alt="" sx={{ height: 64, width: 64, objectFit: 'contain', bgcolor: '#fff', borderRadius: '12px', p: 0.5, boxShadow: '0 0 0 3px rgba(246,213,148,.5)', transition: `transform .3s ${T.ease}`, '&:hover': { transform: 'rotate(-4deg) scale(1.08)' }, ...calm }} />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{UNIVERSITY.name} {UNIVERSITY.suffix}</Typography>
          {lines.map((line) => <Typography key={line} sx={{ fontSize: 15 }}>{line}</Typography>)}
          <SocialLinks settings={s} dark />
          <Stack direction="row" spacing={2.5} useFlexGap sx={{ flexWrap: 'wrap', pt: 1 }}>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: T.goldText }}>دخول الطلاب</Link>
            <Link component={RouterLink} to="/signup" underline="hover" sx={{ color: T.goldText }}>إنشاء حساب</Link>
            <Link component={RouterLink} to="/verify" underline="hover" sx={{ color: T.goldText }}>التحقق من وثيقة</Link>
            <Link component={RouterLink} to="/contact" underline="hover" sx={{ color: T.goldText }}>اتصل بنا</Link>
          </Stack>
          <Typography sx={{ fontSize: 13, color: '#9fb4d0', borderTop: '1px solid rgba(255,255,255,.14)', pt: 1.5, mt: 1 }}>© {UNIVERSITY.name} {UNIVERSITY.suffix}</Typography>
        </Stack>
      </Wrap>
    </Box>
  );
}

// إطار الصفحات الداخلية: هيدر زجاجي + بانر كحلي متدرج متحرك بعنوان بتدرّج أبيض إلى ذهبي وخط ذهبي + المحتوى + فوتر.
export function SitePage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} | ${UNIVERSITY.name}`; }, [title]);
  return (
    <Box sx={{ bgcolor: T.cream, color: T.ink, direction: 'rtl', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteFx />
      <SiteChrome />
      <SiteHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <PageTransition>
          <Box sx={{ mt: '-76px', pt: '76px', position: 'relative', overflow: 'hidden', borderRadius: '0 0 44px 44px', color: '#fff', background: `linear-gradient(120deg,${T.navyDark},${T.navy},${T.blue},${T.navy},${T.navyDark})`, backgroundSize: '300% 100%', animation: `${shift} 16s ease infinite`, ...calm }}>
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1.6px, transparent 1.7px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
            <Box aria-hidden sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(246,213,148,.3), transparent 70%)', top: -140, insetInlineStart: -80, animation: `${drift} 11s ease-in-out infinite`, pointerEvents: 'none', ...calm }} />
            <Wrap sx={{ position: 'relative', py: { xs: 5, md: 7 }, pb: { xs: 7, md: 9 }, '& > *': { animation: `${rise} .7s ${T.ease} both`, ...calm } }}>
              <Typography component="h1" sx={{ fontSize: { xs: 34, md: 46 }, fontWeight: 800, background: 'linear-gradient(90deg,#fff 30%,#f8d99a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', pb: 0.5, '&::after': { content: '""', display: 'block', width: 90, height: 4, borderRadius: 4, mt: 1, background: T.goldGrad } }}>{title}</Typography>
              {subtitle && <Typography sx={{ mt: 1.5, fontSize: { xs: 16, md: 19 }, color: '#d7e4f7', maxWidth: 720, animationDelay: '.12s' }}>{subtitle}</Typography>}
            </Wrap>
          </Box>
          {children}
        </PageTransition>
      </Box>
      <SiteFooter />
    </Box>
  );
}

// حالة عدم وجود محتوى لصفحة مفتوحة مباشرة (قسم بلا بيانات): رسالة هادئة بدل صفحة فارغة.
export function EmptyNote({ children }: { children: ReactNode }) {
  return <Wrap sx={{ py: 8 }}><Box sx={{ ...goldCard, p: 4, textAlign: 'center', color: T.muted, '&:hover': { transform: 'none' } }}>{children}</Box></Wrap>;
}
