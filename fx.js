/* よびごえの館：こわい演出（ジャンプスケア・影・ノック・ささやき・停電・手のあと・懐中電灯・フィルムのざらつき）
 * 光の点滅は短く1回きり（連続した点滅はしない）。ひかえめ では顔を出さず、音・振動も弱く。
 */
'use strict';
function vibrate(p) { try { if (navigator.vibrate && scareLv !== 'mild') navigator.vibrate(scareLv === 'strong' ? p : (Array.isArray(p) ? p.slice(0, 1) : Math.min(p, 120))); } catch (e) {} }
var FX = (function () {
  var scene = {}, sceneT = {}, jumpT = 0, lastJump = 0, stageLv = 0;
  var NARR = {
    knock: ['……コン、コン、コン。どこかの扉を、だれかが たたいている。', '頭の上で、ドン、と音がした。2階には だれも いないはずなのに。'],
    steps: ['廊下を、ゆっくり歩く足音。……この部屋の前で、止まった。', 'ぺた、ぺた、ぺた。はだしの足音が 近づいてくる。'],
    door: ['ぎい……と、だれも さわっていない扉が ひらいていく。', 'すきまの暗がりから、なにかが こちらを 見ていた。'],
    edge: ['いま、目のはしを なにかが 横切った。', '……ふりむいては いけない 気がする。'],
    lights: ['ろうそくが いっせいに ゆらいで、消えかけた。', '真っ暗。……だれかの息が、耳もとで。'],
    hands: ['窓ガラスに、小さな 手のあとが ついていく。内側から。', 'ぺたり。ぺたり。見えない手が、ガラスに ふれている。'],
    phone: ['ホールの黒電話が 鳴っている。線は 切れているのに。', 'ジリリリリ……。だれも 出ないで。'],
    quiet: ['……急に、雨の音が 止んだ。', '音が、ない。自分の心臓の音だけが 聞こえる。'],
    giggle: ['くすくす……。子どもの笑い声が、壁の中から。', 'どこかで、女の子が 笑った。'],
    scream: ['遠くで、だれかの悲鳴。', '館のどこかで、ガラスの割れる音と 悲鳴。'],
    slam: ['バタン！ どこかの扉が 勢いよく 閉まった。'],
    face: ['…………。', 'ミ　ツ　ケ　タ'],
    rock: ['書斎のほうで、揺り椅子の きしむ音が する。'],
    whisper: ['耳もとで、だれかが 名前を よんだ。']
  };
  function narr(kind, arg) { var a = NARR[kind]; if (!a) return; var t = pick(a); if (kind === 'whisper' && arg) t = '耳もとで、だれかが「' + arg + '」と よんだ。'; UI_say(t, true); }
  function setScene(k, ms) { scene[k] = true; clearTimeout(sceneT[k]); if (typeof refreshScene === 'function') refreshScene(); sceneT[k] = setTimeout(function () { scene[k] = false; if (typeof refreshScene === 'function') refreshScene(); }, ms); }
  function shake() { if (scareLv === 'mild') return; var g = $('game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); setTimeout(function () { g.classList.remove('shake'); }, 500); }
  function jump(opt) {
    opt = opt || {};
    var now = Date.now(); if (now - lastJump < 1500) return; lastJump = now;
    var el = $('jump'), mild = scareLv === 'mild';
    el.className = mild ? 'on mild' : 'on';
    el.innerHTML = mild ? '<div class="jf">' + ART.figure() + '</div>' : '<div class="jf">' + ART.face(Math.floor(Math.random() * 3)) + '</div>' + (scareLv === 'strong' ? '<div class="wf"></div>' : '');
    sfx.stinger(); vibrate([90, 40, 260]); shake(); BGM.duck(2500);
    clearTimeout(jumpT); jumpT = setTimeout(function () { el.className = ''; el.innerHTML = ''; }, mild ? 1100 : scareLv === 'strong' ? 700 : 480);
    window.__hm && (window.__hm.jumps = (window.__hm.jumps || 0) + 1);
  }
  function edge() {
    var el = $('edge'); el.innerHTML = ART.figure(); el.className = ''; void el.offsetWidth; el.className = Math.random() < .5 ? 'go' : 'goL';
    sfx.whisper(); setTimeout(function () { el.className = ''; }, 1700);
  }
  function door() {
    var el = $('doorFx'), left = Math.random() < .5;
    el.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;' + (left ? 'left:0' : 'right:0') + ';top:18%;height:62%;width:30%"><rect x="10" y="0" width="80" height="100" fill="#000"/><g id="dEyes" opacity="0"><circle cx="46" cy="40" r="1.6" fill="#eee"/><circle cx="56" cy="40" r="1.6" fill="#eee"/></g><rect id="dLeaf" x="10" y="0" width="80" height="100" fill="#2a1a10" stroke="#120a06" style="transform-origin:' + (left ? '10px' : '90px') + ' 50px;transition:transform 4s ease-in"/></svg>';
    sfx.creak(3.6);
    setTimeout(function () { var l = document.getElementById('dLeaf'); if (l) l.style.transform = 'scaleX(.18)'; }, 60);
    setTimeout(function () { var e = document.getElementById('dEyes'); if (e) e.setAttribute('opacity', '1'); }, 3400);
    setTimeout(function () { var e = document.getElementById('dEyes'); if (e) e.setAttribute('opacity', '0'); }, 3900);
    setTimeout(function () { el.innerHTML = ''; }, 6000);
  }
  function lights(ms) {
    var li = $('light'), bo = $('blackout'); ms = ms || 2600;
    // ゆっくり2回だけ（点滅は毎秒3回未満）
    li.classList.add('out'); bo.classList.add('on'); sfx.breath();
    setTimeout(function () { bo.classList.remove('on'); }, 450);
    setTimeout(function () { bo.classList.add('on'); }, 900);
    setTimeout(function () { bo.classList.remove('on'); li.classList.remove('out'); }, ms);
    BGM.duck(ms);
  }
  function hands() {
    var box = $('hands'); box.innerHTML = '';
    var n = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) (function (i) { setTimeout(function () { var h = document.createElement('i'); h.style.left = (8 + Math.random() * 70) + 'vw'; h.style.top = (14 + Math.random() * 60) + 'vh'; h.innerHTML = ART.hand(Math.round(Math.random() * 60 - 30)); box.appendChild(h); sfx.drip(); }, i * 420); })(i);
    setTimeout(function () { box.innerHTML = ''; }, 9500);
  }
  function whisper(name) {
    var w = $('whisper'); w.textContent = '……' + name + '……'; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on');
    speakWhisper(name + '…………' + name, { pitch: 0.05, rate: 0.5 });
  }
  function phone(ms) { var r = $('ringing'); r.classList.add('on'); sfx.phone(ms / 1000); vibrate([400, 300, 400]); setTimeout(function () { r.classList.remove('on'); }, ms); }
  // ---- 演出の入口（ホストから届いた出来事・自分だけの出来事） ----
  function play(kind, arg, opt) {
    opt = opt || {};
    if (!opt.silent) narr(kind, arg);
    switch (kind) {
      case 'face': jump(); break;
      case 'edge': edge(); break;
      case 'door': door(); break;
      case 'lights': lights(); break;
      case 'hands': hands(); break;
      case 'whisper': whisper(arg || '…'); break;
      case 'phone': phone(4500); break;
      case 'knock': sfx.knock(3 + Math.floor(Math.random() * 3)); break;
      case 'steps': sfx.steps(5 + Math.floor(Math.random() * 3), Math.random() * 1.6 - 0.8); break;
      case 'quiet': BGM.duck(5500); break;
      case 'giggle': sfx.giggle(); break;
      case 'scream': sfx.scream(true); break;
      case 'slam': sfx.slam(); shake(); vibrate(120); break;
      case 'rock': sfx.creak(1.6); setScene('rock', 9000); break;
      case 'mirror': setScene('ghost', 2600); break;
      case 'eyes': setScene('eyes', 2200); break;
      case 'plates': setScene('plates', 8000); break;
    }
  }
  // ---- 懐中電灯（指・マウスの位置を照らす。気配で光が小さくなる） ----
  var lx = 0.5, ly = 0.45, tx = 0.5, ty = 0.45, t0 = Date.now();
  function onMove(e) { var r = $('stageWrap').getBoundingClientRect(), p = e.touches ? e.touches[0] : e; if (!p || !r.width) return; tx = (p.clientX - r.left) / r.width; ty = (p.clientY - r.top) / r.height; }
  $('stageWrap').addEventListener('pointermove', onMove, { passive: true });
  $('stageWrap').addEventListener('pointerdown', onMove, { passive: true });
  $('stageWrap').addEventListener('touchmove', onMove, { passive: true });
  var gctx = $('grain').getContext('2d'), gimg = gctx.createImageData(160, 280), lastG = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!document.body.classList.contains('in-game')) return;
    var now = Date.now(), r = $('stageWrap').getBoundingClientRect(), tt = (now - t0) / 1000;
    lx += (tx - lx) * 0.12; ly += (ty - ly) * 0.12;
    var sx = lx + Math.sin(tt * 1.3) * 0.012 + Math.sin(tt * 3.1) * 0.004, sy = ly + Math.cos(tt * 1.1) * 0.012;
    var rad = Math.min(r.width, r.height) * (0.62 - stageLv * 0.07), li = $('light');
    li.style.setProperty('--lx', (sx * 100).toFixed(1) + '%'); li.style.setProperty('--ly', (sy * 100).toFixed(1) + '%');
    li.style.setProperty('--lr', Math.round(rad * (0.96 + Math.sin(tt * 7) * 0.02)) + 'px'); li.style.setProperty('--dk', (0.66 + stageLv * 0.07).toFixed(2));
    if (now - lastG > 90) { lastG = now; var d = gimg.data; for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gctx.putImageData(gimg, 0, 0); }
  }
  requestAnimationFrame(frame);
  return { play: play, jump: jump, scene: scene, setStage: function (s) { stageLv = s; }, narr: narr, shake: shake };
})();
