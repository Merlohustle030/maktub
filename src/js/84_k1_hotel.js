// =====================================================================
// KAPITEL I – „Innenstadt“ (2/3): Hotel Belvedere, die Lobby, Frau Winter – zwanzigtausend Euro
// =====================================================================
Object.assign(Story, {
  async lobbyDesk() {
    const W = G.world, F = G.state.flags;
    await Player.turnTo(9.2, -3.4);
    await Story.inspect({ pos: [6.4, 1.6, -1.6], look: [9.6, 1.5, -3.4], fov: 36 }, async () => {
      if (F.dealHotel === 'open') await Sub.say('Empfang', 'Guten Abend. Frau Winter erwartet Sie in der Lounge.', { dur: 3.4 });
      else await Sub.say('Empfang', 'Guten Abend. Kann ich Ihnen helfen?', { dur: 2.6 });
      await Sub.inner('Er sieht erst meinen Anzug an. Dann mein Gesicht. Er entscheidet sich für das Gesicht.');
    });
  },
  async lobbyChandelier() {
    await Player.turnTo(0, 0);
    await Story.inspect({ pos: [0.6, 1.5, 3.2], look: [0, 5.2, 0], fov: 44 }, async () => {
      await Sub.inner('Dreihundert Kristalle. Jeder einzelne kostet mehr als meine Monatsmiete.');
      await Sub.inner('Und alle funkeln, als wäre das nichts.');
    });
  },
  async lobbyStairs() {
    await Player.turnTo(0, -7);
    await Story.inspect({ pos: [0.4, 1.5, -1.8], look: [0, 2.2, -8], fov: 42 }, async () => {
      await Sub.inner('Zehn Stufen bis zur Galerie. Ich zähle sie.');
      await Sub.inner('Ich zähle alles.');
    });
  },
});

