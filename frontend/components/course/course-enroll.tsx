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

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type LucideIcon } from "lucide-react"



type Item = {
    title: string
    url: string
    icon: LucideIcon
}

type CourseEnrollProps = {
  item: Item
}


export default function CourseEnroll({ item }: CourseEnrollProps) {

    return (
        <Dialog>
            <DialogTrigger asChild >
                <Button size={"sm"} variant={"ghost"} >
                <item.icon />
                <span>{item.title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Add a new Course</DialogTitle>
                <DialogDescription>Enter a course code from your professor to start learning with neuron!</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                <div className="grid gap-3">
                    <Label htmlFor="course-code">Code</Label>
                    <Input id="course-code" name="code" defaultValue="ABC101-12345" />
                </div>
                </div>
                <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Enroll</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
    )
}