// node test/logic.test.js ― ゲームエンジンのテスト（依存なし）
const L = require('../logic.js');
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' → ' + JSON.stringify(a) + ' (期待 ' + JSON.stringify(b) + ')'); }
const roomOf = s => s.split(':')[0];
function perms(arr, k) { if (!k) return [[]]; const out = []; arr.forEach((x, i) => perms(arr.filter((_, j) => j !== i), k - 1).forEach(r => out.push([x].concat(r)))); return out; }

console.log('■ なぞの生成（500ゲーム）：どれも解ける・答えが1つに決まる');
{
  let bad = 0, uniqRecipe = 0, glassStartNotSolved = 0, distinctPhone = 0, girls = new Set(), codes = new Set();
  for (let seed = 1; seed <= 500; seed++) {
    const S = L.newGame(1 + seed % 4, { seed }), D = S.D;
    codes.add(D.portrait.code); girls.add(S.girl);
    // 時計
    if (!(D.clock.h >= 1 && D.clock.h <= 12 && D.clock.m % 5 === 0 && D.clock.m < 60)) bad++;
    // 肖像画：メモのしるし→肖像画の数字で答えが作れる
    const code = D.portrait.seq.map(s => D.portrait.people.find(p => p.sym === s).num).join('');
    if (code !== D.portrait.code || new Set(D.portrait.people.map(p => p.sym)).size !== 6) bad++;
    // スープ：手がかりの文だけから、6つ中4つの並びがちょうど1通りに決まる
    const lines = D.recipe.lines, I = L.INGS;
    const fits = perms([0, 1, 2, 3, 4, 5], 4).filter(o => {
      const n = o.map(i => I[i]);
      return lines.every(t => {
        let m;
        if ((m = t.match(/^さいしょに (\S+) を/))) return n[0] === m[1];
        if ((m = t.match(/^いちばん さいごは (\S+)。/))) return n[3] === m[1];
        if ((m = t.match(/^(\S+) は (\S+) の すぐ あと/))) return n.indexOf(m[2]) >= 0 && n[n.indexOf(m[2]) + 1] === m[1];
        if ((m = t.match(/^(\S+) は (\S+) の すぐ まえ/))) return n.indexOf(m[2]) > 0 && n[n.indexOf(m[2]) - 1] === m[1];
        return true;
      });
    });
    if (fits.length === 1 && fits[0].join() === D.recipe.order.join()) uniqRecipe++; else bad++;
    // オルゴール：5音、3種類以上
    if (D.music.seq.length !== 5 || new Set(D.music.seq).size < 3 || D.music.keys.slice().sort().join() !== '0,1,2,3,4') bad++;
    // ステンドグラス：クレヨンの色 × ろうそく台の対応 = 答え。最初から解けてはいない
    if (D.glass.ans.join() !== D.glass.cols.map(c => D.glass.map[c]).join()) bad++;
    if (D.glass.start.join() !== D.glass.ans.join()) glassStartNotSolved++;
    // 黒電話：番号は全部ちがう3ケタ（0なし）、手紙の場所の番号が答え
    const nums = D.phone.list.map(x => String(x[1]));
    if (new Set(nums).size === 6 && nums.every(x => /^[1-9]{3}$/.test(x))) distinctPhone++;
    if (D.phone.list[D.phone.place][1] + '' !== D.phone.num) bad++;
    // 鐘・人形
    if (!(D.bell.k >= 3 && D.bell.k <= 6) || D.dolls.order.slice().sort().join() !== '0,1,2,3') bad++;
    // 名前の石：名前の文字＋ほかの文字（名前の文字はほかに無い）
    const chs = D.ring.stones.map(s => s.ch);
    if (chs.slice(0, 3).join('') !== S.girl || chs.slice(3).some(c => S.girl.includes(c)) || new Set(D.ring.stones.map(s => s.id)).size !== 9) bad++;
    // 正解はちゃんと正解、ずらすと不正解
    ['clock', 'portrait', 'music', 'recipe', 'glass', 'bell', 'phone', 'dolls'].forEach(pid => { if (!L.correct(S, pid, L.answerOf(S, pid))) bad++; });
    if (L.correct(S, 'clock', { h: D.clock.h % 12 + 1, m: D.clock.m })) bad++;
  }
  eq(bad, 0, '生成の不整合');
  eq(uniqRecipe, 500, 'スープの答えは手がかりから1通りに決まる');
  eq(glassStartNotSolved, 500, 'ステンドグラスは最初から解けていない');
  eq(distinctPhone, 500, '内線番号は全部ちがう');
  ok(girls.size >= 6 && codes.size > 300, 'ゲームごとに答えが変わる（名前 ' + girls.size + '種・引き出しの番号 ' + codes.size + '種）');
}

