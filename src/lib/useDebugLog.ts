import { useEffect } from "react"

export function useDebugLog(...args: any[]) {
    useEffect(() => console.debug(...args), args)
}
