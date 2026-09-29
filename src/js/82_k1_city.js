// =====================================================================
// KAPITEL I – „Innenstadt“ (1/3): Platz, Interaktionen, Herr Brandt im Café Aurora
// =====================================================================
Story.clock = (h, m) => {
  G.state.clock = `${h}:${String(m).padStart(2, '0')}`;
  if (G.world && G.world.setClockFace) G.world.setClockFace(h, m);
};
const _tv = new THREE.Vector3();
const headAt = (ch, dx = 0.12, dy = 0.28) => () => { ch.j.head.getWorldPosition(_tv); const v = _tv.clone(); v.x += dx; v.y += dy; return v; };

Object.assign(Story, {
  async cityClock() {
    const W = G.world, m = W.clockM;
    await Player.turnTo(-9.4, -22);
    await Story.inspect({ pos: [-8.2, 1.9, -19.0], look: [-9.4, 3.9, -22], fov: 36 }, async () => {
      await Sub.inner(`${W.clockH}:${String(m).padStart(2, '0')}.`, { dur: 1.6 });
      if (m < 38) await Sub.inner(`Noch ${40 - m} Minuten bis zum Café Aurora.`);
      else await Sub.inner('Zwei Minuten. Jetzt.');
      await Sub.inner('Pünktlich sein ist das Einzige, was ich mir leisten kann.');
    });
  },
  async cityNews() {
    await Player.turnTo(-26.3, 8);
    await Story.inspect({ pos: [-23.2, 1.55, 9.9], look: [-26.3, 1.2, 8.1], fov: 40 }, async () => {
      await Sub.sys('Mieten steigen zum vierten Mal in Folge');
      await Sub.inner('Ich muss den Artikel nicht lesen. Ich kenne das Ende.');
    });
  },
  async cityFountain() {
    await Player.turnTo(-4, -6);
    await Story.inspect({ pos: [-1.6, 1.35, -0.9], look: [-4, 1.2, -6], fov: 42 }, async () => {
      await Sub.inner('Jeder wirft etwas hinein und wünscht sich etwas.');
      await Sub.inner('Ich habe kein Kleingeld für Wünsche.');
      await Sub.inner('Nur für Pläne.');
    });
  },
  async cityCar() {
    G.state.flags.carSeen = true;
    await Player.turnTo(23.4, -4.2);
    await Story.inspect({ pos: [20.9, 1.15, -10.2], look: [23.4, 0.95, -4.2], fov: 38 }, async () => {
      await Sub.inner('Ein Maybach. Schwarz. Kein Staubkorn.');
      await Sub.inner('Nicht wegen des Wagens.');
      await Sub.inner('Sondern weil keiner fragt, wo einer herkommt, der darin aussteigt.');
    });
  },
  async cityBridge() {
    await Player.turnTo(-40, 27);
    await Story.inspect({ pos: [-28.5, 1.5, 22.6], look: [-70, 1.4, 27.6], fov: 34 }, async () => {
      await Sub.inner('Auf der anderen Seite: Plattenbau, Mama, Linie fünf.');
      await Sub.inner('Zweiunddreißig Minuten zu Fuß. Und ein ganzes Leben.');
    });
  },
  // Am Fluss sitzen: die stille Stelle des Kapitels
  async cityBench() {
    const W = G.world, me = Player.ch, F = G.state.flags;
    const first = !F.benchDone; F.benchDone = true;
    await Cine.run(async () => {
      Cam.set({ pos: [-27.6, 1.5, 15.0], look: [-31, 1.0, 12], fov: 38 });
      await me.walkTo(-29.9, 12.0, { speed: 1.0, face: -Math.PI / 2 });
      me.setPose(ME_SIT.idle, 3.5); await tween(me.root.position, { x: -30.28 }, 1.1, 'inOutSine');
      Cam.set({ pos: [-28.4, 1.32, 12.9], look: [-37.7, 2.7, 16.9], fov: 34, dof: 0.5 });
      Cam.move({ pos: [-28.9, 1.3, 12.7], look: [-37.7, 2.7, 16.9], fov: 30 }, 22, 'inOutSine');
      if (Mus.mood) Mus.mood('calm', 3);
      await sleep(2.6);
      if (first) {
        await Sub.inner('Nena hat gesagt, Wasser findet immer einen Weg.');
        await sleep(1.0);
        await Sub.inner('Ich glaube, sie meinte etwas anderes.');
        await sleep(1.4);
        await Sub.inner('Aber ich nehme den Weg, den ich habe.');
      } else { await Sub.inner('Noch eine Minute. Nur eine.'); }
      await sleep(2.6);
      FX.dof = 0; me.setPose(POSES.mirza, 3.5);
      await tween(me.root.position, { x: -29.7 }, 0.9, 'inOutSine');
    }, { stay: false });
  },
});

