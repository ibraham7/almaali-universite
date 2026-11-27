import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { AcademicTab, MediaTab, NewsTab, TestimonialsTab } from './MoreTabs';
import { ItemsTab, MessagesTab, SettingsTab } from './ContentTabs';

const TABS = [
  { label: 'النصوص العامة', node: <SettingsTab /> },
  { label: 'عناصر المحتوى', node: <ItemsTab /> },
  { label: 'الكليات والاختصاصات', node: <AcademicTab /> },
  { label: 'الأخبار والإعلانات', node: <NewsTab /> },
  { label: 'قالوا عن الجامعة', node: <TestimonialsTab /> },
  { label: 'الوسائط', node: <MediaTab /> },
  { label: 'رسائل التواصل', node: <MessagesTab /> },
];

// لوحة الموقع التعريفي (مدير النظام فقط): كل ما يراه الزوار يُدار من هنا، وما ليس له بيانات لا يظهر.
export default function SiteAdminPage() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>لوحة الموقع</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>إدارة محتوى الموقع التعريفي للجامعة. التغييرات تظهر للزوار فور حفظها أو نشرها.</Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((item) => <Tab key={item.label} label={item.label} />)}
      </Tabs>
      {TABS[tab].node}
    </Box>
  );
}
