"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAccessToken, supabase } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

enum ProfileRole {
  STUDENT = "student",
  INSTRUCTOR = "instructor",
  ADMIN = "admin",
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()

        if (userErr) throw userErr

        if (!user) {
          router.replace("/login")
          return
        }

        const token = await getAccessToken()

        const res = await fetch(`${getApiUrl()}/users/role`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          throw new Error("error getting role")
        }

        const role: ProfileRole = await res.json()

        if (cancelled) return

        if (role === ProfileRole.STUDENT) router.replace("/chat")
        else if (role === ProfileRole.INSTRUCTOR) router.replace("/instructor")
        else if (role === ProfileRole.ADMIN) router.replace("/chat")
        else router.replace("/login")
      } catch (e) {
        // fall back to login on any error
        if (!cancelled) router.replace("/login")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [router])

  // Optional: show nothing or a loader while redirecting
  if (loading) return null
  return null
}
