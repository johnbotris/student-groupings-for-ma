import { type IStudent, type ITeacher, School } from "./school.ts"
import type { Group } from "./group.ts"
import { pickRandom } from "./pickRandom.ts"
import { shuffle } from "./shuffle.ts"
import { removeFrom } from "./removeFrom.ts"
import { count } from "./count.ts"

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
export default function createGroupings(
    school: School,
    { teachersPerGroup }: Opts,
): Group[] {
    const teacherGroups: ITeacher[][] = []

    const numGroups = Math.floor(school.numTeachers / teachersPerGroup)

    const candidates = shuffle(school.teachers)
    for (let i = 0; i < numGroups; ++i) {
        teacherGroups.push([candidates.pop()!])
    }

    let groupIdx = 0
    while (candidates.length > 0) {
        const group = teacherGroups[groupIdx % teacherGroups.length]
        const groupLeader = group[0]
        const allowedCandidates = groupLeader.neighbours.filter(t =>
            candidates.includes(t),
        )

        const newMember =
            pickRandom(allowedCandidates) ?? pickRandom(candidates)

        if (!newMember) throw new Error("we fukd up")

        group.push(newMember)
        removeFrom(candidates, newMember)
        groupIdx++
    }

    const candidateStudents = school.students
    const studentGroups: IStudent[][] = []

    groupIdx = 0
    let missedAt = -1
    while (candidateStudents.length > 0) {
        if (studentGroups.length <= groupIdx) {
            studentGroups.push([])
        }

        const studentGroup = studentGroups[groupIdx % numGroups]

        const teacherGroup = teacherGroups[groupIdx % numGroups]

        const getNumInGroup = (s: IStudent) =>
            count(teacherGroup, t => t.hasStudents(s.id))

        const allowedStudents = candidateStudents.filter(s => {
            // the student has at least 2 teachers in the group
            return count(teacherGroup, t => t.hasStudents(s.id)) > 1
        })

        const student = allowedStudents
            .toSorted((a, b) => getNumInGroup(b) - getNumInGroup(a))
            .at(0)

        if (!student) {
            if (missedAt === groupIdx) {
                console.error("We failed :(")
                break
            } else if (missedAt === -1) {
                missedAt = groupIdx
            }

            continue
        }

        missedAt = -1

        studentGroup.push(student)
        removeFrom(candidateStudents, student)

        groupIdx++
    }

    if (missedAt === -1) console.log("wow success")

    return teacherGroups.map((g, idx) => [
        ...g.map(t => t.id),
        ...(studentGroups[idx]?.map(s => s.id) ?? []),
    ])
}
