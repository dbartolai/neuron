"use client"

import { useState, useEffect, useCallback } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export interface UseUnseenCountResponse {
    count: number
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useUnseenCount(courseId: string): UseUnseenCountResponse {
    const [count, setCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCount = useCallback(async () => {
        if (!courseId) return

        setIsLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/student/courses/${courseId}/announcements/unseen-count`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch unseen count: ${res.statusText}`)
            }

            const data = await res.json()
            setCount(data.count || 0)
        } catch (e: any) {
            console.error("Error fetching unseen count:", e)
            setError(e?.message || "Failed to fetch unseen count")
        } finally {
            setIsLoading(false)
        }
    }, [courseId])

    useEffect(() => {
        fetchCount()
    }, [fetchCount])

    return {
        count,
        isLoading,
        error,
        refetch: fetchCount,
    }
}

export async function markAsSeen(announcementId: string): Promise<void> {
    try {
        const token = await getAccessToken()
        const res = await fetch(`${getApiUrl()}/student/announcements/${announcementId}/seen`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!res.ok) {
            throw new Error(`Failed to mark announcement as seen: ${res.statusText}`)
        }
    } catch (e: any) {
        console.error("Error marking announcement as seen:", e)
        throw e
    }
}

export async function markAllAsSeen(courseId: string): Promise<void> {
    try {
        const token = await getAccessToken()
        const res = await fetch(`${getApiUrl()}/student/courses/${courseId}/announcements/seen`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!res.ok) {
            throw new Error(`Failed to mark all announcements as seen: ${res.statusText}`)
        }
    } catch (e: any) {
        console.error("Error marking all announcements as seen:", e)
        throw e
    }
}
