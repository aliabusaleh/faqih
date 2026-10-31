import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getMessages } from "@/lib/locale";

type HeaderProps = {
  title: string;
  imageSrc: string;
};

// The course being learned, and the way to switch: one tap to the courses.
export const Header = async ({ title, imageSrc }: HeaderProps) => {
  const t = await getMessages();

  return (
    <div className="sticky top-[56px] z-40 mb-5 border-b-2 bg-white py-3 lg:top-0 lg:z-50 lg:mt-[-28px] lg:pt-[28px]">
      <Link
        href="/courses"
        aria-label={`${t.courses.change}: ${title}`}
        className="flex w-full items-center gap-x-3 rounded-xl border-2 border-b-4 p-2 pe-3 hover:bg-black/5 active:border-b-2"
      >
        <Image
          src={imageSrc}
          alt=""
          width={40}
          height={40}
          className="rounded-lg border"
        />
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="text-xs font-bold text-neutral-400">
            {t.courses.current}
          </span>
          <span className="w-full truncate text-start text-lg font-bold text-neutral-700">
            {title}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-x-1 text-sm font-bold text-brand-500">
          {t.courses.change}
          <ChevronDown className="h-4 w-4 stroke-[3]" />
        </span>
      </Link>
    </div>
  );
};
