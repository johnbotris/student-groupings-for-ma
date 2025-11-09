export function findMin<T>(
    arr: T[],
    getValue: (t: T) => number,
): T | undefined {
    let best: T | undefined = undefined
    let min = Number.POSITIVE_INFINITY

    for (const item of arr) {
        const value = getValue(item)
        if (value < min) {
            best = item
            min = value
        }
    }

    return best
}
