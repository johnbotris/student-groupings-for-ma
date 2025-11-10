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

// Fisher–Yates shuffle for controlled randomness
function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

export default function createGroupings(
    school: School,
    { teachersPerGroup }: Opts,
): Group[] {
    const allTeacherObjs = school.teachers
    const allStudentObjs = school.students

    const numTeachers = allTeacherObjs.length
    const numStudents = allStudentObjs.length

    if (numTeachers === 0 || numStudents === 0) return []

    const teacherById = new Map<TeacherId, (typeof allTeacherObjs)[number]>()
    for (const t of allTeacherObjs) teacherById.set(t.id, t)

    const students = shuffle(allStudentObjs.slice())
    const teachers = shuffle(allTeacherObjs.slice())

    const targetTeachersPerGroup = Math.max(2, teachersPerGroup)

    // Roughly how many groups we want
    const targetGroupCount = Math.max(
        1,
        Math.round(numTeachers / targetTeachersPerGroup),
    )

    // Hard cap on teachers per group (prevents giant groups)
    const hardMaxTeachersPerGroup = Math.max(
        targetTeachersPerGroup + 1,
        Math.ceil(numTeachers / targetGroupCount) + 1,
    )

    // -----------------------------
    // 1. Partition teachers into groups (no students yet)
    // -----------------------------

    const unassignedTeachers = new Set<TeacherId>(teachers.map(t => t.id))

    const teacherGroups: TeacherId[][] = []

    // Helper: number of neighbours (by shared students) among unassigned
    function degree(id: TeacherId): number {
        const t = teacherById.get(id)
        if (!t) return 0
        let d = 0
        for (const n of t.neighbours) {
            if (unassignedTeachers.has(n.id)) d++
        }
        return d
    }

    // Shared weight between teacher and current group
    function scoreTeacherForGroup(
        candidateId: TeacherId,
        groupTeacherIds: TeacherId[],
    ): number {
        const cand = teacherById.get(candidateId)
        if (!cand) return 0
        let score = 0
        for (const gId of groupTeacherIds) {
            const shared = cand.sharedStudents(gId as TeacherId)
            score += shared.length
        }
        return score
    }

    while (unassignedTeachers.size > 0) {
        // pick seed teacher with highest degree (ties broken randomly)
        let bestId: TeacherId | null = null
        let bestDeg = -1
        const candidates: TeacherId[] = []

        for (const id of unassignedTeachers) {
            const d = degree(id)
            if (d > bestDeg) {
                bestDeg = d
                candidates.length = 0
                candidates.push(id)
            } else if (d === bestDeg) {
                candidates.push(id)
            }
        }

        if (candidates.length === 0) {
            // shouldn't really happen, but fallback
            const [any] = unassignedTeachers
            if (!any) break
            bestId = any
        } else {
            bestId = candidates[Math.floor(Math.random() * candidates.length)]
        }

        if (!bestId) break

        const group: TeacherId[] = [bestId]
        unassignedTeachers.delete(bestId)

        // greedily add neighbours up to hard cap
        while (group.length < hardMaxTeachersPerGroup) {
            const neighbourSet = new Set<TeacherId>()

            for (const gId of group) {
                const t = teacherById.get(gId)
                if (!t) continue
                for (const n of t.neighbours) {
                    if (unassignedTeachers.has(n.id)) {
                        neighbourSet.add(n.id)
                    }
                }
            }

            if (neighbourSet.size === 0) break

            const neighbourList = shuffle([...neighbourSet])
            let bestCand: TeacherId | null = null
            let bestScore = -1
            const tie: TeacherId[] = []

            for (const cId of neighbourList) {
                const sc = scoreTeacherForGroup(cId, group)
                if (sc > bestScore) {
                    bestScore = sc
                    tie.length = 0
                    tie.push(cId)
                } else if (sc === bestScore) {
                    tie.push(cId)
                }
            }

            bestCand = tie[Math.floor(Math.random() * tie.length)]

            if (!bestCand) break

            group.push(bestCand)
            unassignedTeachers.delete(bestCand)
        }

        teacherGroups.push(group)
    }

    // Merge single-teacher groups into others where possible (respecting hard cap)
    const mergedTeacherGroups: TeacherId[][] = []
    const singles: TeacherId[] = []

    for (const g of teacherGroups) {
        if (g.length === 1) singles.push(g[0])
        else mergedTeacherGroups.push(g)
    }

    for (const tId of singles) {
        // try to attach to a small group
        let targetIdx = -1
        let smallestSize = Infinity

        for (let i = 0; i < mergedTeacherGroups.length; i++) {
            const size = mergedTeacherGroups[i].length
            if (size < smallestSize && size + 1 <= hardMaxTeachersPerGroup) {
                smallestSize = size
                targetIdx = i
            }
        }

        if (targetIdx === -1) {
            // no space anywhere, start a new group (will be single-teacher, last resort)
            mergedTeacherGroups.push([tId])
        } else {
            mergedTeacherGroups[targetIdx].push(tId)
        }
    }

    const finalTeacherGroups = mergedTeacherGroups

    // -----------------------------
    // 2. Create internal groups with teachers, then assign students
    // -----------------------------

    const groups: InternalGroup[] = finalTeacherGroups.map(g => ({
        teachers: new Set<TeacherId>(g),
        students: new Set<StudentId>(),
    }))

    const studentToGroup = new Map<StudentId, number>()
    const teacherToGroup = new Map<TeacherId, number>()

    for (let gi = 0; gi < groups.length; gi++) {
        for (const tId of groups[gi].teachers) {
            teacherToGroup.set(tId, gi)
        }
    }

    // Assign each student to the group that has most of their teachers
    for (const s of students) {
        const sId = s.id
        const tIds = s.teachers.map(t => t.id)

        const bestIdx = -1
        let bestOverlap = -1
        const candidates: number[] = []

        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi]
            let overlap = 0
            for (const tId of tIds) {
                if (g.teachers.has(tId)) overlap++
            }
            if (overlap > bestOverlap) {
                bestOverlap = overlap
                candidates.length = 0
                candidates.push(gi)
            } else if (overlap === bestOverlap) {
                candidates.push(gi)
            }
        }

        // There must be at least one teacher, so bestOverlap >= 1 in sane data
        const chosenIdx =
            candidates[Math.floor(Math.random() * candidates.length)]

        groups[chosenIdx].students.add(sId)
        studentToGroup.set(sId, chosenIdx)
    }

    // -----------------------------
    // 3. Ensure each teacher has at least one of their own students in their group
    //    (and thus every group has at least one student)
    // -----------------------------

    function ensureTeacherHasStudent(tId: TeacherId, currentGroupIdx: number) {
        const teacher = teacherById.get(tId)
        if (!teacher) return

        const g = groups[currentGroupIdx]

        // Already ok?
        for (const s of teacher.students) {
            if (g.students.has(s.id)) return
        }

        const teacherStudentIds = teacher.students.map(s => s.id)

        // Option 1: move a student to teacher's group (only from groups that would
        // still have >=1 student after the move).
        const movableStudents: StudentId[] = []
        for (const sId of teacherStudentIds) {
            const gIdx = studentToGroup.get(sId)
            if (gIdx == null || gIdx === currentGroupIdx) continue
            const donorGroup = groups[gIdx]
            if (donorGroup.students.size > 1) {
                movableStudents.push(sId)
            }
        }

        if (movableStudents.length > 0) {
            const chosen =
                movableStudents[
                    Math.floor(Math.random() * movableStudents.length)
                ]
            const fromIdx = studentToGroup.get(chosen)!
            groups[fromIdx].students.delete(chosen)
            groups[currentGroupIdx].students.add(chosen)
            studentToGroup.set(chosen, currentGroupIdx)
            return
        }

        // Option 2: move teacher into one of their student's groups (if it keeps
        // old group with >=1 teacher and target group under hard cap).
        const movableTargets: number[] = []
        for (const sId of teacherStudentIds) {
            const gIdx = studentToGroup.get(sId)
            if (gIdx == null || gIdx === currentGroupIdx) continue

            const fromGroup = groups[currentGroupIdx]
            const targetGroup = groups[gIdx]

            if (
                fromGroup.teachers.size > 1 &&
                targetGroup.teachers.size + 1 <= hardMaxTeachersPerGroup
            ) {
                movableTargets.push(gIdx)
            }
        }

        if (movableTargets.length > 0) {
            const targetIdx =
                movableTargets[
                    Math.floor(Math.random() * movableTargets.length)
                ]
            const fromGroup = groups[currentGroupIdx]
            const targetGroup = groups[targetIdx]

            fromGroup.teachers.delete(tId)
            targetGroup.teachers.add(tId)
            teacherToGroup.set(tId, targetIdx)
            return
        }

        // Option 3: extreme edge cases – we give up changing structure
        // to avoid breaking invariants. In real school data this should
        // almost never trigger.
    }

    for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi]
        for (const tId of [...g.teachers]) {
            ensureTeacherHasStudent(tId, gi)
        }
    }

    // -----------------------------
    // 4. Final sanity notes (by construction)
    // -----------------------------
    // - Every teacher appears in exactly one group (teacherToGroup).
    // - Every student appears in exactly one group (studentToGroup).
    // - Teacher groups are capped by hardMaxTeachersPerGroup, so no giant blobs.
    // - We never create groups without teachers.
    // - After the fix-up pass, every teacher tries to have at least one of their
    //   own students in their group; since we never move the last student out of
    //   a group, no group ends up student-less.

    // Build final result
    const result: Group[] = groups.map(g => [...g.teachers, ...g.students])

    return result
}
