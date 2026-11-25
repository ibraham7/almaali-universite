import { Box, Chip, Stack, Typography } from '@mui/material';
import type { RequestEvent, RequestStatus } from '../../api/affairs';
import { EVENT_LABEL, STATUS_COLOR, STATUS_LABEL, formatDate } from './affairsUi';

export function StatusChip({ status }: { status: RequestStatus }) {
  return <Chip size="small" color={STATUS_COLOR[status]} label={STATUS_LABEL[status]} variant={status === 'CANCELLED' ? 'outlined' : 'filled'} />;
}

export function Timeline({ events, showActor = false }: { events: RequestEvent[]; showActor?: boolean }) {
  return (
    <Stack spacing={1.5} sx={{ borderInlineStart: '2px solid', borderColor: 'divider', ps: 2, ms: 1 }} aria-label="سجل الطلب">
      {events.map((event) => (
        <Box key={event.id} sx={{ position: 'relative' }}>
          <Box sx={{ position: 'absolute', insetInlineStart: -23, top: 6, width: 10, height: 10, borderRadius: '50%', bgcolor: event.visibleToStudent === false ? 'warning.main' : 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {EVENT_LABEL[event.type] ?? event.type}
            {event.toStatus && event.type === 'STATUS_CHANGED' ? ` — ${STATUS_LABEL[event.toStatus]}` : ''}
          </Typography>
          {event.note && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{event.note}</Typography>}
          <Typography variant="caption" color="text.secondary">
            {formatDate(event.createdAt, true)}{showActor && event.actor ? ` · ${event.actor}` : ''}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
