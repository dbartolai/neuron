"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
  initialValue?: string
  loading?: boolean
}

export function TopicForm({ onSubmit, onCancel, initialValue = "", loading = false }: Props) {
  const [name, setName] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Topic name is required")
      return
    }

    try {
      await onSubmit(name.trim())
      setName("")
    } catch (e: any) {
      setError(e?.message || "Failed to save topic")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialValue ? "Edit Topic" : "Create Topic"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Topic Name</Label>
            <Input
              id="topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Data Structures"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initialValue ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
