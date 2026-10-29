/**
 * Outreach negocios locales NFCTap — ritmo anti-burst (mismo patrón que Delfín).
 * Objetivo: ~500 mails/día · meta ≥10 ventas/día (/negocio).
 * Proveedor: Resend (dominio nfctap.tech verificado).
 */

/** Emails por oleada. */
export const NFC_LEADS_WAVE_MAX = 50;

/** Tope día = 10 oleadas × 50 = 500 */
export const NFC_LEADS_DAILY_HARD_CAP = 500;

export const NFC_LEADS_WAVES_PER_DAY = 10;

/** Si hay ≥10 pedidos pagados `unica` ese día → stop envíos. */
export const NFC_SALES_DAILY_GOAL = 10;

/** Cola mínima tras prepare. */
export const NFC_LEADS_MIN_QUEUED = 800;

/** Delay entre envíos (ms). */
export const NFC_LEADS_SEND_DELAY_MS = 1800;

export const NFC_LEADS_CAMPAIGN = "nfctap_local_es";

export const NFC_LEADS_EMAIL_TYPE = "nfctap_business_outreach";

/** Prioridad geográfica (cola discover empieza aquí). */
export const NFC_SEED_PLACES = [
  "Fuengirola",
  "Mijas",
  "Benalmádena",
  "Torremolinos",
  "Málaga",
  "Marbella",
  "Sevilla",
  "Granada",
  "Madrid",
  "Barcelona",
] as const;

/**
 * Tipos de negocio (cualquier local con email/web público).
 * Hostelería, belleza, salud, tienda, oficina, hotel…
 */
export const NFC_BUSINESS_TYPES = [
  "cafe",
  "restaurant",
  "bar",
  "hairdresser",
  "beauty",
  "hotel",
  "fast_food",
  "clinic",
  "dentist",
  "shop",
  "office",
  "craft",
] as const;
