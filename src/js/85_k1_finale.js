// =====================================================================
// KAPITEL I – „Innenstadt“ (3/3): Kerim & Mama, die Montage, das Ende – und der Hauptablauf
// =====================================================================
const BEAT = 60 / 124;
const MTG = {
  num(html, x, y, hold = 0.9) {
    if (G.skipping) return;
    const e = h('div', 'mnum', html); e.style.left = x; e.style.top = `calc(var(--bar) + ${y})`; $('#hud').appendChild(e);
    void e.offsetWidth; e.classList.add('on');
    setTimeout(() => { e.classList.remove('on'); setTimeout(() => e.remove(), 500); }, hold * 1000);
  },
  // n Schläge warten und danach auf das Musikraster einrasten (Schnitt auf den Beat)
  async beats(n) {
    await sleep(Math.max(0.05, n * BEAT - 0.07));
    const w = Mus.nextBeatIn(); if (typeof w === 'number' && w < BEAT) await sleep(w);
  },
};

Object.assign(Story, {
  async kerimText() {
    for (let i = 0; i < 2 && (Interact.busy || G.mode !== 'play' || Player.locked); i++) await sleep(8);
    if (Interact.busy || G.mode !== 'play' || Player.locked) return;
    Phone.toast('Kerim', 'Bruder, wo steckst du? Muss dir was zeigen.', 6);
    Snd.phoneBuzz(undefined, 2);
    await sleep(1.2);
    Hint.show('<b>E</b> — Antworten', 5); Interact.busy = true;
    const replied = await until(() => Input.pressed('use'), 5.2);
    Hint.hide();
    if (replied) { G.state.counters.kerim++; Phone.msgs('Kerim', [{ t: 'Bruder, wo steckst du? Muss dir was zeigen.' }, { t: 'Bin unterwegs. Erzähl ich dir später.', me: 1 }]); await sleep(2.8); Phone.hide(); }
    Interact.busy = false;
  },
  // Mamas Anruf: Der Spieler WILL annehmen – Mirzas Daumen drückt trotzdem weg.
  async mamaCall() {
    await untilKeep(() => !Interact.busy && G.mode === 'play' && !Player.locked);
    const me = Player.ch;
    Player.lock(); me.hold('phone', true); me.setPose('phone', 3.5); Focus.allowed = false;
    await Phone.incoming({ name: 'Mama ❤️', initial: 'M', status: 'Anruf', decline: 'Nicht jetzt, Mama. Später.', wait: 9 });
    me.hold('phone', false); me.setPose('mirza', 3.5); Player.unlock(); Focus.allowed = true;
    G.state.counters.mamaMissed = (G.state.counters.mamaMissed || 0) + 1;
  },
});

