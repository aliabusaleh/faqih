"use client";

import Link from "next/link";

import { UserMenu } from "@/components/auth-controls";
import { InviteButton } from "@/components/invite";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { useMessages } from "@/components/locale-provider";
import { useNavItems } from "@/components/nav-items";
import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
};

// The menu on wide screens. Phones get the tab bar (bottom-nav.tsx) instead.
export const Sidebar = ({ className }: SidebarProps) => {
  const t = useMessages();
  const { items, settings } = useNavItems();

  return (
    <div
      className={cn(
        "start-0 top-0 flex h-full flex-col border-e-2 px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/learn">
        <div className="flex items-center gap-x-3 pb-7 ps-4 pt-8">
          <Logo />
        </div>
      </Link>

      <nav aria-label={t.nav.menu} className="flex flex-1 flex-col gap-y-2">
        {[...items, settings].map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="flex flex-col items-start gap-y-3 p-4">
        <InviteButton />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </div>
  );
};
