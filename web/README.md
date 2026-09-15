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

## Precios (no son 2×1 con cupón)

| Producto | Polar | Precio |
|---|---|---|
| Google / WhatsApp / Instagram × 1 | `POLAR_PRODUCT_GENERIC_1` | 20 € |
| Pack × 2 (también una de cada) | `POLAR_PRODUCT_GENERIC_2` | 35 € (no 40 €) |
| Con logo × 1 | `POLAR_PRODUCT_CUSTOM_1` | 30 € |
| Con logo × 2 | `POLAR_PRODUCT_CUSTOM_2` | 55 € (no 60 €) |

La pieza única (70 €) no se vende en Polar: se cierra por email.

En el checkout Polar cobra **producto + envío** (ad-hoc). Península gratis desde 45 € de producto.

## Polar

En [polar.sh](https://polar.sh) (organización NFCTap, **producción**, no sandbox):

1. Settings → Organization Access Token con `products:write`, `checkouts:write` y `checkouts:read`.
2. Settings → Webhooks → endpoint `https://nfctap.tech/api/webhook/polar` (formato Raw). Eventos: `checkout.updated`, `order.created`, `order.paid`. Copia el secret `whsec_…`.
3. Crea los 4 productos:

```bash
cd web
POLAR_ACCESS_TOKEN=polar_oat_… POLAR_SERVER=production npm run polar:setup
```

El script escribe los IDs en `.env.local`. Pégalos también en Vercel.

4. En Vercel: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER=production` y los cuatro `POLAR_PRODUCT_*`.

**Bizum** no se activa a mano. Polar lo muestra en el checkout cuando el comprador está en España (EUR, pago único). La web le pasa la IP y el país ES. El cliente confirma en su banco; Polar cobra, envía el recibo y avisa a la web por webhook. No uses Bizum al número de teléfono de la tienda: eso es entre particulares, no hay confirmación automática del pedido.

## Vercel

1. Importa el repo. **Root Directory:** `web`
2. Variables: `DASHBOARD_PASSWORD`, `DASHBOARD_SECRET`
3. Blob: `BLOB_READ_WRITE_TOKEN` (Storage → Blob)
4. Polar (producción): ver arriba
