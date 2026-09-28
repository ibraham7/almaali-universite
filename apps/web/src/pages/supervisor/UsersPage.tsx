import {
    Alert,
    Avatar,
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
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react';

import axios from 'axios';
import { importStudentsFile } from '../../api/students';

import {
    createStaffUser,
    getRoles,
    getUsers,
    updateUserRole,
    updateUserStatus,
    getSignupAttempts,
    resetStudentSignup,
    type Role,
    type RoleCode,
    type SystemUser,
    type UserStatus,
} from '../../api/users';

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

    if (error instanceof Error) {
        return error.message;
    }

    return 'حدث خطأ غير متوقع.';
}

function roleLabel(
    role: RoleCode,
) {
    switch (role) {
        case 'STUDENT':
            return 'طالب';

        case 'ADVISOR':
            return 'مرشد أكاديمي';

        case 'REGISTRAR':
            return 'مسجل';

        case 'SYSTEM_ADMIN':
            return 'مدير النظام';
    }
}

function statusLabel(
    status: UserStatus,
) {
    switch (status) {
        case 'PENDING_VERIFICATION':
            return 'بانتظار التفعيل';
        case 'ACTIVE':
            return 'نشط';

        case 'SUSPENDED':
            return 'موقوف';

        case 'LOCKED':
            return 'مقفل';

        case 'DISABLED':
            return 'معطل';
    }
}

function studentName(
    user: SystemUser,
) {
    if (!user.student) {
        return null;
    }

    return [
        user.student.firstName,
        user.student.middleName,
        user.student.familyName,
    ]
        .filter(Boolean)
        .join(' ');
}

