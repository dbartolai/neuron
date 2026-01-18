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
import { ArrowUp, ArrowDown, Calendar, BookOpen } from "lucide-react"
import { OpenTimeslotsDialog } from "@/components/admin/open-timeslots-dialog"
import { BookTimeslotDialog } from "@/components/admin/book-timeslot-dialog"

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

type SortColumn = "timeslot" | "name" | "email" | "purpose" | "status"
type SortDirection = "asc" | "desc"

function sortScheduler(
  scheduler: Array<{
    id: number;
    timeslot: string;
    name: string;
    email: string;
    purpose: string | null;
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

export default function AdminSchedulerPage() {
  const { scheduler, isLoading, error, refetch } = useAdmin()
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("timeslot")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc")
  const [openTimeslotsOpen, setOpenTimeslotsOpen] = React.useState(false)
  const [bookDialogOpen, setBookDialogOpen] = React.useState(false)

  const sortedScheduler = React.useMemo(() => {
    return sortScheduler(scheduler, sortColumn, sortDirection)
  }, [scheduler, sortColumn, sortDirection])

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
          <Button onClick={() => setBookDialogOpen(true)} variant="outline">
            <BookOpen className="mr-2 h-4 w-4" />
            Book
          </Button>
        </div>
      </div>

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
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedScheduler.map((item) => (
                  <TableRow key={item.id}>
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
                    <TableCell className="max-w-xs truncate">
                      {item.notes || "-"}
                    </TableCell>
                  </TableRow>
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

      <BookTimeslotDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        onSuccess={() => {
          void refetch()
          setBookDialogOpen(false)
        }}
      />
    </div>
  )
}
