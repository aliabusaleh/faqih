"use client";

import { useId } from "react";

import { useMessages } from "@/components/locale-provider";
import { type StickerDesign } from "@/lib/stickers";
import { cn } from "@/lib/utils";

// A kids sticker (lib/stickers), drawn as a flat shape with a white
// die-cut edge. One not yet earned is its pale grey silhouette.
// Objects only: no people or animals.

const GOLD = "#e6b400";
const GOLD_LIGHT = "#ffd640";
const MISSING_FILL = "#f1f5f9";
const MISSING_EDGE = "#cbd5e1";

// An n-pointed star around (cx, cy), as polygon points.
const starPoints = (
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number
) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");

const RUB_EL_HIZB = starPoints(32, 32, 8, 25, 18);
const MEDAL_STAR = starPoints(32, 38, 8, 10, 7);
const SMALL_STAR = starPoints(46, 40, 5, 6, 2.6);

// Each design: its silhouette (filled shapes only, so the same shapes make
// the white edge, the colour and the missing outline), and white details.
const DESIGNS: Record<
  StickerDesign,
  { shape: React.ReactNode; details?: React.ReactNode }
> = {
  crescent: {
    shape: (
      <>
        <path d="M30.4 12A21 21 0 1 0 49.8 39.9 17 17 0 0 1 30.4 12Z" />
        <polygon points={SMALL_STAR} />
      </>
    ),
  },
  star: {
    shape: <polygon points={RUB_EL_HIZB} />,
    details: (
      <circle
        cx="32"
        cy="32"
        r="8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
      />
    ),
  },
  lantern: {
    shape: (
      <>
        <circle cx="32" cy="8" r="3.5" />
        <path d="M32 10 44 21H20Z" />
        <path d="M20 21h24l3 12-4 13H21l-4-13Z" />
        <path d="M24 46h16l-3 8h-10Z" />
      </>
    ),
    details: <ellipse cx="32" cy="33" rx="6" ry="8" fill={GOLD_LIGHT} />,
  },
  palm: {
    shape: (
      <>
        <path d="M30 58c1-11 1-22 2-32h4c-1 10-1 21 0 32Z" />
        <path d="M34 24C26 14 15 15 9 21c9-2 17 0 25 3Z" />
        <path d="M34 24C42 14 53 15 59 21c-9-2-17 0-25 3Z" />
        <path d="M34 24c-9 0-17 6-19 15 6-7 12-11 19-15Z" />
        <path d="M34 24c9 0 17 6 19 15-6-7-12-11-19-15Z" />
        <path d="M34 24c-4-7-3-14 2-19 0 7 0 13-2 19Z" />
      </>
    ),
    details: (
      <>
        <circle cx="30" cy="29" r="2.4" fill={GOLD_LIGHT} />
        <circle cx="35" cy="30" r="2.4" fill={GOLD_LIGHT} />
        <circle cx="32" cy="33" r="2.4" fill={GOLD_LIGHT} />
      </>
    ),
  },
  dome: {
    shape: (
      <>
        <path d="M31 9h2v8h-2Z" />
        <path d="M16 40c0-12 10-16 16-24 6 8 16 12 16 24Z" />
        <path d="M12 40h40v16H12Z" />
      </>
    ),
    details: (
      <>
        <path d="M28 56V49a4 4 0 0 1 8 0v7Z" fill="#fff" />
        <circle cx="32" cy="8" r="2.5" fill={GOLD_LIGHT} />
      </>
    ),
  },
  flower: {
    shape: (
      <>
        <path d="M31 30h2.5v26H31Z" />
        <path d="M32 46c-6-6-14-5-17-1 6 1 11 2 17 1Z" />
        <path d="M33 50c6-6 14-5 17-1-6 1-11 2-17 1Z" />
        <circle cx="32" cy="12" r="7" />
        <circle cx="22" cy="20" r="7" />
        <circle cx="42" cy="20" r="7" />
        <circle cx="26" cy="29" r="7" />
        <circle cx="38" cy="29" r="7" />
      </>
    ),
    details: <circle cx="32" cy="21" r="5" fill={GOLD_LIGHT} />,
  },
  medal: {
    shape: (
      <>
        <path d="M18 4h10l8 18H26Z" />
        <path d="M46 4H36l-8 18h10Z" />
        <circle cx="32" cy="38" r="18" />
      </>
    ),
    details: (
      <>
        <circle cx="32" cy="38" r="13.5" fill={GOLD_LIGHT} />
        <polygon points={MEDAL_STAR} fill="#fff" />
      </>
    ),
  },
};

type StickerProps = {
  design: StickerDesign;
  colour: string;
  earned?: boolean;
  /** Pops in (the finish screen); still for reduced motion. */
  pop?: boolean;
  className?: string;
};

export const Sticker = ({
  design,
  colour,
  earned = true,
  pop = false,
  className,
}: StickerProps) => {
  const t = useMessages();
  const shadow = useId();
  const { shape, details } = DESIGNS[design];
  const name = t.stickers.designs[design];

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={earned ? name : t.stickers.missing(name)}
      className={cn(
        "h-14 w-14 shrink-0",
        pop && "motion-safe:animate-sticker-pop",
        className
      )}
    >
      {earned ? (
        <>
          <defs>
            <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1.5"
                stdDeviation="1.5"
                floodColor="#0e1f3b"
                floodOpacity=".25"
              />
            </filter>
          </defs>
          {/* The die-cut edge: the shapes again, in thick white. */}
          <g
            filter={`url(#${shadow})`}
            fill="#fff"
            stroke="#fff"
            strokeWidth="7"
            strokeLinejoin="round"
          >
            {shape}
          </g>
          <g fill={design === "medal" ? GOLD : colour}>{shape}</g>
          {details}
        </>
      ) : (
        <>
          {/* Edge underneath, fill on top: only the outer outline shows. */}
          <g
            fill={MISSING_EDGE}
            stroke={MISSING_EDGE}
            strokeWidth="4"
            strokeLinejoin="round"
          >
            {shape}
          </g>
          <g fill={MISSING_FILL}>{shape}</g>
        </>
      )}
    </svg>
  );
};
