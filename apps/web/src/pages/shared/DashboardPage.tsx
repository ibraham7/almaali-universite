import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/material';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import GradingRoundedIcon from '@mui/icons-material/GradingRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import { useAuth } from '../../auth/AuthContext';

import {
  universityColors,
} from '../../theme/theme';

import {
  getDashboardCourses,
  getDashboardEnrollments,
  getDashboardSections,
  getDashboardStudents,
  getMyAdvisorApprovals,
  getStudentDashboardRegistration,
  type DashboardApproval,
  type DashboardEnrollment,
  type DashboardSection,
  type DashboardStudent,
  type StudentRegistrationContext,
} from '../../api/dashboard';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
}

interface QuickActionProps {
  title: string;
  description: string;
  path: string;
  icon: ReactNode;
}

function getRoleLabel(
  role?: string,
) {
  switch (role) {
    case 'STUDENT':
      return 'طالب';

    case 'ADVISOR':
      return 'المرشد الأكاديمي';

    case 'REGISTRAR':
      return 'مسجل الجامعة';

    case 'SYSTEM_ADMIN':
      return 'مدير النظام';

    default:
      return 'مستخدم';
  }
}

function getWelcomeText(
  role?: string,
) {
  switch (role) {
    case 'STUDENT':
      return 'تابع تسجيلك الأكاديمي ومقرراتك وجدولك الدراسي من مكان واحد.';

    case 'ADVISOR':
      return 'تابع طلبات الطلاب والخطط الدراسية والإجراءات الأكاديمية المطلوبة.';

    case 'REGISTRAR':
      return 'أدر المقررات والشعب والفترات والبيانات الأكاديمية للجامعة.';

    case 'SYSTEM_ADMIN':
      return 'تابع النظام الأكاديمي والمستخدمين والإعدادات والعمليات الإدارية.';

    default:
      return 'مرحبًا بك في نظام الإدارة الجامعية.';
  }
}

