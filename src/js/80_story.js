// =====================================================================
// Kapitel-Register + Erzähl-Helfer. Die Kapitel selbst stehen in 81_prolog.js, 82_kapitel1.js …
// =====================================================================
const CHAPTER_DEFS = [
  { id: 'prolog', num: '', title: 'Maktub', line: 'Es steht geschrieben.' },
  { id: 'k1', num: 'I', title: 'Innenstadt', line: 'Die Stadt wartet auf niemanden.' },
  { id: 'k2', num: 'II', title: 'Gold', line: 'Zum ersten Mal gibt er etwas aus.' },
  { id: 'k3', num: 'III', title: 'Das Versprechen', line: 'Es gibt einen Menschen, für den er pünktlich ist.' },
  { id: 'k4', num: 'IV', title: 'Blicke', line: 'Manchmal ist Seite siebenundvierzig ein Anfang.' },
  { id: 'k5', num: 'V', title: 'Nour', line: 'Sie sagt nie etwas. Sie sieht alles.' },
  { id: 'k6', num: 'VI', title: 'Alles auf eine Karte', line: 'Wer alles setzt, kann alles verlieren.' },
  { id: 'k7', num: 'VII', title: 'Die dunkelste Stunde', line: '3:47.' },
  { id: 'fin', num: '', title: 'Es steht geschrieben', line: 'Und dann steht er auf.' },
];
for (const d of CHAPTER_DEFS) Story.chapters.push(Object.assign({ ready: false, run: null }, d));
Story.chapter = (id) => Story.chapters.find((c) => c.id === id);
Story.def = (id, run) => { const c = Story.chapter(id); c.run = run; c.ready = true; };

// Frischer Spielstand für einen Kapitelstart
Story.resetState = (partial = {}) => {
  G.state = Object.assign({ money: 23.17, flags: {}, counters: { nourLooks: 0, kerim: 0, cat: 0 }, clock: '03:47', goals: null }, partial);
};

// Kamera fährt an ein Objekt heran, ein Text läuft, dann zurück ins freie Spiel (ohne Letterbox)
Story.inspect = async (spec, fn, o = {}) => {
  Cam.move(Object.assign({ dof: 0.45 }, spec), 1.4, 'inOutSine');
  await sleep(0.9);
  await fn();
  if (o.keep) return;
  tween(FX, { dof: 0 }, 0.7, 'inOut');
  Cam.gameplay();
};
Story.setClock = (t) => { G.state.clock = t; };
// Kapitel-Titelkarte + Musik-Stille davor
Story.chapterCard = async (id, o = {}) => {
  const c = Story.chapter(id);
  await Title.show({ num: c.num, title: c.title, line: c.line, note: o.note !== false });
  await sleep(o.hold != null ? o.hold : 4.2);
};