// ---------- Die Montage: 30.000 in einer Nacht – Schnitt auf den Schlag ----------
async function k1Montage() {
  const W = G.world, me = Player.ch, wt = W.waiter;
  W.waiterT = 999; W.adaptive = false; Player.lock(); Phone.hide();
  Mus.play(CUES.montage, { mood: 'build', fadeOut: 2, delay: 0.2 });
  Snd.ambSet('crowd', 0.16, 2);
  await Cine.run(async () => {
    Atmo.to(CITY_DUSK, 13, 'inOutSine');
    const place = (ch, x, z, yaw, pose = 'mirza') => { ch.moveT = null; ch.moveRes = null; ch.moveRej = null; ch.place(x, 0, z, yaw); ch.setPose(pose); ch.snapPose(); };
    Story.clock(19, 8); Stamp.show('19:08', { x: '6vw', y: '78vh', sec: 2.4 });
    // A – Schuhe auf Pflaster
    place(me, -6, 21, Math.PI); me.walkTo(-6, 12.4, { speed: 1.75 });
    Cam.set({ pos: [-6.25, 0.22, 12.7], look: [-6, 0.5, 16], fov: 52 }); Cam.move({ pos: [-6.25, 0.2, 12.1], look: [-6, 0.6, 15], fov: 48 }, 2, 'inOutSine');
    await MTG.beats(4);
    // B – das Handy
    me.hold('phone', true); place(me, -3, 9, 0, 'phone');
    Cam.set({ pos: [-3.32, 1.42, 10.0], look: [-3.05, 1.2, 9.1], fov: 30, dof: 0.7 });
    MTG.num('10.000', '58vw', '46vh', 0.9);
    Mus.mood('build', 0.5);
    await MTG.beats(2);
    // C – der Handschlag gegen die Sonne
    me.hold('phone', false); FX.dof = 0;
    place(me, -8.78, -2.61, -2.63, 'handshake'); place(wt, -9.22, -3.39, 0.514, 'handshake');
    Cam.set({ pos: [-5.5, 1.15, -5.0], look: [-9, 1.3, -3], fov: 34 });
    MTG.num('20.000', '58vw', '20vh', 0.9);
    await MTG.beats(2);
    // D – die Bahn zieht vorbei
    place(wt, -10, -8, 0, 'stand'); place(me, 10.3, 8.5, Math.PI / 2);
    W.tramState = 'run'; W.tramZ = -8; W.tram.visible = true; W.tramBell = true;
    Cam.set({ pos: [8.4, 1.15, 7.2], look: [15.5, 1.4, 9.2], fov: 40 });
    Story.clock(19, 31); Stamp.show('19:31', { x: '6vw', y: '78vh', sec: 2.4 });
    await MTG.beats(2);
    // E – Kran über den Platz, Mirza als Punkt im Strom
    Mus.mood('peak', 0.4);
    place(me, -14, 6, Math.PI / 2); me.walkTo(-2, 5.4, { speed: 1.6 });
    Cam.set({ pos: [-24, 3.2, 19], look: [-13, 1.2, 6], fov: 40 }); Cam.move({ pos: [-24, 12, 23], look: [-6, 0, 3], fov: 46 }, 2, 'inOutSine');
    await MTG.beats(4);
    // F – die Drehtür
    place(me, 26.6, 6.2, -1.9); me.walkTo(31.2, 4.0, { speed: 1.9 });
    Cam.set({ pos: [23.2, 1.35, 8.6], look: [30.4, 1.7, 4.6], fov: 36 });
    await MTG.beats(2);
    // G – Lichterketten am Café
    Story.clock(19, 47); Stamp.show('19:47', { x: '6vw', y: '78vh', sec: 2.4 });
    place(me, -25, -21.6, Math.PI / 2); me.walkTo(-11, -21.6, { speed: 1.8 });
    Cam.set({ pos: [-18.5, 1.15, -19.2], look: [-18.5, 1.6, -22.5], fov: 38, dof: 0.6 });
    MTG.num('30.000', '10vw', '16vh', 1.1);
    await MTG.beats(2);
    // H – das Hotel glüht
    FX.dof = 0;
    Cam.set({ pos: [10, 0.9, 13], look: [32, 6.5, 4], fov: 48 });
    await MTG.beats(2);
    // Schnellschnitte (ein Schlag)
    place(me, -20, 14, -Math.PI / 2); me.walkTo(-28, 14, { speed: 1.8 });
    Cam.set({ pos: [-16, 1.4, 12.4], look: [-24, 1.4, 14], fov: 38 }); await MTG.beats(1);
    Cam.set({ pos: [-30.5, 0.4, 16.5], look: [-27, 0.5, 14], fov: 50 }); await MTG.beats(1);
    Cam.set({ pos: [-31, 0.9, 20], look: [-34, 5.6, 14], fov: 60 }); FX.flash = 0.35; tween(FX, { flash: 0 }, 0.4, 'out'); await MTG.beats(1);
    Cam.set({ pos: [-12, 0.6, 24], look: [-4, 3.6, 30], fov: 55 }); await MTG.beats(1);
    // Ruhe vor dem Einschlag
    me.hold('phone', false); place(me, -27.4, 24.2, Math.PI / 2, 'mirza');
    FX.flash = 0.5; tween(FX, { flash: 0 }, 0.6, 'out');
  }, { stay: true, keepBars: true, hint: false });
  Atmo.set(CITY_DUSK);
}

