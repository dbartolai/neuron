import { createBrowserClient } from "@supabase/auth-helpers-nextjs"

export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Not authenticated")
  }

  return session.access_token
}
