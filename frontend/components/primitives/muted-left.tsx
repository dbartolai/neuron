interface Props {
  text: string
}

export default function TypographyMutedLeft({ text }: Props) {
  return (
    <p className=" text-sm text-muted-foreground text-balance">
      {text}
    </p>
  )
}

