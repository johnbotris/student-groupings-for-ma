import { useState } from "react"

export function useSelection<T>(initialValue: T[] = []) {
    const [selection, setSelection] = useState<readonly T[]>(initialValue)

    function select(item: T) {
        setSelection([...selection, item])
    }

    function unselect(item: T) {
        setSelection(selection.filter(i => i !== item))
    }

    function clear() {
        setSelection([])
    }

    function toggleSelect(item: T) {
        if (selection.includes(item)) {
            unselect(item)
        } else {
            select(item)
        }
    }

    return { selection, select, unselect, clear, toggleSelect }
}
