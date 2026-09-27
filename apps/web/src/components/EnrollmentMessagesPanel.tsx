import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { useCallback, useEffect, useState } from 'react';

import {
  getAdvisorEnrollmentMessages,
  getStudentEnrollmentMessages,
  sendAdvisorEnrollmentMessage,
  sendStudentEnrollmentMessage,
  type EnrollmentMessage,
} from '../api/enrollmentMessages';

interface Props {
  mode: 'student' | 'advisor';
  approvalId?: string;
  floating?: boolean;
}

function senderLabel(role: string) {
  return role === 'ADVISOR' ? 'المرشد الأكاديمي' : 'الطالب';
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('ar', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function EnrollmentMessagesPanel({
  mode,
  approvalId,
  floating = false,
}: Props) {
  const [messages, setMessages] = useState<EnrollmentMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    if (mode === 'advisor' && !approvalId) return;

    try {
      setLoading(true);
      setError('');
      const data =
        mode === 'student'
          ? await getStudentEnrollmentMessages()
          : await getAdvisorEnrollmentMessages(approvalId!);
      setMessages(data);
    } catch {
      setMessages([]);
      if (mode === 'advisor') {
        setError('تعذر تحميل رسائل طلب التسجيل.');
      }
    } finally {
      setLoading(false);
    }
  }, [approvalId, mode]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const send = async () => {
    const message = text.trim();
    if (!message || (mode === 'advisor' && !approvalId)) return;

    try {
      setSending(true);
      setError('');

      if (mode === 'student') {
        await sendStudentEnrollmentMessage(message);
      } else {
        await sendAdvisorEnrollmentMessage(approvalId!, message);
      }

      setText('');
      await loadMessages();
    } catch {
      setError('تعذر إرسال الرسالة. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card
      sx={
        floating
          ? {
              position: 'fixed',
              right: { xs: 16, md: 28 },
              bottom: { xs: 16, md: 28 },
              zIndex: 1250,
              width: { xs: 'calc(100% - 32px)', sm: 360 },
              maxHeight: 470,
              boxShadow: '0 16px 45px rgba(0,0,0,0.18)',
            }
          : { mt: 2 }
      }
    >
      <CardContent sx={{ p: '18px !important' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <ChatBubbleOutlineRoundedIcon color="primary" />
          <Box>
            <Typography sx={{ fontWeight: 700 }}>
              التواصل حول طلب التسجيل
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>
              الرسائل مرتبطة بطلب التسجيل الحالي فقط
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        <Box
          sx={{
            maxHeight: floating ? 220 : 260,
            minHeight: 90,
            overflowY: 'auto',
            pr: 0.5,
            mb: 1.5,
          }}
        >
          {loading ? (
            <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: 13 }}>
              لا توجد رسائل بعد.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {messages.map((message) => {
                const mine =
                  (mode === 'student' && message.senderRole === 'STUDENT') ||
                  (mode === 'advisor' && message.senderRole === 'ADVISOR');

                return (
                  <Box
                    key={message.id}
                    sx={{
                      alignSelf: mine ? 'flex-start' : 'flex-end',
                      maxWidth: '88%',
                      px: 1.4,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: mine ? 'primary.main' : 'action.hover',
                      color: mine ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>
                      {senderLabel(message.senderRole)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {message.message}
                    </Typography>
                    <Typography sx={{ mt: 0.4, fontSize: 9.5, opacity: 0.7 }}>
                      {formatMessageDate(message.createdAt)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="اكتب رسالة..."
            value={text}
            disabled={sending}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button
            variant="contained"
            disabled={sending || !text.trim()}
            onClick={() => void send()}
            sx={{ minWidth: 48 }}
          >
            {sending ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
