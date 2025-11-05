import type { TeacherId } from "./teacherId.ts"
import type { StudentId } from "./studentId.ts"

export type Pairing = readonly [TeacherId, StudentId]
