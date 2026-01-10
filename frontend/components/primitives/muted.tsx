interface Props {
  text: string
}

export default function TypographyMuted({ text }: Props) {
  return (
    <p className="text-center text-sm text-muted-foreground text-balance">
      {text}
    </p>
  )
}

