import { Box, Typography } from '@mui/material';
import { useSiteContent } from '../../api/site';
import { Block, EmptyNote, GoldButton, Prose, SitePage } from './siteTheme';
import { T, goldCard } from './siteStyles';

const SECTIONS: Array<[string, string]> = [
  ['admissionConditions', 'شروط القبول'], ['admissionDocuments', 'الوثائق المطلوبة'], ['admissionDates', 'مواعيد التسجيل والمفاضلة'],
  ['admissionFees', 'الرسوم الدراسية'], ['admissionHow', 'آلية التقديم'],
];

// القبول والتسجيل: شروط، وثائق، مواعيد، رسوم، آلية التقديم، خطوات، وأسئلة شائعة. كل قسم بلا بيانات يُخفى.
export default function AdmissionPage() {
  const { content, loading } = useSiteContent();
  const s = content?.settings ?? {};
  const steps = content?.admissionSteps ?? [];
  const faq = content?.faq ?? [];
  const empty = !loading && !steps.length && !faq.length && !s.admissionIntro && SECTIONS.every(([key]) => !s[key]);
  return (
    <SitePage title="القبول والتسجيل" subtitle={s.admissionIntro}>
      {empty && <EmptyNote>سيتم نشر معلومات القبول والتسجيل قريبًا.</EmptyNote>}
      {SECTIONS.filter(([key]) => s[key]).map(([key, title]) => (
        <Block key={key} title={title}><Box sx={{ ...goldCard, p: { xs: 2.5, md: 3.5 }, borderInlineStart: `5px solid ${T.gold}`, '&:hover': { transform: 'none' } }}><Prose text={s[key]} /></Box></Block>
      ))}
      {steps.length > 0 && (
        <Block title="خطوات التقديم">
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(220px, 1fr))' }, gap: 2.25 }}>
            {steps.map((step, index) => (
              <Box component="li" key={step.title} sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25, fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{index + 1}</Box>
                <Typography component="h3" sx={{ fontSize: 17.5, fontWeight: 700, color: T.navy }}>{step.title}</Typography>
                {step.text && <Typography sx={{ fontSize: 14.5, color: T.muted }}>{step.text}</Typography>}
              </Box>
            ))}
          </Box>
        </Block>
      )}
      {faq.length > 0 && (
        <Block title="الأسئلة الشائعة">
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {faq.map((item) => (
              <Box component="details" key={item.title} sx={{ ...goldCard, p: 0, '&:hover': { transform: 'none' }, '& summary': { cursor: 'pointer', p: 2.25, fontWeight: 700, color: T.navy, listStyle: 'none', '&::-webkit-details-marker': { display: 'none' }, '&::after': { content: '"+"', float: 'inline-end', color: T.goldDark, fontSize: 22, lineHeight: 1 } }, '&[open] summary::after': { content: '"−"' } }}>
                <summary>{item.title}</summary>
                <Typography sx={{ px: 2.25, pb: 2.25, color: T.muted, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{item.text}</Typography>
              </Box>
            ))}
          </Box>
        </Block>
      )}
      <Block title="التسجيل الإلكتروني للطلاب">
        <Typography sx={{ color: T.muted, mb: 2.5, fontSize: 17 }}>الطلاب المسجلون في الجامعة يدخلون بالرقم الجامعي لتسجيل المقررات ومتابعة وضعهم الأكاديمي.</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', '& a': { color: T.ink } }}>
          <GoldButton to="/signup">إنشاء حساب</GoldButton>
          <Box sx={{ '& a': { color: T.navy, border: `1px solid ${T.gold}` } }}><GoldButton to="/login" outline>تسجيل الدخول</GoldButton></Box>
        </Box>
      </Block>
    </SitePage>
  );
}
