"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Download,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Upload,
  Volume2,
} from "lucide-react";
import { StemWaveform } from "@/components/songDashboard/studio/StemWaveform";
import { MAX_STEMS_PER_VERSION, stemColor } from "@/lib/stemKinds";
import { mockStems, mockStudioSong, mockStudioVersion } from "./data/mockData";

const tabs = [
  "Dashboard",
  "Studio",
  "Lyrics",
  "Comments",
  "Tasks",
  "Activity",
  "Song Info",
  "Notes & Ideas",
  "Files",
];

// A quarter in, so the played portion is drawn in each lane's own colour.
// Frozen at 0:00 the mock would be ten grey waveforms, showing nothing of
// what colouring the lanes is for.
const PROGRESS = 0.26;

/**
 * The studio, as a picture.
 *
 * Not the dashboard mock in the PreviewMixer carousel — this is the Studio
 * tab, which is the thing worth showing first: ten stems of one song, the
 * version they belong to, and one transport under all of them.
 *
 * It reads its lane colours through the real `stemColor()` and its lane limit
 * through the real `MAX_STEMS_PER_VERSION`, so the picture cannot quietly
 * drift away from the product it advertises. Everything else is a condensed
 * copy of StudioTab's markup rather than the component itself: StemLane is
 * thirty interactive props deep, and none of them mean anything to a
 * screenshot.
 *
 * `aria-hidden` because that is what this is — a picture of an interface,
 * carrying invented data. The hero's headline and buttons beside it are the
 * real content.
 */
