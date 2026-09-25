import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as XLSX from 'xlsx';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

interface UploadedExcelFile {
  buffer: Buffer;
  originalname: string;
}

interface ParsedResultRow {
  rowNumber: number;
  studentUniversityId: string;
  courseCode: string;
  score: number;
}

interface ValidatedResultRow {
  rowNumber: number;
  enrollmentItemId: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  score: number;
  gradeScaleId: string;
  gradeLabel: string;
  gradePoint: number;
  passed: boolean;
}

@Injectable()
export class CourseResultsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private getCell(
    row: Record<string, unknown>,
    aliases: string[],
  ) {
    for (const alias of aliases) {
      if (
        Object.prototype.hasOwnProperty.call(
          row,
          alias,
        )
      ) {
        return row[alias];
      }
    }

    return undefined;
  }

  private parseWorkbook(
    file: UploadedExcelFile,
  ): ParsedResultRow[] {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Excel file is required',
      );
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(
        file.buffer,
        {
          type: 'buffer',
        },
      );
    } catch {
      throw new BadRequestException(
        'Could not read the Excel file',
      );
    }

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException(
        'Excel file does not contain any sheets',
      );
    }

    const sheet =
      workbook.Sheets[
        firstSheetName
      ];

    const rawRows =
      XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(sheet, {
        defval: '',
      });

    if (rawRows.length === 0) {
      throw new BadRequestException(
        'Excel sheet is empty',
      );
    }

    return rawRows.map(
      (row, index) => {
        const studentValue =
          this.getCell(
            row,
            [
              'studentUniversityId',
              'universityId',
              'studentId',
              'الرقم الجامعي',
            ],
          );

        const courseValue =
          this.getCell(
            row,
            [
              'courseCode',
              'course',
              'رمز المقرر',
            ],
          );

        const scoreValue =
          this.getCell(
            row,
            [
              'score',
              'grade',
              'الدرجة',
            ],
          );

        return {
          rowNumber:
            index + 2,

          studentUniversityId:
            String(
              studentValue ?? '',
            ).trim(),

          courseCode:
            String(
              courseValue ?? '',
            )
              .trim()
              .toUpperCase(),

          score:
            Number(scoreValue),
        };
      },
    );
  }

  private async getSemesterContext(
    semesterId: string,
  ) {
    const semester =
      await this.prisma.semester.findUnique({
        where: {
          id: semesterId,
        },

        include: {
          academicYear: {
            include: {
              studyPlan: {
                include: {
                  program: {
                    include: {
                      department: {
                        include: {
                          college: {
                            include: {
                              university: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!semester) {
      throw new NotFoundException(
        'Semester not found',
      );
    }

    return semester;
  }

  async buildTemplate(
    semesterId: string,
  ) {
    const semester =
      await this.getSemesterContext(
        semesterId,
      );

    const items =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollment: {
            semesterId,
            status: {
              in: [
                'APPROVED',
                'CONFIRMED',
              ],
            },
          },
        },

        include: {
          enrollment: {
            include: {
              student: true,
            },
          },
          course: true,
        },

        orderBy: [
          {
            enrollment: {
              student: {
                universityId: 'asc',
              },
            },
          },
          {
            course: {
              code: 'asc',
            },
          },
        ],
      });

    const rows =
      items.map(
        (item) => ({
          studentUniversityId:
            item.enrollment.student
              .universityId,

          studentName:
            [
              item.enrollment.student
                .firstName,

              item.enrollment.student
                .middleName,

              item.enrollment.student
                .familyName,
            ]
              .filter(Boolean)
              .join(' '),

          courseCode:
            item.course.code,

          courseName:
            item.course.nameAr,

          score: '',
        }),
      );

    const workbook =
      XLSX.utils.book_new();

    const sheet =
      XLSX.utils.json_to_sheet(
        rows.length > 0
          ? rows
          : [
              {
                studentUniversityId:
                  '',
                studentName: '',
                courseCode: '',
                courseName: '',
                score: '',
              },
            ],
      );

    sheet['!cols'] = [
      {
        wch: 20,
      },
      {
        wch: 28,
      },
      {
        wch: 16,
      },
      {
        wch: 28,
      },
      {
        wch: 12,
      },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      'Results',
    );

    const buffer =
      XLSX.write(
        workbook,
        {
          type: 'buffer',
          bookType: 'xlsx',
        },
      ) as Buffer;

    return {
      buffer,
      filename:
        `results-${semester.academicYear.levelNumber}-${semester.semesterNumber}.xlsx`,
      rowCount: rows.length,
    };
  }

  async importExcel(
    semesterId: string,
    file: UploadedExcelFile,
    actingUserId: string,
  ) {
    const semester =
      await this.getSemesterContext(
        semesterId,
      );

    const university =
      semester.academicYear.studyPlan
        .program.department.college
        .university;

    const gradeScales =
      await this.prisma.gradeScale.findMany({
        where: {
          universityId:
            university.id,
          isActive: true,
        },

        orderBy: {
          minScore: 'asc',
        },
      });

    if (gradeScales.length === 0) {
      throw new BadRequestException(
        'No active grade scale is configured for this university',
      );
    }

    const parsedRows =
      this.parseWorkbook(file);

    const errors: string[] = [];

    const validatedRows:
      ValidatedResultRow[] = [];

    const seenKeys =
      new Set<string>();

    for (const row of parsedRows) {
      if (
        !row.studentUniversityId
      ) {
        errors.push(
          `Row ${row.rowNumber}: studentUniversityId is required`,
        );

        continue;
      }

      if (!row.courseCode) {
        errors.push(
          `Row ${row.rowNumber}: courseCode is required`,
        );

        continue;
      }

      if (
        !Number.isFinite(
          row.score,
        )
      ) {
        errors.push(
          `Row ${row.rowNumber}: score must be a valid number`,
        );

        continue;
      }

      const duplicateKey =
        `${row.studentUniversityId}:${row.courseCode}`;

      if (
        seenKeys.has(
          duplicateKey,
        )
      ) {
        errors.push(
          `Row ${row.rowNumber}: duplicate student/course row`,
        );

        continue;
      }

      seenKeys.add(
        duplicateKey,
      );

      const [
        student,
        course,
      ] =
        await Promise.all([
          this.prisma.student.findUnique({
            where: {
              universityId:
                row.studentUniversityId,
            },
          }),

          this.prisma.course.findUnique({
            where: {
              code:
                row.courseCode,
            },
          }),
        ]);

      if (!student) {
        errors.push(
          `Row ${row.rowNumber}: student ${row.studentUniversityId} was not found`,
        );

        continue;
      }

      if (!course) {
        errors.push(
          `Row ${row.rowNumber}: course ${row.courseCode} was not found`,
        );

        continue;
      }

      const enrollmentItem =
        await this.prisma.enrollmentItem.findFirst({
          where: {
            courseId:
              course.id,

            enrollment: {
              studentId:
                student.id,

              semesterId,

              status: {
                in: [
                  'APPROVED',
                  'CONFIRMED',
                ],
              },
            },
          },
        });

      if (!enrollmentItem) {
        errors.push(
          `Row ${row.rowNumber}: student ${row.studentUniversityId} is not confirmed/approved in ${row.courseCode} for the selected semester`,
        );

        continue;
      }

      const matchingScales =
        gradeScales.filter(
          (scale) =>
            row.score >=
              Number(
                scale.minScore,
              ) &&
            row.score <=
              Number(
                scale.maxScore,
              ),
        );

      if (
        matchingScales.length ===
        0
      ) {
        errors.push(
          `Row ${row.rowNumber}: score ${row.score} does not match any active grade range`,
        );

        continue;
      }

      if (
        matchingScales.length >
        1
      ) {
        errors.push(
          `Row ${row.rowNumber}: score ${row.score} matches more than one grade range`,
        );

        continue;
      }

      const scale =
        matchingScales[0];

      validatedRows.push({
        rowNumber:
          row.rowNumber,

        enrollmentItemId:
          enrollmentItem.id,

        studentId:
          student.id,

        courseId:
          course.id,

        semesterId,

        score:
          row.score,

        gradeScaleId:
          scale.id,

        gradeLabel:
          scale.label,

        gradePoint:
          Number(
            scale.gradePoint,
          ),

        passed:
          scale.passed,
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        imported: 0,
        errors,
      };
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (
          const row of
          validatedRows
        ) {
          await tx.courseResult.upsert({
            where: {
              enrollmentItemId:
                row.enrollmentItemId,
            },

            create: {
              enrollmentItemId:
                row.enrollmentItemId,

              studentId:
                row.studentId,

              courseId:
                row.courseId,

              semesterId:
                row.semesterId,

              gradeScaleId:
                row.gradeScaleId,

              score:
                row.score,

              gradeLabel:
                row.gradeLabel,

              gradePoint:
                row.gradePoint,

              passed:
                row.passed,
            },

            update: {
              gradeScaleId:
                row.gradeScaleId,

              score:
                row.score,

              gradeLabel:
                row.gradeLabel,

              gradePoint:
                row.gradePoint,

              passed:
                row.passed,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action:
              'COURSE_RESULTS_IMPORTED',

            entity:
              'Semester',

            entityId:
              semesterId,

            userId:
              actingUserId,

            details:
              JSON.stringify({
                filename:
                  file.originalname,

                universityId:
                  university.id,

                rowCount:
                  validatedRows.length,
              }),
          },
        });
      },
    );

    return {
      success: true,
      imported:
        validatedRows.length,
      errors: [],
    };
  }

  async findBySemester(
    semesterId: string,
  ) {
    await this.getSemesterContext(
      semesterId,
    );

    return this.prisma.courseResult.findMany({
      where: {
        semesterId,
      },

      include: {
        student: true,
        course: true,
        gradeScale: true,
      },

      orderBy: [
        {
          student: {
            universityId: 'asc',
          },
        },
        {
          course: {
            code: 'asc',
          },
        },
      ],
    });
  }
}
