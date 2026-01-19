"use client"

import { useState, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import FeedbackMenu from "./feedback-menu"

type AssistantMessageProps = {
  content: string
  isStreaming?: boolean
  chatId?: string
  threadId?: string
  onTryAgain?: () => void
  showFeedback?: boolean
}

// Code block component with copy button
function CodeBlock({ children, ...props }: React.ComponentProps<"pre">) {
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    try {
      // Extract text content from the code element inside pre
      const codeElement = preRef.current?.querySelector('code')
      const codeText = codeElement?.textContent || preRef.current?.textContent || ''
      await navigator.clipboard.writeText(codeText)
      setCopied(true)
      toast.success("Code copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy code")
    }
  }

  return (
    <div 
      className="relative group my-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-auto w-full bg-card rounded-lg p-4 border border-border/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(0,0,0,0.04)]">
        <pre ref={preRef} {...props}>
          {children}
        </pre>
      </div>
      {isHovered && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="absolute top-2 right-2 h-7 w-7 opacity-70 hover:opacity-100 bg-background/80 backdrop-blur-sm"
          aria-label="Copy code"
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

// Pulsing thinking indicator shown while waiting for AI response
export function ThinkingIndicator() {
  return (
    <div className="flex justify-center my-4">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="animate-pulse">Thinking</span>
          <span className="flex gap-1">
            <span className="animate-bounce [animation-delay:0ms]">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AssistantMessage({ 
  content, 
  isStreaming = false,
  chatId,
  threadId,
  onTryAgain,
  showFeedback = true
}: AssistantMessageProps) {
  return (
    <div className="flex-col justify-center my-4 group relative">
      <div className="max-w-2xl w-full prose prose-slate">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Headers with proper sizing and spacing
            h1: ({ node, ...props }) => (
              <h1 className="text-3xl font-bold font-serif mt-6 mb-4 text-foreground leading-tight" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-semibold font-serif mt-5 mb-3 text-foreground leading-tight" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground leading-tight" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-lg font-semibold mt-3 mb-2 text-foreground leading-tight" {...props} />
            ),
            h5: ({ node, ...props }) => (
              <h5 className="text-base font-semibold mt-3 mb-1 text-foreground leading-tight" {...props} />
            ),
            h6: ({ node, ...props }) => (
              <h6 className="text-sm font-semibold mt-2 mb-1 text-foreground leading-tight" {...props} />
            ),
            // Paragraphs with generous line spacing matching production
            p: ({ node, ...props }) => (
              <p className="mt-6 mb-4 text-foreground leading-7" {...props} />
            ),
            // List elements with proper colors and spacing - matching production
            ul: ({ node, ...props }) => (
              <ul className="my-4 ml-6 list-disc marker:text-muted-foreground text-foreground space-y-2 leading-7" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="my-4 ml-6 list-decimal marker:text-muted-foreground text-foreground space-y-2 leading-7" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="text-foreground leading-7" {...props} />
            ),
            // Bold and italic text - ensure dark color, not white
            strong: ({ node, ...props }) => (
              <strong className="font-semibold text-foreground" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="italic text-foreground" {...props} />
            ),
            // Horizontal rule with proper spacing
            hr: ({ node, ...props }) => (
              <hr className="my-6 border-border" {...props} />
            ),
            // Table elements with better spacing matching production
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-muted" {...props} />
            ),
            tbody: ({ node, ...props }) => (
              <tbody {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className="border-b border-border" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="border border-border px-4 py-3 text-left align-middle font-semibold text-foreground" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border border-border px-4 py-3 text-foreground" {...props} />
            ),
            // Override the <pre> tag to style the code block container
            pre: ({ node, children, ...props }) => (
              <CodeBlock {...props}>
                {children}
              </CodeBlock>
            ),
            // Override the <code> tag for inline vs block distinction
            code: ({ node, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match && !String(children).includes("\n");

              return isInline ? (
                // Inline code styling
                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              ) : (
                // Block code styling
                <code className={`${className} text-sm`} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-1" />
        )}
      </div>
      {!isStreaming && chatId && showFeedback && (
        <div className=" ">
          <FeedbackMenu
            chatId={chatId}
            content={content}
            onTryAgain={onTryAgain}
          />
        </div>
      )}
    </div>
  );
}