export function StudioStemsMock() {
  return (
    <div
      aria-hidden
      className="flex h-full w-full select-none bg-neutral-950 text-yellow-100"
    >
      {/* The app rail, cropped the way the left edge of a screenshot is. */}
      <aside className="hidden w-24 shrink-0 flex-col gap-1 border-r border-neutral-800 p-1.5 lg:flex">
        <div className="flex items-center gap-1.5 rounded-md border border-neutral-800 p-1">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[8px] font-bold">
            K
          </span>
          <span className="truncate text-[9px] font-semibold">Kaldvard</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 rounded-md bg-yellow-100/10 px-1.5 py-1 text-[9px] font-semibold">
          <LayoutGrid className="h-2.5 w-2.5 shrink-0" />
          Dashboard
        </div>

        <div className="flex items-center gap-1.5 px-1.5 py-1 text-[9px] text-neutral-400">
          <CalendarDays className="h-2.5 w-2.5 shrink-0" />
          Calendar
        </div>
      </aside>

      {/*
        Everything above the lanes is fixed height, so in a short frame it is
        the lanes — the whole point of the screen — that get squeezed out.
        The header therefore sheds its back-link, its chips and the tab row
        before the frame gets small enough for that to happen. A stems screen
        showing no stems is worse than one missing its breadcrumb.
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2 sm:gap-2 sm:p-2.5">
        {/* ------------------------------------------------------- header */}
        <div className="shrink-0 rounded-md border border-neutral-800 bg-neutral-900/40 p-1.5 sm:p-2">
          <span className="hidden items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[9px] font-semibold sm:inline-flex">
            <ArrowLeft className="h-2 w-2" />
            Back to Album: {mockStudioSong.album}
          </span>

          <div className="mt-1.5 flex items-start gap-2">
            <span />
            {mockStudioSong.image && (
              <img
                src={mockStudioSong.image}
                alt={mockStudioSong.title}
                className="h-7 w-7 shrink-0 rounded-sm sm:h-9 sm:w-9"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold sm:text-base">
                {mockStudioSong.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-neutral-400">
                Album: {mockStudioSong.album} · Status: {mockStudioSong.status}
                <span className="h-1 w-1 shrink-0 rounded-full bg-yellow-100" />
              </p>
              <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
                {["BPM —", "Key —"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-neutral-700 px-1.5 py-px text-[9px] text-neutral-300"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* The credits card — who made this and who is on it. Dropped on
                narrow frames, where it would squeeze the title it explains. */}
            <div className="hidden w-40 shrink-0 rounded-md border border-neutral-800 bg-neutral-900/60 p-1.5 xl:block">
              <p className="text-center text-[8px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Song dashboard
              </p>
              {[
                ["Created by", mockStudioSong.createdBy],
                ["Created at", mockStudioSong.createdAt],
                ["Last updated", mockStudioSong.updatedAt],
                ["Contributors", mockStudioSong.contributors],
                ["Guests", mockStudioSong.guests],
              ].map(([label, value]) => (
                <p key={label} className="mt-0.5 flex gap-2 text-[8px]">
                  <span className="shrink-0 text-neutral-400">{label}</span>
                  <span className="ml-auto truncate font-semibold">
                    {value}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------- tabs */}
        <div className="hidden shrink-0 gap-1 overflow-hidden sm:flex">
          {tabs.map((tab) => (
            <span
              key={tab}
              className={`shrink-0 whitespace-nowrap rounded-md border border-neutral-700 px-1.5 py-1 text-[9px] ${
                tab === "Studio"
                  ? "bg-yellow-100 text-black"
                  : "bg-neutral-900 text-neutral-300"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Version bar — one row on purpose. It names where you are and
            then gets out of the way, because the lanes below it are what
            this screen is for. */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900/60 px-2 py-1">
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5">
            <span className="font-mono text-[9px] text-neutral-500">
              v{mockStudioVersion.number}
            </span>
            <span className="text-[10px] font-semibold">
              {mockStudioVersion.label}
            </span>
            <ChevronDown className="h-2 w-2 text-neutral-500" />
          </span>

          <span className="shrink-0 rounded-full border border-yellow-200/50 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide">
            current
          </span>

          <span className="hidden min-w-0 flex-1 truncate text-[9px] text-neutral-500 sm:inline">
            {mockStudioVersion.by} · {mockStudioVersion.when} ·{" "}
            {mockStems.length} stems — {mockStudioVersion.note}
          </span>

          <span className="ml-auto flex shrink-0 items-center gap-1">
            <span className="flex items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-300">
              <MessageSquare className="h-2 w-2" />
              Comment
            </span>
            <span className="flex items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-300">
              <Download className="h-2 w-2" />
              Stems
            </span>
            <MoreHorizontal className="h-2.5 w-2.5 text-neutral-500" />
          </span>
        </div>

        {/* -------------------------------------------------------- stems */}
        <section className="flex min-h-0 flex-1 flex-col rounded-md border border-neutral-700 bg-neutral-900/60">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-2 py-1.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide">
                Stems
              </p>
              <p className="text-[8px] text-neutral-500">
                {mockStems.length} of {MAX_STEMS_PER_VERSION} · played together
              </p>
            </div>

            <span className="flex items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-300">
              <Plus className="h-2 w-2" />
              Add stem
            </span>
          </header>

          {/* Lanes are what gets cropped when the frame is short — the header
              above and the transport below both stay put, which is how a
              shortened screenshot still reads as the same screen. */}
          <ul className="min-h-0 flex-1 overflow-hidden">
            {mockStems.map((stem) => {
              const color = stemColor(stem);

              return (
                <li
                  key={stem.id}
                  className="flex items-center gap-1.5 border-b border-neutral-800 px-2 py-1 last:border-b-0"
                >
                  <span
                    className="w-0.5 shrink-0 self-stretch rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: color }}
                  />

                  <span className="w-20 shrink-0 sm:w-24">
                    <span className="block truncate text-[9px] font-semibold leading-tight">
                      {stem.name}
                    </span>
                    {/* The take label is the first thing to go: on a phone
                        the row it costs is better spent on another lane. */}
                    <span className="hidden truncate text-[8px] leading-tight text-neutral-500 sm:block">
                      {stem.take}
                    </span>
                  </span>

                  <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                    {["S", "M"].map((letter) => (
                      <span
                        key={letter}
                        className="flex h-3 w-3 items-center justify-center rounded-sm border border-neutral-700 text-[7px] font-bold text-neutral-400"
                      >
                        {letter}
                      </span>
                    ))}
                  </span>

                  <span className="min-w-0 flex-1">
                    <StemWaveform
                      peaks={stem.peaks}
                      progress={PROGRESS}
                      color={color}
                      height={18}
                    />
                  </span>

                  <span className="hidden shrink-0 items-center gap-0.5 lg:flex">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-neutral-700 text-neutral-400">
                      <Upload className="h-1.5 w-1.5" />
                    </span>
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-neutral-700 text-neutral-400">
                      <ChevronDown className="h-1.5 w-1.5" />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {/* The transport, under the lanes the way a DAW puts it. */}
          <footer className="flex shrink-0 items-center gap-1.5 border-t border-neutral-800 px-2 py-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-black">
              <Play className="ml-px h-2 w-2 fill-current" />
            </span>

            <span className="font-mono text-[9px] text-neutral-400">
              1:01 / {mockStudioVersion.duration}
            </span>

            <span className="flex items-center gap-1 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-300">
              <Download className="h-2 w-2" />
              Bounce to MP3
            </span>

            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <Volume2 className="h-2.5 w-2.5 text-neutral-400" />
              <span className="h-0.5 w-12 rounded-full bg-neutral-700">
                <span className="block h-full w-10 rounded-full bg-neutral-400" />
              </span>
            </span>
          </footer>
        </section>
      </div>
    </div>
  );
}
