import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

export default function StudentRegistrationPage() {
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',

          flexDirection: {
            xs: 'column',
            sm: 'row',
          },

          alignItems: {
            xs: 'stretch',
            sm: 'center',
          },

          justifyContent: 'space-between',
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
            تسجيل المقررات
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ fontSize: 14 }}
          >
            استعرض المقررات المتاحة ضمن خطتك
            الدراسية واختر الشعب المناسبة.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            <ShoppingBagOutlinedIcon />
          }
        >
          سلة التسجيل
        </Button>
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 3,
          border: '1px solid #D6E7F5',
        }}
      >
        سيتم عرض المقررات الفعلية هنا بعد ربط
        الصفحة ببيانات الطالب والخطة الدراسية.
      </Alert>

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
              placeholder="ابحث باسم المقرر أو رمزه..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon
                        sx={{
                          color: 'text.secondary',
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Chip
              label="المقررات المتاحة"
              sx={{
                bgcolor: 'rgba(216,170,75,0.15)',
                color: '#8C671D',
                minWidth: 140,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent
          sx={{
            p: {
              xs: '24px !important',
              md: '32px !important',
            },
          }}
        >
          <Box
            sx={{
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
                bgcolor: 'rgba(6,45,86,0.07)',
                color: '#062D56',
                mb: 2,
              }}
            >
              <MenuBookOutlinedIcon
                sx={{ fontSize: 30 }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{ mb: 0.7 }}
            >
              المقررات المتاحة
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                maxWidth: 430,
                fontSize: 13,
              }}
            >
              ستظهر هنا المقررات والشعب المتاحة
              للطالب حسب الخطة الدراسية والسنة
              الأكاديمية وشروط التسجيل.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}