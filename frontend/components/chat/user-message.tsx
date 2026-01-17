type UserMessageProps = {
  content: string
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end my-4">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}