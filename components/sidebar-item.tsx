"use client";

import Image from "next/image";
import Link from "next/link";

import { useIsActive } from "@/components/nav-items";
import { Button } from "@/components/ui/button";

type SidebarItemProps = {
  label: string;
  iconSrc: string;
  href: string;
};

export const SidebarItem = ({ label, iconSrc, href }: SidebarItemProps) => {
  const isActive = useIsActive()(href);

  return (
    <Button
      variant={isActive ? "sidebarOutline" : "sidebar"}
      className="h-[52px] justify-start"
      asChild
    >
      <Link href={href} aria-current={isActive ? "page" : undefined}>
        <Image
          src={iconSrc}
          alt=""
          className="me-5"
          height={32}
          width={32}
        />
        {label}
      </Link>
    </Button>
  );
};
