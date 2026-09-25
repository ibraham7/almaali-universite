import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useNavigate,
} from 'react-router-dom';

import axios from 'axios';

import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

import {
    universityColors,
} from '../../theme/theme';

import {
    getUniversities,
    updateUniversitySettings,
    type University,
} from '../../api/university';

interface SettingsForm {
    nameAr: string;

    nameEn: string;

    minGpaForFutureYears: string;

    allowedFutureYears: string;

    requiredElectiveCredits: string;
}

const emptyForm: SettingsForm = {
    nameAr: '',

    nameEn: '',

    minGpaForFutureYears: '',

    allowedFutureYears: '',

    requiredElectiveCredits: '',
};

function getErrorMessage(
    error: unknown,
) {
    if (axios.isAxiosError(error)) {
        const data =
            error.response?.data as
            | {
                message?:
                | string
                | string[];
            }
            | undefined;

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

export default function SettingsPage() {
    const navigate =
        useNavigate();

    const [
        university,
        setUniversity,
    ] =
        useState<University | null>(
            null,
        );

    const [form, setForm] =
        useState<SettingsForm>(
            emptyForm,
        );

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const loadSettings =
        useCallback(async () => {
            try {
                setLoading(true);

                setError('');

                const universities =
                    await getUniversities();

                const currentUniversity =
                    universities[0];

                if (!currentUniversity) {
                    setUniversity(null);

                    setForm(
                        emptyForm,
                    );

                    setError(
                        'لا توجد جامعة مسجلة في النظام.',
                    );

                    return;
                }

                setUniversity(
                    currentUniversity,
                );

                setForm({
                    nameAr:
                        currentUniversity.nameAr,

                    nameEn:
                        currentUniversity.nameEn,

                    minGpaForFutureYears:
                        String(
                            currentUniversity.minGpaForFutureYears,
                        ),

                    allowedFutureYears:
                        String(
                            currentUniversity.allowedFutureYears,
                        ),

                    requiredElectiveCredits:
                        String(
                            currentUniversity.requiredElectiveCredits,
                        ),
                });
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
        void loadSettings();
    }, [loadSettings]);

    function updateField(
        field: keyof SettingsForm,
        value: string,
    ) {
        setForm(
            (current) => ({
                ...current,

                [field]: value,
            }),
        );

        setSuccess('');
    }

    async function handleSave() {
        if (!university) {
            return;
        }

        setError('');

        setSuccess('');

        const nameAr =
            form.nameAr.trim();

        const nameEn =
            form.nameEn.trim();

        const minGpa =
            Number(
                form.minGpaForFutureYears,
            );

        const allowedLevels =
            Number(
                form.allowedFutureYears,
            );

        const electiveCredits =
            Number(
                form.requiredElectiveCredits,
            );

        if (!nameAr) {
            setError(
                'اسم الجامعة بالعربية مطلوب.',
            );

            return;
        }

        if (!nameEn) {
            setError(
                'اسم الجامعة بالإنجليزية مطلوب.',
            );

            return;
        }

        if (
            !Number.isFinite(
                minGpa,
            ) ||
            minGpa < 0
        ) {
            setError(
                'حد المعدل يجب أن يكون صفرًا أو أكبر.',
            );

            return;
        }

        if (
            !Number.isInteger(
                allowedLevels,
            ) ||
            allowedLevels < 0
        ) {
            setError(
                'عدد المستويات المستقبلية يجب أن يكون عددًا صحيحًا صفرًا أو أكبر.',
            );

            return;
        }

        if (
            !Number.isInteger(
                electiveCredits,
            ) ||
            electiveCredits < 0
        ) {
            setError(
                'الساعات الاختيارية المطلوبة يجب أن تكون عددًا صحيحًا صفرًا أو أكبر.',
            );

            return;
        }

        try {
            setSaving(true);

            const updated =
                await updateUniversitySettings(
                    university.id,
                    {
                        nameAr,

                        nameEn,

                        minGpaForFutureYears:
                            minGpa,

                        allowedFutureYears:
                            allowedLevels,

                        requiredElectiveCredits:
                            electiveCredits,
                    },
                );

            setUniversity(
                updated,
            );

            setForm({
                nameAr:
                    updated.nameAr,

                nameEn:
                    updated.nameEn,

                minGpaForFutureYears:
                    String(
                        updated.minGpaForFutureYears,
                    ),

                allowedFutureYears:
                    String(
                        updated.allowedFutureYears,
                    ),

                requiredElectiveCredits:
                    String(
                        updated.requiredElectiveCredits,
                    ),
            });

            setSuccess(
                'تم حفظ إعدادات النظام بنجاح.',
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    function handleReset() {
        if (!university) {
            return;
        }

        setForm({
            nameAr:
                university.nameAr,

            nameEn:
                university.nameEn,

            minGpaForFutureYears:
                String(
                    university.minGpaForFutureYears,
                ),

            allowedFutureYears:
                String(
                    university.allowedFutureYears,
                ),

            requiredElectiveCredits:
                String(
                    university.requiredElectiveCredits,
                ),
        });

        setError('');

        setSuccess('');
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
                    spacing={1.5}
                    sx={{
                        alignItems:
                            'center',
                    }}
                >
                    <CircularProgress />

                    <Typography
                        sx={{
                            fontSize: 12,

                            color:
                                universityColors.textSecondary,
                        }}
                    >
                        جاري تحميل إعدادات
                        النظام...
                    </Typography>
                </Stack>
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
            <Box
                sx={{
                    mb: 3,

                    display: 'flex',

                    justifyContent:
                        'space-between',

                    alignItems: {
                        xs: 'flex-start',

                        md: 'center',
                    },

                    flexDirection: {
                        xs: 'column',

                        md: 'row',
                    },

                    gap: 2,
                }}
            >
                <Box>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems:
                                'center',

                            mb: 0.7,
                        }}
                    >
                        <SettingsRoundedIcon
                            sx={{
                                fontSize: 20,

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
                            إدارة النظام
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
                        إعدادات النظام
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.7,

                            maxWidth: 700,

                            fontSize: 12.5,

                            color:
                                universityColors.textSecondary,
                        }}
                    >
                        إعدادات الجامعة وقواعد
                        التسجيل الأكاديمي المعتمدة
                        في النظام.
                    </Typography>
                </Box>

                <Stack
                    direction="row"
                    spacing={1}
                >
                    <Button
                        variant="outlined"
                        startIcon={
                            <RefreshRoundedIcon />
                        }
                        disabled={
                            saving ||
                            !university
                        }
                        onClick={
                            handleReset
                        }
                    >
                        تراجع
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={
                            saving ? (
                                <CircularProgress
                                    size={17}
                                    color="inherit"
                                />
                            ) : (
                                <SaveRoundedIcon />
                            )
                        }
                        disabled={
                            saving ||
                            !university
                        }
                        onClick={() =>
                            void handleSave()
                        }
                    >
                        {saving
                            ? 'جاري الحفظ...'
                            : 'حفظ الإعدادات'}
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    onClose={() =>
                        setError('')
                    }
                    sx={{
                        mb: 2.5,
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
                    sx={{
                        mb: 2.5,
                    }}
                >
                    {success}
                </Alert>
            )}

            {university && (
                <>
                    <Card
                        sx={{
                            boxShadow: 'none',

                            mb: 2.5,
                        }}
                    >
                        <CardContent
                            sx={{
                                p: {
                                    xs: 2,

                                    md: 3,
                                },

                                '&:last-child':
                                {
                                    pb: {
                                        xs: 2,

                                        md: 3,
                                    },
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{
                                    alignItems:
                                        'center',

                                    mb: 3,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,

                                        height: 44,

                                        borderRadius: 2,

                                        bgcolor:
                                            universityColors.softBlue,

                                        color:
                                            universityColors.navy,

                                        display: 'flex',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',
                                    }}
                                >
                                    <SchoolRoundedIcon />
                                </Box>

                                <Box>
                                    <Typography
                                        sx={{
                                            fontSize: 16,

                                            fontWeight:
                                                700,

                                            color:
                                                universityColors.navyDark,
                                        }}
                                    >
                                        إعدادات الجامعة
                                    </Typography>

                                    <Typography
                                        sx={{
                                            mt: 0.3,

                                            fontSize:
                                                11.5,

                                            color:
                                                universityColors.textSecondary,
                                        }}
                                    >
                                        البيانات الأساسية
                                        للجامعة المستخدمة
                                        داخل النظام.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Box
                                sx={{
                                    display: 'grid',

                                    gridTemplateColumns:
                                    {
                                        xs: '1fr',

                                        md: 'repeat(2, minmax(0, 1fr))',
                                    },

                                    gap: 2,
                                }}
                            >
                                <TextField
                                    label="اسم الجامعة بالعربية"
                                    value={
                                        form.nameAr
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            'nameAr',
                                            event.target
                                                .value,
                                        )
                                    }
                                    fullWidth
                                />

                                <TextField
                                    label="اسم الجامعة بالإنجليزية"
                                    value={form.nameEn}
                                    onChange={(event) =>
                                        updateField(
                                            'nameEn',
                                            event.target.value,
                                        )
                                    }
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            dir: 'ltr',
                                        },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            boxShadow: 'none',

                            mb: 2.5,
                        }}
                    >
                        <CardContent
                            sx={{
                                p: {
                                    xs: 2,

                                    md: 3,
                                },

                                '&:last-child':
                                {
                                    pb: {
                                        xs: 2,

                                        md: 3,
                                    },
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{
                                    alignItems:
                                        'center',

                                    mb: 3,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,

                                        height: 44,

                                        borderRadius: 2,

                                        bgcolor:
                                            universityColors.softBlue,

                                        color:
                                            universityColors.navy,

                                        display: 'flex',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',
                                    }}
                                >
                                    <TuneRoundedIcon />
                                </Box>

                                <Box>
                                    <Typography
                                        sx={{
                                            fontSize: 16,

                                            fontWeight:
                                                700,

                                            color:
                                                universityColors.navyDark,
                                        }}
                                    >
                                        قواعد التسجيل
                                    </Typography>

                                    <Typography
                                        sx={{
                                            mt: 0.3,

                                            fontSize:
                                                11.5,

                                            color:
                                                universityColors.textSecondary,
                                        }}
                                    >
                                        القيم العامة التي
                                        يعتمد عليها نظام
                                        التسجيل الأكاديمي.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Box
                                sx={{
                                    display: 'grid',

                                    gridTemplateColumns:
                                    {
                                        xs: '1fr',

                                        md: 'repeat(3, minmax(0, 1fr))',
                                    },

                                    gap: 2,
                                }}
                            >
                                <TextField
                                    type="number"
                                    label="حد المعدل للمستويات المستقبلية"
                                    value={
                                        form.minGpaForFutureYears
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            'minGpaForFutureYears',
                                            event.target
                                                .value,
                                        )
                                    }
                                    helperText="القيمة الافتراضية المعتمدة حاليًا: 2"
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,

                                            step: 0.01,
                                        },
                                    }}
                                />

                                <TextField
                                    type="number"
                                    label="المستويات المستقبلية المسموحة"
                                    value={
                                        form.allowedFutureYears
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            'allowedFutureYears',
                                            event.target
                                                .value,
                                        )
                                    }
                                    helperText="عدد المستويات المستقبلية التي يسمح النظام بها"
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,

                                            step: 1,
                                        },
                                    }}
                                />

                                <TextField
                                    type="number"
                                    label="الساعات الاختيارية المطلوبة"
                                    value={
                                        form.requiredElectiveCredits
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            'requiredElectiveCredits',
                                            event.target
                                                .value,
                                        )
                                    }
                                    helperText="إجمالي الساعات الاختيارية المطلوبة"
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,

                                            step: 1,
                                        },
                                    }}
                                />
                            </Box>

                            <Alert
                                severity="info"
                                sx={{
                                    mt: 2.5,
                                }}
                            >
                                هذه القيم أصبحت
                                محفوظة فعليًا في قاعدة
                                البيانات. ربطها بقواعد
                                أهلية التسجيل سيتم في
                                مرحلة قواعد التسجيل
                                التالية.
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            boxShadow: 'none',
                        }}
                    >
                        <CardContent
                            sx={{
                                p: {
                                    xs: 2,

                                    md: 3,
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{
                                    alignItems:
                                        'center',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,

                                        height: 44,

                                        borderRadius: 2,

                                        bgcolor:
                                            universityColors.softBlue,

                                        color:
                                            universityColors.navy,

                                        display: 'flex',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',

                                        flexShrink: 0,
                                    }}
                                >
                                    <SecurityRoundedIcon />
                                </Box>

                                <Box
                                    sx={{
                                        flex: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: 16,

                                            fontWeight:
                                                700,

                                            color:
                                                universityColors.navyDark,
                                        }}
                                    >
                                        المستخدمون
                                        والصلاحيات
                                    </Typography>

                                    <Typography
                                        sx={{
                                            mt: 0.3,

                                            fontSize:
                                                11.5,

                                            color:
                                                universityColors.textSecondary,
                                        }}
                                    >
                                        إدارة أدوار
                                        المستخدمين وحالات
                                        الحسابات تتم من صفحة
                                        المستخدمين.
                                    </Typography>
                                </Box>

                                <Button
                                    variant="outlined"
                                    startIcon={
                                        <GroupsRoundedIcon />
                                    }
                                    onClick={() =>
                                        navigate(
                                            '/users',
                                        )
                                    }
                                >
                                    إدارة المستخدمين
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Divider
                        sx={{
                            my: 3,
                        }}
                    />

                    <Typography
                        sx={{
                            fontSize: 11.5,

                            color:
                                universityColors.textSecondary,
                        }}
                    >
                        آخر تحديث:{' '}
                        {new Date(
                            university.updatedAt,
                        ).toLocaleString(
                            'ar',
                        )}
                    </Typography>
                </>
            )}
        </Box>
    );
}