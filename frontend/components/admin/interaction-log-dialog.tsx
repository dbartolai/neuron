"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdmin } from "@/hooks/use-admin"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit2, Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface InteractionLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outreachId: number
  outreachName: string
  outreachEmail: string
}

type Interaction = {
  id: string
  created_at: string
  type: string
  notes: string | null
  employee_id: string | null
  instructor_id: string | null
  outreach_id: number | null
  name: string | null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function InteractionLogDialog({
  open,
  onOpenChange,
  outreachId,
  outreachName,
  outreachEmail,
}: InteractionLogDialogProps) {
  const { getInteractions, createInteraction, updateInteraction, deleteInteraction } = useAdmin()
  const [interactions, setInteractions] = React.useState<Interaction[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [formData, setFormData] = React.useState({
    type: "email",
    notes: "",
    name: "",
  })
  const [editFormData, setEditFormData] = React.useState({
    notes: "",
    type: "email",
  })
  const [error, setError] = React.useState<string | null>(null)

  const loadInteractions = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getInteractions(outreachId)
      setInteractions(data)
    } catch (e: any) {
      setError(e.message || "Failed to load interactions")
    } finally {
      setIsLoading(false)
    }
  }, [outreachId, getInteractions])

  React.useEffect(() => {
    if (open) {
      void loadInteractions()
      setShowForm(false)
      setEditingId(null)
      setFormData({ type: "email", notes: "", name: "" })
    }
  }, [open, loadInteractions])

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)
    try {
      await createInteraction({
        type: formData.type,
        notes: formData.notes || null,
        outreach_id: outreachId,
        name: formData.name || null,
      })
      setFormData({ type: "email", notes: "", name: "" })
      setShowForm(false)
      await loadInteractions()
    } catch (e: any) {
      setError(e.message || "Failed to create interaction")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = (interaction: Interaction) => {
    setEditingId(interaction.id)
    setEditFormData({
      notes: interaction.notes || "",
      type: interaction.type || "email",
    })
  }

  const handleUpdate = async (interactionId: string) => {
    setError(null)
    try {
      await updateInteraction(interactionId, editFormData)
      setEditingId(null)
      await loadInteractions()
    } catch (e: any) {
      setError(e.message || "Failed to update interaction")
    }
  }

  const handleDelete = async (interactionId: string) => {
    if (!confirm("Are you sure you want to delete this interaction?")) {
      return
    }
    setError(null)
    try {
      await deleteInteraction(interactionId)
      await loadInteractions()
    } catch (e: any) {
      setError(e.message || "Failed to delete interaction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Interaction Log</DialogTitle>
          <DialogDescription>
            {outreachName} ({outreachEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded">
              {error}
            </div>
          )}

          {!showForm && !editingId && (
            <div className="mb-4">
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Interaction
              </Button>
            </div>
          )}

          {showForm && (
            <div className="mb-4 p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold">New Interaction</h3>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Interaction notes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading interactions...
            </div>
          ) : interactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No interactions yet. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    {editingId === interaction.id ? (
                      <>
                        <TableCell>{formatDate(interaction.created_at)}</TableCell>
                        <TableCell>
                          <Select
                            value={editFormData.type}
                            onValueChange={(value) =>
                              setEditFormData({ ...editFormData, type: value })
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="call">Call</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell colSpan={2}>
                          <Textarea
                            value={editFormData.notes}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, notes: e.target.value })
                            }
                            placeholder="Notes..."
                            rows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(interaction.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{formatDate(interaction.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{interaction.type}</Badge>
                        </TableCell>
                        <TableCell>{interaction.name || "-"}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate">{interaction.notes || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(interaction)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(interaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
