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
} from 'react';

import axios from 'axios';

import {
    getRoles,
    getUsers,
    updateUserRole,
    updateUserStatus,
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
                        studentName(user);

                    return [
                        user.email,
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
            <Box sx={{ mb: 3 }}>
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
                                studentName(user);

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
                                                            user.email}
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
                                                            {user.email}
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
                                        selectedUser.email}
                                </Typography>

                                <Typography
                                    color="text.secondary"
                                    sx={{
                                        fontSize: 13,
                                    }}
                                >
                                    {
                                        selectedUser.email
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
        </Box>
    );
}