"use client"

import { useState, useEffect, useCallback } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export interface AnnouncementFile {
    id: string
    course_id: string
    name: string
    supabase_filepath: string
    openai_file_id: string
    size: number
    mime_type: string
}

export interface Announcement {
    id: string
    course_id: string
    instructor_id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    files?: AnnouncementFile[]
}

export interface UseAnnouncementsResponse {
    announcements: Announcement[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    createAnnouncement: (title: string, content: string, fileIds?: string[]) => Promise<string>
    updateAnnouncement: (id: string, title?: string, content?: string, fileIds?: string[]) => Promise<void>
    deleteAnnouncement: (id: string) => Promise<void>
}

export function useAnnouncements(courseId: string, isInstructor: boolean = false): UseAnnouncementsResponse {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnnouncements = useCallback(async () => {
        if (!courseId) return

        setIsLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const endpoint = isInstructor
                ? `/instructor/courses/${courseId}/announcements`
                : `/student/courses/${courseId}/announcements`

            const res = await fetch(`${getApiUrl()}${endpoint}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch announcements: ${res.statusText}`)
            }

            const data: Announcement[] = await res.json()
            setAnnouncements(data)
        } catch (e: any) {
            console.error("Error fetching announcements:", e)
            setError(e?.message || "Failed to fetch announcements")
        } finally {
            setIsLoading(false)
        }
    }, [courseId, isInstructor])

    useEffect(() => {
        fetchAnnouncements()
    }, [fetchAnnouncements])

    const createAnnouncement = useCallback(async (title: string, content: string, fileIds?: string[]): Promise<string> => {
        if (!isInstructor) {
            throw new Error("Only instructors can create announcements")
        }

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/announcements`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    content,
                    file_ids: fileIds || null,
                }),
            })

            if (!res.ok) {
                throw new Error(`Failed to create announcement: ${res.statusText}`)
            }

            const data = await res.json()
            await fetchAnnouncements()
            return data.id
        } catch (e: any) {
            console.error("Error creating announcement:", e)
            throw e
        }
    }, [courseId, isInstructor, fetchAnnouncements])

    const updateAnnouncement = useCallback(async (id: string, title?: string, content?: string, fileIds?: string[]): Promise<void> => {
        if (!isInstructor) {
            throw new Error("Only instructors can update announcements")
        }

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/instructor/announcements/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: title !== undefined ? title : null,
                    content: content !== undefined ? content : null,
                    file_ids: fileIds !== undefined ? fileIds : null,
                }),
            })

            if (!res.ok) {
                throw new Error(`Failed to update announcement: ${res.statusText}`)
            }

            await fetchAnnouncements()
        } catch (e: any) {
            console.error("Error updating announcement:", e)
            throw e
        }
    }, [isInstructor, fetchAnnouncements])

    const deleteAnnouncement = useCallback(async (id: string): Promise<void> => {
        if (!isInstructor) {
            throw new Error("Only instructors can delete announcements")
        }

        try {
            const token = await getAccessToken()
            const res = await fetch(`${getApiUrl()}/instructor/announcements/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to delete announcement: ${res.statusText}`)
            }

            await fetchAnnouncements()
        } catch (e: any) {
            console.error("Error deleting announcement:", e)
            throw e
        }
    }, [isInstructor, fetchAnnouncements])

    return {
        announcements,
        isLoading,
        error,
        refetch: fetchAnnouncements,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
    }
}

export interface UseAnnouncementResponse {
    announcement: Announcement | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useAnnouncement(announcementId: string, isInstructor: boolean = false): UseAnnouncementResponse {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnnouncement = useCallback(async () => {
        if (!announcementId) return

        setIsLoading(true)
        setError(null)

        try {
            const token = await getAccessToken()
            const endpoint = isInstructor
                ? `/instructor/announcements/${announcementId}`
                : `/student/announcements/${announcementId}`

            const res = await fetch(`${getApiUrl()}${endpoint}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch announcement: ${res.statusText}`)
            }

            const data: Announcement = await res.json()
            setAnnouncement(data)
        } catch (e: any) {
            console.error("Error fetching announcement:", e)
            setError(e?.message || "Failed to fetch announcement")
        } finally {
            setIsLoading(false)
        }
    }, [announcementId, isInstructor])

    useEffect(() => {
        fetchAnnouncement()
    }, [fetchAnnouncement])

    return {
        announcement,
        isLoading,
        error,
        refetch: fetchAnnouncement,
    }
}
