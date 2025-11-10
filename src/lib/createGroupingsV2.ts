import type { StudentId } from "./studentId.ts"
import type { TeacherId } from "./teacherId.ts"
import { School } from "./school.ts"

type Group = (TeacherId | StudentId)[]

type Opts = {
    teachersPerGroup: number
}

interface InternalGroup {
    teachers: Set<TeacherId>
    students: Set<StudentId>
}

export default function createGroupings(
    school: School,
    { teachersPerGroup }: Opts,
): Group[] {
    const minTeachersPerGroup = 2
    const targetTeachersPerGroup = Math.max(
        minTeachersPerGroup,
        teachersPerGroup,
    )
    const maxTeachersPerGroup = targetTeachersPerGroup + 1 // soft cap

    const students = [...school.students]
    const teachers = [...school.teachers]

    // teacher -> how many students they teach (for ordering / heuristics)
    const teacherLoad = new Map<TeacherId, number>()
    for (const t of teachers) {
        teacherLoad.set(t.id, t.students.length)
    }

    // Sort students so "hard" ones go first.
    // Heuristic: students whose teachers are mostly "rare" (low load) first.
    students.sort((a, b) => {
        const aTeacherLoads = a.teachers.map(t => teacherLoad.get(t.id) ?? 0)
        const bTeacherLoads = b.teachers.map(t => teacherLoad.get(t.id) ?? 0)

        const aMin = aTeacherLoads.length ? Math.min(...aTeacherLoads) : 0
        const bMin = bTeacherLoads.length ? Math.min(...bTeacherLoads) : 0

        // rarer teachers first
        return aMin - bMin
    })

    const groups: InternalGroup[] = []
    const teacherToGroup = new Map<TeacherId, number>()
    const assignedStudents = new Set<StudentId>()

    // Helper: choose teachers for a new group from a student's teachers
    function chooseTeachersForNewGroup(teacherIds: TeacherId[]): TeacherId[] {
        // Prefer teachers who have more students (to increase chance of reuse)
        const sorted = [...teacherIds].sort(
            (a, b) => (teacherLoad.get(b) ?? 0) - (teacherLoad.get(a) ?? 0),
        )
        const limit = Math.min(targetTeachersPerGroup, sorted.length)
        return sorted.slice(0, limit)
    }

    for (const student of students) {
        const sId = student.id
        const studentTeacherIds = student.teachers.map(t => t.id)

        // ----------------------------
        // 1) Try to fit into an existing group
        // ----------------------------

        // Count overlaps with each group based on teachers
        const overlapByGroup = new Map<number, number>()

        for (const tId of studentTeacherIds) {
            const gIdx = teacherToGroup.get(tId)
            if (gIdx === undefined) continue
            overlapByGroup.set(gIdx, (overlapByGroup.get(gIdx) ?? 0) + 1)
        }

        let bestExistingGroup: number | null = null
        let bestOverlap = 0

        for (const [gIdx, overlap] of overlapByGroup.entries()) {
            const group = groups[gIdx]
            if (!group) continue

            // group must already have room for more students;
            // we only limit teachers, students can be many.
            if (overlap >= 2 && group.teachers.size <= maxTeachersPerGroup) {
                if (
                    overlap > bestOverlap ||
                    (overlap === bestOverlap &&
                        group.teachers.size <
                            groups[bestExistingGroup ?? gIdx]?.teachers.size)
                ) {
                    bestOverlap = overlap
                    bestExistingGroup = gIdx
                }
            }
        }

        if (bestExistingGroup !== null) {
            // Place student into best existing group
            groups[bestExistingGroup].students.add(sId)
            assignedStudents.add(sId)
            continue
        }

        // ----------------------------
        // 2) Create a new group around this student
        // ----------------------------

        const freeTeacherIds = studentTeacherIds.filter(
            tId => !teacherToGroup.has(tId),
        )

        if (freeTeacherIds.length >= minTeachersPerGroup) {
            const chosenTeachers = chooseTeachersForNewGroup(freeTeacherIds)
            if (chosenTeachers.length >= minTeachersPerGroup) {
                const newGroupIndex = groups.length
                const group: InternalGroup = {
                    teachers: new Set(chosenTeachers),
                    students: new Set([sId]),
                }
                groups.push(group)
                assignedStudents.add(sId)

                for (const tId of chosenTeachers) {
                    teacherToGroup.set(tId, newGroupIndex)
                }
                continue
            }
        }

        // ----------------------------
        // 3) Could not assign this student
        // ----------------------------
        // We leave them unassigned rather than violating the constraint
        // (i.e., we don't create groups with < 2 of their teachers).
    }

    // At this point:
    // - Each teacher is in at most one group.
    // - Each *assigned* student is in exactly one group with at least 2 teachers.
    // - Every group has at least 2 teachers and at least 1 student.

    // If you want, you could filter out "degenerate" groups here,
    // but by construction we already avoid single-teacher groups.

    // Convert internal representation to the requested Group[] format
    const result: Group[] = groups.map(g => {
        return [...g.teachers, ...g.students]
    })

    return result
}
