#!/usr/bin/env bash
# Saca TELEGRAM_CHAT_ID con tu bot token y deja listo el pegado en Vercel.
# Uso:
#   export TELEGRAM_BOT_TOKEN='123456:ABC...'
#   # 1) Ábrele un chat al bot en Telegram y mándale /start
#   # 2) ./scripts/telegram-setup.sh

set -euo pipefail
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Pon TELEGRAM_BOT_TOKEN en el entorno (el que te dio @BotFather)."
  exit 1
fi

echo "→ getMe…"
curl -sS "https://api.telegram.org/bot${TOKEN}/getMe" | python3 -m json.tool

echo
echo "→ getUpdates (mándale /start al bot si sale result: [])…"
RAW=$(curl -sS "https://api.telegram.org/bot${TOKEN}/getUpdates")
echo "$RAW" | python3 -m json.tool

CHAT=$(python3 -c '
import json,sys
d=json.loads(sys.argv[1])
ids=[]
for u in d.get("result") or []:
    m=u.get("message") or u.get("my_chat_member") or {}
    c=m.get("chat") or {}
    if "id" in c: ids.append(str(c["id"]))
print(ids[-1] if ids else "")
' "$RAW")

if [[ -z "$CHAT" ]]; then
  echo
  echo "No hay chat aún. En Telegram: busca tu bot → Start / /start → vuelve a ejecutar este script."
  exit 2
fi

echo
echo "=============================="
echo "TELEGRAM_BOT_TOKEN=$TOKEN"
echo "TELEGRAM_CHAT_ID=$CHAT"
echo "=============================="
echo
echo "Pégalos en Vercel → Environment Variables (Production) y redeploy."
echo "Prueba: /dashboard/captacion → «Probar Telegram»"
