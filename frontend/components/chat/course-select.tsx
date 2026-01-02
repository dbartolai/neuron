import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ChevronRightIcon } from "lucide-react"
import type  { LucideIcon } from "lucide-react"



interface CourseSelectProps {
    name: string
    url: string
    icon: LucideIcon
}

export default function CourseSelect(props: CourseSelectProps) {

    const Icon: LucideIcon = props.icon;

    return (
        <>
        <Item variant="outline" size="sm" asChild>
            <a href={props.url}>
            <ItemMedia>
                <Icon className="size-5"/>
            </ItemMedia>
            <ItemContent>
                <ItemTitle>{props.name}</ItemTitle>
            </ItemContent>
            <ItemActions>
                <ChevronRightIcon className="size-4" />
            </ItemActions>
            </a>
        </Item>
        </>
    )
}