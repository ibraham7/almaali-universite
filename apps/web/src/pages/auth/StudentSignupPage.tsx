import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, CircularProgress, Link as MuiLink, Paper, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { completeStudentSignupRequest, studentSignupRequest } from '../../api/auth';

const initialData = { universityId: '', fullName: '', fatherName: '', motherName: '', nationalId: '', applicationNumber: '', birthPlace: '' };

export default function StudentSignupPage() {
  const [data, setData] = useState(initialData);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof data) => (event: React.ChangeEvent<HTMLInputElement>) => setData((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (verificationToken && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    try {
      if (verificationToken) {
        await completeStudentSignupRequest({ verificationToken, password });
        setSubmitted(true);
      } else {
        const response = await studentSignupRequest(data);
        setVerificationToken(response.verificationToken);
      }
    } catch (requestError) {
      const responseData = (requestError as { response?: { data?: { mismatchedFields?: string[]; invalidFields?: string[] } } }).response?.data;
      if (!verificationToken && responseData?.mismatchedFields?.length) {
        setError(`تحقق من الحقول التالية: ${responseData.mismatchedFields.join('، ')}.`);
      } else if (!verificationToken && responseData?.invalidFields?.length) {
        setError(`صحح الحقول التالية: ${responseData.invalidFields.join('، ')}.`);
      } else {
        setError(verificationToken ? 'تعذر إنشاء الحساب. أعد التحقق من بيانات الطالب إذا انتهت المهلة.' : 'البيانات غير مطابقة لسجل طالب غير مسجل. راجع البيانات وحاول مجددًا.');
      }
    } finally {
      setLoading(false);
    }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F4F7FA', p: 2 }}>
    <Paper component="form" onSubmit={submit} elevation={0} sx={{ width: '100%', maxWidth: 600, p: { xs: 3, sm: 5 }, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h4" sx={{ mb: 1 }}>إنشاء حساب طالب</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>{verificationToken ? `تم التحقق من بياناتك. اختر كلمة مرور للرقم الجامعي ${data.universityId}.` : 'أدخل بياناتك كما هي في سجل الجامعة للتحقق من هويتك.'}</Typography>
      {submitted ? <Alert severity="success">تم إنشاء الحساب. استخدم الرقم الجامعي وكلمة المرور لتسجيل الدخول.</Alert> : <>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {verificationToken ? <>
          <TextField label="كلمة المرور (12 حرفًا على الأقل)" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required fullWidth sx={{ mb: 2 }} slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} />
          <TextField label="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required fullWidth slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} />
          <Button variant="text" onClick={() => { setVerificationToken(''); setPassword(''); setConfirmPassword(''); setError(''); }} sx={{ mt: 2 }}>تعديل بيانات التحقق</Button>
        </> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label="الرقم الجامعي" value={data.universityId} onChange={set('universityId')} required />
          <TextField label="اسم الطالب كما في السجل" value={data.fullName} onChange={set('fullName')} required helperText="أدخل الاسم بالحروف كما ورد في ملف الجامعة." />
          <TextField label="اسم الأب" value={data.fatherName} onChange={set('fatherName')} required helperText="حروف ومسافات وشرطة أو فاصلة عليا فقط." />
          <TextField label="اسم الأم" value={data.motherName} onChange={set('motherName')} required helperText="حروف ومسافات وشرطة أو فاصلة عليا فقط." />
          <TextField label="الرقم الوطني" value={data.nationalId} onChange={set('nationalId')} required helperText="أرقام فقط؛ تُقبل الأرقام العربية أو الإنجليزية." slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9٠-٩۰-۹]+' } }} />
          <TextField label="رقم الاكتتاب" value={data.applicationNumber} onChange={set('applicationNumber')} required helperText="أرقام فقط؛ تُقبل الأرقام العربية أو الإنجليزية." slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9٠-٩۰-۹]+' } }} />
          <TextField label="مكان الولادة" value={data.birthPlace} onChange={set('birthPlace')} required helperText="اكتبه كما ورد في سجل الجامعة." />
        </Box>}
        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, minHeight: 48 }}>{loading ? <CircularProgress size={22} color="inherit" /> : verificationToken ? 'إنشاء الحساب' : 'التحقق من بياناتي'}</Button>
      </>}
      <MuiLink component={Link} to="/login" underline="hover" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>العودة إلى تسجيل الدخول</MuiLink>
    </Paper>
  </Box>;
}
