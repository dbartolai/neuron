"use client"

import * as React from "react"
import Link from "next/link"
import { getApiUrl } from "@/lib/utils"

/**
 * Neuron landing page
 * - Ultra-scan-friendly, conversion-oriented
 * - Academic, premium aesthetic (not marketing-y)
 * - Reduced copy by ~50%
 * - Hero with video demo
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

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
      {/* SECTION 1 — TOP NAV */}
      <header className="mx-auto w-full max-w-6xl px-5 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/c.png" alt="neuron" className="h-9 w-9 rounded-xl" />
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
              className="hidden sm:inline-flex items-center rounded-2xl border border-black/10 bg-white/40 px-4 py-2 text-sm font-medium hover:bg-white/60 transition-colors"
            >
              Login
            </Link>
            <Link
              href="#access"
              className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Request access
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden ml-2 p-2"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 space-y-2 text-sm text-muted-foreground">
            <a className="block hover:text-foreground transition-colors" href="#how" onClick={() => setIsMobileMenuOpen(false)}>How it works</a>
            <a className="block hover:text-foreground transition-colors" href="#benefits" onClick={() => setIsMobileMenuOpen(false)}>Benefits</a>
            <a className="block hover:text-foreground transition-colors" href="#access" onClick={() => setIsMobileMenuOpen(false)}>Early access</a>
            <a className="block hover:text-foreground transition-colors" href="#about" onClick={() => setIsMobileMenuOpen(false)}>About</a>
            <Link href="/login" className="block pt-2" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-5">
        {/* SECTION 2 — HERO */}
        <section className="mt-10 md:mt-16 grid gap-10 md:grid-cols-12 items-start">
          <div className="md:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/40 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              Instructor-controlled AI for programming courses
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              Spring 2026 pilot conversations
            </p>

            <h1 className="mt-6 font-serif text-4xl md:text-5xl tracking-tight">
              A clearer way to use AI in CS courses.
            </h1>

            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Promotes academic integrity, delivers course-aware student help, and gives instructors visibility into student needs.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#access"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Request a conversation / pilot
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/40 px-5 py-3 text-sm font-medium shadow-sm hover:bg-white/60 transition-colors"
              >
                Watch 90s demo
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground max-w-xl">
              Not AI detection. Not surveillance. Policy-aligned assistance + audit trail.
            </p>
          </div>

          <div className="md:col-span-6">
            <VideoDemo
              videoUrl=""
              posterUrl=""
              caption="See policy → student experience → audit trail → insights in 90 seconds."
            />
          </div>
        </section>

        {/* SECTION 3 — THREE BENEFITS */}
        <section id="benefits" className="mt-20 md:mt-24">
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight">Three outcomes instructors care about.</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <BenefitCard
              title="Integrity by design"
              sentence="Makes acceptable AI usage explicit and auditable, reducing adversarial enforcement."
              bullets={[
                "Policy-aligned interactions",
                "Transparent audit trail"
              ]}
            />
            <BenefitCard
              title="More relevant student help"
              sentence="Course context and instructor guidance improve AI responses for learning."
              bullets={[
                "Course-aware responses",
                "Instructor-defined boundaries"
              ]}
            />
            <BenefitCard
              title="Visibility into student needs"
              sentence="Aggregated insights show what students struggle with across assignments."
              bullets={[
                "Pattern detection",
                "Pedagogical feedback"
              ]}
            />
          </div>
        </section>

        {/* SECTION 4 — HOW IT WORKS */}
        <section id="how" className="mt-20 md:mt-24">
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight">How it works</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-4">
            <StepCard
              number={1}
              title="Policy presets"
              caption="Configure guardrails at course or assignment level."
            />
            <StepCard
              number={2}
              title="Course context"
              caption="Instructor uploads improve relevance and reliability."
            />
            <StepCard
              number={3}
              title="Auditable interactions"
              caption="All student-AI exchanges logged with policy compliance."
            />
            <StepCard
              number={4}
              title="Instructor insights"
              caption="Aggregated patterns reveal what students need help with."
            />
          </div>
        </section>

        {/* SECTION 5 — EARLY ACCESS CTA */}
        <section id="access" className="mt-20 md:mt-24">
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight">Request a conversation, invite, or demo</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 rounded-3xl border border-black/10 bg-white/40 shadow-sm p-6 md:p-8">

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2">Select a timeslot *</label>
                  {timeslotsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading timeslots...</div>
                  ) : timeslotsByDay.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No available timeslots at the moment</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto chat-scroll rounded-2xl border border-black/10 bg-white/60">
                      {timeslotsByDay.map(({ day, slots }) => (
                        <div key={day} className="border-b border-black/10 last:border-b-0">
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-white/40">
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
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-white/80 transition-colors ${
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
                  <label className="block text-xs font-medium mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2">School email *</label>
                  <input
                    required
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2">What are you interested in?</label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Invite / early access</option>
                    <option>15–20 min call</option>
                    <option>Demo</option>
                    <option>Pilot discussion (Spring 2026)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2">Notes</label>
                  <textarea
                    placeholder="Course name, size, AI policy approach…"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
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
                    We'll only use your email to follow up. No mailing lists.
                  </p>
                )}
              </form>
            </div>

            <div className="md:col-span-5 rounded-3xl border border-black/10 bg-white/40 shadow-sm p-6 md:p-8">
              <h3 className="text-sm font-medium mb-4">What we're looking for</h3>
              
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>Instructors willing to share how they approach AI use by students, and why</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>Feedback to tailor the product toward subsidized small-scale pilots</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>Especially: higher-level programming classes with smaller enrollment</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 6 — ABOUT */}
        <section id="about" className="mt-20 md:mt-24 pb-16">
        </section>
      </main>
    </div>
  )
}

function VideoDemo({
  videoUrl,
  posterUrl,
  caption,
}: {
  videoUrl?: string
  posterUrl?: string
  caption: string
}) {
  const [isPlaying, setIsPlaying] = React.useState(false)

  return (
    <div className="rounded-3xl border border-black/10 bg-white/40 shadow-sm overflow-hidden">
      <div className="relative aspect-video bg-muted/30">
        {!isPlaying && videoUrl ? (
          <>
            {posterUrl && (
              <img src={posterUrl} alt="Video poster" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Play video"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 ml-1 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          </>
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center shadow-sm mx-auto mb-3">
                <svg className="w-6 h-6 ml-1 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">Video demo placeholder</p>
            </div>
          </div>
        )}
      </div>
      {caption && (
        <p className="px-6 py-4 text-xs text-muted-foreground border-t border-black/10">
          {caption}
        </p>
      )}
    </div>
  )
}

function BenefitCard({
  title,
  sentence,
  bullets,
}: {
  title: string
  sentence: string
  bullets: string[]
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/40 shadow-sm p-6">
      <h3 className="text-base font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{sentence}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({
  number,
  title,
  caption,
}: {
  number: number
  title: string
  caption: string
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/40 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
          {number}
        </div>
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{caption}</p>
    </div>
  )
}

function PersonCard({
  name,
  role,
  background,
}: {
  name: string
  role: string
  background: string
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 px-5 py-4">
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs text-muted-foreground mt-1">{role}</div>
      <div className="text-xs text-muted-foreground mt-1">{background}</div>
    </div>
  )
}
