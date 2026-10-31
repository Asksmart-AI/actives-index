/* 原药页三个记忆点（Kevin 10-31「都要」；手法库 kit/moves.json，原型在 design/variants/20261031-moves/）。
   顺序：数字落地（首屏，载入时播）→ 筛子（滚到「Who to talk to」时播一次）→ 端起来（只在用户按住时）。 */

// ---------- 3. 数字落地 + Watch 小胜利 ----------
(function () {
  var t = document.getElementById('t-src'), v = document.querySelector('.verdict');
  if (!t || !v) return;
  var rows = Array.prototype.map.call(t.tBodies[0].rows, function (r) {
    var a = r.cells[0].querySelector('a');
    return { name: r.cells[0].textContent.trim(), href: a ? a.getAttribute('href') : '', no: r.cells[2].textContent.trim(), d: r.cells[3].textContent.trim() };
  }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x.d); }).sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  var N = rows.length; if (N < 3) return;
  // 首句开头的数字换成可滚动的 span；和 #t-src 行数对不上就不演（数字一份事实）
  var tn = v.firstChild, m = tn && tn.nodeType === 3 && tn.nodeValue.match(/^(\d+)( approved sources?)/);
  if (!m || +m[1] !== N) return;
  // 数字连同后面的词一起放进 span（单独一个数字的元素会被当成装饰编号）
  tn.nodeValue = tn.nodeValue.slice(m[0].length);
  var num = document.createElement('span'); num.className = 'mv-n'; v.insertBefore(num, tn);
  var label = function (k) { return k + (k === 1 ? ' approved source' : ' approved sources'); };

  var y0 = 1996, y1 = 2026, cols = y1 - y0 + 1;
  rows.forEach(function (r) { var y = +r.d.slice(0, 4); if (y < y0) y0 = y; });
  cols = y1 - y0 + 1;
  var strip = document.createElement('div'); strip.className = 'mv-strip';
  strip.innerHTML = '<p class="mv-cap"><span>Approved sources by year approved</span><span>' + y0 + '–' + y1 + '</span></p>' +
    '<div class="mv-scroll"><div class="mv-track" style="--cols:' + cols + '"></div><div class="mv-axis" style="--cols:' + cols + '"></div></div>';
  v.parentNode.insertBefore(strip, v.nextSibling);
  var track = strip.querySelector('.mv-track'), axis = strip.querySelector('.mv-axis'), colEls = [];
  for (var y = y0; y <= y1; y++) {
    var c = document.createElement('div'); c.className = 'mv-col'; track.appendChild(c); colEls.push(c);
    var s = document.createElement('span'); s.textContent = (y % 5 === 0) ? y : ''; axis.appendChild(s);
  }
  var tip = document.createElement('div'); tip.className = 'mv-tip'; tip.setAttribute('role', 'tooltip'); strip.appendChild(tip);
  var marks = rows.map(function (r, i) {
    var a = document.createElement('a'); a.className = 'mv-m'; a.href = r.href || '#';
    a.setAttribute('aria-label', r.name + ', approval ' + r.no + ', approved ' + r.d);
    colEls[+r.d.slice(0, 4) - y0].appendChild(a);
    function show() {
      tip.innerHTML = '<b></b><span></span>'; tip.firstChild.textContent = r.name; tip.lastChild.textContent = 'Approval no. ' + r.no + ', approved ' + r.d;
      // 提示挂在 .mv-strip 上（不进会裁切的容器），按格子位置算
      var sr = strip.getBoundingClientRect(), mr = a.getBoundingClientRect();
      var x = Math.max(0, Math.min(mr.left - sr.left - 20, sr.width - tip.offsetWidth));
      tip.style.left = x + 'px'; tip.style.bottom = (sr.bottom - mr.top + 8) + 'px'; tip.classList.add('show');
    }
    function hide() { tip.classList.remove('show'); }
    a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
    a.addEventListener('mouseleave', hide); a.addEventListener('blur', hide);
    return a;
  });
  function paint(k) { num.textContent = label(k); marks.forEach(function (el, i) { el.classList.toggle('on', i < k); }); }
  var still = location.hash === '#demo' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still) { paint(N); }
  else {
    paint(0);
    var D = 1100, t0 = null;
    var ease = function (x) { return 1 - Math.pow(1 - x, 3); };
    requestAnimationFrame(function step(ts) {
      if (t0 === null) t0 = ts + 250;
      var p = Math.max(0, Math.min(1, (ts - t0) / D));
      paint(Math.round(ease(p) * N));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  // Watch 小胜利：app.js 先切 aria-pressed / 存 localStorage，这里只加演出
  // app.js 是 defer，比这段晚执行；等它挂好自己的 click 再挂，演出才能读到它切过的状态
  document.addEventListener('DOMContentLoaded', function () {
  var w = document.querySelector('.watch[data-watch]');
  if (w) {
    var saved = document.createElement('span'); saved.className = 'mv-saved'; saved.setAttribute('aria-live', 'polite');
    w.parentNode.appendChild(saved);
    w.addEventListener('click', function () {
      if (w.getAttribute('aria-pressed') !== 'true') { w.classList.remove('mv-win'); return; }
      var lab = w.querySelector('span'), txt = lab.textContent;
      if (txt !== 'Watching') return;   // 存不进去（storage 关了）就不演
      w.classList.remove('mv-win'); void w.offsetWidth; w.classList.add('mv-win');
      saved.textContent = 'Saved in this browser';
      saved.classList.remove('go'); void saved.offsetWidth; saved.classList.add('go');
    });
  }
  });
})();

// ---------- 2. 筛子 ----------
(function () {
  var whos0 = document.querySelector('#contact .whos'), tp = document.getElementById('t-prod'), tr = document.getElementById('t-reg');
  if (!whos0 || !tp || !tr || !document.querySelector('.who.buy') || tp.tBodies[0].rows.length < 12) return;
  var buyH = document.querySelector('.who.buy data'); if (buyH && +buyH.value === 0) return;   // 没有买家可筛就不演
  var box = document.createElement('div'); box.innerHTML = '<div class="sv" id="sv" aria-label="Sieving this active\'s registered products by whether the registrant holds its own source approval">\n<div class="sv-head"><p class="sv-state" id="sv-state" aria-live="polite">Sieving <b id="sv-seen">0</b>&nbsp;of&nbsp;<b id="sv-total">0</b> registered products</p>\n<button class="sv-replay" type="button" id="sv-replay">Replay</button></div>\n<div class="sv-body"><div class="sv-stream" id="sv-stream" aria-hidden="true"><div class="sv-scan" id="sv-scan"></div></div>\n<div class="sv-bins">\n<div class="sv-bin buy" id="sv-buy"><p class="t">Buys from another source</p><span class="v" id="sv-buy-n">0</span>\n<p class="c"><span id="sv-buy-p">0</span> products, no source approval of their own. Likely buyers of technical.</p><div class="bar"><i id="sv-buy-bar"></i></div>\n<p class="go"><a href="#t-reg">See them in the registrant table</a></p></div>\n<div class="sv-bin own" id="sv-own"><p class="t">Holds its own approval</p><span class="v" id="sv-own-n">0</span>\n<p class="c"><span id="sv-own-p">0</span> products under an approval they hold.</p><div class="bar"><i id="sv-own-bar"></i></div></div>\n</div></div></div>'; whos0.before(box.firstChild);
  var $ = function (s) { return document.querySelector(s); };
  var reg = {}, regs = [];
  // 同一份事实：注册商是否持有来源批准，读 #t-reg；产品读 #t-prod
  Array.prototype.forEach.call($('#t-reg').tBodies[0].rows, function (r) {
    var a = r.cells[0].querySelector('a'), name = (a || r.cells[0]).textContent.trim();
    reg[name] = r.cells[2].textContent.trim() === 'Yes'; regs.push(name);
  });
  // 按产品号去重：产品表里同一个产品可能出现两行（67081 就是），页面首句的 148 是去重后的数
  var seenNo = {};
  var prods = Array.prototype.filter.call($('#t-prod').tBodies[0].rows, function (r) {
    var no = r.cells[0].textContent.trim(); if (seenNo[no]) return false; seenNo[no] = 1; return true;
  }).map(function (r) {
    var pn = r.cells[1].cloneNode(true); Array.prototype.forEach.call(pn.querySelectorAll('.chip'), function (c) { c.remove(); });
    var rg = r.cells[2].textContent.trim();
    return { pn: pn.textContent.trim(), rg: rg, own: !!reg[rg] };
  });
  var N = prods.length;
  var buyRegs = regs.filter(function (n) { return !reg[n]; }).length, ownRegs = regs.length - buyRegs;
  var buyP = prods.filter(function (p) { return !p.own; }).length, ownP = N - buyP;
  var h3 = document.querySelector('.who.buy data'), h3b = document.querySelector('.who.both data');
  if ((h3 && +h3.value !== buyRegs) || (h3b && +h3b.value !== ownRegs)) console.warn('sieve: counts differ from the Who to talk to headings', buyRegs, ownRegs);
  $('#sv-total').textContent = N;

  var stream = $('#sv-stream'), scan = $('#sv-scan'), sv = $('#sv'), state = $('#sv-state'), replay = $('#sv-replay');
  var ROW = 52, TICK = 140, SAMPLE = 12;   // Kevin 10-31：「不要太久 快速完成 不然看晕了」→ 整段约 2 秒（原来约 7 秒）
  var H, VIS, SCAN;
  function geom() { H = stream.clientHeight; VIS = Math.floor(H / ROW); SCAN = 4 + ROW * Math.round((H / 2 - 26) / ROW); scan.style.top = (SCAN - 4) + 'px'; }

  // 演示用的一串：均匀抽 SAMPLE 个产品当「看得见的行」，每行代表它前面那一段产品都已经筛过
  var idx = []; for (var k = 0; k < SAMPLE; k++) idx.push(Math.round((k + 1) * (N - 1) / SAMPLE));
  // 保证看得见的行里两类都有：如果抽样全是同一类就换一个邻居
  function statsUpTo(i) {
    var bR = {}, oR = {}, bp = 0, op = 0;
    for (var j = 0; j <= i; j++) { var p = prods[j]; if (p.own) { op++; oR[p.rg] = 1; } else { bp++; bR[p.rg] = 1; } }
    return { b: Object.keys(bR).length, o: Object.keys(oR).length, bp: bp, op: op };
  }
  function paint(s, seen) {
    $('#sv-buy-n').textContent = s.b; $('#sv-own-n').textContent = s.o;
    $('#sv-buy-p').textContent = s.bp; $('#sv-own-p').textContent = s.op;
    $('#sv-buy-bar').style.transform = 'scaleX(' + (s.bp / N).toFixed(3) + ')';
    $('#sv-own-bar').style.transform = 'scaleX(' + (s.op / N).toFixed(3) + ')';
    $('#sv-seen').textContent = seen;
  }
  function row(p) {
    var el = document.createElement('div'); el.className = 'sv-row';
    el.innerHTML = '<span><span class="pn"></span><span class="rg"></span></span><span class="tg"></span>';
    el.querySelector('.pn').textContent = p.pn; el.querySelector('.rg').textContent = p.rg;
    stream.appendChild(el); return el;
  }
  function mark(el, p) { el.classList.add(p.own ? 'own' : 'hit'); el.querySelector('.tg').textContent = p.own ? 'Own approval' : 'Buys source'; }
  function short(n) { return n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\b(Pty\.?|Ltd\.?|Limited|Australia|Aust)\b/gi, '').replace(/\s+/g, ' ').trim(); }
  function fly(el, p) {
    var to = $(p.own ? '#sv-own-n' : '#sv-buy-n').getBoundingClientRect(), from = el.getBoundingClientRect();
    var f = document.createElement('div'); f.className = 'sv-fly' + (p.own ? ' own' : ''); f.textContent = short(p.rg);
    document.body.appendChild(f);
    var w = f.offsetWidth, x0 = from.left + 12, y0 = from.top + from.height / 2 - 11, x1 = to.right - w, y1 = to.top + to.height / 2 - 11;
    var mid = 'translate(' + (x0 + (x1 - x0) * .55) + 'px,' + (y0 + (y1 - y0) * .35 - 24) + 'px) scale(1.04)';
    var a = f.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.9)', opacity: 0 },
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1, offset: .12 },
      { transform: mid, opacity: 1, offset: .6 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.8)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    return a.finished.then(function () { f.remove(); }, function () { f.remove(); });
  }
  function bump(own) { var b = $(own ? '#sv-own' : '#sv-buy'); b.classList.add('bump'); setTimeout(function () { b.classList.remove('bump'); }, 300); }
  function done() {
    sv.classList.add('done'); replay.disabled = false;
    state.innerHTML = '<span><b>' + buyRegs + '</b> of ' + regs.length + ' registrants sell it without their own source approval</span>';
  }
  function settle() {
    geom(); stream.querySelectorAll('.sv-row').forEach(function (r) { r.remove(); });
    var last = idx.slice(-VIS);
    last.reverse().forEach(function (pi, j) { var el = row(prods[pi]); el.style.transform = 'translateY(' + (4 + j * ROW) + 'px)'; if (4 + j * ROW >= SCAN - 8) mark(el, prods[pi]); });
    paint({ b: buyRegs, o: ownRegs, bp: buyP, op: ownP }, N); done();
  }
  var timer = null, running = false;
  function run() {
    geom(); running = true; sv.classList.remove('done'); replay.disabled = true;
    state.innerHTML = 'Sieving <b id="sv-seen">0</b>&nbsp;of&nbsp;<b>' + N + '</b> registered products';
    stream.querySelectorAll('.sv-row').forEach(function (r) { r.remove(); });
    paint({ b: 0, o: 0, bp: 0, op: 0 }, 0);
    var live = [], i = 0;
    function tick() {
      if (i >= idx.length) {
        // 行流完了：把剩下还在扫描带上方的行推过去再收尾
        timer = setTimeout(function () { paint({ b: buyRegs, o: ownRegs, bp: buyP, op: ownP }, N); done(); running = false; }, 420); return;
      }
      var pi = idx[i++], el = row(prods[pi]);
      el.style.opacity = '0'; el.style.transform = 'translateY(' + (4 - ROW) + 'px)';
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateY(4px)'; }); });
      live.unshift({ el: el, pi: pi, y: 4 });
      live.forEach(function (o, j) {
        if (j === 0) return;
        o.y += ROW; o.el.style.transform = 'translateY(' + o.y + 'px)';
        if (!o.hit && o.y >= SCAN - 8 && o.y <= SCAN + 8) {
          o.hit = true; var p = prods[o.pi]; mark(o.el, p);
          var s = statsUpTo(o.pi), seen = o.pi + 1;
          fly(o.el, p).then(function () { paint(s, seen); bump(p.own); });
        }
        if (o.y > H + ROW) { o.el.remove(); o.gone = true; }
      });
      live = live.filter(function (o) { return !o.gone; });
      timer = setTimeout(tick, TICK);
    }
    // 开场先铺满扫描带以上的几行，再往下流
    timer = setTimeout(tick, 100);
  }
  replay.addEventListener('click', function () { if (!running) { clearTimeout(timer); run(); } });
  var still = location.hash === '#demo' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) { settle(); return; }
  geom(); paint({ b: 0, o: 0, bp: 0, op: 0 }, 0); replay.disabled = true;
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: .45 });
  io.observe(sv);
})();

