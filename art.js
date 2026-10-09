/* よびごえの館：絵（すべて SVG で手描き・手続き生成。外部画像なし） */
'use strict';
var ART = (function () {
  function pillW(t) { return Math.max(34, t.length * 10 + 12); }
  // 部屋の中の「しらべられるもの」
  function hs(o, x, y, w, h, art, py) {
    if (!o) return '';
    var cls = 'hs ' + (o.kind === 'look' ? 'look' : o.kind) + (o.solved ? ' done' : ''), pw = pillW(o.label), px = x + w / 2, pyy = py != null ? py : y + h - 8;
    return '<g class="' + cls + '" data-o="' + o.id + '"><g class="art">' + art + '</g><rect class="hit" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' +
      '<rect class="pill" x="' + (px - pw / 2) + '" y="' + (pyy - 8) + '" width="' + pw + '" height="16" rx="8"/><text class="plt" x="' + px + '" y="' + pyy + '">' + (o.solved ? '✓ ' : '') + esc(o.label) + '</text>' +
      '<circle class="glint" cx="' + (x + w * 0.8) + '" cy="' + (y + 8) + '" r="2" style="animation-delay:' + (Math.random() * 4).toFixed(1) + 's"/></g>';
  }
  var DEFS = '<defs>' +
    '<radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a2a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#2a1a10"/><stop offset=".5" stop-color="#3d2616"/><stop offset="1" stop-color="#22150c"/></linearGradient>' +
    '<linearGradient id="gold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#8a6a2a"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#5a4218"/></linearGradient>' +
    '<linearGradient id="glassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a6470"/><stop offset=".5" stop-color="#2a2f36"/><stop offset="1" stop-color="#15181c"/></linearGradient>' +
    '<linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140d09"/><stop offset="1" stop-color="#2a1a10"/></linearGradient>' +
    '<radialGradient id="faceG" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#e2e6e8"/><stop offset=".6" stop-color="#a9b0b6"/><stop offset="1" stop-color="#5a6066"/></radialGradient>' +
    '</defs>';
  function base(wa, wb, pat, opt) {
    opt = opt || {};
    var s = '<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + DEFS +
      '<defs><linearGradient id="wl' + wa.slice(1) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + wb + '"/><stop offset=".7" stop-color="' + wa + '"/><stop offset="1" stop-color="' + wb + '"/></linearGradient>' +
      '<pattern id="pt' + wa.slice(1) + '" width="24" height="30" patternUnits="userSpaceOnUse">' + pat + '</pattern></defs>' +
      '<rect width="300" height="420" fill="#000"/><rect width="300" height="300" fill="url(#wl' + wa.slice(1) + ')"/><rect width="300" height="300" fill="url(#pt' + wa.slice(1) + ')" opacity=".22"/>';
    if (!opt.stone) s += '<rect y="250" width="300" height="50" fill="#140c08"/>' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (6 + i * 49) + '" y="256" width="40" height="38" fill="none" stroke="#2a1a10" stroke-width="2"/>'; }).join('') + '<rect y="248" width="300" height="4" fill="#3a2414"/>';
    s += '<polygon points="0,300 300,300 300,420 0,420" fill="' + (opt.floor || 'url(#floorG)') + '"/>';
    for (var i = -6; i <= 6; i++) s += '<line x1="' + (150 + i * 22) + '" y1="300" x2="' + (150 + i * 70) + '" y2="420" stroke="#000" stroke-opacity=".35" stroke-width="1"/>';
    s += '<line x1="0" y1="330" x2="300" y2="330" stroke="#000" stroke-opacity=".2"/><line x1="0" y1="370" x2="300" y2="370" stroke="#000" stroke-opacity=".2"/>';
    s += '<rect width="300" height="60" fill="url(#shadeTop)"/><defs><linearGradient id="shadeTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>';
    return s;
  }
  var DAMASK = '<path d="M12 3 C16 9 20 11 12 18 C4 11 8 9 12 3 Z" fill="#000"/><circle cx="0" cy="24" r="2" fill="#000"/><circle cx="24" cy="24" r="2" fill="#000"/>';
  var STARS = '<path d="M12 8 l1.5 3.5 3.5.5-2.6 2.4.7 3.6-3.1-1.8-3.1 1.8.7-3.6L7 12l3.5-.5z" fill="#fff" opacity=".5"/><circle cx="3" cy="25" r="1" fill="#fff" opacity=".4"/>';
  var TILE = '<rect width="24" height="30" fill="none" stroke="#000" stroke-width="1.2"/><rect x="2" y="2" width="20" height="26" fill="#fff" opacity=".06"/>';
  var STONE = '<rect width="24" height="15" fill="none" stroke="#000" stroke-width="1.2"/><rect x="-12" y="15" width="24" height="15" fill="none" stroke="#000" stroke-width="1.2"/><rect x="12" y="15" width="24" height="15" fill="none" stroke="#000" stroke-width="1.2"/>';
  function candleAt(x, y, h, lit) { return '<rect x="' + (x - 2.5) + '" y="' + (y - h) + '" width="5" height="' + h + '" fill="#e8dcc4"/>' + (lit === false ? '' : '<circle cx="' + x + '" cy="' + (y - h - 4) + '" r="14" fill="url(#cg)"/><path class="flame" d="M' + x + ' ' + (y - h - 10) + ' q3.5 5 0 9 q-3.5 -4 0 -9z" fill="#ffcf6a"/>'); }
  function rainWin(x, y, w, h) {
    var s = '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#0b1018"/>' + '<rect class="lightning" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#c8d4ff" opacity="0"/>' +
      '<g class="rain" clip-path="url(#wc' + x + ')">';
    for (var i = 0; i < 9; i++) { var rx = x + 4 + Math.random() * (w - 8), ry = y + Math.random() * h; s += '<line x1="' + rx + '" y1="' + ry + '" x2="' + (rx - 2) + '" y2="' + (ry + 10) + '" stroke="#6a7a9a" stroke-width=".8" style="animation-delay:-' + (Math.random()).toFixed(2) + 's"/>'; }
    s += '</g><clipPath id="wc' + x + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>';
    s += '<path d="M' + (x + 6) + ' ' + (y + h) + ' l8 -22 l6 10 l10 -26 l8 18 l6 -8 l' + (w - 50) + ' ' + 28 + 'z" fill="#05070a"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="#3a2414" stroke-width="5"/><line x1="' + (x + w / 2) + '" y1="' + y + '" x2="' + (x + w / 2) + '" y2="' + (y + h) + '" stroke="#3a2414" stroke-width="3"/><line x1="' + x + '" y1="' + (y + h / 2) + '" x2="' + (x + w) + '" y2="' + (y + h / 2) + '" stroke="#3a2414" stroke-width="3"/></g>';
    return s;
  }
  function headSil(cx, cy, s, col) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + 9 * s + '" ry="' + 11 * s + '" fill="' + col + '"/><path d="M' + (cx - 18 * s) + ' ' + (cy + 30 * s) + ' q' + 18 * s + ' -' + 22 * s + ' ' + 36 * s + ' 0z" fill="' + col + '"/>'; }
  function clockArt(x, y, h, m, swing) {
    var cx = x + 25, cy = y + 32, ha = (h % 12 + m / 60) * 30, ma = m * 6;
    var s = '<path d="M' + x + ' ' + (y + 12) + ' q25 -22 50 0 v188 h-50z" fill="url(#wood)" stroke="#120a06"/><circle cx="' + cx + '" cy="' + cy + '" r="17" fill="#d8ccb0" stroke="url(#gold)" stroke-width="3"/>';
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; s += '<line x1="' + (cx + Math.sin(a) * 13) + '" y1="' + (cy - Math.cos(a) * 13) + '" x2="' + (cx + Math.sin(a) * 15.5) + '" y2="' + (cy - Math.cos(a) * 15.5) + '" stroke="#2a1e12" stroke-width="1.2"/>'; }
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - 8) + '" stroke="#1a120a" stroke-width="2.4" stroke-linecap="round" transform="rotate(' + ha + ' ' + cx + ' ' + cy + ')"/><line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - 13) + '" stroke="#1a120a" stroke-width="1.4" stroke-linecap="round" transform="rotate(' + ma + ' ' + cx + ' ' + cy + ')"/>';
    s += '<rect x="' + (x + 10) + '" y="' + (y + 62) + '" width="30" height="110" fill="#0c0806" stroke="url(#gold)"/><g class="' + (swing ? 'swing' : '') + '"><line x1="' + cx + '" y1="' + (y + 64) + '" x2="' + cx + '" y2="' + (y + 150) + '" stroke="#b08a3a" stroke-width="1.5"/><circle cx="' + cx + '" cy="' + (y + 152) + '" r="8" fill="url(#gold)"/></g>';
    return s;
  }
  function frame(x, y, w, h, inner) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#gold)"/><rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (h - 10) + '" fill="#120d10"/>' + inner; }
  function bookcase(x, y, w, h) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#1c120a"/>', cols = ['#4a1a1a', '#1a3a2a', '#2a2a4a', '#4a3a1a', '#3a1a3a', '#2a1a10'];
    for (var r = 0; r < 4; r++) { var sy = y + 8 + r * (h / 4); s += '<rect x="' + x + '" y="' + (sy + h / 4 - 12) + '" width="' + w + '" height="4" fill="#3a2414"/>'; var bx = x + 4; while (bx < x + w - 8) { var bw = 5 + Math.random() * 6, bh = h / 4 - 22 + Math.random() * 8; s += '<rect x="' + bx + '" y="' + (sy + h / 4 - 12 - bh) + '" width="' + bw + '" height="' + bh + '" fill="' + pick(cols) + '" opacity=".85"/>'; bx += bw + 1; } }
    return s;
  }
  // ---------- 部屋 ----------
  function room(id, objs, st) {
    st = st || {}; var O = {}; (objs || []).forEach(function (o) { O[o.id] = o; });
    var s;
    if (id === 'hall') {
      s = base('#2a1214', '#120607', DAMASK);
      s += '<path d="M110 300 V170 q40 -40 80 0 V300z" fill="#0a0506"/>';
      s += hs(O.portraits, 30, 22, 240, 92, frame(34, 26, 70, 80, headSil(69, 56, 1.2, '#2a2228')) + frame(115, 22, 70, 86, headSil(150, 54, 1.25, '#2e2228') + '<circle cx="146" cy="52" r="1.2" fill="#ff2a3a"/><circle cx="154" cy="52" r="1.2" fill="#ff2a3a"/>') + frame(196, 26, 70, 80, headSil(231, 56, 1.2, '#2a2228')), 110);
      s += hs(O.clock, 10, 118, 56, 212, clockArt(13, 124, st.clockH || 3, st.clockM || 40, O.clock && O.clock.solved));
      s += hs(O.door, 108, 150, 84, 152, '<path d="M114 300 V180 q36 -34 72 0 V300z" fill="url(#wood)" stroke="#0a0604" stroke-width="2"/><line x1="150" y1="164" x2="150" y2="300" stroke="#0a0604" stroke-width="2"/><rect x="122" y="196" width="22" height="40" fill="none" stroke="#120a06"/><rect x="156" y="196" width="22" height="40" fill="none" stroke="#120a06"/><rect x="122" y="248" width="22" height="40" fill="none" stroke="#120a06"/><rect x="156" y="248" width="22" height="40" fill="none" stroke="#120a06"/><circle cx="143" cy="244" r="4" fill="none" stroke="url(#gold)" stroke-width="1.5"/><circle cx="157" cy="244" r="4" fill="none" stroke="url(#gold)" stroke-width="1.5"/><rect x="114" y="298" width="72" height="3" fill="#ffb24a" opacity=".25"/>', 290);
      s += hs(O.mirror, 226, 124, 60, 120, '<ellipse cx="256" cy="182" rx="26" ry="54" fill="url(#gold)"/><ellipse cx="256" cy="182" rx="21" ry="48" fill="url(#glassG)"/>' + headSil(256, 176, 0.9, 'rgba(10,10,14,.55)') + (st.ghost ? headSil(266, 166, 1, 'rgba(0,0,0,.9)') + '<circle cx="263" cy="164" r="1.3" fill="#fff"/><circle cx="269" cy="164" r="1.3" fill="#fff"/>' : '') + '<path d="M240 150 q6 -14 14 -18" stroke="#fff" stroke-opacity=".25" fill="none"/>', 236);
      s += hs(O.candles, 72, 222, 34, 108, '<path d="M78 326 h22 l-4 -6 h-14z" fill="url(#gold)"/><rect x="87.5" y="262" width="3" height="58" fill="url(#gold)"/><path d="M74 266 q15 12 30 0" stroke="url(#gold)" stroke-width="2.5" fill="none"/>' + [[74, 266, 14], [84, 270, 12], [94, 270, 12], [104, 266, 14]].map(function (c) { return candleAt(c[0], c[1], c[2], !(O.candles && O.candles.pre)); }).join(''), 318);
      s += hs(O.phone, 206, 258, 72, 74, '<ellipse cx="242" cy="290" rx="32" ry="7" fill="url(#wood)"/><rect x="238" y="292" width="8" height="38" fill="#22150c"/><path d="M226 290 l6 -14 h20 l6 14z" fill="#0c0a0c" stroke="#3a3440"/><path d="M224 276 q18 -12 36 0" stroke="#0c0a0c" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="242" cy="284" r="4" fill="#3a3440"/>', 322);
      s += hs(O.coat, 232, 334, 54, 76, '<rect x="257" y="336" width="4" height="70" fill="#2a1a10"/><path d="M246 344 q13 -10 26 0" stroke="#2a1a10" stroke-width="3" fill="none"/><path d="M244 346 q-6 30 4 50 h10 q4 -30 -4 -50z" fill="#1a1416"/><path d="M272 346 q8 28 -2 50 h-8 q-4 -28 2 -50z" fill="#201a1c"/>', 400);
    } else if (id === 'library') {
      s = base('#16201a', '#070a08', DAMASK);
      s += bookcase(0, 34, 100, 216) + bookcase(200, 34, 100, 216);
      s += hs(O.fireplace, 104, 150, 92, 102, '<rect x="104" y="150" width="92" height="100" fill="#3a3632"/><rect x="100" y="146" width="100" height="10" fill="#4a4440"/><path d="M118 250 V190 q32 -26 64 0 V250z" fill="#050404"/><circle cx="140" cy="244" r="2" fill="#ff5a1a" opacity=".7"/><circle cx="160" cy="246" r="1.5" fill="#ff7a2a" opacity=".6"/><circle cx="151" cy="242" r="1.2" fill="#ff3a0a" opacity=".6"/>', 240);
      s += hs(O.memo, 22, 96, 50, 54, '<rect x="28" y="100" width="38" height="44" fill="#d8ccb0" transform="rotate(-6 47 122)"/><circle cx="46" cy="102" r="2.5" fill="#a22"/><path d="M34 114 h22 M34 122 h26 M34 130 h18" stroke="#5a4a3a" stroke-width="1.4" transform="rotate(-6 47 122)"/>', 144);
      s += hs(O.drawer, 92, 280, 116, 60, '<rect x="92" y="282" width="116" height="12" fill="#3d2616"/><rect x="98" y="294" width="104" height="40" fill="url(#wood)"/><rect x="128" y="302" width="44" height="22" fill="#2a1a10" stroke="#120a06"/><rect x="144" y="308" width="12" height="10" rx="2" fill="url(#gold)"/>' + candleAt(110, 282, 10) + '<rect x="176" y="276" width="18" height="6" fill="#d8ccb0"/>', 334);
      s += hs(O.cookbook, 222, 226, 62, 70, '<path d="M240 296 l6 -44 h12 l6 44z" fill="#2a1a10"/><path d="M226 252 l26 -18 l26 18 l-26 8z" fill="#6a2a1a"/><path d="M230 252 l22 -14 l22 14" stroke="#d8ccb0" stroke-width="2" fill="none"/>', 288);
      s += hs(O.directory, 14, 292, 70, 58, '<rect x="18" y="314" width="62" height="30" fill="url(#wood)"/><rect x="24" y="300" width="50" height="16" fill="#1a2a3a" stroke="#0a1018"/><rect x="24" y="300" width="50" height="3" fill="#d8ccb0"/>', 342);
      s += hs(O.chair, 210, 312, 76, 92, '<g class="' + (st.rock ? 'rock' : '') + '"><path d="M222 396 q30 10 58 0" stroke="#3a2414" stroke-width="4" fill="none"/><rect x="230" y="318" width="40" height="48" rx="6" fill="#2a1a10"/><rect x="226" y="362" width="48" height="10" fill="#3a2414"/><rect x="230" y="370" width="4" height="24" fill="#3a2414"/><rect x="266" y="370" width="4" height="24" fill="#3a2414"/></g>', 398);
    } else if (id === 'nursery') {
      s = base('#2a2026', '#0e0a0d', STARS);
      s += rainWin(112, 40, 76, 92);
      s += hs(O.drawing, 30, 52, 66, 62, '<rect x="36" y="58" width="54" height="44" fill="#ece4d4" transform="rotate(4 63 80)"/><g transform="rotate(4 63 80)"><rect x="42" y="66" width="8" height="16" fill="none" stroke="#333"/><rect x="54" y="66" width="8" height="16" fill="none" stroke="#333"/><rect x="66" y="66" width="8" height="16" fill="none" stroke="#333"/><rect x="78" y="66" width="8" height="16" fill="none" stroke="#333"/><circle cx="52" cy="92" r="3" fill="none" stroke="#a22"/><circle cx="72" cy="92" r="3" fill="none" stroke="#333"/></g>', 108);
      s += hs(O.musicbox, 18, 152, 74, 66, '<rect x="14" y="196" width="82" height="8" fill="#3a2414"/><rect x="30" y="176" width="50" height="20" fill="#5a2a3a" stroke="url(#gold)"/><path d="M30 176 l6 -10 h38 l6 10z" fill="#6a3a4a" stroke="url(#gold)"/><g class="' + (st.music ? 'rock' : '') + '"><circle cx="55" cy="158" r="4" fill="#e8dcd8"/><path d="M51 172 l4 -10 l4 10z" fill="#e8dcd8"/></g>', 212);
      s += hs(O.closet, 218, 104, 74, 198, '<rect x="220" y="106" width="70" height="194" fill="url(#wood)" stroke="#0a0604" stroke-width="2"/><rect x="224" y="112" width="30" height="182" fill="#2a1a10"/><path d="M256 112 h30 v182 h-30z" fill="#22150c" transform="skewY(-2) translate(4 10)"/><rect x="254" y="112" width="6" height="182" fill="#000"/>' + (st.eyes ? '<circle cx="256" cy="190" r="1.4" fill="#fff"/><circle cx="258" cy="190" r="1.4" fill="#fff" opacity=".7"/>' : ''), 292);
      s += hs(O.crib, 12, 236, 92, 82, '<path d="M18 300 q40 26 80 0" stroke="#3a2414" stroke-width="4" fill="none"/><path d="M22 260 h72 v34 q-36 14 -72 0z" fill="#2a1a10" stroke="#3a2414"/>' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<line x1="' + (28 + i * 10) + '" y1="260" x2="' + (28 + i * 10) + '" y2="292" stroke="#4a3020" stroke-width="2"/>'; }).join('') + '<path d="M30 262 q30 -10 56 0" fill="#d8ccc4" opacity=".6"/>', 312);
      s += hs(O.tea, 120, 236, 92, 76, '<ellipse cx="166" cy="270" rx="40" ry="10" fill="#e8dcd4" opacity=".8"/><rect x="162" y="272" width="8" height="30" fill="#3a2414"/>' + [124, 144, 188, 208].map(function (x) { return '<rect x="' + (x - 6) + '" y="270" width="12" height="16" fill="#3a2414"/><rect x="' + (x - 6) + '" y="252" width="12" height="4" fill="#3a2414"/><rect x="' + (x - 6) + '" y="252" width="2" height="20" fill="#3a2414"/>'; }).join('') + '<rect x="150" y="260" width="8" height="8" rx="2" fill="#fff" opacity=".7"/><rect x="174" y="260" width="8" height="8" rx="2" fill="#fff" opacity=".7"/>', 304);
      s += hs(O.book, 30, 334, 84, 56, '<path d="M38 370 l34 -18 l34 18 l-34 12z" fill="#e8dcc4"/><path d="M72 352 v30" stroke="#a89a84"/><path d="M44 368 l22 -10 M50 372 l20 -10" stroke="#c44" stroke-width="1.3" opacity=".7"/><circle cx="88" cy="364" r="5" fill="none" stroke="#333"/>', 388);
    } else if (id === 'kitchen') {
      s = base('#1e2022', '#08090a', TILE);
      s += hs(O.shadows, 104, 46, 92, 104, '<rect x="106" y="48" width="88" height="96" fill="#cfc8ba" opacity=".22"/><rect x="106" y="48" width="88" height="96" fill="none" stroke="#5a5048"/>' + (st.shadowHint ? '<path d="M120 140 q8 -40 16 0z M150 140 q8 -30 16 0z" fill="#000" opacity=".5"/>' : ''), 140);
      s += hs(O.tally, 14, 56, 82, 64, '<rect x="16" y="58" width="78" height="54" fill="#1d2a22" stroke="#5a3a20" stroke-width="5"/><path d="M26 70 l2 30" stroke="#ddd" stroke-width="2" opacity=".8"/>', 114);
      s += hs(O.pot, 92, 186, 116, 120, '<rect x="96" y="186" width="108" height="114" fill="#2a2624"/><rect x="92" y="180" width="116" height="10" fill="#3a3430"/><path d="M110 300 V230 q40 -26 80 0 V300z" fill="#0a0606"/><circle cx="150" cy="292" r="22" fill="#ff5a1a" opacity=".22"/><path class="flame" d="M140 300 q4 -16 10 -6 q4 -14 10 6z" fill="#ff7a2a" opacity=".8"/><ellipse cx="150" cy="262" rx="30" ry="9" fill="#1a1a1c" stroke="#4a4a4e"/><path d="M120 262 q30 40 60 0" fill="#141416" stroke="#4a4a4e"/>' + (st.steam ? '<path d="M140 250 q-6 -14 2 -24 M156 250 q6 -14 -2 -26" stroke="#aaa" opacity=".4" fill="none"/>' : ''), 300);
      s += hs(O.gramophone, 12, 172, 76, 100, '<rect x="10" y="252" width="84" height="8" fill="#3a2414"/><rect x="22" y="232" width="44" height="20" fill="url(#wood)"/><ellipse cx="44" cy="232" rx="18" ry="4" fill="#111"/><path d="M50 230 q10 -30 20 -38 q-2 18 16 30 q-20 4 -36 8z" fill="url(#gold)"/><path d="M70 192 q-2 18 16 30" stroke="#5a4218" fill="none"/>', 266);
      s += hs(O.cupboard, 214, 60, 78, 196, '<rect x="216" y="62" width="74" height="190" fill="url(#wood)" stroke="#0a0604"/><rect x="222" y="70" width="62" height="100" fill="#120c08"/>' + [0, 1, 2].map(function (r) { return '<rect x="222" y="' + (100 + r * 32) + '" width="62" height="3" fill="#3a2414"/>' + [0, 1, 2].map(function (k) { return '<circle cx="' + (234 + k * 19) + '" cy="' + (90 + r * 32) + '" r="' + 8 + '" fill="#cfc8ba" opacity="' + (st.plates ? .8 : .5) + '"/>' + (st.plates ? '<circle cx="' + (231 + k * 19) + '" cy="' + (88 + r * 32) + '" r="1.3" fill="#000"/><circle cx="' + (237 + k * 19) + '" cy="' + (88 + r * 32) + '" r="1.3" fill="#000"/>' : ''); }).join(''); }).join('') + '<rect x="222" y="178" width="28" height="66" fill="#22150c"/><rect x="256" y="178" width="28" height="66" fill="#22150c"/>', 248);
      s += hs(O.sink, 212, 274, 80, 64, '<rect x="212" y="300" width="80" height="34" fill="#3a3632"/><ellipse cx="252" cy="300" rx="34" ry="8" fill="#050505" stroke="#5a5450"/><path d="M262 286 q0 -12 -10 -12 v8" stroke="#6a6460" stroke-width="3" fill="none"/>', 328);
    } else if (id === 'chapel') {
      s = base('#1a1e26', '#06070a', STONE, { stone: 1, floor: '#0c0d10' });
      s += hs(O.glass, 32, 24, 236, 124, [0, 1, 2, 3].map(function (i) { var x = 42 + i * 58; return '<path d="M' + x + ' 136 V54 q20 -26 40 0 V136z" fill="#0a0c12" stroke="#4a4a52" stroke-width="3"/><path d="M' + (x + 4) + ' 132 V56 q16 -20 32 0 V132z" fill="' + (st.glassDone ? ['#a22', '#22a', '#2a5', '#aa2'][i] : '#2a2e36') + '" opacity=".75"/><line x1="' + (x + 20) + '" y1="40" x2="' + (x + 20) + '" y2="132" stroke="#111" stroke-width="1.5"/><line x1="' + (x + 4) + '" y1="94" x2="' + (x + 36) + '" y2="94" stroke="#111" stroke-width="1.5"/>'; }).join(''), 144);
      s += hs(O.bell, 14, 0, 40, 270, '<line x1="32" y1="0" x2="32" y2="250" stroke="#8a6a3a" stroke-width="3"/><ellipse cx="32" cy="254" rx="6" ry="10" fill="#8a6a3a"/>', 230);
      s += hs(O.altarnote, 96, 196, 108, 94, '<rect x="96" y="232" width="108" height="56" fill="#3a3640"/><rect x="92" y="226" width="116" height="8" fill="#4a4650"/><rect x="146" y="196" width="8" height="30" fill="#6a6470"/><rect x="138" y="204" width="24" height="6" fill="#6a6470"/>' + candleAt(110, 226, 14) + candleAt(190, 226, 14) + '<rect x="136" y="218" width="26" height="9" fill="#d8ccb0" transform="rotate(-8 149 222)"/>', 280);
      s += hs(O.confess, 222, 146, 70, 156, '<rect x="224" y="150" width="66" height="150" fill="url(#wood)" stroke="#0a0604"/><path d="M224 150 q33 -20 66 0" fill="#3a2414"/><rect x="232" y="176" width="22" height="30" fill="#000"/>' + [0, 1, 2, 3].map(function (k) { return '<line x1="' + (234 + k * 6) + '" y1="176" x2="' + (234 + k * 6) + '" y2="206" stroke="#3a2414"/>'; }).join('') + '<rect x="260" y="170" width="24" height="124" fill="#22150c"/>', 292);
      s += hs(O.pew, 30, 316, 240, 92, [0, 1].map(function (r) { var y = 330 + r * 36; return '<rect x="' + (40 - r * 10) + '" y="' + y + '" width="' + (220 + r * 20) + '" height="8" fill="url(#wood)"/><rect x="' + (40 - r * 10) + '" y="' + (y - 18) + '" width="' + (220 + r * 20) + '" height="6" fill="#3a2414"/>'; }).join('') + (st.shoes ? '' : '<path d="M140 322 h8 v4 h-8z M152 322 h8 v4 h-8z" fill="#7a2a3a"/>'), 404);
    } else {   // basement
      s = base('#141214', '#050405', STONE, { stone: 1, floor: '#0a0809' });
      s += hs(O.wall, 14, 54, 120, 112, '<g fill="none" stroke="#7a7070" stroke-width=".7" opacity=".7">' + Array.apply(null, Array(26)).map(function (_, i) { var x = 22 + (i % 6) * 18, y = 64 + Math.floor(i / 6) * 22; return '<path d="M' + x + ' ' + y + ' l3 8 m2 -8 l-1 9 m3 -6 h5"/>'; }).join('') + '</g>', 160);
      s += hs(O.cradle, 196, 196, 92, 74, '<path d="M204 238 h76 v12 q-38 18 -76 0z" fill="#3a3638"/><path d="M210 232 q32 -10 64 0" stroke="#4a4648" stroke-width="3" fill="none"/><circle cx="242" cy="230" r="4" fill="#d8d0e0"/><path d="M242 234 v8" stroke="#3a5a3a"/>', 262);
      var stones = (O.altar && O.altar.data && O.altar.data.prog) || 0;
      s += hs(O.altar, 54, 262, 192, 120, '<ellipse cx="150" cy="330" rx="88" ry="34" fill="#1a1618" stroke="#5a4a5a" stroke-width="2"/><ellipse cx="150" cy="330" rx="70" ry="25" fill="none" stroke="#7a3a4a" stroke-dasharray="3 4"/>' +
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { var a = i / 9 * Math.PI * 2, x = 150 + Math.cos(a) * 72, y = 330 + Math.sin(a) * 26; return '<ellipse cx="' + x + '" cy="' + y + '" rx="8" ry="5" fill="' + (i < stones ? '#ffcf6a' : '#4a4650') + '"/>'; }).join('') +
        candleAt(98, 304, 16) + candleAt(202, 304, 16) + candleAt(150, 296, 20), 376);
    }
    return s + '</svg>';
  }
  // ---------- こわい顔（ジャンプスケア用。血や傷はなし） ----------
  function face(v) {
    v = v || 0;
    var tilt = [-7, 5, -3][v % 3], mo = v === 1 ? 1.25 : 1, seed = 3 + v;
    var strands = '';
    [[50, 7, -6], [58, 5, 8], [66, 3, -8], [80, 2.4, 5], [136, 3.5, 6], [144, 6, -7], [152, 8, 5]].forEach(function (h, i) {
      var x = h[0], w = h[1], sw = h[2];
      strands += '<path d="M' + x + ' 34 C' + (x + sw) + ' 80 ' + (x - sw) + ' 130 ' + (x + sw * 0.6) + ' ' + (170 + i * 6) + ' S' + (x - sw) + ' 220 ' + (x + sw * 0.4) + ' 240" stroke="#030303" stroke-width="' + w + '" fill="none" stroke-linecap="round" opacity="' + (i === 6 ? .7 : .95) + '"/>';
    });
    return '<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<filter id="fd' + v + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="' + seed + '"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>' +
      '<filter id="fn' + v + '"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="' + seed + '"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1"/></filter>' +
      '<radialGradient id="fg' + v + '" cx="46%" cy="36%" r="66%"><stop offset="0" stop-color="#cfd5d1"/><stop offset=".45" stop-color="#959e9a"/><stop offset=".8" stop-color="#4a524f"/><stop offset="1" stop-color="#1e2321"/></radialGradient>' +
      '<radialGradient id="fs' + v + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#030303"/><stop offset=".85" stop-color="#1d2120" stop-opacity=".85"/><stop offset="1" stop-color="#3a403e" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="fv' + v + '" cx="50%" cy="48%" r="60%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000"/></radialGradient>' +
      '</defs><rect width="200" height="240" fill="#000"/>' +
      '<g filter="url(#fd' + v + ')" transform="rotate(' + tilt + ' 100 125)">' +
      '<path d="M22 240 C6 150 28 30 100 16 C172 30 194 150 178 240 Z" fill="#040404"/>' +
      '<path d="M100 38 C142 40 160 80 157 126 C155 176 130 216 100 222 C70 216 45 176 43 126 C40 80 58 40 100 38 Z" fill="url(#fg' + v + ')"/>' +
      '<ellipse cx="66" cy="150" rx="13" ry="22" fill="#262c2a" opacity=".55"/><ellipse cx="134" cy="150" rx="13" ry="22" fill="#262c2a" opacity=".55"/>' +
      '<path d="M54 96 C70 84 88 88 98 98 M102 98 C112 88 130 84 146 96" stroke="#2a302e" stroke-width="6" fill="none" opacity=".6"/>' +
      '<path d="M52 108 C56 88 92 86 97 106 C96 130 60 134 52 108 Z" fill="url(#fs' + v + ')" transform="scale(1.06) translate(-4 -6)"/><path d="M103 106 C108 86 144 88 148 108 C140 134 104 130 103 106 Z" fill="url(#fs' + v + ')" transform="scale(1.06) translate(-8 -6)"/>' +
      '<path d="M58 106 C62 94 88 93 92 107 C90 123 64 125 58 106 Z" fill="#000"/><path d="M108 107 C112 93 138 94 142 106 C136 125 110 123 108 107 Z" fill="#000"/>' +
      '<circle cx="77" cy="108" r="2.4" fill="#f4f4f0"/><circle cx="123" cy="108" r="2.4" fill="#f4f4f0"/><circle cx="77" cy="108" r="5" fill="none" stroke="#5a1015" stroke-width="1" opacity=".7"/><circle cx="123" cy="108" r="5" fill="none" stroke="#5a1015" stroke-width="1" opacity=".7"/>' +
      '<path d="M97 124 L95 142 M103 124 L105 142" stroke="#3a403e" stroke-width="1.4" opacity=".7"/><path d="M93 145 q3 2 5 0 M102 145 q3 2 5 0" stroke="#111" stroke-width="2.2" fill="none"/>' +
      '<g transform="translate(100 158) scale(1 ' + mo + ') translate(-100 -158)"><path d="M86 160 C88 150 112 150 114 160 C120 190 108 216 100 218 C92 216 80 190 86 160 Z" fill="#000"/><path d="M90 164 C96 158 104 158 110 164" stroke="#2a2f2d" stroke-width="1.5" fill="none"/></g>' +
      '<path d="M84 154 L80 150 M116 154 L121 151 M88 196 L83 204 M112 196 L117 203" stroke="#2a302e" stroke-width="1" opacity=".8"/>' +
      '<path d="M41 140 C38 76 66 36 100 34 C134 36 162 76 159 140 C152 92 132 60 104 58 L100 66 L96 58 C68 60 48 92 41 140 Z" fill="#030303"/>' + strands +
      '</g><rect width="200" height="240" filter="url(#fn' + v + ')" opacity=".22"/><rect width="200" height="240" fill="url(#fv' + v + ')"/></svg>';
  }
  function figure() {   // 画面のはしを横切る、背の高い影
    return '<svg viewBox="0 0 100 300" preserveAspectRatio="xMidYMax meet" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>' +
      '<ellipse cx="50" cy="40" rx="16" ry="20" fill="#000"/><path d="M34 36 C30 70 26 90 30 110 M66 36 C70 70 74 90 70 110" stroke="#000" stroke-width="6"/><path d="M28 64 C10 120 14 230 8 300 H92 C86 230 90 120 72 64 Z" fill="url(#fg)"/><path d="M30 80 C14 130 10 170 6 210" stroke="#000" stroke-width="5" fill="none"/><path d="M70 80 C86 130 90 170 96 214" stroke="#000" stroke-width="5" fill="none"/><circle cx="44" cy="40" r="1.6" fill="#ddd"/><circle cx="56" cy="40" r="1.6" fill="#ddd"/></svg>';
  }
  function hand(rot) {
    return '<svg viewBox="0 0 90 110" style="width:100%;height:100%;transform:rotate(' + rot + 'deg)" xmlns="http://www.w3.org/2000/svg"><g fill="#0c0a0b" stroke="rgba(210,205,215,.35)" stroke-width="1.2" opacity=".9"><ellipse cx="45" cy="72" rx="22" ry="26"/><rect x="20" y="20" width="9" height="44" rx="4.5" transform="rotate(-14 24 42)"/><rect x="32" y="8" width="9" height="54" rx="4.5" transform="rotate(-4 36 35)"/><rect x="45" y="6" width="9" height="56" rx="4.5" transform="rotate(4 49 34)"/><rect x="57" y="14" width="9" height="48" rx="4.5" transform="rotate(12 61 38)"/><rect x="62" y="56" width="9" height="34" rx="4.5" transform="rotate(48 66 72)"/></g><g fill="none" stroke="#000" stroke-opacity=".4"><path d="M30 80 q15 6 30 0"/></g></svg>';
  }
  // ---------- 人形・動物のかげ・ステンドグラスの絵 ----------
  function doll(size, col) {   // size 0（大）〜4（小）
    var k = [1, 0.84, 0.7, 0.58, 0.46][size], h = 130 * k, w = 60 * k;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 60 130"><circle cx="30" cy="22" r="16" fill="' + (col || '#e8dcd8') + '"/><path d="M14 20 q16 -26 32 0 q-4 -14 -16 -14 q-12 0 -16 14z" fill="#2a1a1a"/><circle cx="24" cy="24" r="2.4" fill="#111"/><circle cx="36" cy="24" r="2.4" fill="#111"/><path d="M26 32 q4 2 8 0" stroke="#a44" fill="none"/><path d="M30 38 L6 124 H54 Z" fill="' + (col ? col : '#7a2a3a') + '"/><path d="M12 64 l-8 22 M48 64 l8 22" stroke="#e8dcd8" stroke-width="4" stroke-linecap="round"/></svg>';
  }
  var ANIMAL = [
    '<ellipse cx="30" cy="62" rx="16" ry="18"/><circle cx="30" cy="36" r="12"/><ellipse cx="24" cy="12" rx="4" ry="14"/><ellipse cx="36" cy="12" rx="4" ry="14"/>',   // うさぎ
    '<ellipse cx="30" cy="62" rx="16" ry="18"/><circle cx="30" cy="38" r="12"/><path d="M19 32 l2 -14 l8 8z M41 32 l-2 -14 l-8 8z"/><path d="M44 72 q16 -4 10 -24" stroke="#000" stroke-width="4" fill="none"/>',   // ねこ
    '<ellipse cx="30" cy="62" rx="18" ry="19"/><circle cx="30" cy="36" r="13"/><circle cx="19" cy="26" r="5.5"/><circle cx="41" cy="26" r="5.5"/>',   // くま
    '<ellipse cx="30" cy="58" rx="17" ry="15"/><circle cx="34" cy="38" r="10"/><path d="M43 36 l12 4 l-12 3z"/><path d="M14 60 l-10 8 l12 0z"/><path d="M26 72 v8 M34 72 v8" stroke="#000" stroke-width="2"/>'   // とり
  ];
  function animal(i, col, w) { return '<svg width="' + (w || 50) + '" viewBox="0 0 60 84"><g fill="' + (col || '#000') + '"' + (col && col !== '#000' ? '' : '') + '>' + ANIMAL[i].replace(/stroke="#000"/g, 'stroke="' + (col || '#000') + '"') + '</g></svg>'; }
  var GLYPH = [
    '<path d="M34 10 a22 22 0 1 0 0 40 a17 17 0 1 1 0 -40z" fill="#e8e4f0"/>',   // 月
    '<path d="M30 6 l6.5 15 16 1.5 -12 10.5 3.6 15.8 -14 -8.4 -14 8.4 3.6 -15.8 -12 -10.5 16 -1.5z" fill="#e8e4f0"/>',   // 星
    '<path d="M6 34 q12 -16 24 -6 q8 -18 26 -14 q-14 4 -16 18 q-2 12 -16 12 q-8 0 -18 -10z" fill="#e8e4f0"/><circle cx="40" cy="22" r="1.5" fill="#222"/>',   // 鳥
    '<path d="M4 30 q26 -26 52 0 q-26 26 -52 0z" fill="#e8e4f0"/><circle cx="30" cy="30" r="9" fill="#222"/><circle cx="30" cy="30" r="3.5" fill="#a22"/>'   // 目
  ];
  function glyph(i) { return '<svg viewBox="0 0 60 60">' + GLYPH[i] + '</svg>'; }
  function portrait(i) {
    var hair = ['#2a2a2a', '#3a2418', '#bbb', '#222', '#3a2a1a', '#111'][i];
    var s = '<svg viewBox="0 0 60 70"><rect width="60" height="70" fill="#1a1418"/><path d="M8 70 q22 -34 44 0z" fill="' + ['#1a1a2a', '#3a1a2a', '#2a2a2a', '#111', '#1a2a1a', '#5a1a2a'][i] + '"/><ellipse cx="30" cy="30" rx="12" ry="15" fill="#b8a898"/><path d="M17 28 q13 -24 26 0 q-2 -12 -13 -12 q-11 0 -13 12z" fill="' + hair + '"/>';
    if (i === 5) s += '<path d="M17 28 q-2 22 2 34 M43 28 q2 22 -2 34" stroke="#111" stroke-width="4" fill="none"/><rect x="20" y="24" width="20" height="12" fill="#111"/><path d="M14 10 l32 50 M46 10 l-32 50" stroke="#000" stroke-width="2" opacity=".6"/>';
    else s += '<circle cx="25" cy="31" r="1.5" fill="#222"/><circle cx="35" cy="31" r="1.5" fill="#222"/><path d="M26 39 h8" stroke="#6a4a3a"/>';
    return s + '</svg>';
  }
  function clockFace(h, m, size) {
    var c = 50, ha = (h % 12 + m / 60) * 30, ma = m * 6, s = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#efe6d2" stroke="#3a2a1a" stroke-width="4"/>';
    for (var i = 0; i < 60; i++) { var a = i * Math.PI / 30, r1 = i % 5 ? 40 : 35; s += '<line x1="' + (c + Math.sin(a) * r1) + '" y1="' + (c - Math.cos(a) * r1) + '" x2="' + (c + Math.sin(a) * 43) + '" y2="' + (c - Math.cos(a) * 43) + '" stroke="#2a1e12" stroke-width="' + (i % 5 ? .8 : 2.4) + '"/>'; }
    s += '<line x1="50" y1="50" x2="50" y2="25" stroke="#1a120a" stroke-width="5" stroke-linecap="round" transform="rotate(' + ha + ' 50 50)"/><line x1="50" y1="50" x2="50" y2="12" stroke="#1a120a" stroke-width="2.6" stroke-linecap="round" transform="rotate(' + ma + ' 50 50)"/><circle cx="50" cy="50" r="3.5" fill="#1a120a"/></svg>';
    return s;
  }
  function fuu() {   // こわがりの ふーさん🐻（懐中電灯つき）
    return '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="16" cy="16" r="8" fill="#8a5a34"/><circle cx="48" cy="16" r="8" fill="#8a5a34"/><circle cx="16" cy="16" r="4" fill="#c49a6a"/><circle cx="48" cy="16" r="4" fill="#c49a6a"/><circle cx="32" cy="34" r="22" fill="#9a6a3e"/><ellipse cx="32" cy="42" rx="10" ry="8" fill="#e2c49a"/><ellipse cx="24" cy="30" rx="3" ry="4" fill="#fff"/><ellipse cx="40" cy="30" rx="3" ry="4" fill="#fff"/><circle cx="24" cy="31" r="1.8" fill="#222"/><circle cx="40" cy="31" r="1.8" fill="#222"/><ellipse cx="32" cy="38" rx="3" ry="2.2" fill="#3a2414"/><path d="M28 46 q4 -3 8 0" stroke="#3a2414" fill="none" stroke-width="1.5"/><path d="M50 22 q4 6 0 10 q-4 -4 0 -10z" fill="#9ad4ff"/><path d="M14 30 l-8 4 M50 30 l8 4" stroke="#3a2414" stroke-width="1"/></svg>';
  }
  function titleArt() {
    var s = '<svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="moon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e8e0d0"/><stop offset=".6" stop-color="#b8b0a0"/><stop offset="1" stop-color="#b8b0a0" stop-opacity="0"/></radialGradient><linearGradient id="fog" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b090e" stop-opacity="0"/><stop offset="1" stop-color="#0b090e"/></linearGradient></defs>' +
      '<circle cx="300" cy="70" r="40" fill="url(#moon)" opacity=".7"/><circle cx="300" cy="70" r="22" fill="#d8d0c0" opacity=".85"/><rect class="lightning" width="400" height="320" fill="#b8c4ff" opacity="0"/>' +
      '<path d="M120 200 V120 L150 92 L180 120 V100 h10 v-14 h6 v14 h10 v20 L240 86 L280 120 V200 Z" fill="#0a080c"/><rect x="146" y="130" width="8" height="12" fill="#ffb24a" opacity=".9"/><rect x="250" y="140" width="7" height="10" fill="#ffb24a" opacity=".35"/><rect x="200" y="150" width="7" height="10" fill="#8a1020" opacity=".7"/>';
    for (var i = 0; i < 22; i++) { var x = i * 20 - 10 + Math.random() * 8, h = 70 + Math.random() * 90, b = 230 + Math.random() * 30; s += '<path d="M' + x + ' ' + b + ' L' + (x + 14) + ' ' + (b - h) + ' L' + (x + 28) + ' ' + b + 'Z" fill="#050407"/>'; }
    return s + '<rect y="180" width="400" height="140" fill="url(#fog)"/></svg>';
  }
  return { room: room, face: face, figure: figure, hand: hand, doll: doll, animal: animal, glyph: glyph, portrait: portrait, clockFace: clockFace, fuu: fuu, titleArt: titleArt };
})();
$('titleArt').innerHTML = ART.titleArt();
