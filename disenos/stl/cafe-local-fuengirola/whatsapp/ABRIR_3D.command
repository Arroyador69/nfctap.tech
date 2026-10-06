#!/bin/bash
cd "$(dirname "$0")"
PORT=8772
python3 -m http.server $PORT >/tmp/nfctap-cafe-local-3d.log 2>&1 &
PID=$!
sleep 0.6
open "http://127.0.0.1:$PORT/ver-en-3d.html"
wait $PID
