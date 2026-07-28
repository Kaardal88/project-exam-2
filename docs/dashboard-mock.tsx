import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react'

import { ThemeSwitcher } from './theme-switcher'

// Decorative dashboard for the landing hero — an IMAGINARY modern imitation
// (fake agents, fake numbers), deliberately NOT the real product UI, so the
// landing page never has to chase app changes. Server Component: pure static
// markup, no motion of its own (the container-scroll moves it).
//
// Built entirely from semantic tokens, so it follows light/dark and every
// brand theme — that's also why it's coded rather than a screenshot.
// Fjord green appears twice, both tiny: the "agents working" live dot and
// the newest feed row's dot. Atmosphere only: aria-hidden.

function Stat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2.5 text-left sm:p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {live && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        {label}
      </p>
      {/* nowrap + smaller size on mobile: a wrapped amount reads as a bug. */}
      <p className="mt-1 whitespace-nowrap font-mono text-base font-medium text-card-foreground sm:text-lg">
        {value}
      </p>
    </div>
  )
}

function FeedRow({
  agent,
  text,
  time,
  badge,
  accent,
}: {
  agent: string
  text: string
  time: string
  badge?: string
  accent?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 text-left">
      <span
        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${accent ? 'bg-primary' : 'bg-muted-foreground/50'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-card-foreground">{text}</p>
        <p className="truncate text-xs text-muted-foreground">
          {agent} · {time}
        </p>
      </div>
      {badge && (
        /* Hidden on the narrowest screens — at 390px it overflows the card;
           the green accent dot still marks the row as "just finished". */
        <span className="hidden shrink-0 rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn sm:inline-block">
          {badge}
        </span>
      )}
    </div>
  )
}

const SIDEBAR_ICONS = [LayoutDashboard, Bot, BarChart3, FileText, Settings]

export function DashboardMock() {
  return (
    // NOT aria-hidden as a whole anymore: the topbar hosts the real, focusable
    // ThemeSwitcher (interactive controls inside aria-hidden are an a11y bug).
    // The fake content below carries aria-hidden instead.
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Topbar — fake search (hidden on the narrowest screens to make room)
          and the LIVE theme/mode switcher top right. */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <p aria-hidden className="font-display text-sm font-semibold tracking-tight text-card-foreground">
          GrunderNet
        </p>
        <div aria-hidden className="hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-md bg-muted px-3 py-1.5 sm:flex">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">Søk i GrunderNet …</span>
        </div>
        <ThemeSwitcher />
      </div>

      <div aria-hidden className="flex min-h-0 flex-1">
        {/* Mini sidebar */}
        <div className="hidden w-12 flex-col items-center gap-5 border-r border-border py-4 sm:flex">
          {SIDEBAR_ICONS.map((Icon, i) => (
            <Icon key={i} className={`size-4 ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
          ))}
        </div>

        {/* Content — flex column so the grid below stretches and the mock
            fills the tall md: card instead of leaving a dead bottom. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-base font-semibold tracking-tight text-card-foreground">
              God morgen, Fjordvik
            </p>
            <p className="text-xs text-muted-foreground">fredag 18. juli</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Agenter i arbeid" value="14" live />
            <Stat label="Rutiner i dag" value="12 av 12" />
            <Stat label="Til godkjenning" value="3" />
          </div>

          <div className="mt-4 grid min-h-0 flex-1 gap-3 md:grid-cols-[1.6fr_1fr]">
            {/* Agent activity feed. min-w-0 so truncation works inside the
                grid track (grid items default to min-width:auto). */}
            <div className="min-w-0 rounded-lg border border-border bg-card p-3">
              <p className="text-left text-xs font-medium text-muted-foreground">
                Agentaktivitet
              </p>
              {/* divide-y instead of per-row border-b: the md:-only wrapper
                  below would otherwise steal :last-child and leave a dangling
                  border on mobile. */}
              <div className="mt-1 divide-y divide-border">
                <FeedRow
                  agent="Rapportagenten"
                  text="MVA-melding klargjort for 3. termin"
                  time="nå nettopp"
                  badge="Til godkjenning"
                  accent
                />
                <FeedRow
                  agent="Regnskapsagenten"
                  text="24 bilag sortert og bokført"
                  time="for 12 min siden"
                />
                <FeedRow
                  agent="Analyseagenten"
                  text="To tilskudd funnet — verdt kr 380 000"
                  time="for 2 t siden"
                />
                <FeedRow
                  agent="Avtaleagenten"
                  text="Kundekontrakt fornyet og arkivert"
                  time="i går"
                />
                {/* Extra rows only where the card is tall enough (md:). */}
                <div className="hidden divide-y divide-border md:block">
                  <FeedRow
                    agent="Innboksagenten"
                    text="3 e-poster besvart med utkast"
                    time="i går"
                  />
                  <FeedRow
                    agent="Rapportagenten"
                    text="Månedsrapport for juni levert"
                    time="i går"
                  />
                </div>
              </div>
            </div>

            {/* Cashflow card */}
            <div className="hidden min-w-0 rounded-lg border border-border bg-card p-3 text-left md:block">
              <p className="text-xs font-medium text-muted-foreground">Kontantstrøm</p>
              <p className="mt-2 whitespace-nowrap font-mono text-lg font-medium text-card-foreground">
                kr 412 000
              </p>
              <p className="text-xs text-ok">+12 % siste 30 dager</p>
              <svg viewBox="0 0 220 64" className="mt-3 w-full">
                <polyline
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeOpacity="0.5"
                  strokeWidth="1.5"
                  points="0,50 24,46 48,48 72,40 96,42 120,32 144,34 168,24 192,26 220,14"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
