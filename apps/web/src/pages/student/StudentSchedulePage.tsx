import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Typography,
} from '@mui/material';

import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import {
    getMyRegistration,
    type EnrollmentItem,
    type RegistrationContext,
} from '../../api/studentRegistration';

const DAYS = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
] as const;

const DAY_LABELS: Record<string, string> = {
    SUNDAY: 'الأحد',
    MONDAY: 'الاثنين',
    TUESDAY: 'الثلاثاء',
    WEDNESDAY: 'الأربعاء',
    THURSDAY: 'الخميس',
    FRIDAY: 'الجمعة',
    SATURDAY: 'السبت',

    الأحد: 'الأحد',
    الاثنين: 'الاثنين',
    الثلاثاء: 'الثلاثاء',
    الأربعاء: 'الأربعاء',
    الخميس: 'الخميس',
    الجمعة: 'الجمعة',
    السبت: 'السبت',
};

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | {
                message?: string | string[];
                errors?: string[];
            }
            | undefined;

        if (data?.errors?.length) {
            return data.errors.join('، ');
        }

        if (Array.isArray(data?.message)) {
            return data.message.join('، ');
        }

        if (typeof data?.message === 'string') {
            return data.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'حدث خطأ غير متوقع.';
}

function statusLabel(status?: string) {
    switch (status) {
        case 'DRAFT':
            return 'مسودة';

        case 'PENDING':
            return 'بانتظار موافقة المرشد';

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
            return 'غير محدد';
    }
}

function statusColor(
    status?: string,
):
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'error' {
    switch (status) {
        case 'APPROVED':
        case 'CONFIRMED':
            return 'success';

        case 'PENDING':
            return 'warning';

        case 'REJECTED':
        case 'CANCELLED':
            return 'error';

        case 'DRAFT':
            return 'primary';

        default:
            return 'default';
    }
}

interface ScheduleEntry {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    item: EnrollmentItem;
}

