#!/bin/bash
cd "$(dirname "$0")"
PORT=8765
python3 -m http.server "$PORT" >/tmp/freddos-3d.log 2>&1 &
sleep 0.4
open "http://127.0.0.1:$PORT/ver-en-3d.html"
