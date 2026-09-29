// =====================================================================
// Partituren. Eine Melodie, viele Gesichter: dasselbe Maktub-Thema klingt je nach Maqam
//   Kurd (Trauer) · Hijaz (Ehrgeiz/Gold, erweiterte Sekunde) · Ajam (Erinnerung, Dur-Süße) · Nahawand (Wärme)
// Grad 0 = D4. Ein Takt = 16 Schritte.
// =====================================================================

// Das Maktub-Thema (4 Takte): Quintsprung, Fall, Antwort, Höhepunkt auf dem b6, Rückkehr zur Tonika.
const M_THEME = [
  [0, 0, 4, 0.55], [4, 4, 8, 0.78, { vib: 17 }], [12, 3, 2, 0.6], [14, 2, 2, 0.55],
  [16, 1, 4, 0.6], [20, 2, 4, 0.62], [24, 3, 8, 0.72, { vib: 12 }],
  [32, 4, 4, 0.68], [36, 5, 6, 0.85, { vib: 19 }], [42, 4, 2, 0.6], [44, 3, 4, 0.6],
  [48, 2, 4, 0.58], [52, 1, 4, 0.55], [56, 0, 8, 0.74, { vib: 14 }],
];
const shift = (evs, by, ...rest) => evs.map((e) => { const c = e.slice(); c[0] += by; return c; });
const rep = (evs, len, times) => { const out = []; for (let i = 0; i < times; i++) out.push(...shift(evs, i * len)); return out; };
// Arpeggio über Akkorddegrees im Achtel-Raster
const arp = (start, degs, vel = 0.5, gap = 2, len = 4) => degs.map((d, i) => [start + i * gap, d, len, vel * (i % 4 === 0 ? 1.1 : i % 2 ? 0.8 : 0.92)]);

const CUES = {};

// ---------- Hauptmenü: Ney-Solo über Oud-Drohne, Wind ----------
CUES.menu = {
  bpm: 60, maqam: 'kurd', len: 128,
  moods: {
    main: { ney: 1, drone: 0.9, pad: 0.45, kanun: 0.5 },
    low: { ney: 0.6, drone: 0.7, pad: 0.3 },
  },
  layers: {
    ney: { inst: 'ney', bus: 'clean', len: 128, ev: [...M_THEME, ...shift(M_THEME.slice(0, 7), 80).map((e) => { const c = e.slice(); c[4] = Object.assign({}, c[4], { oct: 1 }); return c; })], opts: { hall: 0.6 } },
    drone: { inst: 'bass', len: 128, ev: [[0, -7, 8, 0.6], [16, -10, 8, 0.45], [32, -7, 8, 0.55], [48, -10, 8, 0.4], [64, -7, 8, 0.55], [80, -10, 8, 0.4], [96, -7, 8, 0.5], [112, -3, 8, 0.4]], opts: { hall: 0.5, room: 0.04 } },
    pad: { inst: 'strings', len: 128, gain: 0.7, ev: [[0, [-7, -3, 0], 30, 0.5, { attack: 3, release: 3 }], [32, [-2, 0, 2], 30, 0.45, { attack: 3, release: 3 }], [64, [-7, -3, 0], 30, 0.5, { attack: 3, release: 3 }], [96, [-4, -2, 0], 30, 0.45, { attack: 3, release: 3 }]] },
    kanun: { inst: 'kanun', len: 128, oct: 1, gain: 0.7, ev: [[50, 2, 4, 0.3, { pan: -0.4 }], [54, 4, 4, 0.28, { pan: 0.3 }], [58, 3, 4, 0.25, { pan: -0.2 }], [104, 1, 4, 0.28, { pan: 0.4 }], [108, 0, 4, 0.3, { pan: 0 }]] },
  },
};

