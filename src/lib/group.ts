import type { TeacherId } from "./teacherId.ts"
import type { StudentId } from "./studentId.ts"

export type Group = (TeacherId | StudentId)[]
