export type DayStats = {
  date: string; // YYYY-MM-DD Madrid
  sent: number;
  failed: number;
  waves: number;
  /** Cold nuevos hoy (dentro de sent). */
  coldSent?: number;
  /** Follow-ups hoy (dentro de sent). */
  fuSent?: number;
  lastWaveAt?: string;
  lastPlace?: string;
};
