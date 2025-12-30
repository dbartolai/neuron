import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"


type AssistantMessageProps = {
  content: string
}


export default function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <h2>Ceria:</h2>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 2. Override the <pre> tag to style the code block container
          pre: ({ node, ...props }) => (
            <div className="overflow-auto w-full my-2 bg-card rounded-lg p-4">
              <pre {...props} />
            </div>
          ),
          // 3. Override the <code> tag (optional, but good for inline vs block distinction)
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            return isInline ? (
              // Inline code styling (e.g., `variable`)
              <code className="bg-gray-200 text-red-500 px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            ) : (
              // Block code styling (handled mostly by <pre> and highlight.js)
              <code className={`${className} text-sm`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}