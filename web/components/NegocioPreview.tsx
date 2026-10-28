"use client";

type Role = "google" | "instagram" | "whatsapp" | "otro";

const ROLE_LABEL: Record<Role, string> = {
  google: "Google",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  otro: "Web",
};

/** Vista previa = misma pieza que Markos; solo cambia el logo del círculo. */
export function NegocioPreview({
  logoDataUrl,
  line1,
  roles,
  chips,
}: {
  logoDataUrl: string;
  line1: string;
  roles: Role[];
  chips: 1 | 2 | 3;
}) {
  const shown = roles.slice(0, chips);

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.18em] text-[#b0892c]">
        Vista previa · mismo diseño Markos · tu logo
      </p>

      <div className="mx-auto w-full max-w-[300px] sm:max-w-[320px]">
        {/* Placa + pie (proporción Markos) */}
        <div className="relative">
          {/* Círculo logo (solapa el borde superior, como Markos) */}
          <div className="absolute left-1/2 top-0 z-20 h-[88px] w-[88px] -translate-x-1/2 -translate-y-[42%] sm:h-[96px] sm:w-[96px]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#f0ebe3] bg-[#111113] shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-black/30">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl}
                  alt="Tu logo"
                  className="h-[86%] w-[86%] object-contain"
                />
              ) : (
                <span className="px-3 text-center text-[10px] leading-snug text-[#8a8173]">
                  Sube
                  <br />
                  tu logo
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-t-[22px] rounded-b-[12px] bg-[#0e0e10] text-[#f4f1ea] shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col px-5 pb-6 pt-[58px] sm:px-6 sm:pt-[64px]">
              {line1 ? (
                <p className="truncate text-center text-[11px] font-medium tracking-[0.06em] text-[#f4f1ea]/90">
                  {line1}
                </p>
              ) : (
                <p className="text-center text-[11px] tracking-[0.06em] text-[#5c564c]">&nbsp;</p>
              )}

              <p className="mt-5 text-center text-[13px] font-medium tracking-wide text-[#f4f1ea]">
                Acerque el móvil
              </p>

              <div
                className={`mt-5 grid gap-2 ${
                  chips === 1 ? "grid-cols-1" : chips === 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {shown.map((role, i) => (
                  <div key={`${role}-${i}`} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#f4f1ea]/35 bg-[#161618] sm:h-[56px] sm:w-[56px]">
                      <RoleIcon role={role} />
                    </div>
                    <span className="text-[9px] tracking-wide text-[#cfc6b6]">{ROLE_LABEL[role]}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center gap-10 text-[9px] tracking-[0.2em] text-[#6f675c]">
                {Array.from({ length: Math.min(chips, 2) }).map((_, i) => (
                  <span key={i}>NFC</span>
                ))}
              </div>
            </div>
          </div>

          {/* Pie / bandeja */}
          <div className="rounded-b-[10px] bg-[#0e0e10] px-3 pb-3 pt-1 text-center shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
            <div className="mx-auto h-1.5 w-[72%] rounded-full bg-[#1a1a1c]" />
            <p className="mt-2 text-[10px] tracking-[0.22em] text-[#f4f1ea]/75">nfctap.tech</p>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-[300px] text-center text-xs leading-5 text-[#8a8173] sm:max-w-[320px]">
        Misma pieza que Markos Peluqueros. Solo cambia el logo del círculo y los enlaces de los
        chips.
      </p>
    </div>
  );
}

function RoleIcon({ role }: { role: Role }) {
  if (role === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  if (role === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="#f4f1ea" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.2" stroke="#f4f1ea" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="#f4f1ea" />
      </svg>
    );
  }
  if (role === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path
          fill="#25D366"
          d="M12 2a9.9 9.9 0 0 0-8.6 14.8L2 22l5.4-1.4A9.9 9.9 0 1 0 12 2zm0 1.8a8.1 8.1 0 0 1 6.8 12.4l-.3.5.8 2.9-3-.8-.5.3A8.1 8.1 0 1 1 12 3.8zm4.4 10.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.1-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="#f4f1ea" strokeWidth="1.5" />
      <path d="M4 12h16M12 4a14 14 0 0 1 0 16M12 4a14 14 0 0 0 0 16" stroke="#f4f1ea" strokeWidth="1.2" />
    </svg>
  );
}
