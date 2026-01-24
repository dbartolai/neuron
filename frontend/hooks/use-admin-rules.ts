"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { CourseRules, RuleObject } from "@/hooks/use-course-rules"

export interface LevelDefault {
  level_idx: number
  id: string
  goals?: string[]
  prompt_rules?: RuleObject[]
  output_rules?: RuleObject[]
  fallback_prompt?: string
  outputs?: string[]
  version_num?: number
  course_id?: string
  rule_type?: string
}

export function useAdminRules(threadType: string, levelIdx?: number) {
  const [rules, setRules] = useState<CourseRules | null>(null)
  const [defaults, setDefaults] = useState<LevelDefault[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = async () => {
    if (!threadType || levelIdx === undefined) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/rules/defaults/${threadType}/${levelIdx}`, {
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

  const fetchAllDefaults = async () => {
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
        throw new Error("Failed to fetch default rules")
      }

      const data = await res.json()
      setDefaults(data)
    } catch (e: any) {
      setError(e?.message || "Failed to fetch default rules")
    } finally {
      setLoading(false)
    }
  }

  const updateRules = async (updatedRules: Partial<CourseRules>) => {
    if (!threadType || levelIdx === undefined) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/rules/defaults/${threadType}/${levelIdx}`, {
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
    if (levelIdx !== undefined) {
      fetchRules()
    }
  }, [threadType, levelIdx])

  useEffect(() => {
    fetchAllDefaults()
  }, [threadType])

  return {
    rules,
    defaults,
    loading,
    error,
    refetch: fetchRules,
    refetchAll: fetchAllDefaults,
    updateRules,
  }
}