// ---------- 1. 端起来 ----------
/* 记忆点 1「端起来」：按住「该找谁」里的公司 → 拿起来，页面其余退后，只有底部清单亮 → 丢进去就真加进关注列表（ai.watch，和站上 Watch 按钮同一份）。
   鼠标：按下拖 4px 就拿起；触屏：长按 280ms 拿起（不挡正常滚动）。每行另有「+」按钮，键盘回车同样有效。#demo = 终态（不写本机存储）。 */
(function () {
  var WKEY = 'ai.watch', DEMO = location.hash === '#demo';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPRING = 'cubic-bezier(.34,1.56,.64,1)', OUT = 'cubic-bezier(.23,1,.32,1)';
  var at = document.body.getAttribute('data-data') || '';
  var mem = [];   // #demo 或本机存储不可用时用内存
  function wget() { if (DEMO) return mem; try { return JSON.parse(localStorage.getItem(WKEY) || '[]'); } catch (e) { return mem; } }
  function wset(v) { if (DEMO) { mem = v; return true; } try { localStorage.setItem(WKEY, JSON.stringify(v)); return true; } catch (e) { mem = v; return false; } }
  function companies() { return wget().filter(function (x) { return x.k.indexOf('c:') === 0; }); }
  function has(k) { return wget().some(function (x) { return x.k === k; }); }
  function add(k, n) { if (has(k)) return false; var w = wget().slice(); w.unshift({ k: k, n: n, at: at }); wset(w); return true; }
  function remove(k) { wset(wget().filter(function (x) { return x.k !== k; })); }

  var sec = document.getElementById('contact'); if (!sec) return;
  var PLUS = '<svg class="off" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
             '<svg class="on" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var hint = document.createElement('p'); hint.className = 'lift-hint';
  hint.textContent = 'Press and hold a company, then drop it into your shortlist at the bottom.';
  var whos = sec.querySelector('.whos'); if (!whos) return; whos.before(hint);

  var rows = Array.prototype.slice.call(sec.querySelectorAll('.who li'));
  rows.forEach(function (li) {
    var a = li.querySelector('a'); if (!a) return;
    var slug = (a.getAttribute('href') || '').split('/').pop();
    li.dataset.k = 'c:' + slug; li.dataset.n = a.textContent;
    li.classList.add('liftable'); li.tabIndex = 0;
    a.classList.add('nm'); a.draggable = false;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'add'; b.innerHTML = PLUS;
    b.setAttribute('aria-label', 'Add ' + a.textContent + ' to shortlist');
    li.appendChild(b);
    b.addEventListener('click', function (e) { e.stopPropagation(); toggle(li); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === li) { e.preventDefault(); toggle(li); } });
  });
  function paintRows() {
    rows.forEach(function (li) { var b = li.querySelector('.add'); if (b) { var on = has(li.dataset.k); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + li.dataset.n + (on ? ' from shortlist' : ' to shortlist')); } });
  }
  function toggle(li) { if (has(li.dataset.k)) remove(li.dataset.k); else add(li.dataset.k, li.dataset.n); paint(true); }

  // 底部清单
  var dock = document.createElement('aside');
  dock.className = 'dock h-glass'; dock.setAttribute('aria-live', 'polite');
  dock.innerHTML = '<span class="ico"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 10h12M4 15.5h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>' +
    '<div class="txt"><div class="ttl">Shortlist · <data value="0">0</data> <span class="unit">companies</span></div><div class="names"></div><div class="hint">Drop here to add</div></div>' +
    '<a class="open" href="' + ((document.querySelector('a.brand') || {}).getAttribute ? document.querySelector('a.brand').getAttribute('href').replace(/index\.html$/, '') : '/') + '#watching">Open list</a>';
  document.body.appendChild(dock);
  var num = dock.querySelector('data'), names = dock.querySelector('.names'), unit = dock.querySelector('.unit');
  function paint(bump) {
    var c = companies();
    num.value = c.length; num.textContent = c.length; unit.textContent = c.length === 1 ? 'company' : 'companies';
    names.textContent = c.length ? c.slice(0, 3).map(function (x) { return x.n; }).join(', ') + (c.length > 3 ? ' and ' + (c.length - 3) + ' more' : '') : 'Nothing yet';
    dock.classList.toggle('show', c.length > 0 || !!held);
    if (bump && !reduce) { num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump'); }
    paintRows();
  }

  // ---------- 端起来 ----------
  var held = null, press = null;
  function lift(li, x, y) {
    var r = li.getBoundingClientRect();
    var g = li.cloneNode(true); g.className = 'lift-ghost'; g.removeAttribute('tabindex');
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
    document.body.appendChild(g);
    li.classList.add('gone'); document.body.classList.add('lifting'); dock.classList.add('show');
    held = { li: li, g: g, r: r, dx: x - r.left, dy: y - r.top, x: x, y: y, vx: 0, t: performance.now() };
    if (!reduce) g.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 180, easing: OUT, fill: 'forwards' });
  }
  function overDock(x, y) { var b = dock.getBoundingClientRect(); return x > b.left - 12 && x < b.right + 12 && y > b.top - 16 && y < b.bottom + 12; }
  function move(x, y) {
    if (!held) return;
    var now = performance.now(), dt = Math.max(16, now - held.t);
    held.vx = held.vx * 0.7 + ((x - held.x) / dt) * 0.3;
    held.x = x; held.y = y; held.t = now;
    held.g.style.translate = (x - held.dx - held.r.left) + 'px ' + (y - held.dy - held.r.top) + 'px';
    if (!reduce) held.g.style.rotate = Math.max(-5, Math.min(5, held.vx * 4)).toFixed(2) + 'deg';
    dock.classList.toggle('over', overDock(x, y));
  }
  function drop() {
    if (!held) return;
    var h = held, hit = dock.classList.contains('over'); held = null;
    document.body.classList.remove('lifting'); dock.classList.remove('over');
    h.g.style.rotate = '0deg';
    if (hit) {
      var b = dock.getBoundingClientRect(), gr = h.g.getBoundingClientRect();
      var tx = b.left + 40 - (gr.left + gr.width / 2), ty = b.top + b.height / 2 - (gr.top + gr.height / 2);
      h.g.animate([{ transform: 'scale(1.06)', opacity: 1 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.3)', opacity: 0 }],
        { duration: reduce ? 0 : 260, easing: OUT, fill: 'forwards' }).finished.then(function () { h.g.remove(); });
      h.li.classList.remove('gone');
      add(h.li.dataset.k, h.li.dataset.n); paint(true);
    } else {
      var back = h.g.animate([{ translate: h.g.style.translate || '0px 0px', transform: 'scale(1.06)' }, { translate: '0px 0px', transform: 'scale(1)' }],
        { duration: reduce ? 0 : 280, easing: SPRING, fill: 'forwards' });
      back.finished.then(function () { h.g.remove(); h.li.classList.remove('gone'); paint(false); });
    }
  }
  var moved = false;
  sec.addEventListener('pointerdown', function (e) {
    var li = e.target.closest('li.liftable'); if (!li || held || e.target.closest('.add') || e.button > 0) return;
    moved = false;
    press = { li: li, x: e.clientX, y: e.clientY, type: e.pointerType, timer: null };
    if (e.pointerType !== 'mouse') press.timer = setTimeout(function () { if (press) { lift(press.li, press.x, press.y); press = null; } }, 280);
  });
  addEventListener('pointermove', function (e) {
    if (press) {
      var d = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      if (press.type === 'mouse' && d > 4) { lift(press.li, press.x, press.y); press = null; moved = true; }
      else if (press.type !== 'mouse' && d > 8) { clearTimeout(press.timer); press = null; }   // 手指在滚动，不拿
    }
    if (held) { moved = true; move(e.clientX, e.clientY); }
  });
  addEventListener('pointerup', function () { if (press) { clearTimeout(press.timer); press = null; } drop(); });
  addEventListener('pointercancel', function () { if (press) { clearTimeout(press.timer); press = null; } drop(); });
  // 拿着的时候手指别带着页面滚；拖完别触发链接跳转
  addEventListener('touchmove', function (e) { if (held) e.preventDefault(); }, { passive: false });
  sec.addEventListener('click', function (e) { if (moved && e.target.closest('li.liftable a')) { e.preventDefault(); moved = false; } }, true);
  sec.addEventListener('contextmenu', function (e) { if (held || press) e.preventDefault(); });

  if (DEMO) {
    rows.filter(function (li) { return li.closest('.who.buy'); }).slice(0, 3).reverse().forEach(function (li) { add(li.dataset.k, li.dataset.n); });
    dock.style.transition = 'none';
  }
  paint(false);

})();
