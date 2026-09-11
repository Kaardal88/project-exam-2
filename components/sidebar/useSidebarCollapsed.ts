"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "stemlock:sidebar-collapsed";

/**
 * Whether the desktop sidebar is folded down to icons, remembered per browser.
 *
 * One preference for every sidebar in the app, not one each. Somebody who has
 * folded the menu on the band profile has said something about their screen,
 * and opening a song to find it unfolded again would be the app forgetting.
 *
 * localStorage because nobody else needs it and the server never does. Every
 * access is guarded -- storage can be blocked outright, and a menu that fails
 * to render over a convenience would be a poor trade.
 *
 * Read in the initialiser rather than an effect so the menu is never drawn
 * open and then snapped shut. That is safe from hydration trouble only because
 * both pages using it render a loader first, on the server and on the client
 * alike; the sidebar does not exist until after mount.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;

      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Not remembered, but still folded for as long as the page is open.
      }

      return next;
    });
  }, []);

  return [collapsed, toggle] as const;
}
