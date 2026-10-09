/* よびごえの館：ゲームエンジン（DOMに依存しない。ブラウザでは window.HM、Node では require で使う）
 * 部屋・なぞ・手がかりの配置、答えの生成と判定、「何か」の気配（dread）、かくれる／にげる／ろうそくの儀、チェックポイント。
 */
(function (root) {
'use strict';
function mulberry(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function ri(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function shuffle(rng, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

var ROOMS = ['hall', 'library', 'nursery', 'kitchen', 'chapel', 'basement'];
var RN = { hall: '玄関ホール', library: '書斎', nursery: '子ども部屋', kitchen: '台所', chapel: '礼拝堂', basement: '地下室' };
var RI = { hall: '🕰', library: '📚', nursery: '🧸', kitchen: '🍲', chapel: '⛪', basement: '🕯' };
var ACT_ROOMS = { 1: ['hall', 'library', 'nursery', 'kitchen'], 2: ['hall', 'library', 'nursery', 'kitchen', 'chapel'], 3: ['hall', 'library', 'nursery', 'kitchen', 'chapel', 'basement'] };
// 人数ごとの部屋の割り当て（地下室は全員）。どのなぞも「鍵」と「手がかり」が別の人の画面に分かれるように組んである（test で検証）
var ASSIGN = {
  1: [['hall', 'library', 'nursery', 'kitchen', 'chapel']],
  2: [['hall', 'kitchen'], ['library', 'nursery', 'chapel']],
  3: [['hall', 'kitchen'], ['library', 'chapel'], ['nursery']],
  4: [['hall'], ['library', 'chapel'], ['nursery'], ['kitchen']]
};
// なぞ：lock＝答えを入れる場所、clues＝手がかりのある場所（部屋:もの）
var PUZ = [
  { id: 'clock', act: 1, name: '止まった振り子時計', lock: 'hall:clock', clues: ['nursery:book'] },
  { id: 'portrait', act: 1, name: '書斎の引き出し', lock: 'library:drawer', clues: ['hall:portraits', 'library:memo'] },
  { id: 'music', act: 1, name: 'こわれたオルゴール', lock: 'nursery:musicbox', clues: ['kitchen:gramophone'] },
  { id: 'recipe', act: 1, name: 'まよけのスープ', lock: 'kitchen:pot', clues: ['library:cookbook'] },
  { id: 'glass', act: 2, name: 'ステンドグラス', lock: 'chapel:glass', clues: ['nursery:drawing', 'hall:candles'] },
  { id: 'bell', act: 2, name: '弔いの鐘', lock: 'chapel:bell', clues: ['kitchen:tally'] },
  { id: 'phone', act: 2, name: '黒電話', lock: 'hall:phone', clues: ['library:directory', 'chapel:altarnote'] },
  { id: 'dolls', act: 2, name: '人形のお茶会', lock: 'nursery:tea', clues: ['kitchen:shadows'] },
  { id: 'ring', act: 3, name: '名前の祭壇', lock: 'basement:altar', clues: [] },
  { id: 'hold', act: 3, name: 'ろうそくの儀', lock: 'basement:candles', clues: [] }
];
var PZ = {}; PUZ.forEach(function (p) { PZ[p.id] = p; });

var SYMS = ['☾', '✶', '◆', '✚', '◎', '▲'];
var KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
var PEOPLE = ['当主 宗一郎', '妻 澄江', '祖母 タエ', '執事 黒田', '長男 誠', '娘 ？？？'];
var DOLL_SIZE = ['いちばん大きい人形', '大きい人形', 'まんなかの人形', '小さい人形', 'いちばん小さい人形'];
var INGS = ['きのこ', 'にんじん', 'たまねぎ', 'じゃがいも', 'ハーブ', 'かぶ'];
var COLORS = ['あか', 'あお', 'みどり', 'きいろ'];
var GSYMS = ['月', '星', '鳥', '目'];
var PLACES = ['屋根裏', '温室', '井戸小屋', '時計塔', '物置', '馬小屋'];
var DOLLS = ['うさぎ', 'ねこ', 'くま', 'とり'];
var GIRLS = ['しずく', 'ことね', 'あかね', 'みおり', 'さより', 'ゆきの', 'ひなた', 'つむぎ'];
var KANA = 'いうえおかきけこさすせそたちてとなにぬねのはふへほまむめもやよらりるれろわ'.split('');

var DIARY = {
  clock: '十月七日。あの子が 森で いなくなって ちょうど一年。ホールの時計は、あの夜の時刻で 止めたまま。針を うごかすと、あの子が 帰る場所を わすれてしまう 気がして。',
  portrait: '主人は「娘の肖像画を はずせ」と言う。はずせるわけが ない。毎晩、絵の前で あの子の名前を よんでいる。……ときどき、絵の中の あの子が こちらを 見ている。',
  music: '書斎の いちばん古い本に「呼び声の儀」が 書いてあった。失った子の名前を 百夜よびつづければ、森は 子を かえす、と。',
  recipe: '九十九夜め。台所で スープを あたためていたら、うしろで「ママ」と 声がした。ふりむいても、だれも いなかった。あと一夜。',
  glass: '百夜め。あの子が 帰ってきた。森の泥だらけで、玄関に 立っていた。でも、名前を よんでも 返事を しない。かわりに、わたしの名前ばかり 呼ぶ。',
  bell: 'あれは、あの子じゃない。あれは「呼ばれた名前」を食べて、その人の声で しゃべる。あの子の名前は、もう あれの中に ある。',
  phone: '主人の声が しなくなった。執事の声も。なのに館のどこかで、ふたりの声が いまも 呼んでいる。「すみえ、あけておくれ」と。あけては いけない。',
  dolls: '本当の あの子は、まだ 森で 迷っている。もし だれかが これを読んだら、あれから あの子の名前を とりかえして、地下の祭壇で 呼んであげて。そうすれば、あれは もう だれの声も'
};

// 部屋のもの（kind: lock／clue／look）。act より前は pre の文だけ（しらべるだけ）
var OBJS = {
  hall: [
    { id: 'clock', kind: 'lock', pid: 'clock', label: '振り子時計' },
    { id: 'portraits', kind: 'clue', pid: 'portrait', label: '肖像画' },
    { id: 'candles', kind: 'clue', pid: 'glass', act: 2, label: 'ろうそく台', pre: '燭台に、溶けかけた ろうそくが 4本。まだ 火は ついていない。' },
    { id: 'phone', kind: 'lock', pid: 'phone', act: 2, label: '黒電話', pre: '古い黒電話。線は 切れている。……なのに、受話器の奥で だれかが 息をしている。' },
    { id: 'mirror', kind: 'look', label: '姿見', t: ['くもった姿見。ろうそくの光に、あなたが ぼんやり 映っている。', '姿見の中の あなたは、少しだけ おくれて うごいた。'], alt: 'あなたの うしろに、だれか 立っている。' },
    { id: 'door', kind: 'look', label: '玄関の扉', t: ['重い玄関扉。押しても 引いても あかない。外から だれかが 押さえているみたいに。', '扉のすきまから、冷たい風と……「あけて」という 小さな声。'] },
    { id: 'coat', kind: 'look', label: 'コート掛け', t: ['古いコートが 4着。ポケットに、子どもの手袋が 片方だけ。', 'コートが 1着 ふえている。さっきは 4着だったのに。'] }
  ],
  library: [
    { id: 'drawer', kind: 'lock', pid: 'portrait', label: '引き出し' },
    { id: 'memo', kind: 'clue', pid: 'portrait', label: 'メモ' },
    { id: 'cookbook', kind: 'clue', pid: 'recipe', label: '料理の本' },
    { id: 'directory', kind: 'clue', pid: 'phone', act: 2, label: '内線表', pre: '分厚い帳面。ページが のりで くっついていて、ひらかない。' },
    { id: 'chair', kind: 'look', label: '揺り椅子', t: ['ほこりをかぶった 揺り椅子。', '揺り椅子が、ひとりでに ゆれている。……ぎい、ぎい。'] },
    { id: 'fireplace', kind: 'look', label: '暖炉', t: ['冷えた暖炉。灰の中に、焼けのこった 写真の切れはし。家族写真のようだ。', '灰に、小さな 足あとが ついている。暖炉の奥へ 向かって。'] }
  ],
  nursery: [
    { id: 'book', kind: 'clue', pid: 'clock', label: '絵本' },
    { id: 'musicbox', kind: 'lock', pid: 'music', label: 'オルゴール' },
    { id: 'drawing', kind: 'clue', pid: 'glass', act: 2, label: 'クレヨンの絵', pre: 'クレヨンの絵。まだ 描きかけだ。窓のような 四角が 4つ。' },
    { id: 'tea', kind: 'lock', pid: 'dolls', act: 2, label: 'お茶会', pre: '小さなテーブルと いすが 4つ。人形たちは 床に ちらばっている。だれかが 片づけたがっている。' },
    { id: 'crib', kind: 'look', label: 'ゆりかご', t: ['空っぽの ゆりかご。毛布が まだ あたたかい。', 'ゆりかごが ゆれている。だれも さわっていないのに。'] },
    { id: 'closet', kind: 'look', label: 'クローゼット', t: ['すこしだけ あいた クローゼット。中は まっくらだ。', '内側から、爪で ひっかいた跡。「ここに いるよ」と 読める。'] }
  ],
  kitchen: [
    { id: 'gramophone', kind: 'clue', pid: 'music', label: '蓄音機' },
    { id: 'pot', kind: 'lock', pid: 'recipe', label: '大鍋' },
    { id: 'tally', kind: 'clue', pid: 'bell', act: 2, label: '黒板', pre: '黒板。なにも 書かれていない……と思ったら、白い線が 1本、すうっと 引かれた。' },
    { id: 'shadows', kind: 'clue', pid: 'dolls', act: 2, label: '白い壁', pre: '白い壁。いま、なにかの影が 横切った 気がした。' },
    { id: 'cupboard', kind: 'look', label: '食器棚', t: ['食器棚。お皿が 5枚、きちんと ならんでいる。', 'お皿が ぜんぶ、こちらに 向けて 立てられている。まるで 顔みたいに。'] },
    { id: 'sink', kind: 'look', label: '流し', t: ['流しに 黒い水が たまっている。底が 見えない。', '黒い水の中から、ぷくり、と 泡が ひとつ。……だれかが 息をしている。'] }
  ],
  chapel: [
    { id: 'glass', kind: 'lock', pid: 'glass', label: 'ステンドグラス' },
    { id: 'bell', kind: 'lock', pid: 'bell', label: '鐘のひも' },
    { id: 'altarnote', kind: 'clue', pid: 'phone', label: '祭壇の手紙' },
    { id: 'pew', kind: 'look', label: '長椅子', t: ['長椅子が ならんでいる。いちばん前の席に、小さな靴が そろえて 置いてある。', '靴が なくなっている。……床に、濡れた 足あと。'] },
    { id: 'confess', kind: 'look', label: '懺悔室', t: ['懺悔室。格子窓の向こうは 暗くて 見えない。', '格子の向こうから「……つぎは、だれの 名前を よぶ？」'] }
  ],
  basement: [
    { id: 'altar', kind: 'lock', pid: 'ring', label: '名前の祭壇' },
    { id: 'cradle', kind: 'look', label: '石のゆりかご', t: ['石でできた ゆりかご。花が 一輪、しおれずに 置いてある。', '花びらが 1枚、ゆっくり 落ちた。だれかが ため息を ついたみたいに。'] },
    { id: 'wall', kind: 'look', label: '壁の文字', t: ['壁一面に 名前が 刻まれている。数えきれないほど。ぜんぶ、ちがう人の名前。', '刻まれた名前の中に、あなたの名前を 見つけた。……まだ 新しい。'] }
  ]
};
var LOOKS = []; Object.keys(OBJS).forEach(function (r) { OBJS[r].forEach(function (o) { if (o.kind === 'look') LOOKS.push(r + ':' + o.id); }); });

// ---------- 生成 ----------
function newGame(n, opts) {
  opts = opts || {};
  n = Math.max(1, Math.min(4, n | 0));
  var seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2147483647);
  var rng = mulberry(seed), D = {};
  D.clock = { h: ri(rng, 1, 12), m: ri(rng, 0, 11) * 5 };
  if (D.clock.h === 12 && D.clock.m === 0) D.clock.m = 35;
  var syms = shuffle(rng, SYMS), nums = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
  var seq = shuffle(rng, SYMS).slice(0, 4);
  D.portrait = { people: PEOPLE.map(function (nm, i) { return { name: nm, sym: syms[i], num: nums[i] }; }), seq: seq,
    code: seq.map(function (s) { return nums[syms.indexOf(s)]; }).join('') };
  var mel; do { mel = []; for (var i = 0; i < 5; i++) mel.push(ri(rng, 0, 4)); } while (new Set(mel).size < 3 || mel.some(function (x, i) { return i && x === mel[i - 1] && x === mel[i - 2]; }));
  D.music = { seq: mel, keys: shuffle(rng, [0, 1, 2, 3, 4]) };
  var ord = shuffle(rng, [0, 1, 2, 3, 4, 5]).slice(0, 4), I = function (k) { return INGS[ord[k]]; };
  D.recipe = { order: ord, lines: shuffle(rng, ['さいしょに ' + I(0) + ' を いれる。', I(1) + ' は ' + I(0) + ' の すぐ あと。', 'いちばん さいごは ' + I(3) + '。', I(2) + ' は ' + I(3) + ' の すぐ まえ。']).concat(['ほかの ものを いれては いけない。']) };
  var cols = shuffle(rng, [0, 1, 2, 3]), map = shuffle(rng, [0, 1, 2, 3]);   // 窓i の色 = cols[i]、色c → 絵 map[c]
  var gs; do { gs = [0, 1, 2, 3].map(function () { return ri(rng, 0, 3); }); } while (gs.every(function (g, i) { return g === map[cols[i]]; }));
  D.glass = { cols: cols, map: map, start: gs, ans: cols.map(function (c) { return map[c]; }) };
  D.bell = { k: ri(rng, 3, 6) };
  var nums3 = [], used = {}; while (nums3.length < PLACES.length) { var x = ri(rng, 102, 987); if (!used[x] && String(x).indexOf('0') < 0) { used[x] = 1; nums3.push(x); } }
  var place = ri(rng, 0, PLACES.length - 1);
  D.phone = { list: PLACES.map(function (p, i) { return [p, nums3[i]]; }), place: place, num: String(nums3[place]) };
  var dsh; do { dsh = shuffle(rng, [0, 1, 2, 3]); } while (dsh.join() === '0,1,2,3');
  D.dolls = { order: dsh };
  var girl = GIRLS[ri(rng, 0, GIRLS.length - 1)], pool = shuffle(rng, KANA.filter(function (k) { return girl.indexOf(k) < 0; })).slice(0, 6);
  var chs = girl.split('').concat(pool);
  D.ring = { girl: girl, stones: (function () { var ids = shuffle(rng, chs.map(function (_, i) { return 'st' + (100 + i * 7 + ri(rng, 0, 6)); })); return chs.map(function (ch, i) { return { id: ids[i], ch: ch }; }); })(), vis: shuffle(rng, chs.map(function (_, i) { return i; })) };
  var traps = shuffle(rng, LOOKS.filter(function (k) { return k.indexOf('basement') < 0; })).slice(0, 4);
  var S = { n: n, seed: seed, act: 1, phase: 'play', D: D, girl: girl, solved: {}, order: [], items: [], hintLv: {}, dread: 0, t: 0, actT: 0,
    evId: 0, ev: [], wrong: 0, deaths: 0, hints: 0, traps: traps, away: [], ring: 0, chase: null, cp: null, rate: opts.rate || 1 };
  saveCp(S);
  return S;
}

// ---------- 部屋の割り当て ----------
function present(S) { var a = []; for (var p = 0; p < S.n; p++) if (!S.away[p]) a.push(p); if (!a.length) for (var q = 0; q < S.n; q++) a.push(q); return a; }
function roomsOf(S, p) {
  var pr = present(S), k = pr.indexOf(p), m = pr.length;
  var mine = k < 0 ? [] : ASSIGN[m][k];
  var out = ACT_ROOMS[S.act].filter(function (r) { return r !== 'basement' && mine.indexOf(r) >= 0; });
  if (S.act >= 3) out.push('basement');
  return out;
}
function ownersOf(S, room) { var o = []; for (var p = 0; p < S.n; p++) if (roomsOf(S, p).indexOf(room) >= 0) o.push(p); return o; }
// 静的な割り当て（人数 m のとき、席 k が見る部屋。地下室以外）
function assignFor(m, k) { return ASSIGN[m][k].slice(); }
function stoneOwner(S, i) { var pr = present(S); return pr[i % pr.length]; }

// ---------- 部屋の中身（そのプレイヤーに見せるものだけ） ----------
function objView(S, room, o, p) {
  var D = S.D, v = { id: o.id, kind: o.kind, label: o.label, pid: o.pid || null };
  if (o.act && S.act < o.act) { v.kind = 'look'; v.t = [o.pre]; v.pre = true; return v; }
  if (o.kind === 'look') { v.t = o.t; if (o.alt) v.alt = o.alt; if (S.traps.indexOf(room + ':' + o.id) >= 0) v.trap = true; return v; }
  v.solved = !!S.solved[o.pid];
  var c = null;
  switch (room + ':' + o.id) {
    case 'nursery:book': c = { h: D.clock.h, m: D.clock.m }; break;
    case 'hall:portraits': c = { people: D.portrait.people.map(function (x) { return { name: x.name, sym: x.sym, num: KANJI[x.num] }; }) }; break;
    case 'library:memo': c = { seq: D.portrait.seq }; break;
    case 'kitchen:gramophone': c = { seq: D.music.seq }; break;
    case 'nursery:musicbox': c = { keys: D.music.keys }; break;
    case 'library:cookbook': c = { lines: D.recipe.lines }; break;
    case 'kitchen:pot': c = { ings: INGS }; break;
    case 'nursery:drawing': c = { cols: D.glass.cols }; break;
    case 'hall:candles': c = { lines: [0, 1, 2, 3].map(function (ci) { return [ci, D.glass.map[ci]]; }) }; break;
    case 'chapel:glass': c = { start: D.glass.start }; break;
    case 'kitchen:tally': c = { k: D.bell.k }; break;
    case 'library:directory': c = { list: D.phone.list }; break;
    case 'chapel:altarnote': c = { place: PLACES[D.phone.place] }; break;
    case 'kitchen:shadows': c = { order: D.dolls.order }; break;
    case 'basement:altar':
      c = { prog: S.ring, len: S.girl.length, stones: D.ring.vis.filter(function (i) { return stoneOwner(S, i) === p; }).map(function (i) { return { id: D.ring.stones[i].id, ch: D.ring.stones[i].ch, used: i < S.ring }; }) };
      if (S.solved.ring) c.girl = S.girl;
      break;
  }
  v.data = c || {};
  return v;
}
function roomView(S, room, p) { return { id: room, name: RN[room], objects: OBJS[room].filter(function (o) { return !(room === 'basement' && o.id === 'candles'); }).map(function (o) { return objView(S, room, o, p); }) }; }

// ---------- 判定 ----------
function eqArr(a, b) { return Array.isArray(a) && a.length === b.length && a.every(function (x, i) { return +x === +b[i]; }); }
function answerOf(S, pid) {
  var D = S.D;
  switch (pid) {
    case 'clock': return { h: D.clock.h, m: D.clock.m };
    case 'portrait': return D.portrait.code;
    case 'music': return D.music.seq.slice();
    case 'recipe': return D.recipe.order.slice();
    case 'glass': return D.glass.ans.slice();
    case 'bell': return D.bell.k;
    case 'phone': return D.phone.num;
    case 'dolls': return D.dolls.order.slice();
  }
  return null;
}
function correct(S, pid, a) {
  var D = S.D;
  switch (pid) {
    case 'clock': return !!a && +a.h === D.clock.h && +a.m === D.clock.m;
    case 'portrait': return String(a) === D.portrait.code;
    case 'music': return eqArr(a, D.music.seq);
    case 'recipe': return eqArr(a, D.recipe.order);
    case 'glass': return eqArr(a, D.glass.ans);
    case 'bell': return +a === D.bell.k;
    case 'phone': return String(a) === D.phone.num;
    case 'dolls': return eqArr(a, D.dolls.order);
  }
  return false;
}
function ev(S, e) { e.id = ++S.evId; S.ev.push(e); if (S.ev.length > 30) S.ev.shift(); return e; }
function actPuz(act) { return PUZ.filter(function (p) { return p.act === act; }); }
function actDone(S, act) { return actPuz(act).every(function (p) { return S.solved[p.id]; }); }
function canTry(S, p, pid) {
  var P = PZ[pid]; if (!P || pid === 'ring' || pid === 'hold') return 'そのなぞは ここでは とけません';
  if (S.phase !== 'play') return 'いまは それどころではない…！';
  if (S.solved[pid]) return 'もう とけている';
  if (P.act > S.act) return 'まだ さわれない';
  var room = P.lock.split(':')[0];
  if (p != null && roomsOf(S, p).indexOf(room) < 0) return 'その部屋は あなたからは 見えない';
  return null;
}
function tryAnswer(S, p, pid, a) {
  var err = canTry(S, p, pid); if (err) return { err: err };
  if (!correct(S, pid, a)) {
    S.wrong++; addDread(S, 6);
    ev(S, { kind: 'wrong', p: p, pid: pid });
    return { ok: false };
  }
  solve(S, p, pid);
  return { ok: true };
}
function solve(S, p, pid) {
  S.solved[pid] = true; S.order.push(pid);
  if (DIARY[pid]) S.items.push({ kind: 'diary', pid: pid, n: S.items.filter(function (x) { return x.kind === 'diary'; }).length + 1, text: DIARY[pid] });
  var sh = { glass: 0, bell: 1, phone: 2 }[pid];
  if (sh != null) S.items.push({ kind: 'shard', pos: sh, ch: S.girl[sh] });
  S.dread = Math.max(0, S.dread - 12);
  ev(S, { kind: 'solve', p: p, pid: pid });
  if (PZ[pid].act === S.act && actDone(S, S.act) && S.act < 3) startChase(S, S.act === 1 ? 'hide' : 'run');
  saveCp(S);
}
// ---------- 地下の祭壇（名前の石を順番に） ----------
function ringTap(S, p, stoneId) {
  if (S.phase !== 'play' || S.act < 3 || S.solved.ring) return { err: 'いまは さわれない' };
  var D = S.D, idx = -1; D.ring.stones.forEach(function (s, i) { if (s.id === stoneId) idx = i; });
  if (idx < 0) return { err: 'その石は ない' };
  if (p != null && stoneOwner(S, idx) !== p) return { err: 'その石は あなたの前には ない' };
  if (idx < S.ring) return { err: 'その石は もう光っている' };
  if (idx === S.ring) {
    S.ring++; ev(S, { kind: 'ring', p: p, ch: D.ring.stones[idx].ch, k: S.ring });
    if (S.ring >= S.girl.length) { S.solved.ring = true; S.order.push('ring'); ev(S, { kind: 'solve', p: p, pid: 'ring' }); startHold(S); saveCp(S); }
    return { ok: true };
  }
  S.ring = 0; S.wrong++; addDread(S, 8); ev(S, { kind: 'ringBad', p: p, ch: D.ring.stones[idx].ch });
  return { ok: false };
}
// ---------- 気配（何か） ----------
function stage(d) { return d >= 75 ? 3 : d >= 50 ? 2 : d >= 25 ? 1 : 0; }
function addDread(S, x) { S.dread = Math.max(0, Math.min(100, S.dread + x)); if (S.dread >= 100 && (S.phase === 'play' || S.phase === 'hold')) caught(S, 'dread'); }
var RATE = { 1: 1 / 12000, 2: 1 / 10500, 3: 1 / 9000 };   // 1あたりのミリ秒（1幕：12秒で1）
var HIDE = { warn: 4000, hold: 8000, noise: 2200 }, RUN = { dur: 11000, per: 24 }, HOLD = { need: 6000, limit: 30000 };
function startChase(S, kind) {
  S.phase = kind; S.chase = kind === 'hide' ? { kind: 'hide', t: 0, holding: {}, noise: {} } : { kind: 'run', t: 0, steps: {}, need: RUN.per * present(S).length };
  ev(S, { kind: 'chase', chase: kind });
}
function startHold(S) { S.phase = 'hold'; S.chase = { kind: 'hold', t: 0, prog: 0, holding: {}, tries: 0 }; ev(S, { kind: 'chase', chase: 'hold' }); }
function setHold(S, p, on) { if (S.chase && (S.chase.kind === 'hide' || S.chase.kind === 'hold')) S.chase.holding[p] = !!on; }
function addSteps(S, p, k) { if (S.chase && S.chase.kind === 'run') { k = Math.max(0, Math.min(12, k | 0)); S.chase.steps[p] = (S.chase.steps[p] || 0) + k; } }
function chaseTotal(S) { var c = S.chase, s = 0; if (c && c.steps) Object.keys(c.steps).forEach(function (k) { s += c.steps[k]; }); return s; }
function tick(S, dt) {
  dt = Math.max(0, Math.min(1000, dt)) * (S.rate || 1);
  if (S.phase === 'caught' || S.phase === 'ending') return;
  S.t += dt; S.actT += dt;
  var c = S.chase, pr = present(S);
  if (S.phase === 'play') { addDread(S, dt * RATE[S.act]); return; }
  if (S.phase === 'hide') {
    c.t += dt;
    if (c.t > HIDE.warn) pr.forEach(function (p) { if (!c.holding[p]) c.noise[p] = (c.noise[p] || 0) + dt / HIDE.noise; });
    if (pr.some(function (p) { return (c.noise[p] || 0) >= 1; })) return caught(S, 'hide');
    if (c.t >= HIDE.warn + HIDE.hold) chaseOk(S);
    return;
  }
  if (S.phase === 'run') {
    c.t += dt;
    if (chaseTotal(S) >= c.need) return chaseOk(S);
    if (c.t >= RUN.dur) return caught(S, 'run');
    return;
  }
  if (S.phase === 'hold') {
    c.t += dt;
    addDread(S, dt * RATE[3]); if (S.phase !== 'hold') return;
    if (pr.every(function (p) { return c.holding[p]; })) c.prog += dt; else c.prog = Math.max(0, c.prog - dt * 2);
    if (c.prog >= HOLD.need) { S.phase = 'ending'; S.solved.hold = true; S.order.push('hold'); S.chase = null; ev(S, { kind: 'ending' }); return; }
    if (c.t >= HOLD.limit) { c.t = 0; c.tries++; addDread(S, 15); ev(S, { kind: 'holdLate' }); }
  }
}
function chaseOk(S) {
  var k = S.chase.kind; S.chase = null; S.phase = 'play';
  if (k === 'hide' || k === 'run') { S.act++; S.actT = 0; S.dread = Math.min(S.dread, 30); }
  ev(S, { kind: 'chaseOk', chase: k, act: S.act });
  saveCp(S);
}
function caught(S, why) { S.phase = 'caught'; S.why = why; S.deaths++; ev(S, { kind: 'caught', why: why }); }
// ---------- チェックポイント（解いたなぞは失わない。気配を下げて、追われる場面ならやり直し） ----------
function saveCp(S) { S.cp = { act: S.act, phase: S.phase, chase: S.phase === 'hide' || S.phase === 'run' || S.phase === 'hold' ? S.phase : null, solved: clone(S.solved), order: S.order.slice(), items: clone(S.items), ring: S.ring, dread: S.dread }; }
function retry(S) {
  if (S.phase !== 'caught') return false;
  var cp = S.cp;
  S.act = cp.act; S.solved = clone(cp.solved); S.order = cp.order.slice(); S.items = clone(cp.items); S.ring = cp.chase === 'hold' ? S.girl.length : 0;
  S.dread = Math.min(cp.dread, 40); S.phase = 'play'; S.chase = null;
  if (cp.chase === 'hold') startHold(S); else if (cp.chase) startChase(S, cp.chase);
  ev(S, { kind: 'retry' });
  return true;
}
// ---------- ヒント（ふーさん🐻） ----------
function hintTexts(S, pid) {
  var D = S.D, a;
  switch (pid) {
    case 'clock': return ['ホールの 振り子時計、針を うごかせるクマ…。どの時刻に 合わせるのかな…？', '子ども部屋の「絵本」の さいごのページに、時計の絵が あるクマ。子ども部屋の人に 聞いてみて！', 'こ、こたえは ' + D.clock.h + '時' + (D.clock.m < 10 ? '0' : '') + D.clock.m + '分 だクマ…！'];
    case 'portrait': return ['書斎の引き出しは 4ケタの数字クマ。となりの「メモ」の しるしが 大事クマ。', 'ホールの「肖像画」に、しるしと 漢数字が あるクマ。メモの しるしを 数字に おきかえて！', 'こたえは ' + D.portrait.code + ' だクマ…！'];
    case 'music': a = D.music.seq.map(function (k) { return DOLL_SIZE[k].replace('人形', ''); }).join(' → ');
      return ['オルゴールの人形を タップすると 音が鳴るクマ。大きい人形ほど 低い音クマ。', '台所の「蓄音機」で 子守うたが 聞けるクマ。台所の人に、人形の大きさで 教えてもらって！', 'こたえは ' + a + ' クマ…！'];
    case 'recipe': return ['台所の大鍋に、材料を 4つ 順番に いれるクマ。', '書斎の「料理の本」に 順番の ヒントが あるクマ。「すぐあと」「すぐまえ」に 注意クマ。', 'こたえは ' + D.recipe.order.map(function (i) { return INGS[i]; }).join(' → ') + ' クマ…！'];
    case 'glass': return ['礼拝堂のステンドグラスは、タップすると 絵が かわるクマ。', '子ども部屋の「クレヨンの絵」に 窓の色、ホールの「ろうそく台」に 色と絵の 組み合わせが あるクマ。', 'こたえは 左から ' + D.glass.ans.map(function (g) { return GSYMS[g]; }).join('・') + ' クマ…！'];
    case 'bell': return ['鐘は、光に 合わせて 鳴らすクマ。ずれると 最初から…。', '台所の「黒板」の 線の数が、鳴らす回数クマ。', 'こたえは ' + D.bell.k + '回 クマ！ 光った瞬間に タップ、鳴らしおわったら 待つクマ。'];
    case 'phone': return ['黒電話は 3ケタの 内線番号クマ。', '礼拝堂の「祭壇の手紙」に かくれ場所、書斎の「内線表」に その番号が あるクマ。', 'こたえは ' + D.phone.num + ' クマ…！'];
    case 'dolls': return ['お茶会の いすに、人形を すわらせるクマ（タップで かわる）。', '台所の「白い壁」の影が、すわる順番クマ。耳や くちばしの形を 見て！', 'こたえは 左から ' + D.dolls.order.map(function (d) { return DOLLS[d]; }).join('・') + ' クマ…！'];
    case 'ring': return ['地下の祭壇は、あの子の名前の文字を 1もじめから 順番に タップするクマ。石は みんなの画面に ばらばらクマ！', '日記の「名前のかけら」を 見るクマ。1もじめ・2もじめ・3もじめ…。', 'あの子の名前は「' + S.girl + '」クマ…！'];
  }
  return ['……クマ？'];
}
function hint(S, pid) {
  if (!PZ[pid] || S.solved[pid] || pid === 'hold' || PZ[pid].act > S.act) return null;
  var lv = S.hintLv[pid] || 0; if (lv >= 3) return lv;
  S.hintLv[pid] = lv + 1; S.hints++; addDread(S, 4); ev(S, { kind: 'hint', pid: pid, lv: lv + 1 });
  return lv + 1;
}
function openPuz(S) { return PUZ.filter(function (p) { return p.act <= S.act && !S.solved[p.id] && p.id !== 'hold'; }).map(function (p) { return p.id; }); }
function setAway(S, p, away) { S.away[p] = !!away; }

var api = { mulberry: mulberry, shuffle: shuffle, ROOMS: ROOMS, RN: RN, RI: RI, ACT_ROOMS: ACT_ROOMS, ASSIGN: ASSIGN, PUZ: PUZ, PZ: PZ, OBJS: OBJS, LOOKS: LOOKS,
  SYMS: SYMS, KANJI: KANJI, DOLL_SIZE: DOLL_SIZE, INGS: INGS, COLORS: COLORS, GSYMS: GSYMS, PLACES: PLACES, DOLLS: DOLLS, GIRLS: GIRLS, DIARY: DIARY, HIDE: HIDE, RUN: RUN, HOLD: HOLD,
  newGame: newGame, present: present, roomsOf: roomsOf, ownersOf: ownersOf, assignFor: assignFor, stoneOwner: stoneOwner, roomView: roomView, answerOf: answerOf, correct: correct, canTry: canTry,
  tryAnswer: tryAnswer, ringTap: ringTap, stage: stage, addDread: addDread, tick: tick, setHold: setHold, addSteps: addSteps, chaseTotal: chaseTotal, retry: retry, saveCp: saveCp,
  hint: hint, hintTexts: hintTexts, openPuz: openPuz, setAway: setAway, actDone: actDone, clone: clone };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HM = api;
})(this);
