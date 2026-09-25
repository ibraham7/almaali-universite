import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputAdornment,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import axios from 'axios';

import {
    getStudent,
    getStudents,
    type StudentDetails,
    type StudentListItem,
} from '../../api/students';

function getErrorMessage(
    error: unknown,
) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | {
                message?:
                | string
                | string[];
            }
            | undefined;

        if (
            Array.isArray(data?.message)
        ) {
            return data.message.join('، ');
        }

        if (
            typeof data?.message ===
            'string'
        ) {
            return data.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'حدث خطأ غير متوقع.';
}

function fullName(
    student: Pick<
        StudentListItem,
        | 'firstName'
        | 'middleName'
        | 'familyName'
    >,
) {
    return [
        student.firstName,
        student.middleName,
        student.familyName,
    ]
        .filter(Boolean)
        .join(' ');
}

function statusLabel(
    status?: string,
) {
    switch (status) {
        case 'ACTIVE':
            return 'نشط';

        case 'SUSPENDED':
            return 'موقوف';

        case 'LOCKED':
            return 'مقفل';

        case 'DISABLED':
            return 'معطل';

        case 'DRAFT':
            return 'مسودة';

        case 'PENDING':
            return 'بانتظار الموافقة';

        case 'APPROVED':
            return 'معتمد';

        case 'CONFIRMED':
            return 'مؤكد';

        case 'REJECTED':
            return 'مرفوض';

        case 'DROPPED':
            return 'منسحب';

        case 'CANCELLED':
            return 'ملغى';

        default:
            return status ?? 'غير محدد';
    }
}

