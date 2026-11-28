import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Typography } from '@mui/material';
import { siteMediaUrl } from '../../api/site';
import { T, calm, goldCard } from './siteStyles';


// زر أزرق متدرج بنص ذهبي (زر الموقع الأساسي). to داخلي أو href خارجي.
export function BlueButton({ to, children, small }: { to: string; children: ReactNode; small?: boolean }) {
  return (
    <Button
      component={RouterLink} to={to}
      sx={{ px: small ? 2.25 : 3.25, py: small ? 0.8 : 1.2, borderRadius: '14px', fontWeight: 700, fontSize: small ? 14.5 : 16, background: T.navyGrad, color: T.goldText, boxShadow: '0 6px 16px rgba(18,72,154,.25)', transition: 'transform .2s, box-shadow .2s, filter .2s', '&:hover': { background: T.navyGrad, transform: 'translateY(-2px)', boxShadow: '0 10px 22px rgba(18,72,154,.32)' }, ...calm }}
    >{children}</Button>
  );
}

// زر أبيض بحدّ ذهبي (روابط ثانوية)
export function GhostLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button component={RouterLink} to={to} sx={{ px: 3, py: 1.1, borderRadius: '14px', fontWeight: 700, bgcolor: '#fff', color: T.navy, border: '1px solid rgba(211,154,61,.55)', transition: 'background-color .2s, transform .2s', '&:hover': { bgcolor: '#fbefd6', transform: 'translateY(-2px)' }, ...calm }}>{children}</Button>
  );
}

export function MoreRow({ children }: { children: ReactNode }) {
  return <Box data-rv="" sx={{ textAlign: 'center', mt: 3.25 }}>{children}</Box>;
}

// غلاف بطاقة: صورة أو بديل متدرج (دوائر شفافة وشعار باهت) حين لا توجد صورة.
export function Cover({ mediaId, height, ratio, label }: { mediaId?: string | null; height?: number; ratio?: string; label?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const box = { width: '100%', height: height ?? '100%', aspectRatio: ratio, display: 'block', objectFit: 'cover' as const };
  // صورة مؤرشفة أو غير موجودة: نعرض البديل المتدرج بدل صندوق فارغ
  if (mediaId && failed !== mediaId) return <Box component="img" src={siteMediaUrl(mediaId)} alt="" loading="lazy" onError={() => setFailed(mediaId)} sx={{ ...box, transition: 'transform .5s' }} />;
  return (
    <Box aria-hidden sx={{ ...box, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0b2f68,#2c5aa7 60%,#6f98d6)' }}>
      <Box sx={{ position: 'absolute', width: '42%', aspectRatio: '1', borderRadius: '50%', bgcolor: 'rgba(255,255,255,.1)', top: '-12%', insetInlineStart: '58%' }} />
      <Box sx={{ position: 'absolute', width: '55%', aspectRatio: '1', borderRadius: '50%', bgcolor: 'rgba(255,255,255,.12)', bottom: '-30%', insetInlineStart: '-8%' }} />
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {label ? <Typography sx={{ color: 'rgba(255,255,255,.92)', fontWeight: 800, fontSize: 22, px: 2, textAlign: 'center' }}>{label}</Typography>
          : <Box component="img" src="/logo-md.png" alt="" sx={{ height: '46%', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.28 }} />}
      </Box>
    </Box>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <Chip size="small" label={children} sx={{ bgcolor: '#fbefd6', color: '#7d521a', fontWeight: 600, borderRadius: '30px', height: 24 }} />;
}

// أيقونة مربعة (إيموجي) مثل الرؤية والرسالة والأهداف
export function IconTile({ children }: { children: ReactNode }) {
  return <Box className="gi" aria-hidden sx={{ display: 'grid', placeItems: 'center', width: 58, height: 58, borderRadius: '18px', fontSize: 28, background: 'linear-gradient(135deg,#fdf3df,#f5d79a)', transition: 'transform .4s, background .4s' }}>{children}</Box>;
}

// بطاقة (رؤية/رسالة/هدف): أيقونة وعنوان ونص، بحدّ علوي ذهبي
export function InfoCard({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <Box data-rv="" data-tilt="" sx={{ ...goldCard, p: 3.25, borderTop: `4px solid ${T.gold}`, '&:hover .gi': { background: T.navyGrad, transform: 'rotate(-8deg) scale(1.1)' } }}>
      <IconTile>{icon}</IconTile>
      <Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, color: T.navy, mt: 1.5, mb: 0.5 }}>{title}</Typography>
      {text && <Typography sx={{ color: T.muted, fontSize: 15.5, whiteSpace: 'pre-line' }}>{text}</Typography>}
    </Box>
  );
}

// صورة جانبية مؤطّرة (نبذة/رئيس/كلية)
export function SplitImage({ mediaId, portrait, alt }: { mediaId: string; portrait?: boolean; alt?: string }) {
  return (
    <Box data-rv="zoom" sx={{ '&:hover img': { transform: 'scale(1.03) rotate(-1deg)' } }}>
      <Box component="img" src={siteMediaUrl(mediaId)} alt={alt ?? ''} loading="lazy" sx={{ width: '100%', display: 'block', borderRadius: '28px', border: '3px solid #fff', boxShadow: '0 20px 44px rgba(18,72,154,.22), 0 0 0 3px rgba(211,154,61,.5)', aspectRatio: portrait ? '4 / 5' : '4 / 3', maxWidth: portrait ? 340 : undefined, mx: 'auto', objectFit: 'cover', transition: 'transform .5s' }} />
    </Box>
  );
}

// قسم نص وصورة: الصورة في العمود الأول (يمين في RTL)، أو معكوسة للكلمة.
export function Split({ image, children, reverse }: { image?: ReactNode; children: ReactNode; reverse?: boolean }) {
  return (
    <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 4.5 }, alignItems: 'center', mb: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: !image ? '1fr' : reverse ? '1.2fr minmax(200px,.6fr)' : 'minmax(240px,.8fr) 1.2fr' }, '& > .img': { order: { xs: 0, md: reverse ? 2 : 0 } } }}>
      {image && <Box className="img">{image}</Box>}
      <Box>{children}</Box>
    </Box>
  );
}

const shortDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

// بطاقة فعالية بصورة كاملة وتدرّج كحلي سفلي: شارة قادمة/أرشيف، تصنيف، عنوان، تاريخ ومكان، عدد الصور والفيديوهات.
export function EventCard({ item }: { item: { id: string; category: string; title: string; location: string; startsAt: string | null; endsAt: string | null; coverMediaId: string | null; imageCount: number; videoCount: number } }) {
  const upcoming = Boolean(item.startsAt && (new Date(item.startsAt) >= new Date() || (item.endsAt && new Date(item.endsAt) >= new Date())));
  return (
    <Box
      data-rv="" data-tilt="" component={RouterLink} to={`/events/${item.id}`}
      sx={{ ...goldCard, position: 'relative', display: 'block', minHeight: 340, overflow: 'hidden', border: 0, color: '#fff', textDecoration: 'none', bgcolor: T.navy, '&:hover img': { transform: 'scale(1.05)' } }}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}><Cover mediaId={item.coverMediaId} /></Box>
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,47,104,0) 25%,rgba(11,47,104,.94) 100%)' }} />
      <Box sx={{ position: 'absolute', top: 16, insetInlineStart: 16, zIndex: 2, px: 1.75, py: 0.25, borderRadius: 30, fontWeight: 700, fontSize: 13, ...(upcoming ? { background: T.goldGrad, color: T.ink } : { bgcolor: 'rgba(255,255,255,.92)', color: T.navy }) }}>{upcoming ? 'قادمة' : 'أرشيف'}</Box>
      <Box sx={{ position: 'absolute', insetInline: 0, bottom: 0, zIndex: 2, p: 2.75 }}>
        {item.category && <Box component="span" sx={{ display: 'inline-block', px: 1.5, borderRadius: 30, fontSize: 12.5, fontWeight: 600, bgcolor: 'rgba(255,255,255,.2)', backdropFilter: 'blur(6px)' }}>{item.category}</Box>}
        <Typography component="h3" sx={{ fontSize: 21, fontWeight: 700, my: 0.75, color: '#fff' }}>{item.title}</Typography>
        <Typography sx={{ fontSize: 14, color: '#d3e1f7' }}>📅 {shortDate(item.startsAt)}{item.location ? ` · 📍 ${item.location}` : ''}</Typography>
        {(item.imageCount > 0 || item.videoCount > 0) && <Typography sx={{ fontSize: 14, color: '#d3e1f7' }}>{item.imageCount > 0 ? `📷 ${item.imageCount}` : ''}{item.videoCount > 0 ? ` · 🎬 ${item.videoCount}` : ''}</Typography>}
      </Box>
    </Box>
  );
}

// بطاقة كلية: صورة أو بديل، اسم، نبذة (3 أسطر)، وزر «عرض التخصصات».
export function CollegeCard({ college }: { college: { id: string; nameAr: string; summary: string; mediaId: string | null } }) {
  return (
    <Box data-rv="" data-tilt="" sx={{ ...goldCard, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${T.gold}`, '&:hover img': { transform: 'scale(1.05)' } }}>
      <Box sx={{ overflow: 'hidden', aspectRatio: '16 / 10' }}><Cover mediaId={college.mediaId} label={college.nameAr} /></Box>
      <Box sx={{ p: 2.5, flex: 1 }}>
        <Typography component="h3" sx={{ fontSize: 18.5, fontWeight: 700, color: T.navy, mb: 0.5 }}>{college.nameAr}</Typography>
        {college.summary && <Typography sx={{ color: T.muted, fontSize: 15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{college.summary}</Typography>}
      </Box>
      <Box sx={{ px: 2.5, pb: 2.5 }}><BlueButton to={`/colleges/${college.id}`} small>عرض التخصصات ←</BlueButton></Box>
    </Box>
  );
}
