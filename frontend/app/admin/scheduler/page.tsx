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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowUp, ArrowDown, Calendar, BookOpen, Edit2, Trash2, StickyNote } from "lucide-react"
import { OpenTimeslotsDialog } from "@/components/admin/open-timeslots-dialog"
import { BookTimeslotDialog } from "@/components/admin/book-timeslot-dialog"
import { EditTimeslotDialog } from "@/components/admin/edit-timeslot-dialog"
import { MassTimeslotDialog } from "@/components/admin/mass-timeslot-dialog"
import { TimeslotNotesDialog } from "@/components/admin/timeslot-notes-dialog"
import { Checkbox } from "@/components/ui/checkbox"

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

type SortColumn = "timeslot" | "name" | "email" | "purpose" | "status"
type SortDirection = "asc" | "desc"

function sortScheduler(
  scheduler: Array<{
    id: number;
    timeslot: string;
    name: string;
    email: string;
    purpose: string | null;
    notes: string | null;
    admin_notes: string | null;
    employee_name: string | null;
    instructor_id: string | null;
  }>,
  column: SortColumn,
  direction: SortDirection
) {
  return [...scheduler].sort((a, b) => {
    let aValue: string | number | boolean
    let bValue: string | number | boolean

    switch (column) {
      case "timeslot":
        aValue = new Date(a.timeslot).getTime()
        bValue = new Date(b.timeslot).getTime()
        break
      case "name":
        aValue = (a.name || "").toLowerCase()
        bValue = (b.name || "").toLowerCase()
        break
      case "email":
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      case "purpose":
        aValue = (a.purpose || "").toLowerCase()
        bValue = (b.purpose || "").toLowerCase()
        break
      case "status":
        aValue = a.instructor_id ? 1 : 0
        bValue = b.instructor_id ? 1 : 0
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

function groupByDay(
  scheduler: Array<{
    id: number;
    timeslot: string;
    name: string;
    email: string;
    purpose: string | null;
    notes: string | null;
    admin_notes: string | null;
    employee_name: string | null;
    instructor_id: string | null;
  }>
): Array<{ date: string; items: typeof scheduler }> {
  const grouped = new Map<string, typeof scheduler>()
  
  scheduler.forEach((item) => {
    const date = new Date(item.timeslot)
    const dateKey = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)!.push(item)
  })
  
  return Array.from(grouped.entries())
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => new Date(a.timeslot).getTime() - new Date(b.timeslot).getTime()),
    }))
    .sort((a, b) => new Date(a.items[0].timeslot).getTime() - new Date(b.items[0].timeslot).getTime())
}

