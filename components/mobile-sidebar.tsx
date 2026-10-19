"use client";

import { Menu } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { Sidebar } from "./sidebar";

export const MobileSidebar = () => {
  const locale = useLocale();

  return (
    <Sheet>
      <SheetTrigger>
        <Menu className="text-white" />
      </SheetTrigger>

      <SheetContent
        className="z-[100] p-0"
        side={locale === "ar" ? "right" : "left"}
      >
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
