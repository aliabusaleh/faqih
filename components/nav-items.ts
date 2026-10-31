"use client";

import { usePathname } from "next/navigation";

import { useMessages } from "@/components/locale-provider";
import { useIsKids } from "@/components/mode-provider";
import { features } from "@/config";

export type NavItem = {
  href: string;
  label: string;
  iconSrc: string;
};

// The app's places, most used first. The sidebar shows them all; the phone
// tab bar shows all but Settings, which sits in the phone's top bar.
export const useNavItems = () => {
  const t = useMessages();
  const isKids = useIsKids();

  const items: NavItem[] = [
    { href: "/learn", label: t.nav.learn, iconSrc: "/learn.svg" },
    { href: "/courses", label: t.nav.courses, iconSrc: "/courses.svg" },
    { href: "/read", label: t.nav.read, iconSrc: "/read.svg" },
    { href: "/modes", label: t.nav.modes, iconSrc: "/modes.svg" },
    // Kids mode keeps the menu short: no points, hearts or rankings.
    ...(isKids
      ? []
      : [
          {
            href: "/leaderboard",
            label: t.nav.leaderboard,
            iconSrc: "/leaderboard.svg",
          },
          ...(features.shop
            ? [{ href: "/shop", label: t.nav.shop, iconSrc: "/shop.svg" }]
            : []),
        ]),
  ];
  const settings: NavItem = {
    href: "/settings",
    label: t.nav.settings,
    iconSrc: "/mascot.svg",
  };

  return { items, settings };
};

/** Whether `href` is the current page or one under it (/read/surah/2). */
export const useIsActive = () => {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
};
