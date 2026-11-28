import { keyframes } from '@mui/material/styles';
import type { SiteContent } from '../../api/site';

// الهوية البصرية للموقع التعريفي (الشكل النهائي): أزرق ملكي من بوستر مركز المعالي مع ذهبي دافئ (نحاسي) حاضر بكل قسم،
// على خلفية كريمية. تحترم prefers-reduced-motion.
export const T = {
  navy: '#12489a', navyDark: '#0b2f68', blue: '#2f6fd0', sky: '#5f95e8',
  gold: '#d39a3d', gold2: '#f6d594', goldDark: '#a8702a', goldText: '#f8d99a',
  cream: '#f8f6f1', cream2: '#f1ecdf', ink: '#14263a', muted: '#5a6b7d',
  goldGrad: 'linear-gradient(135deg,#f6d594,#d9a04a 50%,#a8702a)',
  navyGrad: 'linear-gradient(135deg,#2f74e0,#1a55af 45%,#0d3767)',
  shadow: '0 4px 18px rgba(11,47,104,.10)',
  ease: 'cubic-bezier(.2,.7,.2,1)',
};

export const float = keyframes`50% { transform: rotate(-2deg) translateY(-10px); }`;
// الطفو والدخول بخاصية translate (لا transform) ليبقى transform لميلان المؤشر
export const floatT = keyframes`50% { translate: 0 -10px; }`;
export const cardIn = keyframes`from { opacity: 0; translate: 0 30px; } to { opacity: 1; translate: 0 0; }`;
export const spin = keyframes`to { transform: rotate(360deg); }`;
export const drift = keyframes`50% { transform: translate(18px,-22px) scale(1.12); }`;
export const rise = keyframes`from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; }`;
export const shift = keyframes`50% { background-position: 100% 0; }`;
export const pulse = keyframes`0% { box-shadow: 0 0 0 0 rgba(246,213,148,.75); } 70% { box-shadow: 0 0 0 18px rgba(246,213,148,0); } 100% { box-shadow: 0 0 0 0 rgba(246,213,148,0); }`;
export const ringPulse = keyframes`0% { box-shadow: 0 0 0 0 rgba(211,154,61,.55); } 70% { box-shadow: 0 0 0 14px rgba(211,154,61,0); } 100% { box-shadow: 0 0 0 0 rgba(211,154,61,0); }`;
export const wordIn = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; }`;
export const pageIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; }`;
export const wiggle = keyframes`0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-7px) rotate(6deg); }`;
export const bob = keyframes`50% { transform: translateY(-6px); }`;
export const calm = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', opacity: '1 !important', transform: 'none !important', translate: 'none !important' } };

export const UNIVERSITY = { name: 'جامعة المعالي', suffix: 'الخاصة' };


// الانتقال (transition) تتحكم به قواعد الظهور العامة في SiteFx، لذا لا يوضع هنا.
export const goldCard = { bgcolor: '#fff', borderRadius: '22px', boxShadow: T.shadow, border: '1px solid rgba(211,154,61,.28)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 38px rgba(11,47,104,.18), 0 0 0 2px rgba(211,154,61,.5)' }, '@media (prefers-reduced-motion: reduce)': { transform: 'none !important' } };


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
    { to: '/news', label: 'الأخبار والإعلانات', end: false, show: Boolean(content?.latestNews.length || content?.latestAnnouncements.length) },
    { to: '/testimonials', label: 'قالوا عن الجامعة', end: false, show: Boolean(content?.testimonials.length) },
    { to: '/contact', label: 'اتصل بنا', end: false, show: true },
  ].filter((item) => item.show);
}

