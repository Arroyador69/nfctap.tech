/**
 * Outreach negocios locales NFCTap — ritmo anti-burst (mismo patrón que Delfín).
 * Objetivo: meta ≥10 ventas/día (/negocio) · cold + follow-up por intención.
 * Proveedor: Resend (dominio nfctap.tech verificado).
 * Cuota típica: Pro 50k/mes; Delfín puede ir a ~1000/día en otra cuenta o la misma.
 */

/** Emails por oleada (tick cron). */
export const NFC_LEADS_WAVE_MAX = 50;

/** Tope día total (cold + follow-up). */
export const NFC_LEADS_DAILY_HARD_CAP = 500;

/**
 * Cold nuevos / día. El resto del tope se reserva a follow-up (clicks → opens → silencio).
 * 350 + 150 = 500. Si un día hay pocos FU due, el cold puede usar el hueco restante.
 */
export const NFC_LEADS_COLD_DAILY_CAP = 350;

/** Follow-up / día (prioridad A/B/C). */
export const NFC_LEADS_FU_DAILY_CAP = 150;

export const NFC_LEADS_WAVES_PER_DAY = 10;

/** Si hay ≥10 pedidos pagados `unica` ese día → stop envíos. */
export const NFC_SALES_DAILY_GOAL = 10;

/**
 * Cola mínima operativa: por debajo → harvest/extract a tope
 * (nunca empezar la jornada ni una oleada en seco).
 */
export const NFC_LEADS_MIN_QUEUED = 800;

/** Objetivo de cola fría (buffer ~2–3 días de cold 350). */
export const NFC_LEADS_TARGET_QUEUED = 1200;

/** Stock webs pendientes mínimo antes de forzar cosecha/reciclaje. */
export const NFC_LEADS_MIN_PENDING = 250;

/** Stock webs objetivo en harvest (combustible para extract). */
export const NFC_LEADS_TARGET_PENDING = 2000;

/** Delay entre envíos (ms). */
export const NFC_LEADS_SEND_DELAY_MS = 1800;

/** Días tras click (o cold) → 1º FU a quien clickó. */
export const NFC_FU_CLICK_DELAY_DAYS = 2;
/** Días tras 1º FU-click → 2º FU. */
export const NFC_FU_CLICK_SECOND_DELAY_DAYS = 5;
/** Días tras cold → FU a quien abrió sin click. */
export const NFC_FU_OPEN_DELAY_DAYS = 3;
/** Días tras cold → FU silencio (baja prioridad). */
export const NFC_FU_SILENT_DELAY_DAYS = 8;

/** Toques máx. (incluye cold). Click: cold+2 FU · open/silent: cold+1 FU. */
export const NFC_FU_MAX_TOUCHES_CLICK = 3;
export const NFC_FU_MAX_TOUCHES_OPEN = 2;
export const NFC_FU_MAX_TOUCHES_SILENT = 2;

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
  "Estepona",
  "Sevilla",
  "Granada",
  "Valencia",
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
  "pharmacy",
  "pub",
] as const;
