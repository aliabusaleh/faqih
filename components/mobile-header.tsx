"use client";

import { Settings } from "lucide-react";
import Link from "next/link";

import { UserMenu } from "@/components/auth-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { useIsActive, useNavItems } from "@/components/nav-items";
import { cn } from "@/lib/utils";

// The phone's top bar: the logo, then language, settings and account. The
// places to go are in the tab bar at the bottom (bottom-nav.tsx).
export const MobileHeader = () => {
  const { settings } = useNavItems();
  const onSettings = useIsActive()(settings.href);

  return (
    <header className="fixed top-0 z-50 flex h-[56px] w-full items-center justify-between gap-x-2 border-b-2 bg-white px-3 lg:hidden">
      <Link href="/learn">
        <Logo size="sm" />
      </Link>

      <div className="flex items-center gap-x-1">
        <LanguageSwitcher />
        <Link
          href={settings.href}
          aria-label={settings.label}
          title={settings.label}
          aria-current={onSettings ? "page" : undefined}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border-2 border-transparent hover:bg-slate-100",
            onSettings && "border-brand-300 bg-brand-500/15"
          )}
        >
          <Settings className="h-6 w-6 text-slate-500" />
        </Link>
        <UserMenu compact />
      </div>
    </header>
  );
};
