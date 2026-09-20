import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';

export default function StudyPlanPage() {
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',

          flexDirection: {
            xs: 'column',
            sm: 'row',
          },

          justifyContent: 'space-between',

          alignItems: {
            xs: 'stretch',
            sm: 'center',
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
            إضافة المقررات وتحديد نوعها وترتيب
            الأولوية ضمن الخطة الدراسية.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
        >
          إضافة مقرر
        </Button>
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 3,
          border: '1px solid #D6E7F5',
        }}
      >
        ترتيب المقررات في هذه الصفحة سيمثل
        الأولوية داخل الخطة الدراسية وليس ترتيبًا
        عامًا للمقرر.
      </Alert>

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

              justifyContent: 'space-between',

              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },

              gap: 2,

              pb: 2.5,
              mb: 3,

              borderBottom: '1px solid',
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
                اسحب المقررات لإعادة ترتيب
                الأولوية.
              </Typography>
            </Box>

            <Chip
              icon={
                <DragIndicatorRoundedIcon />
              }
              label="ترتيب بالسحب"
              variant="outlined"
            />
          </Box>

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
              <ViewListOutlinedIcon
                sx={{ fontSize: 30 }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{ mb: 0.7 }}
            >
              لا توجد مقررات معروضة
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                maxWidth: 430,
                fontSize: 13,
              }}
            >
              بعد اختيار الخطة والسنة الأكاديمية
              ستظهر المقررات هنا حسب ترتيب
              الأولوية.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}