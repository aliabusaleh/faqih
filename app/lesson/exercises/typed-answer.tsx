"use client";

import { useState } from "react";

import { useMessages } from "@/components/locale-provider";
import { useQuranText } from "@/components/quran-text";
import { answersMatch } from "@/lib/arabic";
import { type Answer, type ExerciseStatus } from "@/lib/exercises";
import { cn, isArabic } from "@/lib/utils";

type TypedAnswerProps = {
  answer: string;
  status: ExerciseStatus;
  onAnswer: (answer: Answer) => void;
  /** One word in a sentence (COMPLETE_WORD), or a whole passage. */
  multiline?: boolean;
};

// Type the answer. Arabic is matched leniently: no diacritics needed, and
// either the Uthmani or the everyday spelling is accepted (see lib/arabic).
export const TypedAnswer = ({
  answer,
  status,
  onAnswer,
  multiline,
}: TypedAnswerProps) => {
  const t = useMessages();
  const [value, setValue] = useState("");
  const arabic = isArabic(answer);
  // The learner types in everyday spelling; the answer shown is Quran.
  const quran = useQuranText();

  const onChange = (next: string) => {
    setValue(next);
    onAnswer({
      ready: next.trim() !== "",
      correct: answersMatch(next, answer),
    });
  };

  const className = cn(
    "w-full rounded-xl border-2 border-b-4 bg-white px-4 py-3 text-neutral-700 outline-none focus:border-brand-300",
    arabic ? "font-arabic text-xl leading-loose" : "text-base",
    status === "correct" && "border-green-300 bg-green-100",
    status === "wrong" && "border-rose-300 bg-rose-100"
  );

  const props = {
    value,
    dir: arabic ? ("rtl" as const) : ("ltr" as const),
    lang: arabic ? "ar" : "en",
    placeholder: t.lesson.typeAnswer,
    "aria-label": t.lesson.typeAnswer,
    autoFocus: true,
    autoComplete: "off",
    spellCheck: false,
    readOnly: status !== "none",
    className,
  };

  return (
    <div className="flex flex-col gap-y-3">
      {multiline ? (
        <textarea
          {...props}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input {...props} onChange={(e) => onChange(e.target.value)} />
      )}

      {status === "wrong" && (
        <p dir="auto" className="text-sm text-rose-600">
          {t.lesson.correctAnswer}{" "}
          <span
            className={cn(
              arabic && (quran ? "font-quran text-xl" : "font-arabic text-lg")
            )}
          >
            {answer}
          </span>
        </p>
      )}
    </div>
  );
};
