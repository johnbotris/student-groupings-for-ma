import type { Brand } from "./brand.ts"

export type TeacherId = Brand<string, "TeacherId">

export function teacherId(id: string): TeacherId {
    return id as TeacherId
}
