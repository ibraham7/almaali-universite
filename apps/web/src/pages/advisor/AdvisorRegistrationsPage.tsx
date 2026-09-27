import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import {
  advisorAddRegistrationCourse,
  advisorCancelRegistration,
  advisorRemoveRegistrationCourse,
  getAdvisorAvailableCourses,
  getMyAdvisorApprovals,
  updateAdvisorApproval,
  type AdvisorApproval,
  type AdvisorAvailableCourse,
} from '../../api/advisorApprovals';

type Decision = 'APPROVED' | 'REJECTED';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; errors?: string[] }
      | undefined;

    if (data?.errors?.length) return data.errors.join('، ');
    if (Array.isArray(data?.message)) return data.message.join('، ');
    if (typeof data?.message === 'string') return data.message;
  }

  return 'حدث خطأ غير متوقع.';
}

function studentName(approval: AdvisorApproval) {
  const student = approval.enrollment.student;
  return [student.firstName, student.middleName, student.familyName]
    .filter(Boolean)
    .join(' ');
}

function statusLabel(status: AdvisorApproval['status']) {
  switch (status) {
    case 'PENDING': return 'معلق';
    case 'APPROVED': return 'مقبول';
    case 'REJECTED': return 'مرفوض';
  }
}

export default function AdvisorRegistrationsPage() {
  const [approvals, setApprovals] = useState<AdvisorApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<AdvisorApproval | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [cancelTarget, setCancelTarget] = useState<AdvisorApproval | null>(null);

  const [addTarget, setAddTarget] = useState<AdvisorApproval | null>(null);
  const [availableCourses, setAvailableCourses] = useState<AdvisorAvailableCourse[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApprovals(await getMyAdvisorApprovals());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => approvals.filter((item) => item.status === 'PENDING').length,
    [approvals],
  );

  const selectedAvailableCourse = useMemo(
    () => availableCourses.find((course) => course.id === selectedCourseId) ?? null,
    [availableCourses, selectedCourseId],
  );

  const openDecision = (approval: AdvisorApproval, value: Decision) => {
    setSelected(approval);
    setDecision(value);
    setNote('');
  };

  const openAddCourse = async (approval: AdvisorApproval) => {
    setAddTarget(approval);
    setAvailableCourses([]);
    setSelectedCourseId('');
    setSelectedSectionId('');
    setAvailableLoading(true);
    setError('');

    try {
      setAvailableCourses(await getAdvisorAvailableCourses(approval.id));
    } catch (err) {
      setError(getErrorMessage(err));
      setAddTarget(null);
    } finally {
      setAvailableLoading(false);
    }
  };

  const addCourse = async () => {
    if (!addTarget || !selectedCourseId || !selectedSectionId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await advisorAddRegistrationCourse(addTarget.id, {
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
      });
      setSuccess('تمت إضافة المقرر إلى تسجيل الطالب.');
      setAddTarget(null);
      setSelectedCourseId('');
      setSelectedSectionId('');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!selected || !decision) return;

    if (decision === 'REJECTED' && !note.trim()) {
      setError('سبب الرفض مطلوب.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateAdvisorApproval(selected.id, {
        status: decision,
        note: note.trim() || undefined,
      });

      setSuccess(
        decision === 'APPROVED'
          ? 'تمت الموافقة على التسجيل.'
          : 'تم رفض التسجيل.',
      );

      setSelected(null);
      setDecision(null);
      setNote('');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (
    approval: AdvisorApproval,
    enrollmentItemId: string,
  ) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await advisorRemoveRegistrationCourse(approval.id, enrollmentItemId);
      setSuccess('تم حذف المقرر من تسجيل الطالب.');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const cancelRegistration = async () => {
    if (!cancelTarget) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await advisorCancelRegistration(cancelTarget.id, note.trim() || undefined);
      setSuccess('تم إلغاء تسجيل الطالب.');
      setCancelTarget(null);
      setNote('');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4">طلبات تسجيل الطلاب</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            مراجعة التسجيلات وتعديلها والموافقة عليها أو رفضها.
          </Typography>
        </Box>

        <Stack direction="row" sx={{ gap: 1 }}>
          <Chip color="warning" label={`${pendingCount} طلبات معلقة`} />
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => void loadData()}
          >
            تحديث
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent sx={{ minHeight: 230, display: 'grid', placeItems: 'center' }}>
            لا توجد طلبات تسجيل.
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {approvals.map((approval) => {
            const student = approval.enrollment.student;
            const totalCredits = approval.enrollment.items.reduce(
              (total, item) => total + item.course.credits,
              0,
            );

            const academicDetails = [
              { label: 'الكلية', value: student.college?.nameAr },
              { label: 'التخصص', value: student.program?.nameAr ?? student.department?.nameAr },
              { label: 'الخطة الدراسية', value: student.studyPlan?.nameAr },
              { label: 'السنة / المستوى', value: student.academicYear?.nameAr },
              { label: 'الفصل', value: student.semester?.nameAr },
            ].filter((item) => Boolean(item.value));

            return (
              <Card key={approval.id}>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    sx={{ justifyContent: 'space-between', gap: 2 }}
                  >
                    <Box>
                      <Typography variant="h6">{studentName(approval)}</Typography>
                      <Typography color="text.secondary">
                        الرقم الجامعي: {student.universityId}
                      </Typography>
                    </Box>

                    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`${approval.enrollment.items.length} مقررات`} />
                      <Chip label={`${totalCredits} ساعات`} />
                      <Chip
                        color={
                          approval.status === 'PENDING'
                            ? 'warning'
                            : approval.status === 'APPROVED'
                              ? 'success'
                              : 'error'
                        }
                        label={statusLabel(approval.status)}
                      />
                    </Stack>
                  </Stack>

                  {academicDetails.length > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))',
                          lg: 'repeat(5, minmax(0, 1fr))',
                        },
                        gap: 1.2,
                      }}
                    >
                      {academicDetails.map((item) => (
                        <Box
                          key={item.label}
                          sx={{ p: 1.4, borderRadius: 2, bgcolor: 'action.hover' }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1}>
                    {approval.enrollment.items.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.5,
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.course.code} — {item.course.nameAr}
                          </Typography>
                          <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                            الشعبة {item.section.sectionNumber}
                            {' • '}{item.course.credits} ساعات
                            {' • '}{item.section.teacher?.name ?? 'بدون مدرس'}
                          </Typography>
                        </Box>

                        {approval.status === 'PENDING' && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={saving}
                            startIcon={<DeleteOutlineRoundedIcon />}
                            onClick={() => void removeCourse(approval, item.id)}
                          >
                            حذف
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Stack>

                  {approval.note && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {approval.note}
                    </Alert>
                  )}

                  {approval.status === 'PENDING' && (
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      sx={{ justifyContent: 'flex-end', gap: 1, mt: 2 }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<AddRoundedIcon />}
                        disabled={saving}
                        onClick={() => void openAddCourse(approval)}
                      >
                        إضافة مادة
                      </Button>

                      <Button
                        color="error"
                        variant="text"
                        startIcon={<CancelOutlinedIcon />}
                        onClick={() => {
                          setCancelTarget(approval);
                          setNote('');
                        }}
                      >
                        إلغاء التسجيل
                      </Button>

                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<CloseRoundedIcon />}
                        onClick={() => openDecision(approval, 'REJECTED')}
                      >
                        رفض
                      </Button>

                      <Button
                        color="success"
                        variant="contained"
                        startIcon={<CheckCircleOutlineRoundedIcon />}
                        onClick={() => openDecision(approval, 'APPROVED')}
                      >
                        موافقة
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog
        open={Boolean(addTarget)}
        onClose={() => !saving && setAddTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>إضافة مادة إلى تسجيل الطالب</DialogTitle>
        <DialogContent dividers>
          {availableLoading ? (
            <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : availableCourses.length === 0 ? (
            <Alert severity="info">
              لا توجد مقررات إضافية متاحة لهذا الطالب حاليًا.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>المقرر</InputLabel>
                <Select
                  label="المقرر"
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value);
                    setSelectedSectionId('');
                  }}
                >
                  {availableCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.code} — {course.nameAr} — {course.academicYear.nameAr} — {course.semester.nameAr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!selectedAvailableCourse}>
                <InputLabel>الشعبة</InputLabel>
                <Select
                  label="الشعبة"
                  value={selectedSectionId}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                >
                  {selectedAvailableCourse?.sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      الشعبة {section.sectionNumber} — {section.enrolledCount}/{section.maxCapacity}
                      {section.teacher?.name ? ` — ${section.teacher.name}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedAvailableCourse && (
                <Alert severity="info">
                  {selectedAvailableCourse.academicYear.nameAr} • {selectedAvailableCourse.semester.nameAr} • {selectedAvailableCourse.credits} ساعات
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setAddTarget(null)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              availableLoading ||
              !selectedCourseId ||
              !selectedSectionId
            }
            onClick={() => void addCourse()}
          >
            إضافة المادة
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onClose={() => !saving && setSelected(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {decision === 'APPROVED' ? 'تأكيد الموافقة' : 'رفض التسجيل'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            label={decision === 'REJECTED' ? 'سبب الرفض' : 'ملاحظة اختيارية'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setSelected(null)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color={decision === 'APPROVED' ? 'success' : 'error'}
            disabled={saving}
            onClick={() => void submit()}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => !saving && setCancelTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>إلغاء تسجيل الطالب</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم حذف جميع المقررات من التسجيل وإلغاء الطلب بالكامل.
          </Alert>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="سبب الإلغاء أو ملاحظة"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setCancelTarget(null)}>
            رجوع
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => void cancelRegistration()}
          >
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
