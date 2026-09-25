import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GradingRoundedIcon from '@mui/icons-material/GradingRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import {
  universityColors,
} from '../../theme/theme';

import {
  getUniversities,
  type University,
} from '../../api/university';

import {
  createGradeScale,
  deleteGradeScale,
  getGradeScales,
  updateGradeScale,
  type GradeScale,
} from '../../api/gradeScales';

interface FormState {
  label: string;
  minScore: string;
  maxScore: string;
  gradePoint: string;
  passed: boolean;
  isActive: boolean;
}

const emptyForm: FormState = {
  label: '',
  minScore: '',
  maxScore: '',
  gradePoint: '',
  passed: true,
  isActive: true,
};

function getErrorMessage(
  error: unknown,
) {
  if (
    axios.isAxiosError(
      error,
    )
  ) {
    const data =
      error.response?.data as
        | {
            message?:
              | string
              | string[];
          }
        | undefined;

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message.join(
        '، ',
      );
    }

    if (
      typeof data?.message ===
      'string'
    ) {
      return data.message;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع.';
}

export default function GradeScalePage() {
  const [
    universities,
    setUniversities,
  ] =
    useState<University[]>([]);

  const [
    universityId,
    setUniversityId,
  ] =
    useState('');

  const [
    scales,
    setScales,
  ] =
    useState<GradeScale[]>([]);

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      emptyForm,
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const loadScales =
    useCallback(
      async (
        selectedUniversityId: string,
      ) => {
        if (
          !selectedUniversityId
        ) {
          setScales([]);
          return;
        }

        const data =
          await getGradeScales(
            selectedUniversityId,
          );

        setScales(data);
      },
      [],
    );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const data =
          await getUniversities();

        setUniversities(data);

        const firstId =
          data[0]?.id ?? '';

        setUniversityId(
          firstId,
        );

        if (firstId) {
          await loadScales(
            firstId,
          );
        }
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [loadScales]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!universityId) {
      setError(
        'اختر الجامعة أولًا.',
      );
      return;
    }

    const minScore =
      Number(form.minScore);

    const maxScore =
      Number(form.maxScore);

    const gradePoint =
      Number(form.gradePoint);

    if (
      !form.label.trim()
    ) {
      setError(
        'رمز أو اسم التقدير مطلوب.',
      );
      return;
    }

    if (
      !Number.isFinite(
        minScore,
      ) ||
      !Number.isFinite(
        maxScore,
      ) ||
      !Number.isFinite(
        gradePoint,
      )
    ) {
      setError(
        'تحقق من القيم الرقمية.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingId) {
        await updateGradeScale(
          editingId,
          {
            label:
              form.label.trim(),
            minScore,
            maxScore,
            gradePoint,
            passed:
              form.passed,
            isActive:
              form.isActive,
          },
        );

        setSuccess(
          'تم تحديث التقدير بنجاح.',
        );
      } else {
        await createGradeScale({
          universityId,
          label:
            form.label.trim(),
          minScore,
          maxScore,
          gradePoint,
          passed:
            form.passed,
          isActive:
            form.isActive,
        });

        setSuccess(
          'تمت إضافة التقدير بنجاح.',
        );
      }

      resetForm();

      await loadScales(
        universityId,
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(
    scale: GradeScale,
  ) {
    setEditingId(
      scale.id,
    );

    setForm({
      label:
        scale.label,

      minScore:
        String(
          scale.minScore,
        ),

      maxScore:
        String(
          scale.maxScore,
        ),

      gradePoint:
        String(
          scale.gradePoint,
        ),

      passed:
        scale.passed,

      isActive:
        scale.isActive,
    });

    setError('');
    setSuccess('');
  }

  async function handleDelete(
    scale: GradeScale,
  ) {
    if (
      !window.confirm(
        `حذف التقدير ${scale.label}؟`,
      )
    ) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await deleteGradeScale(
        scale.id,
      );

      setSuccess(
        'تم حذف التقدير.',
      );

      await loadScales(
        universityId,
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        width: '100%',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 0.7,
        }}
      >
        <GradingRoundedIcon
          sx={{
            color:
              universityColors.goldDark,
          }}
        />

        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color:
              universityColors.goldDark,
          }}
        >
          النتائج والمعدل
        </Typography>
      </Stack>

      <Typography
        component="h1"
        sx={{
          fontSize: {
            xs: 22,
            md: 26,
          },
          fontWeight: 700,
          color:
            universityColors.navyDark,
        }}
      >
        سلم الدرجات
      </Typography>

      <Typography
        sx={{
          mt: 0.7,
          mb: 3,
          fontSize: 12.5,
          color:
            universityColors.textSecondary,
        }}
      >
        حدد نطاقات الدرجات ونقاط
        المعدل وحالة النجاح. لا يفترض
        النظام مقياس 4 أو 5 من تلقاء نفسه.
      </Typography>

      {error && (
        <Alert
          severity="error"
          onClose={() =>
            setError('')
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() =>
            setSuccess('')
          }
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      <Card
        sx={{
          mb: 2.5,
          boxShadow: 'none',
        }}
      >
        <CardContent>
          <TextField
            select
            fullWidth
            label="الجامعة"
            value={universityId}
            onChange={async (
              event,
            ) => {
              const value =
                event.target.value;

              setUniversityId(
                value,
              );

              resetForm();

              await loadScales(
                value,
              );
            }}
          >
            {universities.map(
              (university) => (
                <MenuItem
                  key={
                    university.id
                  }
                  value={
                    university.id
                  }
                >
                  {
                    university.nameAr
                  }
                </MenuItem>
              ),
            )}
          </TextField>
        </CardContent>
      </Card>

      <Card
        sx={{
          mb: 2.5,
          boxShadow: 'none',
        }}
      >
        <CardContent>
          <Typography
            sx={{
              mb: 2,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {editingId
              ? 'تعديل التقدير'
              : 'إضافة تقدير'}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              label="التقدير"
              value={
                form.label
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    label:
                      event.target
                        .value,
                  }),
                )
              }
            />

            <TextField
              type="number"
              label="من درجة"
              value={
                form.minScore
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    minScore:
                      event.target
                        .value,
                  }),
                )
              }
            />

            <TextField
              type="number"
              label="إلى درجة"
              value={
                form.maxScore
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    maxScore:
                      event.target
                        .value,
                  }),
                )
              }
            />

            <TextField
              type="number"
              label="نقاط المعدل"
              value={
                form.gradePoint
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    gradePoint:
                      event.target
                        .value,
                  }),
                )
              }
            />
          </Box>

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={2}
            sx={{
              mt: 2,
              alignItems: {
                sm: 'center',
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    form.passed
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        passed:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="ناجح"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    form.isActive
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        isActive:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                />
              }
              label="مفعل"
            />

            <Box
              sx={{
                flex: 1,
              }}
            />

            {editingId && (
              <Button
                variant="outlined"
                onClick={
                  resetForm
                }
              >
                إلغاء التعديل
              </Button>
            )}

            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress
                    size={17}
                    color="inherit"
                  />
                ) : editingId ? (
                  <SaveRoundedIcon />
                ) : (
                  <AddRoundedIcon />
                )
              }
              disabled={saving}
              onClick={() =>
                void handleSave()
              }
            >
              {editingId
                ? 'حفظ التعديل'
                : 'إضافة'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        {scales.length === 0 && (
          <Alert severity="info">
            لا يوجد سلم درجات حتى الآن.
            أضف النطاقات المعتمدة من
            الجامعة قبل استيراد النتائج.
          </Alert>
        )}

        {scales.map(
          (scale) => (
            <Card
              key={scale.id}
              sx={{
                boxShadow:
                  'none',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display:
                      'flex',
                    flexDirection:
                      {
                        xs: 'column',
                        md: 'row',
                      },
                    alignItems:
                      {
                        md: 'center',
                      },
                    justifyContent:
                      'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize:
                          16,
                        fontWeight:
                          700,
                      }}
                    >
                      {
                        scale.label
                      }
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 0.4,
                        fontSize:
                          12,
                      }}
                    >
                      من{' '}
                      {
                        scale.minScore
                      }{' '}
                      إلى{' '}
                      {
                        scale.maxScore
                      }{' '}
                      • نقاط:{' '}
                      {
                        scale.gradePoint
                      }{' '}
                      •{' '}
                      {scale.passed
                        ? 'ناجح'
                        : 'راسب'}
                      {' • '}
                      {scale.isActive
                        ? 'مفعل'
                        : 'غير مفعل'}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        <EditRoundedIcon />
                      }
                      onClick={() =>
                        beginEdit(
                          scale,
                        )
                      }
                    >
                      تعديل
                    </Button>

                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={
                        <DeleteOutlineRoundedIcon />
                      }
                      onClick={() =>
                        void handleDelete(
                          scale,
                        )
                      }
                    >
                      حذف
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ),
        )}
      </Stack>

      <Divider
        sx={{
          my: 3,
        }}
      />

      <Typography
        sx={{
          fontSize: 11.5,
          color:
            universityColors.textSecondary,
        }}
      >
        النتائج القديمة تحتفظ بنقاطها
        وحالة النجاح وقت الاستيراد حتى
        لو تم تعديل السلم لاحقًا.
      </Typography>
    </Box>
  );
}
