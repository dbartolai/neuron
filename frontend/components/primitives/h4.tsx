interface Props {
  text: string
}

export default function TypographyH4({ text }: Props) {
  return (
    <h4 className="scroll-m-20 text-center text-xl font-semibold tracking-tight text-balance">
      {text}
    </h4>
  )
}

