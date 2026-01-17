import { ArrowUpIcon, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ChatInputProps = {
    value: string
    onChange: (value: string) => void
    onSend: (value: string) => void 
}

export default function ChatInput({value, onChange, onSend}: ChatInputProps){
    return (
        <>
        <InputGroup className="rounded-3xl w-full px-2 h-min">
        <InputGroupTextarea 
            placeholder="Ask ceria anything..." 
            value = {value} 
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend(value)
                onChange("")
            }
            }}
        />
        <InputGroupAddon align="inline-end">
          {/* <InputGroupButton
            variant="outline"
            className="rounded-full"
            size="icon-xs"
          >
            <Plus />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="ghost">Auto</InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="[--radius:0.95rem]"
            >
              <DropdownMenuItem>Auto</DropdownMenuItem>
              <DropdownMenuItem>Agent</DropdownMenuItem>
              <DropdownMenuItem>Manual</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
          <InputGroupButton
            variant="default"
            className="rounded-full ml-auto"
            size="icon-sm"
            onClick={() => {
                onChange("")
                onSend(value)
                }
            }
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
        
        </>
    )
   
}