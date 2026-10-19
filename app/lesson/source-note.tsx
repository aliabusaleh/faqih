import { BookOpenCheck, TriangleAlert } from "lucide-react";

import { sourceTexts } from "@/db/schema";

type SourceNoteProps = {
  source: typeof sourceTexts.$inferSelect | null;
  isDraft: boolean;
};

// Shows where a challenge's text comes from, so every answer is checkable.
export const SourceNote = ({ source, isDraft }: SourceNoteProps) => {
  if (!source && !isDraft) return null;

  const needsReference = source?.kind !== "ayah" && !source?.hadithRef;

  return (
    <div className="mt-6 flex flex-col gap-y-1 text-xs text-muted-foreground lg:text-sm">
      {source && (
        <p className="flex items-center gap-x-1.5">
          <BookOpenCheck className="h-4 w-4 shrink-0 text-green-600" />
          <span>
            Source:{" "}
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-green-700 underline-offset-2 hover:underline"
            >
              {source.citation}
            </a>
            {source.hadithRef && <> · {source.hadithRef}</>}
            {source.translationBy && (
              <> · Translation: {source.translationBy}</>
            )}
          </span>
        </p>
      )}

      {isDraft && (
        <p className="flex items-center gap-x-1.5 text-amber-600">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          Draft: not yet reviewed by a scholar
          {source && needsReference && " · hadith reference pending"}
        </p>
      )}
    </div>
  );
};
