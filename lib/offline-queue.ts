// Answers given with no connection: kept on the device, in order, and sent
// through the usual server actions once the learner is back online
// (components/offline-banner). Nothing is lost if the tab is closed.

import {
  skipListening,
  upsertChallengeProgress,
} from "@/actions/challenge-progress";
import { reduceHearts } from "@/actions/user-progress";

const QUEUE_KEY = "faqih-offline-answers";
const CHANGED = "faqih-offline-answers";

export type QueuedAnswer =
  | { kind: "correct" | "wrong"; challengeId: number }
  | { kind: "skip"; challengeIds: number[] };

export const queuedAnswers = (): QueuedAnswer[] => {
  try {
    return JSON.parse(
      localStorage.getItem(QUEUE_KEY) ?? "[]"
    ) as QueuedAnswer[];
  } catch {
    return [];
  }
};

const store = (answers: QueuedAnswer[]) => {
  if (answers.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(answers));
  else localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new Event(CHANGED));
};

export const onQueueChange = (listener: () => void) => {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
};

export const queueAnswer = (answer: QueuedAnswer) => {
  const answers = queuedAnswers();
  // A question answered right twice counts once, as it would online.
  if (
    answer.kind === "correct" &&
    answers.some(
      (a) => a.kind === "correct" && a.challengeId === answer.challengeId
    )
  )
    return;
  store([...answers, answer]);
};

/** The server couldn't be reached (as opposed to it saying no). */
export const isOfflineError = (error: unknown) =>
  !navigator.onLine ||
  (error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message));

let syncing: Promise<number> | null = null;

/** Sends the queued answers, oldest first. Returns how many were sent. */
export const syncAnswers = () =>
  (syncing ??= (async () => {
    let sent = 0;
    try {
      for (
        let answers = queuedAnswers();
        answers.length;
        answers = queuedAnswers()
      ) {
        const [answer] = answers;
        try {
          if (answer.kind === "skip") await skipListening(answer.challengeIds);
          else if (answer.kind === "correct")
            await upsertChallengeProgress(answer.challengeId);
          else await reduceHearts(answer.challengeId);
        } catch (error) {
          // Still offline: try again later. Anything else (a question that
          // no longer exists) is dropped, so the rest can go through.
          if (isOfflineError(error)) break;
        }
        store(queuedAnswers().slice(1));
        sent++;
      }
    } finally {
      syncing = null;
    }
    return sent;
  })());
