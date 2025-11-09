import { type ITeacher, School } from "./school.ts"
import type { Group } from "./group.ts"
import { pickRandom } from "./pickRandom.ts"
import { findMin } from "./findMin.ts"
import { intersection } from "./intersection.ts"
import { shuffle } from "./shuffle.ts"
import { findMax } from "./findMax.ts"
import { intersectionBy } from "./intersectionBy.ts"

interface Opts {
    teachersPerGroup: number
}

/**
 * Generate groupings of teachers and students such that:
 * - Each group has up to N teachers (N from opts.teachersPerGroup).
 * - Every student placed in a group is connected to all teachers in that group.
 * - Student counts are balanced across groups when possible.
 *
 * Notes:
 * - Teachers are assigned to exactly one group.
 * - If teachers.length is not divisible by N, the final group may have fewer than N teachers.
 * - Students are assigned to at most one group (to keep groups distinct and sizes balanced).
 */
export function createGroupings(
    school: School,
    { teachersPerGroup }: Opts,
): Group[] {
    // pick a random teacher
    // find a teacher with the least amount of overlap
    // find another teacher with the least amount of overlap
    // etc
    // until the group size has been reached

    const teacherGroups: ITeacher[][] = []

    const numGroups = Math.floor(school.numTeachers / teachersPerGroup)

    const teachers = school.teachers
    for (let i = 0; i < numGroups; ++i) {
        if (teacherGroups.length === 0) {
            teacherGroups.push([pickRandom(school.teachers)!])
        } else {
            const bestChoice = findMin(shuffle(teachers), t => {
                const students = [...teacherGroups.flat(), t].map(t =>
                    t.students.map(s => s.id),
                )

                return intersection(students).length
            })

            if (!bestChoice) throw new Error("something borked")

            teacherGroups.push([bestChoice])
        }
    }

    while (teachers.length > 0) {
        const teacher = teachers.pop()!

        const bestChoice = findMax(teacherGroups, group => {
            const multiplier =
                group.length < teachersPerGroup ? 1 : Number.MIN_VALUE // 1 / Math.sqrt(group.length * 4)

            const students = [...group.map(t => t.students), teacher.students]

            return intersectionBy(students, s => s.id).length * multiplier
        })

        if (!bestChoice) throw new Error("something borked")

        bestChoice.push(teacher)
    }

    return teacherGroups.map(g => g.map(t => t.id))
}
