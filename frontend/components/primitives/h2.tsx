interface Props {
  text: string
}

export default function TypographyH2({ text }: Props) {
  return (
    <h2 className="scroll-m-20 text-center text-3xl font-semibold tracking-tight text-balance">
      {text}
    </h2>
  )
}

