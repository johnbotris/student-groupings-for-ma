import { useEffect, useState } from "react"

interface UseLocalStorageOpts<T> {
    readonly defaultValue?: T
    readonly serialization?: {
        readonly serialize: (obj: T) => string
        readonly deserialize: (str: string) => T
    }
}

export function useLocalStorage<T>(
    key: string,
    opts: { defaultValue: T } & UseLocalStorageOpts<T>,
): [T, (newState: T) => void]

export function useLocalStorage<T>(
    key: string,
    opts?: UseLocalStorageOpts<T>,
): [T | null, (newState: T) => void]

export function useLocalStorage<T>(
    key: string,
    { defaultValue, serialization }: UseLocalStorageOpts<T> = {},
) {
    const [state, _setState] = useState<T | null>(defaultValue ?? null)

    useEffect(() => {
        const stored = localStorage.getItem(key)
        if (stored) {
            _setState(
                serialization
                    ? (serialization.deserialize(stored) as T)
                    : (JSON.parse(stored) as T),
            )
        }
    }, [key])

    function setState(newState: T) {
        if (newState != null) {
            localStorage.setItem(
                key,
                serialization
                    ? serialization.serialize(newState)
                    : JSON.stringify(newState),
            )
        } else {
            localStorage.removeItem(key)
        }

        _setState(newState)
    }

    return [state, setState] as [typeof state, typeof _setState]
}
