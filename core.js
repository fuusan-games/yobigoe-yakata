/* よびごえの館：共通の定数・小道具・汎用UI・設定（ほかのスクリプトより先に読み込む）
 * 構成：WebRTC（PeerJS）による P2P。ホストのブラウザが唯一の正（authoritative）で、なぞの答え・気配・こわい出来事の発生はホストが決め、全員に同時に届けます。
 * 各プレイヤーには「自分が見ている部屋」の中身だけが送られます（ほかの人の部屋の手がかりは届かない）。
 */
'use strict';
var $ = function (id) { return document.getElementById(id); };
var L = window.HM;
var Q = new URLSearchParams(location.search);
var CFG = window.HM_CONFIG || {};
var ICE = (CFG.iceServers && CFG.iceServers.length) ? CFG.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }];
if (Q.get('ice')) ICE = Q.get('ice').split(',').map(function (u) { return { urls: u }; });   // テスト・独自環境用
var PEER_OPTS = Object.assign({ debug: 1, config: { iceServers: ICE } }, CFG.peer || {});
var ID_PREFIX = 'yobigoe-v1-', CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
var TURBO = Q.has('turbo');
// T.k：こわい出来事の間隔などの時間倍率（turbo はテスト用に速く）
var T = TURBO ? { k: 0.12, tick: 40, intro: 300, bell: 700 } : { k: 1, tick: 100, intro: 6000, bell: 900 };
var MAX_HUMANS = 4, HB_MS = 3000, LOST_MS = 10000;
var LS_ID = 'hm-client-id', LS_NAME = 'hm-name', LS_HOST = 'hm-host-room', SS_CLIENT = 'hm-joined', LS_SOUND = 'hm-sound-off', LS_SCARE = 'hm-scare', SS_WARN = 'hm-warned';
var SCARE = { strong: 'つよめ', normal: 'ふつう', mild: 'ひかえめ' }, SCARE_KEYS = ['strong', 'normal', 'mild'];
var host = null, client = null, lastView = null, pending = '';
function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
function load(k, json) { try { var v = localStorage.getItem(k); return json ? JSON.parse(v) : v; } catch (e) { return null; } }
function sstore(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function sload(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
function rid(n) { var s = ''; for (var i = 0; i < n; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; return s; }
var myId = load(LS_ID) || (function () { var v = rid(16); store(LS_ID, v); return v; })();
var soundOff = load(LS_SOUND) === '1';
var scareLv = SCARE_KEYS.indexOf(load(LS_SCARE)) >= 0 ? load(LS_SCARE) : 'normal';
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function rand(a, b) { return a + Math.random() * (b - a); }
function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 8); }
function genCode() { var c = ''; for (var i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
function normCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1').slice(0, 4); }
function inviteUrl(code) { var u = location.origin + location.pathname + '?room=' + code; if (Q.get('ice')) u += '&ice=' + encodeURIComponent(Q.get('ice')); return u; }

// ---------- 汎用UI ----------
function show(id) { ['title', 'lobby', 'game', 'end'].forEach(function (s) { $(s).classList.toggle('active', s === id); }); document.body.classList.toggle('in-game', id === 'game'); }
function overlay(id, on) { $(id).classList.toggle('active', on); }
var toastT;
function toast(msg, ms) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, ms || 3000); }
function banner(msg) { var b = $('banner'); b.textContent = msg || ''; b.classList.toggle('show', !!msg); }
function confirmBox(title, text, yes, cb) {
  $('cfTitle').textContent = title; $('cfText').textContent = text; $('cfYes').textContent = yes; $('cfNo').style.display = '';
  overlay('confirmModal', true);
  $('cfYes').onclick = function () { overlay('confirmModal', false); cb(); };
  $('cfNo').onclick = function () { overlay('confirmModal', false); };
}
function alertBox(msg) { confirmBox('お知らせ', msg, 'OK', function () {}); $('cfNo').style.display = 'none'; }
function connecting(on, title, text, onCancel) {
  overlay('connecting', on);
  if (on) { $('connTitle').textContent = title || '接続中…'; $('connText').textContent = text || ''; $('connCancel').onclick = onCancel || function () { location.href = location.pathname; }; }
}
$('rulesBtn1').onclick = $('rulesBtn2').onclick = function () { overlay('rulesModal', true); };
$('rulesClose').onclick = function () { overlay('rulesModal', false); };
['rulesModal', 'menuModal', 'hintModal', 'itemsModal', 'mapModal'].forEach(function (id) { $(id).addEventListener('click', function (e) { if (e.target === this) overlay(id, false); }); });
$('rulesList').innerHTML = [
  '嵐の夜、森の洋館に閉じこめられた。<b>なぞを解いて</b>、館の奥へ進み、脱出しよう。1〜4人の<b>協力</b>ゲームです（約20〜40分）。',
  '<b>みんなで遊ぶと、スマホごとに見える部屋がちがいます。</b> たとえば「引き出しの暗号」は あなたの部屋、「答えの手がかり」は ほかの人の部屋…。<b>声をかけあって</b>、見えているものを伝えあおう。ひとりのときは、上のタブで全部の部屋を行き来できます。',
  '部屋の中の<b>ものをタップ</b>して しらべよう。<span style="color:#ff8a9a">赤い枠</span>は 答えを入れる場所（鍵）、<span style="color:#ffc878">黄色い枠</span>は 手がかり。見えない部屋のタブには、その部屋を見ている人の名前が出ます。',
  '上の <b>👁 気配</b> は「何か」が近づいている度合い。時間とともに増え、<b>まちがえる</b>・<b>ヒントを聞く</b>と増え、<b>なぞを解く</b>と下がります。いっぱいになると…<b style="color:#ff6b7d">見つかります</b>。',
  'ときどき「何か」が来ます。<b>「息を止めて」</b>（ボタンを長押し）や<b>「にげて」</b>（足ボタンを交互に連打）は、<b>全員</b>でやりきろう。',
  '見つかってしまっても、<b>チェックポイント</b>（解いたなぞはそのまま）から やり直せます。',
  'こまったら <b>🐻 ふーさん</b> にヒントを聞こう（3段階。3つめは答え）。こわがりだけど がんばって教えてくれます。',
  '集めた <b>📜 日記</b> を読むと、館で何があったのかが わかります。<b>名前のかけら</b>は 最後に必要です。',
  '⚠ 突然の音・顔・振動があります。「びっくり演出」で つよめ／ふつう／ひかえめ を選べます（各自のスマホごと）。激しい点滅はありません。'
].map(function (t) { return '<li>' + t + '</li>'; }).join('');

// ---------- 設定（びっくり演出・音） ----------
function scareSegs() {
  ['scareSeg1', 'scareSeg2', 'scareSeg3'].forEach(function (id) {
    $(id).innerHTML = SCARE_KEYS.map(function (k) { return '<button data-v="' + k + '" class="' + (k === scareLv ? 'on' : '') + '">' + SCARE[k] + '</button>'; }).join('');
  });
}
['scareSeg1', 'scareSeg2', 'scareSeg3'].forEach(function (id) {
  $(id).addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (!b) return; scareLv = b.dataset.v; store(LS_SCARE, scareLv); scareSegs(); toast('びっくり演出：' + SCARE[scareLv]); });
});
scareSegs();
