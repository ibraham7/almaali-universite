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
  InputAdornment,
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
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';

import {
  addCoursePrerequisites,
  createCourse,
  deleteCourse,
  getCourses,
  removeCoursePrerequisite,
  updateCourse,
  type Course,
  type CoursePayload,
  type CourseRequirement,
  type CourseStatus,
  type CourseType,
} from '../../api/courses';

import {
  getAcademicLevels,
  getColleges,
  getDepartments,
  getPrograms,
  getSemesters,
  getStudyPlans,
  type AcademicLevel,
  type College,
  type Department,
  type Program,
  type Semester,
  type StudyPlan,
} from '../../api/academicStructure';

interface CourseForm {
  code: string;
  nameAr: string;
  nameEn: string;
  credits: string;
  ects: string;
  type: CourseType;
  requirement: CourseRequirement;
  description: string;
  status: CourseStatus;
  collegeId: string;
  departmentId: string;
  programId: string;
  studyPlanId: string;
  academicYearId: string;
  semesterId: string;
}

const emptyForm: CourseForm = {
  code: '',
  nameAr: '',
  nameEn: '',
  credits: '3',
  ects: '0',
  type: 'THEORY',
  requirement: 'MANDATORY',
  description: '',
  status: 'ACTIVE',
  collegeId: '',
  departmentId: '',
  programId: '',
  studyPlanId: '',
  academicYearId: '',
  semesterId: '',
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; errors?: string[] }
      | undefined;

    if (data?.errors?.length) return data.errors.join('، ');
    if (Array.isArray(data?.message)) return data.message.join('، ');
    if (typeof data?.message === 'string') return data.message;
  }

  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع.';
}

function typeLabel(type: CourseType) {
  return type === 'THEORY' ? 'نظري' : 'عملي';
}

function requirementLabel(requirement: CourseRequirement) {
  return requirement === 'MANDATORY' ? 'إجباري' : 'اختياري';
}

