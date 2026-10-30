import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { MAX_HEARTS } from "@/constants";
import {
  CHALLENGE_TYPES,
  type ChallengePayload,
  type ReadAloud,
} from "@/lib/exercises";

export const tracksEnum = pgEnum("track", [
  "kids",
  "quran",
  "hadith",
  "sirah",
  "adhkar",
  "arabic",
  "fiqh",
]);

// Each course is entirely in one language; the app shows courses in the
// visitor's chosen language only.
export const languageEnum = pgEnum("language", ["en", "ar"]);

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
  slug: text("slug").unique(), // e.g. "quran-al-fatiha"; set by the content importer
  track: tracksEnum("track"),
  language: languageEnum("language").notNull().default("en"),
  minAge: integer("min_age"), // for kids courses
  maxAge: integer("max_age"),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

// Postgres doesn't index foreign keys by itself. The learn page and lessons
// look rows up by their parent (a course's units, a unit's lessons, a
// lesson's challenges, a learner's progress), so each of those is indexed.
export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(), // Unit 1
    description: text("description").notNull(), // Learn the basics of spanish
    courseId: integer("course_id")
      .references(() => courses.id, {
        onDelete: "cascade",
      })
      .notNull(),
    order: integer("order").notNull(),
  },
  (table) => [index("units_course_id_idx").on(table.courseId)]
);

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

// Lessons stay "draft" until a qualified reviewer approves them.
export const reviewStatusEnum = pgEnum("review_status", ["draft", "reviewed"]);

// An exam closes each unit. Passing it opens the next unit (see lib/progress)
// without marking this unit's lessons as done.
export const lessonKindEnum = pgEnum("lesson_kind", ["lesson", "exam"]);

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    kind: lessonKindEnum("kind").notNull().default("lesson"),
    // Group heading on the learn page (e.g. the hizb quarter a lesson is in).
    section: text("section"),
    // Source keys shown before the questions ("read first"), in order.
    study: jsonb("study").$type<string[]>(),
    // Read, then answer, a few ayat at a time: the source keys read before
    // each part's questions (challenges.part). Null: one read, then all.
    parts: jsonb("parts").$type<string[][]>(),
    reviewStatus: reviewStatusEnum("review_status").notNull().default("draft"),
    unitId: integer("unit_id")
      .references(() => units.id, {
        onDelete: "cascade",
      })
      .notNull(),
    order: integer("order").notNull(),
  },
  (table) => [index("lessons_unit_id_idx").on(table.unitId)]
);

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", CHALLENGE_TYPES);

export const challenges = pgTable(
  "challenges",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .references(() => lessons.id, {
        onDelete: "cascade",
      })
      .notNull(),
    type: challengesEnum("type").notNull(),
    question: text("question").notNull(),
    prompt: text("prompt"), // overrides the default title shown above the question
    // Type-specific data (word order, pairs, typed answer...); see lib/exercises.
    payload: jsonb("payload").$type<ChallengePayload>(),
    // Ayat shown in the question, recited when it's read aloud (lib/recitation).
    readAloud: jsonb("read_aloud").$type<ReadAloud>(),
    // The lesson part it is asked in (lessons.parts), from 0. Null: no parts.
    part: integer("part"),
    sourceTextId: integer("source_text_id").references(() => sourceTexts.id, {
      onDelete: "set null",
    }),
    order: integer("order").notNull(),
  },
  (table) => [
    index("challenges_lesson_id_idx").on(table.lessonId),
    // The daily review asks about an ayah with one of its questions.
    index("challenges_source_text_id_idx").on(table.sourceTextId),
  ]
);

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
  sourceText: one(sourceTexts, {
    fields: [challenges.sourceTextId],
    references: [sourceTexts.id],
  }),
}));

// The 114 surahs, imported with the full Quran text (one source_texts row per
// ayah, keyed "quran:<surah>:<ayah>").
export const surahs = pgTable("surahs", {
  number: integer("number").primaryKey(),
  name: text("name").notNull(), // Arabic, e.g. "سُورَةُ ٱلْفَاتِحَةِ"
  englishName: text("english_name").notNull(), // e.g. "Al-Faatiha"
  englishNameTranslation: text("english_name_translation").notNull(), // e.g. "The Opening"
  revelationType: text("revelation_type").notNull(), // "Meccan" | "Medinan"
  ayahCount: integer("ayah_count").notNull(),
});

export const sourceKindEnum = pgEnum("source_kind", [
  "ayah",
  "hadith",
  "dhikr",
]);