// ---------- Ende: Sechzigtausend – und Mamas Börek ----------
async function k1Ending() {
  const W = G.world, me = Player.ch, F = G.state.flags;
  await Cine.run(async () => {
    Story.clock(20, 12);
    Cam.set({ pos: [-25.2, 1.5, 24.6], look: [-27.4, 1.5, 24.2], fov: 34, dof: 0.3 });
    await Deal.payday(30000, { size: 3, mood: 'triumph', lines: ['Sechzigtausend. Heute Nacht waren es dreiundzwanzig Euro.'] });
    Mus.play(CUES.city, { mood: 'calm', fadeOut: 3, delay: 0.5 });
    Cam.set({ pos: [-23.8, 1.9, 20.6], look: [-27.4, 1.35, 24.4], fov: 32, dof: 0.4 });
    Cam.move({ pos: [-22.6, 2.2, 21.2], look: [-27.4, 1.35, 24.4], fov: 30 }, 16, 'inOutSine');
    await sleep(2.2);
    if (G.state.counters.kerim > 0) { Phone.toast('Kerim', 'Bruder. Alle reden von dir. Ich bin stolz.', 5); await sleep(3.6); }
    else { Phone.toast('Kerim', 'Bruder, lebst du noch? Melde dich.', 5); await sleep(3.6); }
    me.hold('phone', true); me.setPose('phone', 3.5);
    Phone.msgs('Mama ❤️', [{ t: 'Mirza, ich hab Börek gemacht.' }, { t: 'Er steht im Ofen. Komm, wenn du kannst. ❤️' }]);
    Snd.notify();
    await sleep(4.2);
    await Sub.inner('Börek.', { dur: 2 });
    await sleep(0.6);
    await Sub.inner('Ich hatte seit zwei Tagen nichts Richtiges gegessen.', { dur: 3.6 });
    await Sub.inner('Ich schreibe ihr gleich. Ich muss nur noch …', { dur: 3.4 });
    Phone.hide(); me.hold('phone', false); me.setPose('mirza', 4);
    await sleep(1.0);
    await Sub.inner('Morgen.', { dur: 2.2 });
    await sleep(0.8);
    // Kran: die Stadt bei Nacht, die Bahn, das Hotel
    Cam.set({ pos: [-24.6, 3.0, 22.2], look: [-27.4, 1.8, 24.4], fov: 34 });
    Cam.move({ pos: [-14, 15, 30], look: [8, 3, -4], fov: 46 }, 12, 'inOutSine');
    Mus.mood('lift', 4);
    await sleep(7.5);
    Game.fade(1, 3.6, [0, 0, 0]);
    await sleep(3.0);
    Obj.set('');
    await Ov.show('Die Stadt wartet auf niemanden.<small>Mama schon.</small>', { dur: 5.4 });
  }, { stay: true, keepBars: true, hint: false });
  Mus.stop(3); Snd.ambClear(3);
  F.k1Done = true;
}

