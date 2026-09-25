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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  createRegistrationPeriod,
  getRegistrationPeriodsBySemester,
  removeRegistrationPeriod,
  updateRegistrationPeriod,
  type RegistrationPeriod,
} from '../../api/registrationPeriods';

import {
  getAcademicLevels,
  getSemesters,
  getStudyPlans,
  type AcademicLevel,
  type Semester,
  type StudyPlan,
} from '../../api/studyPlan';

type PeriodForm = {
  startDateTime: string;
  endDateTime: string;
  minCredits: string;
  maxCredits: string;
  advisorApprovalRequired: boolean;
  dropAllowed: boolean;
  addDropDeadline: string;
};

const emptyForm: PeriodForm = {
  startDateTime: '',
  endDateTime: '',
  minCredits: '0',
  maxCredits: '18',
  advisorApprovalRequired: true,
  dropAllowed: true,
  addDropDeadline: '',
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join('، ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع.';
}

function toLocalInputValue(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number: number) =>
    String(number).padStart(2, '0');

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'غير محدد';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function RegistrationPeriodsPage() {
  const [studyPlans, setStudyPlans] =
    useState<StudyPlan[]>([]);
  const [levels, setLevels] =
    useState<AcademicLevel[]>([]);
  const [semesters, setSemesters] =
    useState<Semester[]>([]);
  const [periods, setPeriods] =
    useState<RegistrationPeriod[]>([]);

  const [studyPlanId, setStudyPlanId] =
    useState('');
  const [academicYearId, setAcademicYearId] =
    useState('');
  const [semesterId, setSemesterId] =
    useState('');

  const [loading, setLoading] =
    useState(true);
  const [periodsLoading, setPeriodsLoading] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editingPeriod, setEditingPeriod] =
    useState<RegistrationPeriod | null>(null);
  const [form, setForm] =
    useState<PeriodForm>(emptyForm);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const plans = await getStudyPlans();

        if (!active) return;

        setStudyPlans(plans);
        setStudyPlanId(plans[0]?.id ?? '');
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!studyPlanId) {
      setLevels([]);
      setAcademicYearId('');
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const data =
          await getAcademicLevels(studyPlanId);

        if (!active) return;

        setLevels(data);
        setAcademicYearId(data[0]?.id ?? '');
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [studyPlanId]);

  useEffect(() => {
    if (!academicYearId) {
      setSemesters([]);
      setSemesterId('');
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const data =
          await getSemesters(academicYearId);

        if (!active) return;

        setSemesters(data);
        setSemesterId(data[0]?.id ?? '');
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [academicYearId]);

  const loadPeriods = useCallback(async () => {
    if (!semesterId) {
      setPeriods([]);
      return;
    }

    setPeriodsLoading(true);
    setError('');

    try {
      const data =
        await getRegistrationPeriodsBySemester(
          semesterId,
        );

      setPeriods(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPeriodsLoading(false);
    }
  }, [semesterId]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const openCreateDialog = () => {
    setEditingPeriod(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const openEditDialog = (
    period: RegistrationPeriod,
  ) => {
    setEditingPeriod(period);
    setForm({
      startDateTime: toLocalInputValue(
        period.startDateTime,
      ),
      endDateTime: toLocalInputValue(
        period.endDateTime,
      ),
      minCredits: String(period.minCredits),
      maxCredits: String(period.maxCredits),
      advisorApprovalRequired:
        period.advisorApprovalRequired,
      dropAllowed: period.dropAllowed,
      addDropDeadline: toLocalInputValue(
        period.addDropDeadline,
      ),
    });
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!semesterId) {
      setError('اختر الفصل الدراسي أولًا.');
      return;
    }

    if (!form.startDateTime || !form.endDateTime) {
      setError(
        'بداية ونهاية فترة التسجيل مطلوبتان.',
      );
      return;
    }

    const minCredits = Number(form.minCredits);
    const maxCredits = Number(form.maxCredits);

    if (
      !Number.isInteger(minCredits) ||
      minCredits < 0 ||
      !Number.isInteger(maxCredits) ||
      maxCredits < 1
    ) {
      setError('تحقق من حدود الساعات.');
      return;
    }

    if (minCredits > maxCredits) {
      setError(
        'الحد الأدنى للساعات لا يمكن أن يكون أكبر من الحد الأقصى.',
      );
      return;
    }

    const start = new Date(form.startDateTime);
    const end = new Date(form.endDateTime);

    if (end <= start) {
      setError(
        'نهاية التسجيل يجب أن تكون بعد البداية.',
      );
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        semesterId,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        minCredits,
        maxCredits,
        advisorApprovalRequired:
          form.advisorApprovalRequired,
        dropAllowed: form.dropAllowed,
        addDropDeadline: form.addDropDeadline
          ? new Date(
              form.addDropDeadline,
            ).toISOString()
          : null,
      };

      if (editingPeriod) {
        await updateRegistrationPeriod(
          editingPeriod.id,
          payload,
        );
        setSuccess(
          'تم تحديث فترة التسجيل بنجاح.',
        );
      } else {
        await createRegistrationPeriod(payload);
        setSuccess(
          'تم إنشاء فترة التسجيل بنجاح.',
        );
      }

      setDialogOpen(false);
      setEditingPeriod(null);
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (
    period: RegistrationPeriod,
  ) => {
    const confirmed = window.confirm(
      `هل تريد حذف فترة التسجيل التي تبدأ في ${formatDateTime(
        period.startDateTime,
      )}؟`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await removeRegistrationPeriod(period.id);
      setSuccess(
        'تم حذف فترة التسجيل بنجاح.',
      );
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 350,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          justifyContent: 'space-between',
          alignItems: {
            xs: 'stretch',
            md: 'center',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontSize: {
                xs: 25,
                md: 30,
              },
              mb: 0.8,
            }}
          >
            فترات التسجيل
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ fontSize: 14 }}
          >
            تحديد مواعيد التسجيل وحدود الساعات
            وسياسة موافقة المرشد والإضافة والحذف.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          disabled={!semesterId || actionLoading}
          onClick={openCreateDialog}
        >
          إضافة فترة تسجيل
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            sx={{ mb: 2.5 }}
          >
            تحديد الفصل
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>
                الخطة الدراسية
              </InputLabel>
              <Select
                value={studyPlanId}
                label="الخطة الدراسية"
                onChange={(event) =>
                  setStudyPlanId(
                    event.target.value,
                  )
                }
              >
                {studyPlans.map((plan) => (
                  <MenuItem
                    key={plan.id}
                    value={plan.id}
                  >
                    {plan.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              disabled={!studyPlanId}
            >
              <InputLabel>المستوى</InputLabel>
              <Select
                value={academicYearId}
                label="المستوى"
                onChange={(event) =>
                  setAcademicYearId(
                    event.target.value,
                  )
                }
              >
                {levels.map((level) => (
                  <MenuItem
                    key={level.id}
                    value={level.id}
                  >
                    {level.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              disabled={!academicYearId}
            >
              <InputLabel>الفصل</InputLabel>
              <Select
                value={semesterId}
                label="الفصل"
                onChange={(event) =>
                  setSemesterId(
                    event.target.value,
                  )
                }
              >
                {semesters.map((semester) => (
                  <MenuItem
                    key={semester.id}
                    value={semester.id}
                  >
                    {semester.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            <Typography variant="h6">
              الفترات
            </Typography>

            <Chip
              variant="outlined"
              label={`${periods.length} فترة`}
            />
          </Box>

          {periodsLoading ? (
            <Box
              sx={{
                minHeight: 220,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : periods.length === 0 ? (
            <Box
              sx={{
                minHeight: 220,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography variant="h6">
                  لا توجد فترة تسجيل
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5, fontSize: 13 }}
                >
                  أضف فترة تسجيل لهذا الفصل.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {periods.map((period) => (
                <Box
                  key={period.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: {
                        xs: 'column',
                        md: 'row',
                      },
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{ fontWeight: 700 }}
                      >
                        {formatDateTime(
                          period.startDateTime,
                        )}
                        {' — '}
                        {formatDateTime(
                          period.endDateTime,
                        )}
                      </Typography>

                      <Stack
                        direction="row"
                        sx={{
                          gap: 1,
                          flexWrap: 'wrap',
                          mt: 1.3,
                        }}
                      >
                        <Chip
                          size="small"
                          label={`الساعات ${period.minCredits} - ${period.maxCredits}`}
                        />

                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            period.advisorApprovalRequired
                              ? 'موافقة المرشد مطلوبة'
                              : 'لا تتطلب موافقة المرشد'
                          }
                        />

                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            period.dropAllowed
                              ? 'الحذف مسموح'
                              : 'الحذف غير مسموح'
                          }
                        />

                        {period.addDropDeadline && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`نهاية الإضافة والحذف: ${formatDateTime(
                              period.addDropDeadline,
                            )}`}
                          />
                        )}
                      </Stack>
                    </Box>

                    <Stack
                      direction="row"
                      sx={{
                        gap: 0.5,
                        alignSelf: {
                          xs: 'flex-end',
                          md: 'center',
                        },
                      }}
                    >
                      <IconButton
                        disabled={actionLoading}
                        onClick={() =>
                          openEditDialog(period)
                        }
                      >
                        <EditOutlinedIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        disabled={actionLoading}
                        onClick={() =>
                          void handleDelete(period)
                        }
                      >
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!actionLoading) {
            setDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingPeriod
            ? 'تعديل فترة التسجيل'
            : 'إضافة فترة تسجيل'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.2} sx={{ pt: 1 }}>
            <TextField
              type="datetime-local"
              label="بداية التسجيل"
              value={form.startDateTime}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startDateTime:
                    event.target.value,
                }))
              }
            />

            <TextField
              type="datetime-local"
              label="نهاية التسجيل"
              value={form.endDateTime}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endDateTime:
                    event.target.value,
                }))
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <TextField
                type="number"
                label="الحد الأدنى للساعات"
                value={form.minCredits}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minCredits:
                      event.target.value,
                  }))
                }
              />

              <TextField
                type="number"
                label="الحد الأقصى للساعات"
                value={form.maxCredits}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxCredits:
                      event.target.value,
                  }))
                }
              />
            </Box>

            <TextField
              type="datetime-local"
              label="موعد انتهاء الإضافة والحذف"
              value={form.addDropDeadline}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  addDropDeadline:
                    event.target.value,
                }))
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    form.advisorApprovalRequired
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      advisorApprovalRequired:
                        event.target.checked,
                    }))
                  }
                />
              }
              label="تتطلب موافقة المرشد الأكاديمي"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.dropAllowed}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dropAllowed:
                        event.target.checked,
                    }))
                  }
                />
              }
              label="السماح بحذف المقررات"
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{ px: 3, pb: 2.5 }}
        >
          <Button
            disabled={actionLoading}
            onClick={() =>
              setDialogOpen(false)
            }
          >
            إلغاء
          </Button>

          <Button
            variant="contained"
            disabled={actionLoading}
            onClick={() =>
              void handleSave()
            }
          >
            {actionLoading
              ? 'جارٍ الحفظ...'
              : editingPeriod
                ? 'حفظ التعديلات'
                : 'إضافة الفترة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