// ---------- Prolog, dunkles Zimmer: Stille als Instrument, Ney-Fragmente ----------
CUES.room = {
  bpm: 54, maqam: 'kurd', len: 192,
  moods: {
    silence: {},
    drone: { drone: 0.55 },
    ney: { drone: 0.5, ney: 1 },
    swell: { drone: 0.6, ney: 1, pad: 0.9, kanun: 0.5 },
    broken: { ney: 0.9 },
  },
  layers: {
    drone: { inst: 'bass', len: 192, ev: [[0, -7, 8, 0.4], [48, -10, 8, 0.3], [96, -7, 8, 0.38], [144, -10, 8, 0.3]], opts: { hall: 0.7, room: 0.05 } },
    ney: { inst: 'ney', bus: 'clean', len: 192, ev: [...M_THEME.slice(0, 7), ...shift(M_THEME.slice(7), 96 - 32)], opts: { hall: 0.75, vib: 12, breath: 1.15 } },
    pad: { inst: 'strings', len: 192, gain: 0.8, ev: [[0, [-7, -3, 0], 44, 0.4, { attack: 4, release: 4, bright: 0.8 }], [96, [-2, 0, 2], 44, 0.4, { attack: 4, release: 4, bright: 0.8 }]] },
    kanun: { inst: 'kanun', len: 192, oct: 1, gain: 0.5, ev: [[8, 4, 4, 0.2], [14, 2, 4, 0.18, { pan: 0.3 }], [104, 3, 4, 0.2, { pan: -0.3 }]] },
  },
};

// ---------- Rückblende Nena: Ajam (Dur-nah), Kanun-Arpeggio, warmer Chor ----------
const FL_ARP = [
  ...arp(0, [0, 2, 4, 7, 4, 2, 4, 2], 0.5), ...arp(16, [3, 5, 7, 10, 7, 5, 7, 5], 0.5),
  ...arp(32, [4, 6, 8, 11, 8, 6, 8, 6], 0.5), ...arp(48, [0, 2, 4, 7, 4, 2, 4, 2], 0.5),
];
CUES.flash = {
  bpm: 66, maqam: 'ajam', len: 128,
  moods: {
    silence: {},
    dream: { kanun: 0.8, strings: 0.5, glass: 0.6 },
    maktub: { kanun: 0.8, strings: 0.9, glass: 0.7, ney: 1, choir: 0.85 },
    fade: { kanun: 0.4, strings: 0.5, glass: 0.4 },
  },
  layers: {
    kanun: { inst: 'kanun', len: 64, oct: 0, ev: FL_ARP, opts: { hall: 0.5, room: 0.05 }, gain: 0.85 },
    strings: { inst: 'strings', len: 64, gain: 0.8, ev: [[0, [-7, -3, 0, 2], 15, 0.5, { attack: 2, release: 2.5 }], [16, [-4, -1, 1, 3], 15, 0.5, { attack: 2, release: 2.5 }], [32, [-3, -1, 1, 4], 15, 0.5, { attack: 2, release: 2.5 }], [48, [-7, -3, 0, 2], 15, 0.5, { attack: 2, release: 3 }]] },
    choir: { inst: 'choir', len: 64, gain: 0.8, ev: [[0, [-7, -3, 0], 30, 0.5, { vowel: 'oh' }], [32, [-3, 1, 4], 30, 0.5, { vowel: 'ah' }]] },
    ney: { inst: 'ney', bus: 'clean', len: 128, ev: [...M_THEME, ...shift(M_THEME.slice(0, 7), 64).map((e) => { const c = e.slice(); c[4] = Object.assign({}, c[4], { oct: 1 }); return c; })], opts: { hall: 0.7, vib: 15 }, gain: 0.9 },
    glass: { inst: 'kanun', len: 64, oct: 2, gain: 0.5, ev: [[3, 4, 4, 0.22, { pan: -0.5 }], [11, 2, 4, 0.2, { pan: 0.5 }], [22, 6, 4, 0.2, { pan: -0.3 }], [37, 4, 4, 0.22, { pan: 0.4 }], [55, 2, 4, 0.2, { pan: 0 }]], opts: { hall: 0.9 } },
  },
};

// ---------- Titelkarte "MAKTUB" (Prolog-Ende): einmalig, groß, still ----------
CUES.title = {
  bpm: 60, maqam: 'kurd', len: 72, loop: false,
  moods: { on: { ney: 1, strings: 1, oud: 1, choir: 0.8, sub: 0.7 } },
  layers: {
    ney: { inst: 'ney', bus: 'clean', len: 72, ev: [...M_THEME.slice(0, 7), [32, 3, 8, 0.7, { vib: 14 }], [40, 1, 6, 0.6, { vib: 12 }], [46, 0, 22, 0.8, { vib: 16, scoop: -20 }]], opts: { hall: 0.85 } },
    strings: { inst: 'strings', len: 72, ev: [[0, [-7, -3, 0, 4], 40, 0.55, { attack: 4, release: 4 }], [40, [-7, -3, 0, 2], 30, 0.6, { attack: 1.5, release: 5 }]] },
    oud: { inst: 'oud', len: 72, oct: -1, ev: [[0, 0, 4, 0.9, { hall: 0.8 }], [16, -3, 4, 0.55], [32, -2, 4, 0.55], [46, 0, 4, 0.7]] },
    choir: { inst: 'choir', len: 72, ev: [[24, [-7, -3, 0], 40, 0.6, { vowel: 'oh', attack: 4 }]] },
    sub: { inst: 'sub', len: 72, ev: [[0, -14, 16, 0.55], [46, -14, 26, 0.6]] },
  },
};

