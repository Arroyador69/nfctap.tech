# Outreach · Follow-up (NFCTap → reutilizable en Delfín)

Documento de flujo para **2º/3º toque** tras el cold. Sirve para NFCTap hoy y, con los mismos principios, para Delfín Check-in (alquiler vacacional).

**Estado implementación (NFCTap):** código en producción pendiente de deploy —
`sequence.ts`, cupos `350 cold / 150 FU`, plantillas FU + RGPD, webhook programa `nextTouch`, Polar/opt-out paran secuencia, cron envía FU antes que cold. Backfill: `GET /api/cron/nfctap-leads-wave?backfillFollowUp=1&force=1&secret=…`

Estado base (2026-11-01, cola NFCTap):

| Métrica | Valor |
|---------|------:|
| Enviados (histórico) | 1410 |
| Abiertos | 254 (~18 %) |
| Clicks | 101 (~7,2 %) |
| Bounce | 184 |
| Ventas `/negocio` atribuidas | 0 |
| Ritmo cold | 500/día (10×50) |

---

## 1. ¿Cabe en Resend?

### Qué implica el plan

| Plan Resend (transaccional) | Límite | ¿Vale con 500 cold/día? |
|-----------------------------|--------|-------------------------|
| Free | **100/día** · 3 000/mes | **No** |
| Pro 50 000 · ~20 $/mes | Sin tope diario · 50 k/mes | Sí, con follow-up inteligente |
| Pro 100 000 · ~35 $/mes | 100 k/mes | Holgado si FU a casi todos |
| Scale | ≥100 k | Solo si compartes cuota con Delfín u otros |

