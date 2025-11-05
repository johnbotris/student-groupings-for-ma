export function pickRandom<T>(arr: T[]): T | undefined {
    const idx = Math.floor(Math.random() * arr.length)

    return arr.at(idx)
}
