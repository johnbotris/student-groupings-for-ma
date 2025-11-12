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
    defaultValue: T,
    { serialization }: UseLocalStorageOpts<T> = {},
) {
    const stored = localStorage.getItem(key)
    const [state, setState] = useState(
        stored
            ? serialization
                ? (serialization.deserialize(stored) as T)
                : (JSON.parse(stored) as T)
            : defaultValue,
    )

    useEffect(() => {
        if (state != null) {
            localStorage.setItem(
                key,
                serialization
                    ? serialization.serialize(state)
                    : JSON.stringify(state),
            )
        } else {
            localStorage.removeItem(key)
        }
    }, [key, serialization, state])

    return [state, setState] as const
}
