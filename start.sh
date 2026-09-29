#!/bin/sh
# MAKTUB lokal starten: Server auf Port 8080 und Browser öffnen (macOS/Linux)
cd "$(dirname "$0")"
URL=http://localhost:8080/index.html
( sleep 1; (open "$URL" || xdg-open "$URL") >/dev/null 2>&1 ) &
if command -v python3 >/dev/null 2>&1; then python3 -m http.server 8080; else python -m http.server 8080; fi
