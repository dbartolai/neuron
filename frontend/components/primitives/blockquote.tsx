interface Props {
  text: string
}

export default function TypographyBlockquote({ text }: Props) {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic text-center text-balance">
      {text}
    </blockquote>
  )
}

