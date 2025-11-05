export function intersection<T>(...[first, ...rest]: T[][]): T[] {
    if (!first) return []

    if (!rest.length) return first

    return first.filter((item) => rest.every((arr) => arr.includes(item)))
}
