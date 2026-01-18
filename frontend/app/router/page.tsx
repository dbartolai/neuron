"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import H1 from "@/components/primitives/h1"

export default function RouterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setIsAuthenticated(false)
          setIsLoading(false)
          return
        }

        setIsAuthenticated(true)

        // Fetch user role
        const token = await getAccessToken()
        const res = await fetch(`${getApiUrl()}/users/role`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          console.error("Failed to fetch user role")
          setIsLoading(false)
          return
        }

        const role = await res.json()

        // Redirect based on role
        if (role === "student") {
          router.replace("/chat")
        } else if (role === "instructor") {
          router.replace("/instructor")
        } else if (role === "admin") {
          router.replace("/admin")
        } else {
          // Fallback to chat if role is unknown
          console.warn(`Unknown role: ${role}, redirecting to /chat`)
          router.replace("/chat")
        }
      } catch (error) {
        console.error("Error in router:", error)
        setIsLoading(false)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  // Show 401 if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <H1 text="401 Unauthorized" />
      </div>
    )
  }

  // This should not be reached, but just in case
  return null
}