function enrollmentStatusLabel(
  status?: string,
) {
  switch (status) {
    case 'DRAFT':
      return 'مسودة';

    case 'PENDING':
      return 'بانتظار الموافقة';

    case 'APPROVED':
      return 'معتمد';

    case 'REJECTED':
      return 'مرفوض';

    case 'CONFIRMED':
      return 'مؤكد';

    case 'DROPPED':
      return 'منسحب';

    case 'CANCELLED':
      return 'ملغى';

    default:
      return status ?? 'لا يوجد طلب';
  }
}

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        boxShadow: 'none',

        transition:
          '0.2s ease',

        '&:hover': {
          borderColor:
            '#C7D4E0',

          transform:
            'translateY(-2px)',
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,

          '&:last-child': {
            pb: 2.5,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',

            alignItems:
              'flex-start',

            justifyContent:
              'space-between',

            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 12.5,

                color:
                  universityColors.textSecondary,

                fontWeight: 500,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.6,

                fontSize: 27,

                lineHeight: 1.3,

                fontWeight: 700,

                color:
                  universityColors.navyDark,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,

              borderRadius: 2.5,

              display: 'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              flexShrink: 0,

              bgcolor:
                universityColors.softBlue,

              color:
                universityColors.navy,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          sx={{
            mt: 1.5,

            fontSize: 11.5,

            color:
              universityColors.textSecondary,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  title,
  description,
  path,
  icon,
}: QuickActionProps) {
  const navigate =
    useNavigate();

  return (
    <Box
      component="button"
      type="button"
      onClick={() =>
        navigate(path)
      }
      sx={{
        width: '100%',

        border:
          `1px solid ${universityColors.border}`,

        bgcolor: '#FFFFFF',

        borderRadius: 2.5,

        p: 1.7,

        display: 'flex',

        alignItems: 'center',

        gap: 1.5,

        textAlign: 'right',

        cursor: 'pointer',

        transition:
          '0.2s ease',

        fontFamily: 'inherit',

        '&:hover': {
          borderColor:
            '#B9C9D8',

          bgcolor:
            '#FAFCFE',
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,

          borderRadius: 2,

          bgcolor:
            universityColors.softBlue,

          color:
            universityColors.navy,

          display: 'flex',

          alignItems: 'center',

          justifyContent:
            'center',

          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,

            fontWeight: 600,

            color:
              universityColors.text,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            mt: 0.2,

            fontSize: 10.5,

            color:
              universityColors.textSecondary,
          }}
        >
          {description}
        </Typography>
      </Box>

      <ArrowBackRoundedIcon
        sx={{
          fontSize: 18,
          color: '#A2AFBC',
        }}
      />
    </Box>
  );
}

function DashboardLoading() {
  return (
    <Box
      sx={{
        minHeight: 350,

        display: 'grid',

        placeItems: 'center',
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
        }}
      >
        <CircularProgress />

        <Typography
          sx={{
            mt: 1.5,

            fontSize: 12,

            color:
              universityColors.textSecondary,
          }}
        >
          جاري تحميل بيانات لوحة
          التحكم...
        </Typography>
      </Box>
    </Box>
  );
}

function StudentDashboard() {
  const navigate =
    useNavigate();

  const [
    registration,
    setRegistration,
  ] =
    useState<StudentRegistrationContext | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        setError('');

        const data =
          await getStudentDashboardRegistration();

        setRegistration(data);
      } catch {
        setError(
          'تعذر تحميل بيانات التسجيل الأكاديمي.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  const items =
    registration?.enrollment
      ?.items ?? [];

  const registeredCourses =
    items.length;

  const registeredCredits =
    items.reduce(
      (sum, item) =>
        sum +
        (item.course
          ?.credits ?? 0),
      0,
    );

  const status =
    enrollmentStatusLabel(
      registration?.enrollment
        ?.status,
    );

  const registrationOpen =
    registration
      ?.registrationOpen === true;

  return (
    <>
      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            sm: 'repeat(2, minmax(0, 1fr))',

            xl: 'repeat(4, minmax(0, 1fr))',
          },

          gap: 2,
        }}
      >
        <StatCard
          title="المقررات المسجلة"
          value={String(
            registeredCourses,
          )}
          description="الفصل الدراسي الحالي"
          icon={
            <MenuBookRoundedIcon />
          }
        />

        <StatCard
          title="الساعات المسجلة"
          value={String(
            registeredCredits,
          )}
          description="إجمالي الساعات المعتمدة"
          icon={
            <AccessTimeRoundedIcon />
          }
        />

        <StatCard
          title="حالة التسجيل"
          value={status}
          description={
            registrationOpen
              ? 'فترة التسجيل مفتوحة'
              : 'فترة التسجيل مغلقة'
          }
          icon={
            <AssignmentTurnedInRoundedIcon />
          }
        />

        <StatCard
          title="المعدل التراكمي"
          value="—"
          description="سيظهر بعد تنفيذ نظام النتائج والمعدل"
          icon={
            <SchoolRoundedIcon />
          }
        />
      </Box>

      <Box
        sx={{
          mt: 3,

          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            lg: 'minmax(0, 1.65fr) minmax(300px, 0.85fr)',
          },

          gap: 2.5,

          alignItems: 'start',
        }}
      >
        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',

                alignItems: {
                  xs: 'flex-start',
                  sm: 'center',
                },

                justifyContent:
                  'space-between',

                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 16,

                    fontWeight: 700,

                    color:
                      universityColors.navyDark,
                  }}
                >
                  التسجيل الأكاديمي
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    fontSize: 11.5,

                    color:
                      universityColors.textSecondary,
                  }}
                >
                  حالة التسجيل الحالية
                  للطالب.
                </Typography>
              </Box>

              <Chip
                label={
                  registrationOpen
                    ? 'التسجيل مفتوح'
                    : 'التسجيل مغلق'
                }
                size="small"
                color={
                  registrationOpen
                    ? 'success'
                    : 'default'
                }
              />
            </Box>

            <Box
              sx={{
                mt: 3,

                p: {
                  xs: 2,
                  md: 2.5,
                },

                borderRadius: 3,

                bgcolor: '#F8FAFC',

                border:
                  `1px solid ${universityColors.border}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',

                  alignItems:
                    'center',

                  gap: 1,
                }}
              >
                <CheckCircleRoundedIcon
                  sx={{
                    fontSize: 20,

                    color:
                      universityColors.navy,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 13,

                    fontWeight: 600,
                  }}
                >
                  {status}
                </Typography>
              </Box>

              <Typography
                sx={{
                  mt: 1,

                  fontSize: 12,

                  color:
                    universityColors.textSecondary,
                }}
              >
                لديك{' '}
                {registeredCourses}{' '}
                مقررات مسجلة بإجمالي{' '}
                {registeredCredits}{' '}
                ساعات معتمدة.
              </Typography>

              <LinearProgress
                variant="determinate"
                value={
                  registeredCourses >
                    0
                    ? 100
                    : 0
                }
                sx={{
                  mt: 2.5,

                  height: 7,

                  borderRadius: 20,

                  bgcolor:
                    '#E8EDF2',

                  '& .MuiLinearProgress-bar':
                  {
                    borderRadius: 20,

                    bgcolor:
                      universityColors.gold,
                  },
                }}
              />

              <Button
                variant="contained"
                onClick={() =>
                  navigate(
                    '/student/registration',
                  )
                }
                sx={{ mt: 2.5 }}
              >
                الانتقال إلى تسجيل
                المقررات
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{ p: 2.5 }}
          >
            <Typography
              sx={{
                fontSize: 15,

                fontWeight: 700,

                color:
                  universityColors.navyDark,
              }}
            >
              الوصول السريع
            </Typography>

            <Box
              sx={{
                mt: 2,

                display: 'flex',

                flexDirection:
                  'column',

                gap: 1.2,
              }}
            >
              <QuickAction
                title="تسجيل المقررات"
                description="استعراض وإضافة المقررات المتاحة"
                path="/student/registration"
                icon={
                  <MenuBookRoundedIcon />
                }
              />

              <QuickAction
                title="الجدول الدراسي"
                description="استعراض جدول الشعب المسجلة"
                path="/student/schedule"
                icon={
                  <CalendarMonthRoundedIcon />
                }
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

function AdvisorDashboard({
  userId,
}: {
  userId?: string;
}) {
  const [
    students,
    setStudents,
  ] = useState<
    DashboardStudent[]
  >([]);

  const [
    approvals,
    setApprovals,
  ] = useState<
    DashboardApproval[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        setError('');

        const [
          studentsData,
          approvalsData,
        ] = await Promise.all([
          getDashboardStudents(),

          getMyAdvisorApprovals(),
        ]);

        setStudents(
          studentsData,
        );

        setApprovals(
          approvalsData,
        );
      } catch {
        setError(
          'تعذر تحميل بعض بيانات المرشد.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const advisorStudents =
    useMemo(
      () =>
        userId
          ? students.filter(
            (student) =>
              student.advisorId ===
              userId,
          )
          : [],
      [students, userId],
    );

  const pending =
    approvals.filter(
      (approval) =>
        approval.status ===
        'PENDING',
    ).length;

  const approved =
    approvals.filter(
      (approval) =>
        approval.status ===
        'APPROVED',
    ).length;

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <>
      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            sm: 'repeat(2, minmax(0, 1fr))',

            xl: 'repeat(4, minmax(0, 1fr))',
          },

          gap: 2,
        }}
      >
        <StatCard
          title="طلبات بانتظار المراجعة"
          value={String(pending)}
          description="طلبات تسجيل تحتاج إجراء"
          icon={
            <AssignmentTurnedInRoundedIcon />
          }
        />

        <StatCard
          title="الطلاب"
          value={String(
            advisorStudents.length,
          )}
          description="الطلاب المرتبطون بهذا المرشد"
          icon={
            <GroupsRoundedIcon />
          }
        />

        <StatCard
          title="إجمالي الطلبات"
          value={String(
            approvals.length,
          )}
          description="طلبات التسجيل الخاصة بالمرشد"
          icon={
            <AccountTreeRoundedIcon />
          }
        />

        <StatCard
          title="الطلبات المعتمدة"
          value={String(approved)}
          description="الطلبات التي تمت الموافقة عليها"
          icon={
            <CheckCircleRoundedIcon />
          }
        />
      </Box>

      <Box
        sx={{
          mt: 3,

          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            lg: 'minmax(0, 1.6fr) minmax(300px, 0.9fr)',
          },

          gap: 2.5,
        }}
      >
        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{ p: 3 }}
          >
            <Typography
              sx={{
                fontSize: 16,

                fontWeight: 700,

                color:
                  universityColors.navyDark,
              }}
            >
              طلبات التسجيل
            </Typography>

            <Typography
              sx={{
                mt: 0.5,

                color:
                  universityColors.textSecondary,

                fontSize: 11.5,
              }}
            >
              الطلبات التي تحتاج
              مراجعة المرشد الأكاديمي.
            </Typography>

            <Box
              sx={{
                mt: 3,

                p: 3,

                borderRadius: 3,

                bgcolor: '#FAFCFE',

                border:
                  `1px solid ${universityColors.border}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,

                  fontWeight: 700,

                  color:
                    universityColors.navyDark,
                }}
              >
                {pending > 0
                  ? `لديك ${pending} طلبات بانتظار المراجعة`
                  : 'لا توجد طلبات معلقة حاليًا'}
              </Typography>

              <Typography
                sx={{
                  mt: 0.8,

                  fontSize: 11.5,

                  color:
                    universityColors.textSecondary,
                }}
              >
                إجمالي الطلبات المرتبطة
                بحسابك:{' '}
                {approvals.length}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{ p: 2.5 }}
          >
            <Typography
              sx={{
                fontSize: 15,

                fontWeight: 700,

                color:
                  universityColors.navyDark,
              }}
            >
              الوصول السريع
            </Typography>

            <Box
              sx={{
                mt: 2,

                display: 'flex',

                flexDirection:
                  'column',

                gap: 1.2,
              }}
            >
              <QuickAction
                title="طلبات التسجيل"
                description="مراجعة طلبات الطلاب"
                path="/advisor/registrations"
                icon={
                  <AssignmentTurnedInRoundedIcon />
                }
              />

              <QuickAction
                title="الخطة الدراسية"
                description="ترتيب مقررات الخطة وأولوياتها"
                path="/supervisor/study-plan"
                icon={
                  <AccountTreeRoundedIcon />
                }
              />

              <QuickAction
                title="الطلاب"
                description="استعراض الطلاب المرتبطين"
                path="/students"
                icon={
                  <GroupsRoundedIcon />
                }
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