// Wie im Café – aber kälter: Frau Winter sitzt gegen das Licht.
const WINTER_ROUNDS = [
  {
    tell: 'arms', hint: 'Verschränkte Arme, kühler Blick. Eine Mauer – kein Gegner, nur Schutz.',
    say: ['Ich mache Geschäfte nur mit Menschen, die ich einschätzen kann.', 'Sie kann ich nicht einschätzen.'],
    best: 'calm', after: 'relax',
    opts: [
      { key: 'push', text: 'Ich muss nicht eingeschätzt werden. Meine Zahlen reichen.' },
      { key: 'calm', text: 'Dann fragen Sie. Ich antworte ehrlich.' },
      { key: 'stand', text: 'Dann verschwenden wir beide unsere Zeit.' },
      { key: 'silence' },
    ],
    good: ['Ehrlich.', 'Das ist selten in diesem Haus.'],
    bad: { push: ['Zahlen kann jeder vorlegen.'], stand: ['Setzen Sie sich.'], silence: ['Ich warte.'], default: ['Ich warte.'] },
    inner: { good: 'Ihre Arme sind unten. Die Mauer hat eine Tür.', bad: { default: 'Falsch. Sie prüft keine Zahlen. Sie prüft mich.' } },
    soft: 'Fahren Sie fort.',
  },
  {
    tell: 'lean', hint: 'Sie lehnt sich vor. Mehr Interesse, als sie zeigen will.',
    say: ['Die Parzelle am Wasser … wie viel Fläche genau?', 'Erzählen Sie mir alles.'],
    best: 'stand', after: 'relax',
    opts: [
      { key: 'push', text: 'Sie kennen die Zahlen, Frau Winter. Entscheiden Sie sich.' },
      { key: 'calm', text: 'Lassen Sie uns die Fläche in Ruhe durchgehen.' },
      { key: 'stand', text: 'Ich merke, Sie brauchen noch Zeit. Ich komme wieder, wenn Sie entschieden sind.' },
      { key: 'silence' },
    ],
    good: ['Warten Sie.', 'Setzen Sie sich. Ich brauche keine Zeit. Ich brauche Ihren Preis.'],
    bad: { push: ['Ich lasse mich nicht drängen.'], calm: ['Wir haben Zeit, ich weiß.'], silence: ['Ich warte auf Ihre Antwort.'], default: ['Ich warte auf Ihre Antwort.'] },
    inner: { good: 'Wer gehen kann, hat gewonnen.', bad: { default: 'Falsch. Sie will es schon. Wer schon will, den muss man nicht schieben – nur gehen lassen.' } },
    soft: 'Weiter.',
  },
  {
    tell: 'tap', hint: 'Sie trommelt mit den Nägeln aufs Glas. Sie testet, ob ich zucke.',
    say: ['Ihr Anzug ist gut geschnitten.', 'Er ist nicht Ihrer, oder?'],
    best: 'silence', after: 'relax',
    opts: [
      { key: 'push', text: 'Der Anzug tut nichts zur Sache. Reden wir über Zahlen.' },
      { key: 'calm', text: 'Nein. Ist er nicht.' },
      { key: 'stand', text: 'Wenn das hier eine Prüfung ist, bin ich der Falsche.' },
      { key: 'silence' },
    ],
    good: ['Sie zucken nicht einmal.', 'Gut. Anzüge kann man kaufen. Haltung nicht.'],
    bad: { push: ['Doch. Er tut etwas zur Sache.'], calm: ['Ehrlichkeit ist billig, wenn man nichts zu verlieren hat.'], stand: ['Sie bleiben.'], default: ['Sie bleiben.'] },
    inner: { good: 'Second-Hand. Aber er sitzt, als wäre er für mich genäht.', bad: { default: 'Falsch. Sie will nicht wissen, was ich trage. Sie will wissen, ob es mich trägt.' } },
    soft: 'Genug davon.',
  },
  {
    tell: 'watch', hint: 'Sie sieht auf die Uhr. Zeit als Waffe – dann setze ich sie auch ein.',
    say: ['Meine Zeit ist knapp.', 'Sie haben noch eine Minute.'],
    best: 'push', after: 'relax',
    opts: [
      { key: 'push', text: 'Dann brauche ich nur eine Antwort: Ja oder Nein.' },
      { key: 'calm', text: 'Ich brauche nur einen Moment Ihrer Aufmerksamkeit.' },
      { key: 'stand', text: 'Dann komme ich ein anderes Mal wieder.' },
      { key: 'silence' },
    ],
    good: ['Sie haben Mut.', 'Ja.'],
    bad: { calm: ['Aufmerksamkeit hat einen Preis.'], stand: ['Es gibt kein anderes Mal.'], silence: ['Dreißig Sekunden.'], default: ['Dreißig Sekunden.'] },
    inner: { good: 'Wer nach dem Ja fragt, bekommt es – oder ein Nein, das ehrlich ist.', bad: { default: 'Falsch. Wer ihr die Zeit lässt, verliert sie.' } },
    soft: 'Gut. Fassen Sie sich kurz.',
  },
];

