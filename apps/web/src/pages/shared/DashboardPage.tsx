import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';

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

import { useAuth } from '../../auth/AuthContext';
import { universityColors } from '../../theme/theme';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

interface QuickActionProps {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

function getRoleLabel(role?: string) {
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

function getWelcomeText(role?: string) {
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
        transition: '0.2s ease',
        '&:hover': {
          borderColor: '#C7D4E0',
          transform: 'translateY(-2px)',
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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 12.5,
                color: universityColors.textSecondary,
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
                color: universityColors.navyDark,
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
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: universityColors.softBlue,
              color: universityColors.navy,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          sx={{
            mt: 1.5,
            fontSize: 11.5,
            color: universityColors.textSecondary,
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
  const navigate = useNavigate();

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(path)}
      sx={{
        width: '100%',
        border: `1px solid ${universityColors.border}`,
        bgcolor: '#FFFFFF',
        borderRadius: 2.5,
        p: 1.7,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textAlign: 'right',
        cursor: 'pointer',
        transition: '0.2s ease',
        fontFamily: 'inherit',

        '&:hover': {
          borderColor: '#B9C9D8',
          bgcolor: '#FAFCFE',
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: universityColors.softBlue,
          color: universityColors.navy,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            color: universityColors.text,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            mt: 0.2,
            fontSize: 10.5,
            color: universityColors.textSecondary,
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

function StudentDashboard() {
  const navigate = useNavigate();

  return (
    <>
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
          value="—"
          description="الفصل الدراسي الحالي"
          icon={<MenuBookRoundedIcon />}
        />

        <StatCard
          title="الساعات المسجلة"
          value="—"
          description="إجمالي الساعات المعتمدة"
          icon={<AccessTimeRoundedIcon />}
        />

        <StatCard
          title="حالة التسجيل"
          value="—"
          description="حالة طلب التسجيل الحالي"
          icon={<AssignmentTurnedInRoundedIcon />}
        />

        <StatCard
          title="المعدل التراكمي"
          value="—"
          description="سيظهر عند توفر بيانات المعدل"
          icon={<SchoolRoundedIcon />}
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
        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
              '&:last-child': {
                pb: {
                  xs: 2,
                  md: 3,
                },
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
                justifyContent: 'space-between',
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
                    color: universityColors.navyDark,
                  }}
                >
                  التسجيل الأكاديمي
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 11.5,
                    color: universityColors.textSecondary,
                  }}
                >
                  تابع عملية تسجيل مقررات الفصل الدراسي الحالي.
                </Typography>
              </Box>

              <Chip
                label="بانتظار البيانات"
                size="small"
                sx={{
                  bgcolor: '#F2F4F7',
                  color: universityColors.textSecondary,
                }}
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
                border: `1px solid ${universityColors.border}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CheckCircleRoundedIcon
                  sx={{
                    fontSize: 20,
                    color: universityColors.navy,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: universityColors.text,
                  }}
                >
                  حالة التسجيل
                </Typography>
              </Box>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: 12,
                  color: universityColors.textSecondary,
                }}
              >
                سيتم عرض حالة فترة التسجيل والطلب الأكاديمي هنا بعد
                ربط بيانات الطالب بالواجهة.
              </Typography>

              <LinearProgress
                variant="determinate"
                value={0}
                sx={{
                  mt: 2.5,
                  height: 7,
                  borderRadius: 20,
                  bgcolor: '#E8EDF2',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 20,
                    bgcolor: universityColors.gold,
                  },
                }}
              />

              <Button
                variant="contained"
                onClick={() => navigate('/student/registration')}
                sx={{
                  mt: 2.5,
                }}
              >
                الانتقال إلى تسجيل المقررات
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: 2.5,
              '&:last-child': {
                pb: 2.5,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: universityColors.navyDark,
              }}
            >
              الوصول السريع
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                mb: 2,
                fontSize: 11,
                color: universityColors.textSecondary,
              }}
            >
              أكثر الخدمات استخدامًا للطالب.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
              }}
            >
              <QuickAction
                title="تسجيل المقررات"
                description="استعراض وإضافة المقررات المتاحة"
                path="/student/registration"
                icon={<MenuBookRoundedIcon />}
              />

              <QuickAction
                title="الجدول الدراسي"
                description="استعراض جدول الشعب المسجلة"
                path="/student/schedule"
                icon={<CalendarMonthRoundedIcon />}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

function AdvisorDashboard() {
  return (
    <>
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
          value="—"
          description="طلبات تسجيل تحتاج إجراء"
          icon={<AssignmentTurnedInRoundedIcon />}
        />

        <StatCard
          title="الطلاب"
          value="—"
          description="الطلاب المرتبطون بالإرشاد"
          icon={<GroupsRoundedIcon />}
        />

        <StatCard
          title="الخطة الدراسية"
          value="—"
          description="المقررات المرتبة في الخطة"
          icon={<AccountTreeRoundedIcon />}
        />

        <StatCard
          title="الطلبات المعتمدة"
          value="—"
          description="خلال الفصل الحالي"
          icon={<CheckCircleRoundedIcon />}
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
        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: 3,
              '&:last-child': {
                pb: 3,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: universityColors.navyDark,
              }}
            >
              طلبات التسجيل
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: universityColors.textSecondary,
                fontSize: 11.5,
              }}
            >
              الطلبات التي تحتاج مراجعة المرشد الأكاديمي.
            </Typography>

            <Box
              sx={{
                mt: 3,
                minHeight: 180,
                borderRadius: 3,
                border: `1px dashed #C9D4DF`,
                bgcolor: '#FAFCFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                p: 3,
              }}
            >
              <AssignmentTurnedInRoundedIcon
                sx={{
                  fontSize: 34,
                  color: '#AAB8C5',
                }}
              />

              <Typography
                sx={{
                  mt: 1.2,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                لا توجد بيانات معروضة حاليًا
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  maxWidth: 380,
                  fontSize: 11,
                  color: universityColors.textSecondary,
                }}
              >
                سنربط هذه المنطقة بطلبات التسجيل الفعلية من الـAPI.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: 2.5,
              '&:last-child': {
                pb: 2.5,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: universityColors.navyDark,
              }}
            >
              الوصول السريع
            </Typography>

            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
              }}
            >
              <QuickAction
                title="طلبات التسجيل"
                description="مراجعة طلبات الطلاب"
                path="/advisor/registrations"
                icon={<AssignmentTurnedInRoundedIcon />}
              />

              <QuickAction
                title="الخطة الدراسية"
                description="ترتيب مقررات الخطة وأولوياتها"
                path="/supervisor/study-plan"
                icon={<AccountTreeRoundedIcon />}
              />

              <QuickAction
                title="الطلاب"
                description="استعراض الطلاب المرتبطين"
                path="/students"
                icon={<GroupsRoundedIcon />}
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
  return (
    <>
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
          value="—"
          description="إجمالي الطلاب في النظام"
          icon={<GroupsRoundedIcon />}
        />

        <StatCard
          title="المقررات"
          value="—"
          description="المقررات الأكاديمية"
          icon={<MenuBookRoundedIcon />}
        />

        <StatCard
          title="الشعب الدراسية"
          value="—"
          description="الشعب في الفصل الحالي"
          icon={<ClassRoundedIcon />}
        />

        <StatCard
          title="طلبات التسجيل"
          value="—"
          description="طلبات الفصل الحالي"
          icon={<AssignmentTurnedInRoundedIcon />}
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
        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
              '&:last-child': {
                pb: {
                  xs: 2,
                  md: 3,
                },
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: universityColors.navyDark,
                  }}
                >
                  نظرة عامة على النظام
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 11.5,
                    color: universityColors.textSecondary,
                  }}
                >
                  ملخص العمليات الأكاديمية للفصل الحالي.
                </Typography>
              </Box>

              <Chip
                label="الفصل الحالي"
                size="small"
                sx={{
                  bgcolor: universityColors.goldLight,
                  color: universityColors.navyDark,
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 3,
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
                icon={<MenuBookRoundedIcon />}
              />

              <QuickAction
                title="إدارة الشعب"
                description="الشعب والسعة والجداول"
                path="/sections"
                icon={<ClassRoundedIcon />}
              />

              <QuickAction
                title="الهيكل الأكاديمي"
                description="الكليات والأقسام والبرامج"
                path="/academic-structure"
                icon={<SchoolRoundedIcon />}
              />

              <QuickAction
                title="الفترات الأكاديمية"
                description="السنوات والفصول وفترات التسجيل"
                path="/academic-periods"
                icon={<CalendarMonthRoundedIcon />}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ boxShadow: 'none' }}>
          <CardContent
            sx={{
              p: 2.5,
              '&:last-child': {
                pb: 2.5,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: universityColors.navyDark,
              }}
            >
              إدارة النظام
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                mb: 2,
                fontSize: 11,
                color: universityColors.textSecondary,
              }}
            >
              الوصول إلى الوظائف الإدارية الأساسية.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
              }}
            >
              <QuickAction
                title="الطلاب"
                description="إدارة واستعراض بيانات الطلاب"
                path="/students"
                icon={<GroupsRoundedIcon />}
              />

              <QuickAction
                title="الخطة الدراسية"
                description="إدارة مقررات وأولويات الخطط"
                path="/supervisor/study-plan"
                icon={<AccountTreeRoundedIcon />}
              />

              {role === 'SYSTEM_ADMIN' && (
                <>
                  <QuickAction
                    title="المستخدمون والصلاحيات"
                    description="إدارة حسابات مستخدمي النظام"
                    path="/users"
                    icon={<PersonRoundedIcon />}
                  />

                  <QuickAction
                    title="إعدادات النظام"
                    description="إعدادات الجامعة والتسجيل"
                    path="/settings"
                    icon={<SettingsRoundedIcon />}
                  />
                </>
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

  const role = user?.role ?? '';

  return (
    <Box
      dir="rtl"
      sx={{
        width: '100%',
      }}
    >
      {/* Welcome */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          justifyContent: 'space-between',
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
                color: universityColors.goldDark,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: universityColors.goldDark,
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
              color: universityColors.navyDark,
            }}
          >
            مرحبًا بك في نظام جامعة المعالي
          </Typography>

          <Typography
            sx={{
              mt: 0.7,
              maxWidth: 650,
              fontSize: 12.5,
              color: universityColors.textSecondary,
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
            border: `1px solid ${universityColors.border}`,
            borderRadius: 2.5,
          }}
        >
          <Box
            sx={{
              width: 37,
              height: 37,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              bgcolor: universityColors.softBlue,
              color: universityColors.navy,
            }}
          >
            <PersonRoundedIcon fontSize="small" />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 10.5,
                color: universityColors.textSecondary,
              }}
            >
              نوع الحساب
            </Typography>

            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: universityColors.navyDark,
              }}
            >
              {getRoleLabel(role)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {role === 'STUDENT' && <StudentDashboard />}

      {role === 'ADVISOR' && <AdvisorDashboard />}

      {(role === 'REGISTRAR' || role === 'SYSTEM_ADMIN') && (
        <AdministrationDashboard role={role} />
      )}
    </Box>
  );
}