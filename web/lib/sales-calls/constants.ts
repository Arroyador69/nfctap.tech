/** Calendario comercial compartido (NFCTap + Delfín). No mencionar Delfín en la UI. */

export const CALL_DURATION_MIN = 15;
/** Hueco mínimo entre el final de una llamada y el inicio de la siguiente. */
export const CALL_BUFFER_MIN = 30;
/** Intervalo entre inicios = 15 + 30. */
export const CALL_SLOT_STEP_MIN = CALL_DURATION_MIN + CALL_BUFFER_MIN;

/** Ventanas Europe/Madrid · lun–vie. */
export const CALL_WINDOWS = [
  { startHour: 9, startMin: 0, endHour: 14, endMin: 0 },
  { startHour: 16, startMin: 0, endHour: 19, endMin: 0 },
] as const;

export const CALL_TZ = "Europe/Madrid";

export const CALL_BLOB_KEY = "sales-calls-shared.json";

export type CallProject = "nfctap" | "delfin";

export const CALL_PROJECT_LABEL: Record<CallProject, string> = {
  nfctap: "NFCTap",
  delfin: "Delfín",
};