Story.cityHotelDoor = async () => {
  const W = G.world, me = Player.ch, F = G.state.flags, dm = W.doorman;
  F.dealHotel = 'run'; Obj.set(''); Hint.hide(); Prompt.set(null);
  const dv = new THREE.Vector3();
  await Cine.run(async () => {
    Cam.set({ pos: [21.4, 1.5, 9.6], look: [30, 1.7, 3.4], fov: 38 });
    Cam.move({ pos: [24.4, 1.45, 8.0], look: [30.4, 1.8, 3.9], fov: 32 }, 7, 'inOutSine');
    if (Mus.mood) Mus.mood('lift', 2);
    await me.walkTo(28.6, 5.0, { speed: 1.2 });
    me.head = me.j.head; me.j.head.getWorldPosition(dv); dm.lookAt(dv.clone(), 0.9);
    await Sub.say('Portier', 'Guten Abend.', { dur: 1.8 });
    await Sub.inner('Guten Abend. Ich tue so, als käme ich jeden Tag.', { dur: 3.2 });
    W.doorSpin = 1.3; Snd.door('close');
    Cam.move({ pos: [26.6, 1.2, 6.2], look: [31.3, 1.4, 4], fov: 36 }, 3.2, 'inOutSine');
    await me.walkTo(31.3, 4.0, { speed: 1.05 });
    Game.fade(1, 0.9, [0.1, 0.06, 0.02]);
    await me.walkTo(32.1, 4.0, { speed: 1.05 });
    await sleep(0.4);
  }, { stay: true, keepBars: true, hint: false });
  dm.lookAt(null); W.doorSpin = 0.35;
  await Game.loadWorld('lobby');
  Mus.play(CUES.city, { mood: 'silence', fadeOut: 2, delay: 0.1 });
  const L = G.world, lm = Player.ch;
  Story.clock(18, 31);
  lm.place(0, 0, 8.9, Math.PI); lm.setPose('mirza'); lm.snapPose();
  await Cine.run(async () => {
    Cam.set({ pos: [0.9, 1.5, 3.4], look: [0, 1.25, 8.4], fov: 42 });
    Cam.move({ pos: [0.3, 1.6, 3.0], look: [0, 1.35, 6.8], fov: 44 }, 6, 'inOutSine');
    Game.fade(0, 1.6);
    Snd.step('marble', { vel: 0.5 });
    lm.walkTo(0, 5.6, { speed: 1.1 });
    await sleep(1.4);
    Mus.mood('calm', 3);
    await sleep(2.0);
    Cam.set({ pos: [2.4, 0.8, 7.6], look: [0, 5.4, 0.2], fov: 56 });
    Cam.move({ pos: [1.7, 1.0, 6.9], look: [0, 5.6, 0.2], fov: 50 }, 5.5, 'inOutSine');
    await sleep(0.8);
    await Sub.inner('Der Boden ist sauberer als meine Küche.', { dur: 3.4 });
    await Sub.inner('Kein Mensch hier hat je auf einen Kontoauszug gewartet.', { dur: 3.8 });
    await sleep(0.4);
    Cam.set({ pos: [0.6, 1.55, 6.8], look: [-8.4, 1.3, -0.5], fov: 40 });
    Cam.move({ pos: [0.2, 1.55, 6.4], look: [-8.4, 1.3, -0.5], fov: 36 }, 5, 'inOutSine');
    await sleep(0.6);
    await Sub.inner('Dort. Am Fenster. Gegen das Licht.', { dur: 3 });
  }, { stay: false });
  Obj.set('Frau Winter wartet in der Lounge.');
  Hint.show('<b>E</b> Ansehen &nbsp;·&nbsp; Gespräch: <b>Setzen</b> bei Frau Winter', 8);
  F.dealHotel = 'open';
};

