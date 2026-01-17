type SystemMessageProps = {
  content: string
}

export default function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center my-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 max-w-lg text-center">
        <p className="text-red-400 text-sm">{content}</p>
      </div>
    </div>
  )
}
