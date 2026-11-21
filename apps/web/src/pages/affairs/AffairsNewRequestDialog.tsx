import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { createAffairsRequest, getAffairsServices, searchAffairsStudents, type AffairsServiceItem } from '../../api/affairs';
import { errorText } from './affairsUi';

type StudentOption = { id: string; universityId: string; name: string };

// Mounted only while open, so every opening starts with a clean form.
export default function AffairsNewRequestDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (number: string) => void }) {
  const [services, setServices] = useState<AffairsServiceItem[]>([]);
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAffairsServices().then((items) => setServices(items.filter((s) => s.isActive))).catch(() => setError('تعذر تحميل الخدمات.'));
  }, []);

  async function search(text: string) {
    if (text.trim().length < 2) { setOptions([]); return; }
    try { setOptions(await searchAffairsStudents(text.trim())); } catch { setOptions([]); }
  }

  async function submit() {
    if (!student || !serviceId) return;
    setBusy(true); setError('');
    try {
      const created = await createAffairsRequest({ studentId: student.id, serviceId, subject: subject.trim() || undefined, details: details.trim() || undefined });
      onCreated(created.number);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="affairs-new-title">
      <DialogTitle id="affairs-new-title">طلب جديد بالنيابة عن طالب</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={options} value={student} onChange={(_, value) => setStudent(value)} filterOptions={(x) => x}
            getOptionLabel={(option) => `${option.universityId} — ${option.name}`} isOptionEqualToValue={(a, b) => a.id === b.id}
            onInputChange={(_, text, reason) => { if (reason === 'input') void search(text); }}
            noOptionsText="اكتب الرقم الجامعي أو الاسم (حرفان على الأقل)"
            renderInput={(params) => <TextField {...params} label="الطالب (الرقم الجامعي أو الاسم)" />}
          />
          <TextField select label="الخدمة" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>)}
          </TextField>
          <TextField label="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <TextField label="التفاصيل" multiline minRows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !student || !serviceId}>تقديم الطلب</Button>
      </DialogActions>
    </Dialog>
  );
}