export default function AdminSchedulerPage() {
  const { scheduler, isLoading, error, refetch, deleteTimeslot, batchDeleteTimeslots } = useAdmin()
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("timeslot")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc")
  const [openTimeslotsOpen, setOpenTimeslotsOpen] = React.useState(false)
  const [bookDialogOpen, setBookDialogOpen] = React.useState(false)
  const [massDialogOpen, setMassDialogOpen] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [editingTimeslot, setEditingTimeslot] = React.useState<number | null>(null)
  const [notesTimeslot, setNotesTimeslot] = React.useState<number | null>(null)

  const sortedScheduler = React.useMemo(() => {
    return sortScheduler(scheduler, sortColumn, sortDirection)
  }, [scheduler, sortColumn, sortDirection])

  const groupedScheduler = React.useMemo(() => {
    const grouped = groupByDay(sortedScheduler as Array<{
      id: number;
      timeslot: string;
      name: string;
      email: string;
      purpose: string | null;
      notes: string | null;
      admin_notes: string | null;
      employee_name: string | null;
      instructor_id: string | null;
    }>)
    
    // Filter out past dates - only show today and future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of today
    
    return grouped.filter((group) => {
      if (group.items.length === 0) return false
      const firstItemDate = new Date(group.items[0].timeslot)
      firstItemDate.setHours(0, 0, 0, 0) // Set to start of day for comparison
      return firstItemDate >= today
    })
  }, [sortedScheduler])

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
      setSelectedIds(new Set(sortedScheduler.map((item) => item.id)))
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
    if (!confirm("Are you sure you want to delete this timeslot?")) {
      return
    }
    try {
      await deleteTimeslot(id)
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} timeslots?`)) {
      return
    }
    try {
      await batchDeleteTimeslots(Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch (e) {
      console.error("Failed to batch delete:", e)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scheduler</h1>
          <p className="text-muted-foreground text-sm">
            Manage timeslots and bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenTimeslotsOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Open Timeslots
          </Button>
          <Button onClick={() => setMassDialogOpen(true)} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Mass Create
          </Button>
          <Button onClick={() => setBookDialogOpen(true)} variant="outline">
            <BookOpen className="mr-2 h-4 w-4" />
            Book
          </Button>
        </div>
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
          <CardTitle>All Scheduler Entries</CardTitle>
          <CardDescription>
            View all timeslots and their booking status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Loading scheduler...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-destructive">
              Error: {error}
            </div>
          )}

          {!isLoading && !error && scheduler.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No scheduler entries found
            </div>
          )}

          {!isLoading && !error && scheduler.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === sortedScheduler.length && sortedScheduler.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("timeslot")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Timeslot
                      {sortColumn === "timeslot" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Status
                      {sortColumn === "status" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
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
                      onClick={() => handleSort("purpose")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Purpose
                      {sortColumn === "purpose" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedScheduler.map((group) => (
                  <React.Fragment key={group.date}>
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={8} className="font-semibold">
                        {group.date}
                      </TableCell>
                    </TableRow>
                    {group.items.map((item) => {
                      const hasInstructorNotes = item.notes && item.notes.trim() !== ""
                      return (
                        <TableRow key={item.id}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatDate(item.timeslot)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.instructor_id ? "default" : "outline"}>
                              {item.instructor_id ? "Booked" : "Open"}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.name || "-"}</TableCell>
                          <TableCell>{item.email || "-"}</TableCell>
                          <TableCell>
                            {item.purpose ? (
                              <Badge variant="secondary">{item.purpose}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{item.employee_name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTimeslot(item.id)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setNotesTimeslot(item.id)}
                                className="relative"
                              >
                                <StickyNote className="h-4 w-4" />
                                {hasInstructorNotes && (
                                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OpenTimeslotsDialog
        open={openTimeslotsOpen}
        onOpenChange={setOpenTimeslotsOpen}
        onSuccess={() => {
          void refetch()
          setOpenTimeslotsOpen(false)
        }}
      />

      <MassTimeslotDialog
        open={massDialogOpen}
        onOpenChange={setMassDialogOpen}
        onSuccess={() => {
          void refetch()
          setMassDialogOpen(false)
        }}
      />

      <BookTimeslotDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        onSuccess={() => {
          void refetch()
          setBookDialogOpen(false)
        }}
      />

      {editingTimeslot !== null && (
        <EditTimeslotDialog
          open={editingTimeslot !== null}
          onOpenChange={(open) => {
            if (!open) setEditingTimeslot(null)
          }}
          timeslot={scheduler.find((t) => t.id === editingTimeslot)!}
          onSuccess={() => {
            // State updated optimistically, no refetch needed
            setEditingTimeslot(null)
          }}
        />
      )}

      {notesTimeslot !== null && (
        <TimeslotNotesDialog
          open={notesTimeslot !== null}
          onOpenChange={(open) => {
            if (!open) setNotesTimeslot(null)
          }}
          timeslot={scheduler.find((t) => t.id === notesTimeslot)!}
          onSuccess={() => {
            // State updated optimistically, no refetch needed
            setNotesTimeslot(null)
          }}
        />
      )}
    </div>
  )
}
