/* よびごえの館：流れ・ボタン操作・タイトル（最後に読み込む） */
'use strict';
// テスト・デバッグ用（render より前に用意しておく）
window.__hm = { view: null, jumps: 0, act: function (a, v) { act(a, v); }, bgm: function () { return BGM.state(); }, bgmLevel: function () { return BGM.level(); }, play: function (k, a) { FX.play(k, a); },
  role: function () { return host ? 'host' : client ? 'client' : 'none'; }, hostRoom: function () { return host ? host.room : null; },
  answer: function (pid) { return host && host.room.G ? L.answerOf(host.room.G.S, pid) : null; },
  owner: function (pid) { if (!host || !host.room.G) return null; var S = host.room.G.S, r = L.PZ[pid].lock.split(':')[0]; return L.ownersOf(S, r).map(function (p) { return host.room.G.players[p].sid; }); },
  stones: function () { if (!host || !host.room.G) return null; var S = host.room.G.S; return S.D.ring.stones.slice(0, S.girl.length).map(function (s, i) { return { id: s.id, sid: host.room.G.players[L.stoneOwner(S, i)].sid }; }); },
  hostFx: function (k, arg) { if (host && host.room.G) { fx(k, 0, arg); flushFx(Date.now()); hostBroadcast(); } },
  setDread: function (x) { if (host && host.room.G) { host.room.G.S.dread = x; if (x >= 100) L.addDread(host.room.G.S, 0); hostBroadcast(); } },
  calm: function () { if (host && host.room.G) { host.room.G.nextScare = Date.now() + 1e9; host.room.G.faceAt = Date.now() + 1e9; } },
  open: function (room, id) { ui.room = room; ui.sceneKey = ''; if (lastView) renderGame(lastView); openObj(room, id); },
  refresh: function () { if (host) hostBroadcast(); } };

