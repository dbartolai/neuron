"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export function useCourseTopics(courseId: string) {
  const [topics, setTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTopics = async () => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/topics`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 404) {
          setTopics([])
          return
        }
        throw new Error("Failed to fetch topics")
      }

      const data = await res.json()
      setTopics(data.topics || [])
    } catch (e: any) {
      setError(e?.message || "Failed to fetch topics")
    } finally {
      setLoading(false)
    }
  }

  const createTopic = async (name: string) => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/topics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to create topic")
      }

      const data = await res.json()
      setTopics(data.topics || [])
      return data.topics
    } catch (e: any) {
      setError(e?.message || "Failed to create topic")
      throw e
    } finally {
      setLoading(false)
    }
  }

  const updateTopic = async (oldName: string, newName: string) => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/topics`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ old_name: oldName, new_name: newName }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to update topic")
      }

      const data = await res.json()
      setTopics(data.topics || [])
      return data.topics
    } catch (e: any) {
      setError(e?.message || "Failed to update topic")
      throw e
    } finally {
      setLoading(false)
    }
  }

  const deleteTopic = async (name: string) => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/topics`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to delete topic")
      }

      const data = await res.json()
      setTopics(data.topics || [])
      return data.topics
    } catch (e: any) {
      setError(e?.message || "Failed to delete topic")
      throw e
    } finally {
      setLoading(false)
    }
  }

  const generateFromSyllabus = async (fileId: string) => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/topics/generate-from-syllabus`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: fileId }),
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to generate topics from syllabus")
      }

      const data = await res.json()
      return data.suggested_topics || []
    } catch (e: any) {
      setError(e?.message || "Failed to generate topics from syllabus")
      throw e
    } finally {
      setLoading(false)
    }
  }

  const reclassifyThreads = async () => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/topics/reclassify-threads`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to reclassify threads")
      }

      const data = await res.json()
      return data
    } catch (e: any) {
      setError(e?.message || "Failed to reclassify threads")
      throw e
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [courseId])

  return {
    topics,
    loading,
    error,
    refetch: fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    generateFromSyllabus,
    reclassifyThreads,
  }
}
