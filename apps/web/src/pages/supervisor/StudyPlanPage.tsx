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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';

import {
  addCoursePrerequisite,
  addCourseToPlan,
  getAcademicLevels,
  getCourses,
  getPlanCourses,
  getSemesters,
  getStudyPlans,
  removeCourseFromPlan,
  removeCoursePrerequisite,
  reorderPlanCourses,
  type AcademicLevel,
  type Course,
  type CourseRequirement,
  type PlanCourse,
  type Semester,
  type StudyPlan,
} from '../../api/studyPlan';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[];
          errors?: string[];
        }
      | undefined;

    if (Array.isArray(data?.errors)) {
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

function requirementLabel(
  requirement: CourseRequirement,
) {
  return requirement === 'MANDATORY'
    ? 'إلزامي'
    : 'اختياري';
}

export default function StudyPlanPage() {
  const [studyPlans, setStudyPlans] =
    useState<StudyPlan[]>([]);

  const [levels, setLevels] =
    useState<AcademicLevel[]>([]);

  const [semesters, setSemesters] =
    useState<Semester[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [planCourses, setPlanCourses] =
    useState<PlanCourse[]>([]);

  const [studyPlanId, setStudyPlanId] =
    useState('');

  const [academicYearId, setAcademicYearId] =
    useState('');

  const [semesterId, setSemesterId] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [coursesLoading, setCoursesLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [selectedCourseId, setSelectedCourseId] =
    useState('');

  const [requirement, setRequirement] =
    useState<CourseRequirement>('MANDATORY');

  const [prerequisiteDialogCourse, setPrerequisiteDialogCourse] =
    useState<PlanCourse | null>(null);

  const [selectedPrerequisiteId, setSelectedPrerequisiteId] =
    useState('');

  const selectedPlan = useMemo(
    () =>
      studyPlans.find(
        (plan) => plan.id === studyPlanId,
      ),
    [studyPlans, studyPlanId],
  );

  const selectedLevel = useMemo(
    () =>
      levels.find(
        (level) =>
          level.id === academicYearId,
      ),
    [levels, academicYearId],
  );

  const selectedSemester = useMemo(
    () =>
      semesters.find(
        (semester) =>
          semester.id === semesterId,
      ),
    [semesters, semesterId],
  );

  const availableCourses = useMemo(() => {
    const existingIds = new Set(
      planCourses.map(
        (item) => item.courseId,
      ),
    );

    return courses.filter(
      (course) =>
        course.status === 'ACTIVE' &&
        !existingIds.has(course.id),
    );
  }, [courses, planCourses]);

  const totalCredits = useMemo(
    () =>
      planCourses.reduce(
        (sum, item) =>
          sum + item.course.credits,
        0,
      ),
    [planCourses],
  );

  const loadInitialData =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const [plansData, coursesData] =
          await Promise.all([
            getStudyPlans(),
            getCourses(),
          ]);

        setStudyPlans(plansData);
        setCourses(coursesData);

        if (plansData.length > 0) {
          setStudyPlanId(
            (current) =>
              current || plansData[0].id,
          );
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!studyPlanId) {
      setLevels([]);
      setAcademicYearId('');
      setSemesters([]);
      setSemesterId('');
      setPlanCourses([]);
      return;
    }

    let active = true;

    const loadLevels = async () => {
      setCoursesLoading(true);
      setError('');
      setSuccess('');

      try {
        const data =
          await getAcademicLevels(
            studyPlanId,
          );

        if (!active) return;

        setLevels(data);

        setAcademicYearId(
          data[0]?.id ?? '',
        );

        setSemesters([]);
        setSemesterId('');
        setPlanCourses([]);
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(err),
          );
        }
      } finally {
        if (active) {
          setCoursesLoading(false);
        }
      }
    };

    void loadLevels();

    return () => {
      active = false;
    };
  }, [studyPlanId]);

  useEffect(() => {
    if (!academicYearId) {
      setSemesters([]);
      setSemesterId('');
      setPlanCourses([]);
      return;
    }

    let active = true;

    const loadSemesters = async () => {
      setCoursesLoading(true);
      setError('');
      setSuccess('');

      try {
        const data =
          await getSemesters(
            academicYearId,
          );

        if (!active) return;

        setSemesters(data);
        setSemesterId(
          data[0]?.id ?? '',
        );
        setPlanCourses([]);
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(err),
          );
        }
      } finally {
        if (active) {
          setCoursesLoading(false);
        }
      }
    };

    void loadSemesters();

    return () => {
      active = false;
    };
  }, [academicYearId]);

  const loadPlanCourses =
    useCallback(async () => {
      if (
        !studyPlanId ||
        !academicYearId ||
        !semesterId
      ) {
        setPlanCourses([]);
        return;
      }

      setCoursesLoading(true);
      setError('');

      try {
        const response =
          await getPlanCourses(
            studyPlanId,
            academicYearId,
            semesterId,
          );

        if (!response.success) {
          setError(
            response.errors?.join('، ') ??
              'تعذر تحميل مقررات الخطة.',
          );

          setPlanCourses([]);
          return;
        }

        setPlanCourses(
          response.courses,
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setCoursesLoading(false);
      }
    }, [
      studyPlanId,
      academicYearId,
      semesterId,
    ]);

  useEffect(() => {
    void loadPlanCourses();
  }, [loadPlanCourses]);

  const handleOpenAddDialog = () => {
    setSelectedCourseId(
      availableCourses[0]?.id ?? '',
    );

    setRequirement('MANDATORY');
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleAddCourse = async () => {
    if (
      !studyPlanId ||
      !academicYearId ||
      !semesterId ||
      !selectedCourseId
    ) {
      setError(
        'اختر الخطة والمستوى والفصل والمقرر أولًا.',
      );
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response =
        await addCourseToPlan({
          studyPlanId,
          academicYearId,
          semesterId,
          courseId:
            selectedCourseId,
          priority:
            planCourses.length + 1,
          requirement,
        });

      if (!response.success) {
        setError(
          response.errors?.join('، ') ??
            'تعذر إضافة المقرر.',
        );
        return;
      }

      setDialogOpen(false);
      setSelectedCourseId('');

      setSuccess(
        'تمت إضافة المقرر إلى الخطة.',
      );

      await loadPlanCourses();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (
    item: PlanCourse,
  ) => {
    const confirmed =
      window.confirm(
        `هل تريد حذف ${item.course.code} - ${item.course.nameAr} من هذا الفصل؟`,
      );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response =
        await removeCourseFromPlan(
          item.id,
        );

      if (!response.success) {
        setError(
          response.errors?.join('، ') ??
            'تعذر حذف المقرر.',
        );
        return;
      }

      setSuccess(
        'تم حذف المقرر من الخطة.',
      );

      await loadPlanCourses();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openPrerequisiteDialog = (
    item: PlanCourse,
  ) => {
    const existingIds = new Set(
      (item.course.prerequisites ?? []).map(
        (entry) => entry.prerequisiteId,
      ),
    );

    const firstAvailable = courses.find(
      (course) =>
        course.status === 'ACTIVE' &&
        course.id !== item.courseId &&
        !existingIds.has(course.id),
    );

    setPrerequisiteDialogCourse(item);
    setSelectedPrerequisiteId(
      firstAvailable?.id ?? '',
    );
    setError('');
    setSuccess('');
  };

  const handleAddPrerequisite = async () => {
    if (
      !prerequisiteDialogCourse ||
      !selectedPrerequisiteId
    ) {
      setError(
        'اختر المقرر المتطلب السابق أولًا.',
      );
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response =
        await addCoursePrerequisite({
          courseId:
            prerequisiteDialogCourse.courseId,
          prerequisiteId:
            selectedPrerequisiteId,
        });

      if (!response.success) {
        setError(
          response.errors?.join('، ') ??
            'تعذر إضافة المتطلب السابق.',
        );
        return;
      }

      setPrerequisiteDialogCourse(null);
      setSelectedPrerequisiteId('');

      setSuccess(
        'تمت إضافة المتطلب السابق.',
      );

      const [coursesData] =
        await Promise.all([
          getCourses(),
          loadPlanCourses(),
        ]);

      setCourses(coursesData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePrerequisite = async (
    item: PlanCourse,
    prerequisiteId: string,
  ) => {
    const confirmed = window.confirm(
      'هل تريد حذف هذا المتطلب السابق؟',
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response =
        await removeCoursePrerequisite(
          item.courseId,
          prerequisiteId,
        );

      if (!response.success) {
        setError(
          response.errors?.join('، ') ??
            'تعذر حذف المتطلب السابق.',
        );
        return;
      }

      setSuccess(
        'تم حذف المتطلب السابق.',
      );

      const [coursesData] =
        await Promise.all([
          getCourses(),
          loadPlanCourses(),
        ]);

      setCourses(coursesData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMove = async (
    index: number,
    direction: 'up' | 'down',
  ) => {
    const targetIndex =
      direction === 'up'
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= planCourses.length
    ) {
      return;
    }

    const reordered = [
      ...planCourses,
    ];

    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const items = reordered.map(
      (item, itemIndex) => ({
        id: item.id,
        priority: itemIndex + 1,
      }),
    );

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response =
        await reorderPlanCourses({
          studyPlanId,
          academicYearId,
          items,
        });

      if (!response.success) {
        setError(
          response.errors?.join('، ') ??
            'تعذر إعادة ترتيب المقررات.',
        );
        return;
      }

      setPlanCourses(
        response.courses,
      );

      setSuccess(
        'تم تحديث ترتيب الأولوية.',
      );
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
          justifyContent:
            'space-between',
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
            إدارة الخطة الدراسية
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ fontSize: 14 }}
          >
            إدارة مقررات الخطة حسب
            المستوى والفصل وترتيب
            الأولوية.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            <AddRoundedIcon />
          }
          disabled={
            !semesterId ||
            actionLoading ||
            availableCourses.length ===
              0
          }
          onClick={
            handleOpenAddDialog
          }
        >
          إضافة مقرر
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      <Alert
        severity="info"
        sx={{
          mb: 3,
          border:
            '1px solid #D6E7F5',
        }}
      >
        الأولوية هنا لترتيب المقرر
        داخل الخطة فقط، ولا تعني أن
        المقرر يعتمد على المقرر
        السابق. المتطلبات السابقة
        تُدار بشكل مستقل.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            sx={{ mb: 2.5 }}
          >
            تحديد الخطة والفصل
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
                {studyPlans.map(
                  (plan) => (
                    <MenuItem
                      key={plan.id}
                      value={plan.id}
                    >
                      {plan.nameAr}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              disabled={!studyPlanId}
            >
              <InputLabel>
                المستوى
              </InputLabel>

              <Select
                value={
                  academicYearId
                }
                label="المستوى"
                onChange={(event) =>
                  setAcademicYearId(
                    event.target.value,
                  )
                }
              >
                {levels.map(
                  (level) => (
                    <MenuItem
                      key={level.id}
                      value={level.id}
                    >
                      {level.nameAr}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              disabled={
                !academicYearId
              }
            >
              <InputLabel>
                الفصل
              </InputLabel>

              <Select
                value={semesterId}
                label="الفصل"
                onChange={(event) =>
                  setSemesterId(
                    event.target.value,
                  )
                }
              >
                {semesters.map(
                  (semester) => (
                    <MenuItem
                      key={semester.id}
                      value={
                        semester.id
                      }
                    >
                      {
                        semester.nameAr
                      }
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>
          </Box>

          {(selectedPlan ||
            selectedLevel ||
            selectedSemester) && (
            <Stack
              direction="row"
              sx={{
                mt: 2.5,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {selectedPlan && (
                <Chip
                  label={
                    selectedPlan.nameAr
                  }
                  variant="outlined"
                />
              )}

              {selectedLevel && (
                <Chip
                  label={
                    selectedLevel.nameAr
                  }
                  variant="outlined"
                />
              )}

              {selectedSemester && (
                <Chip
                  label={
                    selectedSemester.nameAr
                  }
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent
          sx={{
            p: {
              xs: '22px !important',
              md: '28px !important',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              justifyContent:
                'space-between',
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
              gap: 2,
              pb: 2.5,
              mb: 3,
              borderBottom:
                '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="h6">
                مقررات الخطة
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: 12,
                  mt: 0.4,
                }}
              >
                ترتيب الأولوية خاص
                بالفصل المحدد.
              </Typography>
            </Box>

            <Stack
              direction="row"
              sx={{
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Chip
                label={`${planCourses.length} مقرر`}
                variant="outlined"
              />

              <Chip
                label={`${totalCredits} ساعة`}
                variant="outlined"
              />
            </Stack>
          </Box>

          {coursesLoading ? (
            <Box
              sx={{
                minHeight: 220,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : !semesterId ? (
            <Box
              sx={{
                minHeight: 260,
                display: 'flex',
                flexDirection:
                  'column',
                alignItems: 'center',
                justifyContent:
                  'center',
                textAlign: 'center',
              }}
            >
              <ViewListOutlinedIcon
                sx={{
                  fontSize: 42,
                  mb: 2,
                  color:
                    'text.secondary',
                }}
              />

              <Typography variant="h6">
                اختر الفصل الدراسي
              </Typography>
            </Box>
          ) : planCourses.length ===
            0 ? (
            <Box
              sx={{
                minHeight: 260,
                display: 'flex',
                flexDirection:
                  'column',
                alignItems: 'center',
                justifyContent:
                  'center',
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 3,
                  bgcolor:
                    'rgba(6,45,86,0.07)',
                  color: '#062D56',
                  mb: 2,
                }}
              >
                <ViewListOutlinedIcon
                  sx={{
                    fontSize: 30,
                  }}
                />
              </Box>

              <Typography
                variant="h6"
                sx={{ mb: 0.7 }}
              >
                لا توجد مقررات
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  maxWidth: 430,
                  fontSize: 13,
                }}
              >
                لا توجد مقررات مضافة
                لهذا المستوى والفصل
                حاليًا.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {planCourses.map(
                (item, index) => (
                  <Box
                    key={item.id}
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
                      p: 2,
                      border:
                        '1px solid',
                      borderColor:
                        'divider',
                      borderRadius: 2.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: 'center' }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems:
                            'center',
                          bgcolor:
                            'rgba(6,45,86,0.07)',
                          color:
                            '#062D56',
                          flexShrink: 0,
                        }}
                      >
                        <MenuBookOutlinedIcon />
                      </Box>

                      <Box>
                        <Stack
                          direction="row"
                          sx={{
                            gap: 1,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              item.course
                                .code
                            }
                          </Typography>

                          <Chip
                            size="small"
                            label={`الأولوية ${item.priority}`}
                          />

                          <Chip
                            size="small"
                            variant="outlined"
                            label={requirementLabel(
                              item.requirement,
                            )}
                          />
                        </Stack>

                        <Typography
                          sx={{
                            mt: 0.5,
                            fontWeight:
                              600,
                          }}
                        >
                          {
                            item.course
                              .nameAr
                          }
                        </Typography>

                        <Typography
                          color="text.secondary"
                          sx={{
                            mt: 0.3,
                            fontSize: 12,
                          }}
                        >
                          {
                            item.course
                              .credits
                          }{' '}
                          ساعة معتمدة
                        </Typography>

                        <Box
                          sx={{
                            mt: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 0.7,
                          }}
                        >
                          <Typography
                            color="text.secondary"
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            المتطلبات السابقة:
                          </Typography>

                          {(item.course.prerequisites ?? [])
                            .length === 0 ? (
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 12 }}
                            >
                              لا يوجد
                            </Typography>
                          ) : (
                            (item.course.prerequisites ?? []).map(
                              (entry) => (
                                <Chip
                                  key={entry.prerequisiteId}
                                  size="small"
                                  variant="outlined"
                                  label={`${entry.prerequisite.code} — ${entry.prerequisite.nameAr}`}
                                  onDelete={
                                    actionLoading
                                      ? undefined
                                      : () =>
                                          void handleRemovePrerequisite(
                                            item,
                                            entry.prerequisiteId,
                                          )
                                  }
                                />
                              ),
                            )
                          )}
                        </Box>
                      </Box>
                    </Stack>

                    <Stack
                      direction="row"
                      sx={{
                        gap: 0.5,
                        justifyContent: {
                          xs: 'flex-end',
                          md: 'initial',
                        },
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={
                          index === 0 ||
                          actionLoading
                        }
                        onClick={() =>
                          void handleMove(
                            index,
                            'up',
                          )
                        }
                        startIcon={
                          <ArrowUpwardRoundedIcon />
                        }
                      >
                        أعلى
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        disabled={
                          index ===
                            planCourses.length -
                              1 ||
                          actionLoading
                        }
                        onClick={() =>
                          void handleMove(
                            index,
                            'down',
                          )
                        }
                        startIcon={
                          <ArrowDownwardRoundedIcon />
                        }
                      >
                        أسفل
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        disabled={actionLoading}
                        onClick={() =>
                          openPrerequisiteDialog(
                            item,
                          )
                        }
                      >
                        المتطلبات السابقة
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          void handleDelete(
                            item,
                          )
                        }
                        startIcon={
                          <DeleteOutlineRoundedIcon />
                        }
                      >
                        حذف
                      </Button>
                    </Stack>
                  </Box>
                ),
              )}
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
          إضافة مقرر إلى الخطة
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ pt: 1 }}
          >
            <FormControl fullWidth>
              <InputLabel>
                المقرر
              </InputLabel>

              <Select
                value={
                  selectedCourseId
                }
                label="المقرر"
                onChange={(event) =>
                  setSelectedCourseId(
                    event.target.value,
                  )
                }
              >
                {availableCourses.map(
                  (course) => (
                    <MenuItem
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} —{' '}
                      {course.nameAr} —{' '}
                      {course.credits}{' '}
                      ساعات
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>
                نوع المقرر في الخطة
              </InputLabel>

              <Select
                value={requirement}
                label="نوع المقرر في الخطة"
                onChange={(event) =>
                  setRequirement(
                    event.target
                      .value as CourseRequirement,
                  )
                }
              >
                <MenuItem value="MANDATORY">
                  إلزامي
                </MenuItem>

                <MenuItem value="ELECTIVE">
                  اختياري
                </MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              سيتم وضع المقرر في
              الأولوية رقم{' '}
              {planCourses.length + 1}.
              يمكنك تغيير ترتيبه بعد
              الإضافة.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{ px: 3, pb: 2.5 }}
        >
          <Button
            onClick={() =>
              setDialogOpen(false)
            }
            disabled={actionLoading}
          >
            إلغاء
          </Button>

          <Button
            variant="contained"
            disabled={
              !selectedCourseId ||
              actionLoading
            }
            onClick={() =>
              void handleAddCourse()
            }
          >
            {actionLoading
              ? 'جارٍ الإضافة...'
              : 'إضافة المقرر'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(prerequisiteDialogCourse)}
        onClose={() => {
          if (!actionLoading) {
            setPrerequisiteDialogCourse(null);
            setSelectedPrerequisiteId('');
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>إدارة المتطلبات السابقة</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {prerequisiteDialogCourse && (
              <Alert severity="info">
                المقرر: {prerequisiteDialogCourse.course.code} —{' '}
                {prerequisiteDialogCourse.course.nameAr}
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>المتطلب السابق</InputLabel>
              <Select
                value={selectedPrerequisiteId}
                label="المتطلب السابق"
                onChange={(event) =>
                  setSelectedPrerequisiteId(event.target.value)
                }
              >
                {courses
                  .filter((course) => {
                    if (!prerequisiteDialogCourse) return false;

                    const existingIds = new Set(
                      (prerequisiteDialogCourse.course.prerequisites ?? []).map(
                        (entry) => entry.prerequisiteId,
                      ),
                    );

                    return (
                      course.status === 'ACTIVE' &&
                      course.id !== prerequisiteDialogCourse.courseId &&
                      !existingIds.has(course.id)
                    );
                  })
                  .map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.code} — {course.nameAr}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {prerequisiteDialogCourse &&
              (prerequisiteDialogCourse.course.prerequisites ?? []).length > 0 && (
                <Box>
                  <Typography sx={{ mb: 1, fontWeight: 600, fontSize: 13 }}>
                    المتطلبات الحالية
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                    {(prerequisiteDialogCourse.course.prerequisites ?? []).map(
                      (entry) => (
                        <Chip
                          key={entry.prerequisiteId}
                          label={`${entry.prerequisite.code} — ${entry.prerequisite.nameAr}`}
                          variant="outlined"
                        />
                      ),
                    )}
                  </Stack>
                </Box>
              )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            disabled={actionLoading}
            onClick={() => {
              setPrerequisiteDialogCourse(null);
              setSelectedPrerequisiteId('');
            }}
          >
            إلغاء
          </Button>

          <Button
            variant="contained"
            disabled={!selectedPrerequisiteId || actionLoading}
            onClick={() => void handleAddPrerequisite()}
          >
            {actionLoading ? 'جارٍ الحفظ...' : 'إضافة المتطلب'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}