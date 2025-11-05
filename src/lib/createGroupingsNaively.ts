import type { School } from "./school.ts"
import type { Result } from "./result.ts"
import type { StudentId } from "./studentId.ts"
import type { TeacherId } from "./teacherId.ts"
import { shuffle } from "./shuffle.ts"
import { chunks } from "./chunks.ts"
import { intersection } from "./intersection.ts"
import { pickRandom } from "./pickRandom.ts"

interface Params {
    teachersPerGroup: number
}

export function createGroupingsNaively(
    school: School,
    { teachersPerGroup }: Params,
): Result {
    interface Group {
        teachers: TeacherId[]
        students: StudentId[]
    }

    const groups = chunks(
        shuffle(school.getTeacherIds()),
        teachersPerGroup,
    ).map(teachers => {
        return {
            teachers,
            students: [],
        } as Group
    })

    let groupIdx = 0
    while (school.hasStudents()) {
        const group = groups[groupIdx % groups.length]

        const candidates = intersection(
            ...group.teachers.map(teacherId =>
                Array.from(school.getStudentIds({ teacherId })),
            ),
        )

        const studentId = pickRandom(candidates)

        if (studentId != null) {
            group.students.push(studentId)
            school.removeStudent(studentId)
        }

        groupIdx++
    }

    const result: Result = []
    for (const { teachers, students } of groups) {
        result.push([...teachers, ...students])
    }

    return result
}