// Imported primary texts. Every challenge built from one links back here, so
// the app can always show where its content comes from.
export const sourceTexts = pgTable("source_texts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // "quran:1:1", "nawawi:1", "hisn:77"
  kind: sourceKindEnum("kind").notNull(),
  arabic: text("arabic").notNull(),
  translation: text("translation"),
  translationBy: text("translation_by"), // e.g. "Sahih International"
  citation: text("citation").notNull(), // e.g. "Quran 1:2", "an-Nawawi's Forty Hadith #1"
  citationAr: text("citation_ar"), // e.g. "سورة الفاتحة: ٢"
  hadithRef: text("hadith_ref"), // takhrij, e.g. "Bukhari & Muslim"; null = needs a reviewer
  hadithRefAr: text("hadith_ref_ar"), // e.g. "رواه البخاري ومسلم"
  sourceUrl: text("source_url").notNull(),
  audioSrc: text("audio_src"),
  repeat: integer("repeat"), // dhikr repetitions
});

export const sourceTextsRelations = relations(sourceTexts, ({ many }) => ({
  challenges: many(challenges),
}));

export const challengeOptions = pgTable(
  "challenge_options",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id")
      .references(() => challenges.id, {
        onDelete: "cascade",
      })
      .notNull(),
    text: text("text").notNull(),
    correct: boolean("correct").notNull(),
    imageSrc: text("image_src"),
    audioSrc: text("audio_src"),
    // The ayah ("s:a") or word ("s:a:w") this option shows, played as
    // recitation when it's tapped (lib/recitation). Null: not Quran text.
    recitation: text("recitation"),
  },
  (table) => [index("challenge_options_challenge_id_idx").on(table.challengeId)]
);

export const challengeOptionsRelations = relations(
  challengeOptions,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeOptions.challengeId],
      references: [challenges.id],
    }),
  })
);

export const challengeProgress = pgTable(
  "challenge_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    challengeId: integer("challenge_id")
      .references(() => challenges.id, {
        onDelete: "cascade",
      })
      .notNull(),
    completed: boolean("completed").notNull().default(false),
  },
  (table) => [
    index("challenge_progress_user_id_challenge_id_idx").on(
      table.userId,
      table.challengeId
    ),
  ]
);

export const challengeProgressRelations = relations(
  challengeProgress,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeProgress.challengeId],
      references: [challenges.id],
    }),
  })
);

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("User"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  hearts: integer("hearts").notNull().default(MAX_HEARTS),
  points: integer("points").notNull().default(0),
  // Days in a row with a lesson or the daily review finished, in the
  // learner's own time zone (lib/review.ts nextStreak).
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastActiveOn: date("last_active_on"), // "YYYY-MM-DD", local date
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

// Questions a learner answered wrong. When hearts run out, a short review
// of the latest ones earns hearts back (app/lesson/review). A row is removed
// once the question is answered right in a review.
export const mistakes = pgTable(
  "mistakes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    challengeId: integer("challenge_id")
      .references(() => challenges.id, { onDelete: "cascade" })
      .notNull(),
    lastWrongAt: timestamp("last_wrong_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.challengeId)]
);

export const mistakesRelations = relations(mistakes, ({ one }) => ({
  challenge: one(challenges, {
    fields: [mistakes.challengeId],
    references: [challenges.id],
  }),
}));

// The daily review (spaced repetition): each ayah, hadith or dhikr a learner
// has learned, and when to ask about it again. A right answer moves it up a
// box and further away; a wrong one brings it back tomorrow (lib/review.ts).
export const reviewItems = pgTable(
  "review_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sourceTextId: integer("source_text_id")
      .references(() => sourceTexts.id, { onDelete: "cascade" })
      .notNull(),
    box: integer("box").notNull().default(0),
    dueOn: date("due_on").notNull(), // "YYYY-MM-DD", local date
    lastReviewedOn: date("last_reviewed_on"),
    lapses: integer("lapses").notNull().default(0),
  },
  (table) => [
    unique().on(table.userId, table.sourceTextId),
    index("review_items_user_id_due_on_idx").on(table.userId, table.dueOn),
  ]
);

export const reviewItemsRelations = relations(reviewItems, ({ one }) => ({
  sourceText: one(sourceTexts, {
    fields: [reviewItems.sourceTextId],
    references: [sourceTexts.id],
  }),
}));

// Daily wird reminders: one row per device that turned them on (Settings).
// The reminder cron (app/api/cron/reminders) sends a web push once a day at
// reminderTime in the device's own time zone.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  reminderTime: text("reminder_time").notNull(), // "HH:MM", local time
  timeZone: text("time_zone").notNull(), // IANA, e.g. "Asia/Jerusalem"
  locale: text("locale").notNull(), // "ar" | "en"
  lastSentOn: text("last_sent_on"), // local date "YYYY-MM-DD"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});
