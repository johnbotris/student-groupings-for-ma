import type { TeacherId } from "./teacherId.ts"
import type { School } from "./school.ts"
import type { Group } from "./group.ts"
import { calculateCombinations } from "./calculateCombinations.ts"

interface Opts {
    teachersPerGroup: number
}

export function calculatePossibleGroups(
    teacherId: TeacherId,
    school: School,
    { teachersPerGroup }: Opts,
): Group[] {
    const teacher = school.getTeacher(teacherId)
    const neighbours = teacher.neighbours
    const groups = calculateCombinations(
        [teacher.id, ...neighbours.map(t => t.id)],
        teachersPerGroup,
    )

    return groups
}
