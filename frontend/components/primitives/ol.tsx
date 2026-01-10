interface Props {
  items: string[]
}

export default function TypographyOl({ items }: Props) {
  return (
    <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ol>
  )
}

