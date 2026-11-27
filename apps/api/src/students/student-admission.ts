// سنة قبول الطالب: من تاريخ القبول إن وُجد، وإلا من الرقم الجامعي (سنة من رقمين + رمز كلية + تسلسل، مثل 2701001 ← 2027).
export function admissionYearOf(student: { admissionDate?: Date | string | null; universityId: string }): number | null {
  if (student.admissionDate) {
    const year = new Date(student.admissionDate).getUTCFullYear();
    if (Number.isFinite(year) && year >= 2000) return year;
  }
  const match = /^(\d{2})\d{2}\d{3}$/.exec(student.universityId.trim());
  return match ? 2000 + Number(match[1]) : null;
}
