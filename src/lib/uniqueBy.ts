export function uniqueBy<T, U>(
    arr: readonly T[],
    projection: (t: T) => U,
): T[] {
    const found = new Set<U>()
    return arr.filter(val => {
        const key = projection(val)
        if (found.has(key)) {
            return false
        }

        found.add(key)
        return true
    })
}
