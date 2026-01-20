"use client"

import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, HelpCircle, AlertCircle, PartyPopper } from "lucide-react"
import { useReactions, ReactionType } from "@/hooks/use-announcement-reactions"
import { cn } from "@/lib/utils"

interface Props {
  announcementId: string
}

const REACTION_CONFIG: Record<ReactionType, { icon: typeof ThumbsUp; label: string }> = {
  thumbs_up: { icon: ThumbsUp, label: "Thumbs up" },
  thumbs_down: { icon: ThumbsDown, label: "Thumbs down" },
  question: { icon: HelpCircle, label: "Question" },
  exclamation: { icon: AlertCircle, label: "Important" },
  celebration: { icon: PartyPopper, label: "Celebration" },
}

export function ReactionButtons({ announcementId }: Props) {
  const { counts, userReaction, isLoading, addReaction } = useReactions(announcementId)

  const handleReactionClick = async (reactionType: ReactionType) => {
    try {
      await addReaction(reactionType)
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(REACTION_CONFIG).map(([type, config]) => {
        const Icon = config.icon
        const reactionType = type as ReactionType
        const count = counts[reactionType]
        const isActive = userReaction === reactionType

        return (
          <Button
            key={type}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleReactionClick(reactionType)}
            disabled={isLoading}
            className={cn(
              "gap-2",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm">{count}</span>
            <span className="sr-only">{config.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
