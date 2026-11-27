import { keyframes } from '@mui/material/styles';
import type { SiteContent } from '../../api/site';

// الهوية البصرية للموقع التعريفي (نسخة الطبقة الذهبية المعتمدة): هيدر زجاجي بحبة، هيرو كحلي متدرج، تفاصيل ذهبية،
// خلفية كريمية، بطاقات بحواف ذهبية، وفوتر كحلي. تحترم prefers-reduced-motion.
export const T = {
  navy: '#033d65', navyDark: '#022c4a', blue: '#2f5f9f', sky: '#a9c3ee',
  gold: '#c99a2e', gold2: '#ecc872', goldDark: '#9a7218', goldText: '#f4dc9b',
  cream: '#f8f6f1', cream2: '#f1ecdf', ink: '#14263a', muted: '#5a6b7d',
  goldGrad: 'linear-gradient(135deg,#f0cf80,#c99a2e 55%,#a77c1c)',
  navyGrad: 'linear-gradient(135deg,#022c4a,#033d65)',
  shadow: '0 4px 18px rgba(3,61,101,.10)',
};

export const float = keyframes`50% { transform: rotate(-2deg) translateY(-10px); }`;
export const drift = keyframes`50% { transform: translate(18px,-22px) scale(1.12); }`;
export const rise = keyframes`from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; }`;
export const shift = keyframes`50% { background-position: 100% 0; }`;
export const pulse = keyframes`0% { box-shadow: 0 0 0 0 rgba(236,200,114,.7); } 70% { box-shadow: 0 0 0 18px rgba(236,200,114,0); } 100% { box-shadow: 0 0 0 0 rgba(236,200,114,0); }`;
export const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', opacity: '1 !important', transform: 'none !important' } };

export const UNIVERSITY = { name: 'جامعة المعالي', suffix: 'الخاصة' };


export const goldCard = { bgcolor: '#fff', borderRadius: '14px', boxShadow: T.shadow, border: '1px solid rgba(201,154,46,.22)', transition: '.25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 38px rgba(3,61,101,.18), 0 0 0 2px rgba(201,154,46,.45)' }, ...calm };


// صفحات الموقع الداخلية: صفحة تظهر في القائمة فقط إن كان لها محتوى، وإلا تُخفى.
export function siteNav(content: SiteContent | null) {
  const s = content?.settings ?? {};
  const hasAbout = Boolean(s.aboutIntro || s.vision || s.mission || s.presidentWord || s.historyIntro || content?.values.length || content?.goals.length || content?.milestones.length);
  const hasAdmission = Boolean(content?.admissionSteps.length || content?.faq.length || s.admissionIntro || s.admissionConditions || s.admissionDocuments || s.admissionDates || s.admissionFees || s.admissionHow);
  return [
    { to: '/', label: 'الرئيسية', end: true, show: true },
    { to: '/about', label: 'من نحن', end: false, show: hasAbout },
    { to: '/colleges', label: 'الكليات', end: false, show: Boolean(content?.colleges.length) },
    { to: '/admission', label: 'القبول والتسجيل', end: false, show: hasAdmission },
    { to: '/news', label: 'الأخبار', end: false, show: Boolean(content?.latestNews.length) },
    { to: '/testimonials', label: 'قالوا عن الجامعة', end: false, show: Boolean(content?.testimonials.length) },
    { to: '/contact', label: 'اتصل بنا', end: false, show: true },
  ].filter((item) => item.show);
}

