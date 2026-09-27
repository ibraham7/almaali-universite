import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, CircularProgress, Link as MuiLink, Paper, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { studentSignupRequest } from '../../api/auth';

export default function StudentSignupPage() {
  const [data, setData] = useState({ universityId: '', firstName: '', middleName: '', familyName: '', dateOfBirth: '', idOrPassport: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof data) => (event: React.ChangeEvent<HTMLInputElement>) => setData((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (data.password !== data.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    try {
      await studentSignupRequest({ ...data, email: data.email.trim(), dateOfBirth: data.dateOfBirth || undefined, idOrPassport: data.idOrPassport || undefined, middleName: data.middleName || undefined });
      setSubmitted(true);
    } catch {
      setError('تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى لاحقًا.');
    } finally {
      setLoading(false);
    }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F4F7FA', p: 2 }}>
    <Paper component="form" onSubmit={submit} elevation={0} sx={{ width: '100%', maxWidth: 600, p: { xs: 3, sm: 5 }, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h4" sx={{ mb: 1 }}>إنشاء حساب طالب</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>أدخل البيانات كما هي مسجلة لدى الجامعة. إذا كانت بيانات الميلاد أو الهوية محفوظة لدى الجامعة فستُستخدم ضمن المطابقة.</Typography>
      {submitted ? <Alert severity="success" sx={{ mb: 2 }}>إذا كانت البيانات مطابقة لسجل الجامعة، فسيُنشأ الحساب بعد مراجعة الإدارة. يمكنك العودة إلى صفحة الدخول.</Alert> : <>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label="الرقم الجامعي" value={data.universityId} onChange={set('universityId')} required />
          <TextField label="الاسم الأول" value={data.firstName} onChange={set('firstName')} required />
          <TextField label="اسم الأب (إن وجد)" value={data.middleName} onChange={set('middleName')} />
          <TextField label="اسم العائلة" value={data.familyName} onChange={set('familyName')} required />
          <TextField label="تاريخ الميلاد (إن كان مسجلًا)" type="date" value={data.dateOfBirth} onChange={set('dateOfBirth')} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="رقم الهوية أو جواز السفر (إن كان مسجلًا)" value={data.idOrPassport} onChange={set('idOrPassport')} />
          <TextField label="البريد الإلكتروني" type="email" value={data.email} onChange={set('email')} required />
          <TextField label="كلمة المرور (12 حرفًا على الأقل)" type="password" value={data.password} onChange={set('password')} autoComplete="new-password" required slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} />
          <TextField label="تأكيد كلمة المرور" type="password" value={data.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" required slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} sx={{ gridColumn: { sm: '1 / -1' } }} />
        </Box>
        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, minHeight: 48 }}>{loading ? <CircularProgress size={22} color="inherit" /> : 'إرسال طلب إنشاء الحساب'}</Button>
      </>}
      <MuiLink component={Link} to="/login" underline="hover" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>العودة إلى تسجيل الدخول</MuiLink>
    </Paper>
  </Box>;
}
