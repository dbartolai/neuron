interface Props {
  text: string
}

export default function TypographyH3({ text }: Props) {
  return (
    <h3 className="scroll-m-20 text-center text-2xl font-semibold tracking-tight text-balance">
      {text}
    </h3>
  )
}

