import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Divider, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, type NotificationItem } from '../api/affairs';
import { universityColors } from '../theme/theme';

const POLL_MS = 60_000;

function ago(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  if (minutes < 60 * 24) return `منذ ${Math.round(minutes / 60)} س`;
  return new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium' }).format(new Date(value));
}

// In-system notifications for the signed-in person (student or staff). Read marks are kept; nothing is deleted.
export default function NotificationsBell({ role }: { role: string }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [failed, setFailed] = useState(false);

  const refreshCount = useCallback(() => getUnreadCount().then((r) => setUnread(r.unread)).catch(() => undefined), []);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), POLL_MS);
    return () => clearInterval(timer);
  }, [refreshCount]);

  function openMenu(target: HTMLElement) {
    setAnchor(target);
    getNotifications(false, 1).then((r) => { setItems(r.items); setUnread(r.unread); setFailed(false); }).catch(() => setFailed(true));
  }

  function go(item: NotificationItem) {
    if (!item.isRead) {
      markNotificationRead(item.id).then((r) => setUnread(r.unread)).catch(() => undefined);
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, isRead: true } : x)));
    }
    setAnchor(null);
    if (item.requestId) navigate(role === 'STUDENT' ? `/student/requests?open=${item.requestId}` : `/affairs?tab=requests&open=${item.requestId}`);
  }

  async function readAll() {
    try { await markAllNotificationsRead(); setUnread(0); setItems((list) => list.map((x) => ({ ...x, isRead: true }))); } catch { setFailed(true); }
  }

  return (
    <>
      <Tooltip title="الإشعارات">
        <IconButton
          aria-label={unread > 0 ? `الإشعارات، ${unread} غير مقروء` : 'الإشعارات'} onClick={(e) => openMenu(e.currentTarget)}
          sx={{ width: 40, height: 40, border: `1px solid ${universityColors.border}`, color: universityColors.navy, bgcolor: '#FFFFFF', me: 1 }}
        >
          <Badge badgeContent={unread} max={99} color="error" data-testid="bell-badge"><NotificationsRoundedIcon fontSize="small" /></Badge>
        </IconButton>
      </Tooltip>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { width: 360, maxWidth: '94vw' } } }}>
        <Stack direction="row" sx={{ p: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700 }}>الإشعارات</Typography>
          <Button size="small" onClick={readAll} disabled={unread === 0}>تعليم الكل كمقروء</Button>
        </Stack>
        <Divider />
        <Box role="list" aria-label="قائمة الإشعارات" sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {failed && <Typography sx={{ p: 2 }} color="error">تعذر تحميل الإشعارات.</Typography>}
          {!failed && items.length === 0 && <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">لا توجد إشعارات.</Typography>}
          {items.map((item) => (
            <Box
              key={item.id} role="listitem" component="button" type="button" onClick={() => go(item)}
              sx={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: 'pointer', p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: item.isRead ? 'transparent' : 'action.hover', '&:hover': { bgcolor: 'action.selected' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}
            >
              <Typography variant="body2" sx={{ fontWeight: item.isRead ? 400 : 700 }}>{item.title}</Typography>
              {item.body && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.body}</Typography>}
              <Typography variant="caption" color="text.secondary">{ago(item.createdAt)}</Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
