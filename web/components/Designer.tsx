"use client";

import { CardPreview } from "@/components/CardPreview";
import {
  ACCENT_COLORS,
  ACCENT_HEX,
  BODY_COLORS,
  FACE_MODELS,
  KIND_META,
  MAX_QTY,
  MODEL_LABEL,
  PRICE,
  clampQty,
  countTotal,
  countsFromModels,
  defaultDesign,
  emptyCounts,
  kindsFor,
  needsLogo,
  packSaving,
  packWas,
  piecesFromCounts,
  productLabel,
  productPrice,
} from "@/lib/catalog";
import { fetchReviewFromInput, ReviewLookup } from "@/components/ReviewLookup";
import { metaClickIds, trackMeta } from "@/lib/meta-pixel";
import { isDirectReviewUrl, isGooglePlaceInput, parseGoogleInput } from "@/lib/google-url";
import {
  isEmail,
  isHttpUrl,
  isPhone,
  isPostalCode,
  nfcUrlOk,
  normalizeNfcUrl,
  prepareLogo,
} from "@/lib/logo";
import { PROVINCIAS } from "@/lib/provinces";
import { euros, shippingCost, zoneFromPostalCode, ZONE_LABEL } from "@/lib/shipping";
import type {
  CardDesign,
  CatalogModel,
  FaceModel,
  Handover,
  OrderPiece,
  ProductKind,
  ShippingSettings,
  ShippingZone,
} from "@/lib/types";
import { useMemo, useState, type ReactNode } from "react";

type Props = {
  initialKind?: ProductKind;
  initialModels?: CatalogModel[];
  initialGoogleUrl?: string;
  shipping: ShippingSettings;
  mode?: "public" | "admin";
};

type Step = "diseno" | "envio";