function AdministrationDashboard({
  role,
}: {
  role: string;
}) {
  const [
    students,
    setStudents,
  ] = useState<
    DashboardStudent[]
  >([]);

  const [courses, setCourses] =
    useState<unknown[]>([]);

  const [
    sections,
    setSections,
  ] = useState<
    DashboardSection[]
  >([]);

  const [
    enrollments,
    setEnrollments,
  ] = useState<
    DashboardEnrollment[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function loadData() {
    try {
      setLoading(true);

      setError('');

      const [
        studentsData,
        coursesData,
        sectionsData,
        enrollmentsData,
      ] = await Promise.all([
        getDashboardStudents(),

        getDashboardCourses(),

        getDashboardSections(),

        getDashboardEnrollments(),
      ]);

      setStudents(studentsData);

      setCourses(coursesData);

      setSections(sectionsData);

      setEnrollments(
        enrollmentsData,
      );
    } catch {
      setError(
        'تعذر تحميل بعض إحصاءات النظام.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  const openSections =
    sections.filter(
      (section) =>
        section.status ===
        'OPEN',
    ).length;

  const pendingEnrollments =
    enrollments.filter(
      (enrollment) =>
        enrollment.status ===
        'PENDING' ||
        enrollment.status ===
        'DRAFT',
    ).length;

  return (
    <>
      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',

          justifyContent:
            'flex-end',

          mb: 2,
        }}
      >
        <Button
          size="small"
          startIcon={
            <RefreshRoundedIcon />
          }
          onClick={() =>
            void loadData()
          }
        >
          تحديث البيانات
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            sm: 'repeat(2, minmax(0, 1fr))',

            xl: 'repeat(4, minmax(0, 1fr))',
          },

          gap: 2,
        }}
      >
        <StatCard
          title="الطلاب"
          value={String(
            students.length,
          )}
          description="إجمالي الطلاب في النظام"
          icon={
            <GroupsRoundedIcon />
          }
        />

        <StatCard
          title="المقررات"
          value={String(
            courses.length,
          )}
          description="إجمالي المقررات الأكاديمية"
          icon={
            <MenuBookRoundedIcon />
          }
        />

        <StatCard
          title="الشعب المفتوحة"
          value={String(
            openSections,
          )}
          description={`من أصل ${sections.length} شعبة`}
          icon={
            <ClassRoundedIcon />
          }
        />

        <StatCard
          title="طلبات التسجيل"
          value={String(
            pendingEnrollments,
          )}
          description={`إجمالي التسجيلات: ${enrollments.length}`}
          icon={
            <AssignmentTurnedInRoundedIcon />
          }
        />
      </Box>

      <Box
        sx={{
          mt: 3,

          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',

            lg: 'minmax(0, 1.55fr) minmax(310px, 0.9fr)',
          },

          gap: 2.5,

          alignItems: 'start',
        }}
      >
        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                gap: 2,

                mb: 3,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 16,

                    fontWeight: 700,

                    color:
                      universityColors.navyDark,
                  }}
                >
                  نظرة عامة على النظام
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    fontSize: 11.5,

                    color:
                      universityColors.textSecondary,
                  }}
                >
                  بيانات مباشرة من النظام
                  الأكاديمي.
                </Typography>
              </Box>

              <Chip
                label="بيانات فعلية"
                size="small"
                color="success"
              />
            </Box>

            <Box
              sx={{
                display: 'grid',

                gridTemplateColumns: {
                  xs: '1fr',

                  sm: 'repeat(2, minmax(0, 1fr))',
                },

                gap: 1.5,
              }}
            >
              <QuickAction
                title="إدارة المقررات"
                description="المقررات والمتطلبات الأكاديمية"
                path="/courses"
                icon={
                  <MenuBookRoundedIcon />
                }
              />

              <QuickAction
                title="إدارة الشعب"
                description="الشعب والسعة والجداول"
                path="/supervisor/sections"
                icon={
                  <ClassRoundedIcon />
                }
              />

              <QuickAction
                title="الهيكل الأكاديمي"
                description="الكليات والأقسام والبرامج"
                path="/academic-structure"
                icon={
                  <SchoolRoundedIcon />
                }
              />

              <QuickAction
                title="فترات التسجيل"
                description="إدارة فترات التسجيل الأكاديمي"
                path="/supervisor/registration-periods"
                icon={
                  <CalendarMonthRoundedIcon />
                }
              />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{ p: 2.5 }}
          >
            <Typography
              sx={{
                fontSize: 15,

                fontWeight: 700,

                color:
                  universityColors.navyDark,
              }}
            >
              إدارة النظام
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                mb: 2,

                fontSize: 11,

                color:
                  universityColors.textSecondary,
              }}
            >
              الوصول إلى الوظائف
              الإدارية الأساسية.
            </Typography>

            <Box
              sx={{
                display: 'flex',

                flexDirection:
                  'column',

                gap: 1.2,
              }}
            >
              <QuickAction
                title="الطلاب"
                description="إدارة واستعراض بيانات الطلاب"
                path="/students"
                icon={
                  <GroupsRoundedIcon />
                }
              />

              <QuickAction
                title="الخطة الدراسية"
                description="إدارة مقررات وأولويات الخطط"
                path="/supervisor/study-plan"
                icon={
                  <AccountTreeRoundedIcon />
                }
              />

              <QuickAction
                title="استيراد النتائج"
                description="تنزيل قالب Excel ورفع درجات الطلاب"
                path="/results/import"
                icon={
                  <AssessmentRoundedIcon />
                }
              />

              {role ===
                'SYSTEM_ADMIN' && (
                  <QuickAction
                    title="المستخدمون والصلاحيات"
                    description="إدارة حسابات مستخدمي النظام"
                    path="/users"
                    icon={
                      <PersonRoundedIcon />
                    }
                  />
                )}

              {role ===
                'SYSTEM_ADMIN' && (
                  <QuickAction
                    title="سلم الدرجات"
                    description="إدارة نطاقات الدرجات ونقاط المعدل"
                    path="/grade-scale"
                    icon={
                      <GradingRoundedIcon />
                    }
                  />
                )}

              {role ===
                'SYSTEM_ADMIN' && (
                  <QuickAction
                    title="إعدادات النظام"
                    description="إعدادات الجامعة وقواعد التسجيل"
                    path="/settings"
                    icon={
                      <SettingsRoundedIcon />
                    }
                  />
                )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const role =
    user?.role ?? '';

  return (
    <Box
      dir="rtl"
      sx={{
        width: '100%',
      }}
    >
      <Box
        sx={{
          mb: 3,

          display: 'flex',

          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },

          justifyContent:
            'space-between',

          flexDirection: {
            xs: 'column',
            md: 'row',
          },

          gap: 2,
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'flex',

              alignItems: 'center',

              gap: 1,

              mb: 0.7,
            }}
          >
            <DashboardRoundedIcon
              sx={{
                fontSize: 20,

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
              لوحة التحكم
            </Typography>
          </Box>

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
            مرحبًا بك في نظام جامعة
            المعالي
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              maxWidth: 650,

              fontSize: 12.5,

              color:
                universityColors.textSecondary,
            }}
          >
            {getWelcomeText(role)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',

            alignItems: 'center',

            gap: 1.2,

            px: 1.8,
            py: 1.2,

            bgcolor: '#FFFFFF',

            border:
              `1px solid ${universityColors.border}`,

            borderRadius: 2.5,
          }}
        >
          <Box
            sx={{
              width: 37,
              height: 37,

              display: 'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              borderRadius: 2,

              bgcolor:
                universityColors.softBlue,

              color:
                universityColors.navy,
            }}
          >
            <PersonRoundedIcon
              fontSize="small"
            />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 10.5,

                color:
                  universityColors.textSecondary,
              }}
            >
              نوع الحساب
            </Typography>

            <Typography
              sx={{
                fontSize: 12.5,

                fontWeight: 600,

                color:
                  universityColors.navyDark,
              }}
            >
              {getRoleLabel(role)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {role === 'STUDENT' && (
        <StudentDashboard />
      )}

      {role === 'ADVISOR' && (
        <AdvisorDashboard
          userId={user?.id}
        />
      )}

      {(role ===
        'REGISTRAR' ||
        role ===
        'SYSTEM_ADMIN') && (
          <AdministrationDashboard
            role={role}
          />
        )}
    </Box>
  );
}