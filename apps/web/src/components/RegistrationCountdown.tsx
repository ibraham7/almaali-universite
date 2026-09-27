import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { Box, Paper, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMyRegistration } from '../api/studentRegistration';

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return 'انتهت فترة التسجيل';
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} يوم`);
  if (hours > 0 || days > 0) parts.push(`${hours} ساعة`);
  parts.push(`${minutes} دقيقة`);

  return parts.join(' و ');
}

export default function RegistrationCountdown() {
  const location = useLocation();
  const [endDateTime, setEndDateTime] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isRegistrationPage =
    location.pathname === '/student/registration';

  useEffect(() => {
    if (!isRegistrationPage) {
      setEndDateTime(null);
      return;
    }

    let active = true;

    void getMyRegistration()
      .then((data) => {
        if (!active || data.success === false) return;
        setEndDateTime(data.registrationPeriod?.endDateTime ?? null);
      })
      .catch(() => {
        if (active) setEndDateTime(null);
      });

    return () => {
      active = false;
    };
  }, [isRegistrationPage]);

  useEffect(() => {
    if (!isRegistrationPage || !endDateTime) return;

    setNow(Date.now());

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, [isRegistrationPage, endDateTime]);

  const remaining = useMemo(() => {
    if (!endDateTime) return null;

    const end = new Date(endDateTime).getTime();
    if (Number.isNaN(end)) return null;

    return formatRemaining(end - now);
  }, [endDateTime, now]);

  if (!isRegistrationPage || !remaining) {
    return null;
  }

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        left: { xs: 16, md: 28 },
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        zIndex: 1200,
        width: { xs: 'calc(100vw - 100px)', sm: 'auto' },
        minWidth: { xs: 0, sm: 300 },
        maxWidth: { xs: 220, sm: 'none' },
        px: { xs: 1.2, sm: 2 },
        py: 1.4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
        }}
      >
        <AccessTimeRoundedIcon color="primary" />

        <Box>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 11.5 }}
          >
            الوقت المتبقي لنهاية التسجيل
          </Typography>

          <Typography
            sx={{
              mt: 0.2,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {remaining}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