**Señal de que ya no estás en Free:** mandáis ~500/día. Free cortaría a 100. Confirmad en [resend.com/settings/usage](https://resend.com) el plan y el uso del mes.

Overage Pro: ~0,90 $/1 000 mails extra (tope duro ~5× la cuota del plan).

### Estimación de volumen (NFCTap solo)

| Escenario | Mails/mes aprox. | ¿Pro 50 k? |
|-----------|-----------------:|------------|
| Solo cold 500/día | 15 000 | Holgado |
| Cold + FU **solo engaged** (abrió o click) 1 vez + FU2 a quien clickó | **~19 000** | Holgado (~31 k de margen) |
| Cold + 2 FU a **todos** | ~45 000 | Justo (poco margen para fallos/reintentos/otras apps) |
| Cold 500 + backlog FU engaged ahora (254) en 1–2 días | pico +254 | OK en Pro |

**Recomendación:** Pro ≥50 k y follow-up **priorizado** (no reenviar a los 1 156 silenciosos de golpe). Si Delfín + NFCTap comparten la misma cuenta Resend, sumad ambos usos antes de subir cold.

### Cap diario operativo (anti-spam + cuota)

Mantener techo duro cercano a **500–650/día** entre cold + follow-up:

- Ej. **350 cold nuevos** + **hasta 150 follow-up** (prioridad A→B), **o**
- **500 cold** + follow-up solo en huecos / si ese día vais por debajo del ritmo.

Si el objetivo es maximizar compras con la misma cuota: **bajar un poco el cold nuevo y subir FU a clicks** suele convertir mejor que 500 fríos sin segundo toque.

---

## 2. A quién enviar antes (prioridad)

Orden estricto. No comprar / opt-out / bounce → fuera.

| Prioridad | Señal | Stock ahora (NFCTap) | Por qué primero |
|-----------|--------|----------------------|-----------------|
| **A** | Clickó `/negocio` (o CTA) y **no** compró | **~101** | Máxima intención |
| **B** | Abrió, **no** clickó | **~153** | Conoce la marca; falta el paso |
| **C** | Enviado, sin open (silencio) | **~1 156** | Solo si sobra cuota; peor ROI |
| — | Bounce / failed / opt-out | ~184+ | Nunca FU |

### Timing

| Paso | Cuándo (desde mail 1) | A quién |
|------|------------------------|---------|
| Mail 1 (cold) | Día 0 | Cola nueva |
| Mail 2 (FU1) | **+2 días** si A · **+3 días** si B | A y B |
| Mail 3 (FU2) | **+5–7 días** solo si A y sigue sin compra | Solo A |
| Silenciosos (C) | **+7–10 días**, como mucho **1** FU, volumen bajo | C (opcional) |

Parar secuencia si: compra `/negocio`, opt-out, bounce, o respuesta humana (pasar a Zoho/`contacto@`).

### Backlog ahora (orden de ataque)

1. Los **101 con click** (FU1 ya; si llevan ≥5 días desde el envío, FU2 corto).
2. Los **153 solo open**.
3. De los silenciosos: solo los enviados hace **3–8 días** (ni ayer ni hace semanas), máximo ~50–80/día si hay hueco de cuota.

ROI esperado del backlog (heurística conservadora, no promesa): casi todo el valor está en **A**, luego **B**; **C** aporta poco.

---

## 3. Cómo personalizar (máxima chance de compra)

### Datos obligatorios en cada FU (como el cold)

- `businessName` (si es basura → omitir, no inventar)
- `city`
- `websiteUrl` → mencionar host (“vi vuestra web X…”)
- CTA claro a producto: NFCTap → `https://nfctap.tech/negocio`
- Baja RGPD + List-Unsubscribe

### Ángulo por prioridad (no repetir el mail 1)

**A — Clickó y no compró**  
Asunto ej.: `{Nombre}: te faltó un minuto` / `Tu atril NFC sigue a un paso`  
Cuerpo: reconocer que entró (“pasaste por la web”), quitar fricción (desde X €, 1–3 chips, logo, envío ~2 días), CTA mismo `/negocio`, 1 foto producto. Tono corto.

**B — Abrió sin click**  
Asunto ej.: `{Nombre} ({ciudad}): qué es el chip NFC en 20 s`  
Cuerpo: explicación ultra-corta (logo + NFC = cliente acerca el móvil → Google/IG/WA), precio, CTA, foto distinta a la del mail 1 si se puede.

**C — Silencio**  
Asunto distinto al 1. Una sola frase de valor + CTA. Si no abre el FU1 → no quemar más.

### Reglas de copy (NFCTap y Delfín)

- Marca, no nombre personal del founder (salvo respuesta 1-a-1).
- Un solo CTA.
- No adjuntos; HTML + texto plano.
- No mentir personalización (“hablé con vuestro encargado”).
- Misma identidad From / reply-to que el cold (reputación).

### Delfín (mismo flujo, otro producto)

| Pieza | NFCTap | Delfín |
|-------|--------|--------|
| Producto / CTA | `/negocio` atril NFC | check-in / onboarding / plan |
| Mail 1 | Cold local negocios | Cold owners / trial |
| Prioridad A | Click a pricing o demo | Click a alta / calendar |
| Prioridad B | Open cold | Open secuencia fase 1 |
| Stop | Pedido `unica` pagado | Tenant activo / pago / unsubscribe |
| Código referencia | `web/lib/business-leads/*` | `email-sequences/*` + `public-owner-leads/*` |

Implementación Delfín: reutilizar **tiers + delays + stop events**; plantillas distintas. No copiar el HTML de NFC.

---

## 4. Flujo técnico (a implementar)

```
Mail1 sent ──► webhook open/click/bounce
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      clicked    opened     silent/bounce
         │          │          │
      cola FU-A  cola FU-B   (opcional FU-C)
         │          │
      +2/+5 d    +3 d
         │          │
         └──── send FU ────► stop si compra / baja
```

### Campos nuevos en lead (Blob / DB)

- `touchCount` (1 = cold, 2 = FU1, 3 = FU2)
- `lastTouchAt`
- `nextTouchAt`
- `lastTouchKind`: `cold` | `fu_click` | `fu_open` | `fu_silent`
- `sequenceStatus`: `active` | `stopped_sale` | `stopped_optout` | `exhausted`

### Cron sugerido

1. Oleada cold (como ahora) dentro de ventana 08–17 Madrid.
2. Oleada follow-up **antes o después** en el mismo tick: primero sacar `nextTouchAt <= now` ordenados A→B→C hasta cupo FU del día.
3. Telegram: incluir `fuSent` + `tier` en el digest.

### Cupos día (ejemplo)

```
DAILY_HARD_CAP = 500   # o 650 si Pro y deliverability OK
COLD_SHARE     = 350
FU_SHARE       = 150   # A primero; si sobra, B; casi nunca C
```

---

## 5. KPI del follow-up

| KPI | Meta orientativa |
|-----|------------------|
| FU enviados / día | ≤ cupo FU |
| Open rate FU-A | > open cold |
| Click→compra (histórico clicks) | medir semanal; hoy 0/101 |
| Ventas atribuidas a touch 2–3 | tags Resend `touch=fu1` |
| Reclamaciones / bajas tras FU | vigilar; si suben, cortar C |

Tags Resend sugeridos: `campaign=nfctap_local_es`, `touch=cold|fu1|fu2`, `tier=a|b|c`.

---

## 6. Checklist antes de encender FU

- [x] Confirmar plan Resend (Usage) y margen mes — Pro (500/día ya activo)
- [x] Webhook open/click + sync Resend
- [x] Plantillas FU-A / FU-B / silencio + RGPD
- [x] No FU a bounce/opt-out/compra
- [x] Cap diario 350 cold + 150 FU
- [ ] Deploy + `backfillFollowUp=1` una vez
- [ ] (Delfín) mismos tiers con stop en tenant/pago — copiar este doc

---

## 7. Resumen ejecutivo

1. **Resend:** con Pro 50 k, cold 500/día + FU solo a quien abrió/clickó **entra holgado (~19 k/mes)**. FU a todo el mundo 2 veces aprieta el plan. Free es incompatible con este ritmo.
2. **Orden:** clicks (101) → opens (153) → silenciosos solo si sobra.
3. **Copy:** personalizar nombre/ciudad/web; ángulo distinto por tier; un CTA; parar al comprar.
4. **Delfín:** mismo motor de prioridades y delays; otro producto y stops.
