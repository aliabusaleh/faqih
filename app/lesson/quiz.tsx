"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { BookOpen, Volume2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import {
  skipListening,
  upsertChallengeProgress,
} from "@/actions/challenge-progress";
import { reviewAnswer } from "@/actions/review";
import { reduceHearts } from "@/actions/user-progress";
import { useLocale, useMessages } from "@/components/locale-provider";
import { PreloadPage } from "@/components/preload-page";
import { MeaningsProvider } from "@/components/meanings";
import { useIsKids, useMode } from "@/components/mode-provider";
import { type Step, isSpeakable, useReadAloud } from "@/components/read-aloud";
import { MAX_HEARTS } from "@/constants";
import {
  challengeOptions,
  challenges,
  lessons,
  sourceTexts,
  userSubscription,
} from "@/db/schema";
import {
  type Answer,
  type CompleteAyahPayload,
  type CompleteWordPayload,
  type MatchPayload,
  type OrderPayload,
  usesOptions,
} from "@/lib/exercises";
import { formatNumber } from "@/lib/i18n";
import { LAST_UNIT_COOKIE, setPreferenceCookie } from "@/lib/mode";
import { isOfflineError, queueAnswer } from "@/lib/offline-queue";
import { recitationAudio } from "@/lib/recitation";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { Challenge } from "./challenge";
import { AudioPlayer } from "./exercises/audio-player";
import { BlankSentence } from "./exercises/blank-sentence";
import { MatchExercise } from "./exercises/match";
import { OrderExercise } from "./exercises/order";
import { TypedAnswer } from "./exercises/typed-answer";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";
import { SourceNote } from "./source-note";
import { Study } from "./study";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  /** Remembered on the device, so the learn page returns to this surah. */
  unitId?: number;
  /**
   * A hearts review (app/lesson/review): each right answer gives a heart
   * back, a wrong one costs nothing, and the end returns to the lesson.
   */
  review?: { returnHref: string };
  /** Read first: the texts the lesson is about, shown before the questions. */
  studyTexts?: (typeof sourceTexts.$inferSelect)[];
  /**
   * Lessons in parts: what to read before each part's questions
   * (challenges.part). Unset: read `studyTexts` once, then all questions.
   */
  studyParts?: (typeof sourceTexts.$inferSelect)[][] | null;
  /** English mode: the meaning of each ayah in the lesson, by "surah:ayah". */
  meanings?: Record<string, string>;
  /** The next lesson: "Continue" goes there, and it is preloaded. */
  nextLesson?: { id: number; study: string[] } | null;
  reviewStatus: (typeof lessons.$inferSelect)["reviewStatus"];
  isExam?: boolean;
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: (typeof challengeOptions.$inferSelect)[];
    sourceText: typeof sourceTexts.$inferSelect | null;
  })[];
  userSubscription:
    | (typeof userSubscription.$inferSelect & {
        isActive: boolean;
      })
    | null;
};

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  unitId,
  review,
  studyTexts = [],
  studyParts,
  meanings = {},
  nextLesson,
  reviewStatus,
  isExam,
  initialLessonChallenges,
  userSubscription,
}: QuizProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const { width, height } = useWindowSize();
  const t = useMessages();
  const locale = useLocale();
  const isKids = useIsKids();
  const mode = useMode();
  const { enabled: readAloudOn, play, stop, preload } = useReadAloud();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges, setChallenges] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });
  // What to read before a question: its part's ayat in a lesson in parts
  // (none for the final review), else the whole lesson's reading.
  const readingFor = (index: number) => {
    const part = challenges[index]?.part;
    return studyParts && part !== null && part !== undefined
      ? (studyParts[part] ?? [])
      : studyTexts;
  };
  const studies = !review && !isExam;
  // Read, then answer: lessons open on what they're about (and each part
  // on its ayat); exams and reviews go straight in. "read" must be heard
  // or read before the questions open; "back" is a look back at it.
  const [studying, setStudying] = useState<"read" | "back" | null>(() =>
    studies && readingFor(activeIndex).length > 0 ? "read" : null
  );

  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  // Exercises without options (ORDER, MATCH, typed answers) report here.
  const [answer, setAnswer] = useState<Answer>({
    ready: false,
    correct: false,
  });
  // Bumped on retry, so those exercises start over.
  const [attempt, setAttempt] = useState(0);

  const challenge = challenges[activeIndex];

  // A new part (after its last question, or questions skipped): read its
  // ayat before its questions. Set while rendering, so its first question
  // never shows before them.
  const part = challenge?.part ?? null;
  const [shownPart, setShownPart] = useState(part);
  if (part !== shownPart) {
    setShownPart(part);
    if (studies && studyParts && part !== null)
      setStudying(readingFor(activeIndex).length > 0 ? "read" : null);
  }
  // Parts with something to read, for "part 2 of 3".
  const readParts = (studyParts ?? [])
    .map((texts, i) => (texts.length > 0 ? i : -1))
    .filter((i) => i >= 0);
  // "Back to the ayat": this part's, or the whole lesson's in the review.
  const backTexts = readingFor(activeIndex).length
    ? readingFor(activeIndex)
    : studyTexts;
  const options = challenge?.challengeOptions ?? [];
  const optionBased =
    !!challenge && usesOptions(challenge.type, challenge.payload);
  const ready = optionBased ? !!selectedOption : answer.ready;

  const prompts: Partial<Record<string, string>> = t.lesson.prompts;
  // The title is an instruction ("ما الآية التالية؟"), except for old SELECT
  // challenges without a prompt, where it is the question itself.
  const instruction =
    challenge &&
    (challenge.prompt ??
      prompts[challenge.type] ??
      (challenge.type === "ASSIST" ? t.lesson.defaultPrompt : undefined));
  const title = instruction ?? challenge?.question;

  // LISTEN plays the challenge's own ayah ("quran:s:a" -> "s:a").
  const listenRef =
    challenge?.type === "LISTEN"
      ? /^quran:(\d+:\d+)$/.exec(challenge.sourceText?.key ?? "")?.[1]
      : undefined;

  // LISTEN sources, best first; memoised so the player doesn't replay.
  const listenAudioSrc = challenge?.sourceText?.audioSrc;
  const listenUrls = useMemo(
    () =>
      listenRef
        ? recitationAudio(listenRef, mode)
        : listenAudioSrc
          ? [listenAudioSrc]
          : [],
    [listenAudioSrc, listenRef, mode]
  );

  // What "read aloud" says when a question opens: the instruction in the
  // app's voice, then any ayat in the question as real recitation. Quran
  // text is never spoken by the synthetic voice (see isSpeakable).
  const openingSteps = useMemo<Step[]>(() => {
    if (!challenge) return [];
    const steps: Step[] = [];
    if (instruction) steps.push({ kind: "speak", text: instruction });
    const ayat = challenge.readAloud?.ayat ?? (listenRef ? [listenRef] : []);
    for (const ref of ayat) {
      if (steps.length) steps.push({ kind: "wait", ms: 300 });
      steps.push({ kind: "recite", ref });
    }
    const question = challenge.question.replace(/\n⬇\n/g, ". ");
    if (!ayat.length && question && isSpeakable(question))
      steps.push({ kind: "speak", text: question });
    return steps;
  }, [challenge, instruction, listenRef]);

  useEffect(() => {
    if (readAloudOn && !studying && openingSteps.length) play(openingSteps);
  }, [openingSteps, play, readAloudOn, studying]);

  // Download the audio this question and the next will play, while the
  // learner reads: listening ayat always, and with read-aloud on, the ayat in
  // the question and in the options they may tap.
  useEffect(() => {
    const refsOf = (c: (typeof challenges)[number] | undefined) => {
      if (!c) return [];
      const listen =
        c.type === "LISTEN"
          ? [/^quran:(\d+:\d+)$/.exec(c.sourceText?.key ?? "")?.[1]]
          : [];
      const spoken = readAloudOn
        ? [
            ...(c.readAloud?.ayat ?? []),
            ...c.challengeOptions.map((o) => o.recitation),
          ]
        : [];
      return [...listen, ...spoken].filter((r): r is string => !!r);
    };
    preload([
      ...refsOf(challenges[activeIndex]),
      ...refsOf(challenges[activeIndex + 1]),
    ]);
  }, [activeIndex, challenges, preload, readAloudOn]);

  // Near the end of the lesson, get the recitation of the ayat the next one
  // opens with ("Read first"), so moving on from ayat 6-10 to 11-15 doesn't
  // wait for the network. Its page is loaded once this one is finished
  // (PreloadPage below): before that, the next lesson is still locked.
  const nearEnd = challenges.length - activeIndex <= 2;
  useEffect(() => {
    if (!nearEnd || !nextLesson || review) return;
    preload(
      nextLesson.study
        .map((key) => /^quran:(\d+:\d+)$/.exec(key)?.[1])
        .filter((ref): ref is string => !!ref)
    );
  }, [nearEnd, nextLesson, preload, review]);

  // Leaving the lesson stops any sound.
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (unitId) setPreferenceCookie(LAST_UNIT_COOKIE, String(unitId));
  }, [unitId]);

  // Spoken "أحسنت!" / "حاول مرة أخرى" after the chime.
  const encourage = (text: string) => {
    if (readAloudOn)
      play([
        { kind: "wait", ms: 600 },
        { kind: "speak", text },
      ]);
  };

  const resetAnswer = () => {
    setStatus("none");
    setSelectedOption(undefined);
    setAnswer({ ready: false, correct: false });
    setAttempt((a) => a + 1);
  };

  // "Can't listen now": skip this and the lesson's other listening
  // questions, without points or hearts, and carry on.
  const onCantListen = () => {
    const ids = challenges
      .slice(activeIndex)
      .filter((c) => c.type === "LISTEN" && !c.completed)
      .map((c) => c.id);
    startTransition(() => {
      skipListening(ids)
        .catch((error: unknown) => {
          if (!isOfflineError(error)) throw error;
          queueAnswer({ kind: "skip", challengeIds: ids });
        })
        .then(() => {
          stop();
          setPercentage((prev) =>
            Math.min(100, prev + (ids.length * 100) / challenges.length)
          );
          setChallenges((prev) => prev.filter((c) => !ids.includes(c.id)));
          resetAnswer();
        })
        .catch(() => toast.error(t.lesson.error));
    });
  };

  // No connection (a lesson downloaded for offline use): the answer is kept
  // on the device and sent later (lib/offline-queue). The hearts rules are
  // the server's, applied here on what this page knows.
  const subscribed = !!userSubscription?.isActive;
  const saveCorrect = () =>
    upsertChallengeProgress(challenge.id).catch((error: unknown) => {
      if (!isOfflineError(error)) throw error;
      if (hearts === 0 && !challenge.completed && !subscribed && !isKids)
        return { error: "hearts" as const };
      queueAnswer({ kind: "correct", challengeId: challenge.id });
    });
  const saveWrong = () =>
    reduceHearts(challenge.id).catch((error: unknown) => {
      if (!isOfflineError(error)) throw error;
      queueAnswer({ kind: "wrong", challengeId: challenge.id });
      if (challenge.completed) return { error: "practice" as const };
      if (isKids) return { error: "kids" as const };
      if (subscribed) return { error: "subscription" as const };
      if (hearts === 0) return { error: "hearts" as const };
    });

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
  };

  const onContinue = () => {
    if (!ready) return;

    if (status === "wrong") {
      resetAnswer();
      return;
    }

    if (status === "correct") {
      onNext();
      resetAnswer();
      return;
    }

    let isCorrect = answer.correct;
    if (optionBased) {
      const correctOption = options.find((option) => option.correct);
      if (!correctOption) return;
      isCorrect = correctOption.id === selectedOption;
    }

    if (review) {
      // Review: a right answer earns a heart back; a wrong one costs nothing.
      if (!isCorrect) {
        void incorrectControls.play();
        encourage(t.lesson.wrong);
        setStatus("wrong");
        return;
      }
      startTransition(() => {
        reviewAnswer(challenge.id)
          .then(({ hearts }) => {
            void correctControls.play();
            encourage(t.lesson.correct);
            setStatus("correct");
            setHearts(hearts);
            setPercentage((prev) => prev + 100 / challenges.length);
          })
          .catch(() => toast.error(t.lesson.error));
      });
      return;
    }

    if (isCorrect) {
      startTransition(() => {
        saveCorrect()
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal(lessonId);
              return;
            }

            void correctControls.play();
            encourage(t.lesson.correct);
            setStatus("correct");
            setPercentage((prev) => prev + 100 / challenges.length);

            // This is a practice
            if (initialPercentage === 100) {
              setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
            }
          })
          .catch(() => toast.error(t.lesson.error));
      });
    } else {
      startTransition(() => {
        saveWrong()
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal(lessonId);
              return;
            }

            void incorrectControls.play();
            encourage(t.lesson.wrong);
            setStatus("wrong");

            if (!response?.error) setHearts((prev) => Math.max(prev - 1, 0));
          })
          .catch(() => toast.error(t.lesson.error));
      });
    }
  };

  if (!challenge) {
    return (
      <>
        {/* No music (ma'azif): just the short "correct" sound, once. */}
        <audio src="/correct.wav" autoPlay />
        {nextLesson && !review && (
          <PreloadPage href={`/lesson/${nextLesson.id}`} />
        )}
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            {review
              ? t.review.done
              : isExam
                ? t.lesson.examPassed
                : t.lesson.finished}
          </h1>

          <div className="flex w-full items-center gap-x-4">
            {/* A review earns hearts, not points. */}
            {!review && (
              <ResultCard variant="points" value={challenges.length * 10} />
            )}
            {!isKids && (
              <ResultCard
                variant="hearts"
                value={userSubscription?.isActive ? Infinity : hearts}
              />
            )}
          </div>
        </div>

        {/* Say where "continue" goes: straight into the next wird (it is
            already preloaded), with a way back to the learn page too. */}
        <Footer
          lessonId={review ? undefined : lessonId}
          status="completed"
          continueLabel={!review && nextLesson ? t.lesson.nextWird : undefined}
          onHome={
            !review && nextLesson ? () => router.push("/learn") : undefined
          }
          onCheck={() =>
            router.push(
              review?.returnHref ??
                (nextLesson ? `/lesson/${nextLesson.id}` : "/learn")
            )
          }
        />
      </>
    );
  }

  const exerciseKey = `${challenge.id}:${attempt}`;
  const payload = challenge.payload;
  const selectedText = options.find((o) => o.id === selectedOption)?.text;

  if (studying)
    return (
      <>
        <Header
          hearts={hearts}
          percentage={percentage}
          hasActiveSubscription={!!userSubscription?.isActive}
          hideHearts={isKids}
        />
        <div className="flex min-h-0 flex-1 justify-center overflow-y-auto overscroll-contain pt-8">
          <Study
            key={`${part}:${studying}`}
            texts={studying === "back" ? backTexts : readingFor(activeIndex)}
            requireReading={studying === "read"}
            partLabel={
              studying === "read" && part !== null && readParts.length > 1
                ? t.study.part(
                    formatNumber(locale, readParts.indexOf(part) + 1),
                    formatNumber(locale, readParts.length)
                  )
                : undefined
            }
            startLabel={
              studying === "back" ? t.study.backToQuestions : undefined
            }
            onStart={() => {
              stop();
              setStudying(null);
            }}
          />
        </div>
      </>
    );

  return (
    <MeaningsProvider meanings={meanings}>
      {incorrectAudio}
      {correctAudio}
      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={!!userSubscription?.isActive}
        hideHearts={isKids}
      />

      {/* The question scrolls on its own between header and footer, so the
          Check button stays in view. It is centred only while it fits:
          my-auto (not items-center) never pushes a long question's top out
          of reach. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full justify-center py-6">
          <div className="my-auto flex w-full flex-col gap-y-12 px-6 lg:min-h-[350px] lg:w-[600px] lg:px-0">
            <div className="flex items-center justify-center gap-x-3 lg:justify-start">
              {/* Announced to screen readers on every new question. */}
              <h1
                aria-live="polite"
                className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl"
              >
                {title}
              </h1>
              {/* Forgot the ayat? Read them again, then carry on. */}
              {studies && backTexts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setStudying("back");
                  }}
                  aria-label={t.lesson.backToAyat}
                  title={t.lesson.backToAyat}
                  className="shrink-0 rounded-xl border-2 border-b-4 p-2 text-gold-700 hover:bg-black/5 active:border-b-2"
                >
                  <BookOpen className="h-6 w-6" />
                </button>
              )}
              {/* Replay works even when read-aloud is off in Settings. */}
              {openingSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => play(openingSteps)}
                  aria-label={t.lesson.listenAgain}
                  className="shrink-0 rounded-xl border-2 border-b-4 p-2 text-brand-500 hover:bg-black/5 active:border-b-2"
                >
                  <Volume2 className="h-6 w-6" />
                </button>
              )}
            </div>

            <div>
              {(challenge.type === "ASSIST" ||
                challenge.type === "TRUE_FALSE" ||
                challenge.type === "COMPLETE_AYAH") && (
                <QuestionBubble
                  question={challenge.question}
                  meanings={(challenge.readAloud?.ayat ?? [])
                    .map((ref) => meanings[ref])
                    .filter((m): m is string => !!m)}
                />
              )}

              {challenge.type === "LISTEN" && listenUrls.length > 0 && (
                <>
                  <AudioPlayer urls={listenUrls} />
                  {status === "none" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={onCantListen}
                      className="mx-auto mb-6 block text-sm font-bold text-brand-500 hover:underline"
                    >
                      {t.lesson.cantListen}
                    </button>
                  )}
                </>
              )}

              {challenge.type === "COMPLETE_WORD" && (
                <BlankSentence
                  meaning={
                    meanings[
                      challenge.sourceText?.key.replace(/^quran:/, "") ?? ""
                    ]
                  }
                  before={(payload as CompleteWordPayload).before}
                  after={(payload as CompleteWordPayload).after}
                  fill={optionBased ? selectedText : undefined}
                />
              )}

              {optionBased && (
                <Challenge
                  options={options}
                  onSelect={onSelect}
                  status={status}
                  selectedOption={selectedOption}
                  disabled={pending}
                  type={challenge.type}
                />
              )}

              {challenge.type === "ORDER" && (
                <OrderExercise
                  key={exerciseKey}
                  words={(payload as OrderPayload).words}
                  recitations={(payload as OrderPayload).recitations}
                  seed={challenge.id}
                  status={status}
                  onAnswer={setAnswer}
                />
              )}

              {challenge.type === "MATCH" && (
                <MatchExercise
                  key={exerciseKey}
                  pairs={(payload as MatchPayload).pairs}
                  seed={challenge.id}
                  status={status}
                  onAnswer={setAnswer}
                />
              )}

              {!optionBased &&
                (challenge.type === "COMPLETE_WORD" ||
                  challenge.type === "COMPLETE_AYAH") && (
                  <TypedAnswer
                    key={exerciseKey}
                    answer={
                      (payload as CompleteWordPayload | CompleteAyahPayload)
                        .answer
                    }
                    multiline={challenge.type === "COMPLETE_AYAH"}
                    status={status}
                    onAnswer={setAnswer}
                  />
                )}

              <SourceNote
                source={challenge.sourceText}
                isDraft={reviewStatus !== "reviewed"}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={pending || !ready}
        status={status}
        onCheck={onContinue}
      />
    </MeaningsProvider>
  );
};
