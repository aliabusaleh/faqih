import Image from "next/image";

import { Meaning } from "@/components/meanings";
import { useQuranText } from "@/components/quran-text";

import { cn, isArabic } from "@/lib/utils";

type QuestionBubbleProps = {
  question: string;
  /** English mode: the meaning of each ayah in the question. */
  meanings?: string[];
};

export const QuestionBubble = ({ question, meanings }: QuestionBubbleProps) => {
  const quran = useQuranText();
  return (
    <div className="mb-6 flex items-center gap-x-4">
      <Image
        src="/mascot.svg"
        alt="Mascot"
        height={60}
        width={60}
        className="hidden lg:block"
      />
      <Image
        src="/mascot.svg"
        alt="Mascot"
        height={40}
        width={40}
        className="block lg:hidden"
      />

      <div
        dir="auto"
        aria-live="polite"
        className={cn(
          "relative whitespace-pre-line rounded-xl border-2 px-4 py-2 text-sm lg:text-base",
          isArabic(question) &&
            (quran
              ? "font-quran text-xl leading-[2.4] lg:text-3xl"
              : "font-arabic text-lg leading-loose lg:text-2xl")
        )}
      >
        {question}
        {meanings?.map((m) => (
          <Meaning key={m} text={m} />
        ))}

        <div
          className="absolute -left-3 top-1/2 h-0 w-0 -translate-y-1/2 rotate-90 transform border-x-8 border-t-8 border-x-transparent rtl:-right-3 rtl:left-auto rtl:-rotate-90"
          aria-hidden
        />
      </div>
    </div>
  );
};
