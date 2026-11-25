import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { verifyDocument, type DocumentVerifyResult } from '../../api/affairs';
import { errorText, formatDate } from '../affairs/affairsUi';

// Public page (no login): shows only whether a document is valid, with the minimum details needed to match it.
export default function VerifyDocumentPage() {
  const { code: routeCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(routeCode ?? '');
  const [result, setResult] = useState<DocumentVerifyResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!routeCode) return;
    let active = true;
    verifyDocument(routeCode)
      .then((r) => { if (active) { setResult(r); setError(''); } })
      .catch((cause) => { if (active) setError(errorText(cause, 'تعذر التحقق الآن، حاول لاحقاً.')); });
    return () => { active = false; };
  }, [routeCode]);

  function submit() {
    const clean = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) return;
    setBusy(true); setResult(null); setError('');
    if (clean === routeCode) {
      verifyDocument(clean).then(setResult).catch((cause) => setError(errorText(cause, 'تعذر التحقق الآن، حاول لاحقاً.'))).finally(() => setBusy(false));
    } else {
      navigate(`/verify/${clean}`);
      setBusy(false);
    }
  }

  const colors = { VALID: '#1f8a5b', REVOKED: '#c0392b', NOT_FOUND: '#566a7e' } as const;
  const titles = { VALID: 'وثيقة صحيحة', REVOKED: 'وثيقة ملغاة', NOT_FOUND: 'الوثيقة غير موجودة' } as const;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, color: '#12263a' }}>
      <Paper sx={{ p: { xs: 2, sm: 4 }, width: '100%', maxWidth: 520, minWidth: 0 }}>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box component="img" src="/logo.png" alt="شعار جامعة المعالي" sx={{ height: 80 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>التحقق من وثيقة</Typography>
          <Typography color="text.secondary" variant="body2">أدخل رمز التحقق المطبوع على الوثيقة، أو امسح رمز QR.</Typography>
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <TextField size="small" fullWidth label="رمز التحقق" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 32 } }} />
            <Button variant="contained" onClick={submit} disabled={busy || !code.trim()}>تحقق</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
          {result && (
            <Box role="status" sx={{ width: '100%', border: 2, borderColor: colors[result.status], borderRadius: 2, p: 2, textAlign: 'start' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20, color: colors[result.status], textAlign: 'center' }}>{titles[result.status]}</Typography>
              {result.status !== 'NOT_FOUND' && (
                <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5, mt: 1, mb: 0 }}>
                  <Typography component="dt" color="text.secondary">رقم الوثيقة</Typography><Typography component="dd" sx={{ m: 0 }} dir="ltr">{result.number}</Typography>
                  <Typography component="dt" color="text.secondary">النوع</Typography><Typography component="dd" sx={{ m: 0 }}>{result.typeName}</Typography>
                  <Typography component="dt" color="text.secondary">الجهة المصدرة</Typography><Typography component="dd" sx={{ m: 0 }}>{result.issuingBody}</Typography>
                  <Typography component="dt" color="text.secondary">صاحب الوثيقة</Typography><Typography component="dd" sx={{ m: 0 }}>{result.studentName}</Typography>
                  <Typography component="dt" color="text.secondary">تاريخ الإصدار</Typography><Typography component="dd" sx={{ m: 0 }}>{formatDate(result.issuedAt)}</Typography>
                  {result.revokedAt && (<><Typography component="dt" color="text.secondary">تاريخ الإلغاء</Typography><Typography component="dd" sx={{ m: 0 }}>{formatDate(result.revokedAt)}</Typography></>)}
                </Box>
              )}
              {result.status === 'NOT_FOUND' && <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>تأكد من الرمز. إذا استمرت المشكلة فالوثيقة غير صادرة عن الجامعة.</Typography>}
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
