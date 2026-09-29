@echo off
rem MAKTUB lokal starten (Windows): Server auf Port 8080 und Browser öffnen
cd /d "%~dp0"
start "" http://localhost:8080/index.html
python -m http.server 8080 || py -m http.server 8080
