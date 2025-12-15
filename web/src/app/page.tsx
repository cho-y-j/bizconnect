'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function HomeContent() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko')
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
              {lang === 'ko' ? '제품' : 'Product'}
            </a>
            <a href="#how-it-works" className="hover:text-white">
              {lang === 'ko' ? '사용 방법' : 'How it works'}
            </a>
            <a href="#pricing" className="hover:text-white">
              {lang === 'ko' ? '가격' : 'Pricing'}
            </a>
            <a href="#support" className="hover:text-white">
              {lang === 'ko' ? '고객지원' : 'Support'}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'ko' ? 'en' : 'ko'))}
              className="hidden items-center rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-white md:inline-flex"
            >
              {lang === 'ko' ? '한국어 · EN' : 'EN · 한국어'}
            </button>
            <Link href="/auth/login" className="hidden text-sm text-slate-300 hover:text-white md:inline">
              {lang === 'ko' ? '로그인' : 'Log in'}
            </Link>
            <Link href="/auth/signup">
              <Button className="text-xs md:text-sm px-4 py-2">
                {lang === 'ko' ? '무료로 시작하기' : 'Start free'}
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
                {lang === 'ko'
                  ? '1개월 프리미엄 무료 · 모바일 영업인을 위한 문자 자동화'
                  : '1-month premium free · SMS automation for mobile closers'}
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]">
                {lang === 'ko' ? (
                  <>
                    내 휴대폰 요금제를
                    <br />
                    <span className="bg-gradient-to-r from-rose-400 via-pink-500 to-sky-400 bg-clip-text text-transparent">
                      0원 문자 발송 엔진
                    </span>
                    으로 바꾸세요.
                  </>
                ) : (
                  <>
                    Turn your phone bill
                    <br />
                    into a{' '}
                    <span className="bg-gradient-to-r from-rose-400 via-pink-500 to-sky-400 bg-clip-text text-transparent">
                      zero-cost SMS engine
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {lang === 'ko'
                  ? '비즈커넥트는 영업인을 위한 가장 쉬운 문자 자동화 서비스입니다. PC에서 메시지를 입력하면, 내 안드로이드 폰이 고객별 맞춤 문자를 자동으로 발송합니다.'
                  : 'BizConnect is the fastest way for salespeople to automate follow-up: type on desktop, your Android phone sends personalized texts automatically — with AI that remembers every customer touchpoint.'}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/auth/signup">
                  <Button className="text-sm px-6 py-3">
                    {lang === 'ko' ? '지금 무료로 시작하기' : 'Get started for free'}
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-sm">
                    {lang === 'ko' ? '대시보드 로그인' : 'Log in to dashboard'}
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                {lang === 'ko'
                  ? '프리미엄 1개월 무료 후, 매일 20건까지 무료 플랜 이용 가능 · 언제든 해지 가능합니다.'
                  : '1 month premium free, then Free plan available · Cancel anytime'}
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    {lang === 'ko' ? '3배 더 많은 콜백' : '3x more callbacks'}
                  </div>
                  <div>
                    {lang === 'ko'
                      ? '통화 후 10분 안에 자동 문자로 후속 연락을 보내면 달라집니다.'
                      : 'when follow-up is automated within 10 minutes'}
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {lang === 'ko' ? '무제한 고객 기록' : 'Unlimited CRM records'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {lang === 'ko' ? 'AI 문구 템플릿 포함' : 'AI templates included'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -left-16 -top-10 h-44 w-44 rounded-full bg-rose-500/40 blur-3xl" />
              <div className="pointer-events-none absolute -right-10 -bottom-16 h-40 w-40 rounded-full bg-sky-500/30 blur-3xl" />
              <Card className="relative z-10 p-5 sm:p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {lang === 'ko' ? '실시간 사용 현황' : "Today's overview"}
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '안드로이드 기기와 대시보드가 실시간으로 동기화되어, 어떤 자동 발송이 실행 중인지 한눈에 확인할 수 있습니다.'
                    : 'Your Android device and web dashboard stay in sync so you can see which automations are running at a glance.'}
                </p>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        {lang === 'ko' ? '콜백 자동 발송' : 'Callback automation'}
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        {lang === 'ko'
                          ? '통화 종료 후 명함과 감사 문자를 자동 발송합니다.'
                          : 'Sends a card and thank-you text after every call.'}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                      {lang === 'ko' ? '실행 중' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        {lang === 'ko' ? '생일 AI' : 'Birthday AI'}
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        {lang === 'ko'
                          ? '생일·기념일을 감지해 자연스러운 축하 문자를 제안합니다.'
                          : 'Detects key dates and drafts natural birthday messages.'}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                      {lang === 'ko' ? '대기 중' : 'Ready'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-slate-800/60 py-16">
          <div className="tw-container">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {lang === 'ko' ? 'WHY BIZCONNECT' : 'WHY BIZCONNECT'}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
              {lang === 'ko'
                ? '모바일로 움직이는 영업팀을 위해 설계했습니다.'
                : 'Built for sales teams who live on mobile.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              {lang === 'ko'
                ? '매번 복붙하는 수고를 줄이세요. 비즈커넥트는 내 휴대폰 요금제를 활용해, 개발자 없이도 프로그램처럼 움직이는 문자 채널을 만들어 줍니다.'
                : 'Stop copy-pasting every message. BizConnect turns your mobile plan into a programmable channel — without gateways, spreadsheets, or engineering.'}
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                {
                  key: 'callback',
                  titleKo: '콜백 자동화',
                  titleEn: 'Callback automation',
                  bodyKo:
                    '통화가 끝나면 자동으로 명함과 감사 문자를 보내 후속 연락을 놓치지 않습니다.',
                  bodyEn:
                    'Send your card and a thank-you text after every call, without touching your phone.',
                },
                {
                  key: 'routing',
                  titleKo: '무료 문자 라우팅',
                  titleEn: 'Free SMS routing',
                  bodyKo:
                    '무제한 요금제를 문자 전송 채널로 활용해, 별도 문자 단가 없이 메시지를 보냅니다.',
                  bodyEn:
                    'Use your unlimited mobile plan as the transport. We orchestrate everything from the web.',
                },
                {
                  key: 'ai',
                  titleKo: 'AI 비서',
                  titleEn: 'AI assistant',
                  bodyKo:
                    '생일·기념일 등 중요한 순간을 감지하고, 한 번의 클릭으로 보낼 수 있는 문구를 제안합니다.',
                  bodyEn:
                    'Detect birthdays and milestones, then draft messages you can send with one click.',
                },
                {
                  key: 'crm',
                  titleKo: '통합 CRM',
                  titleEn: 'Integrated CRM',
                  bodyKo:
                    '고객 이력·태그·캠페인을 한 화면에서 관리하고, 보낸 문자와 자동으로 연결합니다.',
                  bodyEn:
                    'One place for customer history, tags, and campaigns — synced with every SMS you send.',
                },
              ].map((item) => (
                <Card key={item.key} className="h-full p-5">
                  <div className="mb-3 h-8 w-8 rounded-full bg-slate-900/90 text-center text-[10px] font-semibold uppercase leading-8 text-slate-100">
                    {item.key}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-50">
                    {lang === 'ko' ? item.titleKo : item.titleEn}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {lang === 'ko' ? item.bodyKo : item.bodyEn}
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
                {lang === 'ko' ? 'HOW IT WORKS' : 'HOW IT WORKS'}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
                {lang === 'ko'
                  ? '회원가입부터 첫 자동 문자 발송까지, 10분 안에 끝냅니다.'
                  : 'From sign-up to first automated SMS in under 10 minutes.'}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                {lang === 'ko'
                  ? '웹 대시보드와 안드로이드 앱을 함께 사용해, 고객에게는 항상 본인 전화번호로 문자가 발송되도록 설계했습니다.'
                  : 'We pair your web dashboard with a lightweight Android app so every SMS is sent from your own number — fully carrier-compliant.'}
              </p>
              <div className="mt-6 space-y-4 text-sm text-slate-200">
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    1
                  </div>
                  <div>
                    <div className="font-semibold">
                      {lang === 'ko' ? '계정 생성' : 'Create your account'}
                    </div>
                    <p className="text-xs text-slate-300">
                      {lang === 'ko'
                        ? '구글 또는 이메일로 간단히 가입하고, 비즈커넥트 워크스페이스를 연결하세요. 카드 정보는 필요 없습니다.'
                        : 'Sign up with Google or email and connect your BizConnect workspace — no credit card required.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    2
                  </div>
                  <div>
                    <div className="font-semibold">
                      {lang === 'ko' ? '안드로이드 앱 설치' : 'Install the Android app'}
                    </div>
                    <p className="text-xs text-slate-300">
                      {lang === 'ko'
                        ? '동반 앱을 설치하고 문자·통화 권한을 허용한 뒤, QR 코드로 웹 계정과 연결합니다.'
                        : 'Install the companion app, grant SMS and call permissions, and link it to your web account with a QR code.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 rounded-full bg-slate-900/90 text-center text-xs font-semibold leading-7">
                    3
                  </div>
                  <div>
                    <div className="font-semibold">
                      {lang === 'ko' ? '플로우 설계' : 'Design your flows'}
                    </div>
                    <p className="text-xs text-slate-300">
                      {lang === 'ko'
                        ? '태그, 템플릿, 스케줄을 조합해 콜백·생일·캠페인 문자를 몇 번의 클릭으로 자동화합니다.'
                        : 'Use tags, templates, and schedules to automate callback, birthday, and campaign messages in a few clicks.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-5 sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? 'SAMPLE FLOW' : 'SAMPLE FLOW'}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-50">
                {lang === 'ko' ? '통화 이후 후속 문자' : 'Post-call follow-up'}
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                {lang === 'ko'
                  ? '30초 이상 통화가 끝나면, 명함과 다음 스텝을 담은 맞춤 문자를 자동으로 보냅니다.'
                  : 'After every outgoing call longer than 30 seconds, send a personalized message with your card and next steps.'}
              </p>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      {lang === 'ko' ? '트리거: 통화 종료' : 'Trigger: Call ended'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ko'
                        ? '안드로이드 통화가 끝나면, 비즈커넥트가 번호를 인식하고 CRM 고객 정보와 자동으로 연결합니다.'
                        : 'When your Android call ends, BizConnect captures the number and matches it with your CRM record.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      {lang === 'ko' ? 'AI 메시지 제안' : 'AI message suggestion'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ko'
                        ? '최근 메모와 태그를 바탕으로 후속 문자를 제안합니다. 한 번의 클릭으로 승인·수정할 수 있습니다.'
                        : 'We generate a follow-up text using recent notes and tags; you approve or edit in one click.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <div>
                    <div className="font-medium text-slate-100">
                      {lang === 'ko' ? '내 번호로 발송' : 'Send from your number'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ko'
                        ? '문자는 항상 내 안드로이드 기기를 통해 발송되기 때문에, 고객은 익숙한 번호만 보게 됩니다.'
                        : 'The SMS is sent through your own Android device, so your customers always see the number they recognise.'}
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
              {lang === 'ko' ? 'PRICING' : 'PRICING'}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
              {lang === 'ko'
                ? '하루 문자 발송량에 맞춘, 단순한 요금제.'
                : 'Simple plans that scale with your daily SMS volume.'}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              {lang === 'ko'
                ? '처음 1개월은 프리미엄을 무료로 사용해 보세요. 이후에는 하루 문자 발송량에 맞는 요금제를 선택하면 됩니다.'
                : 'Start with 1 month of Premium for free. After your trial, choose a plan based on how many SMS you send per day.'}
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Card className="p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {lang === 'ko' ? 'Free' : 'Free'}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  {lang === 'ko' ? '무료 플랜' : 'Free plan'}
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '1개월 프리미엄 무료 후, 가벼운 사용량에 맞는 무료 플랜으로 계속 이용할 수 있습니다.'
                    : '1-month Premium free, then stay on Free with a light quota.'}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">₩0</span>
                  <span className="text-xs text-slate-400">
                    {lang === 'ko' ? '/ 월' : '/ month'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'ko'
                    ? '하루 20건까지 내 기기에서 문자 발송.'
                    : 'Up to 20 SMS per day from your device.'}
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li>
                    • {lang === 'ko' ? '웹 대시보드 & 안드로이드 앱' : 'Web dashboard & Android app'}
                  </li>
                  <li>• {lang === 'ko' ? '기본 메시지 템플릿' : 'Basic templates'}</li>
                  <li>• {lang === 'ko' ? 'CRM 고객 및 태그' : 'CRM contacts & tags'}</li>
                </ul>
              </Card>

              <Card highlight className="p-6 text-left relative overflow-hidden">
                <div className="absolute right-4 top-4 rounded-full bg-rose-500/90 px-3 py-1 text-[11px] font-semibold text-white">
                  {lang === 'ko' ? '가장 인기' : 'Most popular'}
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
                  {lang === 'ko' ? 'Premium' : 'Premium'}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  {lang === 'ko' ? '프리미엄 플랜' : 'Premium plan'}
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '매일 문자 발송이 필요하고, AI의 도움으로 응대 품질을 유지하고 싶은 팀을 위한 플랜입니다.'
                    : 'For teams that run SMS every day and rely on AI to keep up.'}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">
                    ₩9,800
                  </span>
                  <span className="text-xs text-slate-300">
                    {lang === 'ko' ? '/ 월' : '/ month'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '하루 500건까지 내 기기에서 문자 발송.'
                    : 'Up to 500 SMS per day from your device.'}
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-200">
                  <li>
                    •{' '}
                    {lang === 'ko'
                      ? '무료·라이트 플랜의 모든 기능 포함'
                      : 'Everything in Free & Lite'}
                  </li>
                  <li>
                    •{' '}
                    {lang === 'ko'
                      ? 'AI 문구 제안 및 요약'
                      : 'AI suggestions & summaries'}
                  </li>
                  <li>
                    •{' '}
                    {lang === 'ko'
                      ? '고급 플로우 & 발송 스케줄링'
                      : 'Advanced flows & scheduling'}
                  </li>
                  <li>
                    • {lang === 'ko' ? '우선 지원' : 'Priority support'}
                  </li>
                </ul>
                <div className="mt-6">
                  <Button className="w-full text-sm">
                    {lang === 'ko' ? '프리미엄 무료 체험 시작' : 'Start Premium trial'}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {lang === 'ko' ? 'Lite' : 'Lite'}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  {lang === 'ko' ? '라이트 플랜' : 'Lite plan'}
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '꾸준히 문자를 보내지만 아직 대규모 발송까지는 필요 없는 팀을 위한 플랜입니다.'
                    : "When you send a steady volume but don't need full scale yet."}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-50">
                    ₩4,800
                  </span>
                  <span className="text-xs text-slate-300">
                    {lang === 'ko' ? '/ 월' : '/ month'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'ko'
                    ? '하루 50건까지 내 기기에서 문자 발송.'
                    : 'Up to 50 SMS per day from your device.'}
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li>
                    • {lang === 'ko' ? '무료 플랜의 모든 기능 포함' : 'Everything in Free'}
                  </li>
                  <li>
                    •{' '}
                    {lang === 'ko'
                      ? '발신자 기반 자동화'
                      : 'Caller-based automations'}
                  </li>
                  <li>
                    • {lang === 'ko' ? '저장된 AI 템플릿' : 'Saved AI templates'}
                  </li>
                </ul>
              </Card>
            </div>

            <p className="mt-5 text-[11px] text-slate-400">
              {lang === 'ko'
                ? '무료/체험 한도를 모두 사용하면, 선택한 요금제 기준으로 유료 과금이 적용됩니다. 문자는 항상 본인의 휴대폰 요금제를 통해 발송됩니다.'
                : 'When your free quota is exhausted, paid plan charges apply based on your selected tier. SMS are still sent using your own mobile plan.'}
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
                {lang === 'ko' ? 'SUPPORT & TRUST' : 'SUPPORT & TRUST'}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
                {lang === 'ko'
                  ? '빠르게 개선하고, 문의에는 직접 답합니다.'
                  : 'We ship quickly, and we answer when you call.'}
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                {lang === 'ko'
                  ? '비즈커넥트는 한국 영업팀을 위해 만들어졌습니다. 온보딩, 고객 데이터 이전, 플로우 설계까지 실제로 응답을 받는 세팅을 함께 만들어 드립니다.'
                  : 'BizConnect is built for Korean sales teams, with support that understands your day-to-day. We help you onboard, import customers, and design flows that actually get replies.'}
              </p>
            </div>
            <Card className="p-6 text-sm text-slate-200">
              <p className="text-xs text-slate-300">
                {lang === 'ko'
                  ? '“비즈커넥트 덕분에 후속 문자는 저절로 나갑니다. 팀원들은 다음에 누구에게 연락해야 할지 고민하지 않고, 답장을 확인하는 데 집중해요.”'
                  : "“With BizConnect, follow-up texts just happen. My team doesn't worry about who to call next — the next reply is already in the inbox.”"}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {lang === 'ko'
                  ? '— 금융 서비스 영업 리더 (서울)'
                  : '— Sales lead, financial services (Seoul)'}
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
                {lang === 'ko' ? '로그인' : 'Login'}
              </Link>
              <Link href="/auth/signup" className="hover:text-slate-200">
                {lang === 'ko' ? '회원가입' : 'Sign up'}
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-300">
          Loading BizConnect...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
