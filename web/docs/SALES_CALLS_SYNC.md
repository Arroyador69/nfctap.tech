# Calendario de llamadas · hub NFCTap (sync Delfín)

Fuente de verdad: **nfctap.tech** (Blob `sales-calls-shared.json`).

- Llamada: **15 min**
- Buffer entre citas: **30 min** (inicios cada 45 min)
- Lun–vie Madrid: **09:00–14:00** y **16:00–19:00**
- UI pública NFCTap: https://nfctap.tech/llamar  
  (no menciona Delfín ni “calendario compartido”)

## Env (NFCTap · Vercel)

```
SALES_CALL_MEETING_URL=https://zoom.us/j/...   # o Meet permanente
CALLS_SYNC_SECRET=...                          # o reutilizar CRON_SECRET
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
BLOB_READ_WRITE_TOKEN=...
```

## API para Delfín

Base: `https://nfctap.tech`

### Huecos libres + ocupados

```
GET /api/calls/sync?days=10
Authorization: Bearer $CALLS_SYNC_SECRET
```

Respuesta: `{ slots, busy, timezone }`.  
`busy` incluye reservas de **ambos** proyectos (sin enseñarlo al cliente).

### Reservar desde Delfín

```
POST /api/calls/sync
Authorization: Bearer $CALLS_SYNC_SECRET
Content-Type: application/json

{
  "project": "delfin",
  "slotKey": "2026-11-13T09:00",
  "name": "...",
  "email": "...",
  "phone": optional,
  "company": optional,
  "notes": optional
}
```

Telegram avisa con prefijo **Delfín** o **NFCTap**.

### Público NFCTap (sin secreto)

- `GET /api/calls/slots`
- `POST /api/calls/book` → siempre `project: nfctap`

## Qué debe hacer el agente de Delfín

1. Página `/llamar` (o equivalente) con la misma UX (15 min, ventanas, puntualidad).
2. Cargar slots vía sync API (no un Blob propio).
3. Reservar con `project: "delfin"`.
4. CTA en cold/FU de Delfín → su `/llamar`.
5. **Nunca** texto al usuario sobre sync con NFCTap.
