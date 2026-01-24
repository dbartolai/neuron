"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TopicWithCount {
  name: string
  count?: number
}

interface Props {
  topics: TopicWithCount[]
  onEdit: (name: string) => void
  onDelete: (name: string) => void
}

export function TopicsList({ topics, onEdit, onDelete }: Props) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No topics yet. Create your first topic or generate from syllabus!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <Card key={topic.name}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{topic.name}</CardTitle>
                {topic.count !== undefined && (
                  <Badge variant="secondary">
                    {topic.count} {topic.count === 1 ? "thread" : "threads"}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(topic.name)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(topic.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
