type UserMessageProps = {
  content: string
}


export default function UserMessage({ content }: UserMessageProps) {

    return (
      <>
        <h2>You:</h2>
        <div>{content}</div>

      </>
    )
}