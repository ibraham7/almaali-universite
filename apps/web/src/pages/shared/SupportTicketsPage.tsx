import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

type Ticket = { id: string; category: string; title: string; description: string; imageData?: string | null; status: string; createdAt: string; messages: { id: string; body: string; authorId: string; createdAt: string }[]; _count?: { messages: number } };
const statuses: Record<string, string> = { NEW: 'جديدة', ACKNOWLEDGED: 'تمت قراءتها', IN_PROGRESS: 'جارٍ العمل عليها', RESOLVED: 'تم الحل' };
const categories: Record<string, string> = { PROBLEM: 'مشكلة', SUGGESTION: 'اقتراح', CHANGE: 'طلب تعديل', OTHER: 'أخرى' };

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PROBLEM');
  const [imageData, setImageData] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.get<Ticket[]>('/support-tickets', { params: { page } });
      setTickets(response.data);
    } catch { setError('تعذر تحميل التذاكر.'); }
  }, [page]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function open(ticketId: string) {
    try {
      const response = await apiClient.get<Ticket>(`/support-tickets/${ticketId}`);
      setSelected(response.data);
    } catch { setError('تعذر تحميل التذكرة.'); }
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) { setImageData(''); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 250000) {
      setError('اختر صورة PNG أو JPEG أو WebP بحجم أقل من 250 كيلوبايت.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await apiClient.post<Ticket>('/support-tickets', { title, description, category, imageData: imageData || undefined });
      setTitle(''); setDescription(''); setImageData('');
      await refresh(); await open(response.data.id);
    } catch { setError('تعذر إنشاء التذكرة. تحقق من البيانات وحاول لاحقًا.'); }
    finally { setBusy(false); }
  }
  async function sendComment(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError('');
    try { await apiClient.post(`/support-tickets/${selected.id}/messages`, { body: comment }); setComment(''); await open(selected.id); await refresh(); }
    catch { setError('تعذر إرسال الرد.'); } finally { setBusy(false); }
  }
  async function changeStatus(status: string) {
    if (!selected) return; setBusy(true); setError('');
    try { await apiClient.patch(`/support-tickets/${selected.id}/status`, { status }); await open(selected.id); await refresh(); }
    catch { setError('تعذر تغيير الحالة.'); } finally { setBusy(false); }
  }
  return <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, md: 3 } }}>
    <Typography variant="h4" sx={{ mb: 1 }}>المشكلات والاقتراحات</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>التذاكر وردودها ظاهرة لجميع مستخدمي النظام. لا تكتب بيانات شخصية أو كلمات مرور في الوصف أو الصورة.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    <Card sx={{ mb: 3 }}><CardContent component="form" onSubmit={create}>
      <Typography variant="h6" sx={{ mb: 2 }}>تذكرة جديدة</Typography>
      <Stack spacing={2}>
        <TextField select label="النوع" value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categories).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
        <TextField label="العنوان" value={title} onChange={(event) => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} required />
        <TextField label="شرح المشكلة أو الاقتراح" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 3000 } }} required />
        <Button component="label" variant="outlined">{imageData ? 'تم اختيار صورة' : 'إرفاق صورة اختيارية'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadImage(event)} /></Button>
        <Button type="submit" variant="contained" disabled={busy || title.trim().length < 5 || description.trim().length < 10}>{busy ? <CircularProgress size={20} /> : 'إنشاء التذكرة'}</Button>
      </Stack>
    </CardContent></Card>
    {selected && <Card sx={{ mb: 3 }}><CardContent>
      <Button onClick={() => setSelected(null)} sx={{ mb: 1 }}>العودة للقائمة</Button>
      <Typography variant="h5">{selected.title}</Typography>
      <Chip size="small" sx={{ my: 1 }} label={statuses[selected.status] ?? selected.status} />
      <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.description}</Typography>
      {selected.imageData && <Box component="img" src={selected.imageData} alt="مرفق التذكرة" sx={{ maxWidth: '100%', maxHeight: 400, mt: 2 }} />}
      {['REGISTRAR', 'SYSTEM_ADMIN'].includes(user?.role ?? '') && <TextField select size="small" label="حالة التذكرة" value={selected.status} onChange={(event) => void changeStatus(event.target.value)} disabled={busy} sx={{ display: 'block', mt: 2, maxWidth: 240 }}>{Object.entries(statuses).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>}
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>النقاش</Typography>
      {selected.messages.map((message) => <Box key={message.id} sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{message.authorId === user?.id ? 'أنت' : 'مستخدم النظام'} · {new Date(message.createdAt).toLocaleString('ar')}</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.body}</Typography></Box>)}
      <Box component="form" onSubmit={sendComment} sx={{ display: 'flex', gap: 1, mt: 2 }}><TextField label="اكتب ردًا" value={comment} onChange={(event) => setComment(event.target.value)} required fullWidth slotProps={{ htmlInput: { maxLength: 2000 } }} /><Button type="submit" variant="contained" disabled={busy || !comment.trim()}>إرسال</Button></Box>
    </CardContent></Card>}
    {!selected && <Stack spacing={1}>{tickets.map((ticket) => <Card key={ticket.id} onClick={() => void open(ticket.id)} sx={{ cursor: 'pointer' }}><CardContent><Typography variant="h6">{ticket.title}</Typography><Stack direction="row" spacing={1} sx={{ mt: 1 }}><Chip size="small" label={categories[ticket.category] ?? ticket.category} /><Chip size="small" label={statuses[ticket.status] ?? ticket.status} /><Typography variant="caption">{new Date(ticket.createdAt).toLocaleDateString('ar')} · {ticket._count?.messages ?? 0} ردود</Typography></Stack></CardContent></Card>)}<Button disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</Button><Button disabled={tickets.length < 30} onClick={() => setPage(page + 1)}>التالي</Button></Stack>}
  </Box>;
}
