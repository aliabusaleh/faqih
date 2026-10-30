// Days as the learner lives them: "YYYY-MM-DD" in their own time zone, so a
// day's review and the streak turn over at their midnight, not the server's.

/** Today's date in `timeZone` (an IANA name); UTC if it isn't a valid one. */
export const localDate = (timeZone: string | undefined, now = new Date()) => {
  try {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

/** The date `days` after `date` (both "YYYY-MM-DD"). */
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
