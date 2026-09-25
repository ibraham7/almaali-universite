import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';

import {
  addMyEnrollmentItem,
  confirmMyEnrollment,
  dropMyEnrollmentItem,
  getMyRegistration,
  type CourseSection,
  type PlanCourse,
  type RegistrationContext,
} from '../../api/studentRegistration';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[];
          errors?: string[];
        }
      | undefined;

    if (data?.errors?.length) {
      return data.errors.join('، ');
    }

    if (Array.isArray(data?.message)) {
      return data.message.join('، ');
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع.';
}

function getResponseError(response: unknown) {
  if (
    typeof response !== 'object' ||
    response === null
  ) {
    return null;
  }

  const candidate = response as {
    success?: boolean;
    errors?: string[];
  };

  if (
    candidate.success === false &&
    candidate.errors?.length
  ) {
    return candidate.errors.join('، ');
  }

  return null;
}

function formatDate(date?: string | null) {
  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function requirementLabel(
  requirement: 'MANDATORY' | 'ELECTIVE',
) {
  return requirement === 'MANDATORY'
    ? 'إجباري'
    : 'اختياري';
}

function enrollmentStatusLabel(
  status?: string,
) {
  switch (status) {
    case 'DRAFT':
      return 'مسودة';

    case 'PENDING':
      return 'بانتظار موافقة المرشد';

    case 'APPROVED':
      return 'معتمد';

    case 'CONFIRMED':
      return 'مؤكد';

    case 'REJECTED':
      return 'مرفوض';

    case 'DROPPED':
      return 'منسحب';

    case 'CANCELLED':
      return 'ملغى';

    default:
      return 'لم يبدأ التسجيل';
  }
}

function scheduleText(
  schedules: CourseSection['schedules'],
) {
  if (!schedules.length) {
    return 'لا يوجد موعد محدد';
  }

  return schedules
    .map(
      (schedule) =>
        `${schedule.day} ${schedule.startTime} - ${schedule.endTime}`,
    )
    .join(' • ');
}

export default function StudentRegistrationPage() {
  const [
    registration,
    setRegistration,
  ] = useState<RegistrationContext | null>(
    null,
  );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  const [
    selectedSections,
    setSelectedSections,
  ] = useState<Record<string, string>>({});

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadRegistration =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await getMyRegistration();

        if (
          data.success === false
        ) {
          setRegistration(data);

          setError(
            data.errors?.join('، ') ??
              'تعذر تحميل بيانات التسجيل.',
          );

          return;
        }

        setRegistration(data);

        const initialSections: Record<
          string,
          string
        > = {};

        for (
          const planCourse of
            data.planCourses ?? []
        ) {
          const firstOpenSection =
            planCourse.course.sections.find(
              (section) =>
                section.status === 'OPEN' &&
                section.enrolledCount <
                  section.maxCapacity,
            );

          if (firstOpenSection) {
            initialSections[
              planCourse.id
            ] = firstOpenSection.id;
          }
        }

        setSelectedSections(
          initialSections,
        );
      } catch (requestError) {
        setError(
          getErrorMessage(requestError),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadRegistration();
  }, [loadRegistration]);

  const planCourses =
    registration?.planCourses ?? [];

  const enrollment =
    registration?.enrollment ?? null;

  const registeredCourseIds =
    useMemo(
      () =>
        new Set(
          enrollment?.items.map(
            (item) => item.courseId,
          ) ?? [],
        ),
      [enrollment],
    );

  const filteredCourses =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      if (!normalizedSearch) {
        return planCourses;
      }

      return planCourses.filter(
        (planCourse) => {
          const course =
            planCourse.course;

          return (
            course.nameAr
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            course.nameEn
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            course.code
              .toLowerCase()
              .includes(
                normalizedSearch,
              )
          );
        },
      );
    }, [planCourses, search]);

  const groupedCourses =
    useMemo(() => {
      const groups = new Map<
        string,
        {
          key: string;
          academicYear: PlanCourse['academicYear'];
          semester: PlanCourse['semester'];
          courses: PlanCourse[];
        }
      >();

      for (const planCourse of filteredCourses) {
        const key =
          `${planCourse.academicYearId}:${planCourse.semesterId}`;

        const existing = groups.get(key);

        if (existing) {
          existing.courses.push(planCourse);
          continue;
        }

        groups.set(key, {
          key,
          academicYear: planCourse.academicYear,
          semester: planCourse.semester,
          courses: [planCourse],
        });
      }

      return Array.from(groups.values()).sort(
        (a, b) =>
          a.academicYear.levelNumber -
            b.academicYear.levelNumber ||
          a.semester.semesterNumber -
            b.semester.semesterNumber,
      );
    }, [filteredCourses]);

  const currentLevelNumber =
    registration?.registrationSettings
      ?.currentLevelNumber ??
    registration?.academicYear?.levelNumber ??
    0;

  const canEdit =
    registration?.registrationOpen ===
      true &&
    (!enrollment ||
      enrollment.status === 'DRAFT');

  async function handleAdd(
    planCourse: PlanCourse,
  ) {
    const course =
      planCourse.course;

    const sectionId =
      selectedSections[planCourse.id];

    if (!sectionId) {
      setError(
        'اختر شعبة للمقرر أولًا.',
      );

      return;
    }

    try {
      setActionLoading(
        `add-${planCourse.id}`,
      );

      setError(null);
      setSuccess(null);

      const response =
        await addMyEnrollmentItem(
          course.id,
          sectionId,
        );

      const responseError =
        getResponseError(response);

      if (responseError) {
        setError(responseError);
        return;
      }

      setSuccess(
        `تمت إضافة ${course.nameAr} إلى سلة التسجيل.`,
      );

      await loadRegistration();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDrop(
    enrollmentItemId: string,
  ) {
    try {
      setActionLoading(
        `drop-${enrollmentItemId}`,
      );

      setError(null);
      setSuccess(null);

      const response =
        await dropMyEnrollmentItem(
          enrollmentItemId,
        );

      const responseError =
        getResponseError(response);

      if (responseError) {
        setError(responseError);
        return;
      }

      setSuccess(
        'تم حذف المقرر من سلة التسجيل.',
      );

      await loadRegistration();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirm() {
    if (!enrollment?.items.length) {
      setError(
        'سلة التسجيل فارغة.',
      );

      return;
    }

    try {
      setActionLoading('confirm');

      setError(null);
      setSuccess(null);

      const response =
        await confirmMyEnrollment();

      const responseError =
        getResponseError(response);

      if (responseError) {
        setError(responseError);
        return;
      }

      setSuccess(
        'status' in response &&
          response.status === 'PENDING'
          ? 'تم إرسال التسجيل إلى المرشد للموافقة.'
          : 'تم تأكيد التسجيل بنجاح.',
      );

      await loadRegistration();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Stack
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <CircularProgress />

          <Typography
            color="text.secondary"
          >
            جاري تحميل بيانات التسجيل...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (
    !registration ||
    registration.success === false
  ) {
    return (
      <Box>
        <Typography
          variant="h4"
          sx={{ mb: 3 }}
        >
          تسجيل المقررات
        </Typography>

        <Alert severity="error">
          {error ??
            'تعذر تحميل بيانات التسجيل.'}
        </Alert>
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
          alignItems: {
            xs: 'stretch',
            md: 'center',
          },
          justifyContent:
            'space-between',
          gap: 2,
          mb: 3,
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
            تسجيل المقررات
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ fontSize: 14 }}
          >
            {registration.studyPlan
              ?.nameAr ??
              'الخطة الدراسية'}
            {' • '}
            {registration.academicYear
              ?.nameAr ??
              'المستوى'}
            {' • '}
            {registration.semester
              ?.nameAr ??
              'الفصل'}
          </Typography>
        </Box>

        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={1}
        >
          <Chip
            label={enrollmentStatusLabel(
              enrollment?.status,
            )}
            sx={{
              minHeight: 36,
              bgcolor:
                'rgba(6,45,86,0.08)',
              color: '#062D56',
              fontWeight: 700,
            }}
          />

          <Button
            variant="contained"
            startIcon={
              actionLoading ===
              'confirm' ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <CheckCircleOutlineRoundedIcon />
              )
            }
            disabled={
              !canEdit ||
              !enrollment?.items.length ||
              actionLoading !== null
            }
            onClick={() =>
              void handleConfirm()
            }
          >
            تأكيد التسجيل
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() =>
            setError(null)
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
            setSuccess(null)
          }
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      {!registration.registrationOpen && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          فترة التسجيل مغلقة حاليًا.
          يمكنك استعراض المقررات، لكن لا
          يمكنك تعديل التسجيل.
        </Alert>
      )}

      {registration.registrationPeriod && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              فترة التسجيل
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  بداية التسجيل
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {formatDate(
                    registration
                      .registrationPeriod
                      .startDateTime,
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  نهاية التسجيل
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {formatDate(
                    registration
                      .registrationPeriod
                      .endDateTime,
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  الحد الأدنى للساعات
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {registration
                    .registrationPeriod
                    .minCredits ??
                    'غير محدد'}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  الحد الأقصى للساعات
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {registration
                    .registrationPeriod
                    .maxCredits ??
                    'غير محدد'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {registration.registrationSettings && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              نطاق المقررات المتاحة
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  المستوى الحالي
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {registration.academicYear
                    ?.nameAr ??
                    `المستوى ${registration.registrationSettings.currentLevelNumber}`}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  مستويات مستقبلية مسموحة
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  {
                    registration
                      .registrationSettings
                      .allowedFutureYears
                  }
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  أعلى مستوى متاح حاليًا
                </Typography>

                <Typography
                  sx={{ fontWeight: 600 }}
                >
                  المستوى{' '}
                  {
                    registration
                      .registrationSettings
                      .maxAllowedLevelNumber
                  }
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 2.5 }}>
        <CardContent
          sx={{
            p: '20px !important',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                md: 'row',
              },
              alignItems: {
                md: 'center',
              },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="ابحث باسم المقرر أو رمزه..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon
                        sx={{
                          color:
                            'text.secondary',
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Chip
              label={`${filteredCourses.length} مقرر`}
              sx={{
                bgcolor:
                  'rgba(216,170,75,0.15)',
                color: '#8C671D',
                minWidth: 120,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'minmax(0, 1fr) 360px',
          },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Stack spacing={2}>
          {filteredCourses.length ===
          0 ? (
            <Card>
              <CardContent>
                <Box
                  sx={{
                    minHeight: 240,
                    display: 'flex',
                    flexDirection:
                      'column',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    textAlign:
                      'center',
                  }}
                >
                  <MenuBookOutlinedIcon
                    sx={{
                      fontSize: 38,
                      color:
                        'text.secondary',
                      mb: 1.5,
                    }}
                  />

                  <Typography
                    variant="h6"
                    sx={{ mb: 0.5 }}
                  >
                    لا توجد مقررات
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 13 }}
                  >
                    لا توجد مقررات مطابقة
                    للبحث ضمن المستويات
                    والفصول المتاحة.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            groupedCourses.map(
              (group) => {
                const isFutureGroup =
                  group.academicYear.levelNumber >
                  currentLevelNumber;

                return (
                  <Box key={group.key}>
                    <Box
                      sx={{
                        mb: 1.25,
                        display: 'flex',
                        flexDirection: {
                          xs: 'column',
                          sm: 'row',
                        },
                        alignItems: {
                          xs: 'flex-start',
                          sm: 'center',
                        },
                        justifyContent:
                          'space-between',
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                        >
                          {group.academicYear.nameAr}
                          {' • '}
                          {group.semester.nameAr}
                        </Typography>

                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: 12 }}
                        >
                          {group.courses.length} مقرر
                          ضمن هذا المستوى والفصل
                        </Typography>
                      </Box>

                      {isFutureGroup && (
                        <Chip
                          size="small"
                          label="مستوى مستقبلي"
                          sx={{
                            bgcolor:
                              'rgba(216,170,75,0.15)',
                            color: '#8C671D',
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Box>

                    <Stack spacing={2}>
                      {group.courses.map(
                        (planCourse) => {
                          const course =
                            planCourse.course;

                          const isRegistered =
                            registeredCourseIds.has(
                              course.id,
                            );

                          const isFutureCourse =
                            planCourse.academicYear
                              .levelNumber >
                            currentLevelNumber;

                          const selectedSectionId =
                            selectedSections[
                              planCourse.id
                            ] ?? '';

                          return (
                            <Card
                              key={planCourse.id}
                              sx={{
                                border:
                                  isFutureCourse
                                    ? '1px solid rgba(216,170,75,0.38)'
                                    : undefined,
                              }}
                            >
                              <CardContent
                                sx={{
                                  p: {
                                    xs: '20px !important',
                                    md: '24px !important',
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: {
                                      xs: 'column',
                                      md: 'row',
                                    },
                                    justifyContent:
                                      'space-between',
                                    gap: 2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      useFlexGap
                                      sx={{
                                        mb: 1,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <Chip
                                        size="small"
                                        label={course.code}
                                      />

                                      <Chip
                                        size="small"
                                        label={
                                          planCourse
                                            .academicYear
                                            .nameAr
                                        }
                                        variant="outlined"
                                      />

                                      <Chip
                                        size="small"
                                        label={
                                          planCourse
                                            .semester
                                            .nameAr
                                        }
                                        variant="outlined"
                                      />

                                      <Chip
                                        size="small"
                                        label={requirementLabel(
                                          planCourse.requirement,
                                        )}
                                        sx={{
                                          bgcolor:
                                            planCourse.requirement ===
                                            'MANDATORY'
                                              ? 'rgba(6,45,86,0.08)'
                                              : 'rgba(216,170,75,0.15)',
                                          color:
                                            planCourse.requirement ===
                                            'MANDATORY'
                                              ? '#062D56'
                                              : '#8C671D',
                                        }}
                                      />

                                      {isFutureCourse && (
                                        <Chip
                                          size="small"
                                          label="مستقبلي"
                                          sx={{
                                            bgcolor:
                                              'rgba(216,170,75,0.15)',
                                            color:
                                              '#8C671D',
                                            fontWeight: 700,
                                          }}
                                        />
                                      )}

                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`${course.credits} ساعات`}
                                      />

                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`الأولوية ${planCourse.priority}`}
                                      />
                                    </Stack>

                                    <Typography
                                      variant="h6"
                                      sx={{ mb: 0.5 }}
                                    >
                                      {course.nameAr}
                                    </Typography>

                                    {course.nameEn && (
                                      <Typography
                                        color="text.secondary"
                                        sx={{
                                          mb: 1.5,
                                          fontSize: 13,
                                        }}
                                      >
                                        {course.nameEn}
                                      </Typography>
                                    )}

                                    {course.description && (
                                      <Typography
                                        color="text.secondary"
                                        sx={{
                                          mb: 1.5,
                                          fontSize: 13,
                                        }}
                                      >
                                        {course.description}
                                      </Typography>
                                    )}

                                    {course.prerequisites
                                      .length > 0 && (
                                      <Typography
                                        color="text.secondary"
                                        sx={{ fontSize: 13 }}
                                      >
                                        المتطلبات السابقة:{' '}
                                        {course.prerequisites
                                          .map(
                                            (
                                              prerequisite,
                                            ) =>
                                              prerequisite
                                                .prerequisite
                                                .code,
                                          )
                                          .join('، ')}
                                      </Typography>
                                    )}
                                  </Box>

                                  <Box
                                    sx={{
                                      width: {
                                        xs: '100%',
                                        md: 280,
                                      },
                                      flexShrink: 0,
                                    }}
                                  >
                                    {course.sections
                                      .length === 0 ? (
                                      <Alert severity="warning">
                                        لا توجد شعب متاحة
                                        لهذا المقرر في{' '}
                                        {
                                          planCourse
                                            .semester
                                            .nameAr
                                        }
                                        .
                                      </Alert>
                                    ) : (
                                      <Stack spacing={1.5}>
                                        <FormControl
                                          fullWidth
                                          size="small"
                                        >
                                          <Select
                                            value={
                                              selectedSectionId
                                            }
                                            displayEmpty
                                            disabled={
                                              isRegistered ||
                                              !canEdit
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              setSelectedSections(
                                                (
                                                  current,
                                                ) => ({
                                                  ...current,
                                                  [planCourse.id]:
                                                    event
                                                      .target
                                                      .value,
                                                }),
                                              )
                                            }
                                          >
                                            <MenuItem
                                              value=""
                                              disabled
                                            >
                                              اختر الشعبة
                                            </MenuItem>

                                            {course.sections.map(
                                              (
                                                section,
                                              ) => (
                                                <MenuItem
                                                  key={
                                                    section.id
                                                  }
                                                  value={
                                                    section.id
                                                  }
                                                  disabled={
                                                    section.status !==
                                                      'OPEN' ||
                                                    section.enrolledCount >=
                                                      section.maxCapacity
                                                  }
                                                >
                                                  الشعبة{' '}
                                                  {
                                                    section.sectionNumber
                                                  }{' '}
                                                  —{' '}
                                                  {
                                                    section.enrolledCount
                                                  }
                                                  /
                                                  {
                                                    section.maxCapacity
                                                  }
                                                </MenuItem>
                                              ),
                                            )}
                                          </Select>
                                        </FormControl>

                                        {selectedSectionId &&
                                          (() => {
                                            const section =
                                              course.sections.find(
                                                (
                                                  item,
                                                ) =>
                                                  item.id ===
                                                  selectedSectionId,
                                              );

                                            if (!section) {
                                              return null;
                                            }

                                            return (
                                              <Stack
                                                spacing={0.7}
                                              >
                                                <Stack
                                                  direction="row"
                                                  spacing={0.7}
                                                  sx={{
                                                    alignItems:
                                                      'center',
                                                  }}
                                                >
                                                  <AccessTimeRoundedIcon
                                                    sx={{
                                                      fontSize:
                                                        17,
                                                      color:
                                                        'text.secondary',
                                                    }}
                                                  />

                                                  <Typography
                                                    color="text.secondary"
                                                    sx={{
                                                      fontSize:
                                                        12,
                                                    }}
                                                  >
                                                    {scheduleText(
                                                      section.schedules,
                                                    )}
                                                  </Typography>
                                                </Stack>

                                                <Stack
                                                  direction="row"
                                                  spacing={0.7}
                                                  sx={{
                                                    alignItems:
                                                      'center',
                                                  }}
                                                >
                                                  <PersonOutlineRoundedIcon
                                                    sx={{
                                                      fontSize:
                                                        17,
                                                      color:
                                                        'text.secondary',
                                                    }}
                                                  />

                                                  <Typography
                                                    color="text.secondary"
                                                    sx={{
                                                      fontSize:
                                                        12,
                                                    }}
                                                  >
                                                    {section
                                                      .teacher
                                                      ?.name ??
                                                      'لم يحدد المدرس'}
                                                  </Typography>
                                                </Stack>

                                                <Stack
                                                  direction="row"
                                                  spacing={0.7}
                                                  sx={{
                                                    alignItems:
                                                      'center',
                                                  }}
                                                >
                                                  <MeetingRoomOutlinedIcon
                                                    sx={{
                                                      fontSize:
                                                        17,
                                                      color:
                                                        'text.secondary',
                                                    }}
                                                  />

                                                  <Typography
                                                    color="text.secondary"
                                                    sx={{
                                                      fontSize:
                                                        12,
                                                    }}
                                                  >
                                                    {section
                                                      .classroom
                                                      ?.name ??
                                                      'لم تحدد القاعة'}
                                                  </Typography>
                                                </Stack>
                                              </Stack>
                                            );
                                          })()}

                                        <Button
                                          fullWidth
                                          variant={
                                            isRegistered
                                              ? 'outlined'
                                              : 'contained'
                                          }
                                          disabled={
                                            isRegistered ||
                                            !selectedSectionId ||
                                            !canEdit ||
                                            actionLoading !==
                                              null
                                          }
                                          onClick={() =>
                                            void handleAdd(
                                              planCourse,
                                            )
                                          }
                                        >
                                          {actionLoading ===
                                          `add-${planCourse.id}` ? (
                                            <CircularProgress
                                              size={20}
                                              color="inherit"
                                            />
                                          ) : isRegistered ? (
                                            'مضاف إلى السلة'
                                          ) : (
                                            'إضافة إلى السلة'
                                          )}
                                        </Button>
                                      </Stack>
                                    )}
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        },
                      )}
                    </Stack>
                  </Box>
                );
              },
            )
          )}
        </Stack>

        <Card
          sx={{
            position: {
              xl: 'sticky',
            },
            top: {
              xl: 24,
            },
          }}
        >
          <CardContent
            sx={{
              p: '22px !important',
            }}
          >
            <Stack
              direction="row"
              sx={{
                mb: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <ShoppingBagOutlinedIcon />

                <Typography variant="h6">
                  سلة التسجيل
                </Typography>
              </Stack>

              <Chip
                size="small"
                label={
                  enrollment?.items
                    .length ?? 0
                }
              />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!enrollment?.items
              .length ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: 13 }}
                >
                  لم تضف أي مقرر إلى
                  السلة بعد.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {enrollment.items.map(
                  (item) => (
                    <Box
                      key={item.id}
                      sx={{
                        p: 1.5,
                        border:
                          '1px solid',
                        borderColor:
                          'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {
                              item
                                .course
                                .nameAr
                            }
                          </Typography>

                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 12 }}
                          >
                            {
                              item
                                .course
                                .code
                            }{' '}
                            • الشعبة{' '}
                            {
                              item
                                .section
                                .sectionNumber
                            }
                          </Typography>
                        </Box>

                        <Button
                          color="error"
                          size="small"
                          disabled={
                            !canEdit ||
                            actionLoading !==
                              null
                          }
                          onClick={() =>
                            void handleDrop(
                              item.id,
                            )
                          }
                          sx={{
                            minWidth: 38,
                          }}
                        >
                          {actionLoading ===
                          `drop-${item.id}` ? (
                            <CircularProgress
                              size={17}
                              color="inherit"
                            />
                          ) : (
                            <DeleteOutlineRoundedIcon
                              fontSize="small"
                            />
                          )}
                        </Button>
                      </Stack>
                    </Box>
                  ),
                )}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            <Stack
              direction="row"
              sx={{
                mb: 2,
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                color="text.secondary"
              >
                مجموع الساعات
              </Typography>

              <Typography
                variant="h6"
                color="primary"
              >
                {registration.totalRegisteredCredits ??
                  0}
              </Typography>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              startIcon={
                actionLoading ===
                'confirm' ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <CheckCircleOutlineRoundedIcon />
                )
              }
              disabled={
                !canEdit ||
                !enrollment?.items
                  .length ||
                actionLoading !== null
              }
              onClick={() =>
                void handleConfirm()
              }
            >
              تأكيد التسجيل
            </Button>

            {registration
              .registrationPeriod
              ?.advisorApprovalRequired && (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 1.2,
                  textAlign: 'center',
                  fontSize: 11,
                }}
              >
                بعد التأكيد سيتم إرسال
                التسجيل إلى المرشد
                الأكاديمي للموافقة.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}