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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';

import {
  createCourseSection,
  getClassrooms,
  getCourseSections,
  getTeachers,
  removeCourseSection,
  updateCourseSection,
  type Classroom,
  type CourseSection,
  type SectionStatus,
  type Teacher,
} from '../../api/courseSections';

import {
  getAcademicLevels,
  getCourses,
  getSemesters,
  getStudyPlans,
  type AcademicLevel,
  type Course,
  type Semester,
  type StudyPlan,
} from '../../api/studyPlan';

type ScheduleForm = {
  day: string;
  startTime: string;
  endTime: string;
};

type SectionForm = {
  sectionNumber: string;
  courseId: string;
  teacherId: string;
  classroomId: string;
  maxCapacity: string;
  minEnrollment: string;
  status: SectionStatus;
  schedules: ScheduleForm[];
};

const emptyForm: SectionForm = {
  sectionNumber: '',
  courseId: '',
  teacherId: '',
  classroomId: '',
  maxCapacity: '30',
  minEnrollment: '',
  status: 'OPEN',
  schedules: [],
};

const days = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

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

export default function SectionsPage() {
  const [studyPlans, setStudyPlans] =
    useState<StudyPlan[]>([]);
  const [levels, setLevels] =
    useState<AcademicLevel[]>([]);
  const [semesters, setSemesters] =
    useState<Semester[]>([]);
  const [courses, setCourses] =
    useState<Course[]>([]);
  const [teachers, setTeachers] =
    useState<Teacher[]>([]);
  const [classrooms, setClassrooms] =
    useState<Classroom[]>([]);
  const [sections, setSections] =
    useState<CourseSection[]>([]);

  const [studyPlanId, setStudyPlanId] =
    useState('');
  const [academicYearId, setAcademicYearId] =
    useState('');
  const [semesterId, setSemesterId] =
    useState('');

  const [loading, setLoading] =
    useState(true);
  const [sectionsLoading, setSectionsLoading] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editingSection, setEditingSection] =
    useState<CourseSection | null>(null);
  const [form, setForm] =
    useState<SectionForm>(emptyForm);

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (course) => course.status === 'ACTIVE',
      ),
    [courses],
  );

  const loadInitialData =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const [
          plansData,
          coursesData,
          teachersData,
          classroomsData,
        ] = await Promise.all([
          getStudyPlans(),
          getCourses(),
          getTeachers(),
          getClassrooms(),
        ]);

        setStudyPlans(plansData);
        setCourses(coursesData);
        setTeachers(teachersData);
        setClassrooms(classroomsData);

        setStudyPlanId(
          plansData[0]?.id ?? '',
        );
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
      return;
    }

    let active = true;

    const loadLevels = async () => {
      try {
        const data =
          await getAcademicLevels(studyPlanId);

        if (!active) return;

        setLevels(data);
        setAcademicYearId(
          data[0]?.id ?? '',
        );
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
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
      return;
    }

    let active = true;

    const loadSemesters = async () => {
      try {
        const data =
          await getSemesters(academicYearId);

        if (!active) return;

        setSemesters(data);
        setSemesterId(
          data[0]?.id ?? '',
        );
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      }
    };

    void loadSemesters();

    return () => {
      active = false;
    };
  }, [academicYearId]);

  const loadSections =
    useCallback(async () => {
      if (!semesterId) {
        setSections([]);
        return;
      }

      setSectionsLoading(true);
      setError('');

      try {
        const response =
          await getCourseSections({
            semesterId,
          });

        setSections(response.sections);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSectionsLoading(false);
      }
    }, [semesterId]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const openCreateDialog = () => {
    setEditingSection(null);
    setForm({
      ...emptyForm,
      courseId:
        activeCourses[0]?.id ?? '',
    });
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const openEditDialog = (
    section: CourseSection,
  ) => {
    setEditingSection(section);
    setForm({
      sectionNumber:
        section.sectionNumber,
      courseId: section.courseId,
      teacherId:
        section.teacherId ?? '',
      classroomId:
        section.classroomId ?? '',
      maxCapacity: String(
        section.maxCapacity,
      ),
      minEnrollment:
        section.minEnrollment === null ||
        section.minEnrollment === undefined
          ? ''
          : String(section.minEnrollment),
      status: section.status,
      schedules:
        section.schedules.map(
          (schedule) => ({
            day: schedule.day,
            startTime:
              schedule.startTime,
            endTime: schedule.endTime,
          }),
        ),
    });
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const addScheduleRow = () => {
    setForm((current) => ({
      ...current,
      schedules: [
        ...current.schedules,
        {
          day: 'الأحد',
          startTime: '08:00',
          endTime: '09:00',
        },
      ],
    }));
  };

  const updateSchedule = (
    index: number,
    key: keyof ScheduleForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      schedules:
        current.schedules.map(
          (schedule, itemIndex) =>
            itemIndex === index
              ? {
                  ...schedule,
                  [key]: value,
                }
              : schedule,
        ),
    }));
  };

  const removeScheduleRow = (
    index: number,
  ) => {
    setForm((current) => ({
      ...current,
      schedules:
        current.schedules.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    }));
  };

  const handleSave = async () => {
    if (!semesterId) {
      setError(
        'اختر الفصل الدراسي أولًا.',
      );
      return;
    }

    if (
      !form.sectionNumber.trim() ||
      !form.courseId ||
      !form.maxCapacity
    ) {
      setError(
        'رقم الشعبة والمقرر والسعة حقول مطلوبة.',
      );
      return;
    }

    const maxCapacity = Number(
      form.maxCapacity,
    );

    const minEnrollment =
      form.minEnrollment.trim() === ''
        ? null
        : Number(form.minEnrollment);

    if (
      !Number.isInteger(maxCapacity) ||
      maxCapacity < 1
    ) {
      setError(
        'سعة الشعبة يجب أن تكون عددًا صحيحًا أكبر من صفر.',
      );
      return;
    }

    if (
      minEnrollment !== null &&
      (!Number.isInteger(minEnrollment) ||
        minEnrollment < 0)
    ) {
      setError(
        'الحد الأدنى يجب أن يكون عددًا صحيحًا غير سالب.',
      );
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        sectionNumber:
          form.sectionNumber.trim(),
        courseId: form.courseId,
        semesterId,
        teacherId:
          form.teacherId || null,
        classroomId:
          form.classroomId || null,
        maxCapacity,
        minEnrollment,
        status: form.status,
        schedules: form.schedules,
      };

      if (editingSection) {
        await updateCourseSection(
          editingSection.id,
          payload,
        );

        setSuccess(
          'تم تحديث الشعبة بنجاح.',
        );
      } else {
        await createCourseSection(
          payload,
        );

        setSuccess(
          'تم إنشاء الشعبة بنجاح.',
        );
      }

      setDialogOpen(false);
      setEditingSection(null);
      await loadSections();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (
    section: CourseSection,
  ) => {
    const confirmed = window.confirm(
      `هل تريد حذف الشعبة ${section.sectionNumber} من مقرر ${section.course.code}؟`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await removeCourseSection(
        section.id,
      );

      setSuccess(
        'تم حذف الشعبة بنجاح.',
      );

      await loadSections();
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
            إدارة الشعب الدراسية
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ fontSize: 14 }}
          >
            إدارة الشعب والسعة والمدرس
            والقاعة ومواعيد المحاضرات.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          disabled={
            !semesterId ||
            actionLoading ||
            activeCourses.length === 0
          }
          onClick={openCreateDialog}
        >
          إضافة شعبة
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
              <InputLabel>
                المستوى
              </InputLabel>
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
                      value={semester.id}
                    >
                      {semester.nameAr}
                    </MenuItem>
                  ),
                )}
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
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            <Typography variant="h6">
              الشعب
            </Typography>

            <Chip
              variant="outlined"
              label={`${sections.length} شعبة`}
            />
          </Box>

          {sectionsLoading ? (
            <Box
              sx={{
                minHeight: 220,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : sections.length === 0 ? (
            <Box
              sx={{
                minHeight: 240,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
              }}
            >
              <Box>
                <EventOutlinedIcon
                  sx={{
                    fontSize: 42,
                    color:
                      'text.secondary',
                    mb: 1,
                  }}
                />
                <Typography variant="h6">
                  لا توجد شعب
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 13,
                    mt: 0.5,
                  }}
                >
                  أضف أول شعبة لهذا
                  الفصل الدراسي.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {sections.map((section) => (
                <Box
                  key={section.id}
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
                      justifyContent:
                        'space-between',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Stack
                        direction="row"
                        sx={{
                          gap: 1,
                          flexWrap: 'wrap',
                          alignItems:
                            'center',
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {section.course.code}
                          {' — '}
                          {
                            section.course
                              .nameAr
                          }
                        </Typography>

                        <Chip
                          size="small"
                          label={`شعبة ${section.sectionNumber}`}
                        />

                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            section.status ===
                            'OPEN'
                              ? 'مفتوحة'
                              : 'مغلقة'
                          }
                        />
                      </Stack>

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
                          variant="outlined"
                          label={`المسجلون ${section.enrolledCount}/${section.maxCapacity}`}
                        />

                        <Chip
                          size="small"
                          variant="outlined"
                          icon={
                            <PersonOutlineRoundedIcon />
                          }
                          label={
                            section.teacher
                              ?.name ??
                            'بدون مدرس'
                          }
                        />

                        <Chip
                          size="small"
                          variant="outlined"
                          icon={
                            <MeetingRoomOutlinedIcon />
                          }
                          label={
                            section.classroom
                              ?.name ??
                            'بدون قاعة'
                          }
                        />
                      </Stack>

                      {section.schedules
                        .length > 0 && (
                        <Stack
                          direction="row"
                          sx={{
                            gap: 1,
                            flexWrap: 'wrap',
                            mt: 1.3,
                          }}
                        >
                          {section.schedules.map(
                            (
                              schedule,
                              index,
                            ) => (
                              <Chip
                                key={
                                  schedule.id ??
                                  `${section.id}-${index}`
                                }
                                size="small"
                                label={`${schedule.day} ${schedule.startTime} - ${schedule.endTime}`}
                              />
                            ),
                          )}
                        </Stack>
                      )}
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
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          openEditDialog(
                            section,
                          )
                        }
                      >
                        <EditOutlinedIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          void handleDelete(
                            section,
                          )
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
        maxWidth="md"
      >
        <DialogTitle>
          {editingSection
            ? 'تعديل الشعبة'
            : 'إضافة شعبة'}
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ pt: 1 }}
          >
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
                label="رقم الشعبة"
                value={form.sectionNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sectionNumber:
                      event.target.value,
                  }))
                }
              />

              <FormControl fullWidth>
                <InputLabel>
                  المقرر
                </InputLabel>
                <Select
                  value={form.courseId}
                  label="المقرر"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      courseId:
                        event.target.value,
                    }))
                  }
                >
                  {activeCourses.map(
                    (course) => (
                      <MenuItem
                        key={course.id}
                        value={course.id}
                      >
                        {course.code} —{' '}
                        {course.nameAr}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>
                  المدرس
                </InputLabel>
                <Select
                  value={form.teacherId}
                  label="المدرس"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      teacherId:
                        event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">
                    بدون مدرس
                  </MenuItem>
                  {teachers.map(
                    (teacher) => (
                      <MenuItem
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.name}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>
                  القاعة
                </InputLabel>
                <Select
                  value={
                    form.classroomId
                  }
                  label="القاعة"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      classroomId:
                        event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">
                    بدون قاعة
                  </MenuItem>
                  {classrooms.map(
                    (classroom) => (
                      <MenuItem
                        key={classroom.id}
                        value={classroom.id}
                      >
                        {classroom.name}
                        {classroom.capacity
                          ? ` — ${classroom.capacity}`
                          : ''}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              <TextField
                type="number"
                label="السعة القصوى"
                value={form.maxCapacity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxCapacity:
                      event.target.value,
                  }))
                }
              />

              <TextField
                type="number"
                label="الحد الأدنى للطلاب"
                value={
                  form.minEnrollment
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minEnrollment:
                      event.target.value,
                  }))
                }
              />

              <FormControl fullWidth>
                <InputLabel>
                  حالة الشعبة
                </InputLabel>
                <Select
                  value={form.status}
                  label="حالة الشعبة"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status:
                        event.target
                          .value as SectionStatus,
                    }))
                  }
                >
                  <MenuItem value="OPEN">
                    مفتوحة
                  </MenuItem>
                  <MenuItem value="CLOSED">
                    مغلقة
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 2,
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{ fontWeight: 700 }}
                >
                  مواعيد الشعبة
                </Typography>

                <Button
                  size="small"
                  startIcon={
                    <AddRoundedIcon />
                  }
                  onClick={addScheduleRow}
                >
                  إضافة موعد
                </Button>
              </Box>

              {form.schedules.length ===
              0 ? (
                <Alert severity="info">
                  لا توجد مواعيد مضافة
                  للشعبة حاليًا.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {form.schedules.map(
                    (
                      schedule,
                      index,
                    ) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr 1fr auto',
                          },
                          gap: 1.5,
                          alignItems:
                            'center',
                        }}
                      >
                        <FormControl fullWidth>
                          <InputLabel>
                            اليوم
                          </InputLabel>
                          <Select
                            value={
                              schedule.day
                            }
                            label="اليوم"
                            onChange={(
                              event,
                            ) =>
                              updateSchedule(
                                index,
                                'day',
                                event.target
                                  .value,
                              )
                            }
                          >
                            {days.map(
                              (day) => (
                                <MenuItem
                                  key={day}
                                  value={day}
                                >
                                  {day}
                                </MenuItem>
                              ),
                            )}
                          </Select>
                        </FormControl>

                        <TextField
                          type="time"
                          label="البداية"
                          value={
                            schedule.startTime
                          }
                          slotProps={{
                            inputLabel: {
                              shrink: true,
                            },
                          }}
                          onChange={(
                            event,
                          ) =>
                            updateSchedule(
                              index,
                              'startTime',
                              event.target
                                .value,
                            )
                          }
                        />

                        <TextField
                          type="time"
                          label="النهاية"
                          value={
                            schedule.endTime
                          }
                          slotProps={{
                            inputLabel: {
                              shrink: true,
                            },
                          }}
                          onChange={(
                            event,
                          ) =>
                            updateSchedule(
                              index,
                              'endTime',
                              event.target
                                .value,
                            )
                          }
                        />

                        <IconButton
                          color="error"
                          onClick={() =>
                            removeScheduleRow(
                              index,
                            )
                          }
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Box>
                    ),
                  )}
                </Stack>
              )}
            </Box>
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
              : editingSection
                ? 'حفظ التعديلات'
                : 'إضافة الشعبة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
