import { Box, Typography } from '@mui/material';
import { useSiteContent } from '../../api/site';
import { Block, EmptyNote, Prose, SitePage, Wrap } from './siteTheme';
import { Expandable } from './siteFx';
import { InfoCard, Split, SplitImage } from './siteParts';
import OrgTree from './OrgTree';
import { T } from './siteStyles';

const GOAL_ICONS = ['🎯', '🔬', '🤝', '🏛️', '💡', '🌍'];
const heading = { fontSize: { xs: 26, md: 32 }, fontWeight: 800, color: T.navy, mb: 2.5, '&::after': { content: '""', display: 'block', width: 64, height: 5, borderRadius: 5, mt: 0.75, background: `linear-gradient(90deg,${T.goldDark},${T.gold2})` } };

// من نحن (بترتيب التصميم المعتمد): نبذة وكلمة الرئيس بصورتيهما، الرؤية والرسالة والقيم، الأهداف بأيقوناتها،
// الهيكل التنظيمي، ثم نشأة الجامعة. كل قسم بلا بيانات يُخفى.
export default function AboutPage() {
  const { content, loading } = useSiteContent();
  const s = content?.settings ?? {};
  const values = content?.values ?? [];
  const goals = content?.goals ?? [];
  const org = content?.orgTree ?? [];
  const milestones = content?.milestones ?? [];
  const hasVm = Boolean(s.vision || s.mission || values.length);
  const empty = !loading && !s.aboutIntro && !s.presidentWord && !hasVm && !goals.length && !org.length && !s.historyIntro && !milestones.length;

  return (
    <SitePage title="من نحن" subtitle={s.tagline}>
      {empty && <EmptyNote>سيتم نشر التعريف بالجامعة قريبًا.</EmptyNote>}
      {(s.aboutIntro || s.presidentWord) && (
        <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
          <Wrap>
            {s.aboutIntro && (
              <Split image={s.aboutImageId ? <SplitImage mediaId={s.aboutImageId} /> : undefined}>
                <Box data-rv="">
                  <Typography component="h2" data-rv-line="" sx={heading}>نبذة عن الجامعة</Typography>
                  <Expandable><Typography sx={{ fontSize: 17, whiteSpace: 'pre-line' }}>{s.aboutIntro}</Typography></Expandable>
                </Box>
              </Split>
            )}
            {s.presidentWord && (
              <Split reverse image={s.presidentPhotoId ? <SplitImage portrait mediaId={s.presidentPhotoId} alt={s.presidentName ? `صورة ${s.presidentName}` : 'رئيس الجامعة'} /> : undefined}>
                <Box data-rv="" sx={{ bgcolor: '#fff', borderRadius: '26px', p: { xs: 2.5, md: '26px 30px' }, boxShadow: '0 10px 30px rgba(18,72,154,.08)', border: '1px solid rgba(211,154,61,.3)', borderInlineStart: `5px solid ${T.gold}` }}>
                  <Typography component="h2" data-rv-line="" sx={heading}>كلمة رئيس الجامعة</Typography>
                  <Expandable><Typography sx={{ fontSize: 17, whiteSpace: 'pre-line' }}>{s.presidentWord}</Typography></Expandable>
                  {s.presidentName && <Typography sx={{ mt: 1.5, fontWeight: 700, color: T.goldDark }}>— {s.presidentName}</Typography>}
                </Box>
              </Split>
            )}
          </Wrap>
        </Box>
      )}

      {hasVm && (
        <Block title="الرؤية والرسالة والقيم">
          {(s.vision || s.mission) && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: s.vision && s.mission ? '1fr 1fr' : '1fr' }, gap: 3 }}>
              {s.vision && <InfoCard icon="👁️" title="الرؤية" text={s.vision} />}
              {s.mission && <InfoCard icon="🚀" title="الرسالة" text={s.mission} />}
            </Box>
          )}
          {values.length > 0 && (
            <>
              <Typography component="h3" data-rv="" sx={{ ...heading, mt: 5, fontSize: { xs: 22, md: 26 } }}>القيم</Typography>
              <Box data-rv="" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {values.map((value) => <Box key={value.title} component="span" title={value.text || undefined} sx={{ px: 2, py: 0.6, borderRadius: 30, fontWeight: 600, fontSize: 15, bgcolor: '#fbefd6', color: '#7d521a', transition: 'background-color .2s, color .2s, transform .2s', '&:hover': { bgcolor: T.navy, color: T.goldText, transform: 'translateY(-2px)' } }}>{value.title}</Box>)}
              </Box>
            </>
          )}
        </Block>
      )}

      {goals.length > 0 && (
        <Block title="الأهداف الاستراتيجية">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(250px, 1fr))' }, gap: 2.25 }}>
            {goals.map((goal, index) => <InfoCard key={goal.title} icon={goal.extra?.trim() || GOAL_ICONS[index % GOAL_ICONS.length]} title={goal.title} text={goal.text} />)}
          </Box>
        </Block>
      )}

      {org.length > 0 && <Block title="الهيكل التنظيمي"><Box data-rv="zoom"><OrgTree roots={org} /></Box></Block>}

      {(s.historyIntro || milestones.length > 0) && (
        <Block title="نشأة الجامعة وتطورها">
          {s.historyIntro && <Box sx={{ mb: 3 }}><Prose text={s.historyIntro} /></Box>}
          {milestones.length > 0 && (
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, borderInlineStart: '3px solid #e8cf9c', paddingInlineStart: 2.25, display: 'grid', gap: 1.75 }}>
              {milestones.map((stage) => (
                <Box component="li" data-rv="side" key={`${stage.extra}-${stage.title}`} sx={{ position: 'relative', bgcolor: '#fff', borderRadius: '14px', px: 2, py: 1.25, boxShadow: '0 4px 14px rgba(18,72,154,.07)', '&::before': { content: '""', position: 'absolute', insetInlineStart: -34, top: 18, width: 14, height: 14, borderRadius: '50%', bgcolor: T.navy, border: '3px solid #fff', boxShadow: `0 0 0 2px ${T.gold}` } }}>
                  <Typography sx={{ color: T.ink }}>{stage.extra && <Box component="b" sx={{ color: T.goldDark }}>{stage.extra} — </Box>}<Box component="span" sx={{ fontWeight: 700 }}>{stage.title}</Box></Typography>
                  {stage.text && <Typography sx={{ color: T.muted, fontSize: 15 }}>{stage.text}</Typography>}
                </Box>
              ))}
            </Box>
          )}
        </Block>
      )}
    </SitePage>
  );
}
