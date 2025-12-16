"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

const PUBLIC_ROUTES = ["/login", "/signup"];

export function AuthListener({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()


  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname)) return

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}
