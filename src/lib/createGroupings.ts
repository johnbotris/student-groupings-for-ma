import type { ITeacher, School } from "./school.ts"
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

export function createGroupings(
    school: School,
    { teachersPerGroup }: Params,
): Result {
    interface Group {
        teachers: TeacherId[]
        students: StudentId[]
    }

    const groups = makeTeacherGroups(school)

    return []
}

function makeTeacherGroups(school: School): ITeacher[][] {
    const neighbourhoods: Set<TeacherId>[] = []

    return []
}