Story.lobbyWinter = async () => {
  const W = G.world, me = Player.ch, Wn = W.winter, F = G.state.flags;
  F.dealHotel = 'run'; Obj.set(''); Hint.hide(); Prompt.set(null);
  const D = {
    name: 'Winter', partner: Wn, me, cue: CUES.deal, start: 'silence', mood: ['calm', 'tense', 'push', 'push'], tellPos: headAt(Wn, -0.05, 0.3),
    shots: {
      wide: { pos: [-5.0, 1.75, 2.6], look: [-9, 1.1, -0.6], fov: 42 },
      them: { pos: [-5.85, 1.36, 0.3], look: [-9.4, 1.27, -0.52], fov: 28 },
      me: { pos: [-10.6, 1.4, -1.7], look: [-7.15, 1.27, -0.5], fov: 28 },
      sun: { pos: [-5.8, 1.3, 0.9], look: [-10.6, 2.2, 0.95], fov: 36 },
    },
  };
  Deal.begin(D);
  let unlock = null;
  const tell = F.d1 >= 2 ? ['Brandt hat angerufen. Er sagt, Sie hätten ihn nicht überredet, sondern überzeugt.', 'Er sagt, das sei ein Unterschied.'] : ['Brandt hat angerufen. Er sagt, Sie seien hartnäckig.', 'Er hat es nicht als Kompliment gemeint.'];
  await Cine.run(async () => {
    Cam.set({ pos: [-4.4, 1.6, 2.2], look: [-8.4, 1.2, -0.6], fov: 40 });
    Cam.move({ pos: [-5.2, 1.55, 1.6], look: [-8.6, 1.2, -0.5], fov: 36 }, 8);
    await me.walkTo(-6.4, -0.5, { speed: 1.05, face: -Math.PI / 2 });
    unlock = Deal.eyeLock(me, Wn);
    me.setPose(ME_SIT.idle, 3.5); await tween(me.root.position, { x: -7.15 }, 1.2, 'inOutSine'); Snd.door('creak');
    Tells.set(Wn, 'idle', 4);
    Cam.set(D.shots.me); Mus.mood('calm', 3);
    await sleep(0.8);
    await Sub.say('Winter', 'Sie sind der junge Mann von Herrn Brandt.', { dur: 3 });
    Cam.set(D.shots.them);
    await Sub.say('Winter', tell[0], { dur: 4.4 });
    await Sub.say('Winter', tell[1], { dur: 3 });
    Cam.set(D.shots.sun);
    await Sub.say('Mirza', 'Danke, dass Sie sich Zeit nehmen.', { dur: 2.6 });
    Cam.set(D.shots.me);
    await Sub.say('Winter', 'Ich nehme mir keine Zeit. Ich vergebe sie.', { dur: 3.2 });
    await sleep(0.4);
  }, { stay: true, keepBars: true, hint: false });
  await Cine.run(async () => {
    for (let i = 0; i < WINTER_ROUNDS.length; i++) await Deal.round(WINTER_ROUNDS[i], i);
  }, { stay: true, keepBars: true, skippable: false, hint: false });
  F.d2 = Deal.score;
  await Cine.run(async () => {
    Mus.mood('win', 2.5);
    Cam.set(D.shots.me);
    await Sub.say('Winter', 'Zu Ihrem Preis. Ja.', { dur: 2.6 });
    await sleep(0.4);
    Cam.set(D.shots.them);
    await Sub.say('Winter', 'Eins noch. Was wollen Sie wirklich?', { dur: 3.2 });
    await Choice.unsaid('Ich will dieses Haus nicht nur betreten. Ich will es besitzen.', ['Dass meine Mutter nie wieder nachts arbeiten muss.', 'Nie wieder Angst vor dem Ersten des Monats haben.']);
    (G.state.unsaid = G.state.unsaid || []).push('Dass meine Mutter nie wieder nachts arbeiten muss.', 'Nie wieder Angst vor dem Ersten des Monats haben.');
    Cam.set(D.shots.sun);
    await Sub.say('Mirza', 'Ich will dieses Haus nicht nur betreten. Ich will es besitzen.', { dur: 4.4 });
    Cam.set(D.shots.me);
    await sleep(1.4);
    Tells.set(Wn, 'relax', 3);
    await Sub.say('Winter', 'Ehrgeiz.', { dur: 1.8 });
    await sleep(0.4);
    await Sub.say('Winter', 'Das ist ehrlicher, als Sie glauben.', { dur: 3 });
    unlock && unlock(); Deal.end();
    me.setPose(POSES.mirza, 4); Wn.setPose(POSES.stand, 4);
    Cam.set({ pos: [-5.6, 1.2, -1.9], look: [-8.4, 1.25, -0.4], fov: 32, dof: 0.4 });
    await Promise.all([me.walkTo(-7.5, -0.05, { speed: 0.7, face: -Math.PI / 2 }), Wn.walkTo(-8.6, -0.05, { speed: 0.7, face: Math.PI / 2 })]);
    me.setPose(POSES.handshake, 5); Wn.setPose(POSES.handshake, 5);
    await sleep(1.0);
    await Sub.say('Winter', 'Rufen Sie mich an, wenn Sie bereit sind für etwas Größeres.', { dur: 4.4 });
    me.setPose(POSES.mirza, 4); Wn.setPose(POSES.stand, 4);
    Wn.walkTo(-6.6, 3.0, { speed: 0.9 }).then(() => Wn.walkTo(2.4, 3.6, { speed: 1.0 })).catch(() => {});
    await sleep(1.0);
    Story.clock(19, 4);
    await Deal.payday(20000, { size: 3, mood: 'triumph', lines: ['Zwanzigtausend.', 'Vor einem Tag konnte ich mir keinen Kaffee leisten.'] });
    await Sub.inner('Etwas Größeres.', { dur: 2.4 });
  }, { stay: false });
  Deal.end();
  F.dealHotel = 'done';
};
