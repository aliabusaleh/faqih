"use client";

import Image from "next/image";
import Link from "next/link";

import { useMessages } from "@/components/locale-provider";
import { useIsActive, useNavItems } from "@/components/nav-items";
import { cn } from "@/lib/utils";

// The menu on phones: every place one tap away, always in view.
export const BottomNav = () => {
  const t = useMessages();
  const isActive = useIsActive();
  // The shop, when on, is reached from the points; it would crowd the bar.
  const items = useNavItems().items.filter((item) => item.href !== "/shop");

  return (
    <nav
      aria-label={t.nav.menu}
      className="fixed bottom-0 z-50 w-full border-t-2 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul
        className="mx-auto grid h-16 max-w-[560px]"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map(({ href, label, iconSrc }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-y-0.5 text-[11px] font-bold text-slate-500",
                  active && "text-brand-600"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-xl border-2 border-transparent",
                    active && "border-brand-300 bg-brand-500/15"
                  )}
                >
                  <Image src={iconSrc} alt="" height={26} width={26} />
                </span>
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