// ---------- Kapitel I "Innenstadt": Goldene Stunde, Maqsum, Hijaz-Ostinato ----------
const MAQSUM = [
  [0, 'dum', 0.9], [2, 'tek', 0.6], [4, 'ka', 0.25], [6, 'tek', 0.55], [8, 'dum', 0.8], [10, 'ka', 0.25], [12, 'tek', 0.6], [14, 'ka', 0.3],
  [16, 'dum', 0.9], [18, 'tek', 0.6], [20, 'ka', 0.25], [22, 'tek', 0.55], [24, 'dum', 0.8], [27, 'dum', 0.5], [28, 'tek', 0.6], [30, 'ka', 0.3], [31, 'ka', 0.2],
];
const HJ_BASS = [
  [0, -7, 3, 0.8], [3, -7, 2, 0.5], [6, -6, 2, 0.6], [8, -7, 3, 0.7], [11, -5, 2, 0.5], [12, -6, 2, 0.55], [14, -7, 2, 0.6],
  [16, -7, 3, 0.8], [19, -7, 2, 0.5], [22, -3, 2, 0.6], [24, -4, 3, 0.65], [27, -5, 2, 0.5], [28, -6, 2, 0.55], [30, -7, 2, 0.6],
];
const HJ_HOOK = [
  [0, 0, 2, 0.65], [2, 1, 2, 0.55], [4, 2, 4, 0.7], [8, 3, 2, 0.6], [10, 2, 2, 0.55], [12, 1, 2, 0.55], [14, 0, 2, 0.6],
  [16, 4, 4, 0.7], [20, 3, 2, 0.55], [22, 2, 2, 0.55], [24, 1, 4, 0.6], [28, 0, 4, 0.65],
];
const HJ_STR = [[0, [-7, -3, 0, 2], 30, 0.5, { attack: 1.4, release: 2 }], [32, [-6, -2, 1, 3], 14, 0.5, { attack: 1.2, release: 1.8 }], [48, [-7, -3, 0, 2], 14, 0.5, { attack: 1.2, release: 2.2 }]];
const HATS8 = []; for (let i = 0; i < 32; i += 2) HATS8.push([i, 'hat', i % 4 === 0 ? 0.5 : 0.32]);
const HATS_ROLL = [...HATS8, [14, 'hat', 0.3], [14.5, 'hat', 0.35], [15, 'hat', 0.4], [15.5, 'hat', 0.45], [30, 'hat', 0.3], [30.66, 'hat', 0.35], [31.33, 'hat', 0.42]];

