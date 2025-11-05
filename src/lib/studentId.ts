import type { Brand } from "./brand.ts"

export type StudentId = Brand<string, "StudentId">

export function studentId(id: string): StudentId {
    return id as StudentId
}
