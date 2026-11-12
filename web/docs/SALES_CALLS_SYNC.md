# Calendario de llamadas · sync NFCTap ↔ Delfín

Ambos proyectos usan la **misma rejilla** y el protocolo **peer-busy** (el cliente nunca ve sync).

- Llamada: **15 min**
- Inicios cada **45 min** (15 + 30 margen) — contrato Delfín
- Lun–vie Madrid: **09:00–14:00** y **16:00–19:00**
- UI NFCTap: https://nfctap.tech/llamar  
- UI Delfín: https://delfincheckin.com/reserva-llamada/
- Detalle: `delfin-check-in/docs/SALES_CALL_SYNC_CONTRACT.md`

## Env NFCTap (Vercel)

```
SALES_CALL_MEETING_URL=https://zoom.us/j/2139282300
CALLS_SYNC_SECRET=...                 # MISMO valor que Delfín SALES_CALL_SYNC_SECRET
# SALES_CALL_SYNC_SECRET=...          # alias aceptado
SALES_CALL_PEER_URL=https://admin.delfincheckin.com   # sin slash final
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
BLOB_READ_WRITE_TOKEN=...
RESEND_API_KEY=...
RESEND_FROM=NFCTap <hola@nfctap.tech>
```

## Env Delfín

```
SALES_CALL_SYNC_SECRET=...            # mismo secreto
SALES_CALL_PEER_URL=https://nfctap.tech
SALES_CALL_MEETING_URL=https://zoom.us/j/2139282300
```

## Protocolo peer (el que usa Delfín hoy)

Base peer: `https://nfctap.tech` / `https://delfincheckin.com`

Header: `X-Sales-Call-Sync: $SECRET`

### GET ocupados

```
GET /api/public/sales-calls/peer-busy?from=ISO&to=ISO
→ { busy: [{ startAt, endAt }] }
```

### POST espejo (al reservar)

```
POST /api/public/sales-calls/peer-busy
{ startAt, endAt, remoteId, name, email, project }
→ { ok, id }
```

### DELETE espejo (al cancelar)

```
DELETE /api/public/sales-calls/peer-busy
{ remoteId, startAt?, action: "cancel" }
```

## Hub legacy (opcional)

```
GET/POST /api/calls/sync
Authorization: Bearer $CALLS_SYNC_SECRET
```

## Público NFCTap

- `GET /api/calls/slots` — libre local + busy del peer
- `POST /api/calls/book` — `project: nfctap` + espejo a Delfín

## Reglas

1. Misma rejilla 30 min en ambos.
2. Al reservar → mirror al peer; al cancelar → liberar espejo.
3. **Nunca** texto al usuario sobre sync entre marcas.
