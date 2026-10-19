"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale, useMessages } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE } from "@/lib/i18n";

export const LanguageSwitcher = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages();

  const onClick = () => {
    const next = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      lang={locale === "ar" ? "en" : "ar"}
    >
      <Languages className="me-2 h-4 w-4" />
      {t.language.switchTo}
    </Button>
  );
};
