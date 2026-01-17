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
import { ArrowUp, ArrowDown } from "lucide-react"

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

type SortColumn = "name" | "email" | "role" | "created_at" | "inbound"
type SortDirection = "asc" | "desc"

function sortOutreach(
  outreach: Array<{
    id: number;
    name: string;
    email: string;
    role: string | null;
    notes: string | null;
    created_at: string;
    inbound: boolean;
  }>,
  column: SortColumn,
  direction: SortDirection
) {
  return [...outreach].sort((a, b) => {
    let aValue: string | number | boolean
    let bValue: string | number | boolean

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
      case "inbound":
        aValue = a.inbound ? 1 : 0
        bValue = b.inbound ? 1 : 0
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
  const { outreach, isLoading, error, refetch } = useAdmin()
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("created_at")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc")

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Outreach</h1>
          <p className="text-muted-foreground text-sm">
            View all outreach submissions from the landing page
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Outreach Submissions</CardTitle>
          <CardDescription>
            View all outreach requests that have been submitted
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
                  <TableHead>
                    <button
                      onClick={() => handleSort("inbound")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Source
                      {sortColumn === "inbound" &&
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
                {sortedOutreach.map((item) => (
                  <TableRow key={item.id}>
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
                      <Badge variant={item.inbound ? "default" : "outline"}>
                        {item.inbound ? "Landing Page" : "Other"}
                      </Badge>
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
    </div>
  )
}
