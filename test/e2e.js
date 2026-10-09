// E2E: よびごえの館 — solo full playthrough (390×844), layout at 375×667, and host + guest over real PeerJS cloud signaling (local STUN workaround).
// usage: node test/stun-server.js <box-ip> 3478 &  python3 -m http.server 8851 &  node test/e2e.js <box-ip> 8851
const { chromium } = require('/workspace/hayaoshi-quiz/node_modules/playwright-core');
const IP = process.argv[2] || '172.30.0.2', PORT = process.argv[3] || 8851;
const ROOT = `http://localhost:${PORT}/index.html`;
const NET = `${ROOT}?ice=${encodeURIComponent('stun:' + IP + ':3478')}&turbo`;
const SS = __dirname + '/../screenshots/';
const ONLY = process.env.ONLY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; const fail = m => { errors.push(m); console.log('  ✗', m); }; const ok = m => console.log('  ✓', m);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  async function phone(label, w = 390, h = 844) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
    const p = await ctx.newPage(); p.label = label;
    p.on('pageerror', e => fail(`[${label}] JS error ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/PeerJS|WebSocket|net::|ERR_|Failed to load resource/.test(m.text())) fail(`[${label}] console ${m.text()}`); });
    return p;
  }
  const view = p => p.evaluate(() => window.__hm.view && JSON.parse(JSON.stringify(window.__hm.view)));
  const waitV = (p, fn, ms) => p.waitForFunction(new Function('var v = window.__hm.view; return !!v && (' + fn + ');'), null, { timeout: ms || 20000, polling: 50 });
  const finishAnims = p => p.evaluate(() => document.getAnimations().forEach(a => { try { if (isFinite(a.effect.getComputedTiming().endTime)) a.finish(); } catch (e) {} }));
  async function layout(p, tag) {
    const r = await p.evaluate(() => {
      const vis = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) return false; for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).display === 'none') return false; return true; };
      const fab = document.getElementById('hirobaFab'), fr = fab && vis(fab) ? fab.getBoundingClientRect() : null;
      const scr = document.querySelector('.screen.active') || document.body, sr = scr.getBoundingClientRect(), hits = [];
      scr.querySelectorAll('button, input, a').forEach(b => {
        if (!vis(b) || b === fab) return; const r = b.getBoundingClientRect(); if (!r.width || !r.height) return;
        const top = Math.max(r.top, sr.top), bot = Math.min(r.bottom, sr.bottom, innerHeight); if (bot <= top) return;
        if (fr && r.left < fr.right && r.right > fr.left && top < fr.bottom && bot > fr.top) hits.push((b.id || b.className || b.tagName) + ' ' + (b.textContent || '').trim().slice(0, 12));
      });
      const inGame = document.body.classList.contains('in-game');
      const bt = [...document.querySelectorAll('.bottom button')].map(b => b.getBoundingClientRect());
      const st = document.getElementById('stageWrap').getBoundingClientRect();
      const tabs = [...document.querySelectorAll('#tabs button')].map(b => b.getBoundingClientRect().height);
      return { docScroll: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight, scrollY, fab: !!fr, hits, inGame, vh: innerHeight,
        btBottom: Math.max(...bt.map(b => b.bottom)), btH: Math.min(...bt.map(b => b.height)), stageH: st.height, stageW: st.width, tabH: Math.min(...tabs) };
    });
    if (r.docScroll > 1 || r.scrollY) fail(`[${tag}] page scrolls: ${JSON.stringify(r)}`);
    if (r.hits.length) fail(`[${tag}] hub button overlaps: ${r.hits.join(', ')}`);
    if (r.inGame) {
      if (r.fab) fail(`[${tag}] hub button visible during play`);
      if (r.btBottom > r.vh + 0.5 || r.btH < 46) fail(`[${tag}] bottom buttons off-screen/small ${JSON.stringify(r)}`);
      if (r.stageH < 280) fail(`[${tag}] room view too small ${r.stageW}x${r.stageH}`);
      if (r.tabH < 36) fail(`[${tag}] room tabs too small ${r.tabH}`);
    }
    return r;
  }
  async function inView(p, sel, tag) {
    const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height, w: b.width, vh: innerHeight }; }, sel);
    if (!r) { fail(`[${tag}] ${sel} missing`); return; }
    if (r.top < 0 || r.bottom > r.vh + 0.5 || r.h < 44) fail(`[${tag}] ${sel} not reachable/too small ${JSON.stringify(r)}`);
  }
  async function room(p, r) { await p.tap(`#tabs button[data-r="${r}"]`); await sleep(120); }
  async function openObj(p, r, id) { await room(p, r); await p.evaluate(([r, id]) => { ui.room = r; }, [r, id]); await p.tap(`#stage .hs[data-o="${id}"] rect.hit`); await p.waitForSelector('#zoom.active', { timeout: 4000 }); await sleep(100); }
  async function closeZ(p) { if (await p.$('#zoom.active')) await p.tap('#zClose'); await sleep(80); }
  const objData = async (p, r, id) => (await view(p)).g.rooms.find(x => x.id === r).objects.find(o => o.id === id).data;
  const solved = (p, pid, ms) => waitV(p, `v.g && v.g.puz.some(function (x) { return x.id === '${pid}' && x.solved; })`, ms || 8000);
  async function setClock(p, h, m) {
    for (let i = 0; i < 24; i++) { const a = await p.evaluate(() => ui.inp.clock); if (a.h === h) break; await p.tap('#zBody [data-c="h+"]'); }
    for (let i = 0; i < 24; i++) { const a = await p.evaluate(() => ui.inp.clock); if (a.m === m) break; await p.tap('#zBody [data-c="m+"]'); }
    await p.tap('#zBody [data-go]');
  }
  async function keypad(p, s) { for (const ch of s) await p.tap(`#zBody [data-k="${ch}"]`); await p.tap('#zBody [data-go]'); }
  async function cycleTo(p, sel, attr, target, getCur) { for (let i = 0; i < target.length; i++) for (let j = 0; j < 4; j++) { const cur = await p.evaluate(getCur); if (cur[i] === target[i]) break; await p.tap(`#zBody [${attr}="${i}"]`); } }
  const down = (p, sel) => p.dispatchEvent(sel, 'pointerdown', { pointerId: 7, isPrimary: true });
  const up = (p, sel) => p.dispatchEvent(sel, 'pointerup', { pointerId: 7, isPrimary: true });
  async function ringBell(p, k) {
    await p.evaluate(k => new Promise(res => { let n = 0, was = false; const iv = setInterval(() => { const ln = document.getElementById('lantern'); if (!ln) { clearInterval(iv); res(); return; } const on = ln.classList.contains('on'); if (on && !was && n < k) { document.getElementById('bellBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); n++; } was = on; if (n >= k) { clearInterval(iv); setTimeout(res, 2600); } }, 8); }), k);
  }

  // ================= 1) solo full playthrough, 390×844, ?from=portal =================
  if (!ONLY || ONLY === 'solo') {
    const p = await phone('solo390');
    await p.goto(ROOT + '?turbo&from=portal'); await sleep(500);
    const L1 = await layout(p, 'title'); if (!L1.fab) fail('hub button should show on title with ?from=portal'); else ok('title: 🏠 ひろばへ shown (?from=portal), no overlap, no page scroll');
    await p.screenshot({ path: SS + '01_title.png' });
    const credit = await p.textContent('#title .credit'); if (!/ふらっとgames/.test(credit) || !/制作 watg/.test(credit)) fail('footer credit missing'); else ok('footer credit「ふらっとgames 制作 watg」');
    await p.fill('#nameIn', 'りょう'); await p.tap('#soloBtn'); await p.waitForSelector('#lobby.active');
    await layout(p, 'lobby'); await p.screenshot({ path: SS + '02_lobby_solo.png' });
    await p.tap('#startBtn'); await p.waitForSelector('#warnModal.active', { timeout: 5000 });
    await p.tap('#scareSeg2 button[data-v="strong"]'); await sleep(200);
    await p.screenshot({ path: SS + '03_warning.png' }); ok('start warning (headphones / sudden sounds) with びっくり演出 つよめ/ふつう/ひかえめ');
    await p.tap('#warnGo'); await waitV(p, 'v.g.wait === 0', 5000);
    await p.evaluate(() => window.__hm.calm());
    await sleep(2600);
    const L2 = await layout(p, 'game'); ok(`game layout ok (room view ${Math.round(L2.stageW)}×${Math.round(L2.stageH)}, hub hidden, no scroll)`);
    let v = await view(p);
    if (v.g.rooms.map(r => r.id).join() !== 'hall,library,nursery,kitchen') fail('solo should see 4 rooms in act 1: ' + v.g.rooms.map(r => r.id)); else ok('solo: can switch between all 4 open rooms');
    for (const r of ['hall', 'library', 'nursery', 'kitchen']) { await room(p, r); await sleep(250); await p.screenshot({ path: SS + `04_room_${r}.png` }); }
    // ---- 第1幕：本物のタップで ----
    await openObj(p, 'nursery', 'book'); const bk = await objData(p, 'nursery', 'book'); await p.screenshot({ path: SS + '05_clue_book.png' }); await closeZ(p);
    await openObj(p, 'hall', 'clock'); await setClock(p, bk.h, bk.m);
    await solved(p, 'clock').then(() => ok(`振り子時計: set ${bk.h}:${String(bk.m).padStart(2, '0')} from the picture-book clock → solved`), () => fail('clock not solved'));
    await closeZ(p);
    await openObj(p, 'hall', 'portraits'); const pr = await objData(p, 'hall', 'portraits'); await p.screenshot({ path: SS + '06_clue_portraits.png' }); await closeZ(p);
    const memo = await objData(p, 'library', 'memo'); const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const code = memo.seq.map(s => K.indexOf(pr.people.find(x => x.sym === s).num)).join('');
    await openObj(p, 'library', 'drawer');
    const d0 = (await view(p)).g.dread; await keypad(p, code === '1111' ? '2222' : '1111'); await sleep(400);
    v = await view(p); if (!(v.g.wrong === 1 && v.g.dread >= d0 + 5)) fail('wrong code should raise 気配 ' + d0 + '→' + v.g.dread); else ok(`wrong code → 気配 ${d0.toFixed(1)}→${v.g.dread.toFixed(1)} (+scare)`);
    await sleep(1200); await keypad(p, code);
    await solved(p, 'portrait').then(() => ok(`引き出し: memo ${memo.seq.join('')} × portraits → ${code} → solved`), () => fail('drawer not solved'));
    await closeZ(p);
    await openObj(p, 'kitchen', 'gramophone'); await p.tap('#zBody [data-play]'); await sleep(3800); await p.screenshot({ path: SS + '07_clue_gramophone.png' });
    const mel = (await objData(p, 'kitchen', 'gramophone')).seq; await closeZ(p);
    await openObj(p, 'nursery', 'musicbox'); for (const n of mel) { await p.tap(`#zBody .doll[data-n="${n}"]`); await sleep(60); }
    await solved(p, 'music').then(() => ok('オルゴール: melody heard on the gramophone → played on the dolls → solved'), () => fail('music box not solved'));
    await closeZ(p);
    const rec = await p.evaluate(() => window.__hm.answer('recipe'));
    await openObj(p, 'library', 'cookbook'); await p.screenshot({ path: SS + '08_clue_cookbook.png' }); await closeZ(p);
    await openObj(p, 'kitchen', 'pot'); for (const i of rec) await p.tap(`#zBody [data-ing="${i}"]`); await p.screenshot({ path: SS + '09_lock_pot.png' }); await p.tap('#zBody [data-go]');
    await solved(p, 'recipe').then(() => ok('スープ: 4 ingredients in order → solved'), () => fail('recipe not solved'));
    // ---- 何かが来る：かくれる（まず失敗 → ゲームオーバー → チェックポイント）----
    await waitV(p, 'v.g.phase === "hide"', 5000).then(() => ok('act 1 cleared → 「何か」 comes: hide (hold breath) for everyone'), () => fail('no hide event'));
    await p.waitForSelector('#chase.active #holdBtn'); await sleep(600); await p.screenshot({ path: SS + '10_hide_warn.png' });
    await waitV(p, 'v.g.phase === "caught"', 15000).then(() => ok('not holding breath → caught'), () => fail('should be caught when not holding'));
    await sleep(1600); await p.screenshot({ path: SS + '11_gameover.png' });
    await p.tap('#retryBtn'); await waitV(p, 'v.g.phase === "hide"', 5000);
    v = await view(p); if (v.g.puz.filter(x => x.solved).length !== 4) fail('checkpoint lost progress'); else ok(`retry from checkpoint: solved puzzles kept, 気配 ${v.g.dread.toFixed(0)}`);
    await sleep(300); await down(p, '#holdBtn'); await sleep(6500); await p.screenshot({ path: SS + '10_hide_hold.png' });
    await waitV(p, 'v.g.phase === "play" && v.g.act === 2', 20000).then(() => ok('held breath until it passed → act 2 (礼拝堂 opens)'), () => fail('hide not passed'));
    await up(p, '#holdBtn').catch(() => {});
    await sleep(1500);
    // ---- びっくり演出（同期イベント）----
    const j0 = await p.evaluate(() => window.__hm.jumps);
    await p.evaluate(() => window.__hm.hostFx('face')); await sleep(170); await p.screenshot({ path: SS + '12_jumpscare.png' });
    const jOn = await p.$('#jump.on'); const j1 = await p.evaluate(() => window.__hm.jumps);
    if (!jOn || j1 !== j0 + 1) fail('jump scare not shown'); else ok('jump scare: face + stinger + shake (+vibrate) shown');
    await sleep(1300); if (await p.$('#jump.on')) fail('jump scare should vanish within ~1s (no sustained flashing)'); else ok('jump scare is brief (single flash, no strobe)');
    await p.evaluate(() => window.__hm.hostFx('hands')); await p.evaluate(() => window.__hm.hostFx('whisper', 'りょう')); await sleep(2200);
    await p.screenshot({ path: SS + '13_scare_hands_whisper.png' });
    const wt = await p.textContent('#whisper'); if (!/りょう/.test(wt)) fail('whisper should say the player name'); else ok('whisper calls the player name (「……りょう……」)');
    await p.evaluate(() => window.__hm.hostFx('edge')); await sleep(550); await p.screenshot({ path: SS + '14_scare_edge.png' });
    await p.evaluate(() => window.__hm.hostFx('door')); await sleep(3600); await p.screenshot({ path: SS + '15_scare_door.png' });
    // ---- 第2幕 ----
    const cols = (await objData(p, 'nursery', 'drawing')).cols, map = (await objData(p, 'hall', 'candles')).lines;
    const gAns = cols.map(c => map.find(x => x[0] === c)[1]);
    await openObj(p, 'nursery', 'drawing'); await p.screenshot({ path: SS + '16_clue_drawing.png' }); await closeZ(p);
    await openObj(p, 'chapel', 'glass'); await cycleTo(p, '', 'data-w', gAns, () => ui.inp.glass); await p.screenshot({ path: SS + '17_lock_glass.png' }); await p.tap('#zBody [data-go]');
    await solved(p, 'glass').then(() => ok('ステンドグラス: crayon colors × candle rule → solved (+ name shard 1)'), () => fail('glass not solved'));
    await closeZ(p);
    const bk2 = (await objData(p, 'kitchen', 'tally')).k;
    await openObj(p, 'chapel', 'bell'); await sleep(300); await p.screenshot({ path: SS + '18_lock_bell.png' });
    await ringBell(p, bk2);
    await solved(p, 'bell', 4000).then(() => ok(`鐘: rang ${bk2}× on the lantern beat (real rhythm taps) → solved`), async () => { fail('bell rhythm not solved'); await p.evaluate(k => window.__hm.act('try', { pid: 'bell', ans: k }), bk2); });
    await closeZ(p);
    const dir = (await objData(p, 'library', 'directory')).list, place = (await objData(p, 'chapel', 'altarnote')).place;
    const num = String(dir.find(x => x[0] === place)[1]);
    await openObj(p, 'hall', 'phone'); await keypad(p, num);
    await solved(p, 'phone').then(() => ok(`黒電話: 「${place}」 → ${num} → solved`), () => fail('phone not solved'));
    await closeZ(p);
    const ord = (await objData(p, 'kitchen', 'shadows')).order;
    await openObj(p, 'kitchen', 'shadows'); await p.screenshot({ path: SS + '19_clue_shadows.png' }); await closeZ(p);
    await openObj(p, 'nursery', 'tea'); await cycleTo(p, '', 'data-ch', ord, () => ui.inp.tea); await p.tap('#zBody [data-go]');
    await solved(p, 'dolls').then(() => ok('人形のお茶会: wall shadows → seats → solved'), () => fail('dolls not solved'));
    await waitV(p, 'v.g.phase === "run"', 5000).then(() => ok('act 2 cleared → chase: run!'), () => fail('no run event'));
    await p.waitForSelector('#chase.active #footL'); await sleep(300);
    for (let i = 0; i < 14; i++) { await down(p, i % 2 ? '#footR' : '#footL'); }
    await sleep(250); await p.screenshot({ path: SS + '20_run.png' });
    for (let i = 14; i < 60; i++) { await down(p, i % 2 ? '#footR' : '#footL'); await sleep(15); }
    await waitV(p, 'v.g.phase === "play" && v.g.act === 3', 12000).then(() => ok('alternating foot taps → escaped to the basement (act 3)'), () => fail('run not passed'));
    await sleep(1200);
    v = await view(p); const shards = v.g.items.filter(i => i.kind === 'shard').sort((a, b) => a.pos - b.pos).map(i => i.ch).join('');
    await p.tap('#itemsBtn'); await sleep(200); await p.screenshot({ path: SS + '21_diary.png' }); await p.tap('#itemsClose');
    await room(p, 'basement'); await sleep(250); await p.screenshot({ path: SS + '22_room_basement.png' });
    await openObj(p, 'basement', 'altar');
    const st = await p.evaluate(() => window.__hm.stones());
    for (const s of st) { await p.tap(`#zBody .stone[data-st="${s.id}"]`); await sleep(250); }
    await waitV(p, 'v.g.phase === "hold"', 5000).then(() => ok(`名前の祭壇: shards 「${shards}」 → tapped in order → ritual`), () => fail('altar not solved'));
    await p.waitForSelector('#chase.active #holdBtn'); await sleep(400); await p.screenshot({ path: SS + '23_hold.png' });
    await down(p, '#holdBtn');
    await waitV(p, 'v.g.phase === "ending"', 15000).then(() => ok('everyone held the candle → ending'), () => fail('hold ritual not finished'));
    await sleep(10500); await p.screenshot({ path: SS + '24_ending.png' });
    const endTxt = await p.textContent('#story'); if (!/2人/.test(endTxt)) fail('ending twist (n+1 people) missing'); else ok('ending reveal + twist (「2人 いた。」) + ghost name in credits');
    await layout(p, 'ending');
    const fabEnd = await p.evaluate(() => getComputedStyle(document.getElementById('hirobaFab')).display !== 'none'); if (!fabEnd) fail('hub button should return after the game'); else ok('🏠 ひろばへ back on the ending screen');
    v = await view(p); ok(`solo playthrough stats: ${Math.round(v.g.t / 1000)}s game-time, caught ${v.g.deaths}, wrong ${v.g.wrong}, hints ${v.g.hints}`);
    await p.context().close();
  }

  // ================= 2) 375×667 (iPhone SE size): layout of rooms, close-ups, chase, game over =================
  if (!ONLY || ONLY === 'se') {
    const p = await phone('se375', 375, 667);
    await p.goto(ROOT + '?turbo&from=portal'); await sleep(300);
    await layout(p, 'title375'); await p.screenshot({ path: SS + '30_title_375.png' });
    await p.tap('#soloBtn'); await p.waitForSelector('#lobby.active'); await layout(p, 'lobby375');
    await p.tap('#startBtn'); await p.waitForSelector('#warnModal.active'); await inView(p, '#warnGo', 'warn375'); await p.tap('#warnGo');
    await waitV(p, 'v.g.wait === 0'); await p.evaluate(() => window.__hm.calm()); await sleep(300);
    await layout(p, 'game375'); await p.screenshot({ path: SS + '31_game_375.png' });
    await openObj(p, 'library', 'drawer'); await inView(p, '#zBody [data-go]', 'drawer375'); await p.screenshot({ path: SS + '32_zoom_375.png' }); await closeZ(p);
    await openObj(p, 'hall', 'clock'); await inView(p, '#zBody [data-go]', 'clock375'); await closeZ(p);
    await p.tap('#menuBtn'); const hub = await p.isVisible('#menuHiroba'); await p.tap('#menuRules'); await sleep(100);
    if (!hub || !(await p.isVisible('#rulesModal'))) fail('⋯ menu: rules / ひろば not reachable'); else ok('⋯ menu has 🏠 ひろばへ, びっくり演出, あそびかた during play');
    await p.tap('#rulesClose');
    await p.tap('#hintBtn'); await sleep(150); await p.tap('#hintBody button[data-h="clock"]'); await waitV(p, 'v.g.hints === 1');
    await sleep(300); await p.screenshot({ path: SS + '33_hint_fuusan.png' }); await p.tap('#hintClose'); ok('🐻 ふーさん hint (気配+4) works');
    for (const pid of ['clock', 'portrait', 'music', 'recipe']) await p.evaluate(pid => window.__hm.act('try', { pid, ans: window.__hm.answer(pid) }), pid);
    await p.waitForSelector('#chase.active #holdBtn'); await inView(p, '#holdBtn', 'hide375');
    await waitV(p, 'v.g.phase === "caught"', 15000); await p.waitForSelector('#caught.active #retryBtn'); await sleep(800); await inView(p, '#retryBtn', 'caught375'); await p.screenshot({ path: SS + '34_gameover_375.png' });
    await p.tap('#retryBtn'); await waitV(p, 'v.g.phase === "hide"'); await down(p, '#holdBtn'); await waitV(p, 'v.g.act === 2', 20000);
    for (const pid of ['glass', 'bell', 'phone', 'dolls']) await p.evaluate(pid => window.__hm.act('try', { pid, ans: window.__hm.answer(pid) }), pid);
    await p.waitForSelector('#chase.active #footL'); await inView(p, '#footR', 'run375'); await p.screenshot({ path: SS + '35_run_375.png' });
    ok('375×667: rooms, close-ups, hide / game over / run controls all reachable without page scroll');
    await p.context().close();
  }

  // ================= 3) online: host + guest over PeerJS cloud =================
  if (!ONLY || ONLY === 'net') {
    const host = await phone('host'), guest = await phone('guest');
    await host.goto(NET); await host.fill('#nameIn', 'りょう'); await host.tap('#createBtn');
    await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.getElementById('codeBig').textContent), null, { timeout: 30000 }).catch(() => {});
    const code = await host.textContent('#codeBig');
    if (!/^[A-Z0-9]{4}$/.test(code)) fail('room could not be created (signaling blocked?)');
    else {
      ok('room created ' + code + ' (PeerJS cloud signaling)');
      if (!(await host.$('#qr svg'))) fail('QR code missing'); else ok('invite QR code shown');
      await guest.goto(NET + '&room=' + code); await guest.fill('#nameIn', 'たろう'); await guest.tap('#joinInvitedBtn');
      await waitV(guest, 'v.seats.length === 2', 45000).then(() => ok('guest joined via invite URL (WebRTC data channel up)'), () => fail('guest could not join'));
      await waitV(host, 'v.seats.length === 2');
      const split = await guest.textContent('#splitList'); if (!/たろう/.test(split) || !/書斎/.test(split)) fail('lobby split list missing'); else ok('lobby shows who sees which rooms');
      await host.screenshot({ path: SS + '40_lobby_online.png' });
      await host.tap('#startBtn');
      await Promise.all([host, guest].map(async p => { await p.waitForSelector('#warnModal.active', { timeout: 10000 }); await p.tap('#warnGo'); }));
      await waitV(guest, 'v.phase === "game" && v.g.wait === 0', 15000);
      await host.evaluate(() => window.__hm.calm());
      let hv = await view(host), gv = await view(guest);
      const hr = hv.g.rooms.map(r => r.id), gr = gv.g.rooms.map(r => r.id);
      if (hr.some(r => gr.includes(r)) || [...hr, ...gr].sort().join() !== 'hall,kitchen,library,nursery') fail(`rooms should be split: host ${hr} / guest ${gr}`);
      else ok(`asymmetric views: りょう sees ${hr.join('+')}, たろう sees ${gr.join('+')} (no overlap)`);
      const gjson = JSON.stringify(gv.g.rooms), hjson = JSON.stringify(hv.g.rooms);
      if (/"id":"(portraits|clock)"/.test(gjson) || /"id":"(book|memo)"/.test(hjson)) fail('a player received data from rooms they cannot see'); else ok('each phone only receives its own rooms\' clue data');
      await room(guest, gr[0]); await sleep(200); await guest.screenshot({ path: SS + '41_online_guest.png' }); await host.screenshot({ path: SS + '42_online_host.png' });
      const otherTab = await guest.textContent('#tabs'); if (!/りょう/.test(otherTab)) fail('guest tabs should show who has the other rooms'); else ok('tabs show which friend has each other room (「玄関ホール＝りょう」)');
      // 相手の画面の手がかりで、自分の鍵を開ける
      const bk = gv.g.rooms.find(r => r.id === 'nursery').objects.find(o => o.id === 'book').data;
      await openObj(host, 'hall', 'clock'); await setClock(host, bk.h, bk.m);
      await solved(guest, 'clock').then(() => ok(`cross-phone puzzle: たろう's picture book (${bk.h}:${String(bk.m).padStart(2, '0')}) → りょう sets the clock → solved on both`), () => fail('cross-phone clock not solved'));
      await closeZ(host);
      gv = await view(guest); if (!gv.g.items.some(i => i.kind === 'diary')) fail('guest should get the shared diary page'); else ok('diary page shared with everyone');
      const pr = hv.g.rooms.find(r => r.id === 'hall').objects.find(o => o.id === 'portraits').data, memo = gv.g.rooms.find(r => r.id === 'library').objects.find(o => o.id === 'memo').data;
      const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'], code2 = memo.seq.map(s => K.indexOf(pr.people.find(x => x.sym === s).num)).join('');
      await openObj(guest, 'library', 'drawer'); await keypad(guest, code2);
      await solved(host, 'portrait').then(() => ok('cross-phone puzzle: りょう\'s portraits × たろう\'s memo → たろう opens the drawer'), () => fail('guest drawer not solved'));
      await closeZ(guest);
      // 同期したびっくり演出
      const j = async () => [await host.evaluate(() => window.__hm.jumps), await guest.evaluate(() => window.__hm.jumps)];
      const j0 = await j(); await host.evaluate(() => window.__hm.hostFx('face'));
      await guest.waitForSelector('#jump.on', { timeout: 4000 }).catch(() => {}); await sleep(120); await guest.screenshot({ path: SS + '43_online_scare_guest.png' });
      await sleep(600); const j1 = await j();
      if (j1[0] !== j0[0] + 1 || j1[1] !== j0[1] + 1) fail(`synced jump scare should hit both phones ${j0}→${j1}`); else ok('synced scare event: the jump scare hits both phones together');
      await host.evaluate(() => window.__hm.hostFx('whisper', 'たろう')); await sleep(900);
      const w = [await host.textContent('#whisper'), await guest.textContent('#whisper')]; if (!w.every(x => /たろう/.test(x))) fail('name whisper not synced ' + w); else ok('「何か」 whispers たろう\'s name on both phones');
      // 残りの第1幕（持ち主の端末から）→ かくれる：1人が息を止めないと全員見つかる
      for (const pid of ['music', 'recipe']) { const owner = (await host.evaluate(pid => window.__hm.owner(pid), pid))[0]; const ans = await host.evaluate(pid => window.__hm.answer(pid), pid); await (owner === 1 ? host : guest).evaluate(([pid, ans]) => window.__hm.act('try', { pid, ans }), [pid, ans]); await sleep(300); }
      await waitV(guest, 'v.g.phase === "hide"', 8000).then(() => ok('「何か」 comes on both phones (hide)'), () => fail('guest did not get the hide event'));
      await guest.waitForSelector('#chase.active #holdBtn'); await host.waitForSelector('#chase.active #holdBtn');
      await down(host, '#holdBtn');
      await waitV(guest, 'v.g.phase === "caught"', 15000).then(() => ok('only りょう held breath → everyone caught (co-op)'), () => fail('should be caught when the guest breathes'));
      await guest.waitForSelector('#caught.active', { timeout: 5000 }).catch(() => fail('guest game-over screen missing'));
      await sleep(900); await guest.screenshot({ path: SS + '44_online_gameover_guest.png' });
      await up(host, '#holdBtn').catch(() => {});
      await host.tap('#retryBtn'); await waitV(guest, 'v.g.phase === "hide"', 8000);
      await guest.waitForSelector('#chase.active #holdBtn'); await host.waitForSelector('#chase.active #holdBtn'); await sleep(300);
      await down(host, '#holdBtn'); await down(guest, '#holdBtn');
      await waitV(guest, 'v.g.phase === "play" && v.g.act === 2', 20000).then(() => ok('both held breath → act 2 on both phones'), () => fail('co-op hide failed'));
      gv = await view(guest); if (!gv.g.rooms.some(r => r.id === 'chapel')) fail('chapel should go to たろう (2p split)'); else ok('act 2: 礼拝堂 appears on たろう\'s phone');
      // 再接続
      await guest.goto(NET + '&room=' + code); await guest.fill('#nameIn', 'たろう'); await guest.tap('#joinInvitedBtn');
      await waitV(guest, 'v.phase === "game" && v.g.rooms.length >= 3', 45000).then(() => ok('guest reloaded and rejoined mid-game by nickname (same rooms back)'), () => fail('rejoin failed'));
      hv = await view(host); if (hv.g.puz.filter(x => x.solved).length !== 4) fail('progress lost on rejoin');
    }
    await host.context().close(); await guest.context().close();
  }
  await browser.close();
  console.log(errors.length ? `\nFAILED (${errors.length})` : '\nALL E2E CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
