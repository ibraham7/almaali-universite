import { Box, Typography } from '@mui/material';
import { useSiteContent } from '../../api/site';
import { Block, EmptyNote, GoldButton, SitePage } from './siteTheme';
import { T, goldCard } from './siteStyles';

const lines = (value: string | undefined) => (value ?? '').split(/\n+/).map((line) => line.trim()).filter(Boolean);

// قائمة بعلامات صح ذهبية؛ السطر بصيغة «عنوان: قيمة» يُظهر العنوان عريضًا.
function Checklist({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
      {items.map((item, index) => {
        const colon = item.indexOf(':');
        const hasLabel = colon > 0 && colon < 40;
        return (
          <Box component="li" key={`${index}-${item}`} data-rv="side" sx={{ position: 'relative', bgcolor: '#fff', borderRadius: '12px', py: 1.1, px: 2, paddingInlineStart: 5, boxShadow: '0 3px 10px rgba(18,72,154,.06)', '&::before': { content: '"✓"', position: 'absolute', insetInlineStart: 12, top: 12, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: T.goldGrad, color: T.ink } }}>
            {hasLabel ? <><b>{item.slice(0, colon)}:</b>{item.slice(colon + 1)}</> : item}
          </Box>
        );
      })}
    </Box>
  );
}

function Column({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Typography component="h2" data-rv="" data-rv-line="" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, color: T.navy, mb: 2.25, '&::after': { content: '""', display: 'block', width: 64, height: 5, borderRadius: 5, mt: 0.75, background: `linear-gradient(90deg,${T.goldDark},${T.gold2})` } }}>{title}</Typography>
      <Checklist items={items} />
    </Box>
  );
}

// القبول والتسجيل بتصميم العمودين: شروط ووثائق | مواعيد ورسوم، ثم آلية التقديم (وخطواتها) والأسئلة الشائعة. القسم بلا بيانات يُخفى.
export default function AdmissionPage() {
  const { content, loading } = useSiteContent();
  const s = content?.settings ?? {};
  const steps = content?.admissionSteps ?? [];
  const faq = content?.faq ?? [];
  const right = [['شروط القبول', lines(s.admissionConditions)], ['الوثائق المطلوبة', lines(s.admissionDocuments)]] as const;
  const left = [['المواعيد', lines(s.admissionDates)], ['الرسوم', lines(s.admissionFees)]] as const;
  const hasColumns = [...right, ...left].some(([, items]) => items.length > 0);
  const empty = !loading && !hasColumns && !steps.length && !faq.length && !s.admissionIntro && !s.admissionHow;
  return (
    <SitePage title="القبول والتسجيل" subtitle={s.admissionIntro}>
      {empty && <EmptyNote>سيتم نشر معلومات القبول والتسجيل قريبًا.</EmptyNote>}
      {hasColumns && (
        <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
          <Box sx={{ width: 'min(1120px, 100% - 32px)', mx: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
            <Box sx={{ display: 'grid', gap: 4 }}>{right.map(([title, items]) => <Column key={title} title={title} items={[...items]} />)}</Box>
            <Box sx={{ display: 'grid', gap: 4 }}>{left.map(([title, items]) => <Column key={title} title={title} items={[...items]} />)}</Box>
          </Box>
        </Box>
      )}
      {(s.admissionHow || steps.length > 0) && (
        <Block title="آلية التقديم الإلكتروني">
          {s.admissionHow && <Typography data-rv="" sx={{ fontSize: 17, whiteSpace: 'pre-line', mb: steps.length ? 3 : 0 }}>{s.admissionHow}</Typography>}
          {steps.length > 0 && (
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(220px, 1fr))' }, gap: 2.25 }}>
              {steps.map((step, index) => (
                <Box data-rv="" data-tilt="" component="li" key={step.title} sx={{ ...goldCard, p: 2.75, borderTop: `4px solid ${T.gold}` }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25, fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{index + 1}</Box>
                  <Typography component="h3" sx={{ fontSize: 17.5, fontWeight: 700, color: T.navy }}>{step.title}</Typography>
                  {step.text && <Typography sx={{ fontSize: 14.5, color: T.muted }}>{step.text}</Typography>}
                </Box>
              ))}
            </Box>
          )}
        </Block>
      )}
      {faq.length > 0 && (
        <Block title="الأسئلة الشائعة">
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {faq.map((item) => (
              <Box data-rv="" component="details" key={item.title} sx={{ ...goldCard, p: 0, '&:hover': { transform: 'none' }, '&[open]': { borderColor: T.gold }, '& summary': { cursor: 'pointer', p: '14px 20px', fontWeight: 700, color: T.navy, listStyle: 'none', '&::-webkit-details-marker': { display: 'none' }, '&::before': { content: '"◂ "', color: T.goldDark } }, '&[open] summary::before': { content: '"▾ "' } }}>
                <summary>{item.title}</summary>
                <Typography sx={{ px: 2.5, pb: 2.25, color: T.muted, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{item.text}</Typography>
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
