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
    const [state, setState] = useState(defaultValue)

    useEffect(() => {
        const stored = localStorage.getItem(key)
        if (stored) {
            setState(
                serialization
                    ? (serialization.deserialize(stored) as T)
                    : (JSON.parse(stored) as T),
            )
        }
    }, [key])

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
    }, [state])

    return [state, setState] as const
}
