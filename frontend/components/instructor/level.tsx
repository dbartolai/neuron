"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WRITING_LEVELS, TESTING_LEVEL, DEBUGGING_LEVELS } from "@/lib/levels"
import { H3, Muted, Small, UlSmall } from "../primitives"
import { Badge } from "../ui/badge"

interface LevelProps {
    id: string
    courseId: string
    onLevelChange: (levelType: string, levelIdx: number) => void
}

const enum LevelType {
    w = "WRITING",
    t = "TESTING",
    d = "DEBUGGING"
}

export function Level({ id, courseId, onLevelChange }: LevelProps) {

    const [dialogOpen, setDialogOpen] = useState(false)
    const [pendingChange, setPendingChange] = useState<{type: LevelType, idx: number, title: string} | null>(null)

    const t: string = id[0];
    let type: LevelType = LevelType.t
    if (t === "w"){
        type = LevelType.w
    } else if (t === "d") {
        type = LevelType.d
    } 

    const idx = Number(id.split("-")[1] || 0) || 0;

    const handleSelectLevel = (levelType: LevelType, levelIdx: number, levelTitle: string) => {
        setPendingChange({ type: levelType, idx: levelIdx, title: levelTitle })
        setDialogOpen(true)
    }

    const handleConfirm = () => {
        if (pendingChange) {
            const levelTypeMap: Record<LevelType, string> = {
                [LevelType.w]: "writing",
                [LevelType.t]: "testing",
                [LevelType.d]: "debugging"
            }
            console.log("pendingChange: ", pendingChange)
            onLevelChange(levelTypeMap[pendingChange.type], pendingChange.idx)
            setDialogOpen(false)
            setPendingChange(null)
        }
    }

    const handleCancel = () => {
        setDialogOpen(false)
        setPendingChange(null)
    }

    const getLevelTypeName = (levelType: LevelType): string => {
        switch (levelType) {
            case LevelType.w: return "Writing"
            case LevelType.t: return "Testing"
            case LevelType.d: return "Debugging"
            default: return "Level"
        }
    }

    const label = (() => {
      if (type === LevelType.w) return "Writing – "+WRITING_LEVELS[idx]?.title || "Select Writing Level";
      if (type === LevelType.t) return "Testing – "+TESTING_LEVEL[idx]?.title || "Select Testing Level";
      if (type === LevelType.d) return "Debugging – "+DEBUGGING_LEVELS[idx]?.title || "Select Debugging Level";
      return "Select Level";
    })();


  return (
    <>
    {type === LevelType.w && 
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge asChild variant={"outline"} className="px-5 w-full justify-center"><Button variant="outline">{label}</Button></Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        
        <DropdownMenuLabel>Select Writing Level</DropdownMenuLabel>
        <DropdownMenuGroup>
        
            {WRITING_LEVELS.map((l) => (
            <DropdownMenuSub key={l.id}>
            <DropdownMenuSubTrigger>{l.title}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <div className="my-4 max-w-md">
                <Muted text={l.description}/>
                <UlSmall items={l.constraints}/>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSelectLevel(LevelType.w, l.idx, l.title)}>Select {l.title}</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

            ))}
        
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    }
    {type === LevelType.t &&
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge asChild variant={"outline"} className="px-5 w-full justify-center"><Button variant="outline">{label}</Button></Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Select Testing Level</DropdownMenuLabel>
        <DropdownMenuGroup>
          {TESTING_LEVEL.map((l) => (
            <DropdownMenuSub key={l.id}>
              <DropdownMenuSubTrigger>{l.title}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent >
                  <div className="my-4 max-w-md">
                    <Muted text={l.description} />
                    <UlSmall items={l.constraints} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSelectLevel(LevelType.t, l.idx, l.title)}>Select {l.title}</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    }
    {type === LevelType.d &&
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge asChild variant={"outline"} className="px-5 w-full justify-center"><Button variant="outline">{label}</Button></Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Select Debugging Level</DropdownMenuLabel>
        <DropdownMenuGroup>
          {DEBUGGING_LEVELS.map((l) => (
            <DropdownMenuSub key={l.id}>
              <DropdownMenuSubTrigger>{l.title}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <div className="my-4 max-w-md">
                    <Muted text={l.description} />
                    <UlSmall items={l.constraints} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSelectLevel(LevelType.d, l.idx, l.title)}>Select {l.title}</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    }
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Level Change</DialogTitle>
          <DialogDescription>
            {pendingChange && (
              <>
                You are about to change the {getLevelTypeName(pendingChange.type).toLowerCase()} level to <strong>{pendingChange.title}</strong>. 
                This will immediately update the permissions for this course. Do you want to continue?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
