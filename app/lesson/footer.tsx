import { CheckCircle, XCircle } from "lucide-react";
import { useKey, useMedia } from "react-use";

import { useMessages } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
};

export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const t = useMessages();
  const isMobile = useMedia("(max-width: 1024px)");

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

        {status === "completed" && (
          <Button
            variant="default"
            size={isMobile ? "sm" : "lg"}
            onClick={() => (window.location.href = `/lesson/${lessonId}`)}
          >
            {t.lesson.practiceAgain}
          </Button>
        )}

        <Button
          disabled={disabled}
          aria-disabled={disabled}
          className="ms-auto"
          onClick={onCheck}
          size={isMobile ? "sm" : "lg"}
          variant={status === "wrong" ? "danger" : "secondary"}
        >
          {status === "none" && t.lesson.check}
          {status === "correct" && t.lesson.next}
          {status === "wrong" && t.lesson.retry}
          {status === "completed" && t.lesson.continue}
        </Button>
      </div>
    </footer>
  );
};
