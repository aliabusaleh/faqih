import { BookOpen, HandHeart, Landmark, Scale, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/locale";

// Same order as messages.app.tracks: Quran, Hadith, Sirah, Adhkar, Fiqh.
const ICONS = [BookOpen, ScrollText, Landmark, HandHeart, Scale];

export const Footer = async () => {
  const t = await getMessages();

  return (
    <div className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        {t.app.tracks.map((label, i) => {
          const Icon = ICONS[i];
          return (
            <Button
              key={label}
              size="lg"
              variant="ghost"
              className="w-full cursor-default"
            >
              <Icon className="me-4 h-7 w-7 text-green-600" />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
