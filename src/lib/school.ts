import { type StudentId } from "./studentId.ts"
import { type TeacherId } from "./teacherId.ts"
import type { Pairing } from "./pairing.ts"
import { uniqueBy } from "./uniqueBy.ts"
import { cloneMapOfSets } from "./cloneMapOfSets.ts"

export interface ITeacher {
    readonly id: TeacherId

    /**
     * the students that this teacher teaches
     */
    readonly students: IStudent[]

    readonly neighbours: ITeacher[]

    /**
     * does the teacher have the given students in their class?
     */
    hasStudents(...studentIds: StudentId[]): boolean

    /**
     * get the students that are shared by each teacher
     */
    sharedStudents(...teacherIds: TeacherId[]): IStudent[]
}

export interface IStudent {
    readonly id: StudentId
    readonly teachers: ITeacher[]
    hasTeachers(...teacherId: TeacherId[]): boolean
    sharedTeachers(...studentIds: StudentId[]): ITeacher[]
}

export class School {
    public readonly numTeachers: number
    public readonly numStudents: number

    private constructor(
        private readonly teacherToStudent: ReadonlyMap<
            TeacherId,
            Set<StudentId>
        >,
        private readonly studentToTeacher: ReadonlyMap<
            StudentId,
            Set<TeacherId>
        >,
    ) {
        this.numTeachers = this.teacherToStudent.size
        this.numStudents = this.studentToTeacher.size
    }

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

    static serialize(schools: School[]): string {
        return JSON.stringify(
            schools.map(s => {
                const teacherToStudent = [...s.teacherToStudent.entries()].map(
                    ([k, v]) => [k, [...v]] as const,
                )
                const studentToTeacher = [...s.studentToTeacher.entries()].map(
                    ([k, v]) => [k, [...v]] as const,
                )

                return {
                    teacherToStudent,
                    studentToTeacher,
                }
            }),
        )
    }

    static deserialize(str: string): School[] {
        const values = JSON.parse(str) as {
            teacherToStudent: [TeacherId, StudentId[]][]
            studentToTeacher: [StudentId, TeacherId[]][]
        }[]

        return values.map(
            ({ teacherToStudent, studentToTeacher }) =>
                new School(
                    new Map(teacherToStudent.map(([k, v]) => [k, new Set(v)])),
                    new Map(studentToTeacher.map(([k, v]) => [k, new Set(v)])),
                ),
        )
    }

    get teachers() {
        return [...this.teacherToStudent.keys()].map(t => this.getTeacher(t))
    }

    get students() {
        return [...this.studentToTeacher.keys()].map(s => this.getStudent(s))
    }

    without({
        teachers,
        students,
    }: {
        teachers?: TeacherId[]
        students?: StudentId[]
    }): School {
        const teacherToStudent = cloneMapOfSets(this.teacherToStudent)
        const studentToTeacher = cloneMapOfSets(this.studentToTeacher)

        for (const teacher of teachers ?? []) {
            teacherToStudent.delete(teacher)
            for (const teacherList of studentToTeacher.values()) {
                teacherList.delete(teacher)
            }
        }

        for (const student of students ?? []) {
            studentToTeacher.delete(student)
            for (const studentList of teacherToStudent.values()) {
                studentList.delete(student)
            }
        }

        return new School(teacherToStudent, studentToTeacher)
    }

    getTeacher(id: TeacherId): ITeacher {
        return new Teacher(id, this)
    }

    getStudent(id: StudentId): IStudent {
        return new Student(id, this)
    }

    getTeacherIds({
        studentId,
    }: { studentId?: StudentId } = {}): ReadonlySet<TeacherId> {
        return new Set(
            studentId
                ? (this.studentToTeacher.get(studentId) ?? [])
                : new Set([...this.teacherToStudent.keys()]),
        )
    }

    getStudentIds({
        teacherId,
    }: { teacherId?: TeacherId } = {}): ReadonlySet<StudentId> {
        return new Set(
            teacherId
                ? (this.teacherToStudent.get(teacherId) ?? [])
                : new Set([...this.studentToTeacher.keys()]),
        )
    }

    getTeachers(): ITeacher[] {
        return Array.from(this.getTeacherIds()).map(id => this.getTeacher(id))
    }

    isStudent(s: string): s is StudentId {
        return this.studentToTeacher.has(s as StudentId)
    }

    isTeacher(t: string): t is TeacherId {
        return this.teacherToStudent.has(t as TeacherId)
    }
}

class Teacher implements ITeacher {
    public readonly id: TeacherId
    private readonly model: School
    constructor(id: TeacherId, model: School) {
        this.id = id
        this.model = model
    }

    get students(): IStudent[] {
        const students: IStudent[] = []
        for (const studentId of this.model.getStudentIds({
            teacherId: this.id,
        })) {
            students.push(this.model.getStudent(studentId))
        }
        return students
    }

    get neighbours(): ITeacher[] {
        return uniqueBy(
            this.students.flatMap(s => s.teachers).filter(t => t.id != this.id),
            t => t.id,
        )
    }

    hasStudents(...studentIds: StudentId[]): boolean {
        return studentIds.every(studentId =>
            this.model.getTeacherIds({ studentId }).has(this.id),
        )
    }

    sharedStudents(...teacherIds: TeacherId[]): IStudent[] {
        return this.students.filter(student =>
            teacherIds.every(teacherId =>
                this.model.getTeacher(teacherId).hasStudents(student.id),
            ),
        )
    }
}

class Student implements IStudent {
    public readonly id: StudentId
    private readonly model: School

    constructor(id: StudentId, model: School) {
        this.model = model
        this.id = id
    }

    get teachers(): ITeacher[] {
        const teachers: ITeacher[] = []
        for (const teacherId of this.model.getTeacherIds({
            studentId: this.id,
        })) {
            teachers.push(this.model.getTeacher(teacherId))
        }
        return teachers
    }

    hasTeachers(...teacherIds: TeacherId[]): boolean {
        return teacherIds.every(teacherId =>
            this.model.getTeacherIds({ studentId: this.id }).has(teacherId),
        )
    }

    sharedTeachers(...studentIds: StudentId[]): ITeacher[] {
        return this.teachers.filter(teacher =>
            studentIds.every(studentId =>
                this.model.getStudent(studentId).hasTeachers(teacher.id),
            ),
        )
    }
}