export default function StudentSchedulePage() {
    const [registration, setRegistration] =
        useState<RegistrationContext | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function loadSchedule() {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await getMyRegistration();

                if (!active) {
                    return;
                }

                if (data.success === false) {
                    setRegistration(data);

                    setError(
                        data.errors?.join('، ') ??
                        'تعذر تحميل الجدول الدراسي.',
                    );

                    return;
                }

                setRegistration(data);
            } catch (requestError) {
                if (active) {
                    setError(
                        getErrorMessage(requestError),
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadSchedule();

        return () => {
            active = false;
        };
    }, []);

    const enrollment =
        registration?.enrollment ?? null;

    const items =
        enrollment?.items ?? [];

    const scheduleEntries =
        useMemo<ScheduleEntry[]>(() => {
            return items.flatMap((item) =>
                item.section.schedules.map(
                    (schedule) => ({
                        id: schedule.id,
                        day: schedule.day,
                        startTime:
                            schedule.startTime,
                        endTime:
                            schedule.endTime,
                        item,
                    }),
                ),
            );
        }, [items]);

    const totalCredits =
        useMemo(
            () =>
                items.reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.course.credits ?? 0,
                        ),
                    0,
                ),
            [items],
        );

    const groupedByDay =
        useMemo(() => {
            const result = new Map<
                string,
                ScheduleEntry[]
            >();

            for (const entry of scheduleEntries) {
                const current =
                    result.get(entry.day) ?? [];

                current.push(entry);

                result.set(
                    entry.day,
                    current,
                );
            }

            for (const [, entries] of result) {
                entries.sort((a, b) =>
                    a.startTime.localeCompare(
                        b.startTime,
                    ),
                );
            }

            return result;
        }, [scheduleEntries]);

    const orderedDays =
        useMemo(() => {
            const knownDays =
                DAYS.filter((day) =>
                    groupedByDay.has(day),
                );

            const customDays = Array.from(
                groupedByDay.keys(),
            ).filter(
                (day) =>
                    !DAYS.includes(
                        day as (typeof DAYS)[number],
                    ),
            );

            return [
                ...knownDays,
                ...customDays,
            ];
        }, [groupedByDay]);

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

                    <Typography color="text.secondary">
                        جاري تحميل الجدول الدراسي...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    if (
        !registration ||
        registration.success === false
    ) {
        return (
            <Box>
                <Typography
                    variant="h4"
                    sx={{ mb: 3 }}
                >
                    جدولي الدراسي
                </Typography>

                <Alert severity="error">
                    {error ??
                        'تعذر تحميل الجدول الدراسي.'}
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: {
                        xs: 'column',
                        md: 'row',
                    },
                    alignItems: {
                        xs: 'stretch',
                        md: 'center',
                    },
                    justifyContent:
                        'space-between',
                    gap: 2,
                    mb: 3,
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
                        جدولي الدراسي
                    </Typography>

                    <Typography
                        color="text.secondary"
                        sx={{ fontSize: 14 }}
                    >
                        {registration.academicYear
                            ?.nameAr ??
                            'المستوى'}
                        {' • '}
                        {registration.semester
                            ?.nameAr ??
                            'الفصل الدراسي'}
                    </Typography>
                </Box>

                {enrollment && (
                    <Chip
                        label={statusLabel(
                            enrollment.status,
                        )}
                        color={statusColor(
                            enrollment.status,
                        )}
                        sx={{
                            minHeight: 36,
                            fontWeight: 700,
                        }}
                    />
                )}
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            )}

            {!enrollment && (
                <Alert
                    severity="info"
                    sx={{ mb: 2.5 }}
                >
                    لا يوجد تسجيل دراسي حالي
                    للطالب.
                </Alert>
            )}

            {enrollment?.status ===
                'PENDING' && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2.5 }}
                    >
                        تسجيلك بانتظار موافقة
                        المرشد الأكاديمي.
                    </Alert>
                )}

            {enrollment?.status ===
                'REJECTED' && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2.5 }}
                    >
                        تم رفض طلب التسجيل من
                        المرشد الأكاديمي.
                    </Alert>
                )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                }}
            >
                <Card>
                    <CardContent>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <MenuBookRoundedIcon color="primary" />

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    المقررات
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {items.length}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <SchoolOutlinedIcon color="primary" />

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    الساعات المسجلة
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {totalCredits}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <CalendarMonthRoundedIcon color="primary" />

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    أيام الدراسة
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {orderedDays.length}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <AccessTimeRoundedIcon color="primary" />

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    المحاضرات
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {scheduleEntries.length}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            {items.length === 0 ? (
                <Card>
                    <CardContent>
                        <Box
                            sx={{
                                py: 6,
                                textAlign: 'center',
                            }}
                        >
                            <CalendarMonthRoundedIcon
                                sx={{
                                    fontSize: 48,
                                    color:
                                        'text.secondary',
                                    mb: 1.5,
                                }}
                            />

                            <Typography
                                variant="h6"
                                sx={{ mb: 0.5 }}
                            >
                                لا يوجد جدول دراسي
                            </Typography>

                            <Typography
                                color="text.secondary"
                                sx={{ fontSize: 13 }}
                            >
                                لم يتم تسجيل أي مقررات
                                في الفصل الحالي.
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            xl: 'minmax(0, 1fr) 340px',
                        },
                        gap: 2.5,
                        alignItems: 'start',
                    }}
                >
                    <Stack spacing={2}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                            }}
                        >
                            الجدول الأسبوعي
                        </Typography>

                        {orderedDays.length ===
                            0 ? (
                            <Alert severity="info">
                                المقررات مسجلة، لكن لا
                                توجد مواعيد محددة للشعب
                                حتى الآن.
                            </Alert>
                        ) : (
                            orderedDays.map((day) => {
                                const entries =
                                    groupedByDay.get(
                                        day,
                                    ) ?? [];

                                return (
                                    <Card key={day}>
                                        <CardContent
                                            sx={{
                                                p: '22px !important',
                                            }}
                                        >
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                sx={{
                                                    alignItems:
                                                        'center',
                                                    mb: 2,
                                                }}
                                            >
                                                <CalendarMonthRoundedIcon color="primary" />

                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight:
                                                            700,
                                                    }}
                                                >
                                                    {DAY_LABELS[
                                                        day
                                                    ] ?? day}
                                                </Typography>

                                                <Chip
                                                    size="small"
                                                    label={`${entries.length} محاضرة`}
                                                />
                                            </Stack>

                                            <Divider
                                                sx={{ mb: 2 }}
                                            />

                                            <Stack spacing={1.5}>
                                                {entries.map(
                                                    (entry) => (
                                                        <Box
                                                            key={
                                                                entry.id
                                                            }
                                                            sx={{
                                                                display:
                                                                    'grid',
                                                                gridTemplateColumns:
                                                                {
                                                                    xs: '1fr',
                                                                    md: '150px minmax(0, 1fr)',
                                                                },
                                                                gap: 2,
                                                                p: 2,
                                                                border:
                                                                    '1px solid',
                                                                borderColor:
                                                                    'divider',
                                                                borderRadius:
                                                                    2,
                                                            }}
                                                        >
                                                            <Box>
                                                                <Stack
                                                                    direction="row"
                                                                    spacing={0.7}
                                                                    sx={{
                                                                        alignItems:
                                                                            'center',
                                                                    }}
                                                                >
                                                                    <AccessTimeRoundedIcon
                                                                        sx={{
                                                                            fontSize:
                                                                                18,
                                                                            color:
                                                                                'text.secondary',
                                                                        }}
                                                                    />

                                                                    <Typography
                                                                        sx={{
                                                                            fontWeight:
                                                                                700,
                                                                        }}
                                                                    >
                                                                        {
                                                                            entry.startTime
                                                                        }
                                                                        {' - '}
                                                                        {
                                                                            entry.endTime
                                                                        }
                                                                    </Typography>
                                                                </Stack>
                                                            </Box>

                                                            <Box>
                                                                <Stack
                                                                    direction="row"
                                                                    spacing={1}
                                                                    useFlexGap
                                                                    sx={{
                                                                        flexWrap:
                                                                            'wrap',
                                                                        mb: 0.7,
                                                                    }}
                                                                >
                                                                    <Chip
                                                                        size="small"
                                                                        label={
                                                                            entry
                                                                                .item
                                                                                .course
                                                                                .code
                                                                        }
                                                                    />

                                                                    <Chip
                                                                        size="small"
                                                                        variant="outlined"
                                                                        label={`الشعبة ${entry.item.section.sectionNumber}`}
                                                                    />
                                                                </Stack>

                                                                <Typography
                                                                    sx={{
                                                                        fontWeight:
                                                                            700,
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    {
                                                                        entry
                                                                            .item
                                                                            .course
                                                                            .nameAr
                                                                    }
                                                                </Typography>

                                                                <Stack
                                                                    direction={{
                                                                        xs: 'column',
                                                                        sm: 'row',
                                                                    }}
                                                                    spacing={2}
                                                                    useFlexGap
                                                                    sx={{
                                                                        flexWrap:
                                                                            'wrap',
                                                                    }}
                                                                >
                                                                    <Stack
                                                                        direction="row"
                                                                        spacing={0.7}
                                                                        sx={{
                                                                            alignItems:
                                                                                'center',
                                                                        }}
                                                                    >
                                                                        <PersonOutlineRoundedIcon
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
                                                                            {entry
                                                                                .item
                                                                                .section
                                                                                .teacher
                                                                                ?.name ??
                                                                                'لم يحدد المدرس'}
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
                                                                        <MeetingRoomOutlinedIcon
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
                                                                            {entry
                                                                                .item
                                                                                .section
                                                                                .classroom
                                                                                ?.name ??
                                                                                'لم تحدد القاعة'}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>
                                                            </Box>
                                                        </Box>
                                                    ),
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </Stack>

                    <Card
                        sx={{
                            position: {
                                xl: 'sticky',
                            },
                            top: {
                                xl: 24,
                            },
                        }}
                    >
                        <CardContent
                            sx={{
                                p: '22px !important',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    mb: 2,
                                }}
                            >
                                المقررات المسجلة
                            </Typography>

                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={1.5}>
                                {items.map((item) => (
                                    <Box
                                        key={item.id}
                                        sx={{
                                            p: 1.5,
                                            border:
                                                '1px solid',
                                            borderColor:
                                                'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            sx={{
                                                justifyContent:
                                                    'space-between',
                                                gap: 1,
                                                mb: 0.7,
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                }}
                                            >
                                                {
                                                    item.course
                                                        .nameAr
                                                }
                                            </Typography>

                                            <Chip
                                                size="small"
                                                label={
                                                    item.course
                                                        .code
                                                }
                                            />
                                        </Stack>

                                        <Typography
                                            color="text.secondary"
                                            sx={{
                                                fontSize: 12,
                                            }}
                                        >
                                            الشعبة{' '}
                                            {
                                                item.section
                                                    .sectionNumber
                                            }
                                            {' • '}
                                            {
                                                item.course
                                                    .credits
                                            }{' '}
                                            ساعات
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    );
}