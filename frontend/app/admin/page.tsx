"use client"

import { useAdmin } from "@/hooks/use-admin"

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
    <div className="p-8">
      <h1 className="font-serif text-4xl">
        Hello, {user?.name || "Admin"}
      </h1>
    </div>
  )
}
