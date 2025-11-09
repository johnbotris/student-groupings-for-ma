import type { TeacherId } from "./teacherId.ts"
import { type ITeacher, School } from "./school.ts"
import type { Group } from "./group.ts"

interface Opts {
    teachersPerGroup?: number
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
    { teachersPerGroup }: Opts = {},
): Group[] {
    const groups = createTeacherGroups(
        school.getTeachers(),
        teachersPerGroup ?? 4,
    )

    console.debug("teacher groups", groups)

    const result: Group[] = []
    return result
}

function createTeacherGroups(
    teachers: ITeacher[],
    perGroup: number,
): TeacherId[][] {
    const sortedByNeighbourCount = teachers
        .map(teacher => ({
            id: teacher.id,
            neighbours: teacher.neighbours,
            teacher,
        }))
        .toSorted((a, b) => a.neighbours.length - b.neighbours.length)

    const candidates = new Set(teachers.map(t => t.id))

    const groups: TeacherId[][] = []

    for (const t of sortedByNeighbourCount) {
        if (!candidates.has(t.id)) {
            continue
        }
    }

    return groups
}
