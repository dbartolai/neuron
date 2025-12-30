import { createBrowserClient } from "@supabase/ssr"

// 1. Export a function to create the client
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 2. (Optional) If you prefer a singleton instance to avoid refactoring imports:
export const supabase = createClient()

export async function getAccessToken() {
  // It is safer to create a fresh client instance here
  const client = createClient()
  
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session) {
    // Ideally, handle this gracefully or return null, but throwing is fine 
    // if you catch it upstream.
    throw new Error("Not authenticated")
  }

  return session.access_token
}