import { type StudentId } from "./studentId.ts"
import { type TeacherId } from "./teacherId.ts"
import type { Pairing } from "./pairing.ts"
import { unique } from "./unique.ts"
import { uniqueBy } from "./uniqueBy.ts"

export class School {
    private readonly students: Set<StudentId>
    private readonly teachers: Set<TeacherId>
    private readonly teacherToStudent: Map<TeacherId, Set<StudentId>>
    private readonly studentToTeacher: Map<StudentId, Set<TeacherId>>

    private constructor(
        students: Set<StudentId>,
        teachers: Set<TeacherId>,
        teacherToStudent: Map<TeacherId, Set<StudentId>>,
        studentToTeacher: Map<StudentId, Set<TeacherId>>,
    ) {
        this.students = students
        this.teachers = teachers
        this.teacherToStudent = teacherToStudent
        this.studentToTeacher = studentToTeacher
    }

    static create(pairs: Pairing[]): School {
        const school = new School(new Set(), new Set(), new Map(), new Map())
        for (const [teacher, student] of pairs) school.addEdge(student, teacher)
        return school
    }

    clone() {
        return new School(
            new Set(this.students),
            new Set(this.teachers),
            cloneMapOfSets(this.teacherToStudent),
            cloneMapOfSets(this.studentToTeacher),
        )
    }

    hasStudents() {
        return this.students.size > 0
    }

    removeStudent(studentId: StudentId) {
        this.students.delete(studentId)

        const teacherIds = this.studentToTeacher.get(studentId) ?? []
        this.studentToTeacher.delete(studentId)

        for (const teacherId of teacherIds) {
            this.teacherToStudent.get(teacherId)?.delete(studentId)
        }
    }

    addEdge(student: StudentId, teacher: TeacherId) {
        this.students.add(student)
        this.teachers.add(teacher)

        if (!this.teacherToStudent.has(teacher))
            this.teacherToStudent.set(teacher, new Set())

        if (!this.studentToTeacher.has(student))
            this.studentToTeacher.set(student, new Set())

        this.teacherToStudent.get(teacher)!.add(student)
        this.studentToTeacher.get(student)!.add(teacher)
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
                : this.teachers,
        )
    }

    getStudentIds({
        teacherId,
    }: { teacherId?: TeacherId } = {}): ReadonlySet<StudentId> {
        return new Set(
            teacherId
                ? (this.teacherToStudent.get(teacherId) ?? [])
                : this.students,
        )
    }

    getTeachers(): ITeacher[] {
        return Array.from(this.getTeacherIds()).map(id => this.getTeacher(id))
    }
}
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
            this.students.flatMap(s => s.teachers),
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

export interface IStudent {
    readonly id: StudentId
    readonly teachers: ITeacher[]
    hasTeachers(...teacherId: TeacherId[]): boolean
    sharedTeachers(...studentIds: StudentId[]): ITeacher[]
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

function cloneMapOfSets<TMap, TSet>(
    map: ReadonlyMap<TMap, ReadonlySet<TSet>>,
): Map<TMap, Set<TSet>> {
    const result: Map<TMap, Set<TSet>> = new Map()
    for (const [key, value] of map.entries()) {
        result.set(key, new Set(value))
    }
    return result
}
