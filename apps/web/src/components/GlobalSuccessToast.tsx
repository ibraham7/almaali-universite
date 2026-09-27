import { Alert, Snackbar } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

export default function GlobalSuccessToast() {
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const lastMessageRef = useRef('');

  useEffect(() => {
    const showFromSuccessAlerts = () => {
      const alerts = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.MuiAlert-standardSuccess, .MuiAlert-filledSuccess, .MuiAlert-outlinedSuccess',
        ),
      );

      const latest = alerts
        .map((alert) => alert.innerText.trim())
        .filter(Boolean)
        .at(-1);

      if (!latest || latest === lastMessageRef.current) {
        return;
      }

      lastMessageRef.current = latest;
      setMessage(latest);
      setOpen(true);
    };

    showFromSuccessAlerts();

    const observer = new MutationObserver(showFromSuccessAlerts);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={2500}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      sx={{
        bottom: { xs: 20, sm: 28 },
      }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={handleClose}
        sx={{
          minWidth: { xs: 280, sm: 360 },
          maxWidth: 560,
          alignItems: 'center',
          fontWeight: 600,
          boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
