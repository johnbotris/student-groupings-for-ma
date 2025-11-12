import { type StudentId } from "./studentId.ts"
import { type TeacherId } from "./teacherId.ts"
import type { Pairing } from "./pairing.ts"

export class School {
    private constructor(
        private readonly teacherToStudent: ReadonlyMap<
            TeacherId,
            Set<StudentId>
        >,
        private readonly studentToTeacher: ReadonlyMap<
            StudentId,
            Set<TeacherId>
        >,
    ) {}

    static create(pairs: Pairing[]): School {
        const teacherToStudent = new Map<TeacherId, Set<StudentId>>()
        const studentToTeacher = new Map<StudentId, Set<TeacherId>>()

        const school = new School(teacherToStudent, studentToTeacher)
        for (const [teacher, student] of pairs) {
            if (!teacherToStudent.has(teacher))
                teacherToStudent.set(teacher, new Set())

            if (!studentToTeacher.has(student))
                studentToTeacher.set(student, new Set())

            teacherToStudent.get(teacher)!.add(student)
            studentToTeacher.get(student)!.add(teacher)
        }
        return school
    }

    static serialize(school: School | null): string {
        if (!school) return "null"

        const teacherToStudent = [...school.teacherToStudent.entries()].map(
            ([k, v]) => [k, [...v]] as const,
        )
        const studentToTeacher = [...school.studentToTeacher.entries()].map(
            ([k, v]) => [k, [...v]] as const,
        )

        return JSON.stringify({
            teacherToStudent,
            studentToTeacher,
        })
    }

    static deserialize(str: string): School {
        const { teacherToStudent, studentToTeacher } = JSON.parse(str) as {
            teacherToStudent: [TeacherId, StudentId[]][]
            studentToTeacher: [StudentId, TeacherId[]][]
        }

        return new School(
            new Map(teacherToStudent.map(([k, v]) => [k, new Set(v)])),
            new Map(studentToTeacher.map(([k, v]) => [k, new Set(v)])),
        )
    }

    get teachers() {
        return [...this.teacherToStudent.keys()]
    }

    get students() {
        return [...this.studentToTeacher.keys()]
    }

    public get numTeachers() {
        return this.teacherToStudent.size
    }
    public get numStudents() {
        return this.studentToTeacher.size
    }

    without({
        teachers,
        students,
    }: {
        teachers?: TeacherId[]
        students?: StudentId[]
    }): School {
        const pairs = this.teacherToStudent
            .entries()
            .flatMap(([teacher, students]) =>
                students.values().map(student => [teacher, student] as const),
            )
            .filter(
                ([teacher, student]) =>
                    !teachers?.includes(teacher) &&
                    !students?.includes(student),
            )

        return School.create([...pairs])
    }

    getTeachers(s: StudentId): TeacherId[] {
        return [...(this.studentToTeacher.get(s) ?? [])]
    }

    getStudents(t: TeacherId): StudentId[] {
        return [...(this.teacherToStudent.get(t) ?? [])]
    }

    isStudent(s: string): s is StudentId {
        return this.studentToTeacher.has(s as StudentId)
    }

    isTeacher(t: string): t is TeacherId {
        return this.teacherToStudent.has(t as TeacherId)
    }

    studentHasTeacher(student: StudentId, teacher: TeacherId) {
        return !!this.studentToTeacher.get(student)?.has(teacher)
    }

    getNeighbours(t: TeacherId): TeacherId[] {
        return [
            ...(this.teacherToStudent
                .get(t)
                ?.values()
                .flatMap(s => this.studentToTeacher.get(s) ?? []) ?? []),
        ]
    }
}
