/* よびごえの館：ホスト側のゲーム進行（authoritative）。気配・こわい出来事のスケジュール・なぞの判定はここ */
'use strict';
function hostId(code) { return ID_PREFIX + code; }
function newRoom(name, solo) {
  return { code: solo ? 'SOLO' : genCode(), solo: !!solo, phase: 'lobby', nextSid: 2, gameNo: 0,
    seats: [{ sid: 1, name: name, kind: 'host', clientId: myId, connected: true }], G: null, notice: null, lobbyReq: null };
}
function startHost(name, resumeRoom, solo) {
  document.body.classList.add('is-host');
  host = { room: resumeRoom || newRoom(name, solo), conns: {}, lastSeen: {}, tries: 0, opened: false };
  document.body.classList.toggle('solo', !!host.room.solo);
  if (resumeRoom) host.room.seats.forEach(function (s) { if (s.kind === 'remote') s.connected = false; });
  if (resumeRoom && resumeRoom.G) { var G = resumeRoom.G; G.lastTick = Date.now(); G.queue = []; G.nextScare = Date.now() + 20000 * T.k; G.players.forEach(function (pl, p) { if (pl.sid !== 1) L.setAway(G.S, p, true); }); }
  if (host.room.solo) { host.opened = true; hostRender(); saveHost(); }
  else { connecting(true, resumeRoom ? '部屋を再開しています…' : '部屋を作っています…', 'シグナリングサーバーに接続中', function () { location.href = location.pathname; }); openHostPeer(); }
  setInterval(hostHeartbeat, 2000);
  setInterval(hostTick, T.tick);
}
function hostStartGame() {
  var R = host.room; if (!R.seats.length) return;
  R.gameNo++; R.lobbyReq = null;
  var players = R.seats.slice(0, 4).map(function (s) { return { sid: s.sid, name: s.name }; });
  var S = L.newGame(players.length);
  var now = Date.now();
  R.G = { S: S, players: players, startAt: now + T.intro, lastTick: now, nextScare: now + T.intro + rand(20000, 32000) * T.k, faceAt: now + T.intro + rand(80000, 150000) * T.k,
    fx: [], fxId: 0, queue: [], seenEv: S.evId, lastBc: 0, actAt: now, intro: false };
  R.G.players.forEach(function (pl, p) { var s = seatBySid(pl.sid); if (s && s.kind === 'remote' && !s.connected) L.setAway(S, p, true); });
  R.phase = 'game';
  hostBroadcast();
}
function pIndex(sid) { var G = host.room.G, k = -1; if (G) G.players.forEach(function (pl, i) { if (pl.sid === sid) k = i; }); return k; }
function pname(p) { var G = host.room.G; return G && G.players[p] ? G.players[p].name : '？'; }
// こわい出来事を全員（to=0）または1人（to=sid）に
function fx(kind, to, arg, delay) { var G = host.room.G; G.queue.push({ at: Date.now() + (delay || 0), kind: kind, to: to || 0, arg: arg }); }
function flushFx(now) {
  var G = host.room.G, changed = false;
  G.queue = G.queue.filter(function (q) { if (q.at > now) return true; G.fx.push({ id: ++G.fxId, kind: q.kind, to: q.to, arg: q.arg, at: now }); changed = true; return false; });
  if (G.fx.length > 14) G.fx.splice(0, G.fx.length - 14);
  return changed;
}
function randomName() { var G = host.room.G; return pick(G.players).name; }
function pickScare(S) {
  var st = L.stage(S.dread), pool = ['knock', 'steps', 'edge', 'quiet', 'giggle', 'whisper'];
  if (S.act >= 1 && st >= 1) pool.push('door', 'lights', 'hands', 'rock', 'phone', 'mirror', 'eyes');
  if (st >= 2) pool.push('face', 'slam', 'door', 'whisper', 'plates');
  if (st >= 3) pool.push('face', 'lights', 'steps');
  if (S.act >= 2) pool.push('plates', 'scream');
  return pick(pool);
}
function onEvents() {
  var R = host.room, G = R.G, S = G.S, changed = false;
  S.ev.forEach(function (e) {
    if (e.id <= G.seenEv) return; G.seenEv = e.id; changed = true;
    var who = e.p != null ? G.players[e.p] : null, P = e.pid ? L.PZ[e.pid] : null;
    if (e.kind === 'wrong') { if (Math.random() < 0.45) fx('face', who && who.sid); else fx(pick(['knock', 'slam', 'whisper']), who && who.sid, who && who.name); toastAll('……' + (who ? who.name + 'の部屋で' : '') + ' なにかが 動いた（気配が強くなった）'); }
    else if (e.kind === 'solve') {
      toastAll('🔓 ' + (S.n > 1 && who ? who.name + 'が' : '') + '「' + P.name + '」を解いた！' + (L.DIARY[e.pid] ? ' 📜日記を見つけた' : ''));
      var k = S.order.length;
      if (k === 1) fx('phone', 0, null, 2500 * T.k + 800);
      else if (k === 2) fx('lights', 0, null, 3000 * T.k + 500);
      else if (k === 3) fx('giggle', 0, null, 2000);
      else if (k === 6) fx('hands', 0, null, 2500);
      else if (k === 7) fx('rock', 0, null, 2000);
    }
    else if (e.kind === 'chase') {
      fx('slam');
      if (e.chase === 'hide') { fx('steps', 0, null, L.HIDE.warn + 500); fx('breath', 0, null, L.HIDE.warn + 3800); fx('knock', 0, null, L.HIDE.warn + 5800); }
      if (e.chase === 'run') fx('scream', 0, null, 600);
      if (e.chase === 'hold') { G.holdNext = Date.now() + 2500; }
    }
    else if (e.kind === 'chaseOk') {
      if (e.chase === 'hide') { fx('peek'); G.actAt = Date.now(); G.faceAt = Date.now() + rand(70000, 140000) * T.k; G.nextScare = Date.now() + rand(16000, 26000) * T.k; toastAll('……行ったみたい。館の空気が かわった。🔓 礼拝堂の扉が ひらいた', 5000); }
      if (e.chase === 'run') { G.actAt = Date.now(); G.faceAt = Date.now() + rand(50000, 100000) * T.k; G.players.forEach(function (pl, i) { fx('whisper', 0, pl.name, 2500 + i * 3500); }); toastAll('地下室に 逃げこんだ。扉の向こうで、あれが 名前を よんでいる…', 5000); }
    }
    else if (e.kind === 'caught') { G.queue = []; }
    else if (e.kind === 'retry') { G.nextScare = Date.now() + rand(15000, 25000) * T.k; toastAll('……気がつくと、さっきの場所に いた。'); }
    else if (e.kind === 'ring') toastAll('🕯 石が光った「' + e.ch + '」（' + e.k + '/' + S.girl.length + '）');
    else if (e.kind === 'ringBad') { fx(Math.random() < 0.5 ? 'face' : 'giggle', who && who.sid); toastAll('石の光が すべて消えた……。「ちがうよ」と だれかが 笑った'); }
    else if (e.kind === 'hint') toastAll('🐻 ふーさんが ヒントをくれた（' + P.name + '・' + e.lv + '段め）');
    else if (e.kind === 'holdLate') { fx('scream'); fx('hands', 0, null, 600); toastAll('ろうそくが 消えそう…！ 全員で 指をはなさないで！'); }
  });
  return changed;
}
function hostTick() {
  if (!host || !host.opened) return;
  var R = host.room, G = R.G, now = Date.now();
  if (R.phase !== 'game' || !G) return;
  var S = G.S, dt = now - G.lastTick; G.lastTick = now;
  if (now < G.startAt) return;
  if (!G.intro) { G.intro = true; fx('slam'); fx('whisper', 0, 'あそぼ', 2500); hostBroadcast(); return; }
  var ph0 = S.phase; L.tick(S, dt);
  var changed = onEvents() || ph0 !== S.phase;
  if (S.phase === 'play') {
    if (now >= G.faceAt) { fx('face'); G.faceAt = now + rand(120000, 200000) * T.k; G.nextScare = Math.max(G.nextScare, now + 15000 * T.k); }
    else if (now >= G.nextScare) {
      var k = pickScare(S), st = L.stage(S.dread);
      if (k === 'whisper') fx(k, 0, randomName()); else fx(k);
      if (k === 'quiet' && Math.random() < 0.4) fx('face', 0, null, 5200);
      G.nextScare = now + rand([30000, 22000, 16000, 12000][st], [50000, 40000, 30000, 22000][st]) * T.k;
    }
  }
  if (S.phase === 'hold' && now >= (G.holdNext || 0)) { var hk = pick(['knock', 'hands', 'giggle', 'whisper', 'steps']); fx(hk, 0, hk === 'whisper' ? randomName() : null); G.holdNext = now + rand(2500, 4500); }
  if (flushFx(now)) changed = true;
  var period = S.phase === 'play' ? 1000 : S.phase === 'caught' || S.phase === 'ending' ? 3000 : 180;
  if (changed || now - G.lastBc > period) hostBroadcast();
}
// ---- 操作 ----
function hostAction(sid, m) {
  var R = host.room, G = R.G; if (!G || R.phase !== 'game') return null;
  var S = G.S, p = pIndex(sid), v = m.v || {}, r;
  if (Date.now() < G.startAt) return null;
  if (p < 0) return 'このゲームには参加していません';
  if (m.a === 'try') { r = L.tryAnswer(S, p, String(v.pid), v.ans); if (r.err) return r.err; }
  else if (m.a === 'ring') { r = L.ringTap(S, p, String(v.id)); if (r.err) return r.err; }
  else if (m.a === 'hold') { L.setHold(S, p, !!v.on); }
  else if (m.a === 'steps') { L.addSteps(S, p, +v.k || 0); }
  else if (m.a === 'hint') { if (L.hint(S, String(v.pid)) == null) return 'いまは ヒントを出せないクマ…'; }
  else if (m.a === 'scream') { fx('scream', -sid); }   // 罠をあけた人以外に、遠くの悲鳴
  else if (m.a === 'retry') { if (sid !== 1) return 'ホストが やり直しを えらびます'; L.retry(S); G.queue = []; }
  else return null;
  onEvents(); flushFx(Date.now());
  hostBroadcast(); return null;
}
function viewFor(sid) {
  var R = host.room, G = R.G, now = Date.now(), you = -1;
  R.seats.forEach(function (s, i) { if (s.sid === sid) you = i; });
  var v = { t: 'state', phase: R.phase, code: R.code, solo: R.solo, you: you, sid: sid, gameNo: R.gameNo,
    seats: R.seats.map(function (s) { return { sid: s.sid, name: s.name, kind: s.kind, connected: s.kind !== 'remote' || s.connected }; }), notice: R.notice };
  if (sid === 1 && R.lobbyReq && R.phase !== 'lobby') v.lobbyReq = R.lobbyReq;
  if (R.phase === 'lobby' || !G) return v;
  var S = G.S, p = pIndex(sid);
  var names = G.players.map(function (pl) { var s = seatBySid(pl.sid); return { sid: pl.sid, name: pl.name, on: !s || s.kind !== 'remote' || s.connected }; });
  var nm = function (ps) { return ps.map(function (q) { return names[q].name; }); };
  var c = S.chase;
  v.g = { k: S.evId, phase: S.phase, act: S.act, dread: Math.round(S.dread * 10) / 10, stage: L.stage(S.dread), t: S.t, wait: Math.max(0, G.startAt - now), me: p, n: S.n, names: names,
    rooms: p < 0 ? [] : L.roomsOf(S, p).map(function (r) { return L.roomView(S, r, p); }),
    map: L.ACT_ROOMS[S.act].map(function (r) { return { id: r, name: L.RN[r], owners: nm(L.ownersOf(S, r)) }; }),
    items: S.items, ring: S.ring, girlLen: S.girl.length,
    puz: L.PUZ.filter(function (P) { return P.act <= S.act && P.id !== 'hold'; }).map(function (P) {
      var lv = S.hintLv[P.id] || 0, lr = P.lock.split(':')[0];
      return { id: P.id, name: P.name, act: P.act, solved: !!S.solved[P.id], room: lr, owner: nm(L.ownersOf(S, lr)).join('・'), lv: lv, hints: L.hintTexts(S, P.id).slice(0, lv) };
    }),
    chase: c ? { kind: c.kind, t: c.t, need: c.need || 0, total: L.chaseTotal(S), prog: c.prog || 0, holding: names.map(function (_, q) { return !!(c.holding && c.holding[q]); }), noise: names.map(function (_, q) { return c.noise ? Math.min(1, c.noise[q] || 0) : 0; }), away: names.map(function (_, q) { return !!S.away[q]; }) } : null,
    fx: G.fx.map(function (f) { return { id: f.id, kind: f.kind, to: f.to, arg: f.arg, age: now - f.at }; }),
    ev: S.ev.slice(-8).map(function (e) { return { id: e.id, kind: e.kind, p: e.p, pid: e.pid, k: e.k }; }),
    why: S.why, deaths: S.deaths, hints: S.hints, wrong: S.wrong };
  if (S.phase === 'ending') v.g.ending = { girl: S.girl };
  return v;
}
function seatByClient(cid) { return host.room.seats.filter(function (s) { return s.clientId === cid; })[0]; }
function seatBySid(sid) { return host.room.seats.filter(function (s) { return s.sid === sid; })[0]; }
function toastAll(msg, ms) { var R = host.room; R.notice = { id: (R.notice ? R.notice.id : 0) + 1, msg: msg, toast: true, ms: ms }; }
function hostToLobby(msg) {
  var R = host.room;
  R.phase = 'lobby'; R.G = null; R.lobbyReq = null;
  R.seats = R.seats.filter(function (s) { if (s.kind === 'remote') { s.left = false; return !!s.connected; } return true; });
  R.notice = { id: (R.notice ? R.notice.id : 0) + 1, msg: msg };
  hostBroadcast();
}
function hostLobbyReq(seat) {
  var R = host.room;
  if (seat.kind !== 'remote' || R.phase === 'lobby') return;
  if (R.lobbyReq && R.lobbyReq.sid === seat.sid && Date.now() - R.lobbyReq.at < 5000) return;
  R.lobbyReq = { sid: seat.sid, name: seat.name, at: Date.now() };
  hostBroadcast();
}
function seatAway(seat, away) { var G = host.room.G; if (!G) return; var p = pIndex(seat.sid); if (p >= 0) L.setAway(G.S, p, away); }
function hostBroadcast() {
  var R = host.room; if (R.G) R.G.lastBc = Date.now();
  R.seats.forEach(function (s) { if (s.kind !== 'remote') return; var c = host.conns[s.clientId]; if (c && c.open) { try { c.send(viewFor(s.sid)); } catch (e) {} } });
  hostRender(); saveHost();
}
function hostRender() { render(viewFor(1)); }
var saveT = 0;
function saveHost() { var now = Date.now(); if (now - saveT < 1500 && host.room.phase === 'game') return; saveT = now; try { localStorage.setItem(LS_HOST, JSON.stringify({ room: host.room, saved: now })); } catch (e) {} }
