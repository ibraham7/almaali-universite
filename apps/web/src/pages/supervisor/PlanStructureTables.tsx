import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PLAN_CATEGORY_LABEL, type PlanStructure } from '../../api/studyPlan';

// جداول هيكل الخطة (مستوى ← فصل ← مقررات بنوع المتطلب والساعات والمتطلبات السابقة). للمراجعة والعرض فقط.
export default function PlanStructureTables({ structure }: { structure: PlanStructure }) {
  return (
    <>
      {structure.levels.map((level) => level.semesters.map((semester) => (
        <Box key={semester.id} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{level.nameAr} ← {semester.nameAr} <Typography component="span" color="text.secondary">({semester.credits} ساعة)</Typography></Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>الرمز</TableCell><TableCell>المقرر</TableCell><TableCell>نوع المتطلب</TableCell><TableCell>إجباري/اختياري</TableCell><TableCell>الساعات</TableCell><TableCell>المتطلبات السابقة</TableCell></TableRow></TableHead>
              <TableBody>
                {semester.courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>{course.code}</TableCell><TableCell>{course.nameAr}</TableCell>
                    <TableCell>{course.category ? PLAN_CATEGORY_LABEL[course.category] : '—'}</TableCell>
                    <TableCell>{course.requirement === 'MANDATORY' ? 'إجباري' : 'اختياري'}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>{course.prerequisites.length ? course.prerequisites.map((item) => item.nameAr).join('، ') : '—'}</TableCell>
                  </TableRow>
                ))}
                {semester.courses.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>بلا مقررات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )))}
    </>
  );
}
