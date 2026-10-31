import { Meaning } from "@/components/meanings";
import { useQuranText } from "@/components/quran-text";
import { cn, isArabic } from "@/lib/utils";

type BlankSentenceProps = {
  before: string;
  after: string;
  /** The chosen word, shown in the blank. */
  fill?: string;
  /** English mode: the meaning of the ayah. */
  meaning?: string;
};

// An ayah with one word missing, for COMPLETE_WORD.
export const BlankSentence = ({
  before,
  after,
  fill,
  meaning,
}: BlankSentenceProps) => {
  const arabic = isArabic(before || after);
  const quran = useQuranText();

  return (
    <p
      dir={arabic ? "rtl" : "ltr"}
      className={cn(
        "mb-6 rounded-xl border-2 px-4 py-3 text-neutral-700",
        arabic
          ? quran
            ? "font-quran text-2xl leading-[2.4] lg:text-3xl"
            : "font-arabic text-xl leading-loose lg:text-2xl"
          : "text-base lg:text-lg"
      )}
    >
      {before}{" "}
      <span
        className={cn(
          "inline-block min-w-[4rem] border-b-2 border-dashed border-brand-400 px-1 text-center",
          fill && "text-brand-600"
        )}
      >
        {fill ?? <>&nbsp;</>}
      </span>{" "}
      {after}
      <Meaning text={meaning} />
    </p>
  );
};
