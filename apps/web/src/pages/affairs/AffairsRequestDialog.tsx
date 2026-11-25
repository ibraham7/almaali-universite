import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  issueDocument, archiveAttachment, assignAffairsRequest, changeAffairsStatus, commentAffairsRequest, downloadStaffAttachment, getAffairsRequest, getAffairsStaff, uploadStaffAttachment,
  type AffairsStaffItem, type RequestDetails, type RequestStatus,
} from '../../api/affairs';
import { CHANNEL_LABEL, REASON_REQUIRED, STATUS_LABEL, errorText, formatDate } from './affairsUi';
import AttachmentsPanel from './AttachmentsPanel';
import ReferralPanel from './ReferralPanel';
import { DOCUMENT_STATUS_LABEL } from './affairsUi';
import { StatusChip, Timeline } from './AffairsBits';

// Mounted only while a request is open, so every opening starts clean.
export default function AffairsRequestDialog({ requestId, role, onClose, onChanged, onOpenStudent }: {
  requestId: string; role: string; onClose: () => void; onChanged: () => void; onOpenStudent?: (studentId: string) => void;
}) {
  const [data, setData] = useState<RequestDetails | null>(null);
  const [staff, setStaff] = useState<AffairsStaffItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [staffId, setStaffId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const load = useCallback(() => getAffairsRequest(requestId)
    .then((result) => { setData(result); setError(''); })
    .catch((cause) => setError(errorText(cause, 'تعذر تحميل الطلب.'))), [requestId]);

  useEffect(() => {
    void load();
    if (role === 'SYSTEM_ADMIN') getAffairsStaff().then(setStaff).catch(() => undefined);
  }, [requestId, role, load]);

  async function run(work: () => Promise<unknown>, after?: () => void) {
    setBusy(true); setError('');
    try { await work(); after?.(); await load(); onChanged(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const needsReason = status !== '' && REASON_REQUIRED.includes(status);
  const eligibleStaff = staff.filter((member) => member.isActive && data && member.serviceIds.includes(data.service.id) && member.id !== data.assignedStaff?.id);

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="affairs-request-title">
      <DialogTitle id="affairs-request-title">
        {data ? <>طلب {data.number} <StatusChip status={data.status} /></> : 'تفاصيل الطلب'}
      </DialogTitle>
      <DialogContent dividers>
        {!data && !error && <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {data && (
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              <Typography variant="body2"><b>الطالب:</b> {data.student.name} ({data.student.universityId}){onOpenStudent && <Button size="small" onClick={() => onOpenStudent(data.student.id)}>ملف الطالب</Button>}</Typography>
              <Typography variant="body2"><b>الخدمة:</b> {data.service.nameAr}</Typography>
              <Typography variant="body2"><b>مصدر الطلب:</b> {CHANNEL_LABEL[data.channel]}</Typography>
              <Typography variant="body2"><b>آخر تحديث:</b> {formatDate(data.updatedAt, true)}</Typography>
              <Typography variant="body2"><b>الموظف المسند:</b> {data.assignedStaff?.name ?? 'غير مسند'}</Typography>
              <Typography variant="body2"><b>الموعد المتوقع:</b> {formatDate(data.dueAt)}</Typography>
              <Typography variant="body2"><b>هاتف الطالب:</b> {data.student.phone ?? '—'}</Typography>
              <Typography variant="body2"><b>تاريخ التقديم:</b> {formatDate(data.createdAt, true)}</Typography>
            </Box>
            {(data.subject || data.details) && (
              <Box>
                {data.subject && <Typography sx={{ fontWeight: 700 }}>{data.subject}</Typography>}
                {data.details && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{data.details}</Typography>}
              </Box>
            )}
            {data.decisionReason && <Alert severity="info">السبب: {data.decisionReason}</Alert>}
            {(data.service.attachmentsNote || data.service.feeNote || data.service.workflowNote) && (
              <Alert severity="info" icon={false} sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                {data.service.attachmentsNote && <div><b>المرفقات المطلوبة:</b> {data.service.attachmentsNote}</div>}
                {data.service.feeNote && <div><b>الرسوم:</b> {data.service.feeNote}</div>}
                {data.service.workflowNote && <div><b>مسار المعالجة:</b> {data.service.workflowNote}</div>}
              </Alert>
            )}

            <Divider />
            <Typography sx={{ fontWeight: 700 }}>سجل الطلب</Typography>
            <Timeline events={data.events} showActor />

            <Divider />
            <AttachmentsPanel
              attachments={data.attachments}
              canUpload={data.canAct && !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(data.status)}
              onUpload={async (file) => { await uploadStaffAttachment(data.id, file); await load(); onChanged(); }}
              onDownload={(a) => downloadStaffAttachment(data.id, a.id)}
              onArchive={data.canAct ? async (a, reason) => { await archiveAttachment(data.id, a.id, reason); await load(); onChanged(); } : undefined}
            />
            <Divider />
            <ReferralPanel data={data} onChanged={() => { void load(); onChanged(); }} />
            {(data.documents.length > 0 || data.documentTypeName) && (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>الوثائق الصادرة</Typography>
                  {data.documents.length === 0 && <Typography variant="body2" color="text.secondary">لم تصدر وثيقة لهذا الطلب بعد.</Typography>}
                  {data.documents.map((d) => (
                    <Stack key={d.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} dir="ltr">{d.number}</Typography>
                      <Typography variant="body2">{d.typeName} · {DOCUMENT_STATUS_LABEL[d.status]} · {formatDate(d.issuedAt)}</Typography>
                      <Button size="small" component="a" href={`/documents/${d.id}`} target="_blank" rel="noopener noreferrer">عرض / طباعة</Button>
                    </Stack>
                  ))}
                  {data.canIssueDocument && (
                    <Box><Button variant="contained" disabled={busy} onClick={() => run(() => issueDocument(data.id))}>إصدار وثيقة ({data.documentTypeName})</Button></Box>
                  )}
                  {!data.canIssueDocument && data.documentTypeName && data.documents.every((d) => d.status === 'REVOKED') && !['ACCEPTED', 'COMPLETED'].includes(data.status) && (
                    <Typography variant="caption" color="text.secondary">تُصدر الوثيقة بعد قبول الطلب أو إكماله.</Typography>
                  )}
                </Stack>
              </>
            )}

            {(data.canTake || (role === 'SYSTEM_ADMIN' && data.status !== 'COMPLETED' && data.status !== 'REJECTED' && data.status !== 'CANCELLED')) && <Divider />}

            {data.canTake && (
              <Box><Button variant="contained" disabled={busy} onClick={() => run(() => assignAffairsRequest(data.id, {}))}>استلام الطلب</Button></Box>
            )}

            {data.canAct && data.allowedStatuses.length > 0 && (
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>تغيير الحالة</Typography>
                <TextField select size="small" label="الحالة الجديدة" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
                  {data.allowedStatuses.map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>)}
                </TextField>
                {status !== '' && (
                  <TextField size="small" multiline minRows={2} label={needsReason ? 'السبب (مطلوب، يظهر للطالب)' : 'ملاحظة (اختياري، تظهر للطالب)'} value={note} onChange={(e) => setNote(e.target.value)} required={needsReason} />
                )}
                <Box>
                  <Button variant="contained" disabled={busy || status === '' || (needsReason && !note.trim())}
                    onClick={() => run(() => changeAffairsStatus(data.id, { status, note: note.trim() || undefined }), () => { setStatus(''); setNote(''); })}>
                    حفظ الحالة
                  </Button>
                </Box>
              </Stack>
            )}

            {data.canAct && (
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>ملاحظة داخلية (لا تظهر للطالب)</Typography>
                <TextField size="small" multiline minRows={2} label="الملاحظة" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Box>
                  <Button variant="outlined" disabled={busy || !comment.trim()} onClick={() => run(() => commentAffairsRequest(data.id, { note: comment.trim() }), () => setComment(''))}>إضافة ملاحظة</Button>
                </Box>
              </Stack>
            )}

            {role === 'SYSTEM_ADMIN' && !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(data.status) && (
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>{data.assignedStaff ? 'إعادة الإسناد' : 'إسناد الطلب'}</Typography>
                <TextField select size="small" label="الموظف" value={staffId} onChange={(e) => setStaffId(e.target.value)} helperText={eligibleStaff.length === 0 ? 'لا يوجد موظف فعّال آخر لديه هذه الخدمة.' : undefined}>
                  {eligibleStaff.map((member) => <MenuItem key={member.id} value={member.id}>{member.name} — مفتوح: {member.open}</MenuItem>)}
                </TextField>
                {data.assignedStaff && <TextField size="small" label="سبب إعادة الإسناد (مطلوب)" value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} />}
                <Box>
                  <Button variant="outlined" disabled={busy || !staffId || (Boolean(data.assignedStaff) && !reassignReason.trim())}
                    onClick={() => run(() => assignAffairsRequest(data.id, { staffId, reason: reassignReason.trim() || undefined }), () => { setStaffId(''); setReassignReason(''); })}>
                    {data.assignedStaff ? 'إعادة الإسناد' : 'إسناد'}
                  </Button>
                </Box>
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>إغلاق</Button></DialogActions>
    </Dialog>
  );
}
