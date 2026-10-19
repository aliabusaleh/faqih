import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { MAX_HEARTS } from "@/constants";

export const tracksEnum = pgEnum("track", [
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
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Unit 1
  description: text("description").notNull(), // Learn the basics of spanish
  courseId: integer("course_id")
    .references(() => courses.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

// Lessons stay "draft" until a qualified reviewer approves them.
export const reviewStatusEnum = pgEnum("review_status", ["draft", "reviewed"]);

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("draft"),
  unitId: integer("unit_id")
    .references(() => units.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id")
    .references(() => lessons.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: challengesEnum("type").notNull(),
  question: text("question").notNull(),
  prompt: text("prompt"), // overrides the default title shown above the question
  sourceTextId: integer("source_text_id").references(() => sourceTexts.id, {
    onDelete: "set null",
  }),
  order: integer("order").notNull(),
});

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

export const challengeOptions = pgTable("challenge_options", {
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
});

export const challengeOptionsRelations = relations(
  challengeOptions,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeOptions.challengeId],
      references: [challenges.id],
    }),
  })
);

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  completed: boolean("completed").notNull().default(false),
});

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
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});
