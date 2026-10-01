import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getMyAcademicStatus, type StudentAcademicStatus } from '../../api/students';

const levelLabels: Record<number, string> = {
  1: 'السنة الأولى',
  2: 'السنة الثانية',
  3: 'السنة الثالثة',
  4: 'السنة الرابعة',
};

const statusLabels: Record<StudentAcademicStatus['courses'][number]['status'], string> = {
  PASSED: 'ناجح',
  FAILED: 'راسب',
  REGISTERED: 'مسجل',
  FUTURE: 'سنة قادمة',
  NOT_TAKEN: 'لم يُسجل',
};

const statusColors: Record<StudentAcademicStatus['courses'][number]['status'], 'success' | 'error' | 'primary' | 'default' | 'warning'> = {
  PASSED: 'success',
  FAILED: 'error',
  REGISTERED: 'primary',
  FUTURE: 'default',
  NOT_TAKEN: 'warning',
};

export default function StudentAcademicStatusPage() {
  const [data, setData] = useState<StudentAcademicStatus | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyAcademicStatus()
      .then(setData)
      .catch(() => setError('تعذر تحميل الحالة الأكاديمية. حاول مرة أخرى أو راجع الإدارة.'))
      .finally(() => setLoading(false));
  }, []);

  const courses = useMemo(() => {
    const all = data?.courses ?? [];
    return selectedLevel === 'all' ? all : all.filter((course) => course.levelNumber === selectedLevel);
  }, [data, selectedLevel]);

  if (loading) return <Box sx={{ display: 'grid', minHeight: 320, placeItems: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>الحالة الأكاديمية</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        الرقم الجامعي: {data.student.universityId} · المستوى الحالي: {data.student.currentLevel} · {data.studyPlan}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>عرض مقررات السنوات</Typography>
          <ToggleButtonGroup
            value={selectedLevel}
            exclusive
            onChange={(_, value: number | 'all' | null) => value !== null && setSelectedLevel(value)}
            size="small"
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { border: '1px solid', borderRadius: '8px !important', px: 2 } }}
          >
            <ToggleButton value="all">كل السنوات</ToggleButton>
            {[1, 2, 3, 4].map((level) => <ToggleButton key={level} value={level}>{levelLabels[level]}</ToggleButton>)}
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {courses.length === 0 ? <Alert severity="info">لا توجد مقررات مدرجة لهذه السنة.</Alert> : (
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>السنة</TableCell><TableCell>الفصل</TableCell><TableCell>رمز المادة</TableCell><TableCell>اسم المادة</TableCell><TableCell>الساعات</TableCell><TableCell>الحالة</TableCell><TableCell>النتيجة</TableCell>
                </TableRow></TableHead>
                <TableBody>{courses.map((course) => (
                  <TableRow key={course.id} hover>
                    <TableCell>{course.academicYear || levelLabels[course.levelNumber] || course.levelNumber}</TableCell>
                    <TableCell>{course.semester}</TableCell>
                    <TableCell>{course.code}</TableCell>
                    <TableCell><Stack><Typography variant="body2">{course.nameAr}</Typography>{course.nameEn && <Typography variant="caption" color="text.secondary">{course.nameEn}</Typography>}</Stack></TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell><Chip size="small" color={statusColors[course.status]} label={statusLabels[course.status]} /></TableCell>
                    <TableCell>{course.gradeLabel ?? (course.score == null ? '—' : `${course.score}`)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
