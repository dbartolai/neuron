"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

const PUBLIC_ROUTES = ["/login", "/signup"];

export function AuthListener({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()


  useEffect(() => {
    // If on a protected route, immediately verify session and redirect if needed
    const checkSession = async () => {
      if (!PUBLIC_ROUTES.includes(pathname)) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace("/login")
        }
      }
    }

    checkSession()

    // Also listen for auth changes (logout/login) to keep routing in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const onPublic = PUBLIC_ROUTES.includes(pathname)
      if (!session && !onPublic) {
        router.replace("/login")
      }
      if (session && onPublic) {
        router.replace("/chat")
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  return <>{children}</>
}
