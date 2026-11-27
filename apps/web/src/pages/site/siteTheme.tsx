import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { Box, Button, IconButton, Link, Stack, Typography } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useSiteContent } from '../../api/site';
import { T, UNIVERSITY, calm, drift, goldCard, rise, shift, pulse, siteNav } from './siteStyles';

export function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ width: 'min(1120px, 100% - 32px)', mx: 'auto', ...sx }}>{children}</Box>;
}

export function Block({ id, title, children, dark }: { id?: string; title: string; children: ReactNode; dark?: boolean }) {
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

export function GoldButton({ to, href, children, outline, pulsing, onClick, type, disabled }: { to?: string; href?: string; children: ReactNode; outline?: boolean; pulsing?: boolean; onClick?: () => void; type?: 'submit' | 'button'; disabled?: boolean }) {
  const common = { px: 3.5, py: 1.4, borderRadius: '14px', fontWeight: 700, fontSize: 16, transition: '.2s', '&:hover': { transform: 'translateY(-2px)' } };
  const sx = outline
    ? { ...common, color: '#f6e2ae', border: '1px solid rgba(236,200,114,.8)', '&:hover': { ...common['&:hover'], bgcolor: 'rgba(236,200,114,.15)' } }
    : { ...common, background: T.goldGrad, color: T.ink, boxShadow: '0 10px 26px rgba(201,154,46,.45)', ...(pulsing ? { animation: `${pulse} 2.2s infinite` } : {}), '&:hover': { ...common['&:hover'], background: T.goldGrad, filter: 'brightness(1.05)' } };
  if (to) return <Button component={RouterLink} to={to} sx={{ ...sx, ...calm }}>{children}</Button>;
  if (href) return <Button component="a" href={href} sx={{ ...sx, ...calm }}>{children}</Button>;
  return <Button type={type ?? 'button'} onClick={onClick} disabled={disabled} sx={{ ...sx, ...calm }}>{children}</Button>;
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
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, pt: 1.5, pointerEvents: 'none' }}>
      <Wrap sx={{ pointerEvents: 'auto' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 64, px: 2, borderRadius: '20px', bgcolor: 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)', border: '1px solid rgba(201,154,46,.4)', boxShadow: '0 8px 30px rgba(3,61,101,.16)' }}>
          <Stack component={RouterLink} to="/" direction="row" spacing={1.2} sx={{ alignItems: 'center', textDecoration: 'none', color: T.navy }} aria-label={`${UNIVERSITY.name} ${UNIVERSITY.suffix}`}>
            <Box component="img" src="/logo-md.png" alt="" sx={{ height: 44, width: 'auto' }} />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 18 } }}>{UNIVERSITY.name} {UNIVERSITY.suffix}</Typography>
          </Stack>
          <Stack component="nav" aria-label="التنقل الرئيسي" direction="row" spacing={0.5} sx={{ ms: 'auto', display: { xs: 'none', md: 'flex' } }}>
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Box component="span" aria-current={isActive ? 'page' : undefined} sx={{ display: 'inline-block', px: 1.75, py: 0.9, borderRadius: '12px', fontSize: 15, fontWeight: 500, transition: '.2s', ...(isActive ? { background: T.navyGrad, color: T.goldText, boxShadow: `inset 0 -3px 0 ${T.gold}` } : { color: T.navy, '&:hover': { bgcolor: '#f3ead2' } }) }}>{item.label}</Box>
                )}
              </NavLink>
            ))}
          </Stack>
          <Button component={RouterLink} to="/login" sx={{ ms: { xs: 'auto', md: 1 }, borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap', background: T.goldGrad, color: T.ink, px: 2.25, '&:hover': { background: T.goldGrad, filter: 'brightness(1.05)' } }}>دخول الطلاب</Button>
          <Button aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minWidth: 44, color: T.navy, fontSize: 22 }}>{open ? '✕' : '☰'}</Button>
        </Stack>
        {open && (
          <Stack component="nav" aria-label="التنقل (جوال)" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' }, mt: 1, p: 1.5, borderRadius: '20px', bgcolor: 'rgba(255,255,255,.96)', border: '1px solid rgba(201,154,46,.4)', boxShadow: '0 8px 30px rgba(3,61,101,.16)' }}>
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

export function SiteFooter() {
  const { content } = useSiteContent();
  const s = content?.settings ?? {};
  const lines = [s.contactAddress && `العنوان: ${s.contactAddress}`, s.contactPhone && `الهاتف: ${s.contactPhone}`, s.contactEmail && `البريد: ${s.contactEmail}`, s.contactHours && `ساعات الدوام: ${s.contactHours}`].filter(Boolean) as string[];
  return (
    <Box component="footer" id="contact" sx={{ borderTop: `4px solid ${T.gold}`, background: T.navyGrad, color: '#dbe8fb', py: 5, scrollMarginTop: '88px', mt: 'auto' }}>
      <Wrap>
        <Stack spacing={1.25}>
          <Box component="img" src="/logo-md.png" alt="" sx={{ height: 64, width: 64, objectFit: 'contain', bgcolor: '#fff', borderRadius: '12px', p: 0.5, boxShadow: '0 0 0 3px rgba(236,200,114,.5)' }} />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{UNIVERSITY.name} {UNIVERSITY.suffix}</Typography>
          {lines.map((line) => <Typography key={line} sx={{ fontSize: 15 }}>{line}</Typography>)}
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

// إطار الصفحات الداخلية: هيدر زجاجي + بانر كحلي بعنوان الصفحة + المحتوى + فوتر. المحتوى يملأ الارتفاع حتى لو قصر.
export function SitePage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    document.title = `${title} | ${UNIVERSITY.name}`;
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.scrollTo(0, 0);
    return () => window.removeEventListener('scroll', onScroll);
  }, [title]);
  return (
    <Box sx={{ bgcolor: T.cream, color: T.ink, direction: 'rtl', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <Box sx={{ mt: '-76px', pt: '76px', position: 'relative', overflow: 'hidden', borderRadius: '0 0 44px 44px', color: '#fff', background: `linear-gradient(135deg,${T.navyDark},${T.navy} 60%,${T.blue})` }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1.6px, transparent 1.7px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
          <Box aria-hidden sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,200,114,.3), transparent 70%)', top: -140, insetInlineStart: -80, animation: `${drift} 11s ease-in-out infinite`, pointerEvents: 'none', ...calm }} />
          <Wrap sx={{ position: 'relative', py: { xs: 5, md: 7 }, pb: { xs: 7, md: 9 }, '& > *': { animation: `${rise} .7s cubic-bezier(.2,.7,.2,1) both`, ...calm } }}>
            <Typography component="h1" sx={{ fontSize: { xs: 34, md: 46 }, fontWeight: 800 }}>{title}</Typography>
            {subtitle && <Typography sx={{ mt: 1, fontSize: { xs: 16, md: 19 }, color: '#d7e4f7', maxWidth: 720 }}>{subtitle}</Typography>}
          </Wrap>
        </Box>
        {children}
      </Box>
      <SiteFooter />
      {showTop && (
        <IconButton aria-label="إلى أعلى الصفحة" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 30, background: T.navyGrad, color: T.goldText, border: `2px solid ${T.gold}`, '&:hover': { bgcolor: T.gold, background: T.gold, color: T.ink } }}>
          <ArrowUpwardRoundedIcon />
        </IconButton>
      )}
    </Box>
  );
}

// حالة عدم وجود محتوى لصفحة مفتوحة مباشرة (قسم بلا بيانات): رسالة هادئة بدل صفحة فارغة.
export function EmptyNote({ children }: { children: ReactNode }) {
  return <Wrap sx={{ py: 8 }}><Box sx={{ ...goldCard, p: 4, textAlign: 'center', color: T.muted, '&:hover': { transform: 'none' } }}>{children}</Box></Wrap>;
}
