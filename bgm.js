/* よびごえの館：環境音（雨・風・低いうなり・心臓の音・不協和音）。気配（dread）が上がるほど こわくなる。すべて Web Audio で合成 */
'use strict';
var BGM = (function () {
  var cur = null, wanted = null, bus = null, nodes = [], timer = null, dread = 0, duckUntil = 0, nextBeat = 0, nextRand = 0, analyser = null, step = 0, nextNote = 0;
  var lvl = {};
  function ctx() { return audioCtx; }
  var LULLABY = [4, 3, 2, 3, 4, 4, 4, -1, 3, 3, 3, -1, 4, 2, 2, -1, 4, 3, 2, 3, 4, 4, 4, 4, 3, 3, 4, 3, 2, -1, -1, -1];   // 子守うた（ゆがんだオルゴール）
  function mk(type, f) { var o = audioCtx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  function gain(v) { var g = audioCtx.createGain(); g.gain.value = v; return g; }
  function bandNoise(type, f, q) { var n = noiseSrc(audioCtx), fl = audioCtx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; n.connect(fl); return { src: n, out: fl, f: fl }; }
  function build(mode) {
    var a = ctx(); bus = a.createGain(); bus.gain.setValueAtTime(0.0001, a.currentTime); bus.gain.linearRampToValueAtTime(1, a.currentTime + 2.5);
    analyser = a.createAnalyser(); analyser.fftSize = 512; bus.connect(analyser); bus.connect(master);
    function keep(src, out, g) { out.connect(g); g.connect(bus); src.start(); nodes.push(src); return g; }
    // 雨
    var r = bandNoise('highpass', 900); var r2 = a.createBiquadFilter(); r2.type = 'lowpass'; r2.frequency.value = mode === 'ending' ? 2500 : 7000; r.out.connect(r2);
    lvl.rain = keep(r.src, r2, gain(mode === 'title' ? 0.11 : mode === 'ending' ? 0.03 : 0.07));
    // 風（ゆっくりうねる）
    var w = bandNoise('bandpass', 420, 2.2), wl = mk('sine', 0.07), wg = gain(260); wl.connect(wg); wg.connect(w.f.frequency); wl.start(); nodes.push(wl);
    var wv = gain(mode === 'ending' ? 0.02 : 0.09), wl2 = mk('sine', 0.11), wg2 = gain(0.05); wl2.connect(wg2); wg2.connect(wv.gain); wl2.start(); nodes.push(wl2);
    lvl.wind = keep(w.src, w.out, wv);
    if (mode === 'ending') {   // 夜明け：やわらかい和音
      [196, 247, 294, 392].forEach(function (f, i) { var o = mk('triangle', f), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.detune.value = i * 3 - 4; o.connect(lp); keep(o, lp, gain(0.022)); });
      return;
    }
    // 低いうなり
    var lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lvl.droneF = lp;
    var d1 = mk('sawtooth', 41.2), d2 = mk('sawtooth', 41.5), d3 = mk('sawtooth', 58.3); d1.connect(lp); d2.connect(lp); d3.connect(lp); d2.start(); d3.start(); nodes.push(d2, d3);
    lvl.drone = keep(d1, lp, gain(mode === 'title' ? 0.05 : 0.07));
    // 高い不協和音（気配で大きくなる）
    var tg = gain(0.0001), trem = mk('sine', 5.3), tremg = gain(0.4); trem.connect(tremg);
    [880, 932, 1245, 1319].forEach(function (f) { var o = mk('sine', f), og = gain(0.25); o.connect(og); og.connect(tg); tremg.connect(og.gain); o.start(); nodes.push(o); });
    trem.start(); nodes.push(trem); tg.connect(bus); lvl.tension = tg;
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bus) { var b = bus, ns = nodes, a = ctx(); try { b.gain.cancelScheduledValues(a.currentTime); b.gain.setTargetAtTime(0.0001, a.currentTime, 0.4); } catch (e) {} setTimeout(function () { ns.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { b.disconnect(); } catch (e) {} }, 2500); }
    bus = null; nodes = []; lvl = {}; cur = null;
  }
  function start(mode) {
    stop(); cur = mode; build(mode); var a = ctx(); nextBeat = a.currentTime + 1; nextRand = a.currentTime + 4; nextNote = a.currentTime + 1.5; step = 0;
    timer = setInterval(tickA, 100); apply();
  }
  function apply() {
    var a = ctx(); if (!a || !bus) return; var t = a.currentTime, s = dread / 100, ducked = Date.now() < duckUntil;
    if (lvl.tension) lvl.tension.gain.setTargetAtTime(ducked ? 0.0001 : (cur === 'chase' ? 0.05 : Math.max(0.0001, (s - 0.25) * 0.06)), t, 0.8);
    if (lvl.droneF) lvl.droneF.frequency.setTargetAtTime(cur === 'chase' ? 420 : 140 + s * 260, t, 1);
    if (lvl.drone) lvl.drone.gain.setTargetAtTime(ducked ? 0.0001 : (cur === 'chase' ? 0.12 : 0.05 + s * 0.06), t, 0.6);
    if (lvl.rain) lvl.rain.gain.setTargetAtTime(ducked ? 0.0001 : (cur === 'title' ? 0.11 : cur === 'ending' ? 0.03 : 0.07), t, 0.3);
    if (lvl.wind) lvl.wind.gain.setTargetAtTime(ducked ? 0.0001 : (cur === 'ending' ? 0.02 : 0.09), t, 0.3);
  }
  function tickA() {
    var a = ctx(); if (!a || !bus || a.state !== 'running') return;
    var t = a.currentTime, ducked = Date.now() < duckUntil;
    apply();
    // 心臓の音
    var bpm = cur === 'chase' ? 138 : 50 + dread * 0.85, hv = cur === 'chase' ? 0.7 : Math.max(0, (dread - 18) / 82) * 0.6;
    if (t >= nextBeat) { if (hv > 0.02 && cur !== 'title' && cur !== 'ending' && !ducked) sfx.heart(hv); nextBeat = t + 60 / bpm; }
    // タイトル：ゆがんだオルゴール
    if (cur === 'title' && t >= nextNote) { var n = LULLABY[step % LULLABY.length]; step++; if (n >= 0) { var o = gain(0.18); o.connect(bus); var f = [262, 311, 392, 466, 622][4 - n] * 0.98, x = mk('sine', f), g = gain(0.0001); x.detune.value = (Math.random() - 0.5) * 30; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); x.connect(g); g.connect(o); x.start(t); x.stop(t + 1.7); } nextNote = t + 0.62 + (step % 8 === 0 ? 0.4 : 0); }
    // ときどき、きしむ音・しずく
    if (t >= nextRand && cur === 'game' && !ducked) { var r = Math.random(); if (r < 0.4) sfx.drip(); else if (r < 0.7) sfx.creak(1.2 + Math.random()); else if (r < 0.8) sfx.thunder(); nextRand = t + 6 + Math.random() * 10; }
  }
  var api = {
    want: function (m) { wanted = m; api.sync(); },
    setDread: function (d) { dread = d; apply(); },
    duck: function (ms) { duckUntil = Date.now() + ms; apply(); setTimeout(apply, ms + 50); },
    sync: function () { var a = ctx(), target = wanted; if (soundOff || document.hidden || !a || a.state !== 'running') target = null; if (target === cur) return; if (target) start(target); else stop(); },
    state: function () { return { cur: cur, wanted: wanted, off: soundOff, ctx: ctx() ? ctx().state : 'none', dread: dread }; },
    level: function () { if (!analyser) return 0; var buf = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }
  };
  return api;
})();
document.addEventListener('visibilitychange', function () { BGM.sync(); });
