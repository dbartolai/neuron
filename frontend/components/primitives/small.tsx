interface Props {
  text: string
}

export default function TypographySmall({ text }: Props) {
  return (
    <small className="text-center text-sm font-medium leading-none text-balance">
      {text}
    </small>
  )
}

