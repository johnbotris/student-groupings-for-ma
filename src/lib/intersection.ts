export function intersection<T extends string>([first, ...rest]: ReadonlyArray<
    ReadonlyArray<T>
>): T[] {
    if (!first) return []

    if (!rest.length) return [...first]

    return first.filter(item => rest.every(arr => arr.includes(item)))
}
