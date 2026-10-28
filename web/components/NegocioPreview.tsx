"use client";

type Role = "google" | "instagram" | "whatsapp" | "otro";

const ROLE_LABEL: Record<Role, string> = {
  google: "Google",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  otro: "Web",
};

/** Logo en el círculo de la pieza (el 3D muestra el cuerpo; aquí el sello). */
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
        Tu logo en el círculo
      </p>

      <div className="mx-auto w-full max-w-[260px]">
        <div className="relative">
          <div className="absolute left-1/2 top-0 z-20 h-[80px] w-[80px] -translate-x-1/2 -translate-y-[40%]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#f0ebe3] bg-[#111113] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Tu logo" className="h-[86%] w-[86%] object-contain" />
              ) : (
                <span className="px-3 text-center text-[10px] leading-snug text-[#8a8173]">
                  Sube
                  <br />
                  tu logo
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-t-[20px] rounded-b-[10px] bg-[#0e0e10] text-[#f4f1ea]">
            <div className="flex flex-col px-4 pb-5 pt-[52px]">
              {line1 ? (
                <p className="truncate text-center text-[10px] tracking-[0.06em] text-[#f4f1ea]/90">
                  {line1}
                </p>
              ) : (
                <p className="text-center text-[10px] text-transparent">.</p>
              )}
              <p className="mt-4 text-center text-[12px] font-medium tracking-wide">Acerque el móvil</p>
              <div
                className={`mt-4 grid gap-2 ${
                  chips === 1 ? "grid-cols-1" : chips === 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {shown.map((role, i) => (
                  <div key={`${role}-${i}`} className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f4f1ea]/35 text-[10px] font-semibold">
                      {ROLE_LABEL[role].slice(0, 2)}
                    </div>
                    <span className="text-[8px] text-[#cfc6b6]">{ROLE_LABEL[role]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-b-[8px] bg-[#0e0e10] px-3 pb-2.5 pt-1 text-center">
            <p className="text-[9px] tracking-[0.2em] text-[#f4f1ea]/75">nfctap.tech</p>
          </div>
        </div>
      </div>
    </div>
  );
}
