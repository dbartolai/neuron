"use client"

import { useAdmin } from "@/hooks/use-admin"
import Muted from "@/components/primitives/muted"
import H1 from "@/components/primitives/h1"

export default function AdminPage() {
  const { user, isLoading } = useAdmin()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col  items-center justify-center w-full h-full">
      <H1 text={`Hello, ${user?.name || "Admin"}`} />
    </div>
  )
}
