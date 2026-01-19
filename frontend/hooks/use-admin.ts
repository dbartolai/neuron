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
  employee_name: string | null;
  instructor_id: string | null;
  name: string;
  email: string;
  notes: string | null;
  admin_notes: string | null;
  purpose: string | null;
}

type Interaction = {
  id: string;
  created_at: string;
  type: string;
  notes: string | null;
  employee_id: string | null;
  instructor_id: string | null;
  outreach_id: number | null;
  name: string | null;
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
  revokeInvite: (inviteId: string) => Promise<void>;
  createTimeslots: (timeslots: string[]) => Promise<void>;
  massCreateTimeslots: (startTime: string, endTime: string) => Promise<void>;
  updateTimeslot: (timeslotId: number, updates: Partial<Scheduler>) => Promise<Scheduler>;
  deleteTimeslot: (timeslotId: number) => Promise<void>;
  batchDeleteTimeslots: (timeslotIds: number[]) => Promise<void>;
  bookTimeslot: (timeslotId: number, name: string, email: string, notes: string | null, purpose: string | null) => Promise<void>;
  createOutreach: (outreach: { name: string | null; email: string; notes: string | null; role: string; purpose: string }) => Promise<void>;
  updateOutreach: (outreachId: number, updates: Partial<Outreach>) => Promise<Outreach>;
  deleteOutreach: (outreachId: number) => Promise<void>;
  batchDeleteOutreach: (outreachIds: number[]) => Promise<void>;
  getInteractions: (outreachId: number) => Promise<Interaction[]>;
  createInteraction: (interaction: { type?: string; notes?: string | null; outreach_id: number; name?: string | null }) => Promise<Interaction>;
  updateInteraction: (interactionId: string, updates: { notes?: string | null; type?: string }) => Promise<Interaction>;
  deleteInteraction: (interactionId: string) => Promise<void>;
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

  const updateOutreach = React.useCallback(async (
    outreachId: number,
    updates: Partial<Outreach>
  ): Promise<Outreach> => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/outreach/${outreachId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error("couldn't update outreach entry");
    }

    const updated: Outreach = await res.json();
    
    // Update local state optimistically
    setOutreach((prev) => prev.map((item) => item.id === outreachId ? updated : item));

    return updated;
  }, []);

  const deleteOutreach = React.useCallback(async (outreachId: number) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/outreach/${outreachId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("couldn't delete outreach entry");
    }

    // Update local state optimistically
    setOutreach((prev) => prev.filter((item) => item.id !== outreachId));
  }, []);

  const batchDeleteOutreach = React.useCallback(async (outreachIds: number[]) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/outreach/batch`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ outreach_ids: outreachIds }),
    });

    if (!res.ok) {
      throw new Error("couldn't batch delete outreach entries");
    }

    // Update local state optimistically
    setOutreach((prev) => prev.filter((item) => !outreachIds.includes(item.id)));
  }, []);

  const revokeInvite = React.useCallback(async (inviteId: string) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/invites/${inviteId}/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("couldn't revoke invite");
    }

    // Update local state optimistically - set revoked_at to current timestamp
    setInvites((prev) => prev.map((invite) => 
      invite.id === inviteId 
        ? { ...invite, revoked_at: new Date().toISOString() }
        : invite
    ));
  }, []);

  const massCreateTimeslots = React.useCallback(async (startTime: string, endTime: string) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/timeslots/mass`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start_time: startTime,
        end_time: endTime,
      }),
    });

    if (!res.ok) {
      throw new Error("couldn't mass create timeslots");
    }

    await refetch();
  }, [refetch]);

  const updateTimeslot = React.useCallback(async (
    timeslotId: number,
    updates: Partial<Scheduler>
  ): Promise<Scheduler> => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/${timeslotId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error("couldn't update timeslot");
    }

    const updated: Scheduler = await res.json();
    
    // Update local state optimistically
    setScheduler((prev) => prev.map((item) => item.id === timeslotId ? updated : item));
    
    // Update employee timeslots if needed
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.id && updated.employee_id === authUser.id) {
      setEmployeeTimeslots((prev) => prev.map((item) => item.id === timeslotId ? updated : item));
    }
    
    // Update available timeslots if needed
    if (!updated.instructor_id) {
      setAvailableTimeslots((prev) => {
        const existing = prev.find((item) => item.id === timeslotId);
        if (existing) {
          return prev.map((item) => item.id === timeslotId ? updated : item);
        }
        return prev;
      });
    }

    return updated;
  }, []);

  const deleteTimeslot = React.useCallback(async (timeslotId: number) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/${timeslotId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("couldn't delete timeslot");
    }

    // Update local state optimistically
    setScheduler((prev) => prev.filter((item) => item.id !== timeslotId));
    setEmployeeTimeslots((prev) => prev.filter((item) => item.id !== timeslotId));
    setAvailableTimeslots((prev) => prev.filter((item) => item.id !== timeslotId));
  }, []);

  const batchDeleteTimeslots = React.useCallback(async (timeslotIds: number[]) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/scheduler/batch`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timeslot_ids: timeslotIds }),
    });

    if (!res.ok) {
      throw new Error("couldn't batch delete timeslots");
    }

    // Update local state optimistically
    setScheduler((prev) => prev.filter((item) => !timeslotIds.includes(item.id)));
    setEmployeeTimeslots((prev) => prev.filter((item) => !timeslotIds.includes(item.id)));
    setAvailableTimeslots((prev) => prev.filter((item) => !timeslotIds.includes(item.id)));
  }, []);

  const getInteractions = React.useCallback(async (outreachId: number): Promise<Interaction[]> => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/interactions/outreach/${outreachId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("couldn't fetch interactions");
    }

    return await res.json();
  }, []);

  const createInteraction = React.useCallback(async (interaction: {
    type?: string;
    notes?: string | null;
    outreach_id: number;
    name?: string | null;
  }): Promise<Interaction> => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/interactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(interaction),
    });

    if (!res.ok) {
      throw new Error("couldn't create interaction");
    }

    return await res.json();
  }, []);

  const updateInteraction = React.useCallback(async (
    interactionId: string,
    updates: { notes?: string | null; type?: string }
  ): Promise<Interaction> => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/interactions/${interactionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error("couldn't update interaction");
    }

    return await res.json();
  }, []);

  const deleteInteraction = React.useCallback(async (interactionId: string) => {
    const token = await getAccessToken();

    const res = await fetch(`${getApiUrl()}/admin/interactions/${interactionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("couldn't delete interaction");
    }
  }, []);

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
    revokeInvite,
    createTimeslots,
    massCreateTimeslots,
    updateTimeslot,
    deleteTimeslot,
    batchDeleteTimeslots,
    bookTimeslot,
    createOutreach,
    updateOutreach,
    deleteOutreach,
    batchDeleteOutreach,
    getInteractions,
    createInteraction,
    updateInteraction,
    deleteInteraction,
  };
}
