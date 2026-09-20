import { useState, type FormEvent } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';

function getDefaultRoute(role: string) {
  switch (role.toUpperCase()) {
    case 'STUDENT':
      return '/student/registration';

    case 'ADVISOR':
    case 'SUPERVISOR':
      return '/supervisor/study-plan';

    default:
      return '/dashboard';
  }
}

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    login,
    isAuthenticated,
    user,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  if (isAuthenticated && user) {
    return (
      <Navigate
        to={getDefaultRoute(user.role)}
        replace
      />
    );
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login({
        email,
        password,
      });

      navigate(
        getDefaultRoute(loggedInUser.role),
        {
          replace: true,
        },
      );
    } catch {
      setError(
        'تعذر تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '46% 54%',
        },
        bgcolor: '#F4F7FA',
      }}
    >
      {/* القسم الأزرق */}
      <Box
        sx={{
          display: {
            xs: 'none',
            md: 'flex',
          },

          position: 'relative',
          overflow: 'hidden',

          flexDirection: 'column',
          justifyContent: 'space-between',

          p: {
            md: 5,
            lg: 7,
          },

          color: '#FFFFFF',

          background:
            'linear-gradient(145deg, #041F3C 0%, #062D56 55%, #0B4277 100%)',

          '&::before': {
            content: '""',
            position: 'absolute',
            width: 430,
            height: 430,
            borderRadius: '50%',
            border:
              '1px solid rgba(216,170,75,0.14)',
            top: -140,
            left: -140,
          },

          '&::after': {
            content: '""',
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: '50%',
            border:
              '1px solid rgba(255,255,255,0.06)',
            bottom: -230,
            right: -180,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="جامعة المعالي"
            sx={{
              width: 72,
              height: 72,
              objectFit: 'contain',
            }}
          />

          <Box>
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              جامعة المعالي
            </Typography>

            <Typography
              sx={{
                opacity: 0.7,
                fontSize: 13,
              }}
            >
              النظام الأكاديمي
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 570,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 4,
              bgcolor: '#D8AA4B',
              borderRadius: 10,
              mb: 3,
            }}
          />

          <Typography
            sx={{
              fontSize: {
                md: 38,
                lg: 46,
              },
              lineHeight: 1.45,
              fontWeight: 700,
              mb: 2,
            }}
          >
            بوابتك إلى
            <Box
              component="span"
              sx={{
                color: '#E5BD68',
                display: 'block',
              }}
            >
              مسيرتك الأكاديمية
            </Box>
          </Typography>

          <Typography
            sx={{
              fontSize: 16,
              lineHeight: 2,
              color:
                'rgba(255,255,255,0.72)',
              maxWidth: 500,
            }}
          >
            نظام أكاديمي متكامل لإدارة
            المقررات والتسجيل والخطط الدراسية
            ومتابعة المسيرة الجامعية.
          </Typography>
        </Box>

        <Typography
          sx={{
            position: 'relative',
            zIndex: 1,
            fontSize: 12,
            color:
              'rgba(255,255,255,0.48)',
          }}
        >
          جامعة المعالي — النظام الأكاديمي
        </Typography>
      </Box>

      {/* نموذج الدخول */}
      <Box
        sx={{
          position: 'relative',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          px: {
            xs: 2,
            sm: 4,
            lg: 8,
          },

          py: 5,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 440,
          }}
        >
          {/* شعار الموبايل */}
          <Box
            sx={{
              display: {
                xs: 'flex',
                md: 'none',
              },

              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="جامعة المعالي"
              sx={{
                width: 100,
                height: 100,
                objectFit: 'contain',
              }}
            />
          </Box>

          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{
              p: {
                xs: 3,
                sm: 4.5,
              },

              border: '1px solid',
              borderColor: 'divider',

              boxShadow:
                '0 16px 50px rgba(6,45,86,0.07)',
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: 2.5,

                display: 'grid',
                placeItems: 'center',

                bgcolor:
                  'rgba(216,170,75,0.16)',
                color: '#B98B31',

                mb: 3,
              }}
            >
              <LockOutlinedIcon />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontSize: {
                  xs: 26,
                  sm: 30,
                },
                mb: 1,
              }}
            >
              تسجيل الدخول
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mb: 4,
                fontSize: 14,
              }}
            >
              أدخل بيانات حسابك للوصول إلى
              النظام الأكاديمي.
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

            <Typography
              component="label"
              sx={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                mb: 0.8,
              }}
            >
              البريد الإلكتروني
            </Typography>

            <TextField
              fullWidth
              placeholder="example@university.edu"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
              sx={{ mb: 2.5 }}
            />

            <Typography
              component="label"
              sx={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                mb: 0.8,
              }}
            >
              كلمة المرور
            </Typography>

            <TextField
              fullWidth
              placeholder="أدخل كلمة المرور"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              required
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              endIcon={
                !loading ? (
                  <ArrowBackRoundedIcon />
                ) : undefined
              }
              sx={{
                minHeight: 50,
                fontSize: 15,
              }}
            >
              {loading ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'دخول إلى النظام'
              )}
            </Button>
          </Paper>

          <Typography
            align="center"
            color="text.secondary"
            sx={{
              fontSize: 12,
              mt: 3,
            }}
          >
            جميع الحقوق محفوظة © جامعة المعالي
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}