export function Designer({
  initialKind = "generica",
  initialModels,
  initialGoogleUrl,
  shipping,
  mode = "public",
}: Props) {
  const admin = mode === "admin";
  const startKind =
    !admin && initialKind === "unica" ? "generica" : initialKind;
  const startModels: CatalogModel[] =
    startKind === "personalizada" || startKind === "unica"
      ? []
      : initialModels?.length
        ? initialModels
        : ["google"];
  const [step, setStep] = useState<Step>("diseno");
  const [handover, setHandover] = useState<Handover>("envio");
  const [kind, setKind] = useState<ProductKind>(startKind);
  const [counts, setCounts] = useState(() =>
    startKind === "generica" ? countsFromModels(startModels) : emptyCounts(),
  );
  const [focus, setFocus] = useState<CatalogModel>(startModels[0] || "google");
  const [urls, setUrls] = useState<Record<CatalogModel, string>>({
    google: initialGoogleUrl || "",
    whatsapp: "",
    instagram: "",
  });
  const [qty, setQty] = useState(1);
  const [design, setDesign] = useState<CardDesign>(() => {
    const model: FaceModel =
      startKind === "generica" ? startModels[0] || "google" : "personalizada";
    const d = defaultDesign(startKind, model);
    if (initialGoogleUrl) d.googleUrl = initialGoogleUrl;
    return d;
  });
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [googleHint, setGoogleHint] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    province: "",
  });

  const generic = kind === "generica";
  const liveQty = generic ? countTotal(counts) : kind === "unica" ? 1 : qty;
  const picked = FACE_MODELS.filter((m) => counts[m.id] > 0);
  const pieces: OrderPiece[] = generic
    ? piecesFromCounts(counts, {
        google: normalizeNfcUrl("google", urls.google),
        whatsapp: normalizeNfcUrl("whatsapp", urls.whatsapp),
        instagram: normalizeNfcUrl("instagram", urls.instagram),
      })
    : Array.from({ length: liveQty }, () => ({
        model: "personalizada" as const,
        nfcUrl: design.googleUrl.trim(),
      }));
  const previewModel: FaceModel = generic
    ? counts[focus] > 0
      ? focus
      : picked[0]?.id || "google"
    : "personalizada";
  const zone: ShippingZone = zoneFromPostalCode(form.postalCode);
  const price = productPrice(kind, liveQty);
  const ship = handover === "mano" ? 0 : shippingCost(zone, shipping, price);
  const total = price + ship;
  const patch = (p: Partial<CardDesign>) => setDesign((d) => ({ ...d, ...p }));
  const atMax = liveQty >= MAX_QTY;

  async function resolveGooglePaste(raw: string, into: "urls" | "design") {
    const t = raw.trim();
    if (!t) return;
    const instant = parseGoogleInput(t);
    if (instant?.directReview) {
      if (into === "urls") setUrls((u) => ({ ...u, google: instant.reviewUrl }));
      else patch({ googleUrl: instant.reviewUrl });
      setGoogleHint("Enlace de reseña listo. Ábrelo y comprueba que pide una opinión.");
      return;
    }
    if (!isGooglePlaceInput(t) || isDirectReviewUrl(t)) return;
    setGoogleHint("Sacando el enlace de reseña…");
    const hit = await fetchReviewFromInput(t);
    if (hit?.directReview) {
      if (into === "urls") setUrls((u) => ({ ...u, google: hit.reviewUrl }));
      else patch({ googleUrl: hit.reviewUrl });
      setGoogleHint("Enlace de reseña listo. Ábrelo y comprueba que pide una opinión.");
    } else {
      setGoogleHint("No saqué el de reseña. Pega el de Maps (compartir ficha) o el perfil de empresa.");
    }
  }

  async function onLogo(file: File | undefined) {
    if (!file) return patch({ logoDataUrl: undefined });
    try {
      const { dataUrl, mask } = await prepareLogo(file);
      patch({ logoDataUrl: dataUrl, logoMask: mask });
    } catch {
      setError("No se pudo leer el logo. Prueba otra imagen.");
    }
  }

  const designOk = useMemo(() => {
    if (kind === "unica" && !isHttpUrl(design.extraUrl || "")) return false;
    if (needsLogo(kind) && !design.logoDataUrl) return false;
    if (generic) {
      if (!picked.length) return false;
      return picked.every((m) => nfcUrlOk(m.id, urls[m.id]));
    }
    return nfcUrlOk("personalizada", design.googleUrl);
  }, [kind, generic, picked, urls, design.googleUrl, design.logoDataUrl, design.extraUrl]);

  const shipOk = useMemo(() => {
    if (admin && handover === "mano") return Boolean(form.name.trim());
    return Boolean(
      form.name.trim() &&
        isEmail(form.email) &&
        isPhone(form.phone) &&
        form.line1.trim() &&
        form.city.trim() &&
        isPostalCode(form.postalCode) &&
        form.province,
    );
  }, [admin, form, handover]);

  function bump(id: CatalogModel, delta: number) {
    setKind("generica");
    setTried(false);
    setFocus(id);
    setCounts((prev) => {
      const total = countTotal(prev);
      const n = prev[id];
      if (delta > 0) {
        if (total >= MAX_QTY) return prev;
        return { ...prev, [id]: n + 1 };
      }
      if (n <= 0) return prev;
      return { ...prev, [id]: n - 1 };
    });
    setDesign((d) => ({ ...d, kind: "generica", model: id }));
  }

  function goPersonalizada() {
    setKind("personalizada");
    setQty(1);
    setCounts(emptyCounts());
    setDesign(defaultDesign("personalizada"));
    setTried(false);
  }

  function goGenerica() {
    setKind("generica");
    setCounts(countsFromModels(["google"]));
    setFocus("google");
    setDesign(defaultDesign("generica", "google"));
    setTried(false);
  }

  function goShip() {
    setTried(true);
    setError("");
    if (!designOk) {
      if (generic && !picked.length) {
        setError("Elige al menos una. Sube o baja la cantidad con + y −.");
        return;
      }
      if (generic) {
        const miss = picked.find((m) => !nfcUrlOk(m.id, urls[m.id]));
        setError(
          miss?.id === "whatsapp"
            ? "Pon el número o el enlace de WhatsApp."
            : miss?.id === "instagram"
              ? "Pon @cuenta o el enlace de Instagram."
              : "Falta el enlace de reseña de Google.",
        );
        return;
      }
      setError(
        needsLogo(kind)
          ? kind === "unica"
            ? "Sube el logo, el enlace de Google y el segundo NFC (carta, Instagram o menú)."
            : "Sube el logo y pega el enlace que abrirá el móvil."
          : "Falta el enlace.",
      );
      return;
    }
    setTried(false);
    setStep("envio");
  }

  async function submit() {
    setTried(true);
    setError("");
    if (!shipOk) {
      setError(
        admin && handover === "mano"
          ? "Pon al menos el nombre del cliente."
          : "Dirección en España: nombre, email, teléfono, calle, CP, ciudad y provincia.",
      );
      return;
    }
    setBusy(true);
    try {
      const normalizedPieces = pieces.map((p) => ({
        model: p.model,
        nfcUrl: normalizeNfcUrl(p.model, p.nfcUrl),
      }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          qty: liveQty,
          source: admin ? "admin" : "web",
          handover: admin ? handover : "envio",
          ...(!admin ? metaClickIds() : {}),
          design: {
            ...design,
            kind,
            model: previewModel,
            logoDataUrl: needsLogo(kind) ? design.logoDataUrl : undefined,
            extraUrl: kind === "unica" ? design.extraUrl : normalizedPieces[1]?.nfcUrl,
            googleUrl: normalizedPieces[0]?.nfcUrl || design.googleUrl,
            pieces: kind === "unica" ? undefined : normalizedPieces,
          },
          previewDataUrl: preview,
          address: { ...form, zone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido");
      if (!admin) {
        const orderId = data.order?.id as string | undefined;
        trackMeta(
          "InitiateCheckout",
          {
            value: total,
            currency: "EUR",
            content_name: kind,
            content_type: "product",
            num_items: liveQty,
            order_id: orderId,
          },
          orderId,
        );
        await new Promise((r) => setTimeout(r, 400));
      }
      window.location.assign(data.checkoutUrl || `/pedido/ok?id=${data.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  const priceHint =
    kind === "unica"
      ? euros(PRICE.unica.first)
      : `La primera ${euros(PRICE[kind].first)}, cada una más ${euros(PRICE[kind].extra)}`;

  return (
    <div className="pb-28 lg:pb-0">
      <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="sticky top-14 z-20 -mx-5 bg-[#f6f1e8]/92 px-5 py-2 backdrop-blur-md lg:static lg:top-auto lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <CardPreview
            design={{ ...design, kind, model: previewModel }}
            compact
            onReady={(url) => setPreview((prev) => (prev === url ? prev : url))}
          />
          {generic && picked.length > 1 ? (
            <div className={`mt-2 grid gap-2 ${picked.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {picked.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setFocus(m.id);
                    setDesign((d) => ({ ...d, model: m.id }));
                  }}
                  className={`rounded-full px-3 py-2 text-sm ${
                    focus === m.id ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                  }`}
                >
                  {m.label}
                  {counts[m.id] > 1 ? ` × ${counts[m.id]}` : ""}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5 rounded-[24px] border border-[#e6ddd0] bg-white p-4 shadow-[0_16px_40px_rgba(40,28,10,0.05)] sm:p-6">
          <div className="flex gap-2 text-xs">
            <span className={step === "diseno" ? "font-semibold text-[#1c1915]" : "text-[#8a8173]"}>1. Elige</span>
            <span className="text-[#cfc4b2]">→</span>
            <span className={step === "envio" ? "font-semibold text-[#1c1915]" : "text-[#8a8173]"}>
              2. {admin ? "Cliente" : "Envío"}
            </span>
          </div>

          {step === "diseno" ? (
            <>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1c1915] sm:text-3xl">
                  Elige y encarga
                </h2>
                <p className="mt-1 text-sm text-[#6f675c]">
                  {generic
                    ? `${priceHint}. Mezcla Google, WhatsApp e Instagram. Hasta ${MAX_QTY} en el mismo pedido.`
                    : `${priceHint}. Hasta ${MAX_QTY} en el mismo pedido.`}{" "}
                  Lo ves en 3D. Luego la dirección en España.
                </p>
              </div>

              {admin ? (
                <div className="grid grid-cols-3 gap-2">
                  {kindsFor(true).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k);
                        setQty(1);
                        if (k === "generica") {
                          setCounts(countsFromModels(["google"]));
                          setFocus("google");
                          setDesign(defaultDesign("generica", "google"));
                        } else {
                          setCounts(emptyCounts());
                          setDesign(defaultDesign(k));
                        }
                        setTried(false);
                      }}
                      className={`min-h-12 rounded-2xl px-2 py-3 text-xs font-medium sm:text-sm ${
                        kind === k ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                      }`}
                    >
                      {KIND_META[k].label}
                    </button>
                  ))}
                </div>
              ) : null}

              {generic ? (
                <>
                  <div>
                    <p className="mb-2 text-sm text-[#3f3a34]">Cuántas de cada una</p>
                    <div className="grid gap-2">
                      {FACE_MODELS.map((m) => {
                        const n = counts[m.id];
                        const on = n > 0;
                        return (
                          <div
                            key={m.id}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                              on ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                            }`}
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                if (n === 0) bump(m.id, 1);
                                else {
                                  setFocus(m.id);
                                  setDesign((d) => ({ ...d, model: m.id }));
                                }
                              }}
                            >
                              <div className="text-sm font-semibold">{m.label}</div>
                              <div className={`mt-0.5 text-[11px] ${on ? "text-[#d5cbb8]" : "text-[#8a8173]"}`}>
                                {m.blurb}
                              </div>
                            </button>
                            <QtyStepper
                              value={n}
                              dark={on}
                              onDec={() => bump(m.id, -1)}
                              onInc={() => bump(m.id, 1)}
                              disableDec={n <= 0}
                              disableInc={atMax}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-[#8a8173]">
                      {liveQty === 0
                        ? "Toca + en Google, WhatsApp o Instagram."
                        : `${productLabel(kind, liveQty, pieces)} · ${euros(price)}${
                            packSaving(kind, liveQty) > 0
                              ? ` · ahorras ${euros(packSaving(kind, liveQty))}`
                              : ""
                          }${atMax ? ` · tope ${MAX_QTY}` : ""}`}
                    </p>
                  </div>

                  {picked.map((m) => (
                    <Field
                      key={m.id}
                      label={`Enlace ${m.label}${counts[m.id] > 1 ? ` · las ${counts[m.id]}` : ""}`}
                      hint={tried && !nfcUrlOk(m.id, urls[m.id]) ? m.hint : ""}
                    >
                      <input
                        inputMode={m.id === "whatsapp" ? "tel" : "url"}
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder={m.placeholder}
                        value={urls[m.id]}
                        onFocus={() => {
                          setFocus(m.id);
                          setDesign((d) => ({ ...d, model: m.id }));
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          const instant = m.id === "google" ? parseGoogleInput(v) : null;
                          setUrls((u) => ({
                            ...u,
                            [m.id]: instant?.directReview ? instant.reviewUrl : v,
                          }));
                          if (m.id === "google") setGoogleHint("");
                        }}
                        onBlur={(e) => {
                          if (m.id === "google") void resolveGooglePaste(e.target.value, "urls");
                        }}
                      />
                    </Field>
                  ))}

                  {counts.google > 0 ? (
                    <div className="rounded-2xl bg-[#faf6ee] p-3">
                      <p className="mb-2 text-xs text-[#6f675c]">
                        Pega el enlace de Google Maps o del perfil de empresa. Te da el de
                        reseña. Ábrelo y comprueba que pide una opinión.
                      </p>
                      <ReviewLookup
                        compact
                        onPick={(url) => {
                          setUrls((u) => ({ ...u, google: url }));
                          setDesign((d) => ({ ...d, model: "google" }));
                          setFocus("google");
                          setGoogleHint("Enlace de reseña listo. Ábrelo y comprueba que pide una opinión.");
                        }}
                      />
                      {googleHint ? <p className="mt-2 text-xs text-[#6f675c]">{googleHint}</p> : null}
                    </div>
                  ) : null}

                  <button type="button" className="text-sm text-[#7a7266] underline" onClick={goPersonalizada}>
                    Prefiero la de mi logo ({euros(PRICE.personalizada.first)})
                  </button>
                </>
              ) : (
                <>
                  {!admin ? (
                    <button type="button" className="text-sm text-[#7a7266]" onClick={goGenerica}>
                      ← Volver a Google, WhatsApp o Instagram
                    </button>
                  ) : null}

                  {kind !== "unica" ? (
                    <div>
                      <p className="mb-2 text-sm text-[#3f3a34]">Cuántas</p>
                      <div className="flex items-center justify-between rounded-2xl bg-[#f3eee4] px-3 py-3">
                        <div>
                          <div className="text-sm font-semibold">{productLabel(kind, qty)}</div>
                          <div className="text-lg font-semibold">{euros(productPrice(kind, qty))}</div>
                          {packSaving(kind, qty) > 0 ? (
                            <p className="mt-1 text-xs text-[#6f675c]">
                              <span className="line-through">{euros(packWas(kind, qty))}</span>
                              {` · ahorras ${euros(packSaving(kind, qty))}`}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-[#8a8173]">{priceHint}</p>
                          )}
                        </div>
                        <QtyStepper
                          value={qty}
                          onDec={() => setQty((q) => clampQty(q - 1))}
                          onInc={() => setQty((q) => clampQty(q + 1))}
                          disableDec={qty <= 1}
                          disableInc={qty >= MAX_QTY}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#e6ddd0] px-3 py-3">
                      <div className="text-sm">{productLabel(kind, 1)}</div>
                      <div className="text-lg font-semibold">{euros(PRICE.unica.first)}</div>
                    </div>
                  )}

                  {needsLogo(kind) ? (
                    <>
                      <div>
                        <p className="mb-2 text-sm text-[#3f3a34]">
                          Logo {tried && !design.logoDataUrl ? <span className="text-red-700">· obligatorio</span> : null}
                        </p>
                        <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#cfc4b2] bg-[#fffcf7] px-3 text-sm">
                          {design.logoDataUrl ? "Cambiar logo" : "Subir logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="sr-only"
                            onChange={(e) => onLogo(e.target.files?.[0])}
                          />
                        </label>
                        <p className="mt-2 text-xs text-[#8a8173]">
                          PNG con fondo transparente si puedes. Se imprime en el color de acento, en
                          el mismo sitio que la G.
                        </p>
                        {design.logoDataUrl && (
                          <button
                            type="button"
                            className="mt-2 text-xs text-[#7a7266] underline"
                            onClick={() => patch({ logoDataUrl: undefined, logoMask: undefined })}
                          >
                            Quitar logo
                          </button>
                        )}
                      </div>
                      <Field label="Nombre del negocio (opcional)">
                        <input
                          value={design.line1}
                          maxLength={22}
                          autoComplete="organization"
                          placeholder="Debajo de TAP, opcional"
                          onChange={(e) => patch({ line1: e.target.value })}
                        />
                      </Field>
                    </>
                  ) : null}

                  {kind === "unica" ? (
                    <Field
                      label="Segundo NFC (carta, Instagram, menú…)"
                      hint={tried && !isHttpUrl(design.extraUrl || "") ? "Pon el segundo enlace https" : ""}
                    >
                      <input
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="https://…"
                        value={design.extraUrl || ""}
                        onChange={(e) => patch({ extraUrl: e.target.value })}
                      />
                    </Field>
                  ) : null}

                  <Field
                    label="Enlace que abre el móvil"
                    hint={tried && !nfcUrlOk("personalizada", design.googleUrl) ? "Pega un enlace https" : ""}
                  >
                    <input
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="https://g.page/r/…/review"
                      value={design.googleUrl}
                      onChange={(e) => {
                        const v = e.target.value;
                        const instant = parseGoogleInput(v);
                        patch({ googleUrl: instant?.directReview ? instant.reviewUrl : v });
                        setGoogleHint("");
                      }}
                      onBlur={(e) => {
                        void resolveGooglePaste(e.target.value, "design");
                      }}
                    />
                  </Field>
                  <div className="rounded-2xl bg-[#faf6ee] p-3">
                    <p className="mb-2 text-xs text-[#6f675c]">
                      Si es reseña Google: pega el de Maps o el perfil de empresa. Te da el de
                      reseña. Ábrelo y comprueba que pide una opinión.
                    </p>
                    <ReviewLookup
                      compact
                      onPick={(url) => {
                        patch({ googleUrl: url });
                        setGoogleHint("Enlace de reseña listo. Ábrelo y comprueba que pide una opinión.");
                      }}
                    />
                    {googleHint ? <p className="mt-2 text-xs text-[#6f675c]">{googleHint}</p> : null}
                  </div>
                </>
              )}

              <div>
                <p className="mb-2 text-sm text-[#3f3a34]">Color de la pieza</p>
                <div className="flex gap-3">
                  {BODY_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => patch({ bodyColor: c.id })}
                      className={`h-12 w-12 rounded-full border-2 ${
                        design.bodyColor === c.id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                      }`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-[#3f3a34]">Relieve (logo, TAP, texto)</p>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => patch({ accentColor: c.id })}
                      className={`h-12 w-12 rounded-full border-2 ${
                        design.accentColor === c.id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                      }`}
                      style={{ background: ACCENT_HEX[c.id] }}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="button"
                onClick={goShip}
                className="hidden min-h-12 w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] lg:block"
              >
                {admin ? "Continuar al cliente" : "Continuar al envío"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("diseno");
                  setError("");
                  setTried(false);
                }}
                className="text-sm text-[#7a7266]"
              >
                ← Volver a elegir
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {admin ? "Datos del cliente" : "Dirección en España"}
              </h2>
              <p className="text-sm text-[#6f675c]">
                {admin
                  ? "En mano o a Correos. El ZIP es el mismo atril que ves aquí."
                  : "Solo España. El código postal elige la tarifa de Correos. Sale en 24 h. En Polar pagas producto + envío (tarjeta, Apple Pay o Bizum)."}
              </p>

              {admin && (
                <div className="grid grid-cols-2 gap-2">
                  {(["envio", "mano"] as Handover[]).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHandover(h)}
                      className={`min-h-12 rounded-2xl px-3 text-sm font-medium ${
                        handover === h ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                      }`}
                    >
                      {h === "mano" ? "Entrega en mano" : "Envío Correos"}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre y apellidos" hint={tried && !form.name.trim() ? "Obligatorio" : ""}>
                  <input
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field
                  label={handover === "mano" ? "Email (opcional)" : "Email"}
                  hint={handover === "envio" && tried && !isEmail(form.email) ? "Email no válido" : ""}
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field
                  label={handover === "mano" ? "Teléfono (opcional)" : "Teléfono"}
                  hint={handover === "envio" && tried && !isPhone(form.phone) ? "Mínimo 9 dígitos" : ""}
                >
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
                {handover === "envio" && (
                  <>
                    <Field label="Calle y número" className="sm:col-span-2" hint={tried && !form.line1.trim() ? "Obligatorio" : ""}>
                      <input
                        autoComplete="address-line1"
                        placeholder="Calle y número"
                        value={form.line1}
                        onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                      />
                    </Field>
                    <Field label="Piso, puerta, local" className="sm:col-span-2">
                      <input
                        autoComplete="address-line2"
                        value={form.line2}
                        onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                      />
                    </Field>
                    <Field label="Código postal" hint={tried && !isPostalCode(form.postalCode) ? "5 dígitos de España" : ""}>
                      <input
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        value={form.postalCode}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                        }
                      />
                    </Field>
                    <Field label="Ciudad" hint={tried && !form.city.trim() ? "Obligatorio" : ""}>
                      <input
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </Field>
                    <Field label="Provincia" className="sm:col-span-2" hint={tried && !form.province ? "Elige provincia" : ""}>
                      <select
                        autoComplete="address-level1"
                        className="w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3 py-3 text-base"
                        value={form.province}
                        onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                      >
                        <option value="">Selecciona</option>
                        {PROVINCIAS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </div>

              {handover === "envio" && (
                <>
                  <p className="text-xs text-[#8a8173]">Correos · España · sale en 24 h. El CP marca la tarifa.</p>
                  <Rates
                    shipping={shipping}
                    zone={form.postalCode.length === 5 ? zone : null}
                    productPrice={price}
                  />
                </>
              )}

              <div className="rounded-2xl bg-[#faf6ee] p-4 text-sm">
                <Row
                  k="Producto"
                  v={`${productLabel(kind, liveQty, pieces)} · ${euros(price)}`}
                />
                {packSaving(kind, liveQty) > 0 ? (
                  <Row k="Pack" v={`Ahorras ${euros(packSaving(kind, liveQty))} (no ${euros(packWas(kind, liveQty))})`} />
                ) : null}
                {generic
                  ? picked.map((m) => (
                      <Row
                        key={m.id}
                        k={counts[m.id] > 1 ? `${m.label} × ${counts[m.id]}` : m.label}
                        v={urls[m.id] || "—"}
                      />
                    ))
                  : (
                      <Row k="NFC" v={design.googleUrl || "—"} />
                    )}
                <Row k="Zona" v={form.postalCode.length === 5 ? ZONE_LABEL[zone] : "Pon el CP"} />
                <Row k="Envío Correos" v={form.postalCode.length === 5 ? (ship === 0 ? "Gratis" : euros(ship)) : "—"} />
                <div className="mt-3 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{euros(total)}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="hidden min-h-12 w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40 lg:block"
              >
                {busy ? "Guardando…" : admin ? `Guardar pedido · ${euros(total)}` : `Pagar · ${euros(total)}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e6ddd0] bg-[#f6f1e8]/95 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#6f675c]">{productLabel(kind, liveQty, pieces)}</p>
            <p className="font-semibold">{euros(total)}</p>
          </div>
          {step === "diseno" ? (
            <button
              type="button"
              onClick={goShip}
              className="min-h-12 shrink-0 rounded-full bg-[#1c1915] px-5 font-semibold text-[#f6f1e7]"
            >
              {admin ? "Cliente" : "Envío"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="min-h-12 shrink-0 rounded-full bg-[#1c1915] px-5 font-semibold text-[#f6f1e7] disabled:opacity-40"
            >
              {busy ? "…" : admin ? "Guardar" : "Pagar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QtyStepper({
  value,
  onDec,
  onInc,
  disableDec,
  disableInc,
  dark = false,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disableDec?: boolean;
  disableInc?: boolean;
  dark?: boolean;
}) {
  const btn = dark
    ? "bg-[#2c2822] text-[#f6f1e7] disabled:opacity-30"
    : "bg-white text-[#1c1915] disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Quitar una"
        onClick={onDec}
        disabled={disableDec}
        className={`grid h-11 w-11 place-items-center rounded-full text-xl leading-none ${btn}`}
      >
        −
      </button>
      <span className="w-7 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Añadir una"
        onClick={onInc}
        disabled={disableInc}
        className={`grid h-11 w-11 place-items-center rounded-full text-xl leading-none ${btn}`}
      >
        +
      </button>
    </div>
  );
}

function Rates({
  shipping,
  zone,
  productPrice,
}: {
  shipping: ShippingSettings;
  zone: ShippingZone | null;
  productPrice: number;
}) {
  const rows: { id: ShippingZone; label: string; price: number }[] = [
    { id: "peninsula", label: ZONE_LABEL.peninsula, price: shippingCost("peninsula", shipping, productPrice) },
    { id: "baleares", label: ZONE_LABEL.baleares, price: shippingCost("baleares", shipping, productPrice) },
    { id: "canarias", label: ZONE_LABEL.canarias, price: shippingCost("canarias", shipping, productPrice) },
    { id: "ceuta_melilla", label: ZONE_LABEL.ceuta_melilla, price: shippingCost("ceuta_melilla", shipping, productPrice) },
  ];
  return (
    <ul className="grid gap-2 text-sm">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`flex justify-between rounded-xl px-3 py-2 ${
            zone === r.id ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
          }`}
        >
          <span>{r.label}</span>
          <span>{r.price === 0 ? "Gratis" : euros(r.price)}</span>
        </li>
      ))}
      <li className="px-1 text-xs text-[#8a8173]">
        Salimos como muy tarde en 24 h.
        {shipping.freePeninsulaFrom > 0
          ? ` Península gratis desde ${euros(shipping.freePeninsulaFrom)} de producto.`
          : ""}
      </li>
    </ul>
  );
}

function Field({
  label,
  children,
  className = "",
  hint = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block text-sm text-[#3f3a34] ${className}`}>
      {label}
      <div className="mt-1 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#e6ddd0] [&_input]:bg-[#fffcf7] [&_input]:px-3 [&_input]:py-3 [&_input]:text-base">
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs text-red-700">{hint}</p> : null}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-[#6f675c]">
      <span className="shrink-0">{k}</span>
      <span className="truncate text-right">{v}</span>
    </div>
  );
}
