import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';
import { getMyAdvisorPrograms } from '../../api/advisors';

import {
    createAcademicLevel,
    createCollege,
    deleteCollege,
    createDepartment,
    createProgram,
    createSemester,
    createStudyPlan,
    getAcademicLevels,
    getColleges,
    getDepartments,
    getPrograms,
    getSemesters,
    getStudyPlans,
    updateAcademicLevel,
    updateCollege,
    updateDepartment,
    updateProgram,
    updateSemester,
    updateStudyPlan,
    type AcademicLevel,
    type College,
    type Department,
    type Program,
    type Semester,
    type StudyPlan,
} from '../../api/academicStructure';

type EntityType =
    | 'college'
    | 'department'
    | 'program'
    | 'studyPlan'
    | 'level'
    | 'semester';

interface DialogForm {
    nameAr: string;

    nameEn: string;

    number: string;

    requireMandatoryCourses: boolean;
}

const emptyForm: DialogForm = {
    nameAr: '',

    nameEn: '',

    number: '1',

    requireMandatoryCourses: false,
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

    if (error instanceof Error) {
        return error.message;
    }

    return 'حدث خطأ غير متوقع.';
}

export default function AcademicStructurePage() {
    const { user } = useAuth();
    const isAdvisor = user?.role === 'ADVISOR';
    const canDeleteCollege = user?.role === 'REGISTRAR' || user?.role === 'SYSTEM_ADMIN';
    const [colleges, setColleges] =
        useState<College[]>([]);

    const [
        departments,
        setDepartments,
    ] = useState<Department[]>([]);

    const [programs, setPrograms] =
        useState<Program[]>([]);

    const [
        studyPlans,
        setStudyPlans,
    ] = useState<StudyPlan[]>([]);

    const [
        academicLevels,
        setAcademicLevels,
    ] = useState<AcademicLevel[]>([]);

    const [semesters, setSemesters] =
        useState<Semester[]>([]);

    const [
        selectedCollegeId,
        setSelectedCollegeId,
    ] = useState('');

    const [
        selectedDepartmentId,
        setSelectedDepartmentId,
    ] = useState('');

    const [
        selectedProgramId,
        setSelectedProgramId,
    ] = useState('');

    const [
        selectedStudyPlanId,
        setSelectedStudyPlanId,
    ] = useState('');

    const [
        selectedLevelId,
        setSelectedLevelId,
    ] = useState('');

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleteTarget, setDeleteTarget] = useState<College | null>(null);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const [
        dialogOpen,
        setDialogOpen,
    ] = useState(false);

    const [
        dialogType,
        setDialogType,
    ] =
        useState<EntityType>('college');

    const [
        editingId,
        setEditingId,
    ] = useState<string | null>(
        null,
    );

    const [form, setForm] =
        useState<DialogForm>(
            emptyForm,
        );

    const loadData =
        useCallback(async () => {
            try {
                setLoading(true);

                setError('');

                const [
                    collegesData,
                    departmentsData,
                    programsData,
                    plansData,
                    levelsData,
                    semestersData,
                    advisorAssignments,
                ] = await Promise.all([
                    getColleges(),

                    getDepartments(),

                    getPrograms(),

                    getStudyPlans(),

                    getAcademicLevels(),

                    getSemesters(),
                    isAdvisor ? getMyAdvisorPrograms() : Promise.resolve(null),
                ]);

                const assignedIds = advisorAssignments
                    ? new Set(advisorAssignments.map((item) => item.id))
                    : null;
                const visiblePrograms = assignedIds
                    ? programsData.filter((item) => assignedIds.has(item.id))
                    : programsData;
                const visibleDepartmentIds = new Set(visiblePrograms.map((item) => item.departmentId));
                const visibleCollegeIds = new Set(visiblePrograms.map((item) => item.collegeId ?? departmentsData.find((department) => department.id === item.departmentId)?.collegeId).filter((id): id is string => Boolean(id)));
                const visibleDepartments = assignedIds
                    ? departmentsData.filter((item) => visibleDepartmentIds.has(item.id))
                    : departmentsData;
                const visibleColleges = assignedIds
                    ? collegesData.filter((item) => visibleCollegeIds.has(item.id))
                    : collegesData;

                setColleges(visibleColleges);
                setDepartments(visibleDepartments);
                setPrograms(visiblePrograms);

                setStudyPlans(plansData);

                setAcademicLevels(
                    levelsData,
                );

                setSemesters(
                    semestersData,
                );

                if (
                    !selectedCollegeId &&
                    visibleColleges.length > 0
                ) {
                    setSelectedCollegeId(
                        visibleColleges[0].id,
                    );
                }
            } catch (requestError) {
                setError(
                    getErrorMessage(
                        requestError,
                    ),
                );
            } finally {
                setLoading(false);
            }
        }, [isAdvisor, selectedCollegeId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const selectedCollege =
        useMemo(
            () =>
                colleges.find(
                    (item) =>
                        item.id ===
                        selectedCollegeId,
                ),
            [
                colleges,
                selectedCollegeId,
            ],
        );

    const visibleDepartments =
        useMemo(
            () =>
                departments.filter(
                    (item) =>
                        item.collegeId ===
                        selectedCollegeId,
                ),
            [
                departments,
                selectedCollegeId,
            ],
        );

                const visiblePrograms =
            useMemo(
            () =>
                programs.filter((item) => selectedDepartmentId
                    ? item.departmentId === selectedDepartmentId
                    : !item.departmentId && item.collegeId === selectedCollegeId),
            [
                programs,
                selectedDepartmentId,
                selectedCollegeId,
            ],
        );

    const visibleStudyPlans =
        useMemo(
            () =>
                studyPlans.filter(
                    (item) =>
                        item.programId ===
                        selectedProgramId,
                ),
            [
                studyPlans,
                selectedProgramId,
            ],
        );

    const visibleLevels =
        useMemo(
            () =>
                academicLevels
                    .filter(
                        (item) =>
                            item.studyPlanId ===
                            selectedStudyPlanId,
                    )
                    .sort(
                        (a, b) =>
                            a.levelNumber -
                            b.levelNumber,
                    ),
            [
                academicLevels,
                selectedStudyPlanId,
            ],
        );

    const visibleSemesters =
        useMemo(
            () =>
                semesters
                    .filter(
                        (item) =>
                            item.academicYearId ===
                            selectedLevelId,
                    )
                    .sort(
                        (a, b) =>
                            a.semesterNumber -
                            b.semesterNumber,
                    ),
            [
                semesters,
                selectedLevelId,
            ],
        );

    function selectCollege(
        id: string,
    ) {
        setSelectedCollegeId(id);

        setSelectedDepartmentId('');

        setSelectedProgramId('');

        setSelectedStudyPlanId('');

        setSelectedLevelId('');
    }

    function selectDepartment(
        id: string,
    ) {
        setSelectedDepartmentId(id);

        setSelectedProgramId('');

        setSelectedStudyPlanId('');

        setSelectedLevelId('');
    }

    function selectProgram(
        id: string,
    ) {
        setSelectedProgramId(id);

        setSelectedStudyPlanId('');

        setSelectedLevelId('');
    }

    function selectStudyPlan(
        id: string,
    ) {
        setSelectedStudyPlanId(id);

        setSelectedLevelId('');
    }

    function openCreate(
        type: EntityType,
    ) {
        setDialogType(type);

        setEditingId(null);

        setForm(emptyForm);

        setError('');

        setDialogOpen(true);
    }

    function openEdit(
        type: EntityType,

        item:
            | College
            | Department
            | Program
            | StudyPlan
            | AcademicLevel
            | Semester,
    ) {
        setDialogType(type);

        setEditingId(item.id);

        setForm({
            nameAr:
                item.nameAr,

            nameEn:
                item.nameEn ?? '',

            number:
                'levelNumber' in item
                    ? String(
                        item.levelNumber,
                    )
                    : 'semesterNumber' in
                        item
                        ? String(
                            item.semesterNumber,
                        )
                        : '1',

            requireMandatoryCourses:
                'requireMandatoryCourses' in
                    item
                    ? item.requireMandatoryCourses
                    : false,
        });

        setError('');

        setDialogOpen(true);
    }

    function dialogTitle() {
        const action =
            editingId
                ? 'تعديل'
                : 'إضافة';

        switch (dialogType) {
            case 'college':
                return `${action} كلية`;

            case 'department':
                return `${action} قسم`;

            case 'program':
                return `${action} برنامج`;

            case 'studyPlan':
                return `${action} خطة دراسية`;

            case 'level':
                return `${action} مستوى`;

            case 'semester':
                return `${action} فصل`;
        }
    }

    async function saveEntity() {
        if (!form.nameAr.trim()) {
            setError(
                'الاسم العربي مطلوب.',
            );

            return;
        }

        const number =
            Number(form.number);

        if (
            (dialogType ===
                'level' ||
                dialogType ===
                'semester') &&
            (!Number.isInteger(number) ||
                number < 1)
        ) {
            setError(
                'الرقم يجب أن يكون عددًا صحيحًا أكبر من صفر.',
            );

            return;
        }

        try {
            setSaving(true);

            setError('');

            setSuccess('');

            if (
                dialogType ===
                'college'
            ) {
                if (editingId) {
                    await updateCollege(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),
                        },
                    );
                } else {
                    const universityId =
                        selectedCollege?.universityId ??
                        colleges[0]
                            ?.universityId;

                    if (!universityId) {
                        setError(
                            'لا يمكن تحديد الجامعة الحالية لإنشاء أول كلية.',
                        );

                        return;
                    }

                    await createCollege({
                        universityId,

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,
                    });
                }
            }

            if (
                dialogType ===
                'department'
            ) {
                if (editingId) {
                    await updateDepartment(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),
                        },
                    );
                } else {
                    if (!selectedCollegeId) {
                        setError(
                            'اختر الكلية أولًا.',
                        );

                        return;
                    }

                    await createDepartment({
                        collegeId:
                            selectedCollegeId,

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,
                    });
                }
            }

            if (
                dialogType ===
                'program'
            ) {
                if (editingId) {
                    await updateProgram(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),
                        },
                    );
                } else {
                    if (
                !selectedCollegeId
                    ) {
                        setError(
                            'اختر الكلية أو القسم أولًا.',
                        );

                        return;
                    }

                    await createProgram({
                        ...(selectedDepartmentId
                            ? { departmentId: selectedDepartmentId }
                            : { collegeId: selectedCollegeId }),

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,
                    });
                }
            }

            if (
                dialogType ===
                'studyPlan'
            ) {
                if (editingId) {
                    await updateStudyPlan(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),
                        },
                    );
                } else {
                    if (!selectedProgramId) {
                        setError(
                            'اختر البرنامج أولًا.',
                        );

                        return;
                    }

                    await createStudyPlan({
                        programId:
                            selectedProgramId,

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,
                    });
                }
            }

            if (
                dialogType === 'level'
            ) {
                if (editingId) {
                    await updateAcademicLevel(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),

                            levelNumber:
                                number,
                        },
                    );
                } else {
                    if (
                        !selectedStudyPlanId
                    ) {
                        setError(
                            'اختر الخطة الدراسية أولًا.',
                        );

                        return;
                    }

                    await createAcademicLevel({
                        studyPlanId:
                            selectedStudyPlanId,

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,

                        levelNumber:
                            number,
                    });
                }
            }

            if (
                dialogType ===
                'semester'
            ) {
                if (editingId) {
                    await updateSemester(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),

                            semesterNumber:
                                number,

                            requireMandatoryCourses:
                                form.requireMandatoryCourses,
                        },
                    );
                } else {
                    if (!selectedLevelId) {
                        setError(
                            'اختر المستوى أولًا.',
                        );

                        return;
                    }

                    await createSemester({
                        academicYearId:
                            selectedLevelId,

                        nameAr:
                            form.nameAr.trim(),

                        nameEn:
                            form.nameEn.trim() ||
                            undefined,

                        semesterNumber:
                            number,

                        requireMandatoryCourses:
                            form.requireMandatoryCourses,
                    });
                }
            }

            setDialogOpen(false);

            setSuccess(
                editingId
                    ? 'تم حفظ التعديلات بنجاح.'
                    : 'تمت الإضافة بنجاح.',
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

    async function handleDeleteCollege() {
        if (!deleteTarget) return;
        try {
            setSaving(true);
            setError('');
            await deleteCollege(deleteTarget.id);
            if (selectedCollegeId === deleteTarget.id) {
                const nextCollege = colleges.find((item) => item.id !== deleteTarget.id);
                setSelectedCollegeId(nextCollege?.id ?? '');
                setSelectedDepartmentId('');
                setSelectedProgramId('');
                setSelectedStudyPlanId('');
                setSelectedLevelId('');
            }
            setDeleteTarget(null);
            setSuccess('تم حذف الكلية وبنيتها الأكاديمية المرتبطة بها.');
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
                    minHeight: 450,

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
                        جاري تحميل الهيكل
                        الأكاديمي...
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
                    الهيكل الأكاديمي
                </Typography>

                <Typography
                    color="text.secondary"
                >
                    الكليات والأقسام
                    والبرامج والخطط
                    والمستويات والفصول.
                </Typography>
                {isAdvisor && <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                    يمكنك إدارة الخطط والمستويات والفصول ضمن البرامج التي عيّنها المدير لحسابك. إنشاء الكليات والأقسام والبرامج متاح للمدير فقط.
                </Typography>}
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

            <StructureSection
                title="الكليات"
                icon={
                    <AccountBalanceRoundedIcon />
                }
                addLabel="إضافة كلية"
                showAdd={!isAdvisor}
                onAdd={() =>
                    openCreate('college')
                }
            >
                {colleges.map(
                    (college) => (
                        <StructureCard
                            key={college.id}
                            title={
                                college.nameAr
                            }
                            subtitle={
                                college.nameEn
                            }
                            selected={
                                college.id ===
                                selectedCollegeId
                            }
                            onClick={() =>
                                selectCollege(
                                    college.id,
                                )
                            }
                            onEdit={!isAdvisor ? () =>
                                openEdit(
                                    'college',
                                    college,
                                ) : undefined}
                            onDelete={canDeleteCollege ? () => setDeleteTarget(college) : undefined}
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="الأقسام"
                icon={
                    <ApartmentRoundedIcon />
                }
                addLabel="إضافة قسم"
                showAdd={!isAdvisor}
                disabled={
                    !selectedCollegeId
                }
                onAdd={() =>
                    openCreate(
                        'department',
                    )
                }
            >
                {visibleDepartments.map(
                    (department) => (
                        <StructureCard
                            key={
                                department.id
                            }
                            title={
                                department.nameAr
                            }
                            subtitle={
                                department.nameEn
                            }
                            selected={
                                department.id ===
                                selectedDepartmentId
                            }
                            onClick={() =>
                                selectDepartment(
                                    department.id,
                                )
                            }
                            onEdit={!isAdvisor ? () =>
                                openEdit(
                                    'department',
                                    department,
                                ) : undefined}
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="البرامج"
                icon={
                    <SchoolRoundedIcon />
                }
                addLabel="إضافة برنامج"
                showAdd={!isAdvisor}
                disabled={
                    !selectedCollegeId
                }
                onAdd={() =>
                    openCreate('program')
                }
            >
                {visiblePrograms.map(
                    (program) => (
                        <StructureCard
                            key={program.id}
                            title={
                                program.nameAr
                            }
                            subtitle={
                                program.nameEn
                            }
                            selected={
                                program.id ===
                                selectedProgramId
                            }
                            onClick={() =>
                                selectProgram(
                                    program.id,
                                )
                            }
                            onEdit={!isAdvisor ? () =>
                                openEdit(
                                    'program',
                                    program,
                                ) : undefined}
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="الخطط الدراسية"
                icon={
                    <MenuBookRoundedIcon />
                }
                addLabel="إضافة خطة"
                disabled={
                    !selectedProgramId
                }
                onAdd={() =>
                    openCreate(
                        'studyPlan',
                    )
                }
            >
                {visibleStudyPlans.map(
                    (plan) => (
                        <StructureCard
                            key={plan.id}
                            title={plan.nameAr}
                            subtitle={
                                plan.nameEn
                            }
                            selected={
                                plan.id ===
                                selectedStudyPlanId
                            }
                            onClick={() =>
                                selectStudyPlan(
                                    plan.id,
                                )
                            }
                            onEdit={() =>
                                openEdit(
                                    'studyPlan',
                                    plan,
                                )
                            }
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="المستويات"
                addLabel="إضافة مستوى"
                disabled={
                    !selectedStudyPlanId
                }
                onAdd={() =>
                    openCreate('level')
                }
            >
                {visibleLevels.map(
                    (level) => (
                        <StructureCard
                            key={level.id}
                            title={
                                level.nameAr
                            }
                            subtitle={`المستوى ${level.levelNumber}`}
                            selected={
                                level.id ===
                                selectedLevelId
                            }
                            onClick={() =>
                                setSelectedLevelId(
                                    level.id,
                                )
                            }
                            onEdit={() =>
                                openEdit(
                                    'level',
                                    level,
                                )
                            }
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="الفصول"
                addLabel="إضافة فصل"
                disabled={
                    !selectedLevelId
                }
                onAdd={() =>
                    openCreate(
                        'semester',
                    )
                }
            >
                {visibleSemesters.map(
                    (semester) => (
                        <StructureCard
                            key={
                                semester.id
                            }
                            title={
                                semester.nameAr
                            }
                            subtitle={`الفصل ${semester.semesterNumber}${semester.requireMandatoryCourses
                                    ? ' • المقررات الإجبارية مطلوبة'
                                    : ''
                                }`}
                            onEdit={() =>
                                openEdit(
                                    'semester',
                                    semester,
                                )
                            }
                        />
                    ),
                )}
            </StructureSection>

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
                    {dialogTitle()}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField
                            label="الاسم بالعربية"
                            value={form.nameAr}
                            onChange={(event) =>
                                setForm(
                                    (current) => ({
                                        ...current,

                                        nameAr:
                                            event.target
                                                .value,
                                    }),
                                )
                            }
                            required
                            fullWidth
                        />

                        <TextField
                            label="الاسم بالإنجليزية"
                            value={form.nameEn}
                            onChange={(event) =>
                                setForm(
                                    (current) => ({
                                        ...current,

                                        nameEn:
                                            event.target
                                                .value,
                                    }),
                                )
                            }
                            fullWidth
                        />

                        {(dialogType ===
                            'level' ||
                            dialogType ===
                            'semester') && (
                                <TextField
                                    label={
                                        dialogType ===
                                            'level'
                                            ? 'رقم المستوى'
                                            : 'رقم الفصل'
                                    }
                                    type="number"
                                    value={
                                        form.number
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                number:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                    fullWidth
                                />
                            )}

                        {dialogType ===
                            'semester' && (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={
                                                form.requireMandatoryCourses
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        requireMandatoryCourses:
                                                            event
                                                                .target
                                                                .checked,
                                                    }),
                                                )
                                            }
                                        />
                                    }
                                    label="إلزام الطالب بالمقررات الإجبارية لهذا الفصل"
                                />
                            )}
                    </Stack>
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
                            void saveEntity()
                        }
                    >
                        {saving
                            ? 'جاري الحفظ...'
                            : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} fullWidth maxWidth="sm">
                <DialogTitle>تأكيد حذف الكلية</DialogTitle>
                <DialogContent dividers>
                    <Typography>هل تريد حذف «{deleteTarget?.nameAr}» وبنيتها الأكاديمية المرتبطة بها؟</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        سيُحذف ما يتبعها من أقسام وبرامج وخطط ومستويات وفصول. يمنع النظام الحذف إذا كانت مرتبطة بطلاب أو تسجيلات أو نتائج.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</Button>
                    <Button color="error" variant="contained" onClick={() => void handleDeleteCollege()} disabled={saving}>
                        {saving ? 'جارٍ الحذف...' : 'حذف الكلية'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

interface StructureSectionProps {
    title: string;

    icon?: React.ReactNode;

    addLabel: string;

    disabled?: boolean;

    showAdd?: boolean;

    onAdd: () => void;

    children: React.ReactNode;
}

function StructureSection({
    title,
    icon,
    addLabel,
    disabled,
    showAdd = true,
    onAdd,
    children,
}: StructureSectionProps) {
    return (
        <Card sx={{ mb: 2 }}>
            <CardContent
                sx={{
                    p: '20px !important',
                }}
            >
                <Stack
                    direction="row"
                    sx={{
                        justifyContent:
                            'space-between',

                        alignItems: 'center',

                        mb: 2,
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        {icon}

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                            }}
                        >
                            {title}
                        </Typography>
                    </Stack>

                    {showAdd && <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                            <AddRoundedIcon />
                        }
                        disabled={disabled}
                        onClick={onAdd}
                    >
                        {addLabel}
                    </Button>}
                </Stack>

                <Box
                    sx={{
                        display: 'grid',

                        gridTemplateColumns: {
                            xs: '1fr',

                            sm: 'repeat(2, minmax(0, 1fr))',

                            lg: 'repeat(3, minmax(0, 1fr))',
                        },

                        gap: 1.5,
                    }}
                >
                    {children}
                </Box>
            </CardContent>
        </Card>
    );
}

interface StructureCardProps {
    title: string;

    subtitle?: string | null;

    selected?: boolean;

    onClick?: () => void;

    onEdit?: () => void;
    onDelete?: () => void;
}

function StructureCard({
    title,
    subtitle,
    selected,
    onClick,
    onEdit,
    onDelete,
}: StructureCardProps) {
    return (
        <Box
            onClick={onClick}
            sx={{
                p: 1.7,

                border: '1px solid',

                borderColor: selected
                    ? 'primary.main'
                    : 'divider',

                borderRadius: 2,

                cursor: onClick
                    ? 'pointer'
                    : 'default',

                bgcolor: selected
                    ? 'action.selected'
                    : 'transparent',

                transition:
                    '150ms ease',
            }}
        >
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    justifyContent:
                        'space-between',

                    alignItems:
                        'flex-start',
                }}
            >
                <Box
                    sx={{
                        minWidth: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                        }}
                    >
                        {title}
                    </Typography>

                    {subtitle && (
                        <Typography
                            color="text.secondary"
                            sx={{
                                fontSize: 12,
                                mt: 0.4,
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={0.5}>
                    {onEdit && <Button size="small" startIcon={<EditOutlinedIcon />} onClick={(event) => { event.stopPropagation(); onEdit(); }}>
                        تعديل
                    </Button>}
                    {onDelete && <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={(event) => { event.stopPropagation(); onDelete(); }}>
                        حذف
                    </Button>}
                </Stack>
            </Stack>
        </Box>
    );
}
