"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"

interface TagEditorProps {
  courseId: string
  tags: string[]
  onUpdate: (tags: string[]) => Promise<void>
}

export function TagEditor({ tags: initialTags, onUpdate }: TagEditorProps) {
  // Ensure we always have exactly 10 tags
  const paddedTags = initialTags.length === 10 
    ? initialTags 
    : [...initialTags, ...Array(Math.max(0, 10 - initialTags.length)).fill("")]
  const [tags, setTags] = useState<string[]>(paddedTags)
  const [saving, setSaving] = useState(false)

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags]
    newTags[index] = value
    setTags(newTags)
  }

  const handleRemoveTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index)
    // Ensure we have 10 tags
    while (newTags.length < 10) {
      newTags.push("")
    }
    setTags(newTags)
  }

  const handleAddTag = () => {
    const emptyIndex = tags.findIndex(tag => tag === "")
    if (emptyIndex !== -1) {
      // Focus on empty tag instead of adding new one
      return
    }
    // If all tags are filled, we can't add more (max 10)
  }

  const handleSave = async () => {
    // Filter out empty tags and ensure we have exactly 10
    const validTags = tags.filter(tag => tag.trim() !== "")
    if (validTags.length !== 10) {
      alert("You must have exactly 10 tags")
      return
    }

    setSaving(true)
    try {
      await onUpdate(validTags)
    } catch (e) {
      console.error("Failed to update tags", e)
      alert("Failed to update tags")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Tags</CardTitle>
        <CardDescription>
          Modify the topic tags. You must have exactly 10 tags. All threads will be automatically reclassified when you save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-2">
            <Label htmlFor={`tag-${index}`} className="w-12 text-sm">
              Tag {index + 1}
            </Label>
            <Input
              id={`tag-${index}`}
              value={tag}
              onChange={(e) => handleTagChange(index, e.target.value)}
              placeholder={`Tag ${index + 1}`}
              className="flex-1"
            />
            {tags.length > 10 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTag(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              const paddedTags = initialTags.length === 10 
                ? initialTags 
                : [...initialTags, ...Array(Math.max(0, 10 - initialTags.length)).fill("")]
              setTags(paddedTags)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving & Reclassifying..." : "Save Tags"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
