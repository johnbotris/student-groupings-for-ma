export function shuffle<T>(array: Iterable<T> | ArrayLike<T>): T[] {
    const result = Array.from(array)
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]] // swap
    }
    return result
}
