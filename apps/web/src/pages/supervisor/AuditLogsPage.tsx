import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useCallback, useEffect, useState } from 'react';

import {
  getAuditLogs,
  type AuditLogPage,
} from '../../api/auditLogs';

const actionLabels: Record<string, string> = {
  CREATE_REGISTRATION: 'إنشاء تسجيل',
  ADD_COURSE: 'إضافة مقرر',
  DROP_COURSE: 'حذف مقرر',
  CONFIRM_REGISTRATION: 'تأكيد التسجيل',
  REOPEN_REGISTRATION: 'إعادة فتح التسجيل',
  ADVISOR_ADD_REGISTRATION_COURSE: 'إضافة مقرر من المرشد',
  ADVISOR_REMOVE_REGISTRATION_COURSE: 'حذف مقرر من المرشد',
  ADVISOR_CANCEL_REGISTRATION: 'إلغاء التسجيل من المرشد',
  ADVISOR_APPROVE_REGISTRATION: 'موافقة المرشد',
  ADVISOR_REJECT_REGISTRATION: 'رفض المرشد',
  STUDENT_CREATED: 'إضافة طالب',
  STUDENT_UPDATED: 'تعديل بيانات طالب',
};

const entityLabels: Record<string, string> = {
  StudentEnrollment: 'تسجيل طالب',
  EnrollmentItem: 'مادة مسجلة',
  AdvisorApproval: 'موافقة المرشد',
  Student: 'طالب',
};

const dateFormatter = new Intl.DateTimeFormat('ar', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function readableDetails(details: string | null) {
  if (!details) return null;

  try {
    const value: unknown = JSON.parse(details);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value)
        .map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
        .join(' • ');
    }
  } catch {
    // Older entries may contain plain text.
  }

  return details;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const reload = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    getAuditLogs(page)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setError('تعذر تحميل سجل العمليات. حاول مجددًا.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, refresh]);

  function goToPage(nextPage: number) {
    setResult(null);
    setError('');
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>سجل العمليات</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            أحدث عمليات النظام، مرتبة من الأحدث إلى الأقدم.
          </Typography>
        </Box>
        <Button startIcon={<RefreshRoundedIcon />} onClick={reload} disabled={loading}>
          تحديث
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="جارٍ تحميل سجل العمليات" />
        </Box>
      ) : result?.items.length ? (
        <Stack spacing={1.5}>
          {result.items.map((entry) => (
            <Card key={entry.id} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={0.5}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    {actionLabels[entry.action] ?? entry.action}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
                  {entityLabels[entry.entity] ?? entry.entity}
                  {entry.entityId ? ` · ${entry.entityId}` : ''}
                </Typography>
                {entry.userId && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                    منفّذ العملية: {entry.userId}
                  </Typography>
                )}
                {entry.details && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
                    {readableDetails(entry.details)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : !error ? (
        <Alert severity="info">لا توجد عمليات مسجلة في هذه الصفحة.</Alert>
      ) : null}

      <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 3, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          startIcon={<ChevronRightRoundedIcon />}
          disabled={loading || page === 1}
          onClick={() => goToPage(page - 1)}
        >
          السابق
        </Button>
        <Typography variant="body2">صفحة {page}</Typography>
        <Button
          endIcon={<ChevronLeftRoundedIcon />}
          disabled={loading || !result?.hasMore}
          onClick={() => goToPage(page + 1)}
        >
          التالي
        </Button>
      </Stack>
    </Box>
  );
}
