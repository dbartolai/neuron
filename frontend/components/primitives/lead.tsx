interface Props {
  text: string
}

export default function TypographyLead({ text }: Props) {
  return (
    <p className="text-center text-xl text-muted-foreground text-balance">
      {text}
    </p>
  )
}

