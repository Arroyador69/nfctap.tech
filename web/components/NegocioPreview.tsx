"use client";

type Role = "google" | "instagram" | "whatsapp" | "otro";

const ROLE_ICON: Record<Role, string> = {
  google: "G",
  instagram: "IG",
  whatsapp: "WA",
  otro: "·",
};

const ROLE_LABEL: Record<Role, string> = {
  google: "Google",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  otro: "Enlace",
};

/** Vista previa estilo Markos: placa negra + logo en círculo. */
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
    <div className="flex flex-col items-center rounded-[24px] border border-[#e6ddd0] bg-[#faf6ee] p-6">
      <p className="mb-4 text-xs uppercase tracking-[0.16em] text-[#b0892c]">Vista previa · estilo Markos</p>
      <div
        className="relative w-full max-w-[280px] rounded-t-[18px] rounded-b-[10px] bg-[#141416] px-4 pb-5 pt-10 text-center text-white shadow-xl"
        style={{ aspectRatio: "3 / 4" }}
      >
        <div className="absolute left-1/2 top-0 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#f4f1ea] bg-[#1c1915] shadow-md">
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[10px] leading-tight text-[#8a8173]">Tu logo</span>
          )}
        </div>

        {line1 ? (
          <p className="mt-6 truncate text-[11px] font-medium tracking-wide text-[#f4f1ea]">{line1}</p>
        ) : (
          <p className="mt-6 text-[11px] text-[#6f675c]">Tu negocio</p>
        )}

        <div
          className={`mt-6 grid gap-3 ${chips === 1 ? "grid-cols-1" : chips === 2 ? "grid-cols-2" : "grid-cols-3"}`}
        >
          {shown.map((role, i) => (
            <div key={`${role}-${i}`} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f4f1ea]/40 text-sm font-semibold text-[#f4f1ea]">
                {ROLE_ICON[role]}
              </div>
              <span className="text-[9px] text-[#d5cbb8]">{ROLE_LABEL[role]}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[11px] font-medium tracking-wide text-[#f4f1ea]">Acerque el móvil</p>
        <div className="mt-3 flex justify-center gap-6 text-[9px] text-[#8a8173]">
          <span>NFC</span>
          <span>NFC</span>
        </div>
      </div>
      <div className="mt-0 w-full max-w-[280px] rounded-b-[8px] bg-[#141416] px-3 py-2 text-center">
        <p className="text-[10px] tracking-wider text-[#f4f1ea]/80">nfctap.tech</p>
      </div>
    </div>
  );
}
