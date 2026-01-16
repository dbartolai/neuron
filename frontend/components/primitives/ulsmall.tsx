interface Props {
  items: string[]
}

export default function TypographyUlSmall({ items }: Props) {
  return (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
      {items.map((item, idx) => (
        <li className="text-sm text-muted-foreground" key={idx}>{item}</li>
      ))}
    </ul>
  )
}

