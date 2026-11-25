import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Alert, Box, Button, GlobalStyles, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getDocument, type DocumentView } from '../../api/affairs';
import { errorText, formatDate } from '../affairs/affairsUi';

// The official template: the same layout for every document type. The wording comes from the issued
// document's own snapshot, so it never changes after issue. "Print / save as PDF" uses the browser.
export default function DocumentPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentView | null>(null);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!id) return;
    getDocument(id).then(setDoc).catch((cause) => setError(errorText(cause, 'تعذر تحميل الوثيقة.')));
  }, [id]);

  const verifyUrl = doc ? `${window.location.origin}/verify/${doc.verificationCode}` : '';
  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [verifyUrl]);

  const groups = new Map<string, NonNullable<DocumentView['payload']['results']>>();
  for (const row of doc?.payload.results ?? []) groups.set(row.semester, [...(groups.get(row.semester) ?? []), row]);

  return (
    <Box sx={{ bgcolor: '#e9edf2', minHeight: '100vh', py: 3, px: 2, color: '#12263a' }}>
      <GlobalStyles styles={{ '@page': { size: 'A4', margin: '12mm' }, '@media print': { body: { background: '#fff !important' }, '.no-print': { display: 'none !important' }, '.paper': { boxShadow: 'none !important', margin: '0 !important', width: '100% !important', minHeight: 'auto !important' } } }} />
      <Stack className="no-print" direction="row" spacing={1} sx={{ maxWidth: 794, mx: 'auto', mb: 2, alignItems: 'center' }}>
        <Button variant="outlined" sx={{ bgcolor: '#fff' }} onClick={() => navigate(-1)}>رجوع</Button>
        <Button variant="contained" disabled={!doc} onClick={() => window.print()}>طباعة / حفظ PDF</Button>
        {doc?.status === 'REVOKED' && <Typography sx={{ color: '#c0392b', fontWeight: 700 }}>هذه الوثيقة ملغاة</Typography>}
      </Stack>
      {error && <Alert severity="error" sx={{ maxWidth: 794, mx: 'auto' }}>{error}</Alert>}
      {!doc && !error && <Typography sx={{ textAlign: 'center' }}>جارٍ التحميل...</Typography>}
      {doc && (
        <Box className="paper" sx={{ position: 'relative', bgcolor: '#fff', width: 794, maxWidth: '100%', minHeight: 1050, mx: 'auto', boxShadow: '0 2px 14px rgba(0,0,0,.18)', p: { xs: 2, sm: 5 }, border: '8px double #d5aa55', overflow: 'hidden' }}>
          {doc.status === 'REVOKED' && (
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <Typography sx={{ transform: 'rotate(-30deg)', fontSize: 120, fontWeight: 800, color: 'rgba(192,57,43,.18)', border: '8px solid rgba(192,57,43,.18)', px: 4 }}>ملغاة</Typography>
            </Box>
          )}
          <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', mb: 3 }}>
            <Box component="img" src="/logo.png" alt="شعار جامعة المعالي" sx={{ height: 90 }} />
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#073763' }}>جامعة المعالي</Typography>
            <Typography sx={{ color: '#566a7e' }}>{doc.payload.type.issuingBody}</Typography>
          </Stack>
          <Box sx={{ borderTop: '2px solid #073763', borderBottom: '2px solid #073763', py: 1, mb: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#073763' }}>{doc.payload.type.titleAr}</Typography>
          </Box>

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {doc.payload.body.split('\n').map((line, i) => (<Typography key={i} sx={{ fontSize: 18, lineHeight: 2 }}>{line}</Typography>))}
          </Stack>

          {doc.payload.results && (
            <Stack spacing={2} sx={{ mb: 3 }}>
              {groups.size === 0 && <Typography sx={{ color: '#566a7e' }}>لا توجد علامات مسجّلة للطالب حتى تاريخ الإصدار.</Typography>}
              {[...groups.entries()].map(([semester, rows]) => (
                <Box key={semester}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{semester}</Typography>
                  <Table size="small" sx={{ '& td, & th': { border: '1px solid #c9d3de', color: '#12263a', py: 0.5 } }}>
                    <TableHead><TableRow><TableCell>رمز المقرر</TableCell><TableCell>المقرر</TableCell><TableCell>الساعات</TableCell><TableCell>العلامة</TableCell><TableCell>التقدير</TableCell><TableCell>النتيجة</TableCell></TableRow></TableHead>
                    <TableBody>{rows.map((r) => (<TableRow key={r.code}><TableCell>{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.credits}</TableCell><TableCell>{r.score}</TableCell><TableCell>{r.grade}</TableCell><TableCell>{r.passed ? 'ناجح' : 'راسب'}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </Box>
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mt: 6, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#566a7e', fontSize: 13 }}>رقم الوثيقة</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 20, letterSpacing: 1 }} dir="ltr">{doc.number}</Typography>
              <Typography sx={{ fontSize: 14 }}>تاريخ الإصدار: {formatDate(doc.issuedAt)}</Typography>
              {doc.payload.issuedBy && <Typography sx={{ fontSize: 14 }}>أصدرها: {doc.payload.issuedBy}</Typography>}
              <Box sx={{ mt: 4, borderTop: '1px solid #12263a', width: 200, pt: 0.5, fontSize: 13 }}>التوقيع والختم</Box>
            </Box>
            <Stack sx={{ alignItems: 'center' }}>
              {qr && <Box component="img" src={qr} alt="رمز QR للتحقق من الوثيقة" sx={{ width: 120, height: 120 }} />}
              <Typography sx={{ fontSize: 12, color: '#566a7e' }}>رمز التحقق</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }} dir="ltr">{doc.verificationCode}</Typography>
            </Stack>
          </Stack>
          {doc.payload.type.footerNote && <Typography sx={{ mt: 3, pt: 1, borderTop: '1px solid #c9d3de', fontSize: 12, color: '#566a7e', textAlign: 'center' }}>{doc.payload.type.footerNote}</Typography>}
        </Box>
      )}
    </Box>
  );
}
