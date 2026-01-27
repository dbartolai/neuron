"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Topic Name</TableHead>
          <TableHead>Thread Count</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topics.map((topic) => (
          <TableRow key={topic.name}>
            <TableCell className="font-medium">{topic.name}</TableCell>
            <TableCell>
              {topic.count !== undefined ? (
                <Badge variant="secondary">
                  {topic.count} {topic.count === 1 ? "thread" : "threads"}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(topic.name)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(topic.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
