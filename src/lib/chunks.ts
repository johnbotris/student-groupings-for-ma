export function chunks<T>(arr: readonly T[], chunkSize: number): T[][] {
    const result: T[][] = [[]]

    for (const item of arr) {
        if (result.at(-1)!.length >= chunkSize) {
            result.push([])
        }

        result.at(-1)!.push(item)
    }

    return result
}