// ---------------------------------------------------------------------
// Deal 1: Herr Brandt, Café-Terrasse – zehntausend Euro
// ---------------------------------------------------------------------
const BRANDT_ROUNDS = [
  {
    tell: 'watch', hint: 'Er sieht zum dritten Mal auf die Uhr. Keine Zeit – oder er tut nur so.',
    say: ['Ich gebe Ihnen zehn Minuten.', 'Um sechs sitze ich schon wieder woanders.'],
    best: 'push', after: 'idle',
    opts: [
      { key: 'push', text: 'Der Käufer wartet nicht auf uns. Heute Abend ist das Angebot vom Tisch.' },
      { key: 'calm', text: 'Nehmen Sie sich die Zeit, die Sie brauchen. Ich richte mich nach Ihnen.' },
      { key: 'stand', text: 'Dann sparen wir uns beide die zehn Minuten.' },
      { key: 'silence' },
    ],
    good: ['Heute Abend?', 'Und der Preis?'],
    bad: { calm: ['Sie sind zu höflich, junger Mann. Höflichkeit hat mir noch nie etwas gekauft.'], stand: ['Setzen Sie sich. So läuft das nicht.'], silence: ['Sie sagen nichts? Meine zehn Minuten laufen.'], default: ['Meine zehn Minuten laufen.'] },
    inner: { good: 'Er hat aufgehört, auf die Uhr zu sehen.', bad: { calm: 'Falsch. Er will keine Zeit geschenkt. Er will einen Grund.', stand: 'Zu früh gegangen. Er hat es nicht mal versucht.', silence: 'Schweigen ist ein Werkzeug. Nicht jedes Mal das richtige.', default: 'Falsch. Zeit ist sein Druckpunkt.' } },
    soft: 'Na gut. Weiter.',
  },
  {
    tell: 'arms', hint: 'Verschränkte Arme. Er verteidigt etwas – keinen Preis, einen Namen.',
    say: ['Die Passage war das Lebenswerk meines Vaters.', 'Und Sie sind – was? Zwanzig?'],
    best: 'calm', after: 'relax',
    opts: [
      { key: 'push', text: 'Zahlen haben kein Alter, Herr Brandt. Meine stimmen.' },
      { key: 'calm', text: 'Ich will Ihnen nichts wegnehmen. Ich will, dass es in guten Händen bleibt.' },
      { key: 'stand', text: 'Verstanden. Dann habe ich Ihre Zeit verschwendet.' },
      { key: 'silence' },
    ],
    good: ['In guten Händen …', 'Mein Vater hat auf diesem Platz Zeitungen verkauft, bevor er die Passage kaufen konnte.'],
    bad: { push: ['Zahlen. Ihr habt alle nur noch Zahlen.'], stand: ['Ich habe nicht gesagt, dass Sie gehen sollen.'], silence: ['Sagen Sie doch etwas!'], default: ['Sie verstehen das nicht.'] },
    inner: { good: 'Seine Arme sind unten. Er redet nicht mehr mit dem Käufer. Er redet mit seinem Vater.', bad: { push: 'Falsch. Er verteidigt keinen Preis. Er verteidigt einen Namen.', default: 'Falsch. Er braucht kein Argument. Er braucht Ruhe.' } },
    soft: 'Reden wir weiter.',
  },
  {
    tell: 'tap', hint: 'Er trommelt mit den Fingern. Er will es – und hat Angst, es zu wollen.',
    say: ['Und wenn Ihr Käufer in einem Jahr weiterverkauft?', 'Wenn er die Passage abreißt?'],
    best: 'silence', after: 'relax',
    opts: [
      { key: 'push', text: 'Dann hat er ein gutes Geschäft gemacht. Das ist der Sinn davon.' },
      { key: 'calm', text: 'Ich verstehe Ihre Sorge. Ich würde genauso fragen.' },
      { key: 'stand', text: 'Wenn Sie mir nicht vertrauen, ist das hier sinnlos.' },
      { key: 'silence' },
    ],
    good: ['… Ach.', 'Mein Vater hat immer gesagt: Wer zu lange rechnet, hat schon verloren.'],
    bad: { push: ['Genau das befürchte ich.'], calm: ['Verstehen, verstehen. Ich brauche keinen Psychologen. Ich brauche eine Antwort.'], stand: ['Jetzt drohen Sie mir auch noch?'], default: ['Das beantwortet meine Frage nicht.'] },
    inner: { good: 'Seine Finger stehen still. Er hat sich selbst überzeugt. Ich musste ihm nur nicht im Weg stehen.', bad: { default: 'Falsch. Manchmal ist Schweigen die stärkste Antwort.' } },
    soft: 'Fahren Sie fort.',
  },
];

