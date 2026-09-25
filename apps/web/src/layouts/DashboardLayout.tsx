import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DateRangeRoundedIcon from '@mui/icons-material/DateRangeRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

import {
  useAuth,
} from '../auth/AuthContext';

import {
  universityColors,
} from '../theme/theme';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: string[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'الرئيسية',
    path: '/dashboard',
    icon: <DashboardRoundedIcon />,
    roles: [
      'STUDENT',
      'ADVISOR',
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'تسجيل المقررات',
    path: '/student/registration',
    icon: <MenuBookRoundedIcon />,
    roles: ['STUDENT'],
  },

  {
    label: 'جدولي الدراسي',
    path: '/student/schedule',
    icon: <CalendarMonthRoundedIcon />,
    roles: ['STUDENT'],
  },

  {
    label: 'طلبات التسجيل',
    path: '/advisor/registrations',
    icon: (
      <AssignmentTurnedInRoundedIcon />
    ),
    roles: ['ADVISOR'],
  },

  {
    label: 'الخطة الدراسية',
    path: '/supervisor/study-plan',
    icon: <AccountTreeRoundedIcon />,
    roles: [
      'ADVISOR',
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'الطلاب',
    path: '/students',
    icon: <GroupsRoundedIcon />,
    roles: [
      'ADVISOR',
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'المقررات',
    path: '/courses',
    icon: <MenuBookRoundedIcon />,
    roles: [
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'الشعب الدراسية',
    path: '/supervisor/sections',
    icon: <ClassRoundedIcon />,
    roles: [
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'الهيكل الأكاديمي',
    path: '/academic-structure',
    icon: <SchoolRoundedIcon />,
    roles: [
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label: 'الفصول والفترات',
    path:
      '/supervisor/registration-periods',
    icon: <DateRangeRoundedIcon />,
    roles: [
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ],
  },

  {
    label:
      'المستخدمون والصلاحيات',
    path: '/users',
    icon: <PersonRoundedIcon />,
    roles: ['SYSTEM_ADMIN'],
  },

  {
    label: 'إعدادات النظام',
    path: '/settings',
    icon: <SettingsRoundedIcon />,
    roles: ['SYSTEM_ADMIN'],
  },
];

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

function getPageTitle(
  pathname: string,
) {
  const item =
    navigationItems.find(
      (navItem) => {
        if (
          navItem.path ===
          '/dashboard'
        ) {
          return (
            pathname ===
            '/dashboard'
          );
        }

        return pathname.startsWith(
          navItem.path,
        );
      },
    );

  return (
    item?.label ??
    'نظام إدارة الجامعة'
  );
}

export default function DashboardLayout() {
  const theme = useTheme();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    user,
    logout,
  } = useAuth();

  const isMobile =
    useMediaQuery(
      theme.breakpoints.down('md'),
    );

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const userRole =
    user?.role ?? '';

  const visibleItems =
    useMemo(
      () =>
        navigationItems.filter(
          (item) =>
            item.roles.includes(
              userRole,
            ),
        ),
      [userRole],
    );

  const pageTitle =
    getPageTitle(
      location.pathname,
    );

  function handleNavigate(
    path: string,
  ) {
    navigate(path);

    if (isMobile) {
      setMobileOpen(false);
    }
  }

  function handleLogout() {
    logout();

    navigate(
      '/login',
      {
        replace: true,
      },
    );
  }

  const drawerContent = (
    <Box
      sx={{
        height: '100%',

        display: 'flex',

        flexDirection: 'column',

        bgcolor:
          universityColors.navyDark,

        color: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          minHeight: 92,

          display: 'flex',

          alignItems: 'center',

          px: 2.5,

          borderBottom:
            '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="جامعة المعالي"
          sx={{
            width: 58,
            height: 58,

            objectFit: 'contain',

            flexShrink: 0,
          }}
        />

        <Box
          sx={{
            mr: 1.5,

            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: 17,

              fontWeight: 700,

              lineHeight: 1.4,

              color: '#FFFFFF',
            }}
          >
            جامعة المعالي
          </Typography>

          <Typography
            sx={{
              mt: 0.3,

              fontSize: 11.5,

              color:
                'rgba(255,255,255,0.58)',
            }}
          >
            نظام الإدارة الجامعية
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,

          overflowY: 'auto',

          px: 1.5,

          py: 2.5,
        }}
      >
        <Typography
          sx={{
            px: 1.5,

            mb: 1,

            fontSize: 11,

            fontWeight: 600,

            color:
              'rgba(255,255,255,0.38)',
          }}
        >
          القائمة الرئيسية
        </Typography>

        <List disablePadding>
          {visibleItems.map(
            (item) => {
              const selected =
                item.path ===
                  '/dashboard'
                  ? location
                    .pathname ===
                  '/dashboard'
                  : location.pathname.startsWith(
                    item.path,
                  );

              return (
                <ListItemButton
                  key={item.path}
                  selected={
                    selected
                  }
                  onClick={() =>
                    handleNavigate(
                      item.path,
                    )
                  }
                  sx={{
                    minHeight: 48,

                    mb: 0.6,

                    px: 1.5,

                    borderRadius: 2.5,

                    color: selected
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.68)',

                    position:
                      'relative',

                    '& .MuiListItemIcon-root':
                    {
                      color:
                        selected
                          ? universityColors.gold
                          : 'rgba(255,255,255,0.55)',
                    },

                    '&.Mui-selected':
                    {
                      bgcolor:
                        'rgba(255,255,255,0.09)',
                    },

                    '&.Mui-selected:hover':
                    {
                      bgcolor:
                        'rgba(255,255,255,0.12)',
                    },

                    '&:hover': {
                      bgcolor:
                        'rgba(255,255,255,0.06)',

                      color:
                        '#FFFFFF',
                    },

                    '&::before':
                      selected
                        ? {
                          content:
                            '""',

                          position:
                            'absolute',

                          right: 0,

                          top: 11,

                          bottom: 11,

                          width: 3,

                          borderRadius: 10,

                          bgcolor:
                            universityColors.gold,
                        }
                        : {},
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      item.label
                    }
                    sx={{
                      '& .MuiListItemText-primary':
                      {
                        fontSize:
                          13.5,

                        fontWeight:
                          selected
                            ? 600
                            : 400,
                      },
                    }}
                  />

                  {selected && (
                    <ChevronRightRoundedIcon
                      sx={{
                        fontSize:
                          17,

                        color:
                          'rgba(255,255,255,0.4)',

                        transform:
                          'rotate(180deg)',
                      }}
                    />
                  )}
                </ListItemButton>
              );
            },
          )}
        </List>
      </Box>

      <Box
        sx={{
          p: 1.5,

          borderTop:
            '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box
          sx={{
            display: 'flex',

            alignItems: 'center',

            gap: 1.2,

            p: 1.2,

            borderRadius: 2.5,

            bgcolor:
              'rgba(255,255,255,0.045)',
          }}
        >
          <Avatar
            sx={{
              width: 38,

              height: 38,

              bgcolor:
                universityColors.gold,

              color:
                universityColors.navyDark,

              fontSize: 15,

              fontWeight: 700,
            }}
          >
            {user?.email
              ?.charAt(0)
              .toUpperCase() ??
              'U'}
          </Avatar>

          <Box
            sx={{
              flex: 1,

              minWidth: 0,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontSize: 12.5,

                fontWeight: 600,

                color: '#FFFFFF',
              }}
            >
              {user?.email ??
                'المستخدم'}
            </Typography>

            <Typography
              sx={{
                mt: 0.2,

                fontSize: 10.5,

                color:
                  'rgba(255,255,255,0.48)',
              }}
            >
              {getRoleLabel(
                user?.role,
              )}
            </Typography>
          </Box>

          <Tooltip title="تسجيل الخروج">
            <IconButton
              onClick={
                handleLogout
              }
              size="small"
              sx={{
                color:
                  'rgba(255,255,255,0.55)',

                '&:hover': {
                  color:
                    '#FFFFFF',

                  bgcolor:
                    'rgba(255,255,255,0.08)',
                },
              }}
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: '100vh',

        bgcolor:
          universityColors.background,
      }}
    >
      {!isMobile && (
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            width:
              DRAWER_WIDTH,

            flexShrink: 0,

            '& .MuiDrawer-paper':
            {
              width:
                DRAWER_WIDTH,

              boxSizing:
                'border-box',

              border: 0,

              right: 0,

              left: 'auto',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={() =>
            setMobileOpen(false)
          }
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper':
            {
              width:
                DRAWER_WIDTH,

              border: 0,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        sx={{
          minHeight: '100vh',

          mr: {
            xs: 0,

            md: `${DRAWER_WIDTH}px`,
          },
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor:
              'rgba(255,255,255,0.96)',

            color:
              universityColors.text,

            borderBottom:
              `1px solid ${universityColors.border}`,

            backdropFilter:
              'blur(12px)',
          }}
        >
          <Toolbar
            sx={{
              minHeight:
                '70px !important',

              px: {
                xs: 2,
                sm: 3,
                lg: 4,
              },
            }}
          >
            {isMobile && (
              <IconButton
                onClick={() =>
                  setMobileOpen(
                    true,
                  )
                }
                sx={{
                  ml: 1,

                  color:
                    universityColors.navy,
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
            )}

            <Box
              sx={{
                flex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: 17,

                    md: 19,
                  },

                  fontWeight: 700,

                  color:
                    universityColors.navyDark,
                }}
              >
                {pageTitle}
              </Typography>

              <Typography
                sx={{
                  display: {
                    xs: 'none',

                    sm: 'block',
                  },

                  mt: 0.2,

                  fontSize: 11.5,

                  color:
                    universityColors.textSecondary,
                }}
              >
                جامعة المعالي · نظام
                الإدارة الجامعية
              </Typography>
            </Box>

            <Tooltip title="الإشعارات">
              <IconButton
                sx={{
                  width: 40,

                  height: 40,

                  border:
                    `1px solid ${universityColors.border}`,

                  color:
                    universityColors.navy,

                  bgcolor:
                    '#FFFFFF',
                }}
              >
                <NotificationsNoneRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: 2,

                my: 2,

                display: {
                  xs: 'none',

                  sm: 'block',
                },
              }}
            />

            <Box
              sx={{
                display: {
                  xs: 'none',

                  sm: 'flex',
                },

                alignItems:
                  'center',

                gap: 1.1,
              }}
            >
              <Avatar
                sx={{
                  width: 37,

                  height: 37,

                  bgcolor:
                    universityColors.navy,

                  fontSize: 14,

                  fontWeight: 700,
                }}
              >
                {user?.email
                  ?.charAt(0)
                  .toUpperCase() ??
                  'U'}
              </Avatar>

              <Box>
                <Typography
                  noWrap
                  sx={{
                    maxWidth: 180,

                    fontSize:
                      12.5,

                    fontWeight:
                      600,

                    color:
                      universityColors.text,
                  }}
                >
                  {user?.email ??
                    'المستخدم'}
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      10.5,

                    color:
                      universityColors.textSecondary,
                  }}
                >
                  {getRoleLabel(
                    user?.role,
                  )}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            width: '100%',

            p: {
              xs: 2,

              sm: 3,

              lg: 4,
            },
          }}
        >
          <Box
            sx={{
              width: '100%',

              maxWidth: 1500,

              mx: 'auto',
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}