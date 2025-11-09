export function cloneMapOfSets<TMap, TSet>(
    map: ReadonlyMap<TMap, ReadonlySet<TSet>>,
): Map<TMap, Set<TSet>> {
    const result: Map<TMap, Set<TSet>> = new Map()
    for (const [key, value] of map.entries()) {
        result.set(key, new Set(value))
    }
    return result
}