export default function UsersPage() {
    const [users, setUsers] =
        useState<SystemUser[]>([]);

    const [roles, setRoles] =
        useState<Role[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');
    const [attemptDialogOpen, setAttemptDialogOpen] = useState(false);
    const [createStaffDialogOpen, setCreateStaffDialogOpen] = useState(false);
    const [staffName, setStaffName] = useState('');
    const [staffUsername, setStaffUsername] = useState('');
    const [staffPassword, setStaffPassword] = useState('');
    const [staffRole, setStaffRole] = useState<Exclude<RoleCode, 'STUDENT'>>('ADVISOR');
    const [signupAttempts, setSignupAttempts] = useState<{ failedCount: number; attempts: Array<{ id: string; succeeded: boolean; createdAt: string }> } | null>(null);

    const [search, setSearch] =
        useState('');

    const [
        statusFilter,
        setStatusFilter,
    ] = useState('');

    const [
        roleFilter,
        setRoleFilter,
    ] = useState('');

    const [
        selectedUser,
        setSelectedUser,
    ] =
        useState<SystemUser | null>(
            null,
        );

    const [
        dialogOpen,
        setDialogOpen,
    ] = useState(false);

    const [
        selectedStatus,
        setSelectedStatus,
    ] =
        useState<UserStatus>('ACTIVE');

    const [
        selectedRole,
        setSelectedRole,
    ] =
        useState<RoleCode>('STUDENT');

    const loadData =
        useCallback(async () => {
            try {
                setLoading(true);

                setError('');

                const [
                    usersData,
                    rolesData,
                ] = await Promise.all([
                    getUsers(),
                    getRoles(),
                ]);

                setUsers(usersData);

                setRoles(rolesData);
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

    async function openAttemptLog() {
        try {
            setSignupAttempts(await getSignupAttempts());
            setAttemptDialogOpen(true);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        }
    }

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const filteredUsers =
        useMemo(() => {
            const normalized =
                search
                    .trim()
                    .toLowerCase();

            return users.filter(
                (user) => {
                    if (
                        statusFilter &&
                        user.status !==
                        statusFilter
                    ) {
                        return false;
                    }

                    if (
                        roleFilter &&
                        user.role.code !==
                        roleFilter
                    ) {
                        return false;
                    }

                    if (!normalized) {
                        return true;
                    }

                    const name =
                        studentName(user) ?? user.displayName ?? user.username;

                    return [
                        user.email,
                        user.username,
                        user.displayName,
                        user.student
                            ?.universityId,
                        name,
                    ].some(
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
            users,
            search,
            statusFilter,
            roleFilter,
        ]);

    function openUser(
        user: SystemUser,
    ) {
        setSelectedUser(user);

        setSelectedStatus(
            user.status,
        );

        setSelectedRole(
            user.role.code,
        );

        setError('');

        setDialogOpen(true);
    }

    async function saveChanges() {
        if (!selectedUser) {
            return;
        }

        try {
            setSaving(true);

            setError('');

            setSuccess('');

            if (
                selectedStatus !==
                selectedUser.status
            ) {
                await updateUserStatus(
                    selectedUser.id,
                    selectedStatus,
                );
            }

            if (
                selectedRole !==
                selectedUser.role.code
            ) {
                await updateUserRole(
                    selectedUser.id,
                    selectedRole,
                );
            }

            setDialogOpen(false);

            setSuccess(
                'تم تحديث المستخدم بنجاح.',
            );

            await loadData();
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

    async function resetPendingSignup() {
        if (!selectedUser || selectedUser.status !== 'PENDING_VERIFICATION') return;
        if (!window.confirm('سيُفصل الحساب المعلّق عن سجل الطالب وحذفه، ويمكن للطالب إرسال طلب جديد. هل تريد المتابعة؟')) return;
        try {
            setSaving(true);
            await resetStudentSignup(selectedUser.id);
            setDialogOpen(false);
            setSuccess('تمت إعادة طلب التسجيل، ويمكن للطالب المحاولة من جديد.');
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function submitStaffAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            await createStaffUser({
                displayName: staffName.trim(),
                username: staffUsername.trim(),
                password: staffPassword,
                roleCode: staffRole,
            });
            setCreateStaffDialogOpen(false);
            setStaffName('');
            setStaffUsername('');
            setStaffPassword('');
            setSuccess(`تم إنشاء حساب ${roleLabel(staffRole)} بنجاح. سلّم الموظف اسم الدخول وكلمة المرور التي أدخلتها مباشرة.`);
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
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
                        جاري تحميل المستخدمين...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography
                    variant="h4"
                    sx={{
                        fontSize: {
                            xs: 25,
                            md: 30,
                        },

                        mb: 0.7,
                    }}
                >
                    المستخدمون والصلاحيات
                </Typography>

                <Typography
                    color="text.secondary"
                    sx={{
                        fontSize: 14,
                    }}
                >
                    إدارة حسابات النظام
                    والأدوار وحالات الحسابات.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={() => setCreateStaffDialogOpen(true)}>إنشاء حساب إداري</Button>
                <Button component="label" variant="contained" disabled={saving}>
                  استيراد طلاب من Excel
                  <input hidden type="file" accept=".xlsx,.csv" onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setSaving(true);
                      const result = await importStudentsFile(file);
                      setSuccess(`تم استيراد ${result.imported} طالبًا. يمكنهم إنشاء حساباتهم باستخدام بياناتهم.`);
                      await loadData();
                    } catch (requestError) {
                      setError(getErrorMessage(requestError));
                    } finally {
                      setSaving(false);
                      event.target.value = '';
                    }
                  }} />
                </Button>
                <Button variant="outlined" onClick={() => void openAttemptLog()}>محاولات إنشاء الحساب</Button>
              </Stack>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    onClose={() =>
                        setError('')
                    }
                    sx={{ mb: 2 }}
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

                                md: 'minmax(0, 1fr) 190px 190px',
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
                            placeholder="ابحث بالبريد أو اسم الطالب أو الرقم الجامعي..."
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRoundedIcon />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <FormControl fullWidth>
                            <Select
                                value={
                                    roleFilter
                                }
                                displayEmpty
                                onChange={(event) =>
                                    setRoleFilter(
                                        event.target
                                            .value,
                                    )
                                }
                            >
                                <MenuItem value="">
                                    جميع الأدوار
                                </MenuItem>

                                {roles.map(
                                    (role) => (
                                        <MenuItem
                                            key={role.id}
                                            value={role.code}
                                        >
                                            {roleLabel(
                                                role.code,
                                            )}
                                        </MenuItem>
                                    ),
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <Select
                                value={
                                    statusFilter
                                }
                                displayEmpty
                                onChange={(event) =>
                                    setStatusFilter(
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

                                <MenuItem value="PENDING_VERIFICATION">
                                    بانتظار التفعيل
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

            <Stack
                direction="row"
                sx={{
                    justifyContent:
                        'space-between',

                    alignItems: 'center',

                    mb: 2,
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                    }}
                >
                    الحسابات
                </Typography>

                <Chip
                    label={`${filteredUsers.length} مستخدم`}
                />
            </Stack>

            {filteredUsers.length ===
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
                                <ManageAccountsRoundedIcon
                                    sx={{
                                        fontSize: 48,

                                        color:
                                            'text.secondary',

                                        mb: 1,
                                    }}
                                />

                                <Typography
                                    variant="h6"
                                >
                                    لا توجد حسابات
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
                    {filteredUsers.map(
                        (user) => {
                            const name =
                                studentName(user) ?? user.displayName ?? user.username;

                            return (
                                <Card
                                    key={user.id}
                                    sx={{
                                        cursor:
                                            'pointer',

                                        transition:
                                            '150ms ease',

                                        '&:hover': {
                                            transform:
                                                'translateY(-2px)',

                                            boxShadow: 4,
                                        },
                                    }}
                                    onClick={() =>
                                        openUser(
                                            user,
                                        )
                                    }
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
                                            <Avatar
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                }}
                                            >
                                                <PersonOutlineRoundedIcon />
                                            </Avatar>

                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
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

                                                        mb: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight:
                                                                700,
                                                        }}
                                                    >
                                                        {name ??
                                                            user.student?.universityId ?? user.email}
                                                    </Typography>

                                                    <Chip
                                                        size="small"
                                                        label={statusLabel(
                                                            user.status,
                                                        )}
                                                        color={
                                                            user.status ===
                                                                'ACTIVE'
                                                                ? 'success'
                                                                : 'default'
                                                        }
                                                    />
                                                </Stack>

                                                {name && (
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.7}
                                                        sx={{
                                                            alignItems:
                                                                'center',

                                                            mb: 0.7,
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
                                                            {user.student?.universityId ?? user.username ?? user.email}
                                                        </Typography>
                                                    </Stack>
                                                )}

                                                <Stack
                                                    direction="row"
                                                    spacing={0.7}
                                                    sx={{
                                                        alignItems:
                                                            'center',
                                                    }}
                                                >
                                                    <ShieldOutlinedIcon
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
                                                        {roleLabel(
                                                            user.role
                                                                .code,
                                                        )}
                                                    </Typography>
                                                </Stack>

                                                {user.student && (
                                                    <Typography
                                                        color="text.secondary"
                                                        sx={{
                                                            fontSize:
                                                                12,

                                                            mt: 1,
                                                        }}
                                                    >
                                                        الرقم الجامعي:{' '}
                                                        {
                                                            user
                                                                .student
                                                                .universityId
                                                        }
                                                    </Typography>
                                                )}
                                                <Typography color="text.secondary" sx={{ fontSize: 11, mt: 1 }}>
                                                    آخر دخول: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ar') : 'لم يسجل دخولًا بعد'}
                                                </Typography>
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
                open={createStaffDialogOpen}
                onClose={() => !saving && setCreateStaffDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>إنشاء حساب إداري</DialogTitle>
                <DialogContent dividers>
                    <Stack component="form" id="create-staff-account" onSubmit={(event) => void submitStaffAccount(event)} spacing={2} sx={{ pt: 1 }}>
                        <Alert severity="info">الحسابات هنا للموظفين فقط، ولن يظهر للطلاب خيار إنشاء حساب إداري.</Alert>
                        <TextField label="اسم الموظف" value={staffName} onChange={(event) => setStaffName(event.target.value)} required slotProps={{ htmlInput: { maxLength: 100 } }} />
                        <TextField label="اسم الدخول" value={staffUsername} onChange={(event) => setStaffUsername(event.target.value)} required slotProps={{ htmlInput: { minLength: 3, maxLength: 40, pattern: '[A-Za-z0-9._-]+' } }} helperText="3 خانات على الأقل: أحرف لاتينية أو أرقام أو . _ -" />
                        <TextField label="كلمة مرور الحساب" type="password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} required slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} helperText="12 خانة على الأقل. سلّمها للموظف مباشرة وبطريقة آمنة." />
                        <FormControl fullWidth>
                            <InputLabel>الدور</InputLabel>
                            <Select label="الدور" value={staffRole} onChange={(event) => setStaffRole(event.target.value as Exclude<RoleCode, 'STUDENT'>)}>
                                <MenuItem value="ADVISOR">مرشد أكاديمي</MenuItem>
                                <MenuItem value="REGISTRAR">مسجل الجامعة</MenuItem>
                                <MenuItem value="SYSTEM_ADMIN">مدير النظام</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={saving} onClick={() => setCreateStaffDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit" form="create-staff-account" variant="contained" disabled={saving || staffName.trim().length < 2 || staffUsername.trim().length < 3 || staffPassword.length < 12}>
                        {saving ? <CircularProgress size={20} /> : 'إنشاء الحساب'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={dialogOpen}
                onClose={() =>
                    !saving &&
                    setDialogOpen(false)
                }
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    إدارة المستخدم
                </DialogTitle>

                <DialogContent dividers>
                    {selectedUser && (
                        <Stack spacing={3}>
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {studentName(
                                        selectedUser,
                                    ) ??
                                        selectedUser.student?.universityId ?? selectedUser.displayName ?? selectedUser.username ?? selectedUser.email}
                                </Typography>

                                <Typography
                                    color="text.secondary"
                                    sx={{
                                        fontSize: 13,
                                    }}
                                >
                                    {
                                        selectedUser.student?.universityId ?? selectedUser.username ?? selectedUser.email
                                    }
                                </Typography>

                                {selectedUser.student && (
                                    <Typography
                                        color="text.secondary"
                                        sx={{
                                            fontSize: 12,

                                            mt: 0.5,
                                        }}
                                    >
                                        الرقم الجامعي:{' '}
                                        {
                                            selectedUser
                                                .student
                                                .universityId
                                        }
                                    </Typography>
                                )}
                                <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
                                    تاريخ إنشاء الحساب: {new Date(selectedUser.createdAt).toLocaleString('ar')}
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                                    آخر دخول: {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('ar') : 'لم يسجل دخولًا بعد'}
                                </Typography>
                            </Box>

                            <FormControl fullWidth>
                                <InputLabel>
                                    الدور
                                </InputLabel>

                                <Select
                                    label="الدور"
                                    value={
                                        selectedRole
                                    }
                                    onChange={(event) =>
                                        setSelectedRole(
                                            event.target
                                                .value as RoleCode,
                                        )
                                    }
                                >
                                    {roles.map(
                                        (role) => (
                                            <MenuItem
                                                key={role.id}
                                                value={
                                                    role.code
                                                }
                                            >
                                                {roleLabel(
                                                    role.code,
                                                )}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>
                                    حالة الحساب
                                </InputLabel>

                                <Select
                                    label="حالة الحساب"
                                    value={
                                        selectedStatus
                                    }
                                    onChange={(event) =>
                                        setSelectedStatus(
                                            event.target
                                                .value as UserStatus,
                                        )
                                    }
                                >
                                    <MenuItem value="ACTIVE">
                                        نشط
                                    </MenuItem>

                                    <MenuItem value="PENDING_VERIFICATION">
                                        بانتظار التفعيل
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

                            {selectedRole ===
                                'STUDENT' &&
                                !selectedUser.student && (
                                    <Alert severity="warning">
                                        لا يوجد ملف طالب
                                        مرتبط بهذا الحساب؛
                                        لذلك لن يسمح
                                        الـBackend بتحويله إلى
                                        دور طالب.
                                    </Alert>
                                )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions>
                    {selectedUser?.status === 'PENDING_VERIFICATION' && <Button color="error" disabled={saving} onClick={() => void resetPendingSignup()}>إعادة طلب التسجيل</Button>}
                    <Button
                        disabled={saving}
                        onClick={() =>
                            setDialogOpen(false)
                        }
                    >
                        إلغاء
                    </Button>

                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={() =>
                            void saveChanges()
                        }
                    >
                        {saving
                            ? 'جاري الحفظ...'
                            : 'حفظ التغييرات'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={attemptDialogOpen} onClose={() => setAttemptDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>محاولات إنشاء حسابات الطلاب</DialogTitle>
                <DialogContent dividers>
                    {signupAttempts && <>
                        <Alert severity="info" sx={{ mb: 2 }}>عدد المحاولات غير المطابقة خلال آخر 24 ساعة: {signupAttempts.failedCount}. لا تُعرض بيانات الطالب أو عنوان IP في هذه القائمة.</Alert>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>النتيجة</TableCell></TableRow></TableHead>
                            <TableBody>{signupAttempts.attempts.map((attempt) => <TableRow key={attempt.id}><TableCell>{new Date(attempt.createdAt).toLocaleString('ar')}</TableCell><TableCell>{attempt.succeeded ? 'مطابقة' : 'غير مطابقة'}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </>}
                </DialogContent>
                <DialogActions><Button onClick={() => setAttemptDialogOpen(false)}>إغلاق</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
