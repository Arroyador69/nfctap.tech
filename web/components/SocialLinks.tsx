"use client";

import { SOCIALS } from "@/lib/catalog";
import { useId, type ReactNode } from "react";

type SocialId = (typeof SOCIALS)[number]["id"];

function InstagramMark({ gid }: { gid: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="45%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gid})`}
        fillRule="evenodd"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.647C21.282 2.69 18.86.273 14.52.073 13.667.014 13.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  );
}

const TIKTOK_NOTE =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

function TikTokMark() {
  return (
    <svg viewBox="-2 -2 28 28" aria-hidden className="h-7 w-7">
      <path d={TIKTOK_NOTE} fill="#25F4EE" transform="translate(-1.15 0.55)" />
      <path d={TIKTOK_NOTE} fill="#FE2C55" transform="translate(1.15 -0.35)" />
      <path d={TIKTOK_NOTE} fill="#111111" />
    </svg>
  );
}

function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7">
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#fff" d="M9.545 15.568V8.432L15.818 12z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7">
      <path
        fill="#1877F2"
        fillRule="evenodd"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

const ICONS: Record<SocialId, (gid: string) => ReactNode> = {
  instagram: (gid) => <InstagramMark gid={gid} />,
  tiktok: () => <TikTokMark />,
  youtube: () => <YouTubeMark />,
  facebook: () => <FacebookMark />,
};

export function SocialLinks({
  align = "start",
  heading = "Síguenos",
}: {
  align?: "start" | "end";
  heading?: string | false;
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <div>
      {heading ? (
        <p
          className={`mb-3 text-xs uppercase tracking-[0.18em] text-[#b0892c] ${
            align === "end" ? "sm:text-right" : ""
          }`}
        >
          {heading}
        </p>
      ) : null}
      <ul
        className={`flex flex-wrap gap-3 ${align === "end" ? "sm:justify-end" : ""}`}
      >
        {SOCIALS.map((s) => (
          <li key={s.id}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${s.label} de NFCTap`}
              title={s.label}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white ring-1 ring-[#e6ddd0] transition hover:scale-105 hover:ring-[#cfc4b2]"
            >
              {ICONS[s.id](`${gid}-${s.id}`)}
              <span className="sr-only">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