CUES.city = {
  bpm: 84, maqam: 'hijaz', len: 64, swing: 0.06,
  moods: {
    silence: {},
    calm: { oud: 0.55, strings: 0.45, ney: 0.65, riq: 0.2 },
    walk: { perc: 0.65, riq: 0.45, oud: 0.8, kanun: 0.45, strings: 0.35 },
    lift: { perc: 0.85, riq: 0.6, oud: 0.9, kanun: 0.65, strings: 0.65, ney: 0.55, sub: 0.35 },
    triumph: { perc: 1, riq: 0.7, oud: 0.9, kanun: 0.75, strings: 0.9, ney: 0.85, sub: 0.75, hats: 0.5, clap: 0.5, choir: 0.65 },
    focus: { ney: 0.6, drone: 0.5 },
  },
  layers: {
    perc: { inst: 'perc', len: 32, ev: MAQSUM, opts: { room: 0.14 } },
    riq: { inst: 'perc', len: 16, gain: 0.7, ev: [[0, 'riq', 0.35], [4, 'riq', 0.2], [8, 'riq', 0.3], [12, 'riq', 0.2], [10, 'riq', 0.15]], pan: 0.25 },
    oud: { inst: 'oud', len: 32, ev: HJ_BASS, opts: { hall: 0.25, room: 0.06 }, pan: -0.15 },
    kanun: { inst: 'kanun', len: 32, oct: 1, gain: 0.7, ev: HJ_HOOK, opts: { hall: 0.5 }, pan: 0.25 },
    strings: { inst: 'strings', len: 64, gain: 0.85, ev: HJ_STR },
    ney: { inst: 'ney', bus: 'clean', len: 64, ev: M_THEME, opts: { hall: 0.6 } },
    sub: { inst: 'sub', len: 32, gain: 0.85, ev: [[0, -14, 6, 0.85], [10, -14, 3, 0.7], [16, -14, 6, 0.85], [26, -13, 3, 0.7], [30, -14, 2, 0.7]] },
    hats: { inst: 'perc', len: 32, gain: 0.7, ev: HATS_ROLL },
    clap: { inst: 'perc', len: 32, gain: 0.7, ev: [[8, 'clap', 0.7], [24, 'clap', 0.75]] },
    choir: { inst: 'choir', len: 64, gain: 0.8, ev: [[0, [-7, -3, 0], 30, 0.5, { vowel: 'ah' }], [32, [-6, -2, 1], 30, 0.5, { vowel: 'oh' }]] },
    drone: { inst: 'bass', len: 64, ev: [[0, -7, 8, 0.5], [32, -10, 8, 0.4]] },
  },
};

// ---------- Deal: Trap-Beat (halbe Zeit) mit Oud und Hijaz ----------
const DEAL_HATS = []; for (let i = 0; i < 32; i++) { if (i % 2 === 0) DEAL_HATS.push([i, 'hat', i % 4 === 0 ? 0.55 : 0.35]); }
DEAL_HATS.push([13, 'hat', 0.3], [13.5, 'hat', 0.34], [15, 'hat', 0.4], [15.5, 'hat', 0.45], [29, 'hat', 0.3], [29.66, 'hat', 0.36], [30.33, 'hat', 0.44], [31, 'ohat', 0.4]);
CUES.deal = {
  bpm: 140, maqam: 'hijaz', len: 64,
  moods: {
    silence: { drone: 0.6 },
    calm: { oud: 0.7, sub: 0.55, perc: 0.6, drone: 0.5 },
    tense: { oud: 0.85, sub: 0.8, perc: 0.85, hats: 0.55, strings: 0.55, clap: 0.6, drone: 0.4 },
    push: { oud: 0.9, sub: 0.9, perc: 1, hats: 0.8, strings: 0.7, clap: 0.8, kanun: 0.5, drone: 0.3 },
    win: { oud: 0.9, sub: 0.95, perc: 1, hats: 0.7, strings: 1, clap: 0.8, kanun: 0.7, ney: 0.8, choir: 0.7 },
  },
  layers: {
    sub: { inst: 'sub', len: 32, ev: [[0, -14, 6, 0.85], [7, -14, 2, 0.6], [10, -13, 4, 0.75], [16, -14, 6, 0.85], [23, -14, 2, 0.6], [26, -14, 5, 0.75, { to: -13 }]] },
    perc: { inst: 'perc', len: 32, ev: [[0, 'kick', 0.9], [10, 'kick', 0.7], [16, 'kick', 0.9], [26, 'kick', 0.7], [4, 'tek', 0.4], [12, 'ka', 0.3], [20, 'tek', 0.4], [28, 'ka', 0.3], [23, 'dum', 0.5]] },
    clap: { inst: 'perc', len: 32, ev: [[8, 'clap', 0.7], [24, 'clap', 0.75]] },
    hats: { inst: 'perc', len: 32, gain: 0.65, ev: DEAL_HATS },
    oud: { inst: 'oud', len: 32, ev: [[0, 0, 3, 0.7], [3, 1, 3, 0.55], [6, 2, 4, 0.7], [11, 3, 2, 0.6], [13, 2, 3, 0.55], [16, 1, 3, 0.6], [19, 0, 3, 0.65], [22, -3, 4, 0.6], [27, 0, 2, 0.6], [29, 1, 3, 0.55]], opts: { hall: 0.3 }, pan: -0.1 },
    kanun: { inst: 'kanun', len: 32, oct: 1, ev: [[2, 4, 4, 0.35, { pan: 0.4 }], [9, 3, 3, 0.3, { pan: -0.3 }], [18, 4, 4, 0.35, { pan: 0.3 }], [25, 2, 4, 0.3, { pan: -0.4 }]], opts: { hall: 0.6 } },
    strings: { inst: 'strings', len: 64, gain: 0.7, ev: [[0, [-7, -6, -3], 30, 0.5, { attack: 1.5, release: 1.5, bright: 0.7 }], [32, [-7, -3, 0, 2], 30, 0.5, { attack: 1.5, release: 1.5 }]] },
    ney: { inst: 'ney', bus: 'clean', len: 64, ev: M_THEME, opts: { hall: 0.6 } },
    choir: { inst: 'choir', len: 64, gain: 0.7, ev: [[0, [-7, -3, 0], 30, 0.5, { vowel: 'ah' }], [32, [-6, -2, 1], 30, 0.5, { vowel: 'oh' }]] },
    drone: { inst: 'bass', len: 64, ev: [[0, -7, 8, 0.5], [32, -7, 8, 0.45]] },
  },
};
CUES.montage = Object.assign({}, CUES.deal, {
  bpm: 124,
  moods: {
    silence: {},
    build: { oud: 0.7, sub: 0.6, perc: 0.85, hats: 0.5, strings: 0.6, kanun: 0.5 },
    peak: { oud: 0.9, sub: 1, perc: 1, hats: 0.8, strings: 1, clap: 0.8, kanun: 0.8, ney: 0.9, choir: 0.8 },
  },
});

