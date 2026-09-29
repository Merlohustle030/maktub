// =====================================================================
// PROLOG – „Maktub“. 3:47 Uhr. Regen. Ein Zimmer, ein Handy, ein Traum, der zu groß ist.
// =====================================================================
const Room = {
  seen(k) { return !!G.state.flags['room_' + k]; },
  mark(k) { G.state.flags['room_' + k] = true; },
  async progress() {
    const W = G.world, f = G.state.flags;
    const n = ['board', 'bills', 'notebook'].filter((k) => Room.seen(k)).length;
    if (n >= 1) Mus.mood('ney', 4);
    if (n >= 2 && !f.catShown) {
      f.catShown = true; await sleep(1.2);
      W.cat.root.visible = true; Snd.meow({ gain: 0.7 });
      await sleep(0.9);
      await Sub.inner('Sie kommt nur nachts. Wie ich.');
    }
    if (n >= 3 && !f.photoHint) { f.photoHint = true; await sleep(0.6); Obj.set('Das Foto.'); }
  },
};

Object.assign(Story, {
  async roomLamp() {
    const W = G.world;
    await Player.turnTo(0.95, -1.9);
    Snd.door('lock');
    await sleep(0.25);
    await W.setLamp(true, 1.8);
    G.state.flags.lampOn = true;
    Snd.door('lock');
    await sleep(0.6);
    Obj.set('Sieh dich um.');
    Hint.show('<b>E</b> Ansehen &nbsp;·&nbsp; <b>Umschalt</b> halten: Fokus', 9);
    Mus.mood('drone', 3);
  },
  async roomBoard() {
    await Player.turnTo(1.7, -1.05);
    await Story.inspect({ pos: [0.1, 1.55, -0.1], look: [1.7, 1.42, -1.05], fov: 42 }, async () => {
      await Sub.inner('Die Stadt. Der Wagen. Die Zahlen.');
      await Sub.inner('Und ganz oben, mit Rotstift: Mama.');
    });
    Room.mark('board'); await Room.progress();
  },
  async roomBills() {
    await Player.turnTo(0.4, -1.7);
    await Story.inspect({ pos: [0.0, 1.5, -0.3], look: [0.42, 0.75, -1.68], fov: 38 }, async () => {
      await Sub.inner('Zweite Mahnung. Die dritte kommt Freitag.');
      await Sub.inner('Alle wollen ihr Geld. Zu Recht.');
      await Sub.inner('Noch.');
    });
    Room.mark('bills'); await Room.progress();
  },
  async roomNotebook() {
    const W = G.world, ch = Player.ch;
    await Player.turnTo(-1.0, -0.6);
    await sleep(0.2);
    W.nbObj.visible = false; ch.hold('notebook', true); ch.setPose('notebook'); Snd.page();
    await sleep(0.8);
    await NoteCard.show(GOAL_DEFS.map((g) => g.text), { speed: 0.9 });
    await sleep(0.6);
    await Sub.inner('Fünf Zeilen. Mehr braucht man nicht.');
    await NoteCard.hide();
    ch.hold('notebook', false); ch.setPose('mirza'); Snd.page();
    Room.mark('notebook'); await Room.progress();
  },
  async roomPhoto() {
    await Player.turnTo(-0.08, -1.86);
    await Story.inspect({ pos: [0.55, 1.4, -0.75], look: [-0.08, 0.92, -1.86], fov: 24, dof: 0.75 }, async () => {
      await Sub.inner('Nena.');
      await sleep(1.0);
    }, { keep: true });
    await Story.flashback();
  },
  async roomWindow() {
    const W = G.world, f = G.state.flags;
    await Player.turnTo(0.35, -2.05);
    if (!f.catShown) {
      await Story.inspect({ pos: [0.3, 1.55, -0.4], look: [0.35, 1.45, -2.1], fov: 42 }, async () => { await Sub.inner('Regen. Seit dem Nachmittag.'); });
      return;
    }
    await Story.inspect({ pos: [0.3, 1.45, -0.5], look: [0.3, 1.0, -2.2], fov: 32, dof: 0.6 }, async () => {
      if (f.catFed) { await Sub.inner('Sie ist satt. Und trotzdem bleibt sie.'); return; }
      const i = await Choice.pick([{ text: 'Ein Stück Brot auf die Fensterbank legen.' }, { text: 'Das Fenster zulassen.' }], { numbers: false });
      if (i === 0) {
        Snd.door('creak'); await sleep(0.8);
        W.bread.visible = true; f.catFed = true; G.state.counters.cat++;
        await sleep(0.6); W.cat.eat = true; Snd.purr(3.4, { gain: 0.6 });
        await Sub.inner('Mehr hab ich nicht.');
        await Sub.inner('Für einen Namen habe ich keine Zeit.');
        W.cat.eat = false;
      } else { await Sub.inner('Später.'); }
    });
  },
  async roomDoor() {
    await Player.turnTo(-1.7, 1.35);
    await Sub.inner('Mama kommt um sechs. Bis dahin gehört die Wohnung mir.');
  },
  async roomSuit() {
    await Player.turnTo(1.7, 0.4);
    await Sub.inner('Second-Hand. Passt trotzdem, als wäre er für mich genäht.');
  },
  async roomClock() {
    await Player.turnTo(-0.95, -2.1);
    await Sub.inner('3:47. Um diese Uhrzeit lügt niemand mehr.');
  },
  async roomOud() {
    await Player.turnTo(-1.7, 0.55);
    await Sub.inner('Nenas Oud. Angefasst habe ich sie nie.');
    await Sub.inner('Nur zugehört.');
  },

  // ---------- RÜCKBLENDE: der Balkon ----------
  async flashback() {
    const keep = { x: Player.pos.x, z: Player.pos.z, yaw: Player.ch.yaw };
    Mus.play(CUES.flash, { mood: 'dream', fadeOut: 2.4, delay: 0.25 });
    await Game.fade(1, 1.5, [1, 0.93, 0.8]);
    tween(FX, { dof: 0 }, 0.01);
    await Game.loadWorld('balcony');
    const B = G.world, kid = B.kid, nena = B.nena;
    await Cine.run(async (c) => {
      FX.water = 0.5; tween(FX, { water: 0 }, 2.4, 'out');
      Cam.set({ pos: [0.02, 1.05, 2.12], look: [0.25, 0.95, -0.6], fov: 36, dof: 0.5 });
      Cam.move({ pos: [0.14, 1.0, 1.42], look: [0.3, 0.98, -0.55], fov: 31 }, 9.5, 'inOutSine');
      Game.fade(0, 1.8);
      await sleep(2.2);
      nena.walkTo(0.62, 0.12, { speed: 0.95 });
      await sleep(1.5);
      await Sub.say('Nena', 'Komm her, mein Herz.', { dur: 2.4 });
      kid.setPose(mkPose({ lean: 2, L: { arm: [6, 6, 0], fore: 12 }, R: { arm: [6, 6, 0], fore: 12 } }));
      await tween(kid.root.position, { y: 0 }, 0.22, 'in'); Snd.step('concrete', { vel: 0.35 });
      kid.walkTo(0.36, -0.16, { speed: 0.6, face: Math.PI / 2 });
      nena.walkTo(0.8, -0.16, { speed: 0.7 });
      await sleep(2.6);
      nena.faceYaw(-Math.PI / 2); kid.faceYaw(Math.PI / 2);
      nena.setPose('crouch', 3.5);
      await sleep(1.4);
      // Profil-Zweischuss aus der Wand heraus, Sonne im Rücken
      Cam.set({ pos: [0.58, 1.06, 0.9], look: [0.58, 1.03, -0.66], fov: 37, dof: 0.6 });
      Cam.move({ pos: [0.58, 1.05, 0.76], look: [0.58, 1.03, -0.66], fov: 31 }, 16, 'inOutSine');
      nena.setPose('cupFace', 3); kid.setPose(mkPose({ nod: -14, lean: -2, L: { arm: [4, 6, 0], fore: 10 }, R: { arm: [4, 6, 0], fore: 10 } }), 3);
      await sleep(1.6);
      await Sub.say('Nena', 'Manche Menschen suchen ihr Leben lang nach ihrem Weg.', { dur: 4.2 });
      await sleep(0.5);
      await Sub.say('Nena', 'Dich hat dein Weg schon gefunden.', { dur: 3.2 });
      await sleep(0.7);
      await Sub.say('Mirza', 'Und wenn ich ihn verliere?', { dur: 2.6 });
      await sleep(0.4);
      await Sub.say('Nena', 'Er verliert dich nicht.', { dur: 3 });
      Mus.mood('maktub', 2.5);
      await sleep(1.6);
      Cam.set({ pos: [0.58, 0.99, 0.48], look: [0.58, 0.99, -0.2], fov: 22, dof: 0.95 });
      tween(FX, { flash: 0.22 }, 1.2, 'inOut');
      await sleep(0.4);
      await Sub.say('Nena', 'Maktub.', { dur: 3.6 });
      await sleep(1.4);
    }, { stay: true, hint: true });
    await Game.fade(1, 1.6, [1, 0.93, 0.8]);
    FX.flash = 0; FX.dof = 0;
    await Story.afterFlashback(keep);
  },

  async afterFlashback(keep) {
    await Game.loadWorld('room', { spawn: keep });
    const W = G.world, ch = Player.ch;
    Mus.play(CUES.room, { mood: 'ney', fadeOut: 3, delay: 0.4 });
    ch.place(0.32, 0, -1.02, Math.PI); ch.setPose('mirza'); ch.snapPose();
    await Cine.run(async (c) => {
      Cam.set({ pos: [1.0, 1.5, -0.35], look: [0.25, 1.05, -1.8], fov: 34, dof: 0.5 });
      Cam.move({ pos: [0.82, 1.48, -0.5], look: [0.25, 1.05, -1.8], fov: 31 }, 12, 'inOutSine');
      Game.fade(0, 2.0);
      await sleep(3.0);
      await Sub.inner('Dann gehe ich ihn.');
      await sleep(0.6);
      ch.hold('notebook', true); ch.setPose('write'); Snd.page();
      Mus.mood('swell', 4);
      await sleep(1.4);
      await NoteCard.show(['Ich höre nicht auf.', 'Egal, was es kostet.'], { speed: 1.9 });
      await sleep(2.2);
      await NoteCard.hide();
      ch.hold('notebook', false); ch.setPose('mirza'); Snd.page();
      await sleep(0.6);
      Cam.move({ pos: [0.5, 1.4, -1.0], look: [0.3, 1.5, -2.1], fov: 30 }, 6, 'inOutSine');
      ch.lookAt(new THREE.Vector3(0.35, 1.5, -2.2), 0.9);
      await sleep(4.4);
    }, { stay: true });
    G.state.flags.prologDone = true;
  },
});

