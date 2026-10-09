/* よびごえの館：効果音（Web Audio で合成。外部の音源ファイルは使わない） */
'use strict';
var audioCtx = null, master = null;
function unlockAudio() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!audioCtx) {
      audioCtx = new AC(); audioCtx.onstatechange = function () { BGM.sync(); };
      var comp = audioCtx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.connect(audioCtx.destination);
      master = audioCtx.createGain(); master.gain.value = 0.9; master.connect(comp);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().then(function () { BGM.sync(); }, function () {}); else BGM.sync();
    // iOS：無音を1回鳴らしてロック解除
    var b = audioCtx.createBuffer(1, 1, 22050), s = audioCtx.createBufferSource(); s.buffer = b; s.connect(audioCtx.destination); s.start(0);
  } catch (e) {}
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
var NB = null;
function noiseBuf(a) { if (!NB) { var len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; NB = buf; } return NB; }
function noiseSrc(a) { var n = a.createBufferSource(); n.buffer = noiseBuf(a); n.loop = true; return n; }
function env(g, at, peak, atk, rel) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + atk); g.gain.exponentialRampToValueAtTime(0.0001, at + atk + rel); }
function scareVol() { return scareLv === 'strong' ? 1 : scareLv === 'normal' ? 0.72 : 0.38; }
var sfx = (function () {
  function ctx() { var a = audioCtx; return a && a.state === 'running' && !soundOff ? a : null; }
  function out(a, v, pan) { var g = a.createGain(); g.gain.value = v; if (pan && a.createStereoPanner) { var p = a.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master); return g; }
  function tone(a, o, f, at, dur, type, vol, atk) { var x = a.createOscillator(), g = a.createGain(); x.type = type || 'sine'; x.frequency.value = f; env(g, at, vol, atk || 0.008, dur); x.connect(g); g.connect(o); x.start(at); x.stop(at + (atk || 0.008) + dur + 0.05); return x; }
  function nz(a, o, at, dur, type, f, q, vol, atk) { var n = noiseSrc(a), fl = a.createBiquadFilter(), g = a.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1; env(g, at, vol, atk || 0.005, dur); n.connect(fl); fl.connect(g); g.connect(o); n.start(at, Math.random()); n.stop(at + (atk || 0.005) + dur + 0.05); return fl; }
  function thump(a, o, at, f, vol) { var x = a.createOscillator(), g = a.createGain(); x.frequency.setValueAtTime(f, at); x.frequency.exponentialRampToValueAtTime(f * 0.45, at + 0.18); env(g, at, vol, 0.004, 0.22); x.connect(g); g.connect(o); x.start(at); x.stop(at + 0.3); nz(a, o, at, 0.08, 'lowpass', 500, 1, vol * 0.5); }
  var S = {
    ui: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.25); tone(a, o, 660, t, 0.07, 'triangle', 0.3); },
    open: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.35); var f = nz(a, o, t, 0.35, 'bandpass', 900, 12, 0.6, 0.05); f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1300, t + 0.35); },
    creak: function (len) { var a = ctx(); if (!a) return; len = len || 2.2; var t = a.currentTime, o = out(a, 0.4 * scareVol() + 0.1, -0.3), x = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      x.type = 'sawtooth'; x.frequency.setValueAtTime(70, t); x.frequency.linearRampToValueAtTime(110, t + len * 0.6); x.frequency.linearRampToValueAtTime(60, t + len);
      lfo.frequency.value = 23; lg.gain.value = 18; lfo.connect(lg); lg.connect(x.frequency);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.3); g.gain.setValueAtTime(0.5, t + len - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len);
      x.connect(f); f.connect(g); g.connect(o); x.start(t); lfo.start(t); x.stop(t + len + 0.1); lfo.stop(t + len + 0.1); },
    knock: function (n, far) { var a = ctx(); if (!a) return; var t = a.currentTime + 0.05, o = out(a, (far ? 0.35 : 0.8) * scareVol() + 0.1, far ? 0.6 : -0.2); for (var i = 0; i < (n || 3); i++) thump(a, o, t + i * 0.32 + Math.random() * 0.05, 140, 0.9); },
    steps: function (n, pan) { var a = ctx(); if (!a) return; var t = a.currentTime + 0.05, o = out(a, 0.55 * scareVol() + 0.1, pan || 0); for (var i = 0; i < (n || 6); i++) { thump(a, o, t + i * 0.62, 90, 0.5 + i * 0.07); nz(a, o, t + i * 0.62 + 0.03, 0.12, 'bandpass', 1500, 2, 0.08); } },
    slam: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.9 * scareVol() + 0.1); thump(a, o, t, 70, 1); nz(a, o, t, 0.6, 'lowpass', 300, 0.7, 0.8, 0.003); nz(a, o, t + 0.02, 0.3, 'bandpass', 2400, 3, 0.15); },
    stinger: function () { var a = ctx(); if (!a) return; var t = a.currentTime, v = scareVol(), o = out(a, 0.95 * v);
      nz(a, o, t, 0.9, 'highpass', 1200, 0.5, 0.9, 0.003);
      [311, 330, 349, 466, 494, 740].forEach(function (f, i) { var x = a.createOscillator(), g = a.createGain(); x.type = 'sawtooth'; x.frequency.setValueAtTime(f * 1.5, t); x.frequency.exponentialRampToValueAtTime(f * 0.7, t + 1.3); env(g, t, 0.16, 0.006, 1.3); x.connect(g); g.connect(o); x.start(t); x.stop(t + 1.5); });
      thump(a, o, t, 60, 1); var s = a.createOscillator(), sg = a.createGain(), sl = a.createOscillator(), sll = a.createGain(); s.type = 'square'; s.frequency.setValueAtTime(1900, t); s.frequency.exponentialRampToValueAtTime(900, t + 0.8); sl.frequency.value = 28; sll.gain.value = 120; sl.connect(sll); sll.connect(s.frequency); env(sg, t, 0.12, 0.01, 0.8); s.connect(sg); sg.connect(o); s.start(t); sl.start(t); s.stop(t + 0.9); sl.stop(t + 0.9); },
    whisper: function (pan) { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.5 * scareVol() + 0.15, pan == null ? (Math.random() < .5 ? -0.8 : 0.8) : pan);
      for (var i = 0; i < 9; i++) { var at = t + i * 0.16 + Math.random() * 0.08, f = nz(a, o, at, 0.12 + Math.random() * 0.1, 'bandpass', 2500 + Math.random() * 3000, 8, 0.35, 0.04); f.frequency.linearRampToValueAtTime(1800 + Math.random() * 2000, at + 0.2); } },
    breath: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.5 * scareVol() + 0.1, 0.4); nz(a, o, t, 1.1, 'bandpass', 700, 1.5, 0.5, 0.6); nz(a, o, t + 1.9, 1.3, 'bandpass', 500, 1.5, 0.4, 0.3); },
    scream: function (far) { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, (far ? 0.25 : 0.6) * scareVol() + 0.05, far ? (Math.random() < .5 ? -0.9 : 0.9) : 0), x = a.createOscillator(), x2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), vib = a.createOscillator(), vg = a.createGain();
      x.type = 'sawtooth'; x2.type = 'sawtooth'; x.frequency.setValueAtTime(700, t); x.frequency.linearRampToValueAtTime(1150, t + 0.25); x.frequency.exponentialRampToValueAtTime(500, t + 1.4); x2.frequency.value = 0; x2.detune.value = 0;
      vib.frequency.value = 7; vg.gain.value = 40; vib.connect(vg); vg.connect(x.frequency);
      f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 3; if (far) { var lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; f.connect(lp); lp.connect(g); } else f.connect(g);
      env(g, t, 0.6, 0.05, 1.4); x.connect(f); g.connect(o); x.start(t); vib.start(t); x.stop(t + 1.6); vib.stop(t + 1.6); },
    phone: function (dur) { var a = ctx(); if (!a) return; dur = dur || 4; var t = a.currentTime, o = out(a, 0.35 * scareVol() + 0.08, 0.5);
      for (var r = 0; r < Math.ceil(dur / 2.2); r++) { var at = t + r * 2.2, x = a.createOscillator(), m = a.createOscillator(), mg = a.createGain(), g = a.createGain(); x.type = 'square'; x.frequency.value = 1300; m.type = 'square'; m.frequency.value = 22; mg.gain.value = 0.5; m.connect(mg); mg.connect(g.gain); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.25, at + 0.02); g.gain.setValueAtTime(0.25, at + 1.1); g.gain.linearRampToValueAtTime(0.0001, at + 1.15);
        var lp = a.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 2200; lp.Q.value = 2; x.connect(lp); lp.connect(g); g.connect(o); x.start(at); m.start(at); x.stop(at + 1.2); m.stop(at + 1.2); } },
    static: function (dur) { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.3); nz(a, o, t, dur || 1.2, 'bandpass', 3000, 0.6, 0.4, 0.02); },
    correct: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.32); [392, 466, 587, 740].forEach(function (f, i) { tone(a, o, f, t + i * 0.12, 1.4, 'sine', 0.3); tone(a, o, f * 2.01, t + i * 0.12, 0.6, 'triangle', 0.05); }); nz(a, o, t, 1.2, 'highpass', 6000, 0.5, 0.05, 0.4); },
    wrong: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.4); tone(a, o, 98, t, 0.7, 'sawtooth', 0.4); tone(a, o, 104, t, 0.7, 'sawtooth', 0.4); nz(a, o, t, 0.25, 'lowpass', 400, 1, 0.5); },
    note: function (i) { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.4), f = [262, 311, 392, 466, 622][4 - i];   // 0＝いちばん大きい人形＝低い
      tone(a, o, f, t, 1.3, 'sine', 0.45, 0.003); tone(a, o, f * 3.01, t, 0.5, 'sine', 0.12, 0.002); tone(a, o, f * 5.4, t, 0.25, 'sine', 0.05, 0.002); },
    bell: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.45); [220, 440 * 1.19, 660 * 1.07, 880 * 1.33, 1320].forEach(function (f, i) { tone(a, o, f, t, 3.2 - i * 0.5, 'sine', 0.35 / (i + 1), 0.002); }); },
    thunder: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.5); nz(a, o, t, 0.3, 'highpass', 1800, 0.7, 0.5); nz(a, o, t + 0.05, 2.2, 'lowpass', 220, 0.7, 0.9, 0.1); },
    heart: function (vol) { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, vol || 0.5); thump(a, o, t, 60, 0.9); thump(a, o, t + 0.22, 52, 0.6); },
    giggle: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.35 * scareVol() + 0.05, Math.random() < .5 ? -0.7 : 0.7);
      for (var i = 0; i < 5; i++) { var at = t + i * 0.13, x = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(); x.type = 'sawtooth'; x.frequency.setValueAtTime(620 - i * 18, at); x.frequency.linearRampToValueAtTime(520 - i * 18, at + 0.09); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 4; env(g, at, 0.35, 0.01, 0.09); x.connect(f); f.connect(g); g.connect(o); x.start(at); x.stop(at + 0.12); } },
    drip: function () { var a = ctx(); if (!a) return; var t = a.currentTime, o = out(a, 0.3, Math.random() * 2 - 1), x = a.createOscillator(), g = a.createGain(); x.frequency.setValueAtTime(1800, t); x.frequency.exponentialRampToValueAtTime(600, t + 0.08); env(g, t, 0.3, 0.002, 0.1); x.connect(g); g.connect(o); x.start(t); x.stop(t + 0.15); }
  };
  return S;
})();
// 名前をささやく（読み上げ機能。使えない端末ではノイズのささやきだけ）
function speakWhisper(text, opts) {
  sfx.whisper();
  if (soundOff) return;
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    var u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; u.rate = (opts && opts.rate) || 0.6; u.pitch = (opts && opts.pitch != null) ? opts.pitch : 0.1; u.volume = Math.min(1, 0.35 + scareVol() * 0.6);
    var vs = speechSynthesis.getVoices().filter(function (v) { return /ja/i.test(v.lang); }); if (vs.length) u.voice = vs[0];
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
function setSound(off) {
  soundOff = off; store(LS_SOUND, off ? '1' : null);
  if (off) { try { speechSynthesis.cancel(); } catch (e) {} }
  if (!off) unlockAudio();
  BGM.sync(); soundUi();
}
function soundUi() {
  $('soundBtn').textContent = soundOff ? '🔇' : '🔊'; $('soundBtn').setAttribute('aria-label', soundOff ? '音をオンにする' : '音をオフにする');
  ['menuSound', 'soundBtnT', 'soundBtnW'].forEach(function (id) { $(id).textContent = soundOff ? '🔇 音：オフ（こわさ半減…）' : '🔊 音：オン'; });
}
$('soundBtn').onclick = function () { setSound(!soundOff); toast(soundOff ? '🔇 音をオフにしました' : '🔊 音をオンにしました'); };
$('menuSound').onclick = $('soundBtnT').onclick = $('soundBtnW').onclick = function () { setSound(!soundOff); };
soundUi();
