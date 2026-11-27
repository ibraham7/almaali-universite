import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
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
    createDepartment,
    createProgram,
    createSemester,
    createStudyPlan,
    approveStudyPlan,
    createStudyPlanVersion,
    STUDY_PLAN_STATUS_LABEL,
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
    PROGRAM_LEVEL_OPTIONS,
    type ProgramLevel,
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
    code: string;

    level: ProgramLevel;

    nameAr: string;

    nameEn: string;

    number: string;

    requireMandatoryCourses: boolean;

    isActive: boolean;

    cohortYear: string;

    effectiveFrom: string;
}

const emptyForm: DialogForm = {
    code: '',

    level: 'BACHELOR',

    nameAr: '',

    nameEn: '',

    number: '1',

    requireMandatoryCourses: false,

    isActive: true,

    cohortYear: '',

    effectiveFrom: '',
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

    // اعتماد مسودة الخطة، أو إنشاء إصدار جديد (مسودة) من المعتمدة. الإصدار الحالي لا يتأثر وطلابه يبقون عليه.
    async function planAction(kind: 'approve' | 'version', id: string, name: string) {
        const ask = kind === 'approve'
            ? `اعتماد الخطة «${name}»؟\nتصبح مقفلة (لا تُعدَّل)، ويحل هذا الإصدار محل الإصدار المعتمد السابق للطلاب الجدد. الطلاب الحاليون يبقون على إصدارهم.`
            : `إنشاء إصدار جديد من «${name}»؟\nتُنسخ الخطة كاملة كمسودة تعدّلها بحرية، والإصدار الحالي وطلابه لا يتأثرون.`;
        if (!window.confirm(ask)) return;
        try {
            setError('');
            if (kind === 'approve') await approveStudyPlan(id);
            else await createStudyPlanVersion(id);
            setSuccess(kind === 'approve' ? `تم اعتماد الخطة «${name}».` : `تم إنشاء إصدار جديد من «${name}» كمسودة.`);
            await loadData();
        } catch (cause) {
            setError(getErrorMessage(cause));
        }
    }

    // تعطيل/تفعيل كلية أو قسم أو برنامج (لا حذف). المعطّل لا يُختار لطلاب جدد ولا لخطط جديدة، وبياناته تبقى.
    async function toggleActive(kind: 'college' | 'department' | 'program', id: string, name: string, enable: boolean) {
        const label = kind === 'college' ? 'الكلية' : kind === 'department' ? 'القسم' : 'البرنامج';
        if (!enable && !window.confirm(`تعطيل ${label} «${name}»؟\nيبقى طلابها وخططها كما هم، لكن لا تُختار لطلاب جدد أو خطط جديدة${kind !== 'program' ? '، ويشمل ذلك ما تحتها' : ''}. يمكنك تفعيلها لاحقًا.`)) return;
        try {
            setError('');
            if (kind === 'college') await updateCollege(id, { isActive: enable });
            else if (kind === 'department') await updateDepartment(id, { isActive: enable });
            else await updateProgram(id, { isActive: enable });
            setSuccess(`${enable ? 'تم تفعيل' : 'تم تعطيل'} ${label} «${name}».`);
            await loadData();
        } catch (cause) {
            setError(axios.isAxiosError(cause) && typeof cause.response?.data?.message === 'string' ? cause.response.data.message : 'تعذر تنفيذ العملية.');
        }
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
            code:
                'code' in item && typeof item.code === 'string'
                    ? item.code
                    : '',

            level:
                'level' in item && typeof item.level === 'string'
                    ? (item.level as ProgramLevel)
                    : 'BACHELOR',

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

            // الفصل الدراسي يحمل isActive إلزاميًا، أما الكلية/القسم/البرنامج فاختياري وغيابه يعني فعّال.
            isActive:
                'isActive' in item
                    ? item.isActive !== false
                    : true,

            cohortYear:
                'cohortYear' in item && item.cohortYear
                    ? String(item.cohortYear)
                    : '',

            effectiveFrom:
                'effectiveFrom' in item && item.effectiveFrom
                    ? item.effectiveFrom.slice(0, 10)
                    : '',
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
        if (dialogType !== 'program' && !form.nameAr.trim()) {
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
                if (!/^\d{2}$/.test(form.code.trim())) {
                    setError('رمز الكلية: أدخل رقمين بالضبط (مثل 01). يدخل في الرقم الجامعي.');

                    return;
                }

                if (editingId) {
                    await updateCollege(
                        editingId,
                        {
                            nameAr:
                                form.nameAr.trim(),

                            nameEn:
                                form.nameEn.trim(),

                            code:
                                form.code.trim(),
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

                        code:
                            form.code.trim(),
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
                    await updateProgram(editingId, { level: form.level });
                } else {
                    if (!selectedDepartmentId) {
                        setError('اختر القسم/الاختصاص أولًا.');

                        return;
                    }

                    await createProgram({
                        departmentId: selectedDepartmentId,
                        level: form.level,
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

                            cohortYear: form.cohortYear.trim() ? Number(form.cohortYear) : null,

                            effectiveFrom: form.effectiveFrom || null,
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

                        cohortYear: form.cohortYear.trim() ? Number(form.cohortYear) : null,

                        effectiveFrom: form.effectiveFrom || null,
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

                            isActive:
                                form.isActive,
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

                        isActive:
                            form.isActive,
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
                                [college.nameEn, college.code ? `رمز الكلية: ${college.code}` : 'بلا رمز'].filter(Boolean).join(' • ')
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
                            inactive={college.isActive === false}
                            onToggleActive={!isAdvisor ? () => void toggleActive('college', college.id, college.nameAr, college.isActive === false) : undefined}
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
                disabledHint="اختر كلية أولاً: اضغط على بطاقة الكلية من قسم «الكليات»."
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
                            inactive={department.isActive === false}
                            onToggleActive={!isAdvisor ? () => void toggleActive('department', department.id, department.nameAr, department.isActive === false) : undefined}
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
                disabledHint="اختر القسم / التخصص أولاً: اضغط على بطاقة القسم من قسم «الأقسام» فوق (وإن لم يكن موجوداً أضفه بزر «إضافة قسم»). البرنامج (بكالوريوس، دبلوم...) يُضاف تحت قسم."
                showAdd={!isAdvisor}
                disabled={
                    !selectedDepartmentId
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
                            inactive={program.isActive === false}
                            onToggleActive={!isAdvisor ? () => void toggleActive('program', program.id, program.nameAr, program.isActive === false) : undefined}
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
                disabledHint="اختر البرنامج أولاً: اضغط على بطاقة البرنامج من قسم «البرامج»."
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
                                [
                                    plan.versionNumber ? `إصدار ${plan.versionNumber}` : null,
                                    plan.status ? STUDY_PLAN_STATUS_LABEL[plan.status] : null,
                                    plan.cohortYear ? `دفعة ${plan.cohortYear}` : 'كل الدفعات',
                                    plan.effectiveFrom ? `تبدأ ${plan.effectiveFrom.slice(0, 10)}` : null,
                                    plan.studentsCount ? `${plan.studentsCount} طالب` : null,
                                ].filter(Boolean).join(' • ')
                            }
                            inactive={plan.status === 'SUPERSEDED'}
                            inactiveLabel="إصدار قديم"
                            selected={
                                plan.id ===
                                selectedStudyPlanId
                            }
                            onClick={() =>
                                selectStudyPlan(
                                    plan.id,
                                )
                            }
                            onEdit={plan.status === undefined || plan.status === 'DRAFT' ? () =>
                                openEdit(
                                    'studyPlan',
                                    plan,
                                ) : undefined}
                            extraActions={!isAdvisor ? (<>
                                {plan.status === 'DRAFT' && <Button size="small" color="success" onClick={(event) => { event.stopPropagation(); void planAction('approve', plan.id, plan.nameAr); }}>اعتماد</Button>}
                                {plan.status === 'APPROVED' && <Button size="small" color="warning" onClick={(event) => { event.stopPropagation(); void planAction('version', plan.id, plan.nameAr); }}>إصدار جديد</Button>}
                            </>) : undefined}
                        />
                    ),
                )}
            </StructureSection>

            <StructureSection
                title="المستويات"
                addLabel="إضافة مستوى"
                disabledHint="اختر الخطة الدراسية أولاً: اضغط على بطاقة الخطة من قسم «الخطط الدراسية»."
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
                disabledHint="اختر المستوى أولاً: اضغط على بطاقة المستوى من قسم «المستويات»."
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
                                }${semester.isActive
                                    ? ''
                                    : ' • غير نشط'
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
                        {dialogType === 'program' && (
                            <TextField
                                select
                                label="نوع البرنامج"
                                value={form.level}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        level: event.target.value as ProgramLevel,
                                    }))
                                }
                                required
                                fullWidth
                            >
                                {PROGRAM_LEVEL_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {dialogType !== 'program' && (<>
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
                        </>)}

                        {dialogType === 'college' && (
                            <TextField
                                label="رمز الكلية (رقمان)"
                                value={form.code}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        code: event.target.value.replace(/\D/g, '').slice(0, 2),
                                    }))
                                }
                                required
                                fullWidth
                                helperText="يدخل في الرقم الجامعي: السنة + رمز الكلية + التسلسل (مثل 27 و01 و001 ← 2701001)."
                                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 2 } }}
                            />
                        )}

                        {dialogType === 'studyPlan' && (<>
                            <TextField
                                label="الدفعة المستهدفة (سنة القبول، اختياري)"
                                value={form.cohortYear}
                                onChange={(event) => setForm((current) => ({ ...current, cohortYear: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                fullWidth
                                helperText="مثال 2026. تُربط الخطة بطلاب هذه الدفعة. اتركها فارغة لخطة عامة لكل الدفعات."
                                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
                            />
                            <TextField
                                type="date"
                                label="تاريخ بدء التطبيق (اختياري)"
                                value={form.effectiveFrom}
                                onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                                helperText="الخطة الجديدة تُحفظ كمسودة، وتُعتمد بعد مراجعتها."
                            />
                        </>)}

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

                        {dialogType ===
                            'semester' && (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={
                                                form.isActive
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        isActive:
                                                            event
                                                                .target
                                                                .checked,
                                                    }),
                                                )
                                            }
                                        />
                                    }
                                    label="الفصل نشط (متاح للتسجيل)"
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
        </Box>
    );
}