async function prologRun() {
  Story.resetState();
  Goals.set({ mama: 'long', ten: 'todo', maybach: 'todo', school: 'todo', hurt: 'todo' });
  Bal.shown = 23.17; Obj.set(''); Hint.hide();
  Mus.stop(1.6); Snd.ambClear(0.5); Snd.heartStop();
  UI.hud(true); FX.fade = 1; FX.fadeCol = [0, 0, 0]; FX.bars = 0; FX.dof = 0; FX.water = 0; FX.flash = 0;
  G.mode = 'title'; Title.black(true);
  await sleep(0.6);
  await Game.loadWorld('room');
  Title.black(false);
  const W = G.world, ch = Player.ch;
  ch.place(-0.47, 0, -0.34, Math.PI / 2); ch.setPose('sitFloor'); ch.snapPose(); ch.hold('phone', true); W.phoneOn = 0.55;
  Focus.allowed = false;
  Mus.play(CUES.room, { mood: 'silence', delay: 0.5 });

  // --- Eröffnung: schwarz, nur Regen und eine tickende Uhr ---
  await Cine.run(async (c) => {
    Cam.set({ pos: [-0.25, 3.3, 0.7], look: [-0.5, 0.12, -0.35], fov: 42 });
    Cam.move({ pos: [-0.15, 2.45, 1.2], look: [-0.5, 0.35, -0.3], fov: 40 }, 17, 'inOutSine');
    await sleep(1.8);
    Stamp.show('3:47', { x: '6vw', y: '80vh', sec: 6 });
    await Game.fade(0, 3.6);
    await sleep(1.4);
    Phone.bank(23.17);
    await sleep(1.2);
    await Sub.inner('Dreiundzwanzig Euro siebzehn.', { dur: 2.8 });
    await sleep(0.6);
    await Sub.inner('Und ein Traum, der zu groß ist für dieses Zimmer.', { dur: 4.4 });
    await sleep(1.2);
    Phone.hide();
    Mus.mood('drone', 4);
    await sleep(1.2);
    // Nahaufnahme: sein Gesicht im Licht des Handys
    Cam.set({ pos: [0.02, 0.4, 0.78], look: [-0.47, 0.8, -0.34], fov: 30, dof: 0.85 });
    Cam.move({ pos: [-0.12, 0.47, 0.6], look: [-0.47, 0.8, -0.34], fov: 24, dof: 0.85 }, 8, 'inOutSine');
    await sleep(3.2);
    Phone.toast('Kerim', 'Bruder, lebst du noch?', 6);
    Snd.phoneBuzz(undefined, 2);
    await sleep(1.2);
    Hint.show('<b>E</b> — Antworten', 5);
    const replied = await until(() => Input.pressed('use'), 5.2);
    Hint.hide();
    if (replied) { G.state.counters.kerim++; Phone.msgs('Kerim', [{ t: 'Bruder, lebst du noch?' }, { t: 'Lebe. Bin dran.', me: 1 }]); await sleep(2.6); Phone.hide(); }
    await sleep(0.8);
  }, { stay: true, hint: false });
  Phone.hide(); Hint.hide();

  // --- Sitzen bleiben, bis man aufsteht ---
  FX.dof = 0; Cam.gameplay(); G.mode = 'play'; Player.lock();
  Hint.show('<b>E</b> oder eine Richtung — Aufstehen', 60);
  await until(() => Input.pressed('use') || Input.pressed('confirm') || Math.hypot(Input.axis().x, Input.axis().y) > 0.3);
  Hint.hide();
  ch.hold('phone', false); ch.setPose('mirza', 3.6);
  Snd.whoosh(0.5, { gain: 0.25, from: 180, to: 700 });
  await sleep(1.8);
  Player.unlock(); Focus.allowed = true;
  Obj.set('Mach Licht.');
  await until(() => G.state.flags.prologDone);

  // --- Titel ---
  await Game.fade(1, 1.6, [0, 0, 0]);
  Snd.ambClear(2); Mus.stop(1.2);
  UI.hud(false);
  await sleep(1.0);
  Mus.play(CUES.title, { mood: 'on', delay: 0.2, fadeOut: 1 });
  await Title.show({ num: '', title: 'MAKTUB', line: '<span class="tar">مكتوب</span><br>Es steht geschrieben.', big: true, note: false });
  await sleep(10.5);
  await Title.hide();
  Goals.set({ ten: 'cur' });
}
Story.def('prolog', prologRun);
