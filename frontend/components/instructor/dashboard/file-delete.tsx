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

interface Props {
    course_id: string
    file_id: string
}

export function DeleteFile({ course_id, file_id }: Props) {

    const onDelete = async () => {

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
    }



  return (
    <Dialog>
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
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={onDelete} variant={"destructive"}>Delete</Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}
