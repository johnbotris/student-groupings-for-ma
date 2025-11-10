import * as XLSX from "xlsx"
import { teacherId } from "./teacherId.ts"
import { studentId } from "./studentId.ts"
import { unique } from "./unique.ts"
import type { WorkbookData } from "./workbookData.ts"

interface StudentRow {
    "Student First Name": string
    "Student Last Name": string
    "Student ID": number
    "Student Email Address": string
    "Student Year Level": number
    Surname: string
    "First Name": string
    "Middle Name"?: string
}

export function parseStudentWorkbook(data: ArrayBuffer): WorkbookData {
    const file = XLSX.read(data)

    const sheetStudents = XLSX.utils.sheet_to_json(
        file.Sheets["Info for EUA"],
        {
            range: XLSX.utils.decode_range("A1:I14285"),
        },
    ) as StudentRow[]

    const nccdStudentsDataSheet = XLSX.utils.sheet_to_json(
        file.Sheets["Info for EUA"],
        { range: XLSX.utils.decode_range("M1:M322") },
    ) as { "Student ID": number }[]

    const nccdStudentIds = new Set(
        nccdStudentsDataSheet.map(row => row["Student ID"]),
    )

    const students = sheetStudents.filter(s =>
        nccdStudentIds.has(s["Student ID"]),
    )

    const teacherName = (student: StudentRow) =>
        teacherId(
            student["Middle Name"]
                ? `${student["First Name"]} ${student["Middle Name"]} ${student["Surname"]}`
                : `${student["First Name"]} ${student["Surname"]}`,
        )

    const studentName = (student: StudentRow) =>
        studentId(
            `${student["Student ID"]} Y${student["Student Year Level"]} ${student["Student First Name"]} ${student["Student Last Name"]}`,
        )

    return {
        teachers: unique(
            students.map(teacherName).filter(name => name !== "Study Period"),
        ),
        students: unique(students.map(studentName)),
        pairings: students
            .map(student => {
                return [teacherName(student), studentName(student)] as const
            })
            .filter(([teacher, _]) => teacher !== "Study Period"),
    }
}
