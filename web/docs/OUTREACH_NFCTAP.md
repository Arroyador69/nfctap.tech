# NFCTap · Outreach negocios locales (Resend)

Objetivo: **≥ 10 ventas/día** del producto `/negocio` (logo + 1–3 chips).  
Ritmo: **500 mails/día** (10 oleadas × 50), mismo patrón anti-burst que Delfín Check-in.

## Precios web (pedido online)

| Chips | Precio | Notas |
|-------|--------|--------|
| 1 | **70 €** | Un enlace (Google / IG / WA / otro) |
| 2 | **80 €** | Base |
| 3 | **95 €** | +15 € el tercero |

Página: https://nfctap.tech/negocio (visor 3D + Polar UNICA)  
Fotos mail: `/public/stock/freddos.jpg`, `markos.jpg` (sin nombrar clientes)

**Pago (2026-10-29):** Polar `POLAR_PRODUCT_UNICA_1` en Vercel + checkout `/api/orders` → URL `polar.sh/checkout/…` OK (80 € · 2 chips).

## 1. DNS Resend (hacer hoy)

Estado apex (Porkbun / Zoho):
- **MX** → Zoho EU (bandejas `contacto@`, y si las creaste `hola@` / `info@`)
- **SPF** apex = solo `include:zohomail.eu` (no mezclar cold aquí)
- **DKIM Resend** ya existe: `resend._domainkey.nfctap.tech`
- Subdominio `send.nfctap.tech` apunta a Resend (`send.forge.rmta.net`)

Pasos:
1. [resend.com](https://resend.com) → Domains → verifica `nfctap.tech` o mejor `send.nfctap.tech`
2. Vercel Production ya tiene `RESEND_API_KEY` + `RESEND_FROM` (comprobar en `/dashboard/captacion`)
3. Prueba en **https://nfctap.tech/dashboard/captacion** → «Probar mail Resend»

**No uses Zoho** para cold/bulk. Zoho = soporte 1-a-1 (`contacto@`).

## 1b. Telegram (confirmación oleadas)

1. @BotFather → bot «NFCTap Oleadas»
2. Vercel: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
3. Misma página captación → «Probar Telegram»
4. Cron dry-run: `GET /api/cron/nfctap-leads-wave` (+ `CRON_SECRET`)

## 1c. Admin

- Dashboard ya existe: `/dashboard` (password `DASHBOARD_PASSWORD`)
- Captación: `/dashboard/captacion` — cola, mails enviados, abiertos/clicks (como Delfín), ventas, infra
- **No** hay botón de oleada: solo cron `nfctap-leads-discover` + `nfctap-leads-wave`
- Webhook Resend → `POST /api/webhook/resend` (opened / clicked / bounced) · opcional `RESEND_WEBHOOK_SECRET`
- Panel clientes (otra cosa): `/panel` · superadmin `contacto@nfctap.tech`

## 2. Geografía

Orden de cola (constants) — el **mail siempre pone la ciudad del lead**, no un sitio fijo:

1. Fuengirola  
2. Mijas · Benalmádena · Torremolinos  
3. Málaga · Marbella  
4. Resto provincia / Andalucía → resto España  

Tipos: café, restaurante, bar, peluquería, belleza, hotel, comida rápida.
Cada envío: `city` + `businessName` (+ `websiteUrl` si hay) en `OutreachVars`.

## 3. Ritmo

| Parámetro | Valor |
|-----------|--------|
| Oleada | 50 |
| Oleadas/día | 10 |
| Cap día | **500** |
| Delay | 1,8 s |
| Ventana | 08:00–17:00 Madrid · **todos los días** (como Delfín) |
| Stop | si ventas pagadas ≥ **10** ese día |

Código: `lib/business-leads/constants.ts`, `template.ts`, `send-resend.ts`.

## 4. Mail (conversión)

- **Asunto:** `{Nombre}: crea tu pieza NFC en 1 minuto` (o ciudad si no hay nombre)
- **Preheader:** atril + chips NFC + toque del móvil + 1 minuto
- **Tono:** humano («Hola… Soy Alberto, de nfctap.tech») · ciudad y nombre del lead
- **Qué es:** atril con **tu logo** + **chips NFC** (como pago sin contacto) → web / Google / IG / WhatsApp
- **CTA:** «Crea tu pieza en 1 minuto →» → `/negocio`
- **Fotos:** producto real (`/stock/freddos.jpg`, `/markos.jpg`) · sin nombrar locales
- RGPD art. 6.1.f + baja `/api/outreach/opt-out`
- Código: `lib/business-leads/template.ts`

## 5. Descubrir emails

Reutilizar el pipeline de Delfín (`public-owner-leads`: Overpass/OSM → extract-web → cola → oleadas), adaptado a negocios locales en vez de alquiler vacacional.  
Repo referencia: `/Users/albertogarciaarroyo/delfincheckin.com/delfin-check-in/src/lib/public-owner-leads/`

Siguiente iteración en este repo:

- Tabla / Blob cola `business_leads`
- Cron Vercel `api/cron/nfctap-leads-wave`
- Discover Fuengirola primero
- Panel dashboard para ver cola / enviados / ventas

## 6. KPI diario

| Métrica | Meta |
|---------|------|
| Mails | ≤ 500 |
| Ventas `/negocio` pagadas | ≥ **10** |
| Cola queued | ≥ 800 |

Si llegas a 10 ventas `/negocio` → parar oleadas ese día (reputación + foco en producir).
