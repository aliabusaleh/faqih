import { CheckCircle, XCircle } from "lucide-react";
import { useKey } from "react-use";

import { useMessages } from "@/components/locale-provider";
import { useIsKids } from "@/components/mode-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  /** Lesson finished: the main button's text, e.g. "Next wird". */
  continueLabel?: string;
  /** Lesson finished: a second way out, back to the learn page. */
  onHome?: () => void;
};

export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
  continueLabel,
  onHome,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const t = useMessages();
  // Size by CSS breakpoint, not JS: a JS media query renders differently on
  // the server and the client (hydration mismatch).
  // Kids always get the big buttons.
  const responsiveSize = useIsKids()
    ? "h-14 px-8 text-lg"
    : "h-9 px-3 lg:h-12 lg:px-8";

  return (
    <footer
      className={cn(
        "h-[100px] border-t-2 lg:h-[140px]",
        status === "correct" && "border-transparent bg-green-100",
        status === "wrong" && "border-transparent bg-rose-100"
      )}
    >
      <div className="mx-auto flex h-full max-w-[1140px] items-center justify-between px-6 lg:px-10">
        {status === "correct" && (
          <div className="flex items-center text-base font-bold text-green-500 lg:text-2xl">
            <CheckCircle className="me-4 h-6 w-6 lg:h-10 lg:w-10" />
            {t.lesson.correct}
          </div>
        )}

        {status === "wrong" && (
          <div className="flex items-center text-base font-bold text-rose-500 lg:text-2xl">
            <XCircle className="me-4 h-6 w-6 lg:h-10 lg:w-10" />
            {t.lesson.wrong}
          </div>
        )}

        {status === "completed" && (onHome || lessonId) && (
          <div className="flex items-center gap-x-2">
            {onHome && (
              <Button
                variant="primaryOutline"
                className={responsiveSize}
                onClick={onHome}
              >
                {t.lesson.backToMain}
              </Button>
            )}
            {lessonId && (
              <Button
                variant="ghost"
                className={responsiveSize}
                onClick={() => (window.location.href = `/lesson/${lessonId}`)}
              >
                {t.lesson.practiceAgain}
              </Button>
            )}
          </div>
        )}

        <Button
          disabled={disabled}
          aria-disabled={disabled}
          className={cn("ms-auto", responsiveSize)}
          onClick={onCheck}
          variant={status === "wrong" ? "danger" : "secondary"}
        >
          {status === "none" && t.lesson.check}
          {status === "correct" && t.lesson.next}
          {status === "wrong" && t.lesson.retry}
          {status === "completed" && (continueLabel ?? t.lesson.continue)}
        </Button>
      </div>
    </footer>
  );
};
