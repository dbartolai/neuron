"use client"

import * as React from "react"
import { getAccessToken, supabase } from "@/lib/supabase/client"

type Invite = {
  id: string;
  name: string;
  email: string;
  token_hash: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  note: string;
}

type NavUser = {
  name: string;
  email?: string;
  avatar: string;
}

interface SendInviteProps {
  email: string;
  name: string;
  note: string;
}

type AdminHook = {
  invites: Invite[];
  user?: NavUser;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  sendInvite: (props: SendInviteProps) => Promise<void>;
}

export function useAdmin(): AdminHook {
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [user, setUser] = React.useState<NavUser>();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const refetch = React.useCallback(async () => {
    const controller = new AbortController();

    setError(null);
    setIsLoading(true);

    try {
      const token = await getAccessToken();

      // Fetch invites
      const invitesRes = await fetch("http://localhost:8000/admin/invites", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!invitesRes.ok) {
        throw new Error(`couldn't load invites: ${invitesRes.status}`);
      }

      const invitesData: Invite[] = await invitesRes.json();
      setInvites(invitesData);

      // Fetch user data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const nameRes = await fetch("http://localhost:8000/users/name", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!nameRes.ok) {
        throw new Error(`couldn't load user name: ${nameRes.status}`);
      }

      const name = await nameRes.json();
      setUser({
        name: name,
        email: authUser?.email,
        avatar: "",
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "couldn't load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendInvite = React.useCallback(async ({ email, name, note }: SendInviteProps) => {
    const token = await getAccessToken();

    const res = await fetch("http://localhost:8000/admin/invites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        name: name,
        note: note,
      }),
    });

    if (!res.ok) {
      throw new Error("couldn't send email");
    }

    // Refetch invites after sending
    await refetch();
  }, [refetch]);

  // Initially load data
  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { invites, user, isLoading, error, refetch, sendInvite };
}
