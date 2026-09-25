import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';

import {
  universityColors,
} from '../../theme/theme';

import {
  downloadResultsTemplate,
  getCourseResultsBySemester,
  getResultSemesters,
  importCourseResults,
  type CourseResult,
  type ResultSemester,
} from '../../api/courseResults';

function getErrorMessage(
  error: unknown,
) {
  if (
    axios.isAxiosError(
      error,
    )
  ) {
    const data =
      error.response?.data as
      | {
        message?:
        | string
        | string[];
        errors?: string[];
      }
      | undefined;

    if (
      data?.errors?.length
    ) {
      return data.errors.join(
        '، ',
      );
    }

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message.join(
        '، ',
      );
    }

    if (
      typeof data?.message ===
      'string'
    ) {
      return data.message;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع.';
}

function getDownloadFilename(
  contentDisposition?: string,
) {
  if (!contentDisposition) {
    return 'results-template.xlsx';
  }

  const utf8Match =
    contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(
        utf8Match[1],
      );
    } catch {
      return utf8Match[1];
    }
  }

  const normalMatch =
    contentDisposition.match(
      /filename="?([^";]+)"?/i,
    );

  return (
    normalMatch?.[1] ??
    'results-template.xlsx'
  );
}

function saveExcelBlob(
  blobData: Blob,
  filename: string,
) {
  const excelBlob =
    blobData.type
      ? blobData
      : new Blob(
        [blobData],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      );

  const objectUrl =
    URL.createObjectURL(
      excelBlob,
    );

  const link =
    document.createElement(
      'a',
    );

  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(
    link,
  );

  link.click();

  document.body.removeChild(
    link,
  );

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    1000,
  );
}

