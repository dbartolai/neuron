type UserMessageProps = {
  content: string
}


export default function UserMessage({ content }: UserMessageProps) {

    return (
        <div>{content}</div>
    )
}