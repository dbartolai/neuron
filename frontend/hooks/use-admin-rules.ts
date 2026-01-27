"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { CourseRules, RuleObject } from "@/hooks/use-course-rules"

export function useAdminRules(threadType: string) {
  const [rules, setRules] = useState<CourseRules | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = async () => {
    if (!threadType) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/rules/defaults/${threadType}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 404) {
          setRules(null)
          return
        }
        throw new Error("Failed to fetch rules")
      }

      const data = await res.json()
      setRules(data)
    } catch (e: any) {
      setError(e?.message || "Failed to fetch rules")
    } finally {
      setLoading(false)
    }
  }

  const updateRules = async (updatedRules: Partial<CourseRules>) => {
    if (!threadType) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/rules/defaults/${threadType}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedRules),
      })

      if (!res.ok) {
        throw new Error("Failed to update rules")
      }

      const data = await res.json()
      setRules(data)
      return data
    } catch (e: any) {
      setError(e?.message || "Failed to update rules")
      throw e
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [threadType])

  return {
    rules,
    loading,
    error,
    refetch: fetchRules,
    updateRules,
  }
}
