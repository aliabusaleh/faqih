"use client";

import { BookOpenCheck, TriangleAlert } from "lucide-react";

import { useLocale, useMessages } from "@/components/locale-provider";
import { sourceTexts } from "@/db/schema";

type SourceNoteProps = {
  source: typeof sourceTexts.$inferSelect | null;
  isDraft: boolean;
};

// Shows where a challenge's text comes from, so every answer is checkable.
// Arabic lessons quote the original texts, so no translator is shown there.
export const SourceNote = ({ source, isDraft }: SourceNoteProps) => {
  const t = useMessages();
  const locale = useLocale();

  if (!source && !isDraft) return null;

  const isArabic = locale === "ar";
  const citation = isArabic
    ? (source?.citationAr ?? source?.citation)
    : source?.citation;
  const hadithRef = isArabic ? source?.hadithRefAr : source?.hadithRef;
  const needsReference = source?.kind !== "ayah" && !hadithRef;

  return (
    <div className="mt-6 flex flex-col gap-y-1 text-xs text-muted-foreground lg:text-sm">
      {source && (
        <p className="flex items-center gap-x-1.5">
          <BookOpenCheck className="h-4 w-4 shrink-0 text-green-600" />
          <span>
            {t.source.label}:{" "}
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-green-700 underline-offset-2 hover:underline"
            >
              {citation}
            </a>
            {hadithRef && <> · {hadithRef}</>}
            {!isArabic && source.translationBy && (
              <>
                {" "}
                · {t.source.translation}: {source.translationBy}
              </>
            )}
          </span>
        </p>
      )}

      {isDraft && (
        <p className="flex items-center gap-x-1.5 text-amber-600">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {t.source.draft}
          {source && needsReference && ` · ${t.source.referencePending}`}
        </p>
      )}
    </div>
  );
};