console.log('■ 手がかりの配り方（1〜4人）');
for (let n = 1; n <= 4; n++) {
  const S = L.newGame(n, { seed: 7 });
  for (let act = 1; act <= 3; act++) {
    S.act = act;
    const all = new Set(); for (let p = 0; p < n; p++) L.roomsOf(S, p).forEach(r => all.add(r));
    eq([...all].sort(), L.ACT_ROOMS[act].slice().sort(), `${n}人・第${act}幕：開いている部屋は全部だれかが見ている`);
    for (let p = 0; p < n; p++) ok(L.roomsOf(S, p).length >= 1, `${n}人・第${act}幕：${p + 1}人目にも部屋がある`);
    // 同じ部屋（地下室以外）を2人が見ることはない
    L.ACT_ROOMS[act].filter(r => r !== 'basement').forEach(r => eq(L.ownersOf(S, r).length, 1, `${n}人・第${act}幕：${r} を見るのは1人`));
  }
  S.act = 3;
  L.PUZ.filter(P => P.clues.length).forEach(P => {
    const lockOwners = L.ownersOf(S, roomOf(P.lock));
    const clueOwners = new Set(); P.clues.forEach(c => L.ownersOf(S, roomOf(c)).forEach(o => clueOwners.add(o)));
    ok(lockOwners.length >= 1 && clueOwners.size >= 1, `${n}人：${P.id} の鍵と手がかりはだれかに見えている`);
    if (n >= 2) ok([...clueOwners].some(o => !lockOwners.includes(o)), `${n}人：${P.id} は鍵を持つ人だけでは解けない（ほかの人の手がかりが要る）`);
    else ok(clueOwners.has(0) && lockOwners.includes(0), `ひとり：${P.id} は全部ひとりで見られる`);
  });
  // 名前の石：連続する文字は別の人の前に。全部の石がだれかの前にある
  const owners = [0, 1, 2].map(i => L.stoneOwner(S, i));
  if (n >= 2) ok(owners[0] !== owners[1] && owners[1] !== owners[2], `${n}人：名前の石は別々の人に（${owners.join(',')}）`);
  let seen = 0; for (let p = 0; p < n; p++) seen += L.roomView(S, 'basement', p).objects.find(o => o.id === 'altar').data.stones.length;
  eq(seen, 9, `${n}人：祭壇の石9個が全員の画面に分かれて全部ある`);
  // ビューにはその人の部屋の情報しか入らない（ほかの人の部屋の答えは届かない）
  if (n >= 2) {
    const mine = L.roomsOf(S, 0);
    const others = L.ACT_ROOMS[3].filter(r => !mine.includes(r));
    ok(others.length > 0, `${n}人：1人目には見えない部屋がある`);
  }
}
{ // 途中で1人抜けたら、残りで部屋を引き取る
  const S = L.newGame(3, { seed: 3 }); S.act = 2; L.setAway(S, 1, true);
  const all = new Set(); [0, 2].forEach(p => L.roomsOf(S, p).forEach(r => all.add(r)));
  eq([...all].sort(), L.ACT_ROOMS[2].slice().sort(), '3人中1人が切断：残り2人で全部の部屋をカバー');
  eq(L.roomsOf(S, 1), [], '切断中の人には部屋なし');
}

