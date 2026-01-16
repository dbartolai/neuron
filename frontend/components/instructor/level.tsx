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
import { WRITING_LEVELS, TESTING_LEVEL, DEBUGGING_LEVELS } from "@/lib/levels"
import { H3, Muted, Small, UlSmall } from "../primitives"
import { Badge } from "../ui/badge"

interface LevelProps {
    id: string
}

const enum LevelType {
    w = "WRITING",
    t = "TESTING",
    d = "DEBUGGING"
}

export function Level({ id }: LevelProps) {

    const t: string = id[0];
    let type: LevelType = LevelType.t
    if (t === "w"){
        type = LevelType.w
    } else if (t === "d") {
        type = LevelType.d
    } 

    const idx = Number(id.split("-")[1] || 0) || 0;

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
                <div className="my-4">
                <Muted text={l.description}/>
                <UlSmall items={l.constraints}/>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Select {l.title}</DropdownMenuItem>
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
                <DropdownMenuSubContent>
                  <div className="my-4">
                    <Muted text={l.description} />
                    <UlSmall items={l.constraints} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Select {l.title}</DropdownMenuItem>
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
                  <div className="my-4">
                    <Muted text={l.description} />
                    <UlSmall items={l.constraints} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Select {l.title}</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    }
    </>
  )
}
