export function findMax<T>(
    arr: T[],
    getValue: (t: T) => number,
): T | undefined {
    let best: T | undefined = undefined
    let min = Number.NEGATIVE_INFINITY

    for (const item of arr) {
        const value = getValue(item)
        if (value > min) {
            best = item
            min = value
        }
    }

    return best
}
