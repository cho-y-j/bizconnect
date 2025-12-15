'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      window.location.href = `/auth/callback?code=${encodeURIComponent(code)}`
      return
    }

    isAuthenticated().then((authenticated) => {
      if (authenticated) {
        router.push('/dashboard')
      }
    })
  }, [router, searchParams])

  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="tw-container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl tw-gradient-pill" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide text-slate-200">
                BizConnect
              </span>
              <span className="text-[11px] text-slate-400">
                Mobile CRM for real sales
              </span>
            </div>
          </div>
          <nav className="hidden gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#support" className="hover:text-white">
              Support
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden text-sm text-slate-300 hover:text-white md:inline">
              Log in
            </Link>
            <Link href="/auth/signup">
              <Button className="text-xs md:text-sm px-4 py-2">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-800/60 pb-20 pt-16">
          <div className="tw-container grid gap-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                1-month premium free · SMS automation for mobile closers
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Turn your phone bill
                <br />
                into a{' '}
                <span className="bg-gradient-to-r from-rose-400 via-pink-500 to-sky-400 bg-clip-text text-transparent">
                  zero-cost SMS engine
                </span>
                .
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                BizConnect is the fastest way for salespeople to automate follow-up:
                type on desktop, your Android phone sends personalized texts
                automatically — with AI that remembers every customer touchpoint.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/auth/signup">
                  <Button className="text-sm px-6 py-3">
                    Get started for free
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-sm">
                    Log in to dashboard
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                1 month premium free, then Free plan available · Cancel anytime
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    3x more callbacks
                  </div>
                  <div>when follow-up is automated within 10 minutes</div>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Unlimited CRM records</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>AI templates included</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -left-16 -top-10 h-44 w-44 rounded-full bg-rose-500/40 blur-3xl" />
              <div className="pointer-events-none absolute -right-10 -bottom-16 h-40 w-40 rounded-full bg-sky-500/30 blur-3xl" />
              <Card className="relative z-10 p-5 sm:p-6">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Today&apos;s flows</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px]">
                    Live sync with Android
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Callback flow
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        Send card & thank-you text after every call
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Birthday AI
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        Auto-generate message with BizConnect AI
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                      Ready
                    </span>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
                    Design your own flows with tags, templates, and schedules —
                    no complex setup or gateways required.
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Today&apos;s SMS usage</span>
                    <span className="text-[11px] text-slate-400">
                      Included in your mobile plan
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                    <div className="h-1.5 w-1/4 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-sky-400" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>35 / 500 daily SMS</span>
                    <span>Premium quota</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-slate-800/60 py-16">
          <div className="tw-container">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              WHY BIZCONNECT
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
              Built for sales teams who live on mobile.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Stop copy-pasting every message. BizConnect turns your mobile plan
              into a programmable channel — without gateways, spreadsheets, or
              engineering.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                {
                  emoji: '📞',
                  title: 'Callback automation',
                  body: 'Send your card and a thank-you text after every call, without touching your phone.',
                },
                {
                  emoji: '💬',
                  title: 'Free SMS routing',
                  body: 'Use your unlimited mobile plan as the transport. We orchestrate everything from the web.',
                },
                {
                  emoji: '🤖',
                  title: 'AI assistant',
                  body: 'Detect birthdays and milestones, then draft messages you can send with one click.',
                },
                {
                  emoji: '👥',
                  title: 'Integrated CRM',
                  body: 'One place for customer history, tags, and campaigns — synced with every SMS you send.',
                },
              ].map((item) => (
                <Card key={item.title} className="h-full p-5">
                  <div className="text-2xl">{item.emoji}</div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {item.body}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-b border-slate-800/60 bg-slate-950/60 py-16"
        >
          <div className="tw-container grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                HOW IT WORKS
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
                From sign-up to first automated SMS in under 10 minutes.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                We pair your web dashboard with a lightweight Android app so
                every SMS is sent from your own number — fully carrier-compliant.
              </p>
              <div className="mt-6 space-y-4 text-sm text-slate-200">
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    1
                  </div>
                  <div>
                    <div className="font-semibold">Create your account</div>
                    <p className="text-xs text-slate-300">
                      Sign up with Google or email and connect your BizConnect
                      workspace — no credit card required.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    2
                  </div>
                  <div>
                    <div className="font-semibold">Install the Android app</div>
                    <p className="text-xs text-slate-300">
                      Install the companion app, grant SMS and call permissions,
                      and link it to your web account with a QR code.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    3
                  </div>
                  <div>
                    <div className="font-semibold">Design your flows</div>
                    <p className="text-xs text-slate-300">
                      Use tags, templates, and schedules to automate callback,
                      birthday, and campaign messages in a few clicks.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-5 sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                SAMPLE FLOW
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-50">
                Post-call follow-up
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                After every outgoing call longer than 30 seconds, send a
                personalized message with your card and next steps.
              </p>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      Trigger: Call ended
                    </div>
                    <p className="text-[11px] text-slate-400">
                      When your Android call ends, BizConnect captures the number
                      and matches it with your CRM record.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      AI message suggestion
                    </div>
                    <p className="text-[11px] text-slate-400">
                      We generate a follow-up text using recent notes and tags;
                      you approve or edit in one click.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      Send from your number
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The SMS is sent through your own Android device, so your
                      customers always see the number they recognise.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="pricing" className="border-b border-slate-800/60 py-16">
          <div className="tw-container text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              PRICING
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
              Simple plans that scale with your daily SMS volume.
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Start with 1 month of Premium for free. After your trial, choose a
              plan based on how many SMS you send per day.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Card className="p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Free
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  Free plan
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  1-month Premium free, then stay on Free with a light quota.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">₩0</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Up to 20 SMS per day from your device.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li>• Web dashboard & Android app</li>
                  <li>• Basic templates</li>
                  <li>• CRM contacts & tags</li>
                </ul>
              </Card>

              <Card highlight className="p-6 text-left relative overflow-hidden">
                <div className="absolute right-4 top-4 rounded-full bg-rose-500/90 px-3 py-1 text-[11px] font-semibold text-white">
                  Most popular
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
                  Premium
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  Premium plan
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  For teams that run SMS every day and rely on AI to keep up.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">
                    ₩9,800
                  </span>
                  <span className="text-xs text-slate-300">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Up to 500 SMS per day from your device.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-200">
                  <li>• Everything in Free & Lite</li>
                  <li>• AI suggestions & summaries</li>
                  <li>• Advanced flows & scheduling</li>
                  <li>• Priority support</li>
                </ul>
                <div className="mt-6">
                  <Button className="w-full text-sm">Start Premium trial</Button>
                </div>
              </Card>

              <Card className="p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Lite
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  Lite plan
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  When you send a steady volume but don&apos;t need full scale yet.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">
                    ₩4,800
                  </span>
                  <span className="text-xs text-slate-300">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Up to 50 SMS per day from your device.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li>• Everything in Free</li>
                  <li>• Caller-based automations</li>
                  <li>• Saved AI templates</li>
                </ul>
              </Card>
            </div>

            <p className="mt-5 text-[11px] text-slate-400">
              When your free quota is exhausted, paid plan charges apply based on
              your selected tier. SMS are still sent using your own mobile plan.
            </p>
          </div>
        </section>

        <section
          id="support"
          className="border-b border-slate-800/60 bg-slate-950/60 py-16"
        >
          <div className="tw-container grid gap-10 md:grid-cols-2 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                SUPPORT & TRUST
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
                We ship quickly, and we answer when you call.
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                BizConnect is built for Korean sales teams, with support that
                understands your day-to-day. We help you onboard, import
                customers, and design flows that actually get replies.
              </p>
            </div>
            <Card className="p-6 text-sm text-slate-200">
              <p className="text-xs text-slate-300">
                “With BizConnect, follow-up texts just happen. My team doesn&apos;t
                worry about who to call next — the next reply is already in the
                inbox.”
              </p>
              <p className="mt-4 text-xs text-slate-400">
                — Sales lead, financial services (Seoul)
              </p>
            </Card>
          </div>
        </section>

        <footer className="py-10 text-xs text-slate-400">
          <div className="tw-container flex flex-col items-center justify-between gap-4 border-t border-slate-800/60 pt-6 md:flex-row">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-slate-200">BizConnect · 다인</div>
              <div>대표: 조수민 · 사업자번호: 202-18-18299</div>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login" className="hover:text-slate-200">
                Login
              </Link>
              <Link href="/auth/signup" className="hover:text-slate-200">
                Sign up
              </Link>
            </div>
            <div className="text-center md:text-right">
              © {new Date().getFullYear()} BizConnect. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default function Home() {
  return <HomeContent />
}
