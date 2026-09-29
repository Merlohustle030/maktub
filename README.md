# MAKTUB — ein cineastisches Story-Game

> *Es steht geschrieben.*

Ein emotionales 3D-Low-Poly-Spiel, das **direkt im Browser** läuft – als **eine einzige, eigenständige Datei: `index.html`**.
Extern geladen werden nur Three.js (cdnjs) und die Schriften (Google Fonts). Alle Modelle sind prozedural aus Geometrie gebaut,
alle Musik und alle Geräusche werden live per Web Audio synthetisiert (Oud/Kanun per Karplus-Strong, Ney, Streicher, 808, Hall aus generierter Impulsantwort – in echten Maqamat: Hijaz, Kurd, Nahawand).

**Öffnen:** `index.html` im Browser starten (aktueller Chrome/Edge/Firefox/Safari mit WebGL2). Dann klicken – erst dann startet der Ton. **Mit Kopfhörern spielen.**

## Was spielbar ist

| Teil | Inhalt |
|---|---|
| **Hauptmenü** | Live-3D-Dach im Sonnenuntergang, Kapitälchen-Menü, Kapitelauswahl, Einstellungen |
| **Prolog – „Maktub“** | 3:47 Uhr, Regen, ein Zimmer. Erkunden, Fokus, die Katze, das Foto, die Rückblende auf Nenas Balkon, der Notizbuch-Eintrag, der Titel |
| **Kapitel I – „Innenstadt“** | Goldene Stunde auf einem Platz am Fluss. Straßenmusiker, Straßenbahn, Café Aurora (Herr Brandt, 10 000 €), Hotel Belvedere (Frau Winter, 20 000 €), Montage auf den Beat (30 000 €), Kontostand-Ritual in Zeitlupe, Mamas Anruf, Ende |
| Kapitel II–VII, Finale | im Kapitelmenü als „Noch nicht geschrieben“ vorgemerkt |

Kapitel I dauert etwa 12–15 Minuten.

## Steuerung

| Taste | Wirkung |
|---|---|
| **W A S D** / Pfeiltasten | Gehen |
| **Maus** | Kamera (ins Bild klicken = Mauszeiger einfangen; **Esc** gibt ihn frei) |
| **E** | Interagieren · am Handy antworten · aufstehen |
| **Umschalt** (halten) | **Fokus**: Zeit verlangsamt sich, die Welt entsättigt, Wichtiges leuchtet golden – und im Deal siehst du, was dein Gegenüber verrät |
| **Leertaste** | Weiter / bestätigen · **in Cutscenes halten = überspringen** |
| **1 – 4**, **↑ ↓** + Leertaste | Antworten im Deal wählen |
| **Leertaste halten** (bei „Schweigen“) | Schweigen aushalten |
| **Esc** | Notizbuch (Pause, Einstellungen, Kapitel, Hauptmenü) |
| **Tab** | aktuelles Ziel einblenden |
| Touch | virtueller Stick, Tasten „Fokus“, „E“, „Weiter“; Wischen = Kamera |

### Die Deals
Jede Runde zeigt dir ein **Verhalten** deines Gegenübers (Uhr, verschränkte Arme, Fingertrommeln, Vorlehnen). **Umschalt halten** verrät, was Mirza darin liest.
Dann antwortest du mit **Druck**, **Ruhe**, **Aufstehen** oder **Schweigen**. Nichts scheitert endgültig – *es steht geschrieben* –, aber wie du gewinnst, prägt Mirza und spätere Kapitel.
Am Ende bleibt oft nur eine Zeile sagbar; die durchgestrichenen sind das **Ungesagte**.

## Bauen & Prüfen (für Entwickler)

```
npm run build   # src/ → index.html (CSS + JS inline)
npm run lint    # baut + ESLint (no-undef) über das gebündelte Skript
```

- `src/template.html`, `src/style.css`, `src/js/*.js` (alphabetisch zu **einem** Skript zusammengesetzt)
- `tools/harness.mjs` (Playwright + SwiftShader) für Durchspiel-Tests, `tools/montage.mjs` für Screenshot-Raster
- `?dev` blendet ein FPS-/Draw-Call-HUD ein, `?test` aktiviert die Test-Hooks (`__step`, `__eval`)

### Architektur (Auszug)
| Datei | Aufgabe |
|---|---|
| `00_core` | Scheduler (wait/until/tween, überspringbar, abbrechbar), RNG, Farb-Helfer, Speicher |
| `10–13` | Audio-Engine, Musik-Sequencer (adaptive Layer, Maqam-Tabellen), SFX, Partituren |
| `20–21` | Materialien (Höhen-/Sonnennebel, Fokus-Maske, Rim-Licht), Himmel, Atmosphäre, HDR-Post (Bloom, DOF, Godrays, Flare, ACES, Grading, Korn, Letterbox 2,39:1) |
| `30` | Low-Poly-Mesh-Builder (Flat Shading, Vertex-Farben, Fake-AO), Instancing |
| `40` | UI: Untertitel, Auswahl/Ungesagtes, Titelkarten, Handy, Notizbuch, Einstellungen, Touch |
| `50` | Figuren: Gelenk-Rig, Posen, Gehzyklus, Blick, Blinzeln, Sprechen |
| `60–62` | Welt-Basis, Kamera-Rig, Spielerbewegung, Interaktionen, Fokus, Kino-System, Kapitel-Manager |
| `70–75` | Welten: Zimmer, Dach/Skyline, Balkon, Stadt-Bausteine, Innenstadt, Hotel-Lobby |
| `80–85` | Story: Kapitel-Register, Prolog, Deal-System, Kapitel I |
