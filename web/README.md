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

1. Importa el repo. **Root Directory:** `web`
2. Variables: `DASHBOARD_PASSWORD`, `DASHBOARD_SECRET`
3. Blob: `BLOB_READ_WRITE_TOKEN` (Storage → Blob)
4. Polar (producción): ver abajo

## Polar

En [polar.sh](https://polar.sh) (organización NFCTap, **producción**, no sandbox):

1. Settings → Organization Access Token con permiso de checkouts.
2. Settings → Webhooks → endpoint `https://nfctap.tech/api/webhook/polar` (formato Raw). Eventos: `checkout.updated`, `checkout.confirmed`, `order.created`, `order.paid`. Copia el secret `whsec_…`.
3. Products → 4 productos **one-time, EUR, no recurrentes**:
   - Genérica × 1 → 15 € → `POLAR_PRODUCT_GENERIC_1`
   - Genérica × 2 → 25 € → `POLAR_PRODUCT_GENERIC_2`
   - Personalizada × 1 → 30 € → `POLAR_PRODUCT_CUSTOM_1`
   - Personalizada × 2 → 55 € → `POLAR_PRODUCT_CUSTOM_2`
4. En Vercel: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER=production` y los cuatro IDs.

**Bizum** no se activa a mano. Polar lo muestra en el checkout cuando el comprador está en España (EUR, pago único). La web le pasa la IP y el país ES. El cliente confirma en su banco; Polar cobra, envía el recibo y avisa a la web por webhook. No uses Bizum al número de teléfono de la tienda: eso es entre particulares, no hay confirmación automática del pedido.

La pieza única (70 €) no se vende en Polar: se cierra por email.
