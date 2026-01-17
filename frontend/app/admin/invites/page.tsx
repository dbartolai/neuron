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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusCircle, ArrowUp, ArrowDown } from "lucide-react"

type InviteStatus = "pending" | "accepted" | "expired" | "revoked"

function getInviteStatus(invite: {
  revoked_at: string | null;
  accepted_at: string | null;
  expires_at: string;
}): InviteStatus {
  if (invite.revoked_at !== null) {
    return "revoked"
  }
  if (invite.accepted_at !== null) {
    return "accepted"
  }
  const now = new Date()
  const expiresAt = new Date(invite.expires_at)
  if (expiresAt < now) {
    return "expired"
  }
  return "pending"
}

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

function getStatusBadgeVariant(status: InviteStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default"
    case "pending":
      return "secondary"
    case "expired":
    case "revoked":
      return "destructive"
    default:
      return "outline"
  }
}

type SortColumn = "name" | "email" | "status" | "created_at" | "expires_at" | "accepted_at" | "note"
type SortDirection = "asc" | "desc"

function sortInvites(
  invites: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    note: string;
  }>,
  column: SortColumn,
  direction: SortDirection
) {
  return [...invites].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (column) {
      case "name":
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case "email":
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      case "status":
        aValue = getInviteStatus(a)
        bValue = getInviteStatus(b)
        break
      case "created_at":
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      case "expires_at":
        aValue = new Date(a.expires_at).getTime()
        bValue = new Date(b.expires_at).getTime()
        break
      case "accepted_at":
        aValue = a.accepted_at ? new Date(a.accepted_at).getTime() : 0
        bValue = b.accepted_at ? new Date(b.accepted_at).getTime() : 0
        break
      case "note":
        aValue = (a.note || "").toLowerCase()
        bValue = (b.note || "").toLowerCase()
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

export default function AdminInvitesPage() {
  const { invites, isLoading, error, sendInvite, refetch } = useAdmin()
  const [isSending, setIsSending] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("created_at")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc")
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    note: "",
  })

  const sortedInvites = React.useMemo(() => {
    return sortInvites(invites, sortColumn, sortDirection)
  }, [invites, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)
    try {
      await sendInvite(formData)
      setFormData({ name: "", email: "", note: "" })
      setIsDialogOpen(false)
    } catch (err) {
      console.error("Failed to send invite:", err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invites</h1>
          <p className="text-muted-foreground text-sm">
            Manage instructor invites sent and received
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
          <CardDescription>
            View all invites that have been sent
          </CardDescription>
          <CardAction>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle />
                  Send Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send New Invite</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new instructor
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="instructor@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="note">Note</FieldLabel>
                      <Textarea
                        id="note"
                        placeholder="Optional note about this invite"
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                      />
                    </Field>
                    <DialogFooter>
                      <Button type="submit" disabled={isSending}>
                        {isSending ? "Sending..." : "Send Invite"}
                      </Button>
                    </DialogFooter>
                  </FieldGroup>
                </form>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Loading invites...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-destructive">
              Error: {error}
            </div>
          )}

          {!isLoading && !error && invites.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No invites found
            </div>
          )}

          {!isLoading && !error && invites.length > 0 && (
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
                      onClick={() => handleSort("expires_at")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Expires At
                      {sortColumn === "expires_at" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("accepted_at")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Accepted At
                      {sortColumn === "accepted_at" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("note")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Note
                      {sortColumn === "note" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvites.map((invite) => {
                  const status = getInviteStatus(invite)
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">
                        {invite.name}
                      </TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invite.created_at)}</TableCell>
                      <TableCell>{formatDate(invite.expires_at)}</TableCell>
                      <TableCell>{formatDate(invite.accepted_at)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {invite.note || "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