// ---- 操作（ホストも参加者も同じ入口） ----
function act(a, val) {
  var v = lastView; if (!v || v.phase !== 'game' || !v.g) return;
  var m = { t: 'act', a: a, v: val, g: v.gameNo };
  if (host) { var err = hostAction(1, m); if (err) toast(err); return; }
  send(m);
}
// ---- 警告（ゲームに入る前に1回） ----
$('warnGo').onclick = function () { unlockAudio(); ui.warned = true; sstore(SS_WARN, 1); overlay('warnModal', false); sfx.slam(); };
// ---- ホストのロビー操作 ----
$('seatList').addEventListener('click', function (e) {
  var b = e.target.closest('button[data-sid]'); if (!b || !host) return;
  var R = host.room, seat = seatBySid(+b.dataset.sid);
  if (!seat || seat.kind !== 'remote' || R.phase !== 'lobby') return;
  var doRemove = function () {
    var c = host.conns[seat.clientId]; if (c) { try { c.send({ t: 'kicked' }); } catch (x) {} setTimeout(function () { try { c.close(); } catch (x) {} }, 300); delete host.conns[seat.clientId]; }
    R.seats.splice(R.seats.indexOf(seat), 1); hostBroadcast();
  };
  if (seat.connected) confirmBox(seat.name + 'を外しますか？', '部屋から退出させます。', '外す', doRemove); else doRemove();
});
$('startBtn').onclick = function () { if (host) { unlockAudio(); hostStartGame(); } };
$('againBtn').onclick = function () { if (host) hostStartGame(); };
$('toLobbyBtn').onclick = function () { if (host) hostToLobby('ロビーに戻りました'); };
function copyUrl() {
  var u = $('inviteUrl').textContent;
  function legacy() { try { var ta = document.createElement('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, u.length); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } }
  var p = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(u) : Promise.reject();
  p.then(function () { toast('招待URLをコピーしました'); }, function () { toast(legacy() ? '招待URLをコピーしました' : 'URLを長押ししてコピーしてください'); });
}
$('copyBtn').onclick = copyUrl;
$('shareBtn').onclick = function () {
  var data = { title: 'よびごえの館', text: 'いっしょに「よびごえの館」から脱出しよう…（部屋コード ' + $('codeBig').textContent + '）', url: $('inviteUrl').textContent };
  if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) return copyUrl();
  try { navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') copyUrl(); }); } catch (e) { copyUrl(); }
};
// ---- 退出・メニュー ----
function leaveRoom() {
  if (host) {
    var solo = host.room.solo;
    confirmBox(solo ? 'ゲームをやめますか？' : '部屋を閉じますか？', solo ? 'タイトルに戻ります。' : '参加者全員の接続が切れ、ゲームは終了します。', solo ? 'やめる' : '部屋を閉じる', function () {
      Object.keys(host.conns).forEach(function (cid) { try { host.conns[cid].send({ t: 'closed' }); } catch (e) {} });
      store(LS_HOST, null);
      setTimeout(function () { try { if (host.peer) host.peer.destroy(); } catch (e) {} location.href = location.pathname + location.search.replace(/([?&])room=[^&]*/, '$1'); }, 300);
    });
  } else confirmBox('部屋を出ますか？', 'ゲーム中に出た場合も、同じニックネームで入り直せば元の席に戻れます。', '部屋を出る', function () { sstore(SS_CLIENT, null); leaveClient(true); });
}
$('leaveBtn1').onclick = $('leaveBtn2').onclick = leaveRoom;
$('menuBtn').onclick = function () { overlay('menuModal', true); };
function confirmAbort() {
  confirmBox('中断してロビーに戻りますか？', 'いまのゲームを終了して、全員をこの部屋のロビーに戻します。部屋コード・参加者はそのままです。', '中断してロビーへ', function () {
    if (host && host.room.phase !== 'lobby') hostToLobby('⏸️ ホストがゲームを中断しました');
  });
}
$('menuAbort').onclick = function () { overlay('menuModal', false); confirmAbort(); };
$('menuReq').onclick = function () { overlay('menuModal', false); if (send({ t: 'lobbyReq' })) toast('ホストに「ロビーに戻りたい」と伝えました'); };
$('menuLeave').onclick = function () { overlay('menuModal', false); leaveRoom(); };
$('menuRules').onclick = function () { overlay('menuModal', false); overlay('rulesModal', true); };
$('menuClose').onclick = function () { overlay('menuModal', false); };
$('lobbyReqBar').addEventListener('click', function (e) {
  var b = e.target.closest('button[data-lr]'); if (!b || !host) return;
  if (b.dataset.lr === 'no') { host.room.lobbyReq = null; hostBroadcast(); } else confirmAbort();
});
// ---------------- タイトル ----------------
function renderTitle() {
  if (!$('nameIn').value) $('nameIn').value = load(LS_NAME) || '';
  var inv = normCode(Q.get('room'));
  $('inviteJoinBox').style.display = inv.length === 4 ? '' : 'none';
  $('invCode').textContent = inv;
  if (inv.length === 4) $('codeIn').value = inv;
  var saved = load(LS_HOST, true), ok = saved && saved.room && Date.now() - saved.saved < 12 * 3600 * 1000;
  $('resumeBtn').style.display = ok ? '' : 'none';
  if (ok) $('resumeBtn').textContent = saved.room.solo ? '前回のひとり用ゲームを再開する' : '前回の部屋（' + saved.room.code + '）を再開する';
  var joined = sload(SS_CLIENT);
  $('rejoinBtn').style.display = joined ? '' : 'none';
  if (joined) $('rejoinBtn').textContent = '部屋 ' + joined.code + ' に戻る（' + joined.name + '）';
  BGM.want('title');
}
function getName(optional) {
  var n = cleanName($('nameIn').value);
  if (!n) { if (optional) return 'あなた'; toast('ニックネームを入力してください'); $('nameIn').focus(); return null; }
  store(LS_NAME, n); return n;
}
$('createBtn').onclick = function () { var n = getName(); if (n) { unlockAudio(); store(LS_HOST, null); startHost(n, null, false); } };
$('soloBtn').onclick = function () { var n = getName(true); unlockAudio(); store(LS_HOST, null); startHost(n, null, true); };
$('resumeBtn').onclick = function () {
  var saved = load(LS_HOST, true); if (!saved) return; unlockAudio();
  startHost(saved.room.seats[0].name, saved.room, saved.room.solo); host.resuming = true;
};
function join(code) {
  var n = getName(); if (!n) return;
  code = normCode(code);
  if (code.length !== 4) { toast('4文字の部屋コードを入力してください'); return; }
  unlockAudio(); startClient(code, n);
}
$('joinBtn').onclick = function () { join($('codeIn').value); };
$('joinInvitedBtn').onclick = function () { join(Q.get('room')); };
$('rejoinBtn').onclick = function () { var j = sload(SS_CLIENT); if (j) { $('nameIn').value = j.name; unlockAudio(); startClient(j.code, j.name); } };
$('codeIn').addEventListener('input', function () { this.value = normCode(this.value); });
if (location.protocol === 'file:') setTimeout(function () { toast('ファイルを直接開いています。招待URLは公開URL（https）でのみ使えます。'); }, 500);

// ---- ページ全体の引っぱり（バウンス・プルで閉じる・プルで再読み込み）とピンチを止める ----
var touch0 = null;
document.addEventListener('touchstart', function (e) { if (e.touches.length === 1) touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener('touchmove', function (e) {
  if (!e.cancelable) return;
  if (e.touches.length > 1) { e.preventDefault(); return; }
  if (!touch0) return;
  var t = e.touches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y, ax = Math.abs(dx), ay = Math.abs(dy);
  if (!ax && !ay) return;
  for (var el = e.target; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
    var cs = getComputedStyle(el);
    var canV = ay >= ax * 0.5 && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && ((dy > 0 && el.scrollTop > 0) || (dy < 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1));
    var canH = ax >= ay * 0.5 && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && ((dx > 0 && el.scrollLeft > 0) || (dx < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1));
    if (canV || canH) return;
  }
  e.preventDefault();
}, { passive: false });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
renderTitle();
