/** Misma geometría que disenos/generar_generica.py (mm). */

export const ATRIL = {
  FACE_W: 76,
  FACE_H: 108,
  FACE_T: 8,
  FACE_R: 6,
  FOOT_Y: 8,
  FOOT_Z: 54,
  FOOT_W: 88,
  STICKER_D: 25,
  WELL_D: 28,
  SEAT_D: 26,
  Z_FLOOR: 3.2,
  Z_GUIDE: 3.6,
  /** Última capa del pozo abierto. Encima va la tapa. Pegatina Timeskey ~0,2 mm. */
  Z_PAUSE: 4.8,
  /** Disco de acento en el suelo: se ve en la pausa; la pegatina va encima. */
  PAD_D: 24,
  PAD_H: 0.5,
  RING_H: 0.45,
  STAR_Y: 109,
  MARK_Y: 78,
  MARK_R: 16.5,
  TAP_Y: 42,
  RESE_Y: 29,
  NAME_Y: 35,
  TAP_H: 7,
  TAP_TRACK: 2.6,
  RESE_H: 4.8,
  RESE_TRACK: 1.9,
  NAME_H: 4.4,
  NAME_TRACK: 1.4,
  /** Mismo centro que MARK_Y: el NFC queda bajo la G / el logo. */
  NFC_Y: 78,
  RELIEF: 0.5,
} as const;
