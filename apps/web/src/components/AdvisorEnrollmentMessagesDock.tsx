import {
  Box,
  Fab,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import {
  getMyAdvisorApprovals,
  type AdvisorApproval,
} from '../api/advisorApprovals';
import EnrollmentMessagesPanel from './EnrollmentMessagesPanel';

function studentName(approval: AdvisorApproval) {
  const student = approval.enrollment.student;
  return [student.firstName, student.middleName, student.familyName]
    .filter(Boolean)
    .join(' ');
}

export default function AdvisorEnrollmentMessagesDock() {
  const [approvals, setApprovals] = useState<AdvisorApproval[]>([]);
  const [approvalId, setApprovalId] = useState('');
  const [open, setOpen] = useState(false);

  const loadApprovals = useCallback(async () => {
    try {
      const data = await getMyAdvisorApprovals();
      setApprovals(data);
      setApprovalId((current) => data.some((item) => item.id === current) ? current : data[0]?.id || '');
    } catch {
      setApprovals([]);
      setApprovalId('');
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
    const timer = window.setInterval(() => void loadApprovals(), 10000);
    return () => window.clearInterval(timer);
  }, [loadApprovals]);

  if (approvals.length === 0) return null;

  if (!open) {
    return (
      <Fab
        color="primary"
        aria-label="فتح مراسلة الطلاب"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          left: { xs: 16, md: 28 },
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          zIndex: 1250,
        }}
      >
        <ChatBubbleOutlineRoundedIcon />
      </Fab>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: { xs: 12, md: 28 },
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 1250,
        width: { xs: 'calc(100vw - 24px)', sm: 390 },
        maxHeight: { xs: 'min(72dvh, 600px)', sm: '75vh' },
        overflowY: 'auto',
        p: 1.2,
        borderRadius: 3,
      }}
    >
      <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            مراسلة الطلاب
          </Typography>
          <IconButton aria-label="إغلاق مراسلة الطلاب" onClick={() => setOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>طلب التسجيل</InputLabel>
          <Select
            label="طلب التسجيل"
            value={approvalId}
            onChange={(event) => setApprovalId(event.target.value)}
          >
            {approvals.map((approval) => (
              <MenuItem key={approval.id} value={approval.id}>
                {studentName(approval)} — {approval.enrollment.student.universityId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {approvalId && (
        <EnrollmentMessagesPanel
          key={approvalId}
          mode="advisor"
          approvalId={approvalId}
        />
      )}
    </Paper>
  );
}
