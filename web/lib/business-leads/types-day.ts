export type DayStats = {
  date: string; // YYYY-MM-DD Madrid
  sent: number;
  failed: number;
  waves: number;
  lastWaveAt?: string;
  lastPlace?: string;
};