interface StructureSectionProps {
    title: string;

    icon?: React.ReactNode;

    addLabel: string;

    disabled?: boolean;

    // يظهر تحت العنوان عندما يكون زر الإضافة معطّلاً ليشرح السبب
    disabledHint?: string;

    showAdd?: boolean;

    onAdd: () => void;

    children: React.ReactNode;
}

function StructureSection({
    title,
    icon,
    addLabel,
    disabled,
    disabledHint,
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

                {showAdd && disabled && disabledHint && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {disabledHint}
                    </Alert>
                )}

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

    // معطّلة؟ (تظهر شارة، ويظهر زر التفعيل بدل التعطيل)
    inactive?: boolean;

    onToggleActive?: () => void;

    extraActions?: React.ReactNode;

    // نص الشارة عند "inactive" (الافتراضي «معطّلة»؛ الإصدار القديم من الخطة «إصدار قديم»).
    inactiveLabel?: string;
}

function StructureCard({
    title,
    subtitle,
    selected,
    onClick,
    onEdit,
    inactive,
    onToggleActive,
    extraActions,
    inactiveLabel,
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
                            opacity: inactive ? 0.55 : 1,
                        }}
                    >
                        {title}
                        {inactive && <Chip size="small" label={inactiveLabel ?? "معطّلة"} sx={{ ms: 1 }} />}
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
                    {extraActions}
                    {onEdit && <Button size="small" startIcon={<EditOutlinedIcon />} onClick={(event) => { event.stopPropagation(); onEdit(); }}>
                        تعديل
                    </Button>}
                    {onToggleActive && <Button size="small" color={inactive ? 'success' : 'warning'} onClick={(event) => { event.stopPropagation(); onToggleActive(); }}>
                        {inactive ? 'تفعيل' : 'تعطيل'}
                    </Button>}
                </Stack>
            </Stack>
        </Box>
    );
}