function statusLabel(status: CourseStatus) {
  return status === 'ACTIVE' ? 'فعال' : 'غير فعال';
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [prerequisiteDialogOpen, setPrerequisiteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [prerequisiteCourse, setPrerequisiteCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [selectedPrerequisiteIds, setSelectedPrerequisiteIds] = useState<string[]>([]);
  const [form, setForm] = useState<CourseForm>(emptyForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [
        coursesData,
        collegesData,
        departmentsData,
        programsData,
        plansData,
        levelsData,
        semestersData,
      ] = await Promise.all([
        getCourses(),
        getColleges(),
        getDepartments(),
        getPrograms(),
        getStudyPlans(),
        getAcademicLevels(),
        getSemesters(),
      ]);

      setCourses(coursesData.courses);
      setColleges(collegesData);
      setDepartments(departmentsData);
      setPrograms(programsData);
      setStudyPlans(plansData);
      setLevels(levelsData);
      setSemesters(semestersData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return courses.filter((course) => {
      if (statusFilter && course.status !== statusFilter) return false;
      if (requirementFilter && course.requirement !== requirementFilter) return false;
      if (!normalized) return true;

      return [course.code, course.nameAr, course.nameEn ?? ''].some((value) =>
        value.toLowerCase().includes(normalized),
      );
    });
  }, [courses, search, statusFilter, requirementFilter]);

  const visibleDepartments = useMemo(
    () => departments.filter((item) => item.collegeId === form.collegeId),
    [departments, form.collegeId],
  );

  const visiblePrograms = useMemo(
    () => programs.filter((item) => form.departmentId
      ? item.departmentId === form.departmentId
      : !item.departmentId && item.collegeId === form.collegeId),
    [programs, form.departmentId, form.collegeId],
  );

  const visiblePlans = useMemo(
    () => studyPlans.filter((item) => item.programId === form.programId),
    [studyPlans, form.programId],
  );

  const visibleLevels = useMemo(
    () =>
      levels
        .filter((item) => item.studyPlanId === form.studyPlanId)
        .sort((a, b) => a.levelNumber - b.levelNumber),
    [levels, form.studyPlanId],
  );

  const visibleSemesters = useMemo(
    () =>
      semesters
        .filter((item) => item.academicYearId === form.academicYearId)
        .sort((a, b) => a.semesterNumber - b.semesterNumber),
    [semesters, form.academicYearId],
  );

  const prerequisiteOptions = useMemo(() => {
    if (!prerequisiteCourse) return [];

    const existingIds = new Set(
      prerequisiteCourse.prerequisites.map((relation) => relation.prerequisiteId),
    );

    return courses.filter(
      (course) => course.id !== prerequisiteCourse.id && !existingIds.has(course.id),
    );
  }, [courses, prerequisiteCourse]);

  function openCreate() {
    setEditingCourse(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setForm({
      code: course.code,
      nameAr: course.nameAr,
      nameEn: course.nameEn ?? '',
      credits: String(course.credits),
      ects: String(course.ects ?? 0),
      type: course.type,
      requirement: course.requirement,
      description: course.description ?? '',
      status: course.status,
      collegeId: '',
      departmentId: '',
      programId: '',
      studyPlanId: '',
      academicYearId: '',
      semesterId: '',
    });
    setError('');
    setSuccess('');
    setDialogOpen(true);
  }

  function openPrerequisites(course: Course) {
    setPrerequisiteCourse(course);
    setSelectedPrerequisiteIds([]);
    setError('');
    setSuccess('');
    setPrerequisiteDialogOpen(true);
  }

  async function handleSave() {
    const credits = Number(form.credits);
    const ects = Number(form.ects);

    if (!form.code.trim() || !form.nameAr.trim()) {
      setError('رمز المقرر والاسم العربي مطلوبان.');
      return;
    }

    if (!Number.isInteger(credits) || credits < 1) {
      setError('الساعات يجب أن تكون عددًا صحيحًا أكبر من صفر.');
      return;
    }

    if (!Number.isInteger(ects) || ects < 0) {
      setError('ECTS يجب أن يكون عددًا صحيحًا غير سالب.');
      return;
    }

    if (
      !editingCourse &&
      (!form.collegeId ||
        !form.programId ||
        !form.studyPlanId ||
        !form.academicYearId ||
        !form.semesterId)
    ) {
      setError('حدد الكلية والتخصص والخطة والسنة والفصل قبل إنشاء المقرر.');
      return;
    }

    const payload: CoursePayload = {
      code: form.code.trim(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim() || undefined,
      credits,
      ects,
      type: form.type,
      requirement: form.requirement,
      description: form.description.trim() || undefined,
      status: form.status,
      ...(!editingCourse
        ? {
            studyPlanId: form.studyPlanId,
            academicYearId: form.academicYearId,
            semesterId: form.semesterId,
          }
        : {}),
    };

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        setSuccess('تم تحديث المقرر بنجاح.');
      } else {
        await createCourse(payload);
        setSuccess('تم إنشاء المقرر وربطه بالمسار الأكاديمي بنجاح.');
      }

      setDialogOpen(false);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleStatus(course: Course) {
    try {
      setError('');
      setSuccess('');

      await updateCourse(course.id, {
        status: course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });

      setSuccess(course.status === 'ACTIVE' ? 'تم تعطيل المقرر.' : 'تم تفعيل المقرر.');
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function handleDeleteCourse() {
    if (!deletingCourse) return;
    try {
      setActionLoading(true);
      setError('');
      await deleteCourse(deletingCourse.id);
      if (prerequisiteCourse?.id === deletingCourse.id) {
        setPrerequisiteCourse(null);
        setPrerequisiteDialogOpen(false);
      }
      setDeletingCourse(null);
      setSuccess('تم حذف المقرر وارتباطاته الأكاديمية.');
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddPrerequisite() {
    if (!prerequisiteCourse || !selectedPrerequisiteIds.length) return;

    try {
      setActionLoading(true);
      setError('');

      const response = await addCoursePrerequisites(
        prerequisiteCourse.id,
        selectedPrerequisiteIds,
      );

      if (response.success === false) {
        setError(response.errors?.join('، ') ?? 'تعذر إضافة المتطلب السابق.');
        return;
      }

      setSuccess(`تمت إضافة ${selectedPrerequisiteIds.length} من المتطلبات السابقة.`);
      setSelectedPrerequisiteIds([]);

      const responseCourses = await getCourses();
      setCourses(responseCourses.courses);

      const refreshed = responseCourses.courses.find(
        (course) => course.id === prerequisiteCourse.id,
      );
      if (refreshed) setPrerequisiteCourse(refreshed);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePrerequisite(prerequisiteId: string) {
    if (!prerequisiteCourse) return;

    try {
      setActionLoading(true);
      setError('');

      const response = await removeCoursePrerequisite(
        prerequisiteCourse.id,
        prerequisiteId,
      );

      if (response.success === false) {
        setError(response.errors?.join('، ') ?? 'تعذر حذف المتطلب السابق.');
        return;
      }

      setSuccess('تم حذف المتطلب السابق.');

      const responseCourses = await getCourses();
      setCourses(responseCourses.courses);

      const refreshed = responseCourses.courses.find(
        (course) => course.id === prerequisiteCourse.id,
      );
      if (refreshed) setPrerequisiteCourse(refreshed);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center' }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">جاري تحميل المقررات...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 25, md: 30 }, mb: 0.7 }}>
            المقررات الدراسية
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            إدارة المقررات وربطها بالكلية والتخصص والسنة والفصل والمتطلبات السابقة.
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
          إضافة مقرر
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: '20px !important' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 180px 180px' },
              gap: 2,
            }}
          >
            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالرمز أو اسم المقرر..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl fullWidth>
              <Select
                value={requirementFilter}
                displayEmpty
                onChange={(event) => setRequirementFilter(event.target.value)}
              >
                <MenuItem value="">جميع الأنواع</MenuItem>
                <MenuItem value="MANDATORY">إجباري</MenuItem>
                <MenuItem value="ELECTIVE">اختياري</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Select
                value={statusFilter}
                displayEmpty
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="">جميع الحالات</MenuItem>
                <MenuItem value="ACTIVE">فعال</MenuItem>
                <MenuItem value="INACTIVE">غير فعال</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          قائمة المقررات
        </Typography>
        <Chip label={`${filteredCourses.length} مقرر`} />
      </Stack>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent sx={{ minHeight: 220, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <Box>
              <MenuBookOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6">لا توجد مقررات</Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {filteredCourses.map((course) => {
            const placements = course.planCourses ?? [];

            return (
              <Card key={course.id}>
                <CardContent sx={{ p: '22px !important' }}>
                  <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.7 }}>
                        <Chip label={course.code} size="small" />
                        <Chip label={statusLabel(course.status)} size="small" color={course.status === 'ACTIVE' ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{course.nameAr}</Typography>
                      {course.nameEn && <Typography color="text.secondary" sx={{ fontSize: 12 }}>{course.nameEn}</Typography>}
                    </Box>

                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(course)}>
                        تعديل
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() => setDeletingCourse(course)}
                      >
                        حذف
                      </Button>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
                    <Chip variant="outlined" size="small" label={`${course.credits} ساعات`} />
                    <Chip variant="outlined" size="small" label={`ECTS ${course.ects ?? 0}`} />
                    <Chip variant="outlined" size="small" label={typeLabel(course.type)} />
                    <Chip variant="outlined" size="small" label={requirementLabel(course.requirement)} />
                  </Stack>

                  {placements.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>المسار الأكاديمي</Typography>
                      <Stack spacing={0.75}>
                        {placements.map((placement) => (
                          <Typography key={placement.id} color="text.secondary" sx={{ fontSize: 12.5 }}>
                            {placement.studyPlan.program.college?.nameAr ?? placement.studyPlan.program.department?.college.nameAr ?? 'كلية غير محددة'}
                            {' • '}
                            {placement.studyPlan.program.nameAr}
                            {' • '}
                            {placement.academicYear.nameAr}
                            {' • '}
                            {placement.semester.nameAr}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {course.description && (
                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      {course.description}
                    </Typography>
                  )}

                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>المتطلبات السابقة</Typography>

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
                      {course.prerequisites.length === 0 ? (
                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>لا يوجد</Typography>
                      ) : (
                        course.prerequisites.map((relation) => (
                          <Chip key={relation.id} size="small" label={`${relation.prerequisite.code} — ${relation.prerequisite.nameAr}`} />
                        ))
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" onClick={() => openPrerequisites(course)}>
                        إدارة المتطلبات
                      </Button>
                      <Button size="small" onClick={() => void toggleStatus(course)}>
                        {course.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !actionLoading && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingCourse ? 'تعديل المقرر' : 'إضافة مقرر جديد'}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {!editingCourse && (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>المسار الأكاديمي</Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>الكلية</InputLabel>
                    <Select
                      label="الكلية"
                      value={form.collegeId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          collegeId: event.target.value,
                          departmentId: '',
                          programId: '',
                          studyPlanId: '',
                          academicYearId: '',
                          semesterId: '',
                        }))
                      }
                    >
                      {colleges.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth disabled={!form.collegeId}>
                    <InputLabel>القسم (إن وجد)</InputLabel>
                    <Select
                      label="القسم (إن وجد)"
                      value={form.departmentId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          departmentId: event.target.value,
                          programId: '',
                          studyPlanId: '',
                          academicYearId: '',
                          semesterId: '',
                        }))
                      }
                    >
                      <MenuItem value="">بدون قسم</MenuItem>
                      {visibleDepartments.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required disabled={!form.collegeId}>
                    <InputLabel>التخصص</InputLabel>
                    <Select
                      label="التخصص"
                      value={form.programId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          programId: event.target.value,
                          studyPlanId: '',
                          academicYearId: '',
                          semesterId: '',
                        }))
                      }
                    >
                      {visiblePrograms.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required disabled={!form.programId}>
                    <InputLabel>العام الدراسي</InputLabel>
                    <Select
                      label="العام الدراسي"
                      value={form.studyPlanId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          studyPlanId: event.target.value,
                          academicYearId: '',
                          semesterId: '',
                        }))
                      }
                    >
                      {visiblePlans.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required disabled={!form.studyPlanId}>
                    <InputLabel>السنة / المستوى</InputLabel>
                    <Select
                      label="السنة / المستوى"
                      value={form.academicYearId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          academicYearId: event.target.value,
                          semesterId: '',
                        }))
                      }
                    >
                      {visibleLevels.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required disabled={!form.academicYearId}>
                    <InputLabel>الفصل</InputLabel>
                    <Select
                      label="الفصل"
                      value={form.semesterId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, semesterId: event.target.value }))
                      }
                    >
                      {visibleSemesters.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.nameAr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            <TextField
              label="رمز المقرر"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="اسم المقرر بالعربية"
              value={form.nameAr}
              onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="اسم المقرر بالإنجليزية"
              value={form.nameEn}
              onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
              fullWidth
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="الساعات المعتمدة"
                type="number"
                value={form.credits}
                onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))}
              />
              <TextField
                label="ECTS"
                type="number"
                value={form.ects}
                onChange={(event) => setForm((current) => ({ ...current, ects: event.target.value }))}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>نوع المقرر</InputLabel>
                <Select
                  value={form.type}
                  label="نوع المقرر"
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CourseType }))}
                >
                  <MenuItem value="THEORY">نظري</MenuItem>
                  <MenuItem value="PRACTICAL">عملي</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={form.requirement}
                  label="التصنيف"
                  onChange={(event) => setForm((current) => ({ ...current, requirement: event.target.value as CourseRequirement }))}
                >
                  <MenuItem value="MANDATORY">إجباري</MenuItem>
                  <MenuItem value="ELECTIVE">اختياري</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={form.status}
                label="الحالة"
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CourseStatus }))}
              >
                <MenuItem value="ACTIVE">فعال</MenuItem>
                <MenuItem value="INACTIVE">غير فعال</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="الوصف"
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={actionLoading}>إلغاء</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={actionLoading}>
            {actionLoading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={prerequisiteDialogOpen}
        onClose={() => {
          if (!actionLoading) {
            setPrerequisiteDialogOpen(false);
            setSelectedPrerequisiteIds([]);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>إدارة المتطلبات السابقة</DialogTitle>

        <DialogContent dividers>
          {prerequisiteCourse && (
            <Stack spacing={3}>
              <Typography sx={{ fontWeight: 700 }}>
                {prerequisiteCourse.code} — {prerequisiteCourse.nameAr}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth>
                  <InputLabel>المقرر</InputLabel>
                  <Select
                    label="المقرر"
                    multiple
                    value={selectedPrerequisiteIds}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const course = prerequisiteOptions.find((item) => item.id === id);
                          return <Chip key={id} size="small" label={course ? `${course.code} — ${course.nameAr}` : id} />;
                        })}
                      </Box>
                    )}
                    onChange={(event) => setSelectedPrerequisiteIds(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
                  >
                    {prerequisiteOptions.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.code} — {course.nameAr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  onClick={() => void handleAddPrerequisite()}
                  disabled={!selectedPrerequisiteIds.length || actionLoading}
                  sx={{ minWidth: 110 }}
                >
                  إضافة المحدد
                </Button>
              </Stack>

              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1.5 }}>المتطلبات الحالية</Typography>

                {prerequisiteCourse.prerequisites.length === 0 ? (
                  <Alert severity="info">لا توجد متطلبات سابقة لهذا المقرر.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {prerequisiteCourse.prerequisites.map((relation) => (
                      <Box
                        key={relation.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{relation.prerequisite.code}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            {relation.prerequisite.nameAr}
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={actionLoading}
                          onClick={() => void handleRemovePrerequisite(relation.prerequisiteId)}
                        >
                          حذف
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setPrerequisiteDialogOpen(false); setSelectedPrerequisiteIds([]); }}>إغلاق</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(deletingCourse)}
        onClose={() => !actionLoading && setDeletingCourse(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>تأكيد حذف المقرر</DialogTitle>
        <DialogContent dividers>
          <Typography>
            هل تريد حذف «{deletingCourse?.code} — {deletingCourse?.nameAr}» نهائيًا من قاعدة البيانات؟
            إذا كان مرتبطًا بتسجيلات طلاب أو نتائج، سيرفض النظام الحذف.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingCourse(null)} disabled={actionLoading}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDeleteCourse()}
            disabled={actionLoading}
          >
            {actionLoading ? 'جارٍ الحذف...' : 'حذف نهائيًا'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
