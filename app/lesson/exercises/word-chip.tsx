import { useIsKids } from "@/components/mode-provider";
import { useQuranText } from "@/components/quran-text";
import { type ExerciseStatus } from "@/lib/exercises";
import { cn, isArabic } from "@/lib/utils";

type WordChipProps = {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Keeps the chip's space in the layout but hides it (a used word). */
  invisible?: boolean;
  tone?: ExerciseStatus | "selected";
  badge?: number;
  className?: string;
};

// A tappable word or phrase, used by the ORDER and MATCH exercises.
export const WordChip = ({
  text,
  onClick,
  disabled,
  invisible,
  tone = "none",
  badge,
  className,
}: WordChipProps) => {
  const isKids = useIsKids();
  const quran = useQuranText();
  return (
    <button
      type="button"
      dir="auto"
      onClick={onClick}
      disabled={disabled || invisible}
      aria-hidden={invisible}
      className={cn(
        "relative rounded-xl border-2 border-b-4 bg-white px-3 py-2 text-neutral-700 transition hover:bg-black/5 active:border-b-2 disabled:pointer-events-none",
        isArabic(text)
          ? quran
            ? "font-quran text-xl leading-[2.4] lg:text-2xl"
            : "font-arabic text-lg leading-loose lg:text-xl"
          : "text-sm lg:text-base",
        tone === "selected" && "border-brand-300 bg-brand-100 text-brand-600",
        tone === "correct" && "border-green-300 bg-green-100 text-green-600",
        tone === "wrong" && "border-rose-300 bg-rose-100 text-rose-600",
        invisible && "invisible",
        isKids && "px-4 py-3 text-xl lg:text-2xl",
        className
      )}
    >
      {badge !== undefined && (
        <span className="absolute -top-2 start-2 rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
          {badge}
        </span>
      )}
      {text}
    </button>
  );
};
