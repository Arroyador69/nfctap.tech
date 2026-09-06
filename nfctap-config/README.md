# NFCTap Config

App para **programar pegatinas NFC** de NFCTab. Nombre: **NFCTap Config** (`tech.nfctab.config`). «NFC Tap» ya está pillado en la App Store (ST).

Hoy: **gratis, para ti**. Paywall más adelante.

## Qué graba (NDEF)

Negocio: reseña Google, web, PDF/menú, WhatsApp (prefijo + número + mensaje), app, TripAdvisor, reservas, PayPal.

Redes: Instagram, TikTok, Facebook, Telegram, Maps, YouTube, LinkedIn, X, Spotify.

Contacto: llamada, email, SMS, vCard.

Conexión: **Wi‑Fi con contraseña** (Android se une solo; iPhone ve red y clave).

Extra: texto, GPS, URI libre.

El cliente **no instala esta app**. Toca y el sistema abre el enlace.

Se puede programar **cualquier chip NDEF** (NTAG213/215/216, Ultralight…). No: bancarias, bloqueadas, ni MIFARE Classic raras en iPhone.

El chip **no guarda un PDF**: guarda la URL. Las 200 “tareas” de NFC Tools (silencio, brillo…) automatizan **tu** Android y piden su app extra; aquí no, porque el cliente de la barra no las tiene.

## Cómo la ves ya (Expo Go)

```bash
cd nfctap-config
npm start
```

QR con Expo Go: ves pantallas y plantillas. **Expo Go no escribe NFC.**

## Cómo programas de verdad (hoy, Android)

1. Móvil Android con NFC + cable USB.
2. En el Mac:

```bash
cd nfctap-config
npx expo run:android
```

3. Configurar → Reseña Google → pegas `g.page` → acercas la tira.

iPhone: más tarde, `npx expo run:ios` o Xcode. Hace falta el capability **NFC Tag Reading**. iPhone 7+.

## Cómo ganan las otras (para el paywall)

| App | Modelo |
| --- | --- |
| NFC Tools | Gratis + Pro ~4 € o IAP. Tareas/automatización en Pro. |
| NFC Tools Pro | App de pago. Perfiles, emular tag, 200 tareas. |
| Smart NFC y clones | Escritura básica gratis, ilimitado / plantillas de pago o suscripción. |

Para NFCTab, el dinero está en **la tarjeta física**. La app puede quedarse gratis para ti y, luego, un Pro (historial en la nube, lotes, varios operarios) si la usáis más gente.

## No hacemos (a propósito)

- Bloquear el chip (write-protect): irreversible en NTAG.
- Clonar pagos / bank cards.
- Automatizar el teléfono del cliente (eso es NFC Tasks, otro rollo).
