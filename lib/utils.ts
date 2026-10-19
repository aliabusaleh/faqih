import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}

// True when text starts with Arabic script (ignoring punctuation and digits).
export const isArabic = (text: string) => /^[^A-Za-z؀-ۿ]*[؀-ۿ]/.test(text);