console.log('■ 進行：第1幕 → かくれる → 第2幕 → にげる → 第3幕 → 名前 → ろうそく → エンディング');
{
  const S = L.newGame(2, { seed: 11 });
  eq(S.phase, 'play', 'はじめは探索');
  // 見えない部屋の鍵は開けられない
  const lockRoom = r => L.roomsOf(S, 0).includes(r) ? 0 : 1;
  ok(!!L.tryAnswer(S, 1 - lockRoom('hall'), 'clock', L.answerOf(S, 'clock')).err, 'ほかの人の部屋のなぞは解けない');
  ok(!!L.tryAnswer(S, 0, 'glass', L.answerOf(S, 'glass')).err, '第2幕のなぞはまだ解けない');
  const d0 = S.dread; const r = L.tryAnswer(S, lockRoom('hall'), 'clock', { h: 0, m: 7 });
  ok(r.ok === false && S.dread === d0 + 6 && S.ev[S.ev.length - 1].kind === 'wrong', 'まちがい → 気配+6・wrong イベント');
  ['clock', 'portrait', 'music'].forEach(pid => eq(L.tryAnswer(S, lockRoom(roomOf(L.PZ[pid].lock)), pid, L.answerOf(S, pid)).ok, true, pid + ' 正解'));
  eq(S.items.filter(i => i.kind === 'diary').length, 3, '日記が3枚');
  eq(L.tryAnswer(S, lockRoom('kitchen'), 'recipe', L.answerOf(S, 'recipe')).ok, true, 'recipe 正解');
  eq(S.phase, 'hide', '第1幕クリア → 「何か」が来る（かくれる）');
  // 息を止めない → 見つかる
  for (let i = 0; i < 80 && S.phase === 'hide'; i++) L.tick(S, 100);
  eq(S.phase, 'caught', '息を止めないと見つかる');
  eq(S.deaths, 1, 'ゲームオーバー1回');
  L.retry(S);
  eq([S.phase, S.act, Object.keys(S.solved).length], ['hide', 1, 4], 'チェックポイント：解いたなぞはそのまま、かくれる場面からやり直し');
  ok(S.dread <= 40, 'やり直し時の気配は40以下');
  L.setHold(S, 0, true); L.setHold(S, 1, true);
  for (let i = 0; i < 200 && S.phase === 'hide'; i++) L.tick(S, 100);
  eq([S.phase, S.act], ['play', 2], '全員で息を止めきる → 第2幕');
  ['glass', 'bell', 'phone', 'dolls'].forEach(pid => L.tryAnswer(S, lockRoom(roomOf(L.PZ[pid].lock)), pid, L.answerOf(S, pid)));
  eq(S.items.filter(i => i.kind === 'shard').map(i => i.ch).join(''), S.girl, '名前のかけら3つで あの子の名前になる');
  eq(S.phase, 'run', '第2幕クリア → にげる');
  for (let i = 0; i < 200 && S.phase === 'run'; i++) L.tick(S, 100);
  eq(S.phase, 'caught', '走らないと つかまる');
  L.retry(S); eq(S.phase, 'run', 'にげる場面からやり直し');
  for (let i = 0; i < 30; i++) { L.addSteps(S, i % 2, 2); L.tick(S, 100); }
  eq([S.phase, S.act], ['play', 3], '2人で足ぶみ → 第3幕（地下室）');
  ok(L.roomsOf(S, 0).includes('basement') && L.roomsOf(S, 1).includes('basement'), '地下室は全員の画面に');
  const st = S.D.ring.stones;
  const tap = i => L.ringTap(S, L.stoneOwner(S, i), st[i].id);
  ok(!!L.ringTap(S, 1 - L.stoneOwner(S, 0), st[0].id).err, '自分の前にない石はさわれない');
  tap(0); eq(S.ring, 1, '1もじめ'); tap(5); eq(S.ring, 0, 'ちがう石 → 最初から');
  tap(0); tap(1); tap(2);
  eq([S.solved.ring, S.phase], [true, 'hold'], '名前を呼ぶ → ろうそくの儀');
  L.setHold(S, 0, true); L.setHold(S, 1, false);
  for (let i = 0; i < 70; i++) L.tick(S, 100);
  eq(S.phase, 'hold', '1人が手をはなしていると終わらない');
  L.setHold(S, 1, true);
  for (let i = 0; i < 80 && S.phase === 'hold'; i++) L.tick(S, 100);
  eq(S.phase, 'ending', '全員で守りきる → エンディング');
  eq(S.order.length, 10, '10個のなぞ（儀式を含む）をすべてクリア');
}
console.log('■ 気配（何か）・ヒント');
{
  const S = L.newGame(1, { seed: 2 });
  for (let i = 0; i < 1300 && S.phase === 'play'; i++) L.tick(S, 1000);
  eq(S.phase, 'caught', '何もしないと 約20分で見つかる');
  ok(S.t > 1150000 && S.t < 1250000, '見つかるまで ' + Math.round(S.t / 60000) + '分');
  L.retry(S); eq(S.phase, 'play', 'やり直せる'); ok(S.dread <= 40, '気配は下がる');
  eq([L.stage(0), L.stage(30), L.stage(60), L.stage(90)], [0, 1, 2, 3], '気配の段階');
  const d = S.dread; eq(L.hint(S, 'clock'), 1, 'ヒント1'); eq(L.hint(S, 'clock'), 2, 'ヒント2'); eq(L.hint(S, 'clock'), 3, 'ヒント3'); eq(L.hint(S, 'clock'), 3, 'ヒントは3段まで');
  eq(S.dread, d + 12, 'ヒントは気配+4ずつ');
  ok(L.hintTexts(S, 'clock')[2].includes(S.D.clock.h + '時'), '3段目のヒントは答え');
  eq(L.hint(S, 'glass'), null, '第2幕のなぞのヒントはまだ出ない');
  ['portrait', 'music', 'recipe', 'glass', 'bell', 'phone', 'dolls', 'ring'].forEach(pid => eq(L.hintTexts(S, pid).length, 3, pid + ' のヒント3段'));
  eq(L.openPuz(S), ['clock', 'portrait', 'music', 'recipe'], '第1幕で開いているなぞ');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
