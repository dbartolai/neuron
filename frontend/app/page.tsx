"use client"

import * as React from "react"
import Link from "next/link"
import { getApiUrl } from "@/lib/utils"

/**
 * Neuron landing page
 * - Serif for branding/hero, sans for body
 * - Warm, academic, minimal layout
 * - CTA to request invite/call/demo via school email
 */
export default function NeuronLandingPage() {
  const [status, setStatus] = React.useState<"idle" | "submitting" | "sent" | "error">("idle")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [interest, setInterest] = React.useState("Invite / early access")
  const [notes, setNotes] = React.useState("")
  const [selectedTimeslot, setSelectedTimeslot] = React.useState<string>("")
  const [availableTimeslots, setAvailableTimeslots] = React.useState<Array<{ id: number; timeslot: string }>>([])
  const [timeslotsLoading, setTimeslotsLoading] = React.useState(false)

  // Fetch available timeslots on mount
  React.useEffect(() => {
    async function fetchTimeslots() {
      setTimeslotsLoading(true)
      try {
        const res = await fetch(`${getApiUrl()}/admin/scheduler/available`)
        if (res.ok) {
          const data = await res.json()
          setAvailableTimeslots(data)
        }
      } catch (error) {
        console.error("Failed to fetch timeslots:", error)
      } finally {
        setTimeslotsLoading(false)
      }
    }
    void fetchTimeslots()
  }, [])

  // Group timeslots by day
  const timeslotsByDay = React.useMemo(() => {
    const grouped: Record<string, Array<{ id: number; timeslot: string }>> = {}
    
    availableTimeslots.forEach((slot) => {
      const date = new Date(slot.timeslot)
      const dayKey = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(slot)
    })
    
    // Sort days chronologically
    const sortedDays = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(grouped[a][0].timeslot)
      const dateB = new Date(grouped[b][0].timeslot)
      return dateA.getTime() - dateB.getTime()
    })
    
    return sortedDays.map((day) => ({
      day,
      slots: grouped[day].sort((a, b) => new Date(a.timeslot).getTime() - new Date(b.timeslot).getTime()),
    }))
  }, [availableTimeslots])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("submitting")

    if (!selectedTimeslot) {
      setStatus("error")
      return
    }

    setStatus("submitting")

    try {
      const res = await fetch(`${getApiUrl()}/admin/scheduler/interest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name || "",
          email,
          notes: notes || null,
          purpose: interest || null,
          timeslot: selectedTimeslot,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to submit")
      }

      setStatus("sent")
      // Reset form
      setName("")
      setEmail("")
      setInterest("Invite / early access")
      setNotes("")
      setSelectedTimeslot("")
    } catch (error) {
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      {/* Top bar */}
      <header className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark placeholder */}
            <div className="h-9 w-9 rounded-xl bg-primary shadow-sm grid place-items-center">
              <div className="h-3 w-3 rounded-sm bg-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">neuron</div>
              <div className="text-xs text-muted-foreground">by ceria</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a className="hover:text-foreground transition-colors" href="#how">How it works</a>
            <a className="hover:text-foreground transition-colors" href="#benefits">Benefits</a>
            <a className="hover:text-foreground transition-colors" href="#access">Early access</a>
            <a className="hover:text-foreground transition-colors" href="#about">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto w-full max-w-6xl px-6">
        <section className="mt-10 md:mt-16 grid gap-10 md:grid-cols-12 items-start">
          <div className="md:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              Instructor-controlled AI for programming education
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              Pilot conversations for Spring 2026
            </p>

            <h1 className="mt-6 font-serif text-4xl md:text-5xl tracking-tight">
              A clearer way to use AI in CS courses.
            </h1>

            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Neuron is an instructor-controlled AI development environment that teaches students to use AI
              responsibly while preserving learning outcomes and academic integrity.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#access"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Request an invite / demo
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card/60 px-5 py-3 text-sm font-medium shadow-sm hover:bg-card transition-colors"
              >
                Learn how it works
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground max-w-xl">
              Neuron is not an AI detection or surveillance tool. It makes acceptable AI usage explicit and
              auditable, reducing adversarial enforcement.
            </p>
          </div>

          {/* Right column card */}
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-border bg-card/60 shadow-sm">
              <div className="p-6">
                <div className="text-sm font-medium">Designed for large programming courses</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Neuron looks and feels like the tools students already use — but its behavior is defined by
                  course policy and pedagogy.
                </p>

                <div className="mt-5 grid gap-3">
                  <FeaturePill title="Course & assignment guardrails" desc="Enable/disable code, pseudocode, tests, walkthroughs, hints." />
                  <FeaturePill title="Course-aware context" desc="Instructor uploads improve relevance and reliability." />
                  <FeaturePill title="Policy-compliant logs" desc="Auditable interactions deter misuse and reduce disputes." />
                </div>
              </div>

              <div className="border-t border-border px-6 py-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Standard AI optimizes productivity.</div>
                <div className="text-xs font-medium">Neuron optimizes learning.</div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-14 md:mt-20">
          <SectionHeading eyebrow="How it works" title="Instructor-defined boundaries, student-friendly UX" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Guardrails as policy presets"
              body="Configure the model's output at the course or assignment level — from 'leading questions only' to structured hints, to enabling/disabling code generation."
            />
            <InfoCard
              title="Development-centric workflows"
              body="A web client plus developer-friendly integrations (e.g., VS Code / terminal-style experiences) to meet students where they work."
            />
            <InfoCard
              title="Auditability without adversarial policing"
              body="Interaction logs are policy-compliant by design, reducing false accusations and giving students a defensible record of acceptable AI use."
            />
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="mt-14 md:mt-20">
          <SectionHeading eyebrow="Benefits" title="Better outcomes for instructors and students" />

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <h3 className="font-medium">For instructors</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Enforceable, transparent AI usage policy</li>
                <li>Outputs aligned with pedagogy and course expectations</li>
                <li>Auditable interactions to deter misbehavior</li>
                <li>Fewer disputes and fewer false accusations</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <h3 className="font-medium">For students</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Clear, enforced boundaries for acceptable AI use</li>
                <li>Course- and assignment-tailored guidance</li>
                <li>Access to AI without fear of policy violation</li>
                <li>Protection against wrongful claims of AI misuse</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Early access */}
        <section id="access" className="mt-14 md:mt-20">
          <SectionHeading eyebrow="Early access" title="Request an invite, call, or demo" />

          <div className="mt-8 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-6 rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're starting with short, low-commitment conversations to understand how instructors currently
                frame and enforce AI usage in programming courses.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium">Select a timeslot *</label>
                  {timeslotsLoading ? (
                    <div className="mt-2 text-sm text-muted-foreground">Loading timeslots...</div>
                  ) : timeslotsByDay.length === 0 ? (
                    <div className="mt-2 text-sm text-muted-foreground">No available timeslots at the moment</div>
                  ) : (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-card">
                      {timeslotsByDay.map(({ day, slots }) => (
                        <div key={day} className="border-b border-border last:border-b-0">
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                            {day}
                          </div>
                          {slots.map((slot) => {
                            const slotTime = new Date(slot.timeslot)
                            const timeStr = slotTime.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            const slotValue = slot.timeslot
                            const isSelected = selectedTimeslot === slotValue
                            
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setSelectedTimeslot(slotValue)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                                  isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
                                }`}
                              >
                                {timeStr}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">School email</label>
                  <input
                    required
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">What are you interested in?</label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Invite / early access</option>
                    <option>15–20 min call</option>
                    <option>Demo</option>
                    <option>Pilot discussion (Spring 2026)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium">Notes</label>
                  <textarea
                    placeholder="Course name, size, and how you're thinking about AI policy…"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {status === "submitting" ? "Submitting…" : status === "sent" ? "Request sent" : status === "error" ? "Error - try again" : "Submit request"}
                </button>

                {status === "sent" && (
                  <p className="text-xs text-muted-foreground">
                    Thank you! We'll be in touch soon.
                  </p>
                )}

                {status !== "sent" && (
                  <p className="text-xs text-muted-foreground">
                    We'll only use your email to follow up about Neuron. No mailing lists.
                  </p>
                )}
              </form>
            </div>

            <div className="md:col-span-6 rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <h3 className="font-medium">What you'll get</h3>
              <div className="mt-4 space-y-3">
                <TimelineItem
                  title="A short conversation"
                  body="We'll learn how you currently handle AI policy in your programming course — what's working, what isn't."
                />
                <TimelineItem
                  title="A guided walkthrough"
                  body="We'll show how guardrail presets and course context can align AI outputs with your pedagogy."
                />
                <TimelineItem
                  title="Optional pilot (subsidized)"
                  body="After interest is expressed, we may invite you to a time-bound, feedback-oriented pilot in 2026."
                />
              </div>

              <div className="mt-6 rounded-xl border border-border bg-card px-4 py-3">
                <div className="text-xs font-medium">Positioning note</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Neuron emphasizes pedagogy and policy clarity over tooling. It is designed to reduce adversarial
                  enforcement by making acceptable AI usage explicit and auditable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mt-14 md:mt-20 pb-16">
          <SectionHeading eyebrow="About" title="Neuron is the first product from Ceria" />

          <div className="mt-8 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ceria is building elegant, enterprise-grade software for higher education. Neuron is our first
                product — focused on responsible, learning-first AI for programming education.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PersonCard
                  name="Drake Bartolai"
                  meta="Computer Engineering, UIUC"
                  desc="Technical lead; background in education and technology."
                />
                <PersonCard
                  name="Charles Economou"
                  meta="Accountancy, Illinois State University"
                  desc="Business lead; background in accounting and finance."
                />
              </div>
            </div>

            <div className="md:col-span-5 rounded-2xl border border-border bg-card/60 shadow-sm p-6">
              <h3 className="font-medium">Links</h3>
              <div className="mt-4 space-y-2 text-sm">
                <a className="block rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent transition-colors" href="https://www.linkedin.com/in/drake-bartolai/">
                  Drake Bartolai
                  <span className="block text-xs text-muted-foreground">Find Drake on LinkedIn</span>
                </a>
                <a className="block rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent transition-colors" href="https://www.linkedin.com/in/charles-economou/">
                  Charleie Economou
                  <span className="block text-xs text-muted-foreground">Find Charlie on LinkedIn</span>
                </a>
                <a className="block rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent transition-colors" href="https://www.linkedin.com/in/drake-bartolai/">
                  ceria
                  <span className="block text-xs text-muted-foreground">Find ceria on LinkedIn</span>
                </a>
              </div>

              <div className="mt-6 text-xs text-muted-foreground">
                © {new Date().getFullYear()} Ceria. Neuron is an early-stage product.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{eyebrow}</div>
      <h2 className="mt-2 font-serif text-2xl md:text-3xl tracking-tight">{title}</h2>
    </div>
  )
}

function InfoCard({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 shadow-sm p-6">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

function FeaturePill({
  title,
  desc,
}: {
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  )
}

function TimelineItem({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function PersonCard({
  name,
  meta,
  desc,
}: {
  name: string
  meta: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs text-muted-foreground">{meta}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}
