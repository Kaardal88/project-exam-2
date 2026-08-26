"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { stemColorPresets } from "@/lib/stemKinds";

type StemColorPickerProps = {
  /** the colour actually being drawn, preset default included */
  color: string;
  /** null when the band has not chosen and the kind's default is in use */
  chosen: string | null;
  onChange: (color: string | null) => void;
  label: string;
};

/**
 * A swatch that opens twelve presets and the operating system's colour picker.
 *
 * No colour-picker dependency, deliberately. `<input type="color">` *is* a real
 * picker -- the OS one, with a colour map, an eyedropper and a hex field -- and
 * the presets are the DAW conventions from lib/stemKinds.ts, so the common case
 * is one click on a swatch the band already thinks in.
 *
 * These colours are data, not palette. They are stored per row and rendered
 * through an inline style, never as a Tailwind class, so a band choosing its
 * own green does not put a new value into the design system.
 */
export function StemColorPicker({
  color,
  chosen,
  onChange,
  label,
}: StemColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Colour for ${label}`}
        title={`Colour for ${label}`}
        className="h-5 w-5 shrink-0 rounded-sm border border-neutral-700 transition hover:cursor-pointer hover:border-yellow-200"
        style={{ backgroundColor: color }}
      />

      <PopoverContent
        align="end"
        className="w-56 border border-neutral-700 bg-neutral-900 p-3"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-100">
          {label}
        </p>

        <div className="grid grid-cols-6 gap-1.5">
          {stemColorPresets.map((preset) => (
            <button
              key={preset.color}
              onClick={() => {
                onChange(preset.color);
                setOpen(false);
              }}
              title={preset.label}
              aria-label={preset.label}
              className={`h-6 w-6 rounded-sm border transition hover:cursor-pointer ${
                color.toLowerCase() === preset.color.toLowerCase()
                  ? "border-yellow-100"
                  : "border-neutral-700 hover:border-neutral-500"
              }`}
              style={{ backgroundColor: preset.color }}
            />
          ))}
        </div>

        <label className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-400">
          Custom colour
          <input
            type="color"
            value={color}
            onChange={(event) => onChange(event.target.value)}
            className="h-6 w-10 cursor-pointer rounded-sm border border-neutral-700 bg-transparent"
          />
        </label>

        {chosen && (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            <RotateCcw className="h-3 w-3" />
            Back to the default
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
