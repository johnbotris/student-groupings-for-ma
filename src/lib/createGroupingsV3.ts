import type { StudentId } from "./studentId.ts"
import type { TeacherId } from "./teacherId.ts"
import { School } from "./school.ts"

export type Group = (TeacherId | StudentId)[]

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

    const allStudents = school.students.slice()
    const allTeachers = school.teachers.slice()

    const numTeachers = allTeachers.length
    const idealGroupCount = Math.max(
        1,
        Math.round(numTeachers / targetTeachersPerGroup),
    )
    const hardMaxTeachersPerGroup = Math.max(
        targetTeachersPerGroup + 2,
        Math.ceil((numTeachers / idealGroupCount) * 1.5),
    )

    // teacher -> how many students they teach (for heuristics)
    const teacherLoad = new Map<TeacherId, number>()
    for (const t of allTeachers) {
        teacherLoad.set(t.id, t.students.length)
    }

    // Sort students so those with "rarer" teachers are handled first
    allStudents.sort((a, b) => {
        const aLoads = a.teachers.map(t => teacherLoad.get(t.id) ?? 0)
        const bLoads = b.teachers.map(t => teacherLoad.get(t.id) ?? 0)
        const aMin = aLoads.length ? Math.min(...aLoads) : 0
        const bMin = bLoads.length ? Math.min(...bLoads) : 0
        return aMin - bMin
    })

    const groups: InternalGroup[] = []
    const teacherToGroup = new Map<TeacherId, number>()
    const studentToGroup = new Map<StudentId, number>()

    // Helper: choose up to target teachers for a new group around a student
    function chooseTeachersForNewGroup(teacherIds: TeacherId[]): TeacherId[] {
        const sorted = [...teacherIds].sort(
            (a, b) => (teacherLoad.get(b) ?? 0) - (teacherLoad.get(a) ?? 0),
        )
        const limit = Math.min(targetTeachersPerGroup, sorted.length)
        return sorted.slice(0, limit)
    }

    function countOverlap(
        group: InternalGroup,
        teacherIds: TeacherId[],
    ): number {
        let overlap = 0
        for (const tId of teacherIds) {
            if (group.teachers.has(tId)) overlap++
        }
        return overlap
    }

    // ---------------- PASS 1: Assign students, creating groups as needed ----------------
    for (const student of allStudents) {
        const sId = student.id
        if (studentToGroup.has(sId)) continue

        const teacherIds = student.teachers.map(t => t.id)

        // --- 1a) Best existing group with >= 2 overlapping teachers ---
        let bestGroupIdx: number | null = null
        let bestOverlap = 0

        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi]
            const overlap = countOverlap(g, teacherIds)
            if (
                overlap >= 2 &&
                overlap > bestOverlap &&
                g.teachers.size < hardMaxTeachersPerGroup
            ) {
                bestOverlap = overlap
                bestGroupIdx = gi
            }
        }

        if (bestGroupIdx !== null) {
            groups[bestGroupIdx].students.add(sId)
            studentToGroup.set(sId, bestGroupIdx)
            continue
        }

        // --- 1b) Try to upgrade a 1-overlap group by adding one more teacher for this student ---
        interface CandidateUpgrade {
            groupIdx: number
            newTeachers: TeacherId[]
        }
        const upgrades: CandidateUpgrade[] = []

        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi]
            const overlap = countOverlap(g, teacherIds)
            if (overlap !== 1) continue
            if (g.teachers.size >= hardMaxTeachersPerGroup) continue

            // find unassigned teachers of this student we could add
            const extra = teacherIds.filter(
                tId => !g.teachers.has(tId) && !teacherToGroup.has(tId),
            )
            if (extra.length === 0) continue

            // we only need one extra to get 2 teachers for this student
            upgrades.push({
                groupIdx: gi,
                newTeachers: [extra[0]],
            })
        }

        if (upgrades.length > 0) {
            // pick the upgrade whose group is still relatively small
            upgrades.sort((a, b) => {
                const sizeA = groups[a.groupIdx].teachers.size
                const sizeB = groups[b.groupIdx].teachers.size
                return sizeA - sizeB
            })
            const chosen = upgrades[0]
            const g = groups[chosen.groupIdx]
            for (const tId of chosen.newTeachers) {
                g.teachers.add(tId)
                teacherToGroup.set(tId, chosen.groupIdx)
            }
            g.students.add(sId)
            studentToGroup.set(sId, chosen.groupIdx)
            continue
        }

        // --- 1c) Create a new group around this student with >= 2 free teachers ---
        const freeTeacherIds = teacherIds.filter(
            tId => !teacherToGroup.has(tId),
        )

        if (freeTeacherIds.length >= 2) {
            const chosenTeachers = chooseTeachersForNewGroup(freeTeacherIds)
            if (chosenTeachers.length >= 2) {
                const newIdx = groups.length
                const g: InternalGroup = {
                    teachers: new Set(chosenTeachers),
                    students: new Set([sId]),
                }
                groups.push(g)
                studentToGroup.set(sId, newIdx)
                for (const tId of chosenTeachers) {
                    teacherToGroup.set(tId, newIdx)
                }
                continue
            }
        }

        // --- 1d) Relax: place student into best overlapping group (>=1 teacher) ---
        bestGroupIdx = null
        bestOverlap = -1
        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi]
            const overlap = countOverlap(g, teacherIds)
            if (overlap > bestOverlap) {
                bestOverlap = overlap
                bestGroupIdx = gi
            }
        }

        if (bestGroupIdx !== null && bestOverlap > 0) {
            groups[bestGroupIdx].students.add(sId)
            studentToGroup.set(sId, bestGroupIdx)
            continue
        }

        // --- 1e) Absolute fallback: first student or no overlap at all ---
        // If there are no groups, we must create one (may be 1 teacher in extreme case).
        if (groups.length === 0) {
            const baseTeachers = teacherIds.slice(
                0,
                Math.max(
                    1,
                    Math.min(targetTeachersPerGroup, teacherIds.length),
                ),
            )
            const g: InternalGroup = {
                teachers: new Set(baseTeachers),
                students: new Set([sId]),
            }
            const newIdx = groups.length
            groups.push(g)
            studentToGroup.set(sId, newIdx)
            for (const tId of baseTeachers) {
                teacherToGroup.set(tId, newIdx)
            }
            continue
        }

        // otherwise: put student into smallest group; teachers will be attached later
        let smallestIdx = 0
        for (let gi = 1; gi < groups.length; gi++) {
            const g = groups[gi]
            const size = g.teachers.size + g.students.size
            const minSize =
                groups[smallestIdx].teachers.size +
                groups[smallestIdx].students.size
            if (size < minSize) smallestIdx = gi
        }
        groups[smallestIdx].students.add(sId)
        studentToGroup.set(sId, smallestIdx)
    }

    // ---------------- PASS 2: Attach all remaining teachers to existing groups ----------------
    const unassignedTeachers: TeacherId[] = []
    for (const t of allTeachers) {
        if (!teacherToGroup.has(t.id)) {
            unassignedTeachers.push(t.id)
        }
    }

    function sharedStudentsWithGroup(
        teacherId: TeacherId,
        g: InternalGroup,
    ): number {
        const teacher = school.getTeacher(teacherId)
        const studentIds = new Set(teacher.students.map(s => s.id))
        let count = 0
        for (const sId of g.students) {
            if (studentIds.has(sId)) count++
        }
        return count
    }

    for (const tId of unassignedTeachers) {
        let bestIdx = -1
        let bestShared = -1

        // Prefer groups where this teacher already teaches several students
        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi]
            if (g.teachers.size >= hardMaxTeachersPerGroup) continue
            const shared = sharedStudentsWithGroup(tId, g)
            if (shared > bestShared) {
                bestShared = shared
                bestIdx = gi
            }
        }

        if (bestIdx === -1) {
            // No size-acceptable group? attach to the smallest
            let smallestIdx = 0
            for (let gi = 1; gi < groups.length; gi++) {
                const g = groups[gi]
                const size = g.teachers.size + g.students.size
                const minSize =
                    groups[smallestIdx].teachers.size +
                    groups[smallestIdx].students.size
                if (size < minSize) smallestIdx = gi
            }
            bestIdx = smallestIdx
        }

        groups[bestIdx].teachers.add(tId)
        teacherToGroup.set(tId, bestIdx)
    }

    // ---------------- PASS 3: sanity + small cleanup ----------------
    // At this point:
    // - Every student is in exactly one group (Pass 1 ensured that).
    // - Every teacher is in exactly one group (Pass 2 ensured that).
    // - Groups were always created around a student, so each group has >= 1 student.
    // - We always add at least 1 teacher when creating a group, so each group has >= 1 teacher.
    //
    // Optionally, we could still merge groups that ended up with a single teacher
    // if you want to strictly forbid one-teacher groups in all non-degenerate cases.

    // ---------------- Build final result ----------------
    const result: Group[] = groups.map(g => [...g.teachers, ...g.students])

    return result
}