Story.cityBrandt = async () => {
  const W = G.world, me = Player.ch, B = W.brandt, F = G.state.flags;
  F.dealCafe = 'run'; Obj.set(''); Hint.hide(); Prompt.set(null);
  const D = {
    name: 'Brandt', partner: B, me, cue: CUES.deal, start: 'silence', mood: ['calm', 'tense', 'push'], tellPos: headAt(B),
    shots: {
      wide: { pos: [-16.1, 1.7, -24.6], look: [-19.2, 1.05, -28.1], fov: 40 },
      them: { pos: [-18.3, 1.36, -25.5], look: [-19.06, 1.27, -28.75], fov: 28 },
      me: { pos: [-19.95, 1.4, -30.8], look: [-19.0, 1.24, -27.3], fov: 26 },
      sun: { pos: [-15.1, 1.2, -30.2], look: [-19.6, 1.45, -27.8], fov: 36 },
      hands: { pos: [-18.15, 1.32, -27.6], look: [-19.0, 0.8, -28.05], fov: 30 },
    },
  };
  Deal.begin(D);
  let unlock = null;
  // ---- Ankunft ----
  await Cine.run(async () => {
    Cam.set({ pos: [-16.1, 1.7, -24.2], look: [-19.4, 1.1, -27.4], fov: 40 });
    Cam.move({ pos: [-16.6, 1.6, -25.0], look: [-19.2, 1.1, -28], fov: 36 }, 9);
    Tells.set(B, 'sip', 6); B.lookAt(null);
    await me.walkTo(-19, -26.5, { speed: 1.05, face: Math.PI });
    unlock = Deal.eyeLock(me, B);
    me.setPose(ME_SIT.idle, 3.5); await tween(me.root.position, { z: -27.28 }, 1.3, 'inOutSine'); Snd.door('creak');
    Tells.set(B, 'idle', 4);
    W.folder.visible = true;
    Cam.set(D.shots.me); Mus.mood('calm', 3);
    await sleep(0.6);
    await Sub.say('Brandt', 'Sie sind pünktlich.', { dur: 2.2 });
    Cam.set(D.shots.them);
    await Sub.say('Mirza', 'Ich bin lieber zu früh.', { dur: 2.2 });
    Cam.set(D.shots.me);
    await Sub.say('Brandt', 'Das ist selten geworden. Kaffee?', { dur: 2.6 });
    Cam.set(D.shots.them);
    await Sub.inner('Vier Euro fünfzig für eine Tasse. Ich habe dreiundzwanzig.', { dur: 3.4 });
    await Sub.say('Mirza', 'Danke. Nein.', { dur: 1.8 });
    Cam.set(D.shots.sun);
    await Sub.say('Brandt', 'Also. Ihr Käufer.', { dur: 2 });
    await Sub.say('Mirza', 'Bereit. Zu Ihrem Preis.', { dur: 2.2 });
    Cam.set(D.shots.me);
    await Sub.say('Brandt', 'Zu meinem Preis. Das hören wir alle gern.', { dur: 3 });
  }, { stay: true, keepBars: true, hint: false });
  // ---- Die Runden (nicht überspringbar) ----
  await Cine.run(async () => {
    for (let i = 0; i < BRANDT_ROUNDS.length; i++) await Deal.round(BRANDT_ROUNDS[i], i);
  }, { stay: true, keepBars: true, skippable: false, hint: false });
  F.d1 = Deal.score;
  // ---- Abschluss ----
  await Cine.run(async () => {
    Mus.mood('win', 2.5);
    Cam.set(D.shots.me);
    await Sub.say('Brandt', 'Wo muss ich unterschreiben?', { dur: 2.6 });
    W.contract.visible = true; Snd.page(); me.setPose(ME_SIT.lean, 3); Tells.set(B, 'sign', 4);
    Cam.set(D.shots.hands); Cam.move({ pos: [-18.45, 1.08, -27.8], look: [-19.0, 0.8, -28.05], fov: 22 }, 4.6, 'inOutSine');
    Snd.pen(2.8);
    await sleep(3.2);
    Tells.set(B, 'relax', 4); me.setPose(ME_SIT.idle, 3); W.folder.visible = false;
    Cam.set(D.shots.me);
    await Sub.say('Brandt', 'Eins noch, Junge.', { dur: 2 });
    await Sub.say('Brandt', 'Warum machen Sie das? Sie sind jung. Sie könnten ein ganz anderes Leben führen.', { dur: 5 });
    await Choice.unsaid('Weil ich es kann.', ['Weil meine Mutter nachts Büros putzt, damit ich hier sitzen kann.', 'Weil ich seit zwei Tagen nichts Richtiges gegessen habe.']);
    (G.state.unsaid = G.state.unsaid || []).push('Weil meine Mutter nachts Büros putzt, damit ich hier sitzen kann.', 'Weil ich seit zwei Tagen nichts Richtiges gegessen habe.');
    Cam.set(D.shots.them);
    await Sub.say('Mirza', 'Weil ich es kann.', { dur: 2.4 });
    Cam.set(D.shots.me); Mus.mood('calm', 3);
    await sleep(1.6);
    await Sub.say('Brandt', 'Mein Sohn sagt das auch.', { dur: 2.6 });
    await sleep(0.8);
    await Sub.say('Brandt', 'Wenn er lügt.', { dur: 2.6 });
    await sleep(1.2);
    Cam.set(D.shots.them);
    await Sub.inner('Er hat es gemerkt. Und nichts gesagt. Das nennt man Anstand.', { dur: 4 });
    // Handschlag, Profil gegen die Sonne
    unlock && unlock(); Deal.end();
    me.setPose(POSES.mirza, 4); B.setPose(POSES.stand, 4);
    Cam.set({ pos: [-14.6, 1.22, -27.9], look: [-18.4, 1.22, -27.75], fov: 30, dof: 0.5 });
    await Promise.all([me.walkTo(-18.7, -27.3, { speed: 0.7, face: Math.PI }), B.walkTo(-18.12, -28.2, { speed: 0.7, face: 0 })]);
    me.setPose(POSES.handshake, 5); B.setPose(POSES.handshake, 5); Snd.step('wood', { vel: 0.3 });
    await sleep(0.9);
    await Sub.say('Brandt', 'Machen Sie was daraus.', { dur: 2.8 });
    await sleep(0.4);
    await Sub.say('Brandt', 'Frau Winter erwartet Sie um halb sieben. Hotel Belvedere. Ich rufe sie an.', { dur: 5 });
    me.setPose(POSES.mirza, 4); B.setPose(POSES.stand, 4);
    B.walkTo(-18.9, -23.4, { speed: 0.9 }).then(() => B.walkTo(-8, -19, { speed: 1.0 })).catch(() => {});
    await sleep(1.2);
    Story.clock(18, 14);
    // ---- Zahltag ----
    await Deal.payday(10000, { size: 2, strike: 1, mood: 'lift', lines: ['Zehntausend Euro. Für zwanzig Minuten Reden.', 'Mama braucht dafür ein ganzes Jahr Nachtschichten.'] });
    Goals.set({ ten: 'done', maybach: 'cur' });
    await Sub.inner('Und das war erst die erste Zahl.', { dur: 3 });
  }, { stay: false });
  W.folder.visible = false; W.contract.visible = false;
  Deal.end();
  F.dealCafe = 'done';
};
