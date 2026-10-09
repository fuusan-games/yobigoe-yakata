/* よびごえの館：描画（ホスト・参加者で共通。受け取ったビューだけを使う） */
'use strict';
var ui = { room: null, fxSeen: -1, evSeen: -1, itemsSeen: 0, sayT: 0, sceneKey: '', zoom: null, inp: {}, visits: {}, trapped: {}, chaseKind: '', caughtShown: false, endKey: '', holdOn: false, steps: 0, sentSteps: 0, nextFoot: 'L', warned: !!sload(SS_WARN), gameKey: '' };
var STAGE_LBL = ['しずか', '足音…', '近い', 'すぐそば'];
var ING_I = ['🍄', '🥕', '🧅', '🥔', '🌿', '⚪'];
var COL_HEX = ['#d0302f', '#2f5fd0', '#2f9f4f', '#e0c02f'];
function render(v) {
  lastView = v; window.__hm.view = v;
  noticeUi(v);
  if (v.phase === 'lobby') { show('lobby'); renderLobby(v); BGM.want('title'); hideGameOverlays(); ui.gameKey = ''; return; }
  var g = v.g; if (!g) return;
  var gk = v.gameNo + ':' + v.code;
  if (ui.gameKey !== gk) { ui.gameKey = gk; ui.fxSeen = -1; ui.evSeen = -1; ui.itemsSeen = 0; ui.itemsToasted = null; ui.inp = {}; ui.visits = {}; ui.trapped = {}; ui.room = null; ui.caughtShown = false; ui.endKey = ''; ui.sceneKey = ''; overlay('zoom', false); }
  if (g.phase === 'ending') { hideGameOverlays(); show('end'); renderEnd(v); BGM.want('ending'); return; }
  show('game'); renderGame(v);
  BGM.want(g.phase === 'hide' || g.phase === 'run' || g.phase === 'hold' ? 'chase' : 'game');
}
function hideGameOverlays() { $('chase').classList.remove('active'); $('caught').classList.remove('active'); ui.chaseKind = ''; ui.caughtShown = false; }
var seenNotice = null;
function noticeUi(v) {
  if (seenNotice === null) seenNotice = v.notice ? v.notice.id : 0;
  else if (v.notice && v.notice.id !== seenNotice) { seenNotice = v.notice.id; if (v.notice.toast || !host) toast(v.notice.msg + (!v.notice.toast && v.phase === 'lobby' ? '。ロビーで次のゲームを待っています' : ''), v.notice.ms || 3200); }
  if (v.phase === 'lobby') overlay('menuModal', false);
  var bar = $('lobbyReqBar'), key = host && v.lobbyReq && v.phase !== 'lobby' ? v.lobbyReq.sid + ':' + v.lobbyReq.at : '';
  if (bar.dataset.key !== key) {
    bar.dataset.key = key;
    bar.innerHTML = key ? '<span>🙋 ' + esc(v.lobbyReq.name) + '「ロビーに戻りたい」</span><button data-lr="abort">中断してロビーへ</button><button data-lr="no" class="ghost">とじる</button>' : '';
    bar.classList.toggle('show', !!key);
  }
}
// ---------------- ロビー ----------------
function renderLobby(v) {
  var isHost = !!host, n = v.seats.length;
  document.body.classList.toggle('solo', !!v.solo);
  $('codeBig').textContent = v.code;
  var url = inviteUrl(v.code); $('inviteUrl').textContent = url;
  if (!v.solo && $('qr').dataset.url !== url) {
    try { var qr = qrcode(0, 'M'); qr.addData(url); qr.make(); $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { $('qr').textContent = ''; }
    $('qr').dataset.url = url;
  }
  $('seatCount').textContent = n + ' / ' + MAX_HUMANS + '人';
  $('seatList').innerHTML = v.seats.map(function (s, i) {
    var tags = (s.kind === 'host' && !v.solo ? '<span class="tagx host">ホスト</span>' : '') + (i === v.you && !v.solo ? '<span class="tagx">あなた</span>' : '') + (s.kind === 'remote' && !s.connected ? '<span class="tagx off">切断</span>' : '');
    return '<div class="seat' + (s.connected ? '' : ' offline') + '"><span class="av">' + (i + 1) + '</span><span class="nm">' + esc(s.name) + '</span>' + tags + (isHost && s.kind === 'remote' ? '<button class="xbtn" data-sid="' + s.sid + '" aria-label="外す">×</button>' : '') + '</div>';
  }).join('');
  $('seatHint').textContent = v.solo ? 'ひとりで 全部の部屋を 行き来します。' : '1〜4人。招待URLかQRで、各自のスマホから参加してね。人数がそろったらスタート。';
  var m = Math.min(4, n);
  $('splitList').innerHTML = v.seats.slice(0, 4).map(function (s, k) { return '<b>' + esc(s.name) + '</b>：' + L.assignFor(m, k).map(function (r) { return L.RI[r] + L.RN[r]; }).join('・'); }).join('<br>') +
    '<br><span class="hint">' + (m === 1 ? 'ひとりなら全部の部屋を見られます（礼拝堂は とちゅうから）。' : '自分の部屋の手がかりは、ほかの人の部屋のなぞの答えになっています。<b>声をかけあおう！</b>（礼拝堂は とちゅうから、地下室は最後に全員で）') + '</span>';
  $('startBtn').disabled = n < 1;
}
// ---------------- ゲーム ----------------
function UI_say(t, narr) { ui.sayT = Date.now(); $('sayline').innerHTML = narr ? '<i>' + esc(t) + '</i>' : t; }
function myRooms(g) { return g.rooms.map(function (r) { return r.id; }); }
function curRoom(g) { var ids = myRooms(g); if (ids.indexOf(ui.room) < 0) ui.room = ids[0] || null; return g.rooms.filter(function (r) { return r.id === ui.room; })[0]; }
function renderGame(v) {
  var g = v.g;
  if (!ui.warned && g.phase !== 'ending') overlay('warnModal', true);
  $('phLabel').textContent = g.wait > 0 ? '……' : '第' + ['', '一', '二', '三'][g.act] + '幕';
  $('dreadBar').style.width = Math.min(100, g.dread) + '%';
  $('dreadLbl').textContent = STAGE_LBL[g.stage];
  $('dread').className = 'dread s' + g.stage;
  $('stageWrap').className = 's' + g.stage;
  FX.setStage(g.stage); BGM.setDread(g.dread);
  // タブ：自分の部屋＋ほかの人の部屋（名前つき）
  var mine = myRooms(g); curRoom(g);
  var tabs = mine.map(function (r) { return '<button data-r="' + r + '" class="' + (r === ui.room ? 'on' : '') + '">' + L.RI[r] + ' ' + L.RN[r] + '</button>'; });
  g.map.forEach(function (m) { if (mine.indexOf(m.id) < 0) tabs.push('<button data-other="' + m.id + '" class="other">' + L.RI[m.id] + ' ' + m.name + '＝' + esc(m.owners.join('・') || '？') + '</button>'); });
  var th = tabs.join(''); if ($('tabs').dataset.h !== th) { $('tabs').innerHTML = th; $('tabs').dataset.h = th; }
  refreshScene();
  // 下のボタン
  var diaries = g.items.filter(function (i) { return i.kind === 'diary'; }).length, shards = g.items.filter(function (i) { return i.kind === 'shard'; }).length;
  $('itemsSub').textContent = diaries + '枚' + (shards ? '・かけら' + shards : '');
  $('itemsBtn').classList.toggle('new', g.items.length > ui.itemsSeen);
  $('mapSub').textContent = g.n > 1 ? g.n + '人で分担' : 'ひとり';
  if (ui.itemsToasted == null || ui.itemsToasted > g.items.length) ui.itemsToasted = g.items.length;
  if (g.items.length > ui.itemsToasted) { var it = g.items[g.items.length - 1]; ui.itemsToasted = g.items.length; setTimeout(function () { toast(it.kind === 'shard' ? '✨ 名前のかけら「' + it.ch + '」を見つけた（' + (it.pos + 1) + 'もじめ）' : '📜 日記のページを見つけた（下の📜から読めます）', 3500); }, 1800); }
  if (ui.itemsSeen > g.items.length) ui.itemsSeen = g.items.length;
  if ($('itemsModal').classList.contains('active')) ui.itemsSeen = g.items.length;
  // 出来事（音）と、こわい演出
  playEvents(v); playFx(v);
  if (Date.now() - ui.sayT > 9000) UI_say(statusLine(v));
  renderChase(v); renderCaught(v);
  if (ui.zoom && $('zoom').classList.contains('active')) refreshZoom(v);
}
function statusLine(v) {
  var g = v.g, r = curRoom(g);
  if (g.wait > 0) return '<i>……扉が、うしろで 閉まった。</i>';
  if (!r) return '……';
  var open = g.puz.filter(function (p) { return !p.solved; }).length;
  var others = g.map.filter(function (m) { return myRooms(g).indexOf(m.id) < 0; });
  return '<b>' + L.RN[r.id] + '</b>にいる。のこりのなぞ ' + open + '個。' + (others.length ? 'ほかの部屋は 仲間の画面に。<b>声をかけあって！</b>' : 'ものを タップして しらべよう。');
}
function sceneState(g) {
  var st = { ghost: FX.scene.ghost, eyes: FX.scene.eyes, rock: FX.scene.rock, plates: FX.scene.plates };
  var r = curRoom(g); if (!r) return st;
  r.objects.forEach(function (o) {
    if (o.id === 'clock' && o.solved) { var a = ui.inp.clock || {}; st.clockH = a.h; st.clockM = a.m; }
    if (o.id === 'musicbox' && o.solved) st.music = true;
    if (o.id === 'pot' && o.solved) st.steam = true;
    if (o.id === 'glass' && o.solved) st.glassDone = true;
  });
  return st;
}
function refreshScene() {
  var v = lastView; if (!v || !v.g || v.phase !== 'game') return;
  var g = v.g, r = curRoom(g); if (!r) { $('stage').innerHTML = ''; return; }
  var st = sceneState(g), key = r.id + '|' + r.objects.map(function (o) { return o.id + o.kind + (o.solved ? 1 : 0); }).join(',') + '|' + JSON.stringify(st);
  if (key === ui.sceneKey) return; ui.sceneKey = key;
  $('stage').innerHTML = ART.room(r.id, r.objects, st);
}
function playEvents(v) {
  var g = v.g;
  if (ui.evSeen < 0) { ui.evSeen = g.k; ui.itemsSeen = g.items.length; return; }
  if (g.k === ui.evSeen) return;
  (g.ev || []).forEach(function (e) {
    if (e.id <= ui.evSeen) return;
    if (e.kind === 'solve') sfx.correct();
    else if (e.kind === 'wrong' && e.p === g.me) { sfx.wrong(); vibrate(60); if (ui.zoom) { var zb = $('zBody'); zb.style.animation = 'none'; void zb.offsetWidth; zb.style.animation = 'shake .4s'; } }
    else if (e.kind === 'ring') sfx.note(Math.max(0, 4 - e.k));
    else if (e.kind === 'ringBad') sfx.wrong();
    else if (e.kind === 'hint' && e.p == null) sfx.ui();
    if (e.kind === 'solve' && e.pid === 'phone' && e.p === g.me) setTimeout(function () { speakWhisper('……みつけて', { pitch: 1.7, rate: 0.6 }); }, 600);
  });
  ui.evSeen = g.k;
}
function playFx(v) {
  var g = v.g;
  if (ui.fxSeen < 0) { ui.fxSeen = g.fx.length ? g.fx[g.fx.length - 1].id : 0; return; }
  g.fx.forEach(function (f) {
    if (f.id <= ui.fxSeen) return; ui.fxSeen = f.id;
    if (f.age > 6000) return;
    if (f.to > 0 && f.to !== v.sid) return;
    if (f.to < 0 && -f.to === v.sid) return;
    if (f.kind === 'breath') { sfx.breath(); return; }
    if (f.kind === 'peek') { FX.narr('face'); UI_say('……行った？ そのとき、すきまから 目が のぞいた。', true); FX.play('face', null, { silent: true }); return; }
    if (f.kind === 'whisper' && f.arg === 'あそぼ') { var w = $('whisper'); w.textContent = '……あそぼ'; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on'); speakWhisper('あそぼ', { pitch: 1.6, rate: 0.7 }); UI_say('扉が閉まる。……どこかで、女の子の声。「あそぼ」', true); return; }
    FX.play(f.kind, f.arg);
  });
}
// ---------------- 追われる場面 ----------------
function renderChase(v) {
  var g = v.g, c = g.chase, el = $('chase');
  if (!c || g.phase === 'caught') { if (ui.chaseKind) { el.classList.remove('active'); ui.chaseKind = ''; setHoldLocal(false); } return; }
  if (ui.chaseKind !== c.kind) {
    ui.chaseKind = c.kind; ui.holdOn = false; ui.steps = 0; ui.sentSteps = 0; ui.nextFoot = 'L';
    overlay('zoom', false); overlay('hintModal', false); overlay('itemsModal', false); overlay('mapModal', false);
    if (c.kind === 'hide') el.innerHTML = '<h2>かくれて！</h2><div class="sub" id="chSub"></div><div class="slit" id="slit"><div class="gap"></div><div class="who">' + ART.figure() + '</div><div class="eye2"><svg width="20" height="10"><circle cx="5" cy="5" r="2" fill="#fff"/><circle cx="15" cy="5" r="2" fill="#fff"/></svg></div></div><button class="holdbtn" id="holdBtn">長押しで<br>息を止める</button><div class="gauge" id="chGauge"><i></i></div><div class="plist" id="chList"></div>';
    else if (c.kind === 'run') el.innerHTML = '<h2>にげて！</h2><div class="sub" id="chSub">足ボタンを <b>左・右・左・右</b>と 交互に連打！<br>みんなの足で 地下室まで走れ！</div><div class="gauge good" id="chGauge"><i></i></div><div class="feet"><button id="footL" data-f="L">👣<br><small style="font-size:13px">左</small></button><button id="footR" data-f="R">👣<br><small style="font-size:13px">右</small></button></div><div class="gauge" id="chTime"><i></i></div><div class="plist" id="chList"></div>';
    else el.innerHTML = '<h2>ろうそくを まもれ</h2><div class="sub" id="chSub">あの子の名前を よんだ。あれが 怒っている。<br><b>全員で</b> ボタンを長押しして、火を守りきれ！</div><div class="bigcandle" id="bigCandle"><div class="fl"></div><div class="wax"></div></div><button class="holdbtn" id="holdBtn">長押しで<br>火を守る</button><div class="gauge good" id="chGauge"><i></i></div><div class="plist" id="chList"></div>';
    el.classList.add('active');
    sfx.slam(); vibrate([200, 80, 200]);
    wireChase();
  }
  var me = g.me, names = g.names;
  if (c.kind === 'hide') {
    var warn = L.HIDE.warn, tl = Math.max(0, (warn + L.HIDE.hold - c.t) / 1000);
    $('chSub').innerHTML = c.t < warn ? '「何か」が来る！ クローゼットに とびこんで、<b>ボタンを長押し</b>で 息を止めて！' : '……息を止めて。のこり ' + tl.toFixed(0) + '秒。<br>指をはなすと、息の音が もれる。';
    var slit = $('slit'); if (c.t > warn + 600 && !slit.classList.contains('pass')) slit.classList.add('pass');
    slit.classList.toggle('peek', c.t > warn + L.HIDE.hold - 1800);
    $('chGauge').firstChild.style.width = Math.round((c.noise[me] || 0) * 100) + '%';
    $('chList').innerHTML = names.map(function (n, q) { return c.away[q] ? '' : '<span class="' + (c.holding[q] ? 'h' : 'n') + '">' + esc(n.name) + '：' + (c.holding[q] ? '息を止めている' : '息がもれている…') + '</span>'; }).filter(Boolean).join('<br>');
  } else if (c.kind === 'run') {
    $('chGauge').firstChild.style.width = Math.min(100, Math.round(c.total / Math.max(1, c.need) * 100)) + '%';
    $('chTime').firstChild.style.width = Math.max(0, Math.round((1 - c.t / L.RUN.dur) * 100)) + '%';
    $('chList').innerHTML = '地下室まで ' + Math.max(0, c.need - c.total) + '歩　・　のこり ' + Math.max(0, (L.RUN.dur - c.t) / 1000).toFixed(0) + '秒';
    $('footL').classList.toggle('next', ui.nextFoot === 'L'); $('footR').classList.toggle('next', ui.nextFoot === 'R');
  } else {
    $('chGauge').firstChild.style.width = Math.min(100, Math.round(c.prog / L.HOLD.need * 100)) + '%';
    $('bigCandle').classList.toggle('weak', !c.holding.every(function (h, q) { return h || c.away[q]; }));
    $('chList').innerHTML = names.map(function (n, q) { return c.away[q] ? '' : '<span class="' + (c.holding[q] ? 'h' : 'n') + '">' + esc(n.name) + '：' + (c.holding[q] ? '🕯 守っている' : 'はなしている！') + '</span>'; }).filter(Boolean).join('<br>');
  }
}
function setHoldLocal(on) { if (ui.holdOn === on) return; ui.holdOn = on; var b = $('holdBtn'); if (b) b.classList.toggle('on', on); if (lastView && lastView.g && lastView.g.chase) act('hold', { on: on }); }
function wireChase() {
  var hb = $('holdBtn');
  if (hb) {
    hb.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hb.setPointerCapture(e.pointerId); } catch (x) {} setHoldLocal(true); vibrate(30); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (k) { hb.addEventListener(k, function () { setHoldLocal(false); }); });
    hb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  ['footL', 'footR'].forEach(function (id) { var b = $(id); if (!b) return; b.addEventListener('pointerdown', function (e) { e.preventDefault(); var f = b.dataset.f; if (f === ui.nextFoot) { ui.steps++; ui.nextFoot = f === 'L' ? 'R' : 'L'; sfx.heart(0.2); } else vibrate(20); $('footL').classList.toggle('next', ui.nextFoot === 'L'); $('footR').classList.toggle('next', ui.nextFoot === 'R'); }); });
}
setInterval(function () { if (ui.chaseKind === 'run' && ui.steps > ui.sentSteps) { var k = Math.min(12, ui.steps - ui.sentSteps); ui.sentSteps += k; act('steps', { k: k }); } }, 150);
// ---------------- 見つかった ----------------
var WHY = { dread: '「何か」に 見つかった。気配が 満ちて、ろうそくが すべて 消えた。', hide: '息の音を 聞かれた。クローゼットの扉が、ゆっくりと ひらいた。', run: '追いつかれた。冷たい指が、首すじに ふれた。' };
function renderCaught(v) {
  var g = v.g, el = $('caught');
  if (g.phase !== 'caught') { if (ui.caughtShown) { el.classList.remove('active'); ui.caughtShown = false; } return; }
  if (!ui.caughtShown) {
    ui.caughtShown = true; overlay('zoom', false);
    FX.play('face', null, { silent: true });
    var nm = g.names[Math.max(0, g.me)] ? g.names[Math.max(0, g.me)].name : '';
    el.innerHTML = '<div class="face">' + (scareLv === 'mild' ? ART.figure() : ART.face(1)) + '</div><h2>みつかった</h2><p>' + esc(WHY[g.why] || WHY.dread) + '</p><p style="color:#b8a8ff">「……' + esc(nm) + '。ずっと、ここに いようね」</p><p style="font-size:12.5px;color:#a99f93">見つかった回数：' + g.deaths + '回　・　解いたなぞは そのまま</p>' +
      (host ? '<button class="btn main" id="retryBtn">🕯 チェックポイントから やりなおす</button>' : '<p style="font-size:13px">ホストの「やりなおす」を待っています…</p>');
    setTimeout(function () { el.classList.add('active'); var b = $('retryBtn'); if (b) b.onclick = function () { act('retry'); }; }, scareLv === 'mild' ? 300 : 650);
  }
}
// ---------------- しらべる（クローズアップ） ----------------
function findObj(g, room, id) { var r = g.rooms.filter(function (x) { return x.id === room; })[0]; return r && r.objects.filter(function (o) { return o.id === id; })[0]; }
function openObj(room, id) {
  var v = lastView; if (!v || !v.g) return; var o = findObj(v.g, room, id); if (!o) return;
  sfx.open(); ui.zoom = { room: room, id: id, key: '' };
  var vk = room + ':' + id; ui.visits[vk] = (ui.visits[vk] || 0) + 1;
  overlay('zoom', true); refreshZoom(v, true);
  if (o.kind === 'look' && o.trap && !ui.trapped[vk]) { ui.trapped[vk] = true; setTimeout(function () { if (ui.zoom && ui.zoom.id === id) { FX.play('face', null, { silent: true }); UI_say('……しらべた瞬間、なにかが とびだした。', true); act('scream'); } }, 900 + Math.random() * 700); }
  if (o.kind === 'look' && id === 'mirror' && ui.visits[vk] >= 2 && Math.random() < 0.5) setTimeout(function () { FX.play('mirror', null, { silent: true }); }, 1200);
  if (o.kind === 'look' && id === 'closet' && Math.random() < 0.4) FX.play('eyes', null, { silent: true });
}
function refreshZoom(v, force) {
  var z = ui.zoom, g = v.g, o = findObj(g, z.room, z.id);
  if (!o) { overlay('zoom', false); ui.zoom = null; return; }
  var key = JSON.stringify(o) + (o.id === 'altar' ? g.ring : '');
  if (!force && key === z.key) return; z.key = key;
  $('zTitle').textContent = o.label;
  $('zBody').innerHTML = zoomHtml(o, z.room, g);
  wireZoom(o, z.room);
}
function zoomHtml(o, room, g) {
  var d = o.data || {}, h = '';
  if (o.kind === 'look') {
    var n = ui.visits[room + ':' + o.id] || 1, t = o.t[Math.min(n - 1, o.t.length - 1)];
    if (n >= 2 && o.alt && Math.random() < 0.5) { t = o.alt; setTimeout(function () { var el = document.getElementById('lookText'); if (el) { el.textContent = o.t[0]; sfx.whisper(); } }, 1700); }
    return '<p class="zbody" id="lookText">' + esc(t) + '</p>' + (o.pre ? '<p class="znote">（いまは まだ、なにも できない。）</p>' : '');
  }
  if (o.kind === 'lock' && o.solved && o.pid !== 'ring') return '<div class="okmark">✓ もう 解けている</div><p class="zbody">' + esc(SOLVED_TXT[o.pid] || '') + '</p>';
  switch (room + ':' + o.id) {
    case 'hall:clock': var a = ui.inp.clock || (ui.inp.clock = { h: 12, m: 0 });
      return '<div style="text-align:center">' + ART.clockFace(a.h, a.m, 170) + '</div><div class="digits" style="font-size:22px">' + a.h + '時' + (a.m < 10 ? '0' : '') + a.m + '分</div>' +
        '<div class="row"><button class="zbtn" data-c="h-">時 ◀</button><button class="zbtn" data-c="h+">時 ▶</button><button class="zbtn" data-c="m-">分 ◀</button><button class="zbtn" data-c="m+">分 ▶</button></div><button class="btn main zgo" data-go="1">この時刻に 合わせる</button><p class="znote">止まった振り子時計。針を うごかせる。どの時刻に 合わせれば……？</p>';
    case 'nursery:book': return '<div class="paper old" style="text-align:center"><div style="font-size:13px;margin-bottom:6px">『もりの おうちの おんなのこ』　さいごのページ</div>' + ART.clockFace(d.h, d.m, 150) + '<p style="margin:8px 0 0;font-size:14.5px;line-height:1.8">とけいの はりが　こうなったとき、<br>おんなのこは　もりへ　いってしまいました。<br>だれも　さがしに　きませんでした。</p><p style="font-size:11px;margin:6px 0 0;opacity:.75">（ページのすみに 小さな字で「ママ、みつけて」）</p></div>';
    case 'hall:portraits': return '<div class="portraits">' + d.people.map(function (p, i) { return '<div class="ptr"><div class="sy">' + p.sym + '</div>' + ART.portrait(i) + '<div class="nm">' + esc(p.name) + '</div><span class="nu">' + p.num + '</span></div>'; }).join('') + '</div><p class="znote">黒森家の肖像画。額の上に しるし、下の札に 漢数字。娘の顔だけ、黒く ぬりつぶされている。</p>';
    case 'library:memo': return '<div class="paper"><p style="margin:0 0 10px">わたしたちの しるしを、じゅんばんに たどれ。<br>そうすれば、ひきだしは ひらく。</p><div style="font-size:40px;letter-spacing:12px;text-align:center;color:#3a1a0a">' + d.seq.join('') + '</div></div><p class="znote">書斎の板に ピンでとめられた メモ。</p>';
    case 'library:drawer': var s = ui.inp.drawer || ''; return '<div class="digits">' + [0, 1, 2, 3].map(function (i) { return '<span>' + (s[i] || '') + '</span>'; }).join('') + '</div><div class="zgrid">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<button class="zbtn" data-k="' + k + '">' + k + '</button>'; }).join('') + '<button class="zbtn" data-k="del">⌫</button><button class="zbtn" data-k="0">0</button><button class="zbtn" data-go="1" style="background:#5e0915">開</button></div><p class="znote">4ケタの数字錠が ついた引き出し。</p>';
    case 'kitchen:gramophone': return '<div style="text-align:center"><button class="btn sub" data-play="1">▶ レコードを かける</button></div><div class="dolls" id="gramRow" style="margin-top:10px;height:130px">' + d.seq.map(function (k, i) { return '<div class="doll" data-i="' + i + '" style="opacity:' + (ui.inp.gramSeen ? .9 : .08) + '">' + ART.doll(k, '#3a3040') + '</div>'; }).join('') + '</div><p class="znote">古い蓄音機。かけると、子守うたが 流れる。音が鳴るたび、ラベルに 人形の影が うかぶ（大きい人形ほど 低い音）。</p>';
    case 'nursery:musicbox': var mb = ui.inp.music || []; return '<div class="dolls">' + d.keys.map(function (k) { return '<button class="doll" data-n="' + k + '">' + ART.doll(k) + '</button>'; }).join('') + '</div><div class="slots">' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="' + (i < mb.length ? 'on' : '') + '">' + (i < mb.length ? '♪' : '') + '</i>'; }).join('') + '</div><button class="btn zgo" data-reset="1">やりなおす</button><p class="znote">こわれたオルゴール。人形を タップすると 音が鳴る。正しい子守うた（5音）を ならすと……。</p>';
    case 'library:cookbook': return '<div class="paper old"><div style="font-weight:900;margin-bottom:6px">― まよけの スープ ―</div>' + d.lines.map(function (l) { return '<span class="ln">・' + esc(l) + '</span>'; }).join('') + '<p style="font-size:11.5px;margin:8px 0 0;opacity:.75">（余白に 赤いインクで「あれに のませては いけない」）</p></div>';
    case 'kitchen:pot': var pi = ui.inp.pot || []; return '<div class="potline">' + (pi.length ? pi.map(function (i) { return ING_I[i] + L.INGS[i]; }).join(' → ') : '（鍋は からっぽ）') + '</div><div class="ings">' + L.INGS.map(function (n, i) { return '<button data-ing="' + i + '" class="' + (pi.indexOf(i) >= 0 ? 'used' : '') + '"><span>' + ING_I[i] + '</span>' + n + '</button>'; }).join('') + '</div><div class="row zgo"><button class="btn" data-reset="1">鍋をあける</button><button class="btn main" data-go="1"' + (pi.length === 4 ? '' : ' disabled') + '>火にかける</button></div><p class="znote">大鍋。材料を 4つ、正しい順番で いれよう。</p>';
    case 'nursery:drawing': return '<div class="paper crayon" style="background:#f2ecdf"><div class="wins">' + d.cols.map(function (c) { return '<div class="win" style="background:' + COL_HEX[c] + ';opacity:.85"></div>'; }).join('') + '</div><p style="font-family:inherit;margin:10px 0 0;text-align:center;font-size:16px;letter-spacing:2px;color:#444">ママと いっしょに みた まど</p></div><p class="znote">クレヨンで描いた 4つの窓。左から 色が ぬってある。</p>';
    case 'hall:candles': return '<div class="paper old">' + d.lines.map(function (x) { return '<span class="ln"><b style="color:' + COL_HEX[x[0]] + '">▮</b> ' + L.COLORS[x[0]] + 'い ろうそくは、<b>' + L.GSYMS[x[1]] + '</b> に ささげよ。</span>'; }).join('').replace(/みどりい/g, 'みどりの').replace(/きいろい/g, 'きいろい').replace(/あおい/g, 'あおい') + '</div><p class="znote">燭台の台座に 刻まれた 祈りのことば。</p>';
    case 'chapel:glass': var gi = ui.inp.glass || (ui.inp.glass = d.start.slice()); return '<div class="wins">' + gi.map(function (k, i) { return '<button class="win" data-w="' + i + '">' + ART.glyph(k) + '</button>'; }).join('') + '</div><button class="btn main zgo" data-go="1">祈りを ささげる</button><p class="znote">色の はげた ステンドグラス。窓を タップすると 絵が かわる（月・星・鳥・目）。昔は 色が ついていたらしい。</p>';
    case 'chapel:bell': return '<div class="bellbox"><div class="lantern" id="lantern"></div><button class="bellbtn" id="bellBtn">🔔</button><div class="slots" id="bellDots"></div></div><p class="znote">鐘のひも。<b>ランタンが光った瞬間に</b> 鐘を鳴らす。ずれると最初から。正しい回数を 鳴らしたら、手を止めて待とう。</p>';
    case 'kitchen:tally': var tm = ''; for (var i = 0; i < d.k; i++) tm += '<i></i>'; return '<div class="tally">' + tm + '</div><p class="zbody" style="text-align:center;font-size:14px">（チョークの字で）かねは　この　かずだけ</p>';
    case 'library:directory': return '<div class="paper"><div style="font-weight:900;margin-bottom:6px">― 館内 内線表 ―</div><table class="dir">' + d.list.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + x[1] + '</td></tr>'; }).join('') + '</table></div>';
    case 'chapel:altarnote': return '<div class="paper old"><p style="margin:0;line-height:1.9">あの子は かくれんぼが 大好きでした。<br>いつも〈<b>' + esc(d.place) + '</b>〉に かくれて、わたしが 見つけるのを 待っていた。<br>……電話で よんだら、まだ 返事を してくれるかしら。</p><p style="text-align:right;margin:6px 0 0;font-size:13px">― 澄江</p></div>';
    case 'hall:phone': var ps = ui.inp.phone || ''; return '<div class="digits">' + [0, 1, 2].map(function (i) { return '<span>' + (ps[i] || '') + '</span>'; }).join('') + '</div><div class="dial">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function (k) { return '<button class="zbtn" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div><div class="row zgo"><button class="btn" data-k="del">⌫ けす</button><button class="btn main" data-go="1">☎ かける</button></div><p class="znote">黒電話。3ケタの内線番号を まわす。線は 切れているはずなのに……。</p>';
    case 'kitchen:shadows': return '<div class="wall">' + d.order.map(function (k) { return ART.animal(k, '#111', 56); }).join('') + '</div><p class="znote">白い壁に、4つの影が ならんで すわっている。だれも いないのに。左から じゅんばんに……。</p>';
    case 'nursery:tea': var ti = ui.inp.tea || (ui.inp.tea = [0, 1, 2, 3]); return '<div class="chairs">' + ti.map(function (k, i) { return '<button class="chair" data-ch="' + i + '">' + ART.animal(k, '#d8c8b8', 44) + L.DOLLS[k] + '</button>'; }).join('') + '</div><button class="btn main zgo" data-go="1">お茶会を はじめる</button><p class="znote">人形のお茶会。いすを タップすると すわる人形が かわる。正しい席に すわらせると……。</p>';
    case 'basement:altar': var lit = ''; for (var j = 0; j < g.girlLen; j++) lit += j < g.ring ? '●' : '○';
      return '<div class="ringprog">' + lit + '</div><div class="stones">' + d.stones.map(function (s) { return '<button class="stone' + (s.used ? ' used' : '') + '" data-st="' + s.id + '">' + esc(s.ch) + '</button>'; }).join('') + '</div><p class="znote">名前の祭壇。<b>あの子の名前</b>の文字を、1もじめから 順番に 光らせる。' + (g.n > 1 ? '石は みんなの画面に 分かれている。<b>「つぎは だれの石？」</b>と声をかけて！' : '') + 'まちがえると 光が ぜんぶ消える。</p>';
  }
  return '<p class="zbody">……</p>';
}
var SOLVED_TXT = { clock: '振り子が うごきだした。時計の中から、日記のページが 1枚 落ちてきた。', portrait: '引き出しが ひらいた。中には 日記のページ。', music: 'オルゴールが 子守うたを かなでる。人形が くるりと回り、日記のページを 落とした。', recipe: 'スープが 湯気を立てる。鍋の底から、日記のページ。', glass: '窓に 色が もどった。光の中に、名前のかけらが うかぶ。', bell: '鐘の音が 館じゅうに ひびいた。名前のかけらが 落ちてきた。', phone: '受話器の向こうで、小さな声。「……みつけて」。名前のかけらを 手に入れた。', dolls: '人形たちが お茶を飲むふりをした。テーブルの下に、さいごの日記。' };
// ---- クローズアップの操作 ----
var bellLoop = null;
function stopBell() { if (bellLoop) { clearInterval(bellLoop.iv); clearTimeout(bellLoop.to); bellLoop = null; } }
function tryPuz(pid, ans) { act('try', { pid: pid, ans: ans }); }
function wireZoom(o, room) {
  stopBell();
  var zb = $('zBody'), pid = o.pid, k = room + ':' + o.id;
  if (o.kind === 'look' || (o.kind === 'lock' && o.solved && pid !== 'ring')) return;
  var rerender = function () { ui.zoom.key = ''; refreshZoom(lastView, true); };
  zb.onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (k === 'hall:clock') {
      var a = ui.inp.clock;
      if (b.dataset.c === 'h+') a.h = a.h % 12 + 1; if (b.dataset.c === 'h-') a.h = (a.h + 10) % 12 + 1;
      if (b.dataset.c === 'm+') a.m = (a.m + 5) % 60; if (b.dataset.c === 'm-') a.m = (a.m + 55) % 60;
      if (b.dataset.go) { tryPuz('clock', { h: a.h, m: a.m }); return; }
      sfx.ui(); rerender(); return;
    }
    if (k === 'library:drawer' || k === 'hall:phone') {
      var key = k === 'hall:phone' ? 'phone' : 'drawer', len = key === 'phone' ? 3 : 4, s = ui.inp[key] || '';
      if (b.dataset.k === 'del') s = s.slice(0, -1); else if (b.dataset.k != null && s.length < len) s += b.dataset.k;
      ui.inp[key] = s;
      if (b.dataset.go) { if (s.length < len) { toast(len + 'ケタ いれてね'); return; } ui.inp[key] = ''; if (key === 'phone') { sfx.phone(1.2); setTimeout(function () { tryPuz('phone', s); }, 700); } else tryPuz('portrait', s); rerender(); return; }
      sfx.ui(); rerender(); return;
    }
    if (k === 'kitchen:gramophone' && b.dataset.play) {
      var seq = o.data.seq; b.disabled = true; ui.inp.gramSeen = true;
      seq.forEach(function (n, i) { setTimeout(function () { sfx.note(n); var el = document.querySelector('#gramRow .doll[data-i="' + i + '"]'); if (el) { el.style.opacity = 1; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } if (i === seq.length - 1) setTimeout(function () { b.disabled = false; if (Math.random() < 0.25) { sfx.giggle(); UI_say('……うたの さいごに、だれかが いっしょに ハミングしていた。', true); } }, 700); }, 300 + i * 650); });
      return;
    }
    if (k === 'nursery:musicbox') {
      if (b.dataset.reset) { ui.inp.music = []; rerender(); return; }
      if (b.dataset.n != null) {
        var n = +b.dataset.n, mb = ui.inp.music || (ui.inp.music = []); sfx.note(n); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
        mb.push(n); if (mb.length > 5) mb.shift();
        var dots = zb.querySelectorAll('.slots i'); dots.forEach(function (d, i) { d.classList.toggle('on', i < mb.length); d.textContent = i < mb.length ? '♪' : ''; });
        if (mb.length === 5) { var ans = mb.slice(); ui.inp.music = []; setTimeout(function () { tryPuz('music', ans); if (lastView && ui.zoom) rerender(); }, 600); }
      }
      return;
    }
    if (k === 'kitchen:pot') {
      var pi = ui.inp.pot || (ui.inp.pot = []);
      if (b.dataset.reset) { ui.inp.pot = []; sfx.ui(); rerender(); return; }
      if (b.dataset.ing != null) { var i2 = +b.dataset.ing; if (pi.indexOf(i2) < 0 && pi.length < 4) { pi.push(i2); sfx.drip(); } rerender(); return; }
      if (b.dataset.go && pi.length === 4) { var pa = pi.slice(); ui.inp.pot = []; tryPuz('recipe', pa); rerender(); }
      return;
    }
    if (k === 'chapel:glass') {
      if (b.dataset.w != null) { var w = +b.dataset.w; ui.inp.glass[w] = (ui.inp.glass[w] + 1) % 4; sfx.ui(); rerender(); return; }
      if (b.dataset.go) tryPuz('glass', ui.inp.glass.slice());
      return;
    }
    if (k === 'nursery:tea') {
      if (b.dataset.ch != null) { var c = +b.dataset.ch; ui.inp.tea[c] = (ui.inp.tea[c] + 1) % 4; sfx.ui(); rerender(); return; }
      if (b.dataset.go) tryPuz('dolls', ui.inp.tea.slice());
      return;
    }
    if (k === 'basement:altar' && b.dataset.st) { if (b.classList.contains('used')) return; act('ring', { id: b.dataset.st }); return; }
  };
  if (k === 'chapel:bell') wireBell();
}
// 鐘：ランタンの光に合わせて（±0.26秒）。正しい回数で止めて待つと判定
function wireBell() {
  var beat = T.bell, t0 = performance.now() + 600, good = 0, lastGood = 0, done = false;
  bellLoop = { iv: 0, to: 0 };
  function dots() { var el = $('bellDots'); if (el) el.innerHTML = good ? Array(good + 1).join('<i class="on">🔔</i>') : '<i></i>'; }
  dots();
  bellLoop.iv = setInterval(function () {
    var now = performance.now(), ph = ((now - t0) % beat + beat) % beat, lit = now > t0 && (ph < 170);
    var ln = $('lantern'); if (!ln) { stopBell(); return; } ln.classList.toggle('on', lit);
    if (good && !done && now - lastGood > beat * 2.4) { done = true; var n = good; good = 0; dots(); tryPuz('bell', n); setTimeout(function () { done = false; }, 600); }
  }, 30);
  $('bellBtn').addEventListener('pointerdown', function (e) {
    e.preventDefault(); if (done) return;
    var now = performance.now(), ph = ((now - t0) % beat + beat) % beat, off = Math.min(ph, beat - ph);
    sfx.bell();
    if (now > t0 - 300 && off < 260) { good++; lastGood = now; }
    else { if (good) { sfx.wrong(); toast('ずれた…最初から'); } good = 0; if (Math.random() < 0.15) FX.play('giggle'); }
    dots();
  });
}
$('zClose').onclick = function () { overlay('zoom', false); ui.zoom = null; stopBell(); };
$('zoom').addEventListener('click', function (e) { if (e.target === this) { overlay('zoom', false); ui.zoom = null; stopBell(); } });
// ---- タブ・部屋のもの ----
$('tabs').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.r) { ui.room = b.dataset.r; ui.sceneKey = ''; sfx.open(); renderGame(lastView); UI_say(statusLine(lastView)); return; }
  if (b.dataset.other) { var m = lastView.g.map.filter(function (x) { return x.id === b.dataset.other; })[0]; toast(L.RN[m.id] + 'は ' + (m.owners.join('・') || '？') + ' の画面に あります。声をかけて、見えているものを 教えてもらおう！', 4000); }
});
$('stage').addEventListener('click', function (e) { var h = e.target.closest('.hs'); if (!h || !ui.room) return; openObj(ui.room, h.dataset.o); });
// ---- ヒント ----
var FUU_LINES = ['ひ、ひぃぃ…こわいクマ…。でも、ヒントなら まかせてクマ…！', 'うしろ…いま、うしろに なにか いなかったクマ…？ あ、ヒントだったクマ。', 'ぼく、くらいの にがてクマ…。いっしょに がんばるクマ…！', 'ヒントを聞くと「何か」が 少し近づくクマ…ご、ごめんクマ…'];
function renderHint() {
  var v = lastView; if (!v || !v.g) return; var g = v.g;
  var open = g.puz.filter(function (p) { return !p.solved; });
  $('hintBody').innerHTML = '<div class="fuu">' + ART.fuu() + '<div class="bub">' + esc(pick(FUU_LINES)) + '</div></div><div class="hlist">' + (open.length ? open.map(function (p) {
    return '<div class="hitem"><div class="hn"><span>' + esc(p.name) + '<br><small style="color:#a99f93;font-weight:700">' + L.RI[p.room] + L.RN[p.room] + (g.n > 1 ? '（' + esc(p.owner) + '）' : '') + '</small></span>' + (p.lv < 3 ? '<button data-h="' + p.id + '">ヒント ' + (p.lv + 1) + '/3<br><small>気配+4</small></button>' : '') + '</div>' + (p.hints.length ? '<ol>' + p.hints.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' : '') + '</div>';
  }).join('') : '<p class="mid">いま 解けるなぞは ないクマ…。</p>') + '</div>';
}
$('hintBtn').onclick = function () { renderHint(); overlay('hintModal', true); };
$('hintBody').addEventListener('click', function (e) { var b = e.target.closest('button[data-h]'); if (!b) return; act('hint', { pid: b.dataset.h }); setTimeout(renderHint, 250); });
$('hintClose').onclick = function () { overlay('hintModal', false); };
// ---- 日記 ----
function renderItems() {
  var v = lastView; if (!v || !v.g) return; var g = v.g, sh = {};
  g.items.forEach(function (i) { if (i.kind === 'shard') sh[i.pos] = i.ch; });
  ui.itemsSeen = g.items.length; $('itemsBtn').classList.remove('new');
  var ds = g.items.filter(function (i) { return i.kind === 'diary'; }).slice().reverse();
  $('itemsBody').innerHTML = '<div class="lab">名前のかけら</div><div class="shards">' + [0, 1, 2].map(function (i) { return '<span>' + (sh[i] ? esc(sh[i]) : '？') + '<small>' + (i + 1) + 'もじめ</small></span>'; }).join('') + '</div>' +
    (ds.length ? ds.map(function (d) { return '<div class="paper old diary"><div class="no">日記 その' + d.n + '</div>' + esc(d.text) + '</div>'; }).join('') : '<p class="mid">まだ 日記は 見つかっていない。なぞを解くと 手に入る。</p>');
}
$('itemsBtn').onclick = function () { renderItems(); overlay('itemsModal', true); };
$('itemsClose').onclick = function () { overlay('itemsModal', false); };
// ---- だれがどこ ----
$('mapBtn').onclick = function () {
  var g = lastView && lastView.g; if (!g) return;
  $('mapBody').innerHTML = '<div class="splitList">' + g.map.map(function (m) { return L.RI[m.id] + ' <b>' + m.name + '</b>：' + esc(m.owners.join('・')); }).join('<br>') + '</div><div class="lab" style="margin-top:12px">なぞ</div><div class="splitList">' +
    g.puz.map(function (p) { return (p.solved ? '✅ ' : '⬜ ') + esc(p.name) + ' <span style="color:#a99f93">（' + L.RN[p.room] + '）</span>'; }).join('<br>') + '</div><p class="hint">見つかった回数 ' + g.deaths + '・ヒント ' + g.hints + '・まちがい ' + g.wrong + '</p>';
  overlay('mapModal', true);
};
$('mapClose').onclick = function () { overlay('mapModal', false); };
// ---------------- エンディング ----------------
function renderEnd(v) {
  var g = v.g, key = v.gameNo + ':' + g.ending.girl; if (ui.endKey === key) return; ui.endKey = key;
  var names = g.names.map(function (n) { return n.name; }), girl = g.ending.girl, cnt = names.length;
  var ps = ['あなたたちは、祭壇の前で あの子の名前を よんだ。<br>「<b>' + esc(girl) + '</b>」', '地下の空気が、ふっと やわらいだ。ろうそくの火が まっすぐに立ち、どこかで 小さな女の子が「ママ」と言った。<br>それは もう だれの声でもない、あの子自身の声だった。',
    '名前を うしなった「何か」は、声を なくして、霧のように ほどけていった。<br>玄関の扉が、ひとりでに ひらく。', '外は 夜明けだった。森を抜けて ふりかえると、そこに 洋館は なかった。<br>古い木の札が 1枚、立っているだけ。〈黒森邸跡〉。',
    '……帰り道。だれかが うしろから、あなたの名前を よんだ。<br><b>ふりむいては いけない。</b>', '家に着いて、人数を かぞえた。<br><b style="font-size:20px;color:#ffb0bc">' + (cnt + 1) + '人</b> いた。'];
  $('story').innerHTML = ps.map(function (p, i) { return '<p style="animation-delay:' + (0.4 + i * 1.6) + 's">' + p + '</p>'; }).join('');
  var mins = Math.floor(g.t / 60000), secs = Math.floor(g.t / 1000) % 60;
  $('stats').innerHTML = '<div>脱出までの時間<b>' + mins + '分' + secs + '秒</b></div><div>見つかった回数<b>' + g.deaths + '回</b></div><div>ふーさんのヒント<b>' + g.hints + '回</b></div><div>まちがい<b>' + g.wrong + '回</b></div>';
  $('roll').innerHTML = '<div style="color:#a99f93;font-size:12px">館を出た人</div>' + names.map(function (n) { return esc(n); }).join('<br>') + '<br><span class="ghost">' + esc(girl) + '</span><div style="margin-top:12px;font-size:12px;color:#a99f93">〜 END 〜<br>よびごえの館　／　<b>ふらっとgames</b>　制作 watg</div>';
  $('end').scrollTop = 0;
  sfx.correct();
  setTimeout(function () { if (ui.endKey === key) speakWhisper('ありがとう', { pitch: 1.6, rate: 0.7 }); }, 9000);
}
