"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export interface InsightsStatus {
    total_threads: number
    is_unlocked: boolean
    thread_tags: string[] | null
}

export interface TagStatistics {
    tag: string
    count: number
    percentage: number
}

export interface ThreadWithTag {
    id: string
    title: string
    thread_tag: string | null
}

export interface UseInsightsResponse {
    status: InsightsStatus | null
    tagStatistics: TagStatistics[]
    loading: boolean
    error: string | null
    unlockInsights: () => Promise<void>
    updateTags: (tags: string[], reclassify?: boolean) => Promise<void>
    updateThreadTag: (threadId: string, tag: string) => Promise<void>
    refresh: () => Promise<void>
}

export function useInsights(courseId: string, limit?: number): UseInsightsResponse {
    const [status, setStatus] = useState<InsightsStatus | null>(null)
    const [tagStatistics, setTagStatistics] = useState<TagStatistics[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchStatus = async () => {
        if (!courseId) return

        try {
            const token = await getAccessToken()
            const res = await fetch(
                `${getApiUrl()}/instructor/courses/${courseId}/insights/status`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!res.ok) {
                throw new Error("Failed to fetch insights status")
            }

            const data: InsightsStatus = await res.json()
            setStatus(data)
        } catch (e: any) {
            setError(e?.message || "Failed to fetch insights status")
        }
    }

    const fetchTagStatistics = async (forceUnlocked?: boolean) => {
        const shouldFetch = forceUnlocked !== undefined ? forceUnlocked : status?.is_unlocked
        if (!courseId || !shouldFetch) return

        try {
            const token = await getAccessToken()
            const url = limit
                ? `${getApiUrl()}/instructor/courses/${courseId}/insights/tags?limit=${limit}`
                : `${getApiUrl()}/instructor/courses/${courseId}/insights/tags`
            
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error("Failed to fetch tag statistics")
            }

            const data: TagStatistics[] = await res.json()
            setTagStatistics(data)
        } catch (e: any) {
            setError(e?.message || "Failed to fetch tag statistics")
        }
    }

    const unlockInsights = async () => {
        if (!courseId) return

        setLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const res = await fetch(
                `${getApiUrl()}/instructor/courses/${courseId}/insights/unlock`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Failed to unlock insights")
            }

            // Refresh status - useEffect will handle fetching statistics
            await fetchStatus()
            // Also fetch statistics immediately since we know it's unlocked now
            await fetchTagStatistics(true)
        } catch (e: any) {
            setError(e?.message || "Failed to unlock insights")
        } finally {
            setLoading(false)
        }
    }

    const updateTags = async (tags: string[], reclassify: boolean = false) => {
        if (!courseId) return

        setLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const res = await fetch(
                `${getApiUrl()}/instructor/courses/${courseId}/insights/tags`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ tags, reclassify }),
                }
            )

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Failed to update tags")
            }

            // Refresh status and statistics
            await fetchStatus()
            await fetchTagStatistics(true)
        } catch (e: any) {
            setError(e?.message || "Failed to update tags")
        } finally {
            setLoading(false)
        }
    }

    const updateThreadTag = async (threadId: string, tag: string) => {
        if (!courseId) return

        setLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const res = await fetch(
                `${getApiUrl()}/instructor/courses/${courseId}/insights/threads/${threadId}/tag`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ tag }),
                }
            )

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Failed to update thread tag")
            }

            // Refresh statistics
            await fetchTagStatistics()
        } catch (e: any) {
            setError(e?.message || "Failed to update thread tag")
        } finally {
            setLoading(false)
        }
    }

  const refresh = async () => {
    await fetchStatus()
    // Fetch statistics if unlocked (useEffect will also handle this, but this ensures immediate update)
    if (status?.is_unlocked) {
      await fetchTagStatistics()
    }
  }

    useEffect(() => {
        fetchStatus()
    }, [courseId])

    useEffect(() => {
        if (status?.is_unlocked) {
            fetchTagStatistics()
        }
    }, [status?.is_unlocked, courseId, limit])

    return {
        status,
        tagStatistics,
        loading,
        error,
        unlockInsights,
        updateTags,
        updateThreadTag,
        refresh,
    }
}
