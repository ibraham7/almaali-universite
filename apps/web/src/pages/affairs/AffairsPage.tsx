import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import AffairsHomeTab from './AffairsHomeTab';
import AffairsRequestsTab from './AffairsRequestsTab';
import AffairsServicesTab from './AffairsServicesTab';
import AffairsStaffTab from './AffairsStaffTab';
import AffairsOperationsTab from './AffairsOperationsTab';

// The ten sections of the student-affairs dashboard. `phase` is set for sections that are not built yet.
const SECTIONS = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'files', label: 'ملفات الطلاب', phase: 2 },
  { id: 'requests', label: 'طلبات الطلاب' },
  { id: 'services', label: 'الخدمات الطلابية' },
  { id: 'documents', label: 'الوثائق والإفادات', phase: 3 },
  { id: 'referrals', label: 'المعاملات والإحالات', phase: 2 },
  { id: 'staff', label: 'الموظفون وتوزيع المهام' },
  { id: 'reports', label: 'التقارير والإحصائيات', phase: 4 },
  { id: 'operations', label: 'سجل العمليات' },
  { id: 'settings', label: 'الإعدادات والصلاحيات', phase: 4 },
] as const;

export default function AffairsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [params, setParams] = useSearchParams();
  const current = SECTIONS.find((s) => s.id === params.get('tab')) ?? SECTIONS[0];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>شؤون الطلاب</Typography>
      <Paper variant="outlined">
        <Tabs value={current.id} onChange={(_, value: string) => setParams({ tab: value })} variant="scrollable" scrollButtons="auto" aria-label="أقسام شؤون الطلاب">
          {SECTIONS.map((s) => <Tab key={s.id} value={s.id} label={s.label} />)}
        </Tabs>
      </Paper>
      <Box>
        {current.id === 'home' && <AffairsHomeTab role={role} />}
        {current.id === 'requests' && <AffairsRequestsTab role={role} />}
        {current.id === 'services' && <AffairsServicesTab />}
        {current.id === 'staff' && <AffairsStaffTab role={role} />}
        {current.id === 'operations' && <AffairsOperationsTab />}
        {'phase' in current && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{current.label}</Typography>
            <Typography color="text.secondary">قيد الإعداد — المرحلة {current.phase}</Typography>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}