// ---------- Nours Thema: Nahawand, zart – Kanun vorne, Glas darüber, das Ney antwortet ----------
const N_THEME = [
  [0, 4, 4, 0.55], [4, 5, 2, 0.5], [6, 4, 2, 0.48], [8, 3, 8, 0.6, { vib: 12 }],
  [16, 2, 4, 0.5], [20, 3, 2, 0.48], [22, 2, 2, 0.46], [24, 1, 8, 0.56],
  [32, 4, 4, 0.56], [36, 5, 2, 0.5], [38, 6, 2, 0.56], [40, 7, 8, 0.7, { vib: 15 }],
  [48, 6, 4, 0.5], [52, 4, 4, 0.48], [56, 3, 4, 0.5], [60, 0, 4, 0.52],
];
CUES.nour = {
  bpm: 72, maqam: 'nahawand', len: 64,
  moods: { silence: {}, on: { kanun: 0.95, glass: 0.6, strings: 0.55, ney: 0.5 }, full: { kanun: 1, glass: 0.7, strings: 0.8, ney: 0.9, choir: 0.5 } },
  layers: {
    kanun: { inst: 'kanun', len: 64, oct: 0, ev: N_THEME, opts: { hall: 0.55, room: 0.05 }, gain: 0.95 },
    glass: { inst: 'kanun', len: 64, oct: 2, gain: 0.5, ev: [[3, 4, 4, 0.2, { pan: -0.5 }], [10, 2, 4, 0.18, { pan: 0.5 }], [19, 6, 4, 0.2, { pan: -0.3 }], [35, 4, 4, 0.2, { pan: 0.4 }], [50, 7, 4, 0.18, { pan: 0 }]], opts: { hall: 0.9 } },
    strings: { inst: 'strings', len: 64, gain: 0.7, ev: [[0, [-7, -3, 0, 2], 15, 0.42, { attack: 2, release: 2.5 }], [16, [-6, -3, -1, 1], 15, 0.42, { attack: 2, release: 2.5 }], [32, [-7, -3, 0, 2], 15, 0.44, { attack: 2, release: 2.5 }], [48, [-4, -1, 1, 3], 15, 0.44, { attack: 2, release: 3 }]] },
    ney: { inst: 'ney', bus: 'clean', len: 64, oct: 1, ev: [[40, 7, 10, 0.55, { vib: 15 }], [56, 4, 8, 0.5, { vib: 12 }]], opts: { hall: 0.7 } },
    choir: { inst: 'choir', len: 64, gain: 0.6, ev: [[0, [-7, -3, 0], 30, 0.4, { vowel: 'oh' }], [32, [-7, -3, 2], 30, 0.4, { vowel: 'ah' }]] },
  },
};
