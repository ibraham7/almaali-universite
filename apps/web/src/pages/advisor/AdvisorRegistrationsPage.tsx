import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import axios from 'axios';

import {
    getMyAdvisorApprovals,
    updateAdvisorApproval,
    type AdvisorApproval,
} from '../../api/advisorApprovals';

type Decision =
    | 'APPROVED'
    | 'REJECTED';

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const message =
            error.response?.data?.message;

        if (Array.isArray(message)) {
            return message.join('، ');
        }

        if (typeof message === 'string') {
            return message;
        }
    }

    return 'حدث خطأ غير متوقع.';
}

function studentName(
    approval: AdvisorApproval,
) {
    const student =
        approval.enrollment.student;

    return [
        student.firstName,
        student.middleName,
        student.familyName,
    ]
        .filter(Boolean)
        .join(' ');
}

export default function AdvisorRegistrationsPage() {
    const [approvals, setApprovals] =
        useState<AdvisorApproval[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const [selected, setSelected] =
        useState<AdvisorApproval | null>(
            null,
        );

    const [decision, setDecision] =
        useState<Decision | null>(null);

    const [note, setNote] =
        useState('');

    const loadData = useCallback(
        async () => {
            setLoading(true);
            setError('');

            try {
                const data =
                    await getMyAdvisorApprovals();

                setApprovals(data);
            } catch (err) {
                setError(
                    getErrorMessage(err),
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const pendingCount = useMemo(
        () =>
            approvals.filter(
                (item) =>
                    item.status === 'PENDING',
            ).length,
        [approvals],
    );

    const openDecision = (
        approval: AdvisorApproval,
        value: Decision,
    ) => {
        setSelected(approval);
        setDecision(value);
        setNote('');
    };

    const submit = async () => {
        if (!selected || !decision) {
            return;
        }

        if (
            decision === 'REJECTED' &&
            !note.trim()
        ) {
            setError(
                'سبب الرفض مطلوب.',
            );

            return;
        }

        setSaving(true);
        setError('');

        try {
            await updateAdvisorApproval(
                selected.id,
                {
                    status: decision,
                    note:
                        note.trim() ||
                        undefined,
                },
            );

            setSuccess(
                decision === 'APPROVED'
                    ? 'تمت الموافقة على التسجيل.'
                    : 'تم رفض التسجيل.',
            );

            setSelected(null);
            setDecision(null);
            setNote('');

            await loadData();
        } catch (err) {
            setError(
                getErrorMessage(err),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: {
                        xs: 'stretch',
                        md: 'center',
                    },
                    flexDirection: {
                        xs: 'column',
                        md: 'row',
                    },
                    gap: 2,
                    mb: 4,
                }}
            >
                <Box>
                    <Typography variant="h4">
                        طلبات تسجيل الطلاب
                    </Typography>

                    <Typography
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                    >
                        مراجعة التسجيلات
                        والموافقة عليها أو رفضها.
                    </Typography>
                </Box>

                <Stack
                    direction="row"
                    sx={{ gap: 1 }}
                >
                    <Chip
                        color="warning"
                        label={`${pendingCount} طلبات معلقة`}
                    />

                    <Button
                        variant="outlined"
                        startIcon={
                            <RefreshRoundedIcon />
                        }
                        onClick={() =>
                            void loadData()
                        }
                    >
                        تحديث
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    severity="success"
                    sx={{ mb: 2 }}
                >
                    {success}
                </Alert>
            )}

            {loading ? (
                <Box
                    sx={{
                        minHeight: 300,
                        display: 'grid',
                        placeItems: 'center',
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : approvals.length === 0 ? (
                <Card>
                    <CardContent
                        sx={{
                            minHeight: 230,
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        لا توجد طلبات تسجيل.
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {approvals.map(
                        (approval) => {
                            const totalCredits =
                                approval.enrollment.items.reduce(
                                    (total, item) =>
                                        total +
                                        item.course.credits,
                                    0,
                                );

                            return (
                                <Card
                                    key={approval.id}
                                >
                                    <CardContent>
                                        <Stack
                                            direction={{
                                                xs: 'column',
                                                md: 'row',
                                            }}
                                            sx={{
                                                justifyContent:
                                                    'space-between',
                                                gap: 2,
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    variant="h6"
                                                >
                                                    {studentName(
                                                        approval,
                                                    )}
                                                </Typography>

                                                <Typography
                                                    color="text.secondary"
                                                >
                                                    الرقم الجامعي:{' '}
                                                    {
                                                        approval
                                                            .enrollment
                                                            .student
                                                            .universityId
                                                    }
                                                </Typography>
                                            </Box>

                                            <Stack
                                                direction="row"
                                                sx={{
                                                    gap: 1,
                                                    flexWrap:
                                                        'wrap',
                                                }}
                                            >
                                                <Chip
                                                    label={`${approval.enrollment.items.length} مقررات`}
                                                />

                                                <Chip
                                                    label={`${totalCredits} ساعات`}
                                                />

                                                <Chip
                                                    color={
                                                        approval.status ===
                                                            'PENDING'
                                                            ? 'warning'
                                                            : approval.status ===
                                                                'APPROVED'
                                                                ? 'success'
                                                                : 'error'
                                                    }
                                                    label={
                                                        approval.status
                                                    }
                                                />
                                            </Stack>
                                        </Stack>

                                        <Divider
                                            sx={{ my: 2 }}
                                        />

                                        <Stack spacing={1}>
                                            {approval.enrollment.items.map(
                                                (item) => (
                                                    <Box
                                                        key={
                                                            item.id
                                                        }
                                                        sx={{
                                                            p: 1.5,
                                                            bgcolor:
                                                                'action.hover',
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
                                                                item.course
                                                                    .code
                                                            }
                                                            {' — '}
                                                            {
                                                                item.course
                                                                    .nameAr
                                                            }
                                                        </Typography>

                                                        <Typography
                                                            color="text.secondary"
                                                            sx={{
                                                                fontSize:
                                                                    13,
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
                                                            {' • '}
                                                            {item.section
                                                                .teacher
                                                                ?.name ??
                                                                'بدون مدرس'}
                                                        </Typography>
                                                    </Box>
                                                ),
                                            )}
                                        </Stack>

                                        {approval.note && (
                                            <Alert
                                                severity="info"
                                                sx={{
                                                    mt: 2,
                                                }}
                                            >
                                                {
                                                    approval.note
                                                }
                                            </Alert>
                                        )}

                                        {approval.status ===
                                            'PENDING' && (
                                                <Stack
                                                    direction="row"
                                                    sx={{
                                                        justifyContent:
                                                            'flex-end',
                                                        gap: 1,
                                                        mt: 2,
                                                    }}
                                                >
                                                    <Button
                                                        color="error"
                                                        variant="outlined"
                                                        startIcon={
                                                            <CloseRoundedIcon />
                                                        }
                                                        onClick={() =>
                                                            openDecision(
                                                                approval,
                                                                'REJECTED',
                                                            )
                                                        }
                                                    >
                                                        رفض
                                                    </Button>

                                                    <Button
                                                        color="success"
                                                        variant="contained"
                                                        startIcon={
                                                            <CheckCircleOutlineRoundedIcon />
                                                        }
                                                        onClick={() =>
                                                            openDecision(
                                                                approval,
                                                                'APPROVED',
                                                            )
                                                        }
                                                    >
                                                        موافقة
                                                    </Button>
                                                </Stack>
                                            )}
                                    </CardContent>
                                </Card>
                            );
                        },
                    )}
                </Stack>
            )}

            <Dialog
                open={Boolean(selected)}
                onClose={() =>
                    !saving &&
                    setSelected(null)
                }
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {decision === 'APPROVED'
                        ? 'تأكيد الموافقة'
                        : 'رفض التسجيل'}
                </DialogTitle>

                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        sx={{ mt: 1 }}
                        label={
                            decision === 'REJECTED'
                                ? 'سبب الرفض'
                                : 'ملاحظة اختيارية'
                        }
                        value={note}
                        onChange={(event) =>
                            setNote(
                                event.target.value,
                            )
                        }
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        disabled={saving}
                        onClick={() =>
                            setSelected(null)
                        }
                    >
                        إلغاء
                    </Button>

                    <Button
                        variant="contained"
                        color={
                            decision === 'APPROVED'
                                ? 'success'
                                : 'error'
                        }
                        disabled={saving}
                        onClick={() =>
                            void submit()
                        }
                    >
                        تأكيد
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}