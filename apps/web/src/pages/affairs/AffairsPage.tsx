import { useEffect, useState } from 'react';
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import AffairsHomeTab from './AffairsHomeTab';
import AffairsRequestsTab from './AffairsRequestsTab';
import AffairsServicesTab from './AffairsServicesTab';
import AffairsStaffTab from './AffairsStaffTab';
import AffairsOperationsTab from './AffairsOperationsTab';
import AffairsFilesTab from './AffairsFilesTab';
import AffairsReferralsTab from './AffairsReferralsTab';
import AffairsDocumentsTab from './AffairsDocumentsTab';
import AffairsReportsTab from './AffairsReportsTab';
import AffairsSettingsTab from './AffairsSettingsTab';
import AffairsStuckTab from './AffairsStuckTab';
import { getAffairsMe } from '../../api/affairs';

// The ten sections of the student-affairs dashboard.
const SECTIONS = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'files', label: 'ملفات الطلاب' },
  { id: 'requests', label: 'طلبات الطلاب' },
  { id: 'services', label: 'الخدمات الطلابية' },
  { id: 'documents', label: 'الوثائق والإفادات' },
  { id: 'referrals', label: 'المعاملات والإحالات' },
  { id: 'stuck', label: 'المعاملات المتعثرة' },
  { id: 'staff', label: 'الموظفون وتوزيع المهام' },
  { id: 'reports', label: 'التقارير والإحصائيات' },
  { id: 'operations', label: 'سجل العمليات' },
  { id: 'settings', label: 'الإعدادات والصلاحيات' },
] as const;

export default function AffairsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [params, setParams] = useSearchParams();
  // «المعاملات المتعثرة» لمدير النظام ومدير الوحدة فقط.
  const [canManage, setCanManage] = useState(role === 'SYSTEM_ADMIN');
  useEffect(() => { getAffairsMe().then((me) => setCanManage(me.canManage)).catch(() => undefined); }, []);
  const sections = SECTIONS.filter((s) => s.id !== 'stuck' || canManage);
  const current = sections.find((s) => s.id === params.get('tab')) ?? sections[0];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>شؤون الطلاب</Typography>
      <Paper variant="outlined">
        <Tabs value={current.id} onChange={(_, value: string) => setParams({ tab: value })} variant="scrollable" scrollButtons="auto" aria-label="أقسام شؤون الطلاب">
          {sections.map((s) => <Tab key={s.id} value={s.id} label={s.label} />)}
        </Tabs>
      </Paper>
      <Box>
        {current.id === 'home' && <AffairsHomeTab />}
        {current.id === 'files' && <AffairsFilesTab />}
        {current.id === 'requests' && <AffairsRequestsTab role={role} />}
        {current.id === 'documents' && <AffairsDocumentsTab role={role} />}
        {current.id === 'reports' && <AffairsReportsTab role={role} />}
        {current.id === 'settings' && <AffairsSettingsTab role={role} />}
        {current.id === 'referrals' && <AffairsReferralsTab role={role} />}
        {current.id === 'stuck' && <AffairsStuckTab role={role} />}
        {current.id === 'services' && <AffairsServicesTab />}
        {current.id === 'staff' && <AffairsStaffTab role={role} />}
        {current.id === 'operations' && <AffairsOperationsTab />}
      </Box>
    </Stack>
  );
}
