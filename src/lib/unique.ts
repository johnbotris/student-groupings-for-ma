export function unique<T extends string>(arr: readonly T[]): T[] {
    return [...new Set(arr)]
}
