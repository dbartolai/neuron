import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

type AssistantMessageProps = {
  content: string
  isStreaming?: boolean
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

export default function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <div className="flex justify-center my-4">
      <div className="max-w-2xl w-full prose prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Headers with proper sizing
            h1: ({ node, ...props }) => (
              <h1 className="text-3xl font-bold mt-6 mb-4 text-foreground" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-semibold mt-5 mb-3 text-foreground" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-lg font-semibold mt-3 mb-2 text-foreground" {...props} />
            ),
            h5: ({ node, ...props }) => (
              <h5 className="text-base font-semibold mt-3 mb-1 text-foreground" {...props} />
            ),
            h6: ({ node, ...props }) => (
              <h6 className="text-sm font-semibold mt-2 mb-1 text-foreground" {...props} />
            ),
            // Paragraphs with larger spacing
            p: ({ node, ...props }) => (
              <p className="mt-6 text-foreground" {...props} />
            ),
            // Horizontal rule with proper spacing
            hr: ({ node, ...props }) => (
              <hr className="my-6 border-border" {...props} />
            ),
            // Table elements
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
              <th className="border border-border px-4 py-2 text-left font-semibold text-foreground" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border border-border px-4 py-2 text-foreground" {...props} />
            ),
            // Override the <pre> tag to style the code block container
            pre: ({ node, ...props }) => (
              <div className="overflow-auto w-full my-2 bg-card rounded-lg p-4 border border-border/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(0,0,0,0.04)]">
                <pre {...props} />
              </div>
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
    </div>
  );
}