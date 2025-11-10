export function removeFrom<T>(arr: T[], item: T) {
    const idx = arr.indexOf(item)
    if (idx >= 0) {
        arr.splice(idx, 1)
    }
}
