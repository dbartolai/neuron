interface Props {
  text: string
}

export default function TypographyLarge({ text }: Props) {
  return (
    <div className="text-center text-lg font-semibold text-balance">
      {text}
    </div>
  )
}

