# Captación negocios NFCTap — flujo nuevo (vs Delfín)

Delfín busca **solo alquiler vacacional**. NFCTap busca **cualquier negocio local** con web pública: restaurante, café, hotel, apartamento, dentista, peluquería, tienda, clínica, oficina…

## Idea (2 fases, como Delfín pero más ancha)

```
Fuengirola → anillos Costa → España
        │
        ▼
┌───────────────────┐     Blob stock webs      ┌──────────────────┐
│  HARVEST (fase A) │ ──────────────────────► │  EXTRACT (fase B)│
│  OSM map + Nominatim│   pending URLs         │  scrape /contacto│
└───────────────────┘                          └────────┬─────────┘
                                                       │
                                                       ▼
                                              Cola leads (emails)
                                                       │
                                                       ▼
                                              OLEADAS Resend 500/día
```

| Fase | Qué hace | Cron | Timeout-safe |
|------|----------|------|--------------|
| **A Harvest** | Encuentra **webs** (no scrapea mail) | `/api/cron/nfctap-leads-harvest` · :05 y :35 | Sí — solo OSM/Nominatim |
| **B Extract** | Entra en cada web, saca email → cola | `/api/cron/nfctap-leads-extract` · :20 y :50 | Sí — N páginas/tick |
| **C Wave** | Envía 50/hora | `/api/cron/nfctap-leads-wave` | Ya existía |

Compat: `/api/cron/nfctap-leads-discover?phase=both|harvest|extract`

## Por qué más volumen que Delfín

1. **Tipos**: 14 keywords (restaurante, dentista, hotel, farmacia…) vs solo turismo.
2. **Geografía densa**: anillos de celdas alrededor de **Fuengirola** primero (mapa OSM bbox), luego Mijas / Benalmádena / Torremolinos / Málaga / Marbella…
3. **Nominatim + extratags**: búsqueda “peluquería Fuengirola” → `website` OSM.
4. Stock de webs **separado** de la cola de envío → harvest agresivo sin quemar el cron de envío.

## Orden geográfico

1. Fuengirola (anillo 0–3, ~19 celdas)
2. Costa del Sol (Mijas → Estepona → Nerja)
3. Resto `NFC_PLACES` (Andalucía → España)

Código: `place-rings.ts`, `harvest-websites.ts`, `website-stock.ts`, `extract-batch.ts`.

## Cómo probar

```bash
# 1) Cosecha webs cerca de Fuengirola
curl "https://nfctap.tech/api/cron/nfctap-leads-harvest?secret=…&wave=0"

# 2) Saca emails a la cola
curl "https://nfctap.tech/api/cron/nfctap-leads-extract?secret=…"

# 3) Ver cola (dry, sin enviar)
curl "https://nfctap.tech/api/cron/nfctap-leads-wave?dry=1&force=1&secret=…"
```

Panel: `/dashboard/captacion` (enviados / opens). Stock pending aparece en la respuesta JSON del harvest.

## Límites honestos

- OSM no tiene web en todos los locales → Nominatim + scrape compensan.
- Nominatim = 1 req/s (respetamos delay).
- Overpass público a menudo timeout desde Vercel → **no es la fuente principal**.
- RGPD: solo emails publicados en la web del negocio + baja `/api/outreach/opt-out`.
