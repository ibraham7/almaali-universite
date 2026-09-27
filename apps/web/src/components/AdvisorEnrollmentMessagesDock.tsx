import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    let active = true;

    void getMyAdvisorApprovals()
      .then((data) => {
        if (!active) return;
        setApprovals(data);
        setApprovalId((current) => current || data[0]?.id || '');
      })
      .catch(() => {
        if (active) setApprovals([]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (approvals.length === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: { xs: 16, md: 28 },
        bottom: { xs: 16, md: 28 },
        zIndex: 1250,
        width: { xs: 'calc(100% - 32px)', sm: 390 },
        maxHeight: '75vh',
        overflowY: 'auto',
        p: 1.2,
        borderRadius: 3,
      }}
    >
      <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          مراسلة الطلاب
        </Typography>

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
