"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

interface Props {
    course_id: string
    file_id: string
    onDeleteSuccess?: () => void
}

export function DeleteFile({ course_id, file_id, onDeleteSuccess }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const onDelete = async () => {
        setIsDeleting(true)

        try {
            const token = await getAccessToken();

            const res = await fetch(`${getApiUrl()}/instructor/courses/${course_id}/files/${file_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (!res.ok) {
                throw new Error("couldn't delete file");
            }

            // Close dialog and refetch files
            setIsOpen(false)
            toast.success("File deleted successfully")
            if (onDeleteSuccess) {
                await onDeleteSuccess()
            }
        } catch (error) {
            console.error("Error deleting file:", error)
            toast.error("Failed to delete file. Please try again.")
        } finally {
            setIsDeleting(false)
        }
    }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete file"
            >
            <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Deleting a file cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>Cancel</Button>
            </DialogClose>
            <Button 
                onClick={onDelete} 
                variant={"destructive"}
                disabled={isDeleting}
                className="relative"
            >
                {isDeleting && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <Spinner className="size-4" />
                    </span>
                )}
                <span className={isDeleting ? "invisible" : ""}>Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}
