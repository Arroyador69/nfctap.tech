# NFCTap.tech — web

Tienda + personalizador + dashboard de pedidos. Next.js 16, lista para Vercel.

## Local

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

- Tienda: http://localhost:3000
- Personalizar: http://localhost:3000/personalizar
- Dashboard: http://localhost:3000/dashboard · clave por defecto `nfctab`

## Vercel

1. Importa el repo.
2. **Root Directory:** `web`
3. Variables: `DASHBOARD_PASSWORD`, `DASHBOARD_SECRET`
4. Polar más adelante: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_*`

Los pedidos se guardan en memoria/`/tmp` en Vercel (vale para empezar). Cuando haya volumen, se conecta Neon/Postgres en `lib/store.ts`.

## Polar (aún no)

Crea 5 productos one-time (genérica 15 / 25 €, personalizada 30 / 55 €, pieza única 70 €) y pega los IDs en `POLAR_PRODUCT_GENERIC_1`, `_2`, `CUSTOM_1`, `_2` y `UNICA_1`. Webhook: `/api/webhook/polar`.
