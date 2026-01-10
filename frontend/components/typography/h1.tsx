
interface Props {
    text: string
}
export default function TypographyH1({text}: Props) {
  return (
    <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        {text}
    </h1>
  )
}
