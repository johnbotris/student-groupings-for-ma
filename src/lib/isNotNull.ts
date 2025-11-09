export function isNotNull<T extends object>(
    obj: T | null | undefined,
): obj is T {
    return obj != null
}
