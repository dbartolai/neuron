"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type UserMessageProps = {
  content: string
}

export default function UserMessage({ content }: UserMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success("Message copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy message")
    }
  }

  return (
    <div 
      className="flex justify-end my-4 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {isHovered && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="absolute right-0 -bottom-6 h-6 w-6 opacity-70 hover:opacity-100 z-10"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      )}
    </div>
  )
}