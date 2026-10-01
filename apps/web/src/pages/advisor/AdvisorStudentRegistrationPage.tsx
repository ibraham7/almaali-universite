import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { apiClient } from '../../api/client';

type Section = { id: string; sectionNumber: string; status: string; enrolledCount: number; maxCapacity: number; teacher?: { name: string } | null };
type Catalog = {
  student: { id: string; universityId: string; name: string; programId: string | null };
  plan: { nameAr: string; programName: string; departmentName: string; collegeName: string };
  courses: Array<{
    id: string; courseId: string; academicYear: { nameAr: string; levelNumber: number }; semester: { id: string; nameAr: string };
    course: { id: string; code: string; nameAr: string; credits: number; sections: Section[] };
  }>;
};

export default function AdvisorStudentRegistrationPage() {
  const [universityId, setUniversityId] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function searchStudent(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setSuccess(''); setCatalog(null); setSelected({});
    try {
      const response = await apiClient.get<Catalog>(`/student-enrollments/advisor/${encodeURIComponent(universityId.trim())}/catalog`);
      setCatalog(response.data);
    } catch (requestError) {
      const data = (requestError as { response?: { data?: { message?: string | string[] } } }).response?.data;
      setError(Array.isArray(data?.message) ? data.message.join('، ') : data?.message ?? 'تعذر العثور على الطالب أو أن الطالب غير مسند إلى حسابك.');
    } finally { setLoading(false); }
  }

  async function register() {
    if (!catalog) return;
    const items = Object.entries(selected).map(([courseId, sectionId]) => ({ courseId, sectionId }));
    if (!items.length) { setError('اختر مادة واحدة على الأقل.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await apiClient.post('/student-enrollments/advisor/direct-register', { universityId: catalog.student.universityId, items });
      const result = response.data as { success?: boolean; errors?: string[]; status?: string };
      if (result.success === false) { setError(result.errors?.join('، ') ?? 'تعذر تسجيل المواد.'); return; }
      setSuccess('تم تسجيل المواد مباشرةً للطالب.'); setSelected({});
    } catch (requestError) {
      const data = (requestError as { response?: { data?: { message?: string | string[] } } }).response?.data;
      setError(Array.isArray(data?.message) ? data.message.join('، ') : data?.message ?? 'تعذر تسجيل المواد. راجع المقاعد والمتطلبات وفترة التسجيل.');
    } finally { setSaving(false); }
  }

  return <Box>
    <Typography variant="h4" sx={{ mb: 1 }}>تسجيل مواد لطالب</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>ابحث بالرقم الجامعي، ثم اختر مواد فصل واحد. عند الحفظ تُضاف مباشرةً ويُؤكد التسجيل بعد اجتياز قيود النظام.</Typography>
    <Card sx={{ mb: 3 }}><CardContent component="form" onSubmit={searchStudent}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField fullWidth label="الرقم الجامعي" value={universityId} onChange={(event) => setUniversityId(event.target.value)} required />
        <Button type="submit" variant="contained" disabled={loading || !universityId.trim()}>{loading ? <CircularProgress size={20} color="inherit" /> : 'بحث عن الطالب'}</Button>
      </Stack>
    </CardContent></Card>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
    {catalog && <>
      <Card sx={{ mb: 2 }}><CardContent>
        <Typography variant="h6">{catalog.student.name}</Typography>
        <Typography color="text.secondary">{catalog.student.universityId} · {catalog.plan.collegeName} · {catalog.plan.departmentName} · {catalog.plan.programName} · {catalog.plan.nameAr}</Typography>
      </CardContent></Card>
      {catalog.courses.map((placement) => {
        const availableSections = placement.course.sections.filter((section) => section.status === 'OPEN' && section.enrolledCount < section.maxCapacity);
        const checked = Boolean(selected[placement.course.id]);
        return <Card key={placement.id} sx={{ mb: 1.5, opacity: availableSections.length ? 1 : 0.65 }}><CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Checkbox checked={checked} disabled={!availableSections.length} onChange={(event) => setSelected((current) => {
              const next = { ...current };
              if (event.target.checked) next[placement.course.id] = availableSections[0].id;
              else delete next[placement.course.id];
              return next;
            })} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{placement.course.code} · {placement.course.nameAr}</Typography>
              <Typography variant="caption" color="text.secondary">{placement.academicYear.nameAr} · {placement.semester.nameAr} · {placement.course.credits} ساعات</Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }} disabled={!checked}>
              <InputLabel>الشعبة</InputLabel>
              <Select label="الشعبة" value={selected[placement.course.id] ?? ''} onChange={(event) => setSelected((current) => ({ ...current, [placement.course.id]: event.target.value }))}>
                {availableSections.map((section) => <MenuItem key={section.id} value={section.id}>{section.sectionNumber} · متاح {section.maxCapacity - section.enrolledCount}{section.teacher?.name ? ` · ${section.teacher.name}` : ''}</MenuItem>)}
              </Select>
            </FormControl>
            {!availableSections.length && <Typography variant="caption" color="error">لا توجد شعبة مفتوحة</Typography>}
          </Stack>
        </CardContent></Card>;
      })}
      <Button variant="contained" onClick={() => void register()} disabled={saving || Object.keys(selected).length === 0}>{saving ? <CircularProgress size={20} color="inherit" /> : `تسجيل ${Object.keys(selected).length} مادة مباشرةً`}</Button>
    </>}
  </Box>;
}
