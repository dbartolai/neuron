"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export type RuleType = "REQUEST" | "REQUIRE" | "DENY" | "ALLOW"

export interface RuleObject {
  type: RuleType
  content: string
}

export interface CourseRules {
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

export function useCourseRules(courseId: string, ruleType: string) {
  const [rules, setRules] = useState<CourseRules | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = async () => {
    if (!courseId || !ruleType) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/rules/${ruleType}`, {
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
    if (!courseId || !ruleType) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/rules/${ruleType}`, {
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

  const resetToDefault = async (level: number) => {
    if (!courseId || !ruleType) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/rules/${ruleType}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level }),
      })

      if (!res.ok) {
        throw new Error("Failed to reset rules")
      }

      const data = await res.json()
      setRules(data)
      return data
    } catch (e: any) {
      setError(e?.message || "Failed to reset rules")
      throw e
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [courseId, ruleType])

  return {
    rules,
    loading,
    error,
    refetch: fetchRules,
    updateRules,
    resetToDefault,
  }
}
