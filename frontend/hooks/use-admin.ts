"use client"

import * as React from "react"
import { getAccessToken, supabase } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

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

type Outreach = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  role: string | null;
  purpose: string | null;
}

type Scheduler = {
  id: number;
  created_at: string;
  timeslot: string;
  employee_id: string;
  instructor_id: string | null;
  name: string;
  email: string;
  notes: string | null;
  purpose: string | null;
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
  outreach: Outreach[];
  scheduler: Scheduler[];
  employeeTimeslots: Scheduler[];
  availableTimeslots: Scheduler[];
  user?: NavUser;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  sendInvite: (props: SendInviteProps) => Promise<void>;
  createTimeslots: (timeslots: string[]) => Promise<void>;
  bookTimeslot: (timeslotId: number, name: string, email: string, notes: string | null, purpose: string | null) => Promise<void>;
  createOutreach: (outreach: { name: string | null; email: string; notes: string | null; role: string; purpose: string }) => Promise<void>;
}

export function useAdmin(): AdminHook {
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [outreach, setOutreach] = React.useState<Outreach[]>([]);
  const [scheduler, setScheduler] = React.useState<Scheduler[]>([]);
  const [employeeTimeslots, setEmployeeTimeslots] = React.useState<Scheduler[]>([]);
  const [availableTimeslots, setAvailableTimeslots] = React.useState<Scheduler[]>([]);
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
      const invitesRes = await fetch(`${getApiUrl()}/admin/invites`, {
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

      // Fetch outreach
      const outreachRes = await fetch(`${getApiUrl()}/admin/outreach`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!outreachRes.ok) {
        throw new Error(`couldn't load outreach: ${outreachRes.status}`);
      }

      const outreachData: Outreach[] = await outreachRes.json();
      setOutreach(outreachData);

      // Fetch scheduler
      const schedulerRes = await fetch(`${getApiUrl()}/admin/scheduler`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!schedulerRes.ok) {
        throw new Error(`couldn't load scheduler: ${schedulerRes.status}`);
      }

      const schedulerData: Scheduler[] = await schedulerRes.json();
      setScheduler(schedulerData);

      // Fetch user data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Filter employee timeslots (for current user) - filter client-side
      if (authUser?.id) {
        const employeeSlots = schedulerData.filter(
          (slot) => slot.employee_id === authUser.id
        );
        setEmployeeTimeslots(employeeSlots);
      } else {
        setEmployeeTimeslots([]);
      }

      // Fetch available timeslots (public endpoint)
      const availableRes = await fetch(`${getApiUrl()}/admin/scheduler/available`, {
        method: "GET",
        signal: controller.signal,
      });

      if (availableRes.ok) {
        const availableData: Scheduler[] = await availableRes.json();
        setAvailableTimeslots(availableData);
      }
      const nameRes = await fetch(`${getApiUrl()}/users/name`, {
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

    const res = await fetch(`${getApiUrl()}/admin/invites`, {
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

  const createTimeslots = React.useCallback(async (timeslots: string[]) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/timeslots`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeslots: timeslots,
        employee_id: null, // Will be set from authenticated user
      }),
    });

    if (!res.ok) {
      throw new Error("couldn't create timeslots");
    }

    // Refetch after creating
    await refetch();
  }, [refetch]);

  const bookTimeslot = React.useCallback(async (
    timeslotId: number,
    name: string,
    email: string,
    notes: string | null,
    purpose: string | null
  ) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/book`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeslot_id: timeslotId,
        name,
        email,
        notes,
        purpose,
      }),
    });

    if (!res.ok) {
      throw new Error("couldn't book timeslot");
    }

    // Refetch after booking
    await refetch();
  }, [refetch]);

  const createOutreach = React.useCallback(async (outreachData: {
    name: string | null;
    email: string;
    notes: string | null;
    role: string;
    purpose: string;
  }) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/outreach`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(outreachData),
    });

    if (!res.ok) {
      throw new Error("couldn't create outreach entry");
    }

    // Refetch after creating
    await refetch();
  }, [refetch]);

  // Initially load data
  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    invites,
    outreach,
    scheduler,
    employeeTimeslots,
    availableTimeslots,
    user,
    isLoading,
    error,
    refetch,
    sendInvite,
    createTimeslots,
    bookTimeslot,
    createOutreach,
  };
}
