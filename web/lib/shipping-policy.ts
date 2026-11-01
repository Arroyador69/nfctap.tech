/**
 * Texto canónico de plazos de fabricación y envío (política pública).
 * Usar en /envios, /legal y copy de checkout — no prometer «sale en 24 h» sin matices.
 */

export const FAB_TYPICAL_HOURS = 72;
export const FAB_MAX_DAYS = 15;

export const SHIPPING_POLICY = {
  title: "Plazos de fabricación y envío",
  summary:
    "Fabricamos en España. Lo habitual es tener la pieza lista en unas 72 horas laborables tras el pago. El envío sale el día laborable siguiente a cuando la pieza está terminada. En periodos de mucha carga el plazo total puede alargarse; en el peor de los casos, hasta 15 días naturales desde el pedido confirmado.",
  bullets: [
    "Fabricación: normalmente lista en ~72 horas laborables desde el pago confirmado (impresión 3D, acabado y programación del chip NFC).",
    "Envío: el paquete sale con Correos el día laborable siguiente a la finalización de la pieza (no necesariamente el mismo día del pedido).",
    "Días laborables: lunes a viernes, salvo festivos en España. Los pedidos de fin de semana o festivo empiezan a contar el siguiente laborable.",
    "Carga del taller: si hay acumulación de pedidos u otras fabricaciones en curso, el plazo puede ampliarse. Informamos cuando el retraso sea relevante.",
    "Tope orientativo: en el peor de los casos, hasta 15 días naturales desde el pago hasta la salida del envío. Si se supera, contactamos a la dirección de email del pedido.",
    "Tránsito Correos: una vez depositado, el plazo de entrega lo marca Correos según zona (península, Baleares, Canarias, Ceuta y Melilla).",
    "Ámbito: solo España. Entrega en mano solo si se acuerda expresamente en el pedido.",
  ],
  shortCheckout:
    "Fabricación habitual ~72 h laborables. Sale el día laborable siguiente a tener la pieza lista. En picos de pedidos, hasta 15 días naturales. Solo España · Correos.",
  shortFaq:
    "La pieza suele estar lista en unas 72 h laborables; Correos sale el día laborable siguiente. En el peor caso, hasta 15 días naturales hasta la salida del envío.",
} as const;
