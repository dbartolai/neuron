"use client"

import { useState, useEffect, useCallback } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export interface ReactionCounts {
    thumbs_up: number
    thumbs_down: number
    question: number
    exclamation: number
    celebration: number
}

export interface ReactionResponse {
    counts: ReactionCounts
    user_reaction: string | null
}

export type ReactionType = "thumbs_up" | "thumbs_down" | "question" | "exclamation" | "celebration"

export interface UseReactionsResponse {
    counts: ReactionCounts
    userReaction: string | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    addReaction: (reactionType: ReactionType) => Promise<void>
    removeReaction: () => Promise<void>
}

export function useReactions(announcementId: string): UseReactionsResponse {
    const [counts, setCounts] = useState<ReactionCounts>({
        thumbs_up: 0,
        thumbs_down: 0,
        question: 0,
        exclamation: 0,
        celebration: 0,
    })
    const [userReaction, setUserReaction] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchReactions = useCallback(async () => {
        if (!announcementId) return

        setIsLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/student/announcements/${announcementId}/reactions`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch reactions: ${res.statusText}`)
            }

            const data: ReactionResponse = await res.json()
            setCounts(data.counts)
            setUserReaction(data.user_reaction)
        } catch (e: any) {
            console.error("Error fetching reactions:", e)
            setError(e?.message || "Failed to fetch reactions")
        } finally {
            setIsLoading(false)
        }
    }, [announcementId])

    useEffect(() => {
        fetchReactions()
    }, [fetchReactions])

    const removeReaction = useCallback(async (): Promise<void> => {
        if (!userReaction) return

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/student/announcements/${announcementId}/reactions`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to remove reaction: ${res.statusText}`)
            }

            // Optimistically update
            const oldReaction = userReaction
            setUserReaction(null)
            setCounts((prev) => ({
                ...prev,
                [oldReaction]: Math.max(0, prev[oldReaction as keyof ReactionCounts] - 1),
            }))

            // Refetch to ensure consistency
            await fetchReactions()
        } catch (e: any) {
            console.error("Error removing reaction:", e)
            // Revert optimistic update on error
            await fetchReactions()
            throw e
        }
    }, [announcementId, userReaction, fetchReactions])

    const addReaction = useCallback(async (reactionType: ReactionType): Promise<void> => {
        // If clicking the same reaction, remove it instead
        if (userReaction === reactionType) {
            await removeReaction()
            return
        }

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/student/announcements/${announcementId}/reactions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    reaction_type: reactionType,
                }),
            })

            if (!res.ok) {
                throw new Error(`Failed to add reaction: ${res.statusText}`)
            }

            // Optimistically update
            // Remove old reaction count if exists
            if (userReaction) {
                setCounts((prev) => ({
                    ...prev,
                    [userReaction]: Math.max(0, prev[userReaction as keyof ReactionCounts] - 1),
                }))
            }
            // Add new reaction
            setUserReaction(reactionType)
            setCounts((prev) => ({
                ...prev,
                [reactionType]: prev[reactionType] + 1,
            }))

            // Refetch to ensure consistency
            await fetchReactions()
        } catch (e: any) {
            console.error("Error adding reaction:", e)
            // Revert optimistic update on error
            await fetchReactions()
            throw e
        }
    }, [announcementId, userReaction, fetchReactions, removeReaction])

    return {
        counts,
        userReaction,
        isLoading,
        error,
        refetch: fetchReactions,
        addReaction,
        removeReaction,
    }
}
