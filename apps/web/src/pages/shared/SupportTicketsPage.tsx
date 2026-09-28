import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, ClickAwayListener, CircularProgress, Grow, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

type Ticket = { id: string; authorId: string; category: string; title: string; description: string; imageData?: string | null; status: string; createdAt: string; messages?: { id: string; body: string; authorId: string; createdAt: string }[] };
const statuses: Record<string, string> = { NEW: 'بانتظار المراجعة', IN_REVIEW: 'قيد المراجعة', ANSWERED: 'تم الرد عليها', ACKNOWLEDGED: 'قيد المراجعة', IN_PROGRESS: 'قيد المراجعة', RESOLVED: 'تم الرد عليها' };
const categories: Record<string, string> = { PROBLEM: 'مشكلة', SUGGESTION: 'اقتراح', CHANGE: 'طلب تعديل', OTHER: 'أخرى' };

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const isStaff = ['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN'].includes(user?.role ?? '');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const activeTicketId = useRef<string | null>(null);
  const requestSequence = useRef(0);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PROBLEM');
  const [imageData, setImageData] = useState('');
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.get<Ticket[]>('/support-tickets', { params: { page } });
      setTickets(response.data);
    } catch { setError('تعذر تحميل التذاكر.'); }
  }, [page]);
  useEffect(() => {
    void refresh();
    if (!isStaff) return;
    const timer = window.setInterval(() => { void refresh(); }, 10000);
    return () => window.clearInterval(timer);
  }, [refresh, isStaff]);
  async function open(ticketId: string) {
    const sequence = ++requestSequence.current;
    try {
      const response = await apiClient.get<Ticket>(`/support-tickets/${ticketId}`);
      if (sequence !== requestSequence.current) return;
      setSelected(response.data);
    } catch { if (sequence === requestSequence.current) setError('تعذر تحميل التذكرة.'); }
  }
  function closeDetails() {
    activeTicketId.current = null;
    requestSequence.current++;
    setSelected(null);
  }
  function toggle(ticketId: string) {
    if (activeTicketId.current === ticketId) {
      closeDetails();
      return;
    }
    activeTicketId.current = ticketId;
    setSelected(tickets.find((ticket) => ticket.id === ticketId) ?? null);
    void open(ticketId);
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
      await apiClient.post<Ticket>('/support-tickets', { title, description, category, imageData: imageData || undefined });
      setTitle(''); setDescription(''); setImageData('');
      activeTicketId.current = null; requestSequence.current++;
      setSelected(null); await refresh();
      setNotice('تم إرسال التذكرة إلى المشرف بنجاح.');
    } catch { setError('تعذر إنشاء التذكرة. تحقق من البيانات وحاول لاحقًا.'); }
    finally { setBusy(false); }
  }
  async function sendReply(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError('');
    try { await apiClient.post(`/support-tickets/${selected.id}/messages`, { body: reply.trim() }); setReply(''); await open(selected.id); await refresh(); setNotice('تم الرد على التذكرة.'); }
    catch { setError('تعذر إرسال الرد.'); } finally { setBusy(false); }
  }
  async function markReviewing() {
    if (!selected) return; setBusy(true); setError('');
    try { await apiClient.patch(`/support-tickets/${selected.id}/status`, { status: 'IN_REVIEW' }); await open(selected.id); await refresh(); setNotice('التذكرة قيد المراجعة.'); }
    catch { setError('تعذر تغيير الحالة.'); } finally { setBusy(false); }
  }
  const staffReply = selected?.messages?.filter((message) => message.authorId !== selected.authorId).at(-1);
  return <Box sx={{ maxWidth: 1500, mx: 'auto', p: { xs: 1, md: 3 } }}>
    <Typography variant="h4" sx={{ mb: 1 }}>{isStaff ? 'تذاكر الطلاب' : 'تذاكري'}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>{isStaff ? 'تظهر تذاكر الطلاب هنا فور إرسالها لمراجعتها والرد عليها.' : 'تذاكرك خاصة بك وبالمشرفين. يمكنك متابعة حالة كل تذكرة هنا.'}</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {!isStaff && <Card sx={{ mb: 3, borderRadius: 3 }}><CardContent component="form" onSubmit={create}>
      <Typography variant="h6" sx={{ mb: 2 }}>إرسال تذكرة جديدة</Typography>
      <Stack spacing={2}>
        <TextField select label="النوع" value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categories).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
        <TextField label="العنوان" value={title} onChange={(event) => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} helperText={title.trim().length < 5 ? 'اكتب عنوانًا من 5 أحرف على الأقل، مثل: مشكلة في التسجيل' : ' '} error={title.length > 0 && title.trim().length < 5} required />
        <TextField label="شرح المشكلة أو الاقتراح" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 3000 } }} helperText={description.trim().length < 10 ? 'اكتب شرحًا من 10 أحرف على الأقل.' : ' '} error={description.length > 0 && description.trim().length < 10} required />
        <Button component="label" variant="outlined">{imageData ? 'تم اختيار صورة' : 'إرفاق صورة اختيارية'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadImage(event)} /></Button>
        <Typography variant="caption" color="text.secondary">لا تكتب كلمات مرور أو معلومات شخصية في التذكرة أو الصورة. حجم الصورة الأقصى 250 كيلوبايت.</Typography>
        <Button type="submit" variant="contained" disabled={busy || title.trim().length < 5 || description.trim().length < 10}>{busy ? <CircularProgress size={20} /> : 'إنشاء التذكرة'}</Button>
      </Stack>
    </CardContent></Card>}
    <ClickAwayListener onClickAway={() => { if (activeTicketId.current) closeDetails(); }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: selected ? { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' } : 'minmax(0, 1fr)', gap: 2, alignItems: 'start', direction: 'rtl' }}>
    <Card sx={{ borderRadius: 3, overflow: 'hidden', minWidth: 0 }}><Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 540, '& th, & td': { p: 1.5, textAlign: 'right', borderBottom: '1px solid', borderColor: 'divider' } }}>
        <thead><tr><th>العنوان</th><th>النوع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
        <tbody>{tickets.map((ticket) => <tr key={ticket.id} role="button" tabIndex={0} aria-expanded={selected?.id === ticket.id} onClick={() => toggle(ticket.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(ticket.id); } }} style={{ cursor: 'pointer', background: selected?.id === ticket.id ? 'rgba(25, 118, 210, 0.08)' : undefined }}>
          <td><strong>{ticket.title}</strong></td><td>{categories[ticket.category] ?? ticket.category}</td>
          <td><Chip size="small" color={['ANSWERED', 'RESOLVED'].includes(ticket.status) ? 'success' : ticket.status === 'NEW' ? 'default' : 'info'} label={statuses[ticket.status] ?? ticket.status} /></td>
          <td>{new Date(ticket.createdAt).toLocaleDateString('ar')}</td>
        </tr>)}</tbody>
      </Box>
    </Box>
      {tickets.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>{isStaff ? 'لا توجد تذاكر واردة.' : 'لم ترسل تذاكر بعد.'}</Typography>}
      <Stack direction="row" sx={{ p: 1, justifyContent: 'center' }}><Button disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</Button><Button disabled={tickets.length < 30} onClick={() => setPage(page + 1)}>التالي</Button></Stack>
    </Card>
    <Grow in={Boolean(selected)} mountOnEnter unmountOnExit timeout={220} style={{ transformOrigin: 'center right' }}>
    <Card sx={{ borderRadius: 3, boxShadow: 3, minWidth: 0, maxHeight: { xs: 'none', lg: 'min(75vh, 760px)' }, overflowY: 'auto' }}><CardContent>
      {selected && <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box><Typography variant="h6">{selected.title}</Typography><Typography variant="caption" color="text.secondary">{categories[selected.category]} · {new Date(selected.createdAt).toLocaleString('ar')}</Typography></Box>
        <Chip size="small" color={['ANSWERED', 'RESOLVED'].includes(selected.status) ? 'success' : 'info'} label={statuses[selected.status] ?? selected.status} />
      </Stack>
      <Button size="small" onClick={closeDetails} sx={{ mt: 1 }}>إغلاق التفاصيل</Button>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>الوصف</Typography>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.description}</Box>
      {selected.imageData && <Box component="img" src={selected.imageData} alt="مرفق التذكرة" sx={{ maxWidth: '100%', maxHeight: 400, mt: 2, borderRadius: 2 }} />}
      {staffReply && <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><strong>رد المشرف:</strong> {staffReply.body}</Alert>}
      {isStaff && selected.status === 'NEW' && <Button variant="outlined" disabled={busy} onClick={() => void markReviewing()} sx={{ mt: 2 }}>بدء المراجعة</Button>}
      {isStaff && !['ANSWERED', 'RESOLVED'].includes(selected.status) && <Box component="form" onSubmit={sendReply} sx={{ mt: 2 }}><Stack spacing={1}><TextField label="رد المشرف على الطالب" value={reply} onChange={(event) => setReply(event.target.value)} multiline minRows={2} required slotProps={{ htmlInput: { maxLength: 2000 } }} /><Button type="submit" variant="contained" disabled={busy || !reply.trim()}>إرسال الرد</Button></Stack></Box>}
      </>}
    </CardContent></Card>
    </Grow>
    </Box>
    </ClickAwayListener>
    {notice && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
  </Box>;
}
