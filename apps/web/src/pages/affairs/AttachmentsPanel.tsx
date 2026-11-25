import { useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import type { AttachmentItem } from '../../api/affairs';
import { checkUpload, errorText, formatDate, formatSize, saveBlob } from './affairsUi';

// Shared by staff (request dialog) and student (my request): list, download, upload and (staff only) archive.
export default function AttachmentsPanel({ attachments, canUpload, onUpload, onDownload, onArchive }: {
  attachments: AttachmentItem[];
  canUpload: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onDownload: (attachment: AttachmentItem) => Promise<Blob>;
  onArchive?: (attachment: AttachmentItem, reason: string) => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function run(work: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await work(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    const problem = checkUpload(file);
    if (problem) { setError(problem); return; }
    await run(() => onUpload(file));
  }

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700 }}>المرفقات</Typography>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {attachments.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد مرفقات.</Typography>}
      {attachments.map((a) => (
        <Box key={a.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 140, overflowWrap: 'anywhere' }}>{a.fileName}</Typography>
            <Typography variant="caption" color="text.secondary">{formatSize(a.sizeBytes)} · {formatDate(a.createdAt)}</Typography>
            {a.uploadedBy && <Chip size="small" label={a.uploadedBy === 'student' ? 'من الطالب' : 'من الموظف (داخلي)'} variant="outlined" />}
            <Button size="small" disabled={busy} onClick={() => run(async () => saveBlob(await onDownload(a), a.fileName))}>تنزيل</Button>
            {onArchive && <Button size="small" color="warning" disabled={busy} onClick={() => { setArchiving(archiving === a.id ? null : a.id); setReason(''); }}>أرشفة</Button>}
          </Stack>
          {archiving === a.id && onArchive && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField size="small" label="سبب الأرشفة (مطلوب)" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: 1 }} />
              <Button variant="outlined" disabled={busy || !reason.trim()} onClick={() => run(async () => { await onArchive(a, reason.trim()); setArchiving(null); })}>تأكيد</Button>
            </Stack>
          )}
        </Box>
      ))}
      {canUpload && (
        <Box>
          <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden aria-label="اختيار ملف" onChange={(e) => void pick(e.target.files?.[0])} />
          <Button variant="outlined" disabled={busy} onClick={() => input.current?.click()}>إضافة مرفق</Button>
          <Typography variant="caption" color="text.secondary" sx={{ ms: 1 }}> PDF أو JPG أو PNG، حتى 5 ميغابايت</Typography>
        </Box>
      )}
    </Stack>
  );
}