// ---------- Kapitel I: der Hauptablauf ----------
async function k1Run() {
  Story.resetState({ clock: '17:24' });
  Goals.set({ mama: 'long', ten: 'cur', maybach: 'todo', school: 'todo', hurt: 'todo' });
  Bal.shown = 23.17; Bal.render(23.17); Obj.set(''); Hint.hide();
  Mus.stop(1.6); Snd.ambClear(0.5); Snd.heartStop();
  UI.hud(false); FX.fade = 1; FX.fadeCol = [0, 0, 0]; FX.bars = 0; FX.dof = 0; FX.water = 0; FX.flash = 0; G.slow = 1;
  G.mode = 'title'; Title.black(true);
  await sleep(0.5);
  await Game.loadWorld('city');
  const W = G.world, me = Player.ch, F = G.state.flags;
  Player.lock(); Focus.allowed = false;
  me.place(-62, 0, 27.4, Math.PI / 2); me.setPose('mirza'); me.snapPose(); me.hold('phone', false);
  Title.black(false);
  Mus.play(CUES.city, { mood: 'silence', delay: 0.4 });
  await Story.chapterCard('k1', { hold: 4.4 });
  await Title.hide();
  UI.hud(true);

  // --- Einstieg: Mirza überquert die Brücke, Gegenlicht, lange Schatten ---
  await Cine.run(async () => {
    Cam.set({ pos: [-31.6, 1.45, 21.2], look: [-66, 2.1, 27.6], fov: 34 });
    Cam.move({ pos: [-33.2, 1.4, 22.4], look: [-58, 1.9, 27.3], fov: 30 }, 15, 'inOutSine');
    Game.fade(0, 3.4);
    Mus.mood('calm', 4);
    me.walkTo(-37, 27.2, { speed: 1.6 });
    await sleep(3.6);
    await Sub.inner('Auf dieser Seite der Brücke ist alles teurer. Sogar der Schatten.', { dur: 4.6 });
    await sleep(1.2);
    await Sub.inner('Ich habe dreiundzwanzig Euro und einen Termin.', { dur: 3.6 });
    await sleep(1.8);
    Cam.set({ pos: [-31.6, 0.5, 24.4], look: [-34.6, 0.95, 27.2], fov: 34 });
    await sleep(0.4);
    await Sub.inner('Das reicht. Muss reichen.', { dur: 2.8 });
    const arrive = me.walkTo(-25.5, 27.0, { speed: 1.5 });
    Cam.set({ pos: [-31.5, 1.3, 30.0], look: [-27, 1.35, 27.0], fov: 38 }); Cam.move({ pos: [-32.4, 1.5, 28.6], look: [-25.4, 1.4, 27.0], fov: 40 }, 8, 'inOutSine');
    await arrive;
    await sleep(0.4);
  }, { stay: false });
  W.adaptive = true; W._want = 'calm';

  // --- Erkunden: Café Aurora, 17:40 ---
  F.dealCafe = 'open'; Focus.allowed = true;
  Obj.set('Sei um 17:40 im Café Aurora.');
  Hint.show('<b>WASD</b> Gehen &nbsp;·&nbsp; <b>Maus</b> Blick &nbsp;·&nbsp; <b>E</b> Interagieren &nbsp;·&nbsp; <b>Umschalt</b> halten: Fokus', 12);
  const t0 = G.t;
  const bg = (fn) => fn().catch((e) => { if (e !== ABORT) console.error(e); });
  bg(async () => { while (F.dealCafe === 'open') { const m = Math.min(38, 24 + Math.floor((G.t - t0) / 24)); if (m !== W.clockM) Story.clock(17, m); await sleep(1); } });
  bg(async () => { await sleep(28); if (F.dealCafe === 'open') await Story.kerimText(); });
  bg(async () => { await sleep(75); if (F.dealCafe === 'open') { Obj.show(8); Hint.show('Café Aurora – im Norden, hinter dem Brunnen.', 8); } });
  await untilKeep(() => F.dealCafe === 'done');

  // --- Nach dem ersten Deal: der Abend fällt, Mama ruft an, das Belvedere wartet ---
  Story.clock(18, 22);
  W.adaptive = true; W._want = null;
  Mus.play(CUES.city, { mood: 'calm', fadeOut: 4, delay: 0.4 });
  Atmo.to(CITY_LATE, 26, 'inOutSine');
  F.dealHotel = 'open';
  Obj.set('Hotel Belvedere. Lobby. 18:30.');
  bg(() => Story.mamaCall());
  await untilKeep(() => F.dealHotel === 'done');
  Player.lock(); W.adaptive = false;

  // --- Montage & Ende ---
  await Game.fade(1, 1.4, [0, 0, 0]);
  Obj.set(''); Hint.hide(); Snd.ambClear(1);
  await Game.loadWorld('city', { atmo: CITY_LATE });
  Story.clock(19, 8);
  Player.lock(); Game.fade(0, 0.5);
  await k1Montage();
  await k1Ending();
  await Game.fade(1, 0.6, [0, 0, 0]);
}
Story.def('k1', k1Run);
