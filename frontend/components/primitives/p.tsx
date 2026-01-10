interface Props {
  text: string
}

export default function TypographyP({ text }: Props) {
  return (
    <p className="leading-7 text-center text-balance">
      {text}
    </p>
  )
}

