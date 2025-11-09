export function count<T>(arr: T[], predicate: (t: T) => boolean): number {
    let n = 0
    for (const val of arr) {
        if (predicate(val)) {
            n++
        }
    }
    return n
}
