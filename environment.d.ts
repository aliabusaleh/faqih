// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // neon db uri
      DATABASE_URL: string;

      // "en" | "ar": default language

      NEXT_PUBLIC_DEFAULT_LOCALE?: string;

      // "true" shows draft lessons in production

      NEXT_PUBLIC_SHOW_DRAFTS?: string;

      // "local" enables local dev login (development only)

      NEXT_PUBLIC_DEV_AUTH?: string;

      // "true" enables Stripe subscriptions
      NEXT_PUBLIC_ENABLE_PAYMENTS?: string;

      // stripe api key and webhook
      STRIPE_API_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;

      // public app url
      NEXT_PUBLIC_APP_URL: string;

      // clerk admin user id(s) (separated by comma(,) and space( )). Ex: "user_123, user_456, user_789"
      CLERK_ADMIN_IDS: string;
    }
  }
}
