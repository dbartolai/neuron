"use client"

import * as React from "react"
import { useAdmin } from "@/hooks/use-admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowUp, ArrowDown, Plus, Edit2, Trash2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddOutreachDialog } from "@/components/admin/add-outreach-dialog"
import { EditOutreachDialog } from "@/components/admin/edit-outreach-dialog"
import { InteractionLogDialog } from "@/components/admin/interaction-log-dialog"
import { Checkbox } from "@/components/ui/checkbox"

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type SortColumn = "name" | "email" | "role" | "created_at"
type SortDirection = "asc" | "desc"

function sortOutreach(
  outreach: Array<{
    id: number;
    name: string;
    email: string;
    role: string | null;
    notes: string | null;
    created_at: string;
    purpose: string | null;
  }>,
  column: SortColumn,
  direction: SortDirection
) {
  return [...outreach].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (column) {
      case "name":
        aValue = (a.name || "").toLowerCase()
        bValue = (b.name || "").toLowerCase()
        break
      case "email":
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      case "role":
        aValue = (a.role || "").toLowerCase()
        bValue = (b.role || "").toLowerCase()
        break
      case "created_at":
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      default:
        return 0
    }

    if (aValue < bValue) {
      return direction === "asc" ? -1 : 1
    }
    if (aValue > bValue) {
      return direction === "asc" ? 1 : -1
    }
    return 0
  })
}

export default function AdminOutreachPage() {
  const { outreach, isLoading, error, refetch, deleteOutreach, batchDeleteOutreach } = useAdmin()
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("created_at")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc")
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [editingOutreach, setEditingOutreach] = React.useState<number | null>(null)
  const [interactionOutreach, setInteractionOutreach] = React.useState<{
    id: number
    name: string
    email: string
  } | null>(null)

  const sortedOutreach = React.useMemo(() => {
    return sortOutreach(outreach, sortColumn, sortDirection)
  }, [outreach, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  React.useEffect(() => {
    void refetch()
  }, [refetch])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedOutreach.map((item) => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this outreach entry?")) {
      return
    }
    try {
      await deleteOutreach(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e) {
      console.error("Failed to delete:", e)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} outreach entries?`)) {
      return
    }
    try {
      await batchDeleteOutreach(Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch (e) {
      console.error("Failed to batch delete:", e)
    }
  }

  const handleRowClick = (item: typeof sortedOutreach[0]) => {
    setInteractionOutreach({
      id: item.id,
      name: item.name || "",
      email: item.email,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Outreach</h1>
          <p className="text-muted-foreground text-sm">
            Log outbound outreach interactions and communications
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Person
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Outbound Outreach</CardTitle>
          <CardDescription>
            View all outbound outreach entries logged by admins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Loading outreach...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-destructive">
              Error: {error}
            </div>
          )}

          {!isLoading && !error && outreach.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No outreach submissions found
            </div>
          )}

          {!isLoading && !error && outreach.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === sortedOutreach.length && sortedOutreach.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Name
                      {sortColumn === "name" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("email")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Email
                      {sortColumn === "email" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("role")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Interest
                      {sortColumn === "role" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Created At
                      {sortColumn === "created_at" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOutreach.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name || "-"}
                    </TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>
                      {item.role ? (
                        <Badge variant="secondary">{item.role}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      {item.purpose ? (
                        <Badge variant="outline">{item.purpose}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingOutreach(item.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRowClick(item)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddOutreachDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          void refetch()
          setAddDialogOpen(false)
        }}
      />

      {editingOutreach !== null && (
        <EditOutreachDialog
          open={editingOutreach !== null}
          onOpenChange={(open) => {
            if (!open) setEditingOutreach(null)
          }}
          outreach={outreach.find((o) => o.id === editingOutreach)!}
          onSuccess={() => {
            // State updated optimistically, no refetch needed
            setEditingOutreach(null)
          }}
        />
      )}

      {interactionOutreach && (
        <InteractionLogDialog
          open={interactionOutreach !== null}
          onOpenChange={(open) => {
            if (!open) setInteractionOutreach(null)
          }}
          outreachId={interactionOutreach.id}
          outreachName={interactionOutreach.name}
          outreachEmail={interactionOutreach.email}
        />
      )}
    </div>
  )
}
