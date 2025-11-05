import type { StudentId } from "./studentId.ts"
import type { Pairing } from "./pairing.ts"
import type { TeacherId } from "./teacherId.ts"

export interface WorkbookData {
    students: StudentId[]
    teachers: TeacherId[]
    pairings: Pairing[]
}
