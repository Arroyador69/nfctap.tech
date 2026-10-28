/**
 * Outreach negocios locales NFCTap — ritmo anti-burst (mismo patrón que Delfín).
 * Objetivo: ~500 mails/día · meta ≥5 ventas/día.
 * Proveedor: Resend (dominio nfctap.tech verificado).
 */

/** Emails por oleada. */
export const NFC_LEADS_WAVE_MAX = 50;

/** Tope día = 10 oleadas × 50 = 500 */
export const NFC_LEADS_DAILY_HARD_CAP = 500;

export const NFC_LEADS_WAVES_PER_DAY = 10;

/** Si hay ≥5 pedidos pagados `unica`/`personalizada` ese día → stop envíos. */
export const NFC_SALES_DAILY_GOAL = 5;

/** Cola mínima tras prepare. */
export const NFC_LEADS_MIN_QUEUED = 800;

/** Delay entre envíos (ms). */
export const NFC_LEADS_SEND_DELAY_MS = 1800;

export const NFC_LEADS_CAMPAIGN = "nfctap_local_es";

export const NFC_LEADS_EMAIL_TYPE = "nfctap_business_outreach";

/** Prioridad geográfica. */
export const NFC_SEED_PLACES = [
  "Fuengirola",
  "Mijas",
  "Benalmádena",
  "Torremolinos",
  "Málaga",
  "Marbella",
] as const;

/** Tipos de negocio (Overpass / OSM / directorios). */
export const NFC_BUSINESS_TYPES = [
  "cafe",
  "restaurant",
  "bar",
  "hairdresser",
  "beauty",
  "hotel",
  "fast_food",
] as const;
