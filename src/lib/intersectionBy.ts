export function intersectionBy<T>(
    [first, ...rest]: ReadonlyArray<ReadonlyArray<T>>,
    getKey: (val: T) => string,
): T[] {
    if (!first) return []

    if (!rest.length) return [...first]

    return first.filter(item1 =>
        rest.every(otherArray =>
            otherArray.some(item2 => getKey(item1) === getKey(item2)),
        ),
    )
}
