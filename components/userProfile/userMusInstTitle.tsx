"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const defaultTags = [
  { value: "drummer", label: "Drummer", icon: "🥁" },
  { value: "singer", label: "Singer", icon: "🎤" },
  { value: "guitarist", label: "Guitarist", icon: "🎸" },
  { value: "producer", label: "Producer", icon: "🎛️" },
  { value: "mixing-engineer", label: "Mixing Engineer", icon: "🎚️" },
  { value: "mastering-engineer", label: "Mastering Engineer", icon: "💿" },
  { value: "manager", label: "Manager", icon: "📋" },
];

export function TagCombobox({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase().replaceAll(" ", "-");

  const tagExists = defaultTags.some((tag) => tag.value === normalizedSearch);

  function toggleTag(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  function createTag() {
    if (!normalizedSearch) return;
    if (!value.includes(normalizedSearch)) {
      onChange([...value, normalizedSearch]);
    }
    setSearch("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-none">What do you do?</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            className="w-full px-3 py-6 justify-between border border-neutral-700 text-yellow-100"
          >
            Choose from list or create role
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0 ">
          <Command>
            <CommandInput
              placeholder="Search or create role..."
              value={search}
              onValueChange={setSearch}
            />

            <CommandEmpty>
              <button
                type="button"
                onClick={createTag}
                className="w-full px-3 py-2 text-left text-sm"
              >
                Create “{search}”
              </button>
            </CommandEmpty>

            <CommandGroup>
              {defaultTags.map((tag) => (
                <CommandItem
                  key={tag.value}
                  value={tag.value}
                  onSelect={() => toggleTag(tag.value)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      value.includes(tag.value) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="mr-2">{tag.icon}</span>
                  {tag.label}
                </CommandItem>
              ))}

              {search && !tagExists && (
                <CommandItem onSelect={createTag}>
                  Create “{search}”
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {value.map((tag) => {
          const defaultTag = defaultTags.find((item) => item.value === tag);

          return (
            <span
              key={tag}
              className="flex items-center gap-2 rounded-full border border-yellow-200/30 bg-black/60 px-3 py-1 text-sm text-yellow-100"
            >
              {defaultTag?.icon}
              {defaultTag?.label ?? tag}

              <button type="button" onClick={() => toggleTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
