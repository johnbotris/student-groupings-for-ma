export function calculateCombinations<TItem extends string>(
    items: TItem[],
    size: number,
): TItem[][] {
    if (size === 0) return [[]]
    if (size > items.length) return []

    const result: TItem[][] = []

    for (let i = 0; i <= items.length - size; i++) {
        const head = items[i]
        const tailCombinations = calculateCombinations(
            items.slice(i + 1),
            size - 1,
        )
        for (const combo of tailCombinations) {
            result.push([head, ...combo])
        }
    }

    return result
}