export default function ResultsImportPage() {
  const [
    semesters,
    setSemesters,
  ] =
    useState<ResultSemester[]>(
      [],
    );

  const [
    semesterId,
    setSemesterId,
  ] =
    useState('');

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    results,
    setResults,
  ] =
    useState<CourseResult[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      'template' | 'import' | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  async function loadResults(
    selectedSemesterId: string,
  ) {
    if (!selectedSemesterId) {
      setResults([]);
      return;
    }

    const data =
      await getCourseResultsBySemester(
        selectedSemesterId,
      );

    setResults(data);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const data =
          await getResultSemesters();

        setSemesters(data);

        const firstId =
          data[0]?.id ?? '';

        setSemesterId(
          firstId,
        );

        if (firstId) {
          await loadResults(
            firstId,
          );
        }
      } catch (
      requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleTemplate() {
    if (!semesterId) {
      setError(
        'اختر الفصل أولًا.',
      );
      return;
    }

    try {
      setActionLoading(
        'template',
      );

      setError('');
      setSuccess('');

      const response =
        await downloadResultsTemplate(
          semesterId,
        );

      const filename =
        getDownloadFilename(
          response.headers[
          'content-disposition'
          ],
        );

      saveExcelBlob(
        response.data,
        filename,
      );

      setSuccess(
        'تم تنزيل قالب Excel.',
      );
    } catch (
    requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleImport() {
    if (!semesterId) {
      setError(
        'اختر الفصل أولًا.',
      );
      return;
    }

    if (!file) {
      setError(
        'اختر ملف Excel أولًا.',
      );
      return;
    }

    try {
      setActionLoading(
        'import',
      );

      setError('');
      setSuccess('');

      const response =
        await importCourseResults(
          semesterId,
          file,
        );

      if (
        !response.success
      ) {
        setError(
          response.errors.join(
            '\n',
          ),
        );
        return;
      }

      setSuccess(
        `تم استيراد ${response.imported} نتيجة بنجاح.`,
      );

      setFile(null);

      await loadResults(
        semesterId,
      );
    } catch (
    requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        width: '100%',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 0.7,
        }}
      >
        <AssessmentRoundedIcon
          sx={{
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
          النتائج الأكاديمية
        </Typography>
      </Stack>

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
        استيراد النتائج
      </Typography>

      <Typography
        sx={{
          mt: 0.7,
          mb: 3,
          fontSize: 12.5,
          color:
            universityColors.textSecondary,
        }}
      >
        حمّل القالب الجاهز للفصل،
        أدخل الدرجات في عمود score،
        ثم ارفع نفس الملف.
      </Typography>

      {error && (
        <Alert
          severity="error"
          onClose={() =>
            setError('')
          }
          sx={{
            mb: 2,
            whiteSpace:
              'pre-line',
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() =>
            setSuccess('')
          }
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      <Card
        sx={{
          boxShadow: 'none',
          mb: 2.5,
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label="الفصل"
              value={semesterId}
              onChange={async (
                event,
              ) => {
                const value =
                  event.target.value;

                setSemesterId(
                  value,
                );

                setFile(null);

                setError('');
                setSuccess('');

                await loadResults(
                  value,
                );
              }}
            >
              {semesters.map(
                (semester) => (
                  <MenuItem
                    key={
                      semester.id
                    }
                    value={
                      semester.id
                    }
                  >
                    {semester.nameAr}
                    {' — '}
                    المستوى المرتبط:
                    {' '}
                    {
                      semester.academicYearId
                    }
                  </MenuItem>
                ),
              )}
            </TextField>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1.5}
            >
              <Button
                type="button"
                variant="outlined"
                startIcon={
                  actionLoading ===
                    'template' ? (
                    <CircularProgress
                      size={17}
                    />
                  ) : (
                    <DownloadRoundedIcon />
                  )
                }
                disabled={
                  !semesterId ||
                  actionLoading !==
                  null
                }
                onClick={() =>
                  void handleTemplate()
                }
              >
                تنزيل قالب Excel
              </Button>

              <Button
                component="label"
                variant="outlined"
                startIcon={
                  <UploadFileRoundedIcon />
                }
              >
                اختيار ملف Excel

                <input
                  hidden
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(
                    event,
                  ) =>
                    setFile(
                      event.target
                        .files?.[0] ??
                      null,
                    )
                  }
                />
              </Button>

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems:
                    'center',
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 12,
                  }}
                >
                  {file
                    ? file.name
                    : 'لم يتم اختيار ملف'}
                </Typography>
              </Box>

              <Button
                type="button"
                variant="contained"
                startIcon={
                  actionLoading ===
                    'import' ? (
                    <CircularProgress
                      size={17}
                      color="inherit"
                    />
                  ) : (
                    <UploadFileRoundedIcon />
                  )
                }
                disabled={
                  !semesterId ||
                  !file ||
                  actionLoading !==
                  null
                }
                onClick={() =>
                  void handleImport()
                }
              >
                استيراد النتائج
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Alert
        severity="info"
        sx={{
          mb: 2.5,
        }}
      >
        الاستيراد ذريّ: إذا وُجد خطأ
        في أي صف فلن تُحفظ أي نتيجة من
        الملف حتى يتم تصحيح جميع الأخطاء.
      </Alert>

      <Typography
        sx={{
          mb: 1.5,
          fontSize: 16,
          fontWeight: 700,
          color:
            universityColors.navyDark,
        }}
      >
        النتائج المحفوظة
      </Typography>

      <Stack spacing={1.25}>
        {results.length === 0 && (
          <Alert severity="info">
            لا توجد نتائج محفوظة لهذا
            الفصل حتى الآن.
          </Alert>
        )}

        {results.map(
          (result) => {
            const studentName =
              [
                result.student
                  .firstName,

                result.student
                  .middleName,

                result.student
                  .familyName,
              ]
                .filter(Boolean)
                .join(' ');

            return (
              <Card
                key={result.id}
                sx={{
                  boxShadow:
                    'none',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display:
                        'grid',

                      gridTemplateColumns:
                      {
                        xs: '1fr',

                        md: 'minmax(180px, 1.5fr) minmax(150px, 1fr) repeat(3, minmax(90px, 0.6fr))',
                      },

                      gap: 1.5,

                      alignItems:
                        'center',
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontWeight:
                            700,
                        }}
                      >
                        {studentName}
                      </Typography>

                      <Typography
                        color="text.secondary"
                        sx={{
                          fontSize:
                            11.5,
                        }}
                      >
                        {
                          result
                            .student
                            .universityId
                        }
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontWeight:
                            600,
                        }}
                      >
                        {
                          result
                            .course
                            .code
                        }
                        {' — '}
                        {
                          result
                            .course
                            .nameAr
                        }
                      </Typography>
                    </Box>

                    <Typography>
                      الدرجة:{' '}
                      {result.score}
                    </Typography>

                    <Typography>
                      التقدير:{' '}
                      {
                        result.gradeLabel
                      }
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight:
                          700,
                      }}
                    >
                      {result.passed
                        ? 'ناجح'
                        : 'راسب'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            );
          },
        )}
      </Stack>
    </Box>
  );
}
