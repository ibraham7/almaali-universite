import { Box, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import { siteMediaUrl, useSiteContent } from '../../api/site';
import { Block, EmptyNote, Prose, SitePage, Wrap } from './siteTheme';
import { T, goldCard } from './siteStyles';

const grid = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' }, gap: 2.25 };

// من نحن: نبذة، رؤية ورسالة وقيم، أهداف، كلمة رئيس الجامعة، نشأة الجامعة وتطورها. كل قسم بلا بيانات يُخفى.
export default function AboutPage() {
  const { content, loading } = useSiteContent();
  const s = content?.settings ?? {};
  const pillars = [
    s.vision && { title: 'الرؤية', text: s.vision, Icon: VisibilityRoundedIcon },
    s.mission && { title: 'الرسالة', text: s.mission, Icon: FlagRoundedIcon },
    ...(content?.values.length ? [{ title: 'القيم', text: content.values.map((item) => item.title).join('، '), Icon: DiamondRoundedIcon }] : []),
  ].filter(Boolean) as Array<{ title: string; text: string; Icon: typeof FlagRoundedIcon }>;
  const empty = !loading && !s.aboutIntro && !pillars.length && !content?.goals.length && !s.presidentWord && !s.historyIntro && !content?.milestones.length;

  return (
    <SitePage title="من نحن" subtitle={s.tagline}>
      {empty && <EmptyNote>سيتم نشر التعريف بالجامعة قريبًا.</EmptyNote>}
      {s.aboutIntro && <Block title="نبذة عن الجامعة"><Prose text={s.aboutIntro} /></Block>}
      {pillars.length > 0 && (
        <Block title="الرؤية والرسالة والقيم">
          <Box sx={grid}>
            {pillars.map(({ title, text, Icon }) => (
              <Box data-rv="" data-tilt="" key={title} sx={{ ...goldCard, p: 3, borderTop: `4px solid ${T.gold}` }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', mb: 1.5, background: 'linear-gradient(135deg,#fbf2d9,#f0d890)', color: T.goldDark }}><Icon /></Box>
                <Typography component="h3" sx={{ fontSize: 19, fontWeight: 700, color: T.navy, mb: 0.5 }}>{title}</Typography>
                <Typography sx={{ color: T.muted, fontSize: 15.5, whiteSpace: 'pre-line' }}>{text}</Typography>
              </Box>
            ))}
          </Box>
          {content && content.values.some((item) => item.text) && (
            <Box sx={{ ...grid, mt: 3 }}>
              {content.values.filter((item) => item.text).map((item) => (
                <Box data-rv="" data-tilt="" key={item.title} sx={{ ...goldCard, p: 2.5 }}>
                  <Typography component="h3" sx={{ fontWeight: 700, color: T.navy }}>{item.title}</Typography>
                  <Typography sx={{ color: T.muted, fontSize: 15 }}>{item.text}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Block>
      )}
      {content && content.goals.length > 0 && (
        <Block title="أهداف الجامعة">
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.75 }}>
            {content.goals.map((goal, index) => (
              <Box data-rv="" data-tilt="" component="li" key={goal.title} sx={{ ...goldCard, p: 2.25, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: T.navyGrad, color: T.goldText, boxShadow: `0 0 0 2px ${T.gold}` }}>{index + 1}</Box>
                <Box><Typography sx={{ fontWeight: 700, color: T.navy }}>{goal.title}</Typography>{goal.text && <Typography sx={{ color: T.muted, fontSize: 15 }}>{goal.text}</Typography>}</Box>
              </Box>
            ))}
          </Box>
        </Block>
      )}
      {s.presidentWord && (
        <Block title="كلمة رئيس الجامعة">
          <Box data-rv="" sx={{ ...goldCard, p: { xs: 3, md: 4 }, borderInlineStart: `5px solid ${T.gold}`, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, '&:hover': { transform: 'none' } }}>
            {s.presidentPhotoId && <Box component="img" src={siteMediaUrl(s.presidentPhotoId)} alt={s.presidentName ? `صورة ${s.presidentName}` : 'رئيس الجامعة'} sx={{ width: { xs: 140, md: 180 }, height: { xs: 140, md: 180 }, objectFit: 'cover', borderRadius: '20px', border: `3px solid ${T.gold}`, alignSelf: { xs: 'center', md: 'flex-start' } }} />}
            <Box sx={{ flex: 1 }}>
              <Prose text={s.presidentWord} />
              {s.presidentName && <Typography sx={{ mt: 2, fontWeight: 700, color: T.goldDark }}>{s.presidentName}</Typography>}
            </Box>
          </Box>
        </Block>
      )}
      {(s.historyIntro || (content && content.milestones.length > 0)) && (
        <Block title="نشأة الجامعة وتطورها">
          {s.historyIntro && <Box sx={{ mb: 3 }}><Prose text={s.historyIntro} /></Box>}
          {content && content.milestones.length > 0 && (
            <Wrap sx={{ width: '100%' }}>
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, borderInlineStart: `3px solid ${T.gold}`, paddingInlineStart: 3, display: 'grid', gap: 2.25 }}>
                {content.milestones.map((stage) => (
                  <Box component="li" key={`${stage.extra}-${stage.title}`} sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', insetInlineStart: -33, top: 8, width: 14, height: 14, borderRadius: '50%', background: T.goldGrad, boxShadow: '0 0 0 3px #fff' } }}>
                    {stage.extra && <Typography sx={{ fontWeight: 800, color: T.goldDark }}>{stage.extra}</Typography>}
                    <Typography sx={{ fontWeight: 700, color: T.navy }}>{stage.title}</Typography>
                    {stage.text && <Typography sx={{ color: T.muted, fontSize: 15 }}>{stage.text}</Typography>}
                  </Box>
                ))}
              </Box>
            </Wrap>
          )}
        </Block>
      )}
    </SitePage>
  );
}