export default function StudentsPage() {
    const [students, setStudents] =
        useState<StudentListItem[]>([]);

    const [
        selectedStudent,
        setSelectedStudent,
    ] =
        useState<StudentDetails | null>(
            null,
        );

    const [search, setSearch] =
        useState('');

    const [status, setStatus] =
        useState('');

    const [loading, setLoading] =
        useState(true);

    const [
        detailsLoading,
        setDetailsLoading,
    ] = useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [dialogOpen, setDialogOpen] =
        useState(false);

    const loadStudents =
        useCallback(async () => {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await getStudents();

                setStudents(data);
            } catch (requestError) {
                setError(
                    getErrorMessage(
                        requestError,
                    ),
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadStudents();
    }, [loadStudents]);

    const filteredStudents =
        useMemo(() => {
            const normalized =
                search
                    .trim()
                    .toLowerCase();

            return students.filter(
                (student) => {
                    if (
                        status &&
                        student.status !== status
                    ) {
                        return false;
                    }

                    if (!normalized) {
                        return true;
                    }

                    const values = [
                        student.universityId,
                        student.firstName,
                        student.middleName,
                        student.familyName,
                        student.englishName,
                        student.universityEmail,
                        student.user?.email,
                    ];

                    return values.some(
                        (value) =>
                            value
                                ?.toLowerCase()
                                .includes(
                                    normalized,
                                ),
                    );
                },
            );
        }, [
            students,
            search,
            status,
        ]);

    async function openStudent(
        student: StudentListItem,
    ) {
        try {
            setDialogOpen(true);
            setDetailsLoading(true);
            setSelectedStudent(null);
            setError(null);

            const data =
                await getStudent(student.id);

            setSelectedStudent(data);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                ),
            );
        } finally {
            setDetailsLoading(false);
        }
    }

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: 420,
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                <Stack
                    spacing={2}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <CircularProgress />

                    <Typography
                        color="text.secondary"
                    >
                        جاري تحميل الطلاب...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
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
                    الطلاب
                </Typography>

                <Typography
                    color="text.secondary"
                    sx={{ fontSize: 14 }}
                >
                    استعراض الطلاب
                    وبياناتهم الأكاديمية
                    وحالة التسجيل.
                </Typography>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    onClose={() =>
                        setError(null)
                    }
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 2.5 }}>
                <CardContent
                    sx={{
                        p: '20px !important',
                    }}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'minmax(0, 1fr) 220px',
                            },
                            gap: 2,
                        }}
                    >
                        <TextField
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="ابحث بالاسم أو الرقم الجامعي أو البريد..."
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRoundedIcon
                                                sx={{
                                                    color:
                                                        'text.secondary',
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <FormControl fullWidth>
                            <Select
                                value={status}
                                displayEmpty
                                onChange={(event) =>
                                    setStatus(
                                        event.target
                                            .value,
                                    )
                                }
                            >
                                <MenuItem value="">
                                    جميع الحالات
                                </MenuItem>

                                <MenuItem value="ACTIVE">
                                    نشط
                                </MenuItem>

                                <MenuItem value="SUSPENDED">
                                    موقوف
                                </MenuItem>

                                <MenuItem value="LOCKED">
                                    مقفل
                                </MenuItem>

                                <MenuItem value="DISABLED">
                                    معطل
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            <Box
                sx={{
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}
            >
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 700 }}
                >
                    قائمة الطلاب
                </Typography>

                <Chip
                    label={`${filteredStudents.length} طالب`}
                />
            </Box>

            {filteredStudents.length ===
                0 ? (
                <Card>
                    <CardContent>
                        <Box
                            sx={{
                                minHeight: 220,
                                display: 'grid',
                                placeItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <Box>
                                <PersonOutlineRoundedIcon
                                    sx={{
                                        fontSize: 44,
                                        color:
                                            'text.secondary',
                                        mb: 1,
                                    }}
                                />

                                <Typography
                                    variant="h6"
                                    sx={{ mb: 0.5 }}
                                >
                                    لا يوجد طلاب
                                </Typography>

                                <Typography
                                    color="text.secondary"
                                    sx={{
                                        fontSize: 13,
                                    }}
                                >
                                    لا توجد نتائج مطابقة
                                    للبحث الحالي.
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            lg: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 2,
                    }}
                >
                    {filteredStudents.map(
                        (student) => {
                            const latestEnrollment =
                                student
                                    .enrollments[0];

                            return (
                                <Card
                                    key={student.id}
                                    onClick={() =>
                                        void openStudent(
                                            student,
                                        )
                                    }
                                    sx={{
                                        cursor: 'pointer',

                                        transition:
                                            'transform 150ms ease, box-shadow 150ms ease',

                                        '&:hover': {
                                            transform:
                                                'translateY(-2px)',

                                            boxShadow: 4,
                                        },
                                    }}
                                >
                                    <CardContent
                                        sx={{
                                            p: '22px !important',
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={2}
                                            sx={{
                                                alignItems:
                                                    'flex-start',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,

                                                    borderRadius: 2,

                                                    display:
                                                        'grid',

                                                    placeItems:
                                                        'center',

                                                    bgcolor:
                                                        'rgba(6,45,86,0.08)',

                                                    color:
                                                        '#062D56',

                                                    flexShrink: 0,
                                                }}
                                            >
                                                <PersonOutlineRoundedIcon />
                                            </Box>

                                            <Box
                                                sx={{
                                                    minWidth: 0,
                                                    flex: 1,
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    useFlexGap
                                                    sx={{
                                                        justifyContent:
                                                            'space-between',

                                                        flexWrap:
                                                            'wrap',

                                                        mb: 0.8,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight:
                                                                700,
                                                        }}
                                                    >
                                                        {fullName(
                                                            student,
                                                        )}
                                                    </Typography>

                                                    <Chip
                                                        size="small"
                                                        label={statusLabel(
                                                            student.status,
                                                        )}
                                                    />
                                                </Stack>

                                                <Typography
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: 13,
                                                        mb: 1.5,
                                                    }}
                                                >
                                                    {
                                                        student.universityId
                                                    }
                                                </Typography>

                                                <Stack
                                                    spacing={0.7}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.7}
                                                        sx={{
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <EmailOutlinedIcon
                                                            sx={{
                                                                fontSize:
                                                                    17,

                                                                color:
                                                                    'text.secondary',
                                                            }}
                                                        />

                                                        <Typography
                                                            color="text.secondary"
                                                            sx={{
                                                                fontSize:
                                                                    12,
                                                            }}
                                                        >
                                                            {student
                                                                .universityEmail ??
                                                                student
                                                                    .user
                                                                    ?.email ??
                                                                'لا يوجد بريد'}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack
                                                        direction="row"
                                                        spacing={0.7}
                                                        sx={{
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <SchoolOutlinedIcon
                                                            sx={{
                                                                fontSize:
                                                                    17,

                                                                color:
                                                                    'text.secondary',
                                                            }}
                                                        />

                                                        <Typography
                                                            color="text.secondary"
                                                            sx={{
                                                                fontSize:
                                                                    12,
                                                            }}
                                                        >
                                                            حالة التسجيل:{' '}
                                                            {latestEnrollment
                                                                ? statusLabel(
                                                                    latestEnrollment.status,
                                                                )
                                                                : 'لا يوجد تسجيل'}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            );
                        },
                    )}
                </Box>
            )}

            <Dialog
                open={dialogOpen}
                onClose={() =>
                    setDialogOpen(false)
                }
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    تفاصيل الطالب
                </DialogTitle>

                <DialogContent dividers>
                    {detailsLoading ? (
                        <Box
                            sx={{
                                minHeight: 280,
                                display: 'grid',
                                placeItems: 'center',
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : !selectedStudent ? (
                        <Alert severity="error">
                            تعذر تحميل بيانات الطالب.
                        </Alert>
                    ) : (
                        <Stack spacing={3}>
                            <Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 0.5,
                                    }}
                                >
                                    {fullName(
                                        selectedStudent,
                                    )}
                                </Typography>

                                <Typography
                                    color="text.secondary"
                                >
                                    {
                                        selectedStudent.universityId
                                    }
                                </Typography>
                            </Box>

                            <Divider />

                            <Box
                                sx={{
                                    display: 'grid',

                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                    },

                                    gap: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        الحالة
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        {statusLabel(
                                            selectedStudent.status,
                                        )}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        البريد الجامعي
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        {selectedStudent
                                            .universityEmail ??
                                            '—'}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        الجنسية
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        {selectedStudent
                                            .nationality ??
                                            '—'}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        الهاتف
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        {selectedStudent
                                            .phone ??
                                            '—'}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        معرف الخطة الدراسية
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                            wordBreak:
                                                'break-all',
                                        }}
                                    >
                                        {selectedStudent
                                            .studyPlanId ??
                                            '—'}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        معرف المستوى
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                            wordBreak:
                                                'break-all',
                                        }}
                                    >
                                        {selectedStudent
                                            .academicYearId ??
                                            '—'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                        mb: 2,
                                    }}
                                >
                                    <MenuBookOutlinedIcon />

                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                        }}
                                    >
                                        التسجيلات الدراسية
                                    </Typography>
                                </Stack>

                                {selectedStudent
                                    .enrollments
                                    .length === 0 ? (
                                    <Alert severity="info">
                                        لا توجد تسجيلات دراسية
                                        لهذا الطالب.
                                    </Alert>
                                ) : (
                                    <Stack spacing={2}>
                                        {selectedStudent.enrollments.map(
                                            (
                                                enrollment,
                                            ) => (
                                                <Card
                                                    key={
                                                        enrollment.id
                                                    }
                                                    variant="outlined"
                                                >
                                                    <CardContent>
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            useFlexGap
                                                            sx={{
                                                                justifyContent:
                                                                    'space-between',

                                                                flexWrap:
                                                                    'wrap',

                                                                mb: 1.5,
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontWeight:
                                                                        700,
                                                                }}
                                                            >
                                                                التسجيل الدراسي
                                                            </Typography>

                                                            <Chip
                                                                size="small"
                                                                label={statusLabel(
                                                                    enrollment.status,
                                                                )}
                                                            />
                                                        </Stack>

                                                        {enrollment
                                                            .items
                                                            .length ===
                                                            0 ? (
                                                            <Typography
                                                                color="text.secondary"
                                                                sx={{
                                                                    fontSize:
                                                                        13,
                                                                }}
                                                            >
                                                                لا توجد مقررات
                                                                ضمن هذا التسجيل.
                                                            </Typography>
                                                        ) : (
                                                            <Stack
                                                                spacing={1}
                                                            >
                                                                {enrollment.items.map(
                                                                    (
                                                                        item,
                                                                    ) => (
                                                                        <Box
                                                                            key={
                                                                                item.id
                                                                            }
                                                                            sx={{
                                                                                p: 1.5,

                                                                                border:
                                                                                    '1px solid',

                                                                                borderColor:
                                                                                    'divider',

                                                                                borderRadius:
                                                                                    2,
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                sx={{
                                                                                    fontWeight:
                                                                                        700,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    item
                                                                                        .course
                                                                                        .nameAr
                                                                                }
                                                                            </Typography>

                                                                            <Typography
                                                                                color="text.secondary"
                                                                                sx={{
                                                                                    fontSize:
                                                                                        12,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    item
                                                                                        .course
                                                                                        .code
                                                                                }
                                                                                {' • '}
                                                                                الشعبة{' '}
                                                                                {
                                                                                    item
                                                                                        .section
                                                                                        .sectionNumber
                                                                                }
                                                                                {' • '}
                                                                                {
                                                                                    item
                                                                                        .course
                                                                                        .credits
                                                                                }{' '}
                                                                                ساعات
                                                                            </Typography>
                                                                        </Box>
                                                                    ),
                                                                )}
                                                            </Stack>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ),
                                        )}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}