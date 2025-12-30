import { redirect } from "next/navigation"
import { getServerSupabase } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/chat")
  }

  // Not logged in: send to login (matches existing AuthListener behavior)
  redirect("/login")
}
