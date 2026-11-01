// Actives Index 前端交互：搜索面板（/ 键）、首页筛选排序、表格排序、分区导航高亮、图表/表格切换、复制链接。无依赖。
(function () {
  var base = document.body.getAttribute('data-base') || '';
  // 双语：页面 <html lang> 是 zh-Hans 就用中文文案（中文页在 /zh/ 下，同一份脚本）
  var ZH = (document.documentElement.lang || '').indexOf('zh') === 0;
  var L = function (en, zh) { return ZH ? zh : en; };   // 不叫 t：下面首页筛选有 var t = 表格
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- 搜索面板 ----------
  var pal = $('.palette'), pin = pal && $('input', pal), plist = pal && $('.palette-list', pal);
  var index = null, hits = [], cur = 0, lastFocus = null;
  function load() {
    if (index) return Promise.resolve(index);
    return fetch(base + 'search.json').then(function (r) { return r.json(); }).then(function (d) { index = d; return d; });
  }
  function score(it, q) {
    var n = (it.n + (it.e ? ' ' + it.e : '')).toLowerCase(), g = (it.g || '').toLowerCase();   // e = 中文页上的英文原名
    if (n === q) return 100;
    if (n.indexOf(q) === 0) return 80 + Math.min(it.p, 300) / 30;
    var i = n.indexOf(' ' + q);
    if (i >= 0) return 60 + Math.min(it.p, 300) / 30;
    if (n.indexOf(q) >= 0) return 40 + Math.min(it.p, 300) / 30;
    if (g.indexOf(q) >= 0) return 20 + Math.min(it.p, 300) / 30;
    var w = q.split(/\s+/);   // 多个词都出现也算（net blotch → Net Form Of Net Blotch）
    if (w.length > 1 && w.every(function (x) { return n.indexOf(x) >= 0; })) return 30 + Math.min(it.p, 300) / 30;
    return 0;
  }
  function render() {
    var q = pin.value.trim().toLowerCase();
    if (!q) {
      plist.innerHTML = '<li class="hint">' + L('Type an active (tebuconazole), a company (Nufarm), a crop (barley) or a pest (net blotch).', '输入原药（戊唑醇 / tebuconazole）、公司（Nufarm）、作物（大麦）或病虫草（网斑病）。') + '</li>';
      hits = []; return;
    }
    hits = index.map(function (it) { return [score(it, q), it]; }).filter(function (x) { return x[0] > 0; })
      .sort(function (a, b) { return b[0] - a[0]; }).slice(0, 9).map(function (x) { return x[1]; });
    cur = 0;
    plist.innerHTML = hits.length ? hits.map(function (it, i) {
      var meta = it.t === 'a' ? L(it.s + ' sources, ' + it.p + ' products', it.s + ' 个来源，' + it.p + ' 个产品') : it.t === 'c' ? L(it.s + ' approvals, ' + it.p + ' products', it.s + ' 个批准，' + it.p + ' 个产品') : L(it.p + ' products', it.p + ' 个产品');
      return '<li role="option" aria-selected="' + (i === 0) + '"><a href="' + base + it.u + '"><span class="kind ' + it.t + '">' +
        KIND[it.t] + '</span><span class="nm">' + esc(it.n) + '</span><span class="mt">' + meta + '</span></a></li>';
    }).join('') : '<li class="hint">' + L('No match. Try a shorter word, or the parent name (for example glyphosate, not the salt).', '没有结果。换个短一点的词，或者用母体名（例如草甘膦，而不是它的盐）。') + '</li>';
  }
  var KIND = ZH ? { a: '原药', c: '公司', h: '作物', p: '防治对象' } : { a: 'Active', c: 'Company', h: 'Crop', p: 'Target' };
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function move(d) {
    var li = $$('[role=option]', plist); if (!li.length) return;
    li[cur].setAttribute('aria-selected', 'false'); cur = (cur + d + li.length) % li.length;
    li[cur].setAttribute('aria-selected', 'true'); li[cur].scrollIntoView({ block: 'nearest' });
  }
  function open() {
    if (!pal) return; lastFocus = document.activeElement;
    pal.hidden = false; document.documentElement.classList.add('locked');
    pin.value = ''; load().then(render); setTimeout(function () { pin.focus(); }, 10);
  }
  function close() { pal.hidden = true; document.documentElement.classList.remove('locked'); if (lastFocus) lastFocus.focus(); }
  if (pal) {
    $$('[data-palette]').forEach(function (b) { b.addEventListener('click', open); });
    pin.addEventListener('input', function () { load().then(render); });
    pin.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && hits[cur]) { location.href = base + hits[cur].u; }
    });
    pal.addEventListener('click', function (e) { if (e.target === pal) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pal.hidden) close();
      var t = e.target.tagName;
      if (e.key === '/' && pal.hidden && t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') { e.preventDefault(); open(); }
    });
  }

  // ---------- 表格排序（所有 .sortable） ----------
  $$('table.sortable').forEach(function (t) {
    var heads = t.tHead.rows[0].cells, curK = -1, asc = false;
    Array.prototype.forEach.call(heads, function (th) {
      th.tabIndex = 0;
      function go() {
        var k = +th.getAttribute('data-k');
        var numeric = th.classList.contains('r');
        asc = curK === k ? !asc : !numeric;
        curK = k;
        Array.prototype.forEach.call(heads, function (h) { h.classList.remove('on', 'asc'); h.removeAttribute('aria-sort'); });
        th.classList.add('on'); if (asc) th.classList.add('asc');
        th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        var body = t.tBodies[0], rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (a, b) {
          var x = a.cells[k].textContent.trim(), y = b.cells[k].textContent.trim();
          var nx = parseFloat(x), ny = parseFloat(y), c;
          if (numeric) c = (isNaN(nx) ? -1 : nx) - (isNaN(ny) ? -1 : ny);
          else c = x.localeCompare(y);
          return asc ? c : -c;
        });
        rows.forEach(function (r) { body.appendChild(r); });
        if (t.id === 't') apply();
      }
      th.addEventListener('click', go);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  });

  // ---------- 首页：筛选 + 只先显示 50 行 ----------
  var t = $('#t'), q = $('#q'), grp = $('#grp'), count = $('#count'), more = $('#more');
  var LIMIT = 50, expanded = false, mode = 'all';
  function apply() {
    if (!t) return;
    var v = q.value.trim().toLowerCase(), g = grp.value, n = 0, shown = 0;
    Array.prototype.forEach.call(t.tBodies[0].rows, function (r) {
      var src = +r.getAttribute('data-src');
      var ok = (!v || r.getAttribute('data-q').indexOf(v) >= 0) && (!g || r.getAttribute('data-g') === g) &&
        (mode === 'all' || (mode === 'src' && src > 0) || (mode === 'nosrc' && src === 0) || (' ' + r.getAttribute('data-flags') + ' ').indexOf(' ' + mode + ' ') >= 0);
      if (ok) n++;
      var show = ok && (expanded || shown < LIMIT);
      if (show) shown++;
      r.hidden = !show;
      if (ok) r.removeAttribute('data-out'); else r.setAttribute('data-out', '');
    });
    count.textContent = n; count.value = n;
    more.hidden = expanded || n <= LIMIT;
  }
  if (t) {
    var timer;
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
    grp.addEventListener('change', apply);
    $$('[data-filter] button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-filter] button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); mode = b.getAttribute('data-f'); apply();
      });
    });
    more.querySelector('button').addEventListener('click', function () { expanded = true; apply(); });
    var sp = new URLSearchParams(location.search), p = sp.get('q'), f = sp.get('f');
    if (f) $$('[data-filter] button').forEach(function (x) { var on = x.getAttribute('data-f') === f; x.setAttribute('aria-pressed', String(on)); if (on) mode = f; });
    if (p) q.value = p;
    if (p || f) document.getElementById('explore').scrollIntoView();
    apply();
  }

  // ---------- 通用标签切换：[data-switch-group] 里的按钮 data-switch=面板 id ----------
  $$('[data-switch-group]').forEach(function (g) {
    var btns = $$('[data-switch]', g);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) {
          var on = x === b;
          x.setAttribute('aria-selected', String(on));
          if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', String(on));
          document.getElementById(x.getAttribute('data-switch')).hidden = !on;
        });
      });
    });
  });

  // ---------- 变化页：按类型筛 ----------
  $$('[data-feedfilter] button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-feedfilter] button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      var f = b.getAttribute('data-f');
      $$('.feed li').forEach(function (li) { li.hidden = f !== 'all' && li.getAttribute('data-kind') !== f; });
    });
  });

  // ---------- 变化页：展开更早的周 ----------
  $$('[data-show-later]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('.sec').classList.add('show-later'); b.parentNode.hidden = true; });
  });

  // ---------- 图表 / 表格切换 ----------
  $$('.signal').forEach(function (s) {
    $$('[data-view]', s).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        $$('[data-view]', s).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        $$('.view', s).forEach(function (x) { x.hidden = x.getAttribute('data-v') !== v; });
      });
    });
  });

  // ---------- 分区导航：滚动时高亮当前分区 ----------
  var tabs = $$('.toc a');
  if (tabs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        tabs.forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === e.target.id); });
      });
    }, { rootMargin: '-140px 0px -60% 0px' });
    tabs.forEach(function (a) { var s = document.getElementById(a.getAttribute('data-tab')); if (s) io.observe(s); });
  }

  // ---------- 语言下拉：点外面或按 Esc 收起 ----------
  $$('.langsel').forEach(function (d) {
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; $('summary', d).focus(); } });
  });

  // ---------- 复制链接 ----------
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = $('span', b), old = label.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () {
        label.textContent = L('Link copied', '已复制链接');
      }, function () { label.textContent = L('Copy failed', '复制失败'); }).then(function () { setTimeout(function () { label.textContent = old; }, 1600); });
    });
  });

  // ---------- 导出 CSV：表格当前筛选结果（首页忽略「先显示 50 行」，导出全部符合的） ----------
  function cell(td) {
    var t = td.cloneNode(true);
    $$('small', t).forEach(function (x) { x.textContent = ' (' + x.textContent + ')'; });
    var v = t.textContent.replace(/\s+/g, ' ').trim();
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  $$('[data-csv]').forEach(function (b) {
    b.addEventListener('click', function () {
      var tb = document.getElementById(b.getAttribute('data-csv')); if (!tb) return;
      var rows = [Array.prototype.map.call(tb.tHead.rows[0].cells, cell).join(',')];
      Array.prototype.forEach.call(tb.tBodies[0].rows, function (r) {
        if (r.hasAttribute('data-out') || (r.hidden && tb.id !== 't')) return;
        rows.push(Array.prototype.map.call(r.cells, cell).join(','));
      });
      var dd = document.body.getAttribute('data-data') || '';
      var src = L('Source: APVMA PubCRIS export downloaded ' + dd + ', CC BY 3.0 AU, via Actives Index (independent, not affiliated with the APVMA)', '来源：APVMA PubCRIS 导出，' + dd + ' 下载，CC BY 3.0 AU；Actives Index 整理（独立，与 APVMA 无关联）');
      var blob = new Blob(['﻿' + rows.join('\r\n') + '\r\n\r\n"' + src + '"\r\n'], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = b.getAttribute('data-file') || 'export.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
  });

  // ---------- 关注列表：只存在本机浏览器（localStorage），可能拿不到，失败就当空 ----------
  var WKEY = 'ai.watch', SKEY = 'ai.seen';
  function wget() { try { return JSON.parse(localStorage.getItem(WKEY) || '[]'); } catch (e) { return []; } }
  function wset(v) { try { localStorage.setItem(WKEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  $$('[data-watch]').forEach(function (b) {
    var key = b.getAttribute('data-watch') + ':' + b.getAttribute('data-id'), label = $('span', b);
    function paint() {
      var on = wget().some(function (x) { return x.k === key; });
      b.setAttribute('aria-pressed', String(on)); label.textContent = on ? L('Watching', '已关注') : L('Watch', '关注');
    }
    b.addEventListener('click', function () {
      var w = wget(), i = -1;
      w.forEach(function (x, j) { if (x.k === key) i = j; });
      if (i >= 0) w.splice(i, 1); else w.unshift({ k: key, n: b.getAttribute('data-name'), at: document.body.getAttribute('data-data') });
      if (!wset(w)) { label.textContent = L('Browser storage is off', '浏览器存储已关闭'); return; }
      paint();
    });
    paint();
  });
  var wl = $('[data-watch-list]');
  if (wl) {
    var w = wget(), seen = '';
    try { seen = localStorage.getItem(SKEY) || ''; localStorage.setItem(SKEY, document.body.getAttribute('data-data') || ''); } catch (e) {}
    if (w.length) {
      load().then(function (idx) {
        var by = {};
        idx.forEach(function (it) { by[(it.t === 'a' ? 'a:' : 'c:') + it.u.replace(/^.*\//, '').replace(/\.html$/, '')] = it; });
        var fresh = 0;
        wl.innerHTML = w.map(function (x) {
          var it = by[x.k]; if (!it) return '';
          var isNew = it.l && seen && it.l > seen; if (isNew) fresh++;
          var meta = it.t === 'a' ? L(it.s + ' sources, ' + it.p + ' products', it.s + ' 个来源，' + it.p + ' 个产品') : L(it.s + ' approvals, ' + it.p + ' products', it.s + ' 个批准，' + it.p + ' 个产品');
          var last = it.l ? L('Last change ' + it.l + ', ' + it.c6 + ' in six months', '最近变化 ' + it.l + '，近半年 ' + it.c6 + ' 次') : L('No change in six months', '近半年没有变化');
          return '<li' + (isNew ? ' class="new"' : '') + '><a href="' + it.u + '"><span class="kind ' + it.t + '">' + KIND[it.t] + '</span><b>' + esc(it.n) + '</b></a><span class="mt">' + meta + '</span><span class="lc">' + (isNew ? '<i class="dot"></i>' : '') + last + '</span></li>';
        }).join('');
        var note = $('[data-watch-note]');
        if (note) note.textContent = fresh ? L(fresh + ' with changes since your last visit', fresh + ' 个自上次来访后有变化') : L('Kept in this browser only', '只保存在这个浏览器里');
        $('#watching').hidden = false;
      });
    }
  }

  // ---------- 作物页 / 靶标页：按另一维筛 ----------
  var ud = $('#use-data'), uf = $('#uf');
  if (ud && uf) {
    var D = JSON.parse(ud.textContent), ut = $('#t-use'), byO = {}, scope = $('[data-scope]'), scope0 = scope.textContent;
    D.o.forEach(function (o, i) { byO[o.toLowerCase()] = i; });
    $('#uf-list').innerHTML = D.o.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('');
    var clear = $('[data-uf-clear]'), empty = $('[data-uf-empty]');
    var orig = Array.prototype.map.call(ut.tBodies[0].rows, function (r) { return r.cells[1].textContent; });
    function ufApply() {
      var v = uf.value.trim().toLowerCase(), hit = {}, any = false, exact = byO[v];
      if (!v) {
        Array.prototype.forEach.call(ut.tBodies[0].rows, function (r, i) { r.hidden = false; r.removeAttribute('data-out'); r.cells[1].textContent = orig[+r.getAttribute('data-i')]; });
        scope.textContent = scope0; clear.hidden = true; empty.hidden = true; return;
      }
      D.r.forEach(function (x) {   // x = [另一维序号, 原药序号, 产品数]
        var o = D.o[x[0]].toLowerCase();
        if (exact !== undefined ? x[0] === exact : o.indexOf(v) >= 0) { hit[x[1]] = (hit[x[1]] || 0) + x[2]; any = true; }
      });
      Array.prototype.forEach.call(ut.tBodies[0].rows, function (r) {
        var a = r.getAttribute('data-a'), n = hit[a];
        r.hidden = !n; if (n) { r.removeAttribute('data-out'); r.cells[1].textContent = n; } else r.setAttribute('data-out', '');
      });
      scope.textContent = exact !== undefined ? L('on ' + D.o[exact], '（' + D.o[exact] + '）') : L('on ' + uf.value.trim() + ' (all matches)', '（' + uf.value.trim() + '，全部匹配）');
      clear.hidden = false; empty.hidden = any;
    }
    Array.prototype.forEach.call(ut.tBodies[0].rows, function (r, i) { r.setAttribute('data-i', i); });
    var ut0; uf.addEventListener('input', function () { clearTimeout(ut0); ut0 = setTimeout(ufApply, 150); });
    clear.addEventListener('click', function () { uf.value = ''; ufApply(); uf.focus(); });
    var pre = new URLSearchParams(location.search).get('f'); if (pre) { uf.value = pre; ufApply(); }
  }

  // ---------- 作物与靶标索引：筛选 ----------
  var ul = $('#ul');
  if (ul) {
    ul.addEventListener('input', function () {
      var v = ul.value.trim().toLowerCase(), w = v.split(/\s+/);
      $$('[data-ul] li').forEach(function (li) { var q = li.getAttribute('data-q'); li.hidden = !!v && !w.every(function (x) { return q.indexOf(x) >= 0; }); });
    });
  }
})();

// ---------- 简化版（20261101）：原药页标签页跟着网址 #，登记商按「有没有自有批准」筛 ----------
(function () {
  var bar = document.querySelector('.tabs[data-switch-group]'); if (!bar) return;
  function open(id) {
    var b = bar.querySelector('[data-switch="' + id + '"]'); if (b) { b.click(); return true; }
    return false;
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-switch]'); if (!b) return;
    history.replaceState(null, '', '#' + b.getAttribute('data-switch'));
  });
  bar.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var bs = Array.prototype.slice.call(bar.querySelectorAll('[data-switch]')), i = bs.indexOf(document.activeElement);
    if (i < 0) return; var j = (i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length; bs[j].focus(); bs[j].click();
  });
  var h = location.hash.slice(1); if (h) open(h);
  window.addEventListener('hashchange', function () { open(location.hash.slice(1)); });
  var f = document.querySelector('[data-ownfilter]'), t = document.getElementById('t-reg');
  if (f && t) f.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    f.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var v = b.getAttribute('data-f');
    Array.prototype.forEach.call(t.tBodies[0].rows, function (r) { r.hidden = v !== 'all' && r.getAttribute('data-own') !== v; });
  });
})();
