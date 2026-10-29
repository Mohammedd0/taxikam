/* یەکسا، پانێڵی بەڕێوەبردن (خاوەنی ئەپ)
 * هەموو گۆڕانکارییەک ڕاستەوخۆ لە ئەپی سەرنشین و شۆفێر دەردەکەوێت، چونکە هەمان زانیاری بەکاردەهێنن.
 */
(function () {
  'use strict';
  const { ui, fmt, sel, actions, esc } = TK;
  const icon = TK.icon;
  const S = () => TK.get();
  const U = TK.app.ui;
  const acts = TK.app.acts;

  /* ---------- یارمەتیدەر ---------- */
  const val = (id) => {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.type === 'checkbox' ? el.checked : el.value;
  };
  const num = (id) => Number(String(val(id)).replace(/[^\d.-]/g, '')) || 0;
  // تەنها هەژماری بەڕێوەبەر (لە firebase-config.js) دەتوانێت بچێتە ژوورەوە
  const isAuthed = () => !!TK.cloud.me;
  const guard = () => (isAuthed() ? null : 'login');
  const input = (id, label, value = '', opts = {}) =>
    `<div class="field ${opts.full ? 'full' : ''}"><label for="${id}">${label}</label>${opts.area
      ? `<textarea class="input" id="${id}" placeholder="${esc(opts.ph || '')}">${esc(value)}</textarea>`
      : opts.unit
        ? `<div class="unit-wrap"><input class="input ltr latin" id="${id}" type="text" inputmode="decimal" value="${esc(value)}" placeholder="${esc(opts.ph || '')}" ${opts.attrs || ''}><span class="unit">${esc(opts.unit)}</span></div>`
        : `<input class="input ${opts.ltr ? 'ltr latin' : ''}" id="${id}" type="${opts.type || 'text'}" value="${esc(value)}" placeholder="${esc(opts.ph || '')}" ${opts.step ? `step="${opts.step}"` : ''} ${opts.attrs || ''}>`}${opts.hint ? `<span class="xs muted">${opts.hint}</span>` : ''}</div>`;
  const select = (id, label, value, options, opts = {}) =>
    `<div class="field ${opts.full ? 'full' : ''}"><label for="${id}">${label}</label><select class="input" id="${id}">${options
      .map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`)
      .join('')}</select></div>`;
  const check = (id, label, on) => `<label class="check-row"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}>${label}</label>`;
  const kpi = (v, l, ic, opts = {}) => `<div class="kpi ${opts.alert ? 'alert' : ''} ${opts.go ? 'tap' : ''}" ${opts.go ? `data-go="${opts.go}"` : ''}><div class="l">${icon(ic, 16)}${l}</div><div class="v ${opts.cls || ''}">${v}</div>${opts.sub ? `<div class="xs muted">${opts.sub}</div>` : ''}</div>`;
  const pushN = (s, n, owner) => TK.noticeAdd(s, n, owner);
  const pushDN = (s, n) => {
    if (n.driverId) TK.dnoticeAdd(s, n);
    else s.drivers.forEach((d) => TK.dnoticeAdd(s, { ...n, driverId: d.id }));
  };
  /** هەموو داواکارییەکانی پشتگیری لە هەموو هەژمارەکانی سەرنشین */
  const allTickets = (s) => {
    const out = s.tickets.map((t) => ({ ...t, owner: 'me', who: t.by || s.passenger.name }));
    Object.keys(s.vault || {}).forEach((ph) => (s.vault[ph].tickets || []).forEach((t) => out.push({ ...t, owner: ph, who: t.by || (s.vault[ph].passenger || {}).name })));
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  };
  TK.allTickets = allTickets;
  /** بەڵگەنامەی بەسەرچوو یان نزیک لە بەسەرچوون */
  const expWarn = (d) => TK.expiries(d).filter((e) => e.days <= TK.CONFIG.expiryWarnDays);
  const STATUS = { active: ['چالاک', 'ok'], pending: ['چاوەڕێی پشتڕاستکردنەوە', 'note'], suspended: ['ڕاگیراو', 'danger'] };
  const TRIP_ST = { scheduled: ['چاوەڕێ', 'note'], active: ['لە ڕێگەیە', 'ok'], done: ['تەواو', 'ok'], skipped: ['نایەن', 'danger'], noshow: ['شۆفێر نەهات', 'danger'], absent: ['سەرنشین نەهات', 'danger'] };

  /* ---------- چوارچێوە ---------- */
  function counts() {
    const s = S();
    return {
      pending: s.drivers.filter((d) => d.status === 'pending').length,
      reports: s.reports.filter((r) => r.status === 'open').length + allTickets(s).filter((t) => t.status !== 'resolved').length,
      expiry: s.drivers.filter((d) => expWarn(d).length).length,
      requests: s.requests.filter((r) => r.status === 'open').length,
      swaps: s.swaps.filter((w) => w.status === 'open').length,
      get driversAlert() {
        return this.pending + this.expiry;
      },
    };
  }
  const NAV = [
    ['dash', 'home', 'داشبۆرد'],
    ['drivers', 'car', 'شۆفێرەکان', 'driversAlert'],
    ['passengers', 'users', 'سەرنشینەکان'],
    ['partners', 'briefcase', 'هاوبەشەکان'],
    ['subs', 'calendar', 'بەشداری و داواکاری', 'requests'],
    ['trips', 'route', 'گەشتەکان', 'swaps'],
    ['news', 'news', 'هەواڵ و ئاگادارکردنەوە'],
    ['finance', 'wallet', 'دارایی'],
    ['reports', 'alert', 'سکاڵا و ڕاپۆرت', 'reports'],
    ['chats', 'chat', 'نامەکان'],
    ['places', 'pin', 'شوێنەکان'],
    ['settings', 'settings', 'یاسا و ڕێکخستن'],
  ];
  function layout(active, title, body, right = '') {
    const c = counts();
    return `<div class="adm">
      <nav class="side">
        <div class="side-logo">${TK.logo('inv')}<div class="xs" style="opacity:.6;margin-top:6px">پانێڵی بەڕێوەبردن</div></div>
        ${NAV.map(([k, ic, l, cnt]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}">${icon(ic, 18)}<span>${l}</span>${cnt && c[cnt] ? `<span class="cnt">${c[cnt]}</span>` : ''}</a>`).join('')}
        <a href="#/login" data-act="logout">${icon('logout', 18)}<span>چوونەدەرەوە</span></a>
        <div class="foot">یەکسا، وەشانی 1.0</div>
      </nav>
      <main class="main">
        <div class="topline"><div class="h1">${title}</div><div class="row wrap" style="gap:8px">${right}</div></div>
        ${body}
      </main>
    </div>`;
  }

  /* =========================================================
   * چوونەژوورەوە
   * ======================================================= */
  TK.route('login', {
    guard: () => (isAuthed() ? 'dash' : null),
    render() {
      return `<div class="splash" style="gap:16px">
        ${TK.logo('big inv')}
        <div class="h1">پانێڵی بەڕێوەبردن</div>
        <div class="sm" style="opacity:.85;max-width:360px;text-align:center">بە ئیمەیڵ و وشەی نهێنی هەژماری بەڕێوەبەر بچۆ ژوورەوە (ئەو هەژمارەی لە Firebase دروستت کردووە).</div>
        <form class="col" data-submit="doLogin" style="width:min(360px, 90vw);gap:10px">
          <input class="input ltr latin" id="au" name="user" type="email" placeholder="ئیمەیڵ" autocomplete="username" style="background:#fff;color:#13254A">
          <input class="input ltr latin" id="ap" name="pass" type="password" placeholder="وشەی نهێنی" autocomplete="current-password" style="background:#fff;color:#13254A">
          ${U.loginErr ? `<div class="err" style="color:#FFB4B4">${esc(U.loginErr)}</div>` : ''}
          <button class="btn block" type="submit">چوونەژوورەوە</button>
        </form>
      </div>`;
    },
  });
  acts.doLogin = async (f, form) => {
    if (U.busy) return;
    const done = TK.busyBtn(form);
    U.loginErr = await actions.adminLogin(f.user || '', f.pass || '');
    done();
    if (U.loginErr) return TK.render();
    TK.go('dash', true);
  };
  acts.logout = async () => {
    await actions.adminLogout();
    U.loginErr = '';
    TK.go('login', true);
  };

  /* =========================================================
   * داشبۆرد
   * ======================================================= */
  TK.route('dash', {
    guard,
    render() {
      const s = S();
      const c = counts();
      const drivers = s.drivers.filter((d) => d.status === 'active');
      const gross = drivers.reduce((n, d) => n + TK.payout(s, d.id).gross, 0);
      const fee = Math.round(gross * TK.CONFIG.commission);
      const tc = {};
      s.trips.forEach((t) => (tc[t.status] = (tc[t.status] || 0) + 1));
      const maxT = Math.max(1, ...Object.values(tc));
      const feed = (s.adminNotices || []).slice(0, 15);
      const alerts = [];
      s.drivers.forEach((d) => expWarn(d).forEach((e) => alerts.push([e.days < 0 ? `${e.label}ی ${d.name} بەسەرچووە` : `${e.label}ی ${d.name} ${e.days} ڕۆژی ماوە`, `driver/${d.id}`, 'alert', true])));
      if (c.pending) alerts.push([`${c.pending} شۆفێری نوێ چاوەڕێی پشتڕاستکردنەوەن`, 'drivers', 'car']);
      const openRep = s.reports.filter((r) => r.status === 'open').length;
      if (openRep) alerts.push([`${openRep} ڕاپۆرتی «شۆفێر نەهات» پێویستی بە پشکنینە`, 'reports', 'alert']);
      const openT = allTickets(s).filter((t) => t.status !== 'resolved').length;
      if (openT) alerts.push([`${openT} داواکاری پشتگیری وەڵام نەدراوەتەوە`, 'reports', 'help']);
      if (backupDue()) alerts.push([S().lastBackupAt ? 'زیاتر لە هەفتەیەکە پاشەکەوتی زانیارییەکانت (Backup) نەکردووە' : 'هێشتا هیچ پاشەکەوتێکی زانیارییەکانت (Backup) نەکردووە', 'settings', 'download', true]);
      if (c.swaps) alerts.push([`${c.swaps} گەشت جێگرەوەی دەوێت`, 'trips', 'swap']);
      const stale = s.requests.filter((r) => r.status === 'open' && !r.offers.length && Date.now() - r.createdAt > 3600000).length;
      if (stale) alerts.push([`${stale} داواکاری زیاتر لە کاتژمێرێکە هیچ نرخێکی بۆ نەهاتووە`, 'subs', 'megaphone']);
      const lowRated = s.drivers.filter((d) => d.status === 'active' && d.reviews > 5 && d.rating < 4.5).length;
      if (lowRated) alerts.push([`${lowRated} شۆفێر هەڵسەنگاندنی کەمە`, 'drivers', 'star']);
      return layout('dash', 'داشبۆرد', `
        <div class="kpis">
          ${kpi(s.subscriptions.length, 'بەشداری چالاک', 'calendar', { go: 'subs' })}
          ${kpi(s.accounts.length, 'ئەکاونتی سەرنشین', 'users', { go: 'passengers' })}
          ${kpi(`${drivers.length}`, 'شۆفێری چالاک', 'car', { go: 'drivers', sub: `${s.drivers.filter((d) => d.status === 'pending').length} چاوەڕێ، ${s.drivers.filter((d) => d.status === 'suspended').length} ڕاگیراو` })}
          ${kpi(fmt.money(gross), 'داهاتی مانگانە (کۆی گشتی)', 'wallet', { go: 'finance' })}
          ${(() => {
            const ptm = (s.partners || []).reduce((n, p) => n + TK.partnerStats(s, p.id).month, 0);
            return kpi(fmt.money(fee - ptm), 'قازانجی پاکی تۆ', 'trophy', { go: 'finance', cls: 'brand', sub: `کۆمیسیۆن ${Math.round(TK.CONFIG.commission * 100)}٪، بەشی هاوبەشەکان ${fmt.money(ptm)}` });
          })()}
          ${kpi(c.requests, 'داواکاری کراوە', 'megaphone', { go: 'subs' })}
          ${kpi(openRep + openT, 'سکاڵا و ڕاپۆرت', 'alert', { go: 'reports', alert: openRep + openT > 0 })}
          ${kpi(c.swaps, 'داواکاری جێگرەوە', 'swap', { go: 'trips', alert: c.swaps > 0 })}
        </div>
        <div class="cols">
          <div class="card col">
            <div class="h3">پێویستی بە کار هەیە</div>
            ${alerts.length ? `<div class="list">${alerts.map(([t, go, ic, red]) => `<div class="item tap ${red ? 'red-notice' : ''}" data-go="${go}"><div class="ico-box ${red ? 'danger' : ''}">${icon(ic, 18, red ? 'var(--danger-text)' : 'var(--brand)')}</div><b class="grow sm">${esc(t)}</b>${icon('forward', 16, 'var(--muted)')}</div>`).join('')}</div>` : '<div class="card ok sm">هەموو شتێک ڕێکە. هیچ کارێکی چاوەڕوان نییە.</div>'}
          </div>
          <div class="card col">
            <div class="h3">گەشتەکانی ئەمڕۆ</div>
            <div class="bars">${Object.keys(TRIP_ST).map((k) => `<div class="bar"><span>${TRIP_ST[k][0]}</span><div class="track"><i style="width:${((tc[k] || 0) / maxT) * 100}%;${k === 'noshow' || k === 'skipped' ? 'background:var(--danger)' : k === 'done' ? 'background:var(--success)' : ''}"></i></div><b>${tc[k] || 0}</b></div>`).join('')}</div>
            <div class="xs muted">کۆی گشتی: ${s.trips.length} گەشت</div>
          </div>
        </div>
        <div class="cols">
          <div class="card col">
            <div class="row between"><div class="h3">باشترین شۆفێرەکان</div><button class="link" data-go="drivers">هەمووی</button></div>
            <div class="list">${drivers.slice().sort((a, b) => b.rating - a.rating).slice(0, 5).map((d) => `<div class="item tap" data-go="driver/${d.id}">${ui.dAvatar(d, 36)}<div class="grow"><b class="sm">${esc(d.name)}</b><div class="xs muted">${d.trips} گەشت</div></div>${d.reviews ? ui.stars(d.rating) : '<span class="xs muted">نوێ</span>'}</div>`).join('') || '<div class="item sm muted">هێشتا هیچ شۆفێرێکی چالاک نییە</div>'}</div>
          </div>
          <div class="card col feed">
            <div class="h3">دوایین چالاکییەکان</div>
            <div class="list">${feed.map((n) => {
              const [ic, tone] = n.red ? ['alert', 'danger'] : ui.noticeIcon(n.kind === 'driver' ? 'ride' : n.kind === 'ticket' ? 'chat' : n.kind);
              return `<div class="item ${n.link ? 'tap' : ''} ${n.red ? 'red-notice' : ''}" ${n.link ? `data-go="${esc(n.link)}"` : ''}><div class="ico-box ${tone}">${icon(ic, 16, n.red ? 'var(--danger-text)' : 'var(--brand)')}</div><div class="grow"><b class="sm">${esc(n.title)}</b><div class="xs muted">${esc(n.body || '')}</div></div><span class="xs muted" style="white-space:nowrap">${fmt.ago(n.at)}</span></div>`;
            }).join('') || '<div class="item sm muted">هێشتا هیچ چالاکییەک نییە</div>'}</div>
          </div>
        </div>`);
    },
  });

  /* =========================================================
   * شۆفێرەکان
   * ======================================================= */
  TK.route('drivers', {
    guard,
    render() {
      const s = S();
      const f = U.dfilter || 'all';
      const q = TK.normalize(U.dq || '');
      let list = s.drivers.slice();
      if (f === 'alert') list = list.filter((d) => expWarn(d).length);
      else if (f !== 'all') list = list.filter((d) => d.status === f);
      if (q) list = list.filter((d) => TK.normalize([d.name, d.phone, d.car, d.plate, d.district, d.neighborhood].join(' ')).includes(q));
      list.sort((a, b) => (a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : (b.rating || 0) - (a.rating || 0)));
      const cnt = (k) => (k === 'all' ? s.drivers.length : k === 'alert' ? s.drivers.filter((d) => expWarn(d).length).length : s.drivers.filter((d) => d.status === k).length);
      return layout('drivers', 'شۆفێرەکان', `
        <div class="row"><button class="btn" data-act="newDriver">${icon('plus', 18, 'currentColor', 2.4)}زیادکردنی شۆفێر</button><span class="xs muted grow">بۆ شۆفێرێک کە ناتوانێت خۆی لە ئەپەکەوە تۆمار بکات</span></div>
        <div class="row wrap" style="gap:8px">
          <div class="tabs grow">${[['all', 'هەمووی'], ['pending', 'چاوەڕێی پشتڕاستکردنەوە'], ['active', 'چالاک'], ['suspended', 'ڕاگیراو'], ['alert', 'بەڵگەنامەی بەسەرچوو']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="dfilter" data-arg="${k}">${l} (${cnt(k)})</button>`).join('')}</div>
          <input class="input" id="dq" style="max-width:280px;min-height:42px" placeholder="گەڕان: ناو، ژمارە، تابلۆ" value="${esc(U.dq || '')}" data-input="dq">
        </div>
        ${list.length ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>شۆفێر</th><th>ئۆتۆمبێل</th><th>ژمارە</th><th>شار</th><th>جۆر</th><th>هەڵسەنگاندن</th><th>سەرنشین</th><th>دۆخ</th></tr></thead>
          <tbody>${list.map((d) => {
            const po = TK.payout(s, d.id);
            const warn = expWarn(d);
            return `<tr class="tap" data-go="driver/${d.id}">
              <td><div class="row" style="gap:8px">${ui.dAvatar(d, 36)}<div><b style="${warn.length ? 'color:var(--danger)' : ''}">${esc(d.name)}</b>${warn.length ? `<div class="xs" style="color:var(--danger)">${icon('alert', 12, 'var(--danger)')} ${esc(warn.map((e) => e.label).join('، '))}</div>` : ''}</div></div></td>
              <td class="sm">${esc(d.car)}${d.carYear ? `، ${d.carYear}` : ''}<div style="margin-top:3px">${ui.plate(d.plate, d.plateType)}</div></td>
              <td class="latin sm">${fmt.phone(d.phone)}</td>
              <td class="sm">${esc((TK.city(d.city) || {}).name || '')}<div class="xs muted">${esc(d.district || '')}</div></td>
              <td><div class="row wrap" style="gap:4px">${ui.badge(d.woman ? 'مێ' : 'نێر', d.woman ? 'woman' : '')}${d.kidsDriver ? ui.badge('منداڵان', 'note') : ''}</div></td>
              <td>${d.reviews ? ui.stars(d.rating) : '<span class="xs muted">نوێ</span>'}</td>
              <td>${po.subs}</td>
              <td>${ui.badge(STATUS[d.status][0], STATUS[d.status][1])}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : ui.empty('car', s.drivers.length ? 'هیچ شۆفێرێک نەدۆزرایەوە' : 'هێشتا هیچ شۆفێرێک تۆمار نەکردووە', s.drivers.length ? '' : 'شۆفێرەکان لە ئەپی شۆفێرەوە خۆیان تۆمار دەکەن و لێرە دەردەکەون')}`);
    },
  });
  acts.dfilter = (k) => {
    U.dfilter = k;
    TK.render();
  };
  acts.dq = (v) => {
    U.dq = v;
    clearTimeout(U.dqT);
    U.dqT = setTimeout(() => {
      TK.render();
    }, 350);
  };

  const DST = { ok: ['پەسەندکراو', 'ok'], pending: ['چاوەڕێی پشکنین', 'note'], rejected: ['ڕەتکرایەوە', 'danger'] };
  // شێوازەکانی موچە لە ڕێکخستنەکانەوە دێن (بەڕێوەبەر زیادیان دەکات)
  const PAY = new Proxy({}, { get: (_, k) => (typeof k === 'string' && k && k !== 'undefined' && k !== 'null' ? TK.payName(k) : undefined) });
  /** ئایا شۆفێر شێوازی موچەکەی گۆڕیوە و بەڕێوەبەر هێشتا پشتڕاستی نەکردووەتەوە */
  const payChanged = (d) => TK.payUnconfirmed(d);
  const imgTile = (id, label) => {
    const src = TK.img(id);
    return src ? `<button class="doc-img" data-act="zoomImg" data-arg="${esc(id)}|${esc(label)}"><img src="${src}" alt=""><span>${esc(label)}</span></button>` : `<div class="doc-img empty"><span>${esc(label)}</span><small>بار نەکراوە</small></div>`;
  };
  const row = (l, v) => `<div class="row between sm"><span class="muted">${l}</span><b style="text-align:left">${v || '-'}</b></div>`;
  /** زانیاری هەر گرووپێکی بەڵگەنامە بۆ پشکنین */
  function groupInfo(d, key) {
    const exp = (k) => {
      const e = TK.expiries(d).find((x) => x.key === k);
      return e ? `${fmt.day(e.date)}${e.days < 0 ? ' <span style="color:var(--danger)">(بەسەرچووە)</span>' : e.days <= TK.CONFIG.expiryWarnDays ? ` <span style="color:var(--danger)">(${e.days} ڕۆژی ماوە)</span>` : ''}` : '-';
    };
    switch (key) {
      case 'personal':
        return `${row('ناوی سیانی', esc(d.name))}${row('ڕەگەز', d.woman ? 'مێ' : 'نێر')}${row('ڕۆژی لەدایکبوون', d.birth ? `${fmt.day(d.birth)} (${TK.age(d.birth)} ساڵ)` : '-')}${row('ژمارەی مۆبایل', `<span class="latin">${fmt.phone(d.phone)}</span>`)}
          ${row('شار و قەزا', esc(`${(TK.city(d.city) || {}).name || ''}، ${d.district || ''}`))}${row('گەڕەک', esc(`${d.neighborhood || ''}${d.landmark ? '، ' + d.landmark : ''}`))}
          ${row('فریاکەوتن', `${esc(d.emergencyName || '')} <span class="latin">${fmt.phone(d.emergencyPhone || '')}</span>`)}
          <div class="doc-imgs">${imgTile(d.photo, 'وێنەی ڕووخسار')}</div>`;
      case 'id':
        return `${row('ژمارەی کارت', `<span class="latin">${esc(d.idNo || '')}</span>`)}${row('بەسەرچوون', exp('id'))}<div class="doc-imgs">${imgTile(d.idFront, 'پێشەوە')}${imgTile(d.idBack, 'دواوە')}</div>`;
      case 'license':
        return `${row('ژمارەی مۆڵەت', `<span class="latin">${esc(d.licNo || '')}</span>`)}${row('جۆر', esc(d.licClass || ''))}${row('بەسەرچوون', exp('license'))}<div class="doc-imgs">${imgTile(d.licFront, 'پێشەوە')}${imgTile(d.licBack, 'دواوە')}</div>`;
      case 'car':
        return `${row('ئۆتۆمبێل', esc(`${d.carMake || ''} ${d.carModel || ''}`))}${row('ساڵ و ڕەنگ', esc(`${d.carYear || ''}، ${d.carColor || ''}`))}${row('کورسی', d.seats)}${row('تابلۆ', ui.plate(d.plate, d.plateType))}
          <div class="doc-imgs">${['carFront', 'carBack', 'carLeft', 'carRight', 'carInside'].map((k) => imgTile(d[k], TK.PHOTO_LABELS[k])).join('')}</div>`;
      case 'registration':
        return `${row('ژمارەی ساڵانە', `<span class="latin">${esc(d.regNo || '')}</span>`)}${row('بەسەرچوون', exp('registration'))}<div class="doc-imgs">${imgTile(d.regPhoto, 'ساڵانە')}</div>`;
      case 'security':
        return `${row('بەرواری وەرگرتن', d.secDate ? fmt.day(d.secDate) : '-')}${row('دروستە تا', exp('security'))}<div class="doc-imgs">${imgTile(d.secPhoto, 'کۆدی ئاسایش')}</div>`;
      default:
        return '';
    }
  }

  /* =========================================================
   * زیادکردنی شۆفێر لەلایەن بەڕێوەبەرەوە (لە ئۆفیس)
   * بۆ شۆفێرێک کە ناتوانێت خۆی لە ئەپەکەوە تۆمار بکات. وێنەکان ئارەزوومەندانەن.
   * ======================================================= */
  const ND_PHOTOS = [['photo', 'وێنەی ڕووخسار'], ['idFront', 'کارتی نیشتمانی (پێشەوە)'], ['idBack', 'کارتی نیشتمانی (دواوە)'], ['licFront', 'مۆڵەت (پێشەوە)'], ['licBack', 'مۆڵەت (دواوە)'], ['carFront', 'ئۆتۆمبێل (پێشەوە)'], ['carBack', 'ئۆتۆمبێل (دواوە)'], ['carLeft', 'لای چەپ'], ['carRight', 'لای ڕاست'], ['carInside', 'ناوەوە'], ['regPhoto', 'ساڵانە'], ['secPhoto', 'کۆدی ئاسایش']];
  const ND_FIELDS = {
    'n-name': 'name', 'n-phone': 'phone', 'n-pass': 'pass', 'n-gender': 'gender', 'n-city': 'city', 'n-district': 'district', 'n-neighborhood': 'neighborhood', 'n-landmark': 'landmark',
    'n-ename': 'emergencyName', 'n-ephone': 'emergencyPhone', 'n-idno': 'idNo', 'n-licno': 'licNo', 'n-licclass': 'licClass', 'n-make': 'carMake', 'n-model': 'carModel', 'n-year': 'carYear',
    'n-color': 'carColor', 'n-seats': 'seats', 'n-pcode': 'plateCode', 'n-pletter': 'plateLetter', 'n-pno': 'plateNo', 'n-regno': 'regNo', 'n-areas': 'workAreas', 'n-pay': 'payMethod', 'n-payacc': 'payAccount',
  };
  const ND_DATES = [['n-birth', 'birth'], ['n-idexp', 'idExpiry'], ['n-licexp', 'licExpiry'], ['n-regexp', 'regExpiry'], ['n-secdate', 'secDate']];
  function ndCollect() {
    const f = U.nd2;
    Object.keys(ND_FIELDS).forEach((id) => {
      const el = document.getElementById(id);
      if (el) f[ND_FIELDS[id]] = el.value.trim();
    });
    ['n-kids', 'n-childseat', 'n-verified'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) f[id.slice(2)] = el.checked;
    });
    ND_DATES.forEach(([id, k]) => {
      if (document.getElementById(id)) f[k] = TK.readDate(id);
    });
    return f;
  }
  TK.route('driver-new', {
    guard,
    render() {
      if (!U.nd2) U.nd2 = { gender: 'm', city: 'erbil', seats: 4, plateCode: '22', plateLetter: 'A', payMethod: 'cash', licClass: 'گشتی', verified: true };
      const f = U.nd2;
      const y = new Date().getFullYear();
      const city = TK.city(f.city) || TK.cities()[0];
      const date = (id, label, v, from, to) => `<div class="field"><label>${label}</label>${ui.dateParts(id, v, from, to)}</div>`;
      return layout('drivers', 'زیادکردنی شۆفێر', `
        <div class="card info sm">بۆ شۆفێرێک کە ناتوانێت خۆی لە ئەپەکەوە تۆمار بکات. لێرە زانیارییەکانی دەنووسیت و ژمارە و وشەی نهێنی دەدەیت پێی. وێنەکان ئارەزوومەندانەن.</div>
        <div class="cols">
          <div class="card col"><div class="h3">زانیاری کەسی و چوونەژوورەوە</div><div class="form-grid">
            ${input('n-name', 'ناوی سیانی *', f.name || '', { full: true })}
            ${select('n-gender', 'ڕەگەز *', f.gender, [['m', 'نێر'], ['f', 'مێ']])}
            ${date('n-birth', 'ڕۆژی لەدایکبوون *', f.birth, 1940, y - 18)}
            ${input('n-phone', 'ژمارەی مۆبایل *', f.phone || '', { ltr: true, ph: '750 123 4567' })}
            ${input('n-pass', 'وشەی نهێنی (بیدە بە شۆفێر) *', f.pass || '', { ltr: true, ph: 'لانیکەم ٦ پیت' })}
            ${select('n-city', 'شار *', f.city, TK.cities().map((c) => [c.id, c.name]))}
            ${select('n-district', 'قەزا', f.district || '', [['', 'هەڵبژێرە']].concat((city ? city.districts : []).map((d) => [d, d])))}
            ${input('n-neighborhood', 'گەڕەک', f.neighborhood || '')}
            ${input('n-landmark', 'نزیکترین شوێنی ناسراو', f.landmark || '')}
            ${input('n-ename', 'کەسی نزیک بۆ فریاکەوتن', f.emergencyName || '')}
            ${input('n-ephone', 'ژمارەی ئەو کەسە', f.emergencyPhone || '', { ltr: true })}
          </div></div>
          <div class="card col"><div class="h3">ئۆتۆمبێل *</div><div class="form-grid">
            ${input('n-make', 'جۆر *', f.carMake || '', { ph: 'تۆیۆتا' })}
            ${input('n-model', 'مۆدێل *', f.carModel || '', { ph: 'کامری' })}
            ${select('n-year', 'ساڵ *', f.carYear || '', [['', 'هەڵبژێرە']].concat(Array.from({ length: y + 2 - 1995 }, (_, i) => [y + 1 - i, y + 1 - i])))}
            ${input('n-color', 'ڕەنگ *', f.carColor || '')}
            ${select('n-seats', 'ژمارەی کورسی *', f.seats, [1, 2, 3, 4, 5, 6, 7].map((n) => [n, n]))}
            ${input('n-pcode', 'کۆدی تابلۆ *', f.plateCode, { ltr: true })}
            ${input('n-pletter', 'پیتی تابلۆ *', f.plateLetter, { ltr: true })}
            ${input('n-pno', 'ژمارەی تابلۆ *', f.plateNo || '', { ltr: true, ph: '12345' })}
          </div>
          <div class="h3">کار و موچە</div><div class="form-grid">
            ${input('n-areas', 'ناوچەکانی کار', f.workAreas || '', { full: true })}
            ${select('n-pay', 'وەرگرتنی موچە', f.payMethod, TK.payMethods().filter((m) => m.on !== false || m.id === f.payMethod).map((m) => [m.id, m.name]))}
            ${input('n-payacc', 'ژمارەی حیساب', f.payAccount || '', { ltr: true })}
            ${check('n-kids', 'شۆفێری منداڵان', f.kids)}
            ${check('n-childseat', 'کورسیی منداڵی هەیە', f.childseat)}
          </div></div>
        </div>
        <div class="card col"><div class="h3">بەڵگەنامەکان</div><div class="form-grid">
          ${input('n-idno', 'ژمارەی کارتی نیشتمانی', f.idNo || '', { ltr: true })}
          ${date('n-idexp', 'بەسەرچوونی کارت', f.idExpiry, y, y + 15)}
          ${input('n-licno', 'ژمارەی مۆڵەت', f.licNo || '', { ltr: true })}
          ${select('n-licclass', 'جۆری مۆڵەت', f.licClass, [['گشتی', 'گشتی (تەکسی)'], ['تایبەت', 'تایبەت'], ['بار', 'بار']])}
          ${date('n-licexp', 'بەسەرچوونی مۆڵەت', f.licExpiry, y, y + 15)}
          ${input('n-regno', 'ژمارەی ساڵانە', f.regNo || '', { ltr: true })}
          ${date('n-regexp', 'بەسەرچوونی ساڵانە', f.regExpiry, y, y + 5)}
          ${date('n-secdate', 'بەرواری کۆدی ئاسایش', f.secDate, y - 2, y)}
        </div>
        <div class="photos" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${ND_PHOTOS.map(([k, l]) => ui.photoField(k, l, f[k], 'ndPhoto')).join('')}</div></div>
        <div class="card col">
          ${check('n-verified', '<b>بەڵگەنامەکانم بە دەست پشکنی</b>، هەژمارەکە یەکسەر چالاک بکە', f.verified)}
          <span class="xs muted">ئەگەر نەیپشکنیت، شۆفێرەکە وەک «چاوەڕێی پشتڕاستکردنەوە» تۆمار دەکرێت.</span>
          ${U.ndErr ? `<div class="err">${esc(U.ndErr)}</div>` : ''}
          <div class="row" style="gap:8px"><button class="btn" data-act="ndSave">${icon('check', 18, 'currentColor', 2.4)}تۆمارکردنی شۆفێر</button><button class="btn ghost" data-act="ndCancel">پاشگەزبوونەوە</button></div>
        </div>`, `<button class="btn sm ghost" data-act="ndCancel">${icon('back', 16)}گەڕانەوە</button>`);
    },
  });
  acts.newDriver = () => {
    U.nd2 = null;
    U.ndErr = '';
    TK.go('driver-new');
  };
  acts.ndCancel = () => {
    U.nd2 = null;
    U.ndErr = '';
    TK.go('drivers');
  };
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'n-city' && U.nd2) {
      ndCollect();
      U.nd2.district = '';
      TK.render();
    }
  });
  acts.ndPhoto = async (v, el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    ndCollect();
    try {
      const id = await TK.saveImage(await TK.compressImage(file));
      if (!id) return TK.toast('جێگای پاشەکەوت پڕە');
      const key = el.getAttribute('data-arg');
      if (U.nd2[key]) TK.removeImage(U.nd2[key]);
      U.nd2[key] = id;
      TK.render();
    } catch (err) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە');
    }
  };
  acts.ndSave = async (a, el) => {
    if (U.busy) return;
    const f = ndCollect();
    const phone = TK.cleanPhone(f.phone);
    const c = TK.CONFIG;
    const bad = ND_DATES.find(([, k]) => f[k] === 'bad');
    let err = null;
    if (!f.name || f.name.split(/\s+/).length < 3) err = 'ناوی سیانی بنووسە';
    else if (!f.birth) err = 'ڕۆژی لەدایکبوون هەڵبژێرە';
    else if (bad) err = 'بەروارێک دروست نییە';
    else if (TK.age(f.birth) < c.minDriverAge) err = `تەمەنی شۆفێر دەبێت لانیکەم ${c.minDriverAge} ساڵ بێت`;
    else if (!/^7\d{9}$/.test(phone)) err = 'ژمارەی مۆبایل دروست نییە';
    else if (S().drivers.some((d) => d.phone === phone)) err = 'ئەم ژمارەیە پێشتر وەک شۆفێر تۆمار کراوە';
    else if (!f.pass || f.pass.length < 6) err = 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت';
    else if (!f.carMake || !f.carModel || !f.carColor || !f.carYear) err = 'جۆر، مۆدێل، ساڵ و ڕەنگی ئۆتۆمبێل بنووسە';
    else if (+f.carYear < c.minCarYear) err = `ساڵی ئۆتۆمبێل دەبێت ${c.minCarYear} یان نوێتر بێت`;
    else if (!/^\d{2}$/.test(f.plateCode || '') || !/^\d{3,6}$/.test(f.plateNo || '')) err = 'ژمارەی تابلۆ دروست نییە (وەک 22 A 12345)';
    else if (f.emergencyPhone && !/^7\d{9}$/.test(TK.cleanPhone(f.emergencyPhone))) err = 'ژمارەی فریاکەوتن دروست نییە';
    U.ndErr = err;
    if (err) return TK.render();
    // هەژماری چوونەژوورەوەی شۆفێرەکە لە Firebase دروست دەکرێت (بەڕێوەبەر لە ژوورەوە دەمێنێت)
    const done = TK.busyBtn(el);
    let newId = null;
    try {
      newId = await window.TKFB.createUser(TK.emailOf(phone, 'd'), f.pass);
    } catch (e) {
      done();
      U.ndErr = TK.authErr(e);
      return TK.render();
    }
    done();
    TK.update((s) => {
      const id = newId;
      const docStatus = {};
      TK.DOC_GROUPS.forEach((g) => (docStatus[g.key] = f.verified ? 'ok' : 'pending'));
      const rec = { ...f, id, phone, woman: f.gender === 'f', initial: f.name.slice(0, 1), emergencyPhone: TK.cleanPhone(f.emergencyPhone || ''),
        plateLetter: String(f.plateLetter || 'A').toUpperCase(), car: `${f.carMake} ${f.carModel} ${f.carColor}`.trim(), plate: `${f.plateCode} ${String(f.plateLetter || 'A').toUpperCase()} ${f.plateNo}`,
        plateType: 'taxi', status: f.verified ? 'active' : 'pending', docStatus, docReason: {}, kidsDriver: !!f.kids, childSeat: !!f.childseat, seats: +f.seats || 4, freeSeats: +f.seats || 4,
        online: false, rating: 0, reviews: 0, trips: 0, onTime: 100, tags: [], workDays: [], area: f.workAreas || '', joinedAt: Date.now(), termsAt: null, readNoticesAt: 0, addedByAdmin: true };
      delete rec.kids;
      delete rec.childseat;
      delete rec.verified;
      delete rec.pass;
      delete rec.pass2;
      rec.payAckFor = TK.payKey(rec); // بەڕێوەبەر خۆی شێوازی موچەی نووسیوە
      s.drivers.push(rec);
      TK.dnoticeAdd(s, { driverId: id, kind: 'ok', title: 'بەخێربێیت بۆ یەکسا', body: f.verified ? 'هەژمارەکەت چالاکە. «ئامادەی کارم» چالاک بکە بۆ وەرگرتنی داواکاری.' : 'تیمی یەکسا بەڵگەنامەکانت دەپشکنێت.', link: 'today' });
    });
    U.nd2 = null;
    TK.toast('شۆفێرەکە تۆمار کرا. ژمارە و وشەی نهێنی بدە پێی');
    TK.go('driver/' + newId, true);
  };
  /** وشەی نهێنی نوێ بۆ شۆفێرێک کە لەبیری چووە (پێویستی بە سێرڤەرە) */
  acts.resetDPass = () => noReset();

  TK.route('driver/:id', {
    guard,
    render({ id }) {
      const s = S();
      const d = sel.driver(id);
      if (!d) return layout('drivers', 'شۆفێر', ui.empty('car', 'نەدۆزرایەوە', ''));
      const po = TK.payout(s, d.id);
      const subs = s.subscriptions.filter((x) => x.driverId === d.id);
      const trips = s.trips.filter((t) => t.driverId === d.id || t.originalDriverId === d.id);
      const reps = s.reports.filter((r) => r.driverId === d.id);
      const ds = d.docStatus || {};
      const allOk = TK.DOC_GROUPS.every((g) => ds[g.key] === 'ok');
      const warn = expWarn(d);
      return layout('drivers', esc(d.name), `
        ${warn.map((e) => `<div class="card danger row">${icon('alert', 20)}<b class="grow">${e.days < 0 ? `${e.label} بەسەرچووە (${fmt.day(e.date)})` : `${e.label} ${e.days} ڕۆژی ماوە (${fmt.day(e.date)})`}</b>${d.status === 'active' ? `<button class="btn sm danger-solid" data-act="setDStatus" data-arg="${d.id}|suspended">ڕاگرتنی هەژمار</button>` : ''}</div>`).join('')}
        <div class="cols">
          <div class="card col">
            <div class="row">${ui.dAvatar(d, 72)}<div class="grow"><div class="h2">${esc(d.name)}</div><div class="sm muted">${esc(d.car)}${d.carYear ? `، ${d.carYear}` : ''}</div><div class="row wrap" style="gap:8px;margin-top:4px">${ui.plate(d.plate, d.plateType)}<span class="latin sm">${fmt.phone(d.phone)}</span></div></div>${ui.badge(STATUS[d.status][0], STATUS[d.status][1])}</div>
            <div class="row wrap" style="gap:6px">${ui.badge(d.woman ? 'شۆفێری مێ' : 'شۆفێری نێر', d.woman ? 'woman' : '')}${d.kidsDriver ? ui.badge('شۆفێری منداڵان', 'note') : ''}${d.childSeat ? ui.badge('کورسیی منداڵ', 'info') : ''}${ui.badge(`${d.seats || 4} کورسی`)}${d.addedByAdmin ? ui.badge('بەڕێوەبەر تۆماری کرد', 'info') : ''}</div>
            <div class="sm">${icon('pin', 14)} ${esc([(TK.city(d.city) || {}).name, d.district, d.neighborhood].filter(Boolean).join('، '))}${d.workAreas ? `<div class="xs muted">ناوچەی کار: ${esc(d.workAreas)}</div>` : ''}</div>
            <div class="card flat col tight">
              <b class="sm">جۆری تابلۆ</b>
              ${d.woman ? ui.seg('plateType', [{ v: 'taxi', l: 'تەکسی (سوور)' }, { v: 'private', l: 'تایبەت (سپی)' }].map((o) => ({ ...o, v: `${d.id}|${o.v}` })), `${d.id}|${d.plateType || 'taxi'}`) : `<div class="row sm">${ui.plate(d.plate, 'taxi')}<span class="muted">شۆفێری نێر تەنها تابلۆی تەکسی</span></div>`}
            </div>
            <div class="grid3"><div class="card stat flat"><b class="brand">★ ${d.reviews ? d.rating : '-'}</b><span class="xs muted">${d.reviews || 0} هەڵسەنگاندن</span></div><div class="card stat flat"><b>${d.trips || 0}</b><span class="xs muted">گەشت</span></div><div class="card stat flat"><b>${subs.length}</b><span class="xs muted">بەشداری</span></div></div>
            <div class="row between sm"><span class="muted">وەرگرتنی موچە</span><b>${PAY[d.payMethod] || '-'}${d.payAccount ? ` <span class="latin">${esc(d.payAccount)}</span>` : ''}</b></div>
            ${d.deleteRequestedAt ? `<div class="card danger col tight"><b class="sm">${icon('alert', 16)} شۆفێر داوای سڕینەوەی هەژمارەکەی کردووە، ${fmt.ago(d.deleteRequestedAt)}</b><span class="xs">سەرەتا سەرنشینەکانی بگوازەرەوە بۆ شۆفێرێکی تر و موچەکەی تەواو بکە، پاشان «سڕینەوە» لە خوارەوە دابگرە.</span></div>` : ''}
            ${payChanged(d) ? `<div class="card note col tight"><div class="row">${icon('alert', 18, 'var(--brand)')}<b class="grow sm">شۆفێر شێوازی موچەی گۆڕیوە${d.payChangedAt ? `، ${fmt.ago(d.payChangedAt)}` : ''}</b></div>
              <div class="xs">پێشتر: ${esc(PAY[(d.payPrev || {}).method] || '-')}${(d.payPrev || {}).account ? ` <span class="latin">${esc(d.payPrev.account)}</span>` : ''}. ئێستا: ${esc(PAY[d.payMethod] || '-')}${d.payAccount ? ` <span class="latin">${esc(d.payAccount)}</span>` : ''}</div>
              <div class="xs muted">پێش ناردنی موچە، بە تەلەفۆن لەگەڵ شۆفێر پشتڕاستی بکەرەوە کە خۆی گۆڕیویەتی.</div>
              <button class="btn sm ok" data-act="ackPay" data-arg="${d.id}">${icon('check', 16, 'currentColor', 2.4)}پشتڕاستم کردەوە</button></div>` : ''}
            <div class="row between sm"><span class="muted">تۆمارکراو</span><b>${fmt.date(d.joinedAt)}</b></div>
            <div class="row wrap" style="gap:8px">
              ${d.status !== 'active' ? `<button class="btn sm ok" data-act="setDStatus" data-arg="${d.id}|active" ${allOk ? '' : 'disabled'}>${icon('check', 16, 'currentColor', 2.4)}پشتڕاستکردنەوە و چالاککردن</button>` : ''}
              <button class="btn sm secondary" data-act="editDriver" data-arg="${d.id}">${icon('edit', 16)}دەستکاری</button>
              <button class="btn sm secondary" data-act="resetDPass" data-arg="${d.id}">${icon('lock', 16)}وشەی نهێنی نوێ</button>
              <button class="btn sm secondary" data-act="printDriver" data-arg="${d.id}">${icon('download', 16)}PDF و چاپ</button>
              <button class="btn sm secondary" data-act="ledgerForm" data-arg="${d.id}">${icon('wallet', 16)}سزا / پاداشت</button>
              <button class="btn sm secondary" data-act="msgDriver" data-arg="${d.id}">${icon('megaphone', 16)}ئاگادارکردنەوە</button>
            </div>
            ${d.status !== 'active' && !allOk ? '<div class="xs muted">بۆ چالاککردن، سەرەتا هەموو بەڵگەنامەکان پەسەند بکە.</div>' : ''}
            <div class="danger-zone">
              <span class="xs muted grow">کردارە مەترسیدارەکان</span>
              ${d.status === 'active' ? `<button class="btn sm danger" data-act="setDStatus" data-arg="${d.id}|suspended">ڕاگرتنی هەژمار</button>` : ''}
              <button class="btn sm danger" data-act="deleteDriver" data-arg="${d.id}">${icon('x', 16)}سڕینەوە</button>
            </div>
          </div>
          <div class="card col">
            <div class="h3">حیسابی ئەم مانگە</div>
            <div class="row between sm"><span class="muted">کۆی بەشدارییەکان</span><b>${fmt.money(po.gross)}</b></div>
            <div class="row between sm"><span class="muted">کۆمیسیۆن</span><b class="neg">${fmt.group(po.commission)}</b></div>
            ${po.entries.map((e) => `<div class="row between sm"><span class="muted">${esc(e.note)} <span class="xs">(${fmt.ago(e.at)})</span></span><span class="row" style="gap:6px"><b class="${e.amount < 0 ? 'neg' : 'ok'}">${fmt.group(Math.abs(e.amount))}</b><button class="icon-btn plain" style="width:28px;height:28px" data-act="delLedger" data-arg="${e.id}" aria-label="سڕینەوە">${icon('x', 14, 'var(--muted)')}</button></span></div>`).join('')}
            ${po.bonus ? `<div class="row between sm"><span class="muted">پاداشتی مانگانە</span><b class="ok">${fmt.group(po.bonus)}</b></div>` : ''}
            <div class="hr"></div>
            <div class="row between"><b>بۆ شۆفێر</b><b class="brand">${fmt.money(po.net)}</b></div>
            ${(s.routes || []).filter((r) => r.driverId === d.id).length ? `<div class="h3" style="margin-top:8px">ڕۆتەکان (تەکسی هاوبەش)</div>
            <div class="list">${(s.routes || []).filter((r) => r.driverId === d.id).sort((a, b) => a.time.localeCompare(b.time)).map((r) => `<div class="item"><div class="grow"><b class="sm">${esc(r.name)}</b><div class="xs muted">${r.dir === 'back' ? 'هاتنەوە' : 'چوون'}، ${fmt.clock(r.time)}، ${r.subIds.map((id) => (s.subscriptions.find((x) => x.id === id) || {}).riderNames).filter(Boolean).map(esc).join(' ← ')}</div></div>${ui.badge(`${r.subIds.length} بەشداری`, 'info')}</div>`).join('')}</div>` : ''}
            <div class="h3" style="margin-top:8px">گەشتەکانی ئەمڕۆ (${trips.length})</div>
            <div class="list">${trips.map((t) => `<div class="item"><div class="grow"><b class="sm">${esc(t.title)}</b><div class="xs muted">${fmt.clock(t.time)}${t.originalDriverId === d.id ? '، دراوە بە جێگرەوە' : t.originalDriverId ? '، جێگرەوە' : ''}</div></div>${ui.badge(TRIP_ST[t.status][0], TRIP_ST[t.status][1])}</div>`).join('') || '<div class="item sm muted">هیچ</div>'}</div>
            <div class="h3" style="margin-top:8px">ڕاپۆرتەکان (${reps.length})</div>
            <div class="list">${reps.map((r) => `<div class="item"><div class="grow"><b class="sm">شۆفێر نەهات</b><div class="xs muted">${esc(r.by)}، ${fmt.ago(r.at)}</div></div>${ui.badge(r.status === 'open' ? 'کراوە' : r.status === 'approved' ? 'پەسەند' : 'ڕەتکرایەوە', r.status === 'rejected' ? 'ok' : 'danger')}</div>`).join('') || '<div class="item sm muted">هیچ ڕاپۆرتێک نییە</div>'}</div>
          </div>
        </div>
        ${(d.showPhotos || []).length ? `<div class="h3">وێنەی ئۆتۆمبێل (سەرنشینەکان دەیبینن)</div>
        <div class="row wrap" style="gap:12px">${d.showPhotos.map((pid, i) => `<div class="col tight" style="width:220px"><img src="${TK.img(pid)}" alt="" style="width:220px;height:150px;object-fit:cover;border-radius:14px;border:1px solid var(--line);cursor:zoom-in" data-act="zoomImg" data-arg="${pid}|وێنەی ئۆتۆمبێل"><button class="btn sm danger" data-act="delShowPhoto" data-arg="${d.id}|${i}">${icon('x', 14)}سڕینەوە</button></div>`).join('')}</div>` : ''}
        <div class="h3">بەڵگەنامەکان و پشکنین</div>
        <div class="cards" style="grid-template-columns:repeat(auto-fill, minmax(360px, 1fr))">${TK.DOC_GROUPS.map((g) => {
          const st = ds[g.key] || 'pending';
          return `<div class="card col ${st === 'rejected' ? 'red-notice' : ''}">
            <div class="row"><div class="ico-box ${st === 'ok' ? 'ok' : st === 'rejected' ? 'danger' : ''}">${icon(g.icon, 18, st === 'ok' ? 'var(--ok-text)' : st === 'rejected' ? 'var(--danger-text)' : 'var(--brand)')}</div><b class="grow">${g.label}</b>${ui.badge(DST[st][0], DST[st][1])}</div>
            ${groupInfo(d, g.key)}
            ${st === 'rejected' && d.docReason[g.key] ? `<div class="sm" style="color:var(--danger-text)">هۆکار: ${esc(d.docReason[g.key])}</div>` : ''}
            <div class="row" style="gap:8px">
              ${st !== 'ok' ? `<button class="btn sm ok grow" data-act="docOk" data-arg="${d.id}|${g.key}">${icon('check', 16, 'currentColor', 2.4)}پەسەندکردن</button>` : ''}
              ${st !== 'rejected' ? `<button class="btn sm danger grow" data-act="docNo" data-arg="${d.id}|${g.key}">ڕەتکردنەوە</button>` : ''}
            </div>
          </div>`;
        }).join('')}</div>`, `<button class="btn sm ghost" data-go="drivers">${icon('back', 16)}گەڕانەوە</button>`);
    },
  });
  acts.zoomImg = (arg) => {
    const [id, label] = arg.split('|');
    TK.sheet(() => `<div class="h3">${esc(label)}</div><img src="${TK.img(id)}" alt="" style="width:100%;border-radius:12px"><button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.plateType = (arg) => {
    const [id, type] = arg.split('|');
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      d.plateType = d.woman ? type : 'taxi'; // شۆفێری نێر تەنها تەکسی
    });
    TK.toast(type === 'private' ? 'تابلۆی تایبەت (سپی)' : 'تابلۆی تەکسی (سوور)');
  };
  acts.docOk = (arg) => {
    const [id, key] = arg.split('|');
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      d.docStatus[key] = 'ok';
      delete d.docReason[key];
      const g = TK.DOC_GROUPS.find((x) => x.key === key);
      pushDN(s, { driverId: id, kind: 'ok', title: `${g.label} پەسەند کرا`, body: TK.DOC_GROUPS.every((x) => d.docStatus[x.key] === 'ok') ? 'هەموو بەڵگەنامەکانت پەسەند کران' : 'چاوەڕێی پشکنینی ئەوانی ترە', link: 'profile' });
    });
  };
  acts.docNo = (arg) => {
    const [id, key] = arg.split('|');
    const g = TK.DOC_GROUPS.find((x) => x.key === key);
    TK.sheet(() => `<div class="h2">ڕەتکردنەوەی ${g.label}</div>
      <div class="sm muted">هۆکارەکە بۆ شۆفێر دەردەکەوێت تا بزانێت چی بگۆڕێت.</div>
      <div class="chips">${['وێنەکە ڕوون نییە', 'بەڵگەنامەکە بەسەرچووە', 'زانیارییەکان لەگەڵ وێنەکە ناگونجێن', 'وێنەکە هی ئەم بەڵگەنامەیە نییە'].map((x) => `<button class="chip" data-act="reasonPreset" data-arg="${x}">${x}</button>`).join('')}</div>
      ${input('rej-why', 'هۆکار', '', { area: true, full: true })}
      <button class="btn danger-solid block" data-act="saveDocNo" data-arg="${arg}">ڕەتکردنەوە و ئاگادارکردنەوەی شۆفێر</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.reasonPreset = (x) => {
    document.getElementById('rej-why').value = x;
  };
  acts.saveDocNo = (arg) => {
    const [id, key] = arg.split('|');
    const why = String(val('rej-why')).trim();
    if (why.length < 3) return TK.toast('هۆکارەکە بنووسە');
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      d.docStatus[key] = 'rejected';
      d.docReason[key] = why;
      if (d.status === 'active') d.online = false;
      const g = TK.DOC_GROUPS.find((x) => x.key === key);
      pushDN(s, { driverId: id, kind: 'info', red: true, title: `${g.label} ڕەتکرایەوە`, body: why, link: 'profile' });
    });
    TK.closeSheet();
    TK.toast('ڕەتکرایەوە و شۆفێر ئاگادار کرایەوە');
  };
  acts.setDStatus = async (arg) => {
    const [id, st] = arg.split('|');
    if (st === 'suspended' && !(await TK.ask('هەژمارەکە ڕادەگیرێت و شۆفێر ناتوانێت داواکاری وەربگرێت. گەشتە بەردەوامەکان دەمێننەوە.', { yes: 'ڕاگرتن' }))) return;
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      d.status = st;
      if (st !== 'active') d.online = false;
      // لە کاتی پشتڕاستکردنەوەی هەژمار، شێوازی موچەی ئێستاش پشتڕاست دەکرێتەوە
      if (st === 'active' && d.payAckFor == null) d.payAckFor = TK.payKey(d);
      pushDN(s, { driverId: id, kind: st === 'active' ? 'ok' : 'info', red: st !== 'active', title: st === 'active' ? 'هەژمارەکەت پشتڕاست کرایەوە' : 'هەژمارەکەت ڕاگیرا', body: st === 'active' ? 'بەخێربێیت! ئێستا دەتوانیت «ئامادەی کارم» چالاک بکەیت و داواکاری وەربگریت' : 'بۆ زانیاری زیاتر پەیوەندی بە تیمی یەکسا بکە', link: 'today' });
    });
    TK.toast(st === 'active' ? 'شۆفێر چالاک کرا' : 'شۆفێر ڕاگیرا');
  };
  /** PDF: پەڕەیەکی ڕێکخراو بە هەموو زانیاری و وێنەکانی شۆفێر */
  acts.printDriver = (id) => {
    const d = sel.driver(id);
    const base = location.href.replace(/#.*$/, '').replace(/admin\/?(index\.html)?$/, '');
    const img = (k, l) => (TK.img(d[k]) ? `<figure><img src="${TK.img(d[k])}"><figcaption>${l}</figcaption></figure>` : '');
    const r = (l, v) => `<tr><th>${l}</th><td>${v || '-'}</td></tr>`;
    const ds = d.docStatus || {};
    const w = window.open('', '_blank');
    if (!w) return TK.toast('ڕێگە بە کردنەوەی پەنجەرەی نوێ بدە');
    const html = `<!doctype html><html lang="ckb" dir="rtl"><head><meta charset="utf-8"><title>${esc(d.name)}، یەکسا</title>
      <style>@font-face{font-family:"Noto Naskh Arabic";src:url("${base}shared/fonts/NotoNaskhArabic.woff2") format("woff2");font-weight:400 700}
      body{font-family:"Noto Naskh Arabic",Tahoma,sans-serif;color:#13254A;margin:0;padding:28px;font-size:14px}
      header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #F5A623;padding-bottom:14px;margin-bottom:14px}
      header img.ph{width:110px;height:110px;object-fit:cover;border-radius:14px;border:1px solid #DCE3EE}
      h1{margin:0;font-size:22px}h2{font-size:16px;margin:18px 0 6px;border-right:4px solid #F5A623;padding-right:8px}
      table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #E6ECF5;padding:6px 8px;text-align:right;vertical-align:top}th{width:32%;color:#5B6B88;font-weight:700}
      .latin{direction:ltr;unicode-bidi:isolate;font-family:Arial,sans-serif}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}figure{margin:0;border:1px solid #DCE3EE;border-radius:10px;overflow:hidden;break-inside:avoid}figure img{width:100%;height:150px;object-fit:cover;display:block}figcaption{padding:4px 8px;font-size:12px;background:#F4F6FA}
      .st{display:inline-block;padding:0 10px;border-radius:99px;font-weight:700;font-size:12px}.ok{background:#DCFCE7;color:#166534}.no{background:#FDE2E2;color:#9B1C1C}.pe{background:#FFF6E5;color:#9A5B00}
      footer{margin-top:20px;font-size:11px;color:#5B6B88;border-top:1px solid #DCE3EE;padding-top:8px}
      @media print{body{padding:10mm}h2{break-after:avoid}}</style></head><body>
      <header>${TK.img(d.photo) ? `<img class="ph" src="${TK.img(d.photo)}">` : ''}<div><h1>${esc(d.name)}</h1><div>شۆفێری یەکسا، ${d.woman ? 'مێ' : 'نێر'}، ${STATUS[d.status][0]}</div><div class="latin">${fmt.phone(d.phone)}</div></div></header>
      <h2>زانیاری کەسی</h2><table>${r('ڕۆژی لەدایکبوون', d.birth ? `${fmt.day(d.birth)} (${TK.age(d.birth)} ساڵ)` : '')}${r('ناونیشان', esc(`${(TK.city(d.city) || {}).name || ''}، ${d.district || ''}، ${d.neighborhood || ''}${d.landmark ? '، ' + d.landmark : ''}`))}${r('فریاکەوتن', `${esc(d.emergencyName || '')} <span class="latin">${fmt.phone(d.emergencyPhone || '')}</span>`)}${r('ناوچەی کار', esc(d.workAreas || ''))}${r('وەرگرتنی موچە', `${PAY[d.payMethod] || ''} <span class="latin">${esc(d.payAccount || '')}</span>`)}${r('تۆمارکراو', fmt.date(d.joinedAt))}</table>
      <h2>بەڵگەنامەکان</h2><table>
        ${r('کارتی نیشتمانی', `<span class="latin">${esc(d.idNo || '')}</span>، بەسەرچوون ${d.idExpiry ? fmt.day(d.idExpiry) : '-'}`)}
        ${r('مۆڵەتی شۆفێری', `<span class="latin">${esc(d.licNo || '')}</span>، ${esc(d.licClass || '')}، بەسەرچوون ${d.licExpiry ? fmt.day(d.licExpiry) : '-'}`)}
        ${r('ئۆتۆمبێل', esc(`${d.carMake || ''} ${d.carModel || ''}، ${d.carYear || ''}، ${d.carColor || ''}، ${d.seats || ''} کورسی`))}
        ${r('تابلۆ', `<span class="latin">${esc(d.plate || '')}</span>، ${d.plateType === 'private' ? 'تایبەت (سپی)' : 'تەکسی (سوور)'}`)}
        ${r('ساڵانە', `<span class="latin">${esc(d.regNo || '')}</span>، بەسەرچوون ${d.regExpiry ? fmt.day(d.regExpiry) : '-'}`)}
        ${r('کۆدی ئاسایش', d.secDate ? fmt.day(d.secDate) : '-')}
      </table>
      <h2>دۆخی پشکنین</h2><table>${TK.DOC_GROUPS.map((g) => r(g.label, `<span class="st ${ds[g.key] === 'ok' ? 'ok' : ds[g.key] === 'rejected' ? 'no' : 'pe'}">${DST[ds[g.key] || 'pending'][0]}</span>${d.docReason && d.docReason[g.key] ? ` ${esc(d.docReason[g.key])}` : ''}`)).join('')}</table>
      <h2>وێنەکان</h2><div class="grid">${Object.keys(TK.PHOTO_LABELS).filter((k) => k !== 'photo').map((k) => img(k, TK.PHOTO_LABELS[k])).join('')}</div>
      <footer>دەرکراو لە پانێڵی بەڕێوەبردنی یەکسا، ${fmt.date(Date.now())}. ئەم پەڕەیە زانیاری کەسی تێدایە، بە پارێزراوی هەڵیبگرە.</footer>
      <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    w.document.write(html);
    w.document.close();
    // ژمارەکان بە کوردی، جگە لە ژمارەی مۆبایل، تابلۆ و ژمارەی بەڵگەنامەکان (.latin)
    if (S().settings.digits !== 'en') {
      const tw = w.document.createTreeWalker(w.document.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.parentElement.closest('.latin, script, style')) n.nodeValue = n.nodeValue.replace(/[0-9]/g, (x) => '٠١٢٣٤٥٦٧٨٩'[x]);
      }
    }
  };
  /** ڕاستکردنەوەی هەڵەی نووسین لە زانیارییە سەرەکییەکان (وێنەکان تەنها شۆفێر خۆی دەیانگۆڕێت) */
  /** ئەدمین وێنەیەکی ئۆتۆمبێل دەسڕێتەوە (بۆ نموونە وێنەی نەشیاو) */
  acts.delShowPhoto = async (arg) => {
    const [id, i] = arg.split('|');
    if (!(await TK.ask('ئەم وێنەیە لە پرۆفایلی شۆفێر دەسڕدرێتەوە و شۆفێر ئاگادار دەکرێتەوە.', { yes: 'سڕینەوە' }))) return;
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      if (!d || !d.showPhotos) return;
      const [gone] = d.showPhotos.splice(+i, 1);
      if (gone) TK.removeImage(gone);
      TK.dnoticeAdd(s, { driverId: id, kind: 'info', red: true, title: 'وێنەیەکی ئۆتۆمبێلەکەت لابرا', body: 'لەلایەن تیمی یەکساوە. دەتوانیت وێنەیەکی گونجاوتر دابنێیت', link: 'profile' });
    });
    TK.toast('سڕایەوە');
  };
  acts.editDriver = (id) => {
    const d = sel.driver(id);
    TK.sheet(() => `<div class="h2">دەستکاری ${esc(d.name)}</div>
      <div class="sm muted">بۆ ڕاستکردنەوەی هەڵەی نووسین. وێنەی بەڵگەنامەکان تەنها شۆفێر خۆی لە ئەپەکەیەوە دەیانگۆڕێت.</div>
      <div class="form-grid">
        ${input('e-name', 'ناوی سیانی', d.name, { full: true })}
        ${input('e-phone', 'ژمارەی مۆبایل (ناگۆڕدرێت، بۆ چوونەژوورەوەیە)', d.phone, { ltr: true, attrs: 'readonly' })}
        ${input('e-seats', 'ژمارەی کورسی', d.seats, { type: 'number', ltr: true })}
        ${input('e-make', 'جۆری ئۆتۆمبێل', d.carMake || '')}
        ${input('e-model', 'مۆدێل', d.carModel || '')}
        ${input('e-year', 'ساڵ', d.carYear || '', { type: 'number', ltr: true })}
        ${input('e-color', 'ڕەنگ', d.carColor || '')}
        ${input('e-plate', 'ژمارەی تابلۆ', d.plate || '', { ltr: true, full: true })}
      </div>
      <button class="btn block" data-act="saveDriver" data-arg="${id}">پاشەکەوت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveDriver = (id) => {
    const name = String(val('e-name')).trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 3) return TK.toast('ناوی سیانی بنووسە');
    TK.update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      Object.assign(d, { name, seats: Math.max(1, Math.min(8, num('e-seats') || d.seats)), carMake: val('e-make').trim(), carModel: val('e-model').trim(), carYear: num('e-year') || d.carYear, carColor: val('e-color').trim(), plate: val('e-plate').trim() || d.plate });
      d.car = `${d.carMake} ${d.carModel} ${d.carColor}`.trim();
      d.initial = name.slice(0, 1);
    });
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };
  acts.deleteDriver = async (id) => {
    const s = S();
    if (s.subscriptions.some((x) => x.driverId === id) || id === s.driver.meId) return TK.toast('ئەم شۆفێرە سەرنشینی چالاکی هەیە. لە جیاتی سڕینەوە ڕایبگرە');
    if (!(await TK.ask('شۆفێرەکە بە تەواوی دەسڕدرێتەوە: زانیارییەکانی، بەڵگەنامە و وێنەکانی.'))) return;
    const d0 = sel.driver(id) || {};
    // وێنە و بەڵگەنامەکانی شۆفێر
    const imgs = ['photo', 'idFront', 'idBack', 'licFront', 'licBack', 'regPhoto', 'secPhoto', 'carFront', 'carBack', 'carLeft', 'carRight', 'carInside'].map((k) => d0[k]).concat(d0.showPhotos || []).filter((v) => v && !String(v).startsWith('data:'));
    imgs.forEach((img) => Promise.resolve(window.TKFB.write({ op: 'delete', path: 'img/' + img })).catch(() => {}));
    TK.update((x) => {
      x.drivers = x.drivers.filter((d) => d.id !== id);
    });
    TK.go('drivers', true);
    // هەژماری چوونەژوورەوە تەنها لە Firebase Console دەسڕدرێتەوە (بەبێ Cloud Functions)
    TK.sheet(() => `<div class="h2">شۆفێرەکە سڕایەوە</div>
      <div class="sm" style="line-height:1.9">بۆ تەواوکردن، هەژماری چوونەژوورەوەکەی لە Firebase بسڕەوە:<br>Firebase Console ← Authentication ← Users ← بگەڕێ بۆ:<br><b class="latin" data-raw>${esc(TK.emailOf(d0.phone || '', 'd'))}</b> ← Delete account</div>
      <button class="btn block" data-act="copy" data-arg="${esc(TK.emailOf(d0.phone || '', 'd'))}">${icon('copy', 16)}کۆپیکردنی ئیمەیڵەکە</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.ledgerForm = (id) => {
    TK.sheet(() => `<div class="h2">سزا، پاداشت یان ڕێکخستن</div>
      <div class="sm muted">${esc(sel.driver(id).name)}، لە حیسابی ئەم مانگەی زیاد دەکرێت و ئاگادار دەکرێتەوە.</div>
      <div class="form-grid">
        ${select('l-type', 'جۆر', 'penalty', [['penalty', 'سزا (کەمکردنەوە)'], ['bonus', 'پاداشت (زیادکردن)'], ['adjust', 'ڕێکخستنی دەستی']])}
        ${input('l-amount', 'بڕ (دینار)', '5000', { type: 'number', ltr: true })}
        ${input('l-note', 'هۆکار', '', { full: true, ph: 'بۆ نموونە: دواکەوتنی ٢٠ خولەک' })}
      </div>
      <button class="btn block" data-act="saveLedger" data-arg="${id}">تۆمارکردن</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveLedger = (id) => {
    const type = val('l-type');
    let amount = Math.abs(num('l-amount'));
    const note = val('l-note').trim() || (type === 'penalty' ? 'سزا' : 'پاداشت');
    if (!amount) return TK.toast('بڕەکە بنووسە');
    if (type === 'penalty') amount = -amount;
    TK.update((s) => {
      TK.ledgerAdd(s, id, type, amount, note);
      pushDN(s, { driverId: id, kind: amount < 0 ? 'info' : 'ok', title: amount < 0 ? 'سزا لە حیسابەکەت' : 'پاداشت بۆ حیسابەکەت', body: `${note}، ${amount < 0 ? '-' : '+'}${fmt.money(Math.abs(amount))}`, link: 'earnings' });
    });
    TK.closeSheet();
    TK.toast('تۆمار کرا');
  };
  acts.delLedger = async (id) => {
    if (!(await TK.ask('ئەم تۆمارە دەسڕدرێتەوە؟'))) return;
    TK.update((s) => {
      s.ledger = s.ledger.filter((e) => e.id !== id);
    });
  };
  acts.msgDriver = (id) => broadcastForm('one', id);

  /* =========================================================
   * سەرنشینەکان
   * ======================================================= */
  /** خاوەنی تۆمارەکان بۆ ژمارەیەک (UIDـی هەژمارەکەی لە Firebase) */
  const ownerOf = (s, phone) => {
    const a = s.accounts.find((x) => x.phone === phone);
    return a ? a.uid : phone;
  };
  const acctSlice = (s, phone) => TK.pslice(s, ownerOf(s, phone));
  TK.route('passengers', {
    guard,
    render() {
      const s = S();
      const q = TK.normalize(U.pq || '');
      const list = s.accounts.filter((a) => !q || TK.normalize(`${a.name} ${a.phone}`).includes(q));
      return layout('passengers', 'سەرنشینەکان', `
        <div class="row wrap" style="gap:8px"><div class="sm muted grow">${s.accounts.length} ئەکاونت</div><input class="input" style="max-width:280px;min-height:42px" placeholder="گەڕان: ناو یان ژمارە" value="${esc(U.pq || '')}" data-input="pq"></div>
        ${list.length ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>ناو</th><th>ژمارە</th><th>شار</th><th>تۆمارکراو</th><th>هاوبەش</th><th>بەشداری</th><th>فاتورەی ئەم مانگە</th><th>دۆخ</th></tr></thead>
          <tbody>${list.map((a) => {
            const owner = ownerOf(s, a.phone);
            const ps = TK.pslice(s, owner) || {};
            const subs = s.subscriptions.filter((x) => (x.owner || 'me') === owner);
            const inv = TK.invoice(s, owner);
            const paid = ps.billing && ps.billing.paid;
            return `<tr class="tap" data-go="passenger/${a.phone}">
              <td><b>${esc(a.name)}</b>${owner === 'me' && s.passenger.loggedIn ? '<div class="xs brand">ئێستا لە ئەپی سەرنشین چوونەتەژوورەوە</div>' : ''}</td>
              <td class="latin sm">${fmt.phone(a.phone)}</td>
              <td class="sm">${esc((TK.city((ps.passenger || {}).city || a.city) || {}).name || '-')}</td>
              <td class="sm">${a.createdAt ? fmt.ago(a.createdAt) : '-'}</td>
              <td class="sm">${a.partnerId && TK.partner(a.partnerId) ? esc(TK.partner(a.partnerId).name) : '<span class="muted">-</span>'}</td>
              <td>${subs.length}</td>
              <td>${inv.total ? `<b>${fmt.money(inv.total)}</b> ${paid ? ui.badge('دراوە', 'ok') : ''}` : '<span class="muted">-</span>'}</td>
              <td>${a.blocked ? ui.badge('ڕاگیراو', 'danger') : ui.badge('چالاک', 'ok')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : ui.empty('user', s.accounts.length ? 'هیچ ئەکاونتێک نەدۆزرایەوە' : 'هێشتا هیچ سەرنشینێک تۆمار نەکردووە', s.accounts.length ? '' : 'سەرنشینەکان لە ئەپی سەرنشینەوە خۆیان تۆمار دەکەن')}`);
    },
  });
  acts.pq = (v) => {
    U.pq = v;
    clearTimeout(U.pqT);
    U.pqT = setTimeout(() => TK.render(), 350);
  };
  TK.route('passenger/:phone', {
    guard,
    render({ phone }) {
      const s = S();
      const a = s.accounts.find((x) => x.phone === phone);
      if (!a) return layout('passengers', 'سەرنشین', ui.empty('user', 'نەدۆزرایەوە', ''));
      const owner = ownerOf(s, phone);
      const ps = TK.pslice(s, owner) || TK.pslice(s, 'me');
      const subs = s.subscriptions.filter((x) => (x.owner || 'me') === owner);
      const inv = TK.invoice(s, owner);
      const b = ps.billing || {};
      const tickets = (ps.tickets || []);
      const fam = ps.family || { members: [], guardians: [] };
      const p = ps.passenger || {};
      return layout('passengers', esc(a.name), `
        <div class="cols">
          <div class="card col">
            <div class="row">${ui.avatar(a.name.slice(0, 1), '', 56)}<div class="grow"><div class="h2">${esc(a.name)}</div><div class="latin sm">${fmt.phone(a.phone)}</div></div>${a.blocked ? ui.badge('ڕاگیراو', 'danger') : ui.badge('چالاک', 'ok')}</div>
            <div class="row between sm"><span class="muted">شار</span><b>${esc((TK.city(p.city) || {}).name || '-')}</b></div>
            <div class="row between sm"><span class="muted">ماڵ</span><b>${p.homeId && TK.place(p.homeId) ? esc(TK.place(p.homeId).name) : '-'}</b></div>
            <div class="row between sm"><span class="muted">تۆمارکراو</span><b>${a.createdAt ? fmt.date(a.createdAt) : '-'}</b></div>
            <div class="row between sm"><span class="muted">ژمارە بۆ شۆفێر</span><b>شاراوەیە</b></div>
            <div class="row between sm"><span class="muted">هاوبەش</span><b>${a.partnerId && TK.partner(a.partnerId) ? `<a class="link" href="#/partner/${a.partnerId}">${esc(TK.partner(a.partnerId).name)}</a>` : '-'}</b></div>
            ${a.partnerNote ? `<div class="xs muted">${esc(a.partnerNote)}</div>` : ''}
            <div class="row wrap" style="gap:8px">
              <button class="btn sm secondary" data-act="assignPartner" data-arg="${a.phone}">${icon('edit', 16)}هاوبەش</button>
              <button class="btn sm secondary" data-act="resetPass" data-arg="${a.phone}">وشەی نهێنی نوێ</button>
              <button class="btn sm ${a.blocked ? 'ok' : 'danger'}" data-act="blockAcc" data-arg="${a.phone}">${a.blocked ? 'چالاککردنەوە' : 'ڕاگرتنی ئەکاونت'}</button>
            </div>
            <div class="h3" style="margin-top:6px">ئەندامانی خێزان (${fam.members.length})</div>
            <div class="list">${fam.members.map((m) => `<div class="item">${ui.avatar(m.initial, m.kind === 'child' ? 'amber' : m.woman ? 'woman' : '', 36)}<div class="grow"><b class="sm">${esc(m.name)}</b><div class="xs muted">${esc(m.relation || '')}${m.age ? '، ' + m.age + ' ساڵ' : ''}</div></div></div>`).join('') || '<div class="item sm muted">هیچ</div>'}</div>
            <div class="h3">بەشدارییەکان (${subs.length})</div>
            <div class="list">${subs.map((x) => { const d = sel.driver(x.driverId) || {}; return `<div class="item tap" data-act="editSub" data-arg="${x.id}"><div class="grow"><b class="sm">${esc(x.riderNames || '')}</b><div class="xs muted">${esc(d.name || '')}، ${fmt.money(x.price)}</div></div>${x.status === 'paused' ? ui.badge('ڕاگیراو', 'note') : ui.badge('چالاک', 'ok')}</div>`; }).join('') || '<div class="item sm muted">هیچ بەشدارییەک نییە</div>'}</div>
          </div>
          <div class="card col">
            <div class="row between"><div class="h3">فاتورەی ${esc(b.month || '')}</div>${b.paid ? ui.badge('دراوە', 'ok') : inv.total ? ui.badge('نەدراوە', 'note') : ''}</div>
            ${inv.lines.map((l) => `<div class="row between sm"><span>${esc(l.label)}${l.note ? ` <span class="xs muted">(${esc(l.note)})</span>` : ''}</span><b>${fmt.group(l.amount)}</b></div>`).join('') || '<div class="sm muted">هیچ</div>'}
            ${inv.promo ? `<div class="row between sm"><span class="muted">داشکاندن (${esc(b.promo.code)})</span><b class="neg">${fmt.group(inv.promo)}</b></div>` : ''}
            ${inv.credit ? `<div class="row between sm"><span class="muted">قەرەبوو</span><b class="neg">${fmt.group(inv.credit)}</b></div>` : ''}
            <div class="hr"></div>
            <div class="row between"><b>کۆی گشتی</b><b class="brand">${fmt.money(inv.total)}</b></div>
            ${!b.paid && inv.total ? `<button class="btn sm ok" data-act="markPaid" data-arg="${a.phone}">${icon('check', 16, 'currentColor', 2.4)}تۆمارکردنی پارەدان (کاش)</button>` : ''}
            <div class="row between" style="margin-top:6px"><div class="h3">قەرەبوو</div><button class="btn sm secondary" data-act="creditForm" data-arg="${a.phone}">${icon('plus', 16)}قەرەبوو</button></div>
            ${(b.adjustments || []).map((x) => `<div class="row between sm"><span>${esc(x.note)}</span><span class="row" style="gap:6px"><b class="ok">${fmt.group(x.amount)}</b><button class="icon-btn plain" style="width:28px;height:28px" data-act="delAdj" data-arg="${a.phone}|${x.id}" aria-label="سڕینەوە">${icon('x', 14, 'var(--muted)')}</button></span></div>`).join('') || '<div class="sm muted">هیچ قەرەبوویەک نییە</div>'}
            <div class="row between sm" style="margin-top:6px"><span class="muted">خاڵی پاداشت</span><span class="row" style="gap:6px"><b>${(ps.rewards || {}).points || 0}</b><button class="btn sm ghost" data-act="pointsForm" data-arg="${a.phone}">گۆڕین</button></span></div>
            <div class="h3" style="margin-top:6px">مێژووی پارەدان</div>
            <div class="list">${(b.history || []).map((h) => `<div class="item"><div class="grow"><b class="sm">${esc(h.month)}</b><div class="xs muted">${fmt.date(h.at)}</div></div><b>${fmt.money(h.total)}</b></div>`).join('') || '<div class="item sm muted">هیچ</div>'}</div>
            <div class="h3">داواکاری پشتگیری (${tickets.length})</div>
            <div class="list">${tickets.map((t) => `<div class="item"><div class="grow"><b class="sm">${esc(t.subject)}</b><div class="xs muted">#${t.id}، ${fmt.ago(t.at)}</div></div>${t.status === 'open' ? ui.badge('کراوە', 'note') : ui.badge('وەڵامدراوە', 'ok')}</div>`).join('') || '<div class="item sm muted">هیچ</div>'}</div>
          </div>
        </div>`, `<button class="btn sm ghost" data-go="passengers">${icon('back', 16)}گەڕانەوە</button>`);
    },
  });
  /** دیاریکردنی هاوبەش بۆ سەرنشینێک بە دەست (بۆ نموونە ئەگەر کۆدەکەی لەبیر چووبێت) */
  acts.assignPartner = (phone) => {
    const a = S().accounts.find((x) => x.phone === phone);
    TK.sheet(() => `<div class="h2">هاوبەشی ${esc(a.name)}</div>
      <div class="sm muted">تەنها ئەدمین دەتوانێت هاوبەشی سەرنشینێک بگۆڕێت. پشکی مانگەکانی پێشوو ناگۆڕێت.</div>
      ${select('ap-partner', 'هاوبەش', a.partnerId || '', [['', 'هیچ']].concat((S().partners || []).map((p) => [p.id, `${p.name} (${p.code})`])))}
      ${input('ap-why', 'هۆکار', '', { ph: 'بۆ نموونە: کۆدەکەی لەبیر چوو' })}
      <button class="btn block" data-act="saveAssign" data-arg="${phone}">پاشەکەوت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveAssign = (phone) => {
    const pid = val('ap-partner') || null;
    const why = val('ap-why');
    TK.update((s) => {
      const a = s.accounts.find((x) => x.phone === phone);
      a.partnerId = pid;
      a.partnerNote = why ? `${why} (${fmt.date(Date.now())})` : '';
    });
    TK.closeSheet();
    TK.toast('هاوبەش نوێ کرایەوە');
  };
  acts.blockAcc = async (phone) => {
    const a = S().accounts.find((x) => x.phone === phone);
    if (!a.blocked && !(await TK.ask(`${a.name} ناتوانێت بچێتە ژوورەوە تا چالاکی دەکەیتەوە.`, { yes: 'ڕاگرتن' }))) return;
    TK.update((s) => {
      const x = s.accounts.find((y) => y.phone === phone);
      x.blocked = !x.blocked;
      if (x.blocked && s.passenger.phone === phone) s.passenger.loggedIn = false;
    });
    TK.toast('نوێ کرایەوە');
  };
  /** گۆڕینی وشەی نهێنی کەسێکی تر پێویستی بە سێرڤەرە (Cloud Functions، پلانی Blaze) */
  const noReset = () => TK.sheet(() => `<div class="h2">وشەی نهێنی نوێ</div>
      <div class="sm muted" style="line-height:1.9">لەم وەشانەدا وشەی نهێنی تەنها لەلایەن خاوەنەکەیەوە دەگۆڕدرێت (لە ڕێکخستنەکانی ئەپەکەی). گۆڕینی وشەی نهێنی کەسێکی تر لەلایەن بەڕێوەبەرەوە پێویستی بە سێرڤەر هەیە (Cloud Functions)، کە دواتر زیاد دەکرێت.</div>
      <button class="btn ghost block" data-close>باشە</button>`);
  acts.resetPass = noReset;
  acts.creditForm = (phone) => {
    TK.sheet(() => `<div class="h2">قەرەبووی سەرنشین</div>
      <div class="sm muted">لە فاتورەی ئەم مانگەی کەم دەکرێتەوە و ئاگادار دەکرێتەوە.</div>
      <div class="form-grid">${input('c-amount', 'بڕ (دینار)', '', { type: 'number', ltr: true })}${input('c-note', 'هۆکار', '', { ph: 'بۆ نموونە: دواکەوتنی شۆفێر' })}</div>
      <button class="btn block" data-act="saveCredit" data-arg="${phone}">زیادکردن</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveCredit = (phone) => {
    const amount = Math.abs(num('c-amount'));
    if (!amount) return TK.toast('بڕەکە بنووسە');
    const note = val('c-note').trim() || 'قەرەبوو لەلایەن یەکسا';
    TK.update((s) => {
      const owner = ownerOf(s, phone);
      TK.pslice(s, owner).billing.adjustments.push({ id: 'a' + TK.uid(), amount, note, at: Date.now() });
      pushN(s, { kind: 'pay', title: 'قەرەبوو بۆ فاتورەکەت', body: `${note}، ${fmt.money(amount)}`, link: 'billing' }, owner);
    });
    TK.closeSheet();
    TK.toast('زیاد کرا');
  };
  acts.delAdj = (arg) => {
    const [phone, id] = arg.split('|');
    TK.update((s) => {
      const b = acctSlice(s, phone).billing;
      b.adjustments = b.adjustments.filter((a) => a.id !== id);
    });
  };
  acts.pointsForm = (phone) => {
    const ps = acctSlice(S(), phone);
    TK.sheet(() => `<div class="h2">خاڵی پاداشت</div>${input('pt-n', 'ژمارەی خاڵ', String(ps.rewards.points), { type: 'number', ltr: true, full: true })}
      <button class="btn block" data-act="savePoints" data-arg="${phone}">پاشەکەوت</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.savePoints = (phone) => {
    const n = num('pt-n');
    TK.update((s) => {
      acctSlice(s, phone).rewards.points = Math.max(0, Math.round(n));
    });
    TK.closeSheet();
  };

  /* =========================================================
   * بەشداری و داواکاری
   * ======================================================= */
  TK.route('subs', {
    guard,
    render() {
      const s = S();
      const tab = U.stab || 'subs';
      const driverOpts = s.drivers.filter((d) => d.status === 'active').map((d) => [d.id, d.name]);
      const subsHtml = !s.subscriptions.length ? ui.empty('calendar', 'هێشتا هیچ بەشدارییەک نییە', '') : `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>سەرنشین</th><th>ڕێگا</th><th>کات</th><th>ڕۆژ</th><th>شۆفێر</th><th>نرخ</th><th>دۆخ</th><th></th></tr></thead>
        <tbody>${s.subscriptions.map((x) => `<tr>
          <td><b class="sm">${esc(x.riderNames || '')}</b><div class="xs muted">${esc(sel.peerName(x.owner || 'me'))}</div></td>
          <td class="sm">${esc(x.from)} ← ${esc(x.to)}</td>
          <td class="sm">${fmt.schedule(x)}</td>
          <td class="xs">${fmt.days(x.days)}</td>
          <td class="sm">${esc((sel.driver(x.driverId) || {}).name || '')}</td>
          <td class="sm">${fmt.group(x.price)}</td>
          <td>${x.status === 'paused' ? ui.badge('ڕاگیراو', 'danger') : ui.badge('چالاک', 'ok')}</td>
          <td><button class="btn sm secondary" data-act="editSub" data-arg="${x.id}">${icon('edit', 14)}</button></td>
        </tr>`).join('')}</tbody></table></div>`;
      const reqs = s.requests.slice().sort((a, b) => b.createdAt - a.createdAt);
      const reqHtml = !reqs.length ? ui.empty('doc', 'هیچ داواکارییەک نییە', '') : `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>داواکار</th><th>ڕێگا</th><th>کات</th><th>جۆر</th><th>نرخ</th><th>نرخەکان</th><th>دۆخ</th><th></th></tr></thead>
        <tbody>${reqs.map((r) => `<tr>
          <td><b class="sm">${esc(r.ownerName)}</b><div class="xs muted">${esc(r.riderNames)}، ${fmt.ago(r.createdAt)}</div></td>
          <td class="sm">${esc(r.from)} ← ${esc(r.to)}</td>
          <td class="sm">${fmt.schedule(r)}</td>
          <td>${ui.requestTags(r)}</td>
          <td class="sm">${fmt.group(r.price)}</td>
          <td class="xs">${r.offers.map((o) => `${esc((sel.driver(o.driverId) || {}).name || '')}: ${fmt.group(o.price)}`).join('<br>') || '-'}</td>
          <td>${ui.badge(r.status === 'open' ? (r.target === 'all' ? 'بڵاوکراوە' : 'ڕاستەوخۆ') : r.status === 'matched' ? 'ڕێککەوت' : 'داخراو', r.status === 'open' ? 'note' : r.status === 'matched' ? 'ok' : 'danger')}</td>
          <td><div class="row" style="gap:4px">${r.status === 'open' ? `<button class="btn sm danger" data-act="closeReq" data-arg="${r.id}">داخستن</button>` : ''}<button class="btn sm ghost" data-act="delReq" data-arg="${r.id}">${icon('x', 14)}</button></div></td>
        </tr>`).join('')}</tbody></table></div>`;
      U.driverOpts = driverOpts;
      return layout('subs', 'بەشداری و داواکاری', `
        ${ui.seg('stab', [{ v: 'subs', l: `بەشدارییەکان (${s.subscriptions.length})` }, { v: 'reqs', l: `داواکارییەکان (${s.requests.length})` }], tab)}
        ${tab === 'subs' ? subsHtml : reqHtml}`);
    },
  });
  acts.stab = (v) => {
    U.stab = v;
    TK.render();
  };
  acts.editSub = (id) => {
    const x = sel.sub(id);
    TK.sheet(() => `<div class="h2">دەستکاری بەشداری</div>
      <div class="sm muted">${esc(x.riderNames || '')}، ${esc(x.to)}، ${esc(sel.peerName(x.owner || 'me'))}</div>
      <div class="form-grid">
        ${input('s-price', 'نرخی مانگانە', x.price, { type: 'number', ltr: true })}
        ${select('s-driver', 'شۆفێر', x.driverId, S().drivers.map((d) => [d.id, d.name + (d.status !== 'active' ? ' (ناچالاک)' : '')]))}
        ${TK.hasPerDay(x) ? `<div class="card flat col tight sm" style="grid-column:1/-1"><b>کاتی جیاواز بۆ هەر ڕۆژێک</b>${ui.perDayList(x)}<span class="xs muted">کاتەکان لە ئەپی سەرنشینەوە دەگۆڕدرێن.</span></div>` : `${input('s-go', 'کاتی چوون', x.go || '', { type: 'time', ltr: true })}
        ${input('s-back', 'کاتی هاتنەوە', x.back || '', { type: 'time', ltr: true })}`}
        ${select('s-status', 'دۆخ', x.status, [['active', 'چالاک'], ['paused', 'ڕاگیراو']])}
      </div>
      <button class="btn block" data-act="saveSub" data-arg="${id}">پاشەکەوت (هەردوولا ئاگادار دەکرێنەوە)</button>
      <button class="btn danger block sm" data-act="endSub" data-arg="${id}">هەڵوەشاندنەوەی بەشداری</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveSub = (id) => {
    TK.update((s) => {
      const x = s.subscriptions.find((y) => y.id === id);
      const oldDriver = x.driverId;
      x.price = num('s-price') || x.price;
      // کاتی جیاواز بۆ هەر ڕۆژێک: کاتەکان لە ئەپی سەرنشینەوە دەگۆڕدرێن
      if (!TK.hasPerDay(x)) {
        if (val('s-go')) x.go = val('s-go');
        if (val('s-back')) x.back = val('s-back');
      }
      if (val('s-status') !== x.status) {
        x.status = val('s-status');
        x.pauseLog = x.pauseLog || [];
        if (x.status === 'paused') x.pauseLog.push({ from: Date.now(), to: null });
        else if (x.pauseLog.length) x.pauseLog[x.pauseLog.length - 1].to = Date.now();
      }
      x.driverId = val('s-driver');
      s.trips.filter((t) => t.subId === id && t.status === 'scheduled').forEach((t) => {
        t.driverId = x.driverId;
        if (t.runId) return;
        const tm = TK.dayTime(x, t.dir);
        if (tm && tm !== t.time) {
          const shift = TK.toMin(tm) - TK.toMin(t.time);
          t.time = tm;
          (t.stops || []).forEach((st) => (st.time = fmt.addMin(st.time, shift)));
        }
      });
      const names = x.riderNames || '';
      const nd = s.drivers.find((d) => d.id === x.driverId);
      pushN(s, { kind: oldDriver !== x.driverId ? 'swap' : 'info', title: oldDriver !== x.driverId ? 'شۆفێرەکەت گۆڕدرا' : 'بەشدارییەکەت نوێ کرایەوە', body: `${names}، ${nd ? nd.name : ''}، ${fmt.money(x.price)}` }, x.owner || 'me');
      pushDN(s, { driverId: x.driverId, kind: 'info', title: 'گۆڕانکاری لە بەشدارییەک', body: `${names}، ${x.to}، ${fmt.schedule(x)}` });
      if (oldDriver !== x.driverId) pushDN(s, { driverId: oldDriver, kind: 'info', title: 'بەشدارییەک لێت وەرگیرایەوە', body: `${names}، ${x.to}` });
    });
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };
  acts.endSub = async (id) => {
    if (!(await TK.ask('بەشدارییەکە هەڵدەوەشێتەوە.'))) return;
    TK.update((s) => TK.endSubIn(s, id, 'cancel'));
    TK.closeSheet();
  };
  acts.closeReq = (id) => {
    TK.update((s) => {
      const r = s.requests.find((x) => x.id === id);
      r.status = 'closed';
      r.closedReason = 'admin';
      pushN(s, { kind: 'info', title: 'داواکارییەکەت داخرا', body: `${r.riderNames}، ${r.to}، لەلایەن تیمی یەکسا` }, r.owner || 'me');
    });
  };
  acts.delReq = async (id) => {
    if (!(await TK.ask('داواکارییەکە دەسڕدرێتەوە؟'))) return;
    TK.update((s) => {
      s.requests = s.requests.filter((r) => r.id !== id);
    });
  };

  /* =========================================================
   * گەشتەکان و جێگرەوە
   * ======================================================= */
  TK.route('trips', {
    guard,
    render() {
      const s = S();
      const trips = s.trips.slice().sort((a, b) => a.time.localeCompare(b.time));
      const swaps = s.swaps.slice().sort((a, b) => b.createdAt - a.createdAt);
      return layout('trips', 'گەشتەکانی ئەمڕۆ', `
        ${!trips.length ? ui.empty('route', 'ئەمڕۆ هیچ گەشتێک نییە', 'گەشتەکان ڕۆژانە لە بەشدارییە چالاکەکانەوە دروست دەبن') : ''}
        <div class="tbl-wrap" ${trips.length ? '' : 'hidden'}><table class="tbl">
          <thead><tr><th>کات</th><th>گەشت</th><th>شۆفێر</th><th>وێستگە</th><th>دۆخ</th><th></th></tr></thead>
          <tbody>${trips.map((t) => {
            const d = sel.driver(t.driverId) || {};
            const done = t.stops.filter((x) => x.done).length;
            return `<tr>
              <td><b>${fmt.clockBare(t.time)}</b><div class="xs muted">${fmt.period(t.time)}</div></td>
              <td><b class="sm">${esc(t.title)}</b>${t.runTitle ? ` ${ui.badge(t.runTitle, 'info')}` : ''}<div class="xs muted">${esc(TK.ownStops(t)[0] ? TK.ownStops(t)[0].place : t.stops[0].place)} ← ${esc(TK.dest(t))}</div></td>
              <td class="sm">${esc(d.name || '')}<div class="xs muted">${esc(sel.peerName(t.owner || 'me'))}</div>${t.originalDriverId ? `<div class="xs brand">جێگرەوەی ${esc((sel.driver(t.originalDriverId) || {}).name || '')}</div>` : ''}</td>
              <td class="sm">${done}/${t.stops.length}</td>
              <td>${ui.badge(TRIP_ST[t.status][0], TRIP_ST[t.status][1])}</td>
              <td><button class="btn sm secondary" data-act="editTrip" data-arg="${t.id}">${icon('edit', 14)}</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="h3">داواکارییەکانی جێگرەوە</div>
        ${swaps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>شۆفێر</th><th>گەشت</th><th>پارە</th><th>هۆکار</th><th>جێگرەوە</th><th>دۆخ</th></tr></thead>
          <tbody>${swaps.map((w) => {
            const t = sel.trip(w.tripId) || { title: '-', time: '00:00' };
            const st = { open: ['کراوە', 'note'], taken: ['وەرگیرا', 'ok'], cancelled: ['هەڵوەشایەوە', ''], rejected: ['خێزان ڕەتیکردەوە', 'danger'] }[w.status];
            return `<tr><td class="sm">${esc((sel.driver(w.fromDriverId) || {}).name || '')}</td><td class="sm">${esc(t.title)}، ${fmt.clock(t.time)}</td><td class="sm">${fmt.group(w.pay)}</td><td class="xs">${esc(w.note || '-')}</td><td class="sm">${w.takenBy ? esc((sel.driver(w.takenBy) || {}).name || '') : '-'}</td><td>${ui.badge(st[0], st[1])}</td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="sm muted">هیچ داواکارییەک نییە</div>'}`);
    },
  });
  acts.editTrip = (id) => {
    const t = sel.trip(id);
    TK.sheet(() => `<div class="h2">${esc(t.title)}</div>
      <div class="form-grid">
        ${select('t-driver', 'شۆفێر', t.driverId, S().drivers.filter((d) => d.status === 'active').map((d) => [d.id, d.name]))}
        ${input('t-time', 'کات', t.time, { type: 'time', ltr: true })}
        ${select('t-status', 'دۆخ', t.status, Object.keys(TRIP_ST).map((k) => [k, TRIP_ST[k][0]]))}
      </div>
      <div class="list">${t.stops.map((x) => `<div class="item"><div class="grow"><b class="sm">${esc(x.place)}</b><div class="xs muted">${x.kind === 'pickup' ? 'سوار بوون' : 'دابەزین'}، ${esc(x.riders)}</div></div><span class="sm">${x.done ? '✓ ' + fmt.clock(fmt.hhmm(x.doneAt)) : fmt.clock(x.time)}</span></div>`).join('')}</div>
      <button class="btn block" data-act="saveTrip" data-arg="${id}">پاشەکەوت</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.saveTrip = (id) => {
    TK.update((s) => {
      const t = s.trips.find((x) => x.id === id);
      const nd = val('t-driver');
      // لە ڕۆتی هاوبەش، شۆفێر و کات بۆ هەموو گەشتەکانی ڕۆتەکە دەگۆڕدرێن
      const group = t.runId ? s.trips.filter((x) => x.runId === t.runId) : [t];
      if (nd !== t.driverId) {
        group.forEach((x) => (x.driverId = nd));
        const d = s.drivers.find((x) => x.id === nd);
        pushN(s, { kind: 'swap', title: 'شۆفێری گەشتەکەت گۆڕدرا', body: `${t.title}، ${d.name} (${d.car})`, link: `track/${t.id}` }, t.owner || 'me');
        pushDN(s, { driverId: nd, kind: 'ok', title: 'گەشتێکی نوێ بۆت دانرا', body: `${t.title}، ${fmt.clock(t.time)}`, link: `trip/${t.id}` });
      }
      const nt = val('t-time');
      if (nt && nt !== t.time) {
        const shift = (+nt.slice(0, 2) * 60 + +nt.slice(3)) - (+t.time.slice(0, 2) * 60 + +t.time.slice(3));
        group.forEach((g) => {
          g.time = fmt.addMin(g.time, shift);
          g.stops.forEach((x) => (x.time = fmt.addMin(x.time, shift)));
        });
      }
      t.status = val('t-status');
      if (t.status === 'active' && !t.segmentStartedAt) t.segmentStartedAt = Date.now();
    });
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };

  /* =========================================================
   * هەواڵ و ئاگادارکردنەوە
   * ======================================================= */
  const THEMES = [['amber', 'پرتەقاڵی'], ['navy', 'شین تاریک'], ['violet', 'مۆر'], ['blue', 'شین'], ['green', 'سەوز'], ['rose', 'پەمەیی']];
  const ICONS = [['gift', 'دیاری'], ['tag', 'داشکاندن'], ['megaphone', 'ڕاگەیاندن'], ['alert', 'ئاگاداری'], ['users', 'خێزان'], ['woman', 'ئافرەت'], ['car', 'ئۆتۆمبێل'], ['school', 'قوتابخانە'], ['fuel', 'بەنزین'], ['trophy', 'پاداشت'], ['shield', 'سەلامەتی'], ['star', 'ئەستێرە']];
  const AUD = { passenger: 'سەرنشین', driver: 'شۆفێر', all: 'هەمووان' };
  TK.route('news', {
    guard,
    render() {
      const s = S();
      return layout('news', 'هەواڵ و ئاگادارکردنەوە', `
        <div class="cards">${s.news.map((n) => `<div class="card col" style="${n.hidden ? 'opacity:.55' : ''}">
          ${ui.banner(n).replace('data-go=', 'data-x=')}
          <div class="row wrap" style="gap:6px">${ui.badge(KIND_L[sel.newsKind(n)], sel.newsKind(n) === 'offer' ? 'note' : 'info')}${ui.badge(AUD[n.aud], 'info')}${n.hidden ? ui.badge('شاراوە', 'danger') : ui.badge('بڵاوکراوە', 'ok')}${n.code ? `<span class="badge latin">${esc(n.code)}</span>` : ''}</div>
          <div class="row" style="gap:6px"><button class="btn sm secondary grow" data-act="editNews" data-arg="${n.id}">${icon('edit', 14)}دەستکاری</button><button class="btn sm ${n.hidden ? 'ok' : 'ghost'}" data-act="toggleNews" data-arg="${n.id}">${n.hidden ? 'بڵاوکردنەوە' : 'شاردنەوە'}</button><button class="btn sm ghost" data-act="delNews" data-arg="${n.id}">${icon('x', 14)}</button></div>
        </div>`).join('')}</div>
        <div class="h3">ئاگادارکردنەوە نێردراوەکان</div>
        ${s.broadcasts.length ? `<div class="list">${s.broadcasts.map((b) => `<div class="item"><div class="ico-box">${icon('megaphone', 18, 'var(--brand)')}</div><div class="grow"><b class="sm">${esc(b.title)}</b><div class="xs muted">${esc(b.body)}</div></div>${ui.badge(b.toName || AUD[b.aud], 'info')}<span class="xs muted">${fmt.ago(b.at)}</span></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ ئاگادارکردنەوەیەک نەنێردراوە</div>'}`,
        `<button class="btn sm secondary" data-act="broadcast">${icon('megaphone', 18)}ناردنی ئاگادارکردنەوە</button><button class="btn sm" data-act="editNews">${icon('plus', 18, 'currentColor', 2.2)}هەواڵی نوێ</button>`);
    },
  });
  const NEWS_KIND = [{ v: 'ad', l: 'ڕێکلام و هەواڵ (سەرەوە)' }, { v: 'offer', l: 'ئۆفەر (خوارەوە)' }];
  const KIND_L = { ad: 'ڕێکلام و هەواڵ', offer: 'ئۆفەر' };
  /** خوێندنەوەی خانەکانی فۆڕمەکە بۆ U.nd بەر لە نوێکردنەوەی شاشە */
  function readNews() {
    if (!U.nd || !document.getElementById('n-title')) return;
    ['title', 'sub', 'body', 'tag', 'aud', 'theme', 'icon', 'big', 'code', 'until'].forEach((k) => {
      const el = document.getElementById('n-' + k);
      if (el) U.nd[k] = el.value;
    });
    const nf = document.getElementById('n-notify');
    if (nf) U.nd.notify = nf.checked;
  }
  function newsSheet() {
    const n = U.nd;
    const ad = n.kind === 'ad';
    TK.sheet(() => `<div class="h2">${n._id ? 'دەستکاری' : 'نوێ'}: ${KIND_L[n.kind]}</div>
      <div class="field full"><label>جۆر</label>${ui.seg('newsKind', NEWS_KIND, n.kind)}</div>
      <div class="xs muted">${ad ? 'لە سەرەوەی پەڕەی سەرەکی دەردەکەوێت، بە پانی تەواوی شاشە. دەتوانیت وێنە دابنێیت.' : 'لە بەشی «ئۆفەرەکان»ی خوارەوە دەردەکەوێت، لەگەڵ کۆدی داشکاندن.'}</div>
      <div class="form-grid">
        ${input('n-title', 'سەردێڕ', n.title, { full: true })}
        ${input('n-sub', 'دێڕی دووەم', n.sub, { full: true })}
        ${input('n-body', 'ناوەڕۆک', n.body, { full: true, area: true })}
        ${ad ? `<div class="field full"><label>وێنە (ئارەزوومەندانە)</label><div class="photos">${ui.photoField('newsImage', 'وێنەی بانەر (پانی باشترە)', n.image, 'pickNewsImg')}</div>
          ${n.image ? `<button class="btn sm ghost" data-act="rmNewsImg">لابردنی وێنە</button>` : ''}
          <span class="xs muted">ئەگەر وێنە دابنێیت، ڕەنگ و ئایکۆن و نووسینی گەورە پیشان نادرێن.</span></div>` : ''}
        ${input('n-tag', 'نیشانە', n.tag, { ph: ad ? 'نوێ، ڕێکلام، ئاگاداری' : 'ئۆفەر' })}
        ${select('n-aud', 'بۆ کێ', n.aud, Object.entries(AUD))}
        ${select('n-theme', 'ڕەنگ', n.theme, THEMES)}
        ${select('n-icon', 'ئایکۆن', n.icon, ICONS)}
        ${input('n-big', 'نووسینی گەورە (ئارەزوومەندانە)', n.big || '', { ltr: true, ph: '10%' })}
        ${ad ? '' : `${input('n-code', 'کۆدی داشکاندن (ئارەزوومەندانە)', n.code || '', { ltr: true })}${input('n-until', 'ماوە (ئارەزوومەندانە)', n.until || '', { full: true, ph: 'تا کۆتایی مانگ' })}`}
        ${check('n-notify', 'ئاگادارکردنەوەش بنێرە', n.notify)}
      </div>
      <button class="btn block" data-act="saveNews">پاشەکەوت و بڵاوکردنەوە</button>
      <button class="btn ghost block" data-act="cancelNews">پاشگەزبوونەوە</button>`);
  }
  acts.editNews = (id) => {
    const base = id ? S().news.find((x) => x.id === id) : { kind: 'ad', aud: 'passenger', tag: 'نوێ', theme: 'amber', icon: 'megaphone', title: '', sub: '', body: '', code: '', big: '', until: '', image: '' };
    U.nd = { ...base, kind: sel.newsKind(base), image: base.image || '', _id: id || '', _orig: base.image || '', notify: !id };
    newsSheet();
  };
  acts.newsKind = (k) => {
    readNews();
    U.nd.kind = k;
    if (k === 'offer' && U.nd.tag === 'نوێ') U.nd.tag = 'ئۆفەر';
    if (k === 'ad' && U.nd.tag === 'ئۆفەر') U.nd.tag = 'نوێ';
    newsSheet();
  };
  acts.pickNewsImg = async (v, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    readNews();
    TK.toast('وێنەکە ئامادە دەکرێت...');
    try {
      const data = await TK.compressImage(f, 1400, 0.8);
      const id = await TK.saveImage(data);
      if (!id) return TK.toast('جێگای هەڵگرتن پڕە');
      if (U.nd.image && U.nd.image !== U.nd._orig) TK.removeImage(U.nd.image);
      U.nd.image = id;
      newsSheet();
    } catch (e) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە');
    }
  };
  acts.rmNewsImg = () => {
    readNews();
    if (U.nd.image && U.nd.image !== U.nd._orig) TK.removeImage(U.nd.image);
    U.nd.image = '';
    newsSheet();
  };
  acts.cancelNews = () => {
    if (U.nd && U.nd.image && U.nd.image !== U.nd._orig) TK.removeImage(U.nd.image);
    U.nd = null;
    TK.closeSheet();
  };
  acts.saveNews = () => {
    readNews();
    const n0 = U.nd;
    if (String(n0.title).trim().length < 3) return TK.toast('سەردێڕ بنووسە');
    const ad = n0.kind === 'ad';
    const data = { kind: n0.kind, title: String(n0.title).trim(), sub: n0.sub, body: n0.body, tag: n0.tag || (ad ? 'نوێ' : 'ئۆفەر'), aud: n0.aud, theme: n0.theme, icon: n0.icon, big: String(n0.big || '').trim(), code: ad ? '' : String(n0.code || '').trim().toUpperCase(), until: ad ? '' : n0.until, image: ad ? n0.image : '' };
    if (n0._orig && n0._orig !== data.image) TK.removeImage(n0._orig);
    TK.update((s) => {
      let n;
      if (n0._id) n = Object.assign(s.news.find((x) => x.id === n0._id), data);
      else {
        n = { id: 'w' + TK.uid(), hidden: false, ...data };
        s.news.unshift(n);
      }
      if (n0.notify) sendBroadcast(s, n.aud, n.title, n.sub, `news/${n.id}`);
    });
    U.nd = null;
    TK.closeSheet();
    TK.toast('بڵاو کرایەوە');
  };
  acts.toggleNews = (id) => {
    TK.update((s) => {
      const n = s.news.find((x) => x.id === id);
      n.hidden = !n.hidden;
    });
  };
  acts.delNews = async (id) => {
    if (!(await TK.ask('ئەم هەواڵە دەسڕدرێتەوە؟'))) return;
    const old = (S().news.find((x) => x.id === id) || {}).image;
    if (old) TK.removeImage(old);
    TK.update((s) => {
      s.news = s.news.filter((x) => x.id !== id);
    });
  };
  function sendBroadcast(s, aud, title, body, link, driverId) {
    // بۆ هەموو سەرنشینێک و هەموو شۆفێرێک بە جیا
    if (aud === 'passenger' || aud === 'all') s.accounts.forEach((a) => a.uid && !a.blocked && pushN(s, { kind: 'info', title, body, link: link || '' }, a.uid));
    if (aud === 'driver' || aud === 'all') pushDN(s, { kind: 'info', title, body, link: link || '' });
    if (aud === 'one') pushDN(s, { driverId, kind: 'info', title, body });
    s.broadcasts.unshift({ id: 'b' + TK.uid(), aud, title, body, at: Date.now(), toName: driverId ? (s.drivers.find((d) => d.id === driverId) || {}).name : '' });
  }
  function broadcastForm(aud, driverId) {
    TK.sheet(() => `<div class="h2">ناردنی ئاگادارکردنەوە</div>
      <div class="form-grid">
        ${aud === 'one' ? `<div class="full sm">بۆ: <b>${esc(sel.driver(driverId).name)}</b></div>` : select('b-aud', 'بۆ کێ', 'all', [['all', 'هەمووان'], ['passenger', 'هەموو سەرنشینەکان'], ['driver', 'هەموو شۆفێرەکان']], { full: true })}
        ${input('b-title', 'سەردێڕ', '', { full: true })}
        ${input('b-body', 'نامە', '', { full: true, area: true })}
      </div>
      <button class="btn block" data-act="sendBroadcast" data-arg="${aud}|${driverId || ''}">${icon('send', 18)}ناردن</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  }
  acts.broadcast = () => broadcastForm('all');
  acts.sendBroadcast = (arg) => {
    const [aud0, did] = arg.split('|');
    const title = val('b-title').trim();
    if (title.length < 2) return TK.toast('سەردێڕ بنووسە');
    const aud = aud0 === 'one' ? 'one' : val('b-aud');
    TK.update((s) => sendBroadcast(s, aud, title, val('b-body'), '', did));
    TK.closeSheet();
    TK.toast('نێردرا');
  };

  /* =========================================================
   * دارایی
   * ======================================================= */
  TK.route('finance', {
    guard,
    render() {
      const s = S();
      const rows = s.drivers.filter((d) => d.status !== 'pending').map((d) => ({ d, po: TK.payout(s, d.id) }));
      const T = rows.reduce((a, { po }) => ({ gross: a.gross + po.gross, fee: a.fee + po.commission, net: a.net + po.net }), { gross: 0, fee: 0, net: 0 });
      const bills = s.accounts.map((a) => {
        const owner = ownerOf(s, a.phone);
        const ps = TK.pslice(s, owner);
        return ps ? { a, inv: TK.invoice(s, owner), b: ps.billing } : null;
      }).filter((x) => x && (x.inv.lines.length || x.b.paid));
      const paidList = s.accounts.flatMap((a) => (acctSlice(s, a.phone) || { billing: { history: [] } }).billing.history.map((h) => ({ ...h, name: h.name || a.name }))).sort((x, y) => y.at - x.at);
      const paidIn = paidList.reduce((n, h) => n + h.total, 0);
      const PT = (s.partners || []).reduce((a, p) => {
        const st = TK.partnerStats(s, p.id);
        return { month: a.month + st.month, balance: a.balance + st.balance };
      }, { month: 0, balance: 0 });
      return layout('finance', 'دارایی', `
        <div class="kpis">
          ${kpi(fmt.money(T.gross), 'کۆی بەشدارییەکانی مانگ', 'wallet')}
          ${kpi(fmt.money(T.net), 'بەشی شۆفێران', 'car')}
          ${kpi(fmt.money(PT.month), 'بەشی هاوبەشەکان (ئەم مانگە)', 'briefcase', { go: 'partners', sub: PT.balance ? `${fmt.money(PT.balance)} ماوە بۆ پێدان` : 'هەمووی دراوە' })}
          ${kpi(fmt.money(T.fee - PT.month), 'قازانجی پاکی تۆ', 'trophy', { cls: 'brand', sub: `کۆمیسیۆن ${fmt.money(T.fee)} کەم بەشی هاوبەشەکان` })}
        </div>
        <div class="xs muted">پارەی وەرگیراو لە سەرنشینان تا ئێستا: ${fmt.money(paidIn)}</div>
        <div class="h3">موچەی شۆفێران</div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>شۆفێر</th><th>سەرنشین</th><th>کۆ</th><th>کۆمیسیۆن</th><th>سزا / پاداشت / جێگرەوە</th><th>پاداشتی مانگ</th><th>بۆ شۆفێر</th><th></th></tr></thead>
          <tbody>${rows.map(({ d, po }) => `<tr>
            <td class="tap" data-go="driver/${d.id}"><b class="sm">${esc(d.name)}</b><div class="xs muted">${esc(PAY[d.payMethod] || '-')}${d.payAccount ? ` <span class="latin">${esc(d.payAccount)}</span>` : ''}</div>${payChanged(d) ? ui.badge('شێوازی موچە گۆڕدراوە', 'danger') : ''}</td><td>${po.subs}</td><td class="sm">${fmt.group(po.gross)}</td><td class="sm neg">${fmt.group(po.commission)}</td>
            <td class="sm ${po.ledgerSum < 0 ? 'neg' : 'ok'}">${po.ledgerSum ? fmt.group(Math.abs(po.ledgerSum)) : '-'}</td>
            <td class="sm ok">${po.bonus ? fmt.group(po.bonus) : '-'}</td>
            <td><b class="${po.net < 0 ? 'err' : 'brand'}">${fmt.group(po.net)}</b>${po.net < 0 ? '<div class="xs err">قەرزدارە</div>' : ''}</td>
            <td>${(() => {
              const m = new Date();
              const paid = s.payouts.find((p) => p.driverId === d.id && new Date(p.at).getMonth() === m.getMonth() && new Date(p.at).getFullYear() === m.getFullYear());
              if (paid) return `${ui.badge('دراوە', 'ok')}<div class="xs muted">${fmt.ago(paid.at)}</div>`;
              return po.gross || po.entries.length ? `<button class="btn sm ok" data-act="payout" data-arg="${d.id}">${po.net < 0 ? 'قەرز وەرگیرا' : 'پارە درا'}</button>` : '';
            })()}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="xs muted">«پارە درا» تۆمارەکانی ئەم مانگە دادەخات و لە مێژوو هەڵیان دەگرێت. ئەگەر شۆفێر قەرزدار بێت (بۆ نموونە بە هۆی کاش)، «قەرز وەرگیرا» دابگرە کاتێک پارەکەی دا.</div>
        <div class="h3">فاتورەی سەرنشینان، ${esc(s.billing.month || '')}</div>
        ${bills.length ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>سەرنشین</th><th>بەشداری</th><th>کۆ</th><th>داشکاندن و قەرەبوو</th><th>بۆ دان</th><th>شێواز</th><th></th></tr></thead>
          <tbody>${bills.map(({ a, inv, b }) => `<tr>
            <td class="tap" data-go="passenger/${a.phone}"><b class="sm">${esc(a.name)}</b><div class="xs muted latin">${fmt.phone(a.phone)}</div></td>
            <td>${inv.lines.length}</td><td class="sm">${fmt.group(inv.sub)}</td>
            <td class="sm neg">${inv.promo + inv.credit ? fmt.group(inv.promo + inv.credit) : '-'}</td>
            <td><b class="brand">${fmt.group(inv.total)}</b></td>
            <td class="sm">${{ cash: 'کاش', fastpay: 'FastPay', fib: 'FIB' }[b.method] || '-'}</td>
            <td>${b.paid ? ui.badge('دراوە', 'ok') : `<button class="btn sm ok" data-act="markPaid" data-arg="${a.phone}">پارە وەرگیرا</button>`}</td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<div class="sm muted">ئەم مانگە هیچ فاتورەیەک نییە</div>'}
        <div class="cols">
          <div class="card col">
            <div class="h3">مێژووی موچەی شۆفێران</div>
            ${s.payouts.length ? `<div class="list">${s.payouts.map((p) => `<div class="item"><div class="grow"><b class="sm">${esc((sel.driver(p.driverId) || {}).name || '')}</b><div class="xs muted">${esc(p.month || '')} ${fmt.ago(p.at)}</div></div><b class="sm">${fmt.money(p.amount)}</b></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ موچەیەک نەدراوە</div>'}
          </div>
          <div class="card col">
            <div class="h3">مێژووی پارەی سەرنشینان</div>
            ${paidList.length ? `<div class="list">${paidList.map((h) => `<div class="item"><div class="grow"><b class="sm">${esc(h.name || '')}</b><div class="xs muted">${esc(h.month)}، ${fmt.ago(h.at)}</div></div><b class="sm">${fmt.money(h.total)}</b></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ پارەیەک وەرنەگیراوە</div>'}
          </div>
        </div>`);
    },
  });
  acts.payout = async (id) => {
    const po = TK.payout(S(), id);
    if (!(await TK.ask(`${po.net < 0 ? 'قەرزی' : 'موچەی'} ${sel.driver(id).name}: ${fmt.money(Math.abs(po.net))}. تۆمار بکرێت؟`, { danger: false, icon: 'wallet', yes: 'تۆمارکردن' }))) return;
    TK.update((s) => {
      s.ledger.forEach((e) => {
        if (e.driverId === id && !e.paidOut) e.paidOut = true;
      });
      s.payouts.unshift({ id: 'p' + TK.uid(), driverId: id, amount: po.net, month: fmt.MONTHS[new Date().getMonth()], at: Date.now() });
      pushDN(s, { driverId: id, kind: 'pay', title: po.net < 0 ? 'قەرزەکەت وەرگیرا' : 'موچەکەت نێردرا', body: fmt.money(Math.abs(po.net)), link: 'earnings' });
    });
    TK.toast('تۆمار کرا');
  };
  acts.markPaid = async (phone) => {
    const s = S();
    const inv = TK.invoice(s, ownerOf(s, phone));
    const a = s.accounts.find((x) => x.phone === phone);
    if (!(await TK.ask(`پارەی ${a.name}: ${fmt.money(inv.total)} وەرگیرا؟`, { danger: false, icon: 'wallet', yes: 'تۆمارکردن' }))) return;
    actions.pay(inv.total, Math.floor(inv.total / 1000), phone);
    TK.toast('وەک دراو تۆمار کرا');
  };

  /* =========================================================
   * سکاڵا و ڕاپۆرت
   * ======================================================= */
  TK.route('reports', {
    guard,
    render() {
      const s = S();
      const stT = { open: ['کراوە', 'note'], progress: ['لە کاردایە', 'info'], resolved: ['چارەسەر کرا', 'ok'] };
      const tks = allTickets(s).sort((a, b) => b.at - a.at);
      return layout('reports', 'سکاڵا و ڕاپۆرت', `
        <div class="h3">ڕاپۆرتی «شۆفێر نەهات»</div>
        <div class="xs muted">قەرەبوو و سزا خۆکار جێبەجێ کراون. ئەگەر ڕاپۆرتەکە ڕاست نەبوو، «ڕەتکردنەوە» دابگرە و هەردووکیان دەگەڕێنەوە.</div>
        ${s.reports.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>سەرنشین</th><th>شۆفێر</th><th>گەشت</th><th>تێبینی</th><th>قەرەبوو / سزا</th><th>دۆخ</th><th></th></tr></thead>
          <tbody>${s.reports.map((r) => {
            const t = sel.trip(r.tripId) || { title: '-', time: '00:00' };
            return `<tr><td class="sm">${esc(r.by)}<div class="xs muted">${fmt.ago(r.at)}</div></td><td class="sm">${esc((sel.driver(r.driverId) || {}).name || '')}</td><td class="sm">${esc(t.title)}، ${fmt.clock(t.time)}</td><td class="xs">${esc(r.note || '-')}</td>
              <td class="sm">${fmt.group(r.credit)} / ${fmt.group(r.penalty)}</td>
              <td>${ui.badge(r.status === 'open' ? 'کراوە' : r.status === 'approved' ? 'پەسەند کرا' : 'ڕەتکرایەوە', r.status === 'open' ? 'note' : r.status === 'approved' ? 'ok' : 'danger')}</td>
              <td>${r.status === 'open' ? `<div class="row" style="gap:4px"><button class="btn sm ok" data-act="repOk" data-arg="${r.id}">پەسەند</button><button class="btn sm danger" data-act="repNo" data-arg="${r.id}">ڕەتکردنەوە</button></div>` : ''}</td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="sm muted">هیچ ڕاپۆرتێک نییە</div>'}
        <div class="h3">داواکارییەکانی پشتگیری</div>
        ${tks.length ? `<div class="list">${tks.map((t) => `<div class="item ${t.status === 'open' ? 'red-notice' : ''}"><div class="grow"><div class="row wrap" style="gap:6px"><b class="sm">#${t.id}</b>${ui.badge(stT[t.status][0], stT[t.status][1])}<span class="xs muted">${esc(t.who || '')} <span class="latin">${fmt.phone(t.phone || '')}</span>، ${fmt.ago(t.at)}</span></div><div class="sm">${esc(t.subject)}</div>${t.reply ? `<div class="xs muted">وەڵام: ${esc(t.reply)}</div>` : ''}</div><button class="btn sm secondary" data-act="replyTicket" data-arg="${esc(t.owner)}|${t.id}">وەڵامدانەوە</button></div>`).join('')}</div>` : '<div class="sm muted">هیچ داواکارییەک نییە</div>'}`);
    },
  });
  acts.repOk = (id) => {
    TK.update((s) => {
      const r = s.reports.find((x) => x.id === id);
      r.status = 'approved';
    });
    TK.toast('پەسەند کرا');
  };
  acts.repNo = async (id) => {
    if (!(await TK.ask('قەرەبووی سەرنشین و سزای شۆفێر دەگەڕێنرێنەوە.'))) return;
    TK.update((s) => {
      const r = s.reports.find((x) => x.id === id);
      r.status = 'rejected';
      const owner = r.phone ? ownerOf(s, r.phone) : 'me';
      const ps = TK.pslice(s, owner);
      if (ps) ps.billing.adjustments = ps.billing.adjustments.filter((a) => a.id !== r.adjId);
      s.ledger = s.ledger.filter((e) => e.id !== r.ledgerId);
      const t = s.trips.find((x) => x.id === r.tripId);
      if (t && t.status === 'noshow') t.status = 'done';
      pushN(s, { kind: 'info', title: 'ڕاپۆرتەکەت پشکنرا', body: 'بە پێی زانیارییەکانی گەشت شۆفێر هاتبوو، بۆیە قەرەبووەکە لابرا' }, owner);
      pushDN(s, { driverId: r.driverId, kind: 'ok', title: 'ڕاپۆرتی نەهاتن ڕەتکرایەوە', body: 'سزاکە لە حیسابەکەت لابرا', link: 'earnings' });
    });
    TK.toast('ڕەتکرایەوە');
  };
  const ticketOf = (s, arg) => {
    const [owner, id] = String(arg).split('|');
    const ps = TK.pslice(s, owner);
    return ps ? { t: ps.tickets.find((x) => x.id === +id), owner } : {};
  };
  acts.replyTicket = (arg) => {
    const { t } = ticketOf(S(), arg);
    if (!t) return;
    TK.sheet(() => `<div class="h2">وەڵامی #${t.id}</div><div class="sm">${esc(t.subject)}</div>
      <div class="form-grid">${input('t-reply', 'وەڵام', t.reply || '', { full: true, area: true })}${select('t-st', 'دۆخ', t.status === 'open' ? 'progress' : t.status, [['open', 'کراوە'], ['progress', 'لە کاردایە'], ['resolved', 'چارەسەر کرا']])}</div>
      <button class="btn block" data-act="saveReply" data-arg="${esc(arg)}">ناردن</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveReply = (arg) => {
    TK.update((s) => {
      const { t, owner } = ticketOf(s, arg);
      if (!t) return;
      t.reply = val('t-reply');
      t.status = val('t-st');
      pushN(s, { kind: 'info', title: `وەڵامی پشتگیری #${t.id}`, body: t.reply || 'دۆخی داواکارییەکەت گۆڕا', link: 'support' }, owner);
    });
    TK.closeSheet();
    TK.toast('نێردرا');
  };

  /* =========================================================
   * نامەکان (بۆ پشکنینی ناکۆکییەکان)
   * ======================================================= */
  /** بەڕێوەبەر دەقی ڕاستەقینەی نامە گەڕێنراوەکان دەبینێت (بۆ سکاڵا و سەلامەتی) */
  const withUnsent = (list) => list.map((m) => {
    if (!m.unsent) return m;
    const u = (S().unsent || []).find((x) => x.msgId === m.id);
    return Object.assign({}, m, { unsent: false, text: `[گەڕێنرایەوە ${fmt.clock(fmt.hhmm(m.unsentAt || m.at))}] ${u ? u.text : '(دەقەکە نەدۆزرایەوە)'}` });
  });
  TK.route('chats', {
    guard,
    render() {
      const s = S();
      const map = {};
      s.messages.forEach((m) => (map[m.driverId + '|' + m.peer] = (map[m.driverId + '|' + m.peer] || []).concat(m)));
      const keys = Object.keys(map).sort((a, b) => map[b][map[b].length - 1].at - map[a][map[a].length - 1].at);
      const cur = U.chat && map[U.chat] ? U.chat : keys[0];
      const name = (k) => {
        const [did, peer] = k.split('|');
        return `${(sel.driver(did) || {}).name || ''} ↔ ${sel.peerName(peer)}`;
      };
      return layout('chats', 'نامەکان', `
        <div class="xs muted">تەنها بۆ پشکنینی سکاڵا و ناکۆکییەکان. سەرنشین و شۆفێر ئەمە نابینن.</div>
        <div class="cols">
          <div class="list">${keys.map((k) => `<div class="item tap" data-act="pickChat" data-arg="${esc(k)}" style="${k === cur ? 'background:var(--note-bg)' : ''}"><div class="grow"><b class="sm">${esc(name(k))}</b><div class="xs muted ellipsis">${esc(map[k][map[k].length - 1].text || '')}</div></div><span class="xs muted">${map[k].length}</span></div>`).join('')}</div>
          <div class="card">${cur ? `<div class="h3" style="margin-bottom:8px">${esc(name(cur))}</div>${ui.chat(withUnsent(map[cur]), true)}` : 'هیچ نامەیەک نییە'}</div>
        </div>`);
    },
  });
  acts.pickChat = (k) => {
    U.chat = k;
    TK.render();
  };

  /* =========================================================
   * شوێنەکان
   * ======================================================= */
  const KINDS = [['home', 'گەڕەک'], ['school', 'قوتابخانە / زانکۆ'], ['work', 'شوێنی کار'], ['hospital', 'نەخۆشخانە'], ['mall', 'مۆڵ'], ['gym', 'وەرزش']];
  /* =========================================================
   * هاوبەشەکان: قوتابخانە، زانکۆ و کۆمپانیا
   * هەر هاوبەشێک کۆد و QRی خۆی هەیە. پشکەکەی ڕێژەیەکی جێگیرە لە پارەی دراوی سەرنشینەکانی
   * (هەرچەند سەرنشین بن ڕێژەکە ناگۆڕێت)، و لە کۆمیسیۆنی یەکسا دەردەچێت نەک لە شۆفێر.
   * ======================================================= */
  const PT_TYPE = { school: ['قوتابخانە', 'school'], uni: ['زانکۆ', 'school'], company: ['کۆمپانیا', 'briefcase'], other: ['هی تر', 'users'] };
  const PT_PAY = { fib: 'FIB', fastpay: 'FastPay', cash: 'کاش', bank: 'بانک' };
  /** لینکی تۆمارکردن کە لە QRدایە */
  const partnerLink = (code) => `${location.origin}${location.pathname.replace(/admin\/?(index\.html)?$/, '')}passenger/#/register?ref=${encodeURIComponent(code)}`;
  const qrSvg = (text, cell = 6) => {
    try {
      const q = window.qrcode(0, 'M');
      q.addData(text);
      q.make();
      return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
    } catch (e) {
      return `<div class="sm muted">QR دروست نەکرا</div>`;
    }
  };
  const isLocal = () => /^(localhost|127\.)/.test(location.hostname);

  TK.route('partners', {
    guard,
    render() {
      const s = S();
      const list = s.partners || [];
      const stats = list.map((p) => ({ p, st: TK.partnerStats(s, p.id) }));
      const sum = (k) => stats.reduce((n, x) => n + x.st[k], 0);
      return layout('partners', 'هاوبەشەکان', `
        <div class="card info row top sm">${icon('help', 18)}<span>هەر سەرنشینێک بە <b>کۆد</b> یان <b>QR</b>ی هاوبەشێک تۆمار ببێت، هەر مانگێک کە فاتورەکەی دەدات ڕێژەی ئەو هاوبەشە لە پارەی دراو حیساب دەکرێت. ڕێژەکە بۆ هەموو سەرنشینەکان وەک یەکە و لە کۆمیسیۆنی تۆ دەردەچێت، نەک لە پارەی شۆفێر.</span></div>
        <div class="kpis">
          ${kpi(list.filter((p) => p.status === 'active').length, 'هاوبەشی چالاک', 'briefcase')}
          ${kpi(stats.reduce((n, x) => n + x.st.riders.length, 0), 'سەرنشینی هێنراو', 'users')}
          ${kpi(fmt.money(sum('month')), 'بەشی هاوبەشەکان ئەم مانگە', 'wallet')}
          ${kpi(fmt.money(sum('balance')), 'ماوە بۆ پێدان', 'receipt', { alert: sum('balance') > 0, cls: 'brand' })}
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>هاوبەش</th><th>جۆر</th><th>کۆد</th><th>ڕێژە</th><th>سەرنشین</th><th>پارەی دراوی ئەم مانگە</th><th>بەشی ئەم مانگە</th><th>ماوە بۆ پێدان</th><th>دۆخ</th></tr></thead>
          <tbody>${stats.map(({ p, st }) => `<tr class="tap" data-go="partner/${p.id}">
            <td><b>${esc(p.name)}</b><div class="xs muted">${esc(p.contact || '')}</div></td>
            <td>${ui.badge(PT_TYPE[p.type][0], p.type === 'company' ? 'info' : 'note')}</td>
            <td class="latin sm"><b>${esc(p.code)}</b></td>
            <td><b>${p.pct}٪</b></td>
            <td>${st.riders.length}</td>
            <td class="sm">${fmt.group(st.monthPaidIn)}</td>
            <td class="sm ok"><b>${fmt.group(st.month)}</b></td>
            <td class="sm"><b class="${st.balance ? 'brand' : 'muted'}">${fmt.group(st.balance)}</b></td>
            <td>${p.status === 'active' ? ui.badge('چالاک', 'ok') : ui.badge('ڕاگیراو', 'danger')}</td>
          </tr>`).join('') || `<tr><td colspan="9" class="sm muted">هێشتا هیچ هاوبەشێک نییە</td></tr>`}</tbody>
        </table></div>`, `<button class="btn sm" data-act="editPartner">${icon('plus', 18, 'currentColor', 2.2)}هاوبەشی نوێ</button>`);
    },
  });

  TK.route('partner/:id', {
    guard,
    render({ id }) {
      const s = S();
      const p = TK.partner(id);
      if (!p) return layout('partners', 'هاوبەش', ui.empty('briefcase', 'نەدۆزرایەوە', ''));
      const st = TK.partnerStats(s, id);
      const link = partnerLink(p.code);
      // حیسابی مانگانە: بەپێی مانگ کۆ دەکرێتەوە
      const months = [];
      st.earn.forEach((e) => {
        let m = months.find((x) => x.month === e.month);
        if (!m) months.push((m = { month: e.month, paid: 0, amount: 0, open: 0, n: 0 }));
        m.paid += e.paid;
        m.amount += e.amount;
        m.n += 1;
        if (!e.settled) m.open += e.amount;
      });
      return layout('partners', esc(p.name), `
        <div class="cols">
          <div class="card col">
            <div class="row">${`<div class="ico-box" style="width:56px;height:56px">${icon(PT_TYPE[p.type][1], 28, 'var(--brand)')}</div>`}<div class="grow"><div class="h2">${esc(p.name)}</div><div class="sm muted">${PT_TYPE[p.type][0]}، ${esc(p.contact || '')}</div><div class="row" style="gap:6px"><span class="sm">${icon('phone', 14, 'var(--muted)')}</span><span class="latin sm">${fmt.phone(p.phone)}</span></div></div>${p.status === 'active' ? ui.badge('چالاک', 'ok') : ui.badge('ڕاگیراو', 'danger')}</div>
            <div class="grid3">
              <div class="card stat flat"><b class="brand">${p.pct}٪</b><span class="xs muted">ڕێژە</span></div>
              <div class="card stat flat"><b>${st.riders.length}</b><span class="xs muted">سەرنشین</span></div>
              <div class="card stat flat"><b>${p.months ? `${p.months} مانگ` : 'هەمیشە'}</b><span class="xs muted">ماوەی پشک</span></div>
            </div>
            <div class="row between sm"><span class="muted">شێوازی پێدان</span><b>${PT_PAY[p.payMethod] || '-'}${p.account ? `، <span class="latin">${esc(p.account)}</span>` : ''}</b></div>
            <div class="row between sm"><span class="muted">ڕێککەوتن لە</span><b>${fmt.date(p.since)}</b></div>
            <div class="row wrap" style="gap:8px">
              <button class="btn sm secondary" data-act="editPartner" data-arg="${p.id}">${icon('edit', 16)}دەستکاری</button>
              <button class="btn sm ${p.status === 'active' ? 'danger' : 'ok'}" data-act="togglePartner" data-arg="${p.id}">${p.status === 'active' ? 'ڕاگرتن' : 'چالاککردنەوە'}</button>
            </div>
          </div>
          <div class="card col" style="align-items:center;text-align:center">
            <div class="h3" style="align-self:stretch;text-align:right">QR و کۆدی تۆمارکردن</div>
            <div class="qr-box">${qrSvg(link)}</div>
            <div class="code-box" style="align-self:stretch"><div><div class="xs muted">کۆدی دیاریکراو</div><div class="code latin">${esc(p.code)}</div></div><button class="btn sm secondary" data-act="copyText" data-arg="${esc(p.code)}">${icon('copy', 16)}کۆپی</button></div>
            <div class="xs muted latin" style="word-break:break-all;direction:ltr">${esc(link)}</div>
            ${isLocal() ? `<div class="card note xs" style="text-align:right">ئێستا داشبۆرد بە <span class="latin">localhost</span> کراوەتەوە، بۆیە مۆبایل ناتوانێت ئەم لینکە بکاتەوە. بۆ تاقیکردنەوە داشبۆرد بە IPی کۆمپیوتەر بکەرەوە (بۆ نموونە <span class="latin">192.168.0.103</span>). دوای هۆستکردن لینکەکە خۆکار دەبێت بە ناونیشانی ماڵپەڕەکەت.</div>` : ''}
            <div class="row wrap" style="gap:8px;justify-content:center">
              <button class="btn sm secondary" data-act="copyText" data-arg="${esc(link)}">${icon('copy', 16)}کۆپی لینک</button>
              <button class="btn sm" data-act="printPoster" data-arg="${p.id}">${icon('download', 16)}چاپکردنی پۆستەر</button>
            </div>
          </div>
        </div>
        <div class="kpis">
          ${kpi(fmt.money(st.month), 'بەشی ئەم مانگە', 'wallet', { sub: `لە ${fmt.money(st.monthPaidIn)} پارەی دراو` })}
          ${kpi(fmt.money(st.total), 'کۆی بەش تا ئێستا', 'trophy')}
          ${kpi(fmt.money(st.paidOut), 'دراوە', 'check')}
          ${kpi(fmt.money(st.balance), 'ماوە بۆ پێدان', 'receipt', { alert: st.balance > 0, cls: 'brand' })}
        </div>
        <div class="cols">
          <div class="card col">
            <div class="row between"><div class="h3">حیسابی مانگانە</div>${st.balance ? `<button class="btn sm ok" data-act="payPartner" data-arg="${p.id}">${icon('check', 16, 'currentColor', 2.4)}پارەکەم دا (${fmt.money(st.balance)})</button>` : ''}</div>
            <div class="list">${months.map((m) => `<div class="item"><div class="grow"><b class="sm">${esc(m.month)}</b><div class="xs muted">${m.n} پارەدان، کۆ ${fmt.money(m.paid)}</div></div><div class="col tight" style="align-items:flex-end"><b class="sm ok">${fmt.money(m.amount)}</b>${m.open ? ui.badge('ماوە', 'note') : ui.badge('دراوە', 'ok')}</div></div>`).join('') || '<div class="item sm muted">هێشتا هیچ پشکێک نییە</div>'}</div>
            <button class="btn sm secondary" data-act="printStatement" data-arg="${p.id}">${icon('receipt', 16)}کەشف حیساب (چاپ / PDF)</button>
          </div>
          <div class="card col">
            <div class="h3">سەرنشینەکان (${st.riders.length})</div>
            <div class="list">${st.riders.map((a) => {
              const mine = st.earn.filter((e) => e.phone === a.phone);
              return `<div class="item"><div class="grow"><b class="sm">${esc(a.name)}</b><div class="xs muted"><span class="latin">${fmt.phone(a.phone)}</span>، تۆمار ${a.createdAt ? fmt.ago(a.createdAt) : ''}${a.partnerNote ? `، ${esc(a.partnerNote)}` : ''}</div></div><div class="col tight" style="align-items:flex-end"><span class="xs muted">دراو ${fmt.group(mine.reduce((n, e) => n + e.paid, 0))}</span><b class="sm ok">${fmt.group(mine.reduce((n, e) => n + e.amount, 0))}</b></div></div>`;
            }).join('') || '<div class="item sm muted">هێشتا کەس بەم کۆدە تۆمار نەبووە</div>'}</div>
          </div>
        </div>
        <div class="card col">
          <div class="h3">مێژووی پێدان بە هاوبەش</div>
          ${st.pays.length ? `<div class="list">${st.pays.map((x) => `<div class="item"><div class="ico-box ok">${icon('check', 16, 'var(--ok-text)', 2.4)}</div><div class="grow"><b class="sm">${fmt.money(x.amount)}</b><div class="xs muted">${PT_PAY[x.method] || ''}${x.note ? `، ${esc(x.note)}` : ''}</div></div><span class="xs muted">${fmt.date(x.at)}</span></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ پارەیەک نەدراوە</div>'}
        </div>`, `<button class="btn sm ghost" data-go="partners">${icon('back', 16)}گەڕانەوە</button>`);
    },
  });
  acts.copyText = (v) => TK.app.acts.copy(v);
  acts.editPartner = (id) => {
    const p = id ? TK.partner(id) : { name: '', type: 'school', contact: '', phone: '', code: '', pct: 3, months: 0, payMethod: 'fib', account: '' };
    TK.sheet(() => `<div class="h2">${id ? 'دەستکاری هاوبەش' : 'هاوبەشی نوێ'}</div>
      <div class="form-grid">
        ${input('p-name', 'ناو', p.name, { full: true, ph: 'بۆ نموونە: قوتابخانەی ئاشتی' })}
        ${select('p-type', 'جۆر', p.type, Object.keys(PT_TYPE).map((k) => [k, PT_TYPE[k][0]]))}
        ${input('p-code', 'کۆد (پیتی ئینگلیزی)', p.code, { ltr: true, ph: 'SCHOOL1' })}
        ${input('p-contact', 'کەسی پەیوەندی', p.contact)}
        ${input('p-phone', 'ژمارەی مۆبایل', p.phone, { ltr: true, ph: '7501234567' })}
        ${input('p-pct', 'ڕێژە بۆ هەر سەرنشینێک', p.pct, { unit: '٪' })}
        ${input('p-months', 'ماوەی پشک بۆ هەر سەرنشینێک', p.months, { unit: 'مانگ', hint: '٠ = هەمیشە' })}
        ${select('p-pay', 'شێوازی پێدان', p.payMethod, Object.keys(PT_PAY).map((k) => [k, PT_PAY[k]]))}
        ${input('p-acc', 'ژمارەی حیساب (ئارەزوومەندانە)', p.account, { ltr: true })}
      </div>
      ${U.ptErr ? `<div class="err">${esc(U.ptErr)}</div>` : ''}
      <button class="btn block" data-act="savePartner" data-arg="${id || ''}">پاشەکەوت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.savePartner = (id) => {
    const name = val('p-name').trim();
    const code = String(val('p-code')).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const phone = String(val('p-phone')).replace(/\D/g, '').replace(/^0/, '').replace(/^964/, '');
    const pct = Number(String(val('p-pct')).replace(/[^\d.]/g, ''));
    const months = Math.max(0, Math.round(Number(String(val('p-months')).replace(/[^\d]/g, '')) || 0));
    U.ptErr = name.length < 2 ? 'ناوی هاوبەش بنووسە'
      : code.length < 3 ? 'کۆد دەبێت لانیکەم ٣ پیت یان ژمارەی ئینگلیزی بێت'
      : (S().partners || []).some((x) => x.code === code && x.id !== id) ? 'ئەم کۆدە بۆ هاوبەشێکی تر بەکارهاتووە'
      : !(pct > 0 && pct <= 50) ? 'ڕێژە دەبێت لە نێوان ٠ و ٥٠ بێت'
      : '';
    if (U.ptErr) return TK.sheet.refresh();
    const patch = { name, type: val('p-type'), code, contact: val('p-contact'), phone, pct, months, payMethod: val('p-pay'), account: val('p-acc') };
    let newId = id;
    TK.update((s) => {
      s.partners = s.partners || [];
      if (id) Object.assign(s.partners.find((x) => x.id === id), patch);
      else {
        newId = 'pt' + TK.uid();
        s.partners.push({ id: newId, status: 'active', since: Date.now(), ...patch });
      }
    });
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
    if (!id) TK.go('partner/' + newId);
  };
  acts.togglePartner = async (id) => {
    const p = TK.partner(id);
    if (p.status === 'active' && !(await TK.ask('هاوبەشەکە ڕادەگیرێت. کۆدەکەی بۆ تۆمارکردنی نوێ کار ناکات و لە پارەدانی داهاتوودا پشکی بۆ حیساب ناکرێت.', { yes: 'ڕاگرتن' }))) return;
    TK.update((s) => {
      const x = s.partners.find((q) => q.id === id);
      x.status = x.status === 'active' ? 'paused' : 'active';
    });
  };
  acts.payPartner = (id) => {
    const p = TK.partner(id);
    const st = TK.partnerStats(S(), id);
    TK.sheet(() => `<div class="h2">پێدانی پارە بە ${esc(p.name)}</div>
      <div class="card note row between"><span>ماوە بۆ پێدان</span><b class="brand">${fmt.money(st.balance)}</b></div>
      <div class="form-grid">
        ${select('pp-method', 'شێوازی پێدان', p.payMethod, Object.keys(PT_PAY).map((k) => [k, PT_PAY[k]]))}
        ${input('pp-note', 'تێبینی / ژمارەی پسوولە', '', { ph: 'بۆ نموونە: مانگی تشرینی یەکەم' })}
      </div>
      <button class="btn ok block" data-act="savePartnerPay" data-arg="${id}">${icon('check', 18, 'currentColor', 2.4)}تۆمارکردنی پێدان</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.savePartnerPay = (id) => {
    const st = TK.partnerStats(S(), id);
    const pid = 'pp' + TK.uid();
    TK.update((s) => {
      s.partnerPays = s.partnerPays || [];
      s.partnerPays.unshift({ id: pid, partnerId: id, amount: st.balance, method: val('pp-method'), note: val('pp-note'), at: Date.now() });
      s.partnerEarnings.forEach((e) => {
        if (e.partnerId === id && !e.settled) e.settled = pid;
      });
    });
    TK.closeSheet();
    TK.toast('پێدان تۆمار کرا');
  };
  /** پۆستەر و کەشف حیساب لە پەنجەرەیەکی نوێدا چاپ دەکرێن */
  function printHtml(title, body) {
    const w = window.open('', '_blank');
    if (!w) return TK.toast('ڕێگە بە کردنەوەی پەنجەرەی نوێ بدە');
    const css = location.href.replace(/#.*$/, '').replace(/admin\/?(index\.html)?$/, '') + 'shared/';
    w.document.write(`<!doctype html><html lang="ckb" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>@font-face{font-family:"Noto Naskh Arabic";src:url("${css}fonts/NotoNaskhArabic.woff2") format("woff2");font-weight:400 700}
      body{font-family:"Noto Naskh Arabic",Tahoma,sans-serif;color:#13254A;margin:0;padding:32px;background:#fff}
      .latin{direction:ltr;unicode-bidi:isolate;font-family:Arial,sans-serif}
      table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #DCE3EE;padding:8px;text-align:right}th{background:#F4F6FA}
      .poster{max-width:520px;margin:0 auto;text-align:center;border:3px solid #F5A623;border-radius:28px;padding:32px}
      .poster svg{width:300px;height:300px}.code{font-size:34px;font-weight:700;letter-spacing:4px;border:2px dashed #F5A623;border-radius:14px;padding:6px 18px;display:inline-block}
      h1{margin:0 0 6px}p{margin:6px 0;line-height:1.8}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
    w.document.close();
  }
  acts.printPoster = (id) => {
    const p = TK.partner(id);
    printHtml(`پۆستەری ${p.name}`, `<div class="poster">
      <img src="${location.href.replace(/#.*$/, '').replace(/admin\/?(index\.html)?$/, '')}shared/logo.png" style="width:90px;height:90px" alt="">
      <h1>یەکسا</h1>
      <p>تەکسی مانگانەی پشتڕاستکراو بۆ ${p.type === 'company' ? 'کارمەندانی' : p.type === 'uni' ? 'خوێندکارانی' : 'قوتابیانی'} <b>${esc(p.name)}</b></p>
      ${qrSvg(partnerLink(p.code), 8)}
      <p>QRەکە بە کامێرای مۆبایل بخوێنەوە، یان لە کاتی تۆمارکردن ئەم کۆدە بنووسە:</p>
      <div class="code latin">${esc(p.code)}</div>
    </div>`);
  };
  acts.printStatement = (id) => {
    const p = TK.partner(id);
    const st = TK.partnerStats(S(), id);
    printHtml(`کەشف حیسابی ${p.name}`, `<h1>کەشف حیسابی ${esc(p.name)}</h1>
      <p>یەکسا، ${fmt.date(Date.now())}. ڕێژە: ${p.pct}٪ لە پارەی دراوی هەر سەرنشینێک.</p>
      <table><thead><tr><th>سەرنشین</th><th>مانگ</th><th>پارەی دراو</th><th>ڕێژە</th><th>بەش</th><th>دۆخ</th></tr></thead><tbody>
      ${st.earn.map((e) => `<tr><td>${esc(e.name)}</td><td>${esc(e.month)}</td><td>${fmt.money(e.paid)}</td><td>${e.pct}٪</td><td><b>${fmt.money(e.amount)}</b></td><td>${e.settled ? 'دراوە' : 'ماوە'}</td></tr>`).join('')}
      </tbody></table>
      <p style="margin-top:18px">کۆی بەش: <b>${fmt.money(st.total)}</b>، دراوە: <b>${fmt.money(st.paidOut)}</b>، ماوە: <b>${fmt.money(st.balance)}</b></p>`.replace(/[0-9]/g, (d) => (S().settings.digits === 'en' ? d : '٠١٢٣٤٥٦٧٨٩'[d])));
  };

  TK.route('places', {
    guard,
    render() {
      const cities = TK.cities();
      const fc = U.pcity || 'all';
      const list = TK.PLACES.filter((p) => fc === 'all' || (p.city || 'erbil') === fc);
      return layout('places', 'شار، قەزا و شوێنەکان', `
        <div class="h3">شار و قەزاکان</div>
        <div class="xs muted">شۆفێر و سەرنشین لە کاتی تۆمارکردندا لەم لیستەوە هەڵدەبژێرن.</div>
        <div class="cols">${cities.map((c) => `<div class="card col">
          <div class="row between"><b>${esc(c.name)}</b><span class="xs muted">${c.districts.length} قەزا و ناوچە</span></div>
          <div class="chips">${c.districts.map((d, i) => `<span class="chip on" style="gap:4px">${esc(d)}<button class="icon-btn plain" style="width:22px;height:22px" data-act="delDistrict" data-arg="${c.id}|${i}" aria-label="لابردن">${icon('x', 12)}</button></span>`).join('')}</div>
          <div class="row" style="gap:6px"><input class="input grow" id="nd-${c.id}" style="min-height:42px" placeholder="قەزا یان ناوچەی نوێ"><button class="btn sm" data-act="addDistrict" data-arg="${c.id}">${icon('plus', 16)}زیادکردن</button></div>
        </div>`).join('')}</div>
        <div class="row between wrap" style="gap:8px;margin-top:6px"><div class="h3">شوێنەکان (${list.length})</div>
          <div class="tabs">${[['all', 'هەمووی']].concat(cities.map((c) => [c.id, c.name])).map(([k, l]) => `<button class="${fc === k ? 'on' : ''}" data-act="pcity" data-arg="${k}">${esc(l)}</button>`).join('')}</div></div>
        <div class="xs muted">ئەم شوێنانە لە کاتی نووسیندا بۆ سەرنشین پێشنیار دەکرێن. شوێنی سەر نەخشە بۆ حیسابکردنی دووری، نرخ و نەخشەی گەشتە. ئەگەر دیاری نەکرابێت، x و y (بە کیلۆمەتر) بەکاردێن، و ئەگەر ئەوانیش بەتاڵ بن ٦ کیلۆمەتر دادەنرێت.</div>
        <div class="xs muted">${list.filter((p) => TK.isGeo(p)).length} لە ${list.length} شوێن لەسەر نەخشە دیاری کراون.</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ناو</th><th>شار</th><th>جۆر</th><th>نەخشە</th><th></th></tr></thead>
          <tbody>${list.map((p) => `<tr><td><div class="row" style="gap:8px">${icon(TK.placeIcon(p.kind), 18, 'var(--brand)')}<b class="sm">${esc(p.name)}</b></div></td><td class="sm">${esc((TK.city(p.city || 'erbil') || {}).name || '')}</td><td class="sm">${(KINDS.find((k) => k[0] === p.kind) || ['', ''])[1]}</td>
            <td>${TK.isGeo(p) ? `<span class="sm ok row" style="gap:4px">${icon('check', 14, 'currentColor', 2.6)}دیاری کراوە</span>` : `<button class="btn sm secondary" data-act="pinPlaceAdm" data-arg="${p.id}">${icon('pin', 14)}دیاریکردن</button>`}</td>
            <td><div class="row" style="gap:4px"><button class="btn sm secondary" data-act="editPlace" data-arg="${p.id}">${icon('edit', 14)}</button><button class="btn sm ghost" data-act="delPlace" data-arg="${p.id}">${icon('x', 14)}</button></div></td></tr>`).join('')}</tbody></table></div>`,
        `<button class="btn sm" data-act="editPlace">${icon('plus', 18, 'currentColor', 2.2)}شوێنی نوێ</button>`);
    },
  });
  acts.pcity = (k) => {
    U.pcity = k;
    TK.render();
  };
  const ensureCities = (s) => {
    if (!s.cities || !s.cities.length) s.cities = JSON.parse(JSON.stringify(TK.CITIES_DEFAULTS));
    return s.cities;
  };
  acts.addDistrict = (cid) => {
    const el = document.getElementById('nd-' + cid);
    const name = String(el && el.value || '').trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    const c = TK.city(cid);
    if (c.districts.includes(name)) return TK.toast('ئەم ناوە هەیە');
    TK.update((s) => {
      ensureCities(s).find((x) => x.id === cid).districts.push(name);
    });
    TK.toast('زیاد کرا');
  };
  acts.delDistrict = async (arg) => {
    const [cid, i] = arg.split('|');
    const c = TK.city(cid);
    const name = c.districts[+i];
    if (c.districts.length <= 1) return TK.toast('دەبێت لانیکەم یەک قەزا بمێنێتەوە');
    const used = S().drivers.filter((d) => d.city === cid && d.district === name).length;
    if (!(await TK.ask(`«${name}» لە لیستەکە لادەبرێت.${used ? ` ${used} شۆفێر ئەم قەزایەیان هەڵبژاردووە و زانیارییەکەیان ناگۆڕێت.` : ''}`))) return;
    TK.update((s) => {
      const x = ensureCities(s).find((y) => y.id === cid);
      x.districts = x.districts.filter((d) => d !== name);
    });
  };
  acts.editPlace = (id) => {
    const p0 = id ? TK.place(id) : { name: '', kind: 'home', city: U.pcity && U.pcity !== 'all' ? U.pcity : 'erbil', x: '', y: '' };
    U.placeGeo = TK.isGeo(p0) ? { lat: p0.lat, lng: p0.lng } : null;
    // خانەکان لە U.pf هەڵدەگیرێن بۆ ئەوەی دوای هەڵبژاردنی شوێن لەسەر نەخشە ون نەبن
    U.pf = { name: p0.name, kind: p0.kind, city: p0.city || 'erbil', x: p0.x ?? '', y: p0.y ?? '' };
    TK.sheet(() => {
      const p = U.pf;
      return `<div class="h2">${id ? 'دەستکاری شوێن' : 'شوێنی نوێ'}</div>
      <div class="form-grid">${input('p-name', 'ناو', p.name, { full: true })}${select('p-city', 'شار', p.city || 'erbil', TK.cities().map((c) => [c.id, c.name]))}${select('p-kind', 'جۆر', p.kind, KINDS)}${input('p-x', 'x (کم)', p.x ?? '', { type: 'number', ltr: true, step: '0.5' })}${input('p-y', 'y (کم)', p.y ?? '', { type: 'number', ltr: true, step: '0.5' })}</div>
      <div class="card flat row">${icon('pin', 20, U.placeGeo ? 'var(--ok-text)' : 'var(--muted)')}<div class="grow sm">${U.placeGeo ? `لەسەر نەخشە دیاری کراوە <span class="latin xs muted">${U.placeGeo.lat.toFixed(5)}, ${U.placeGeo.lng.toFixed(5)}</span>` : 'هێشتا لەسەر نەخشە دیاری نەکراوە'}</div><button class="btn sm secondary" data-act="placeMap">${U.placeGeo ? 'گۆڕین' : 'دیاریکردن'}</button>${U.placeGeo ? `<button class="btn sm ghost" data-act="placeMapClear" aria-label="لابردن">${icon('x', 14)}</button>` : ''}</div>
      <button class="btn block" data-act="savePlace" data-arg="${id || ''}">پاشەکەوت</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.placeMap = async () => {
    U.pf = { name: val('p-name'), kind: val('p-kind'), city: val('p-city'), x: val('p-x'), y: val('p-y') };
    const name = U.pf.name.trim();
    const r = await TK.pickLocation({ title: name || 'شوێن', center: U.placeGeo, q: U.placeGeo ? '' : name });
    if (r) U.placeGeo = { lat: +r.lat.toFixed(6), lng: +r.lng.toFixed(6) };
    TK.sheet.refresh();
  };
  acts.placeMapClear = () => {
    U.placeGeo = null;
    TK.sheet.refresh();
  };
  /** دیاریکردنی خێرای شوێنێک لەسەر نەخشە لە خشتەکەوە */
  acts.pinPlaceAdm = async (id) => {
    const p = TK.place(id);
    if (!p) return;
    const r = await TK.pickLocation({ title: p.name, q: p.name });
    if (!r) return;
    TK.update((s) => {
      if (!s.places || !s.places.length) s.places = JSON.parse(JSON.stringify(TK.PLACES_DEFAULTS));
      const x = s.places.find((y) => y.id === id);
      if (x) Object.assign(x, { lat: +r.lat.toFixed(6), lng: +r.lng.toFixed(6) });
    });
    TK.toast('شوێنەکە لەسەر نەخشە دیاری کرا');
  };
  acts.savePlace = (id) => {
    const name = val('p-name').trim();
    if (name.length < 2) return TK.toast('ناو بنووسە');
    const x = val('p-x') === '' ? null : +val('p-x');
    const y = val('p-y') === '' ? null : +val('p-y');
    const g = U.placeGeo;
    TK.update((s) => {
      if (!s.places || !s.places.length) s.places = JSON.parse(JSON.stringify(TK.PLACES_DEFAULTS));
      const data = { name, kind: val('p-kind'), city: val('p-city'), x, y, lat: g ? g.lat : null, lng: g ? g.lng : null };
      if (id) Object.assign(s.places.find((p) => p.id === id), data);
      else s.places.push({ id: 'p' + TK.uid(), ...data });
    });
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };
  acts.delPlace = async (id) => {
    if (!(await TK.ask('ئەم شوێنە لادەبرێت؟'))) return;
    TK.update((s) => {
      s.places = (s.places && s.places.length ? s.places : JSON.parse(JSON.stringify(TK.PLACES_DEFAULTS))).filter((p) => p.id !== id);
    });
  };

  /* =========================================================
   * یاسا و ڕێکخستن
   * ======================================================= */
  /** بیرخستنەوەی هەفتانەی پاشەکەوت (تەنها کاتێک زانیاری هەبێت) */
  const backupDue = () => {
    const s = S();
    if (!s.drivers.length && !s.accounts.length) return false;
    return !s.lastBackupAt || Date.now() - s.lastBackupAt > 7 * 864e5;
  };
  TK.backupDue = backupDue;
  const RULES = [
    ['نرخ و کۆمیسیۆن', [
      ['commission', 'کۆمیسیۆنی یەکسا', '%'],
      ['basePrice', 'نرخی بنەڕەتی مانگانە', 'دینار'],
      ['perKm', 'نرخ بۆ هەر کیلۆمەترێک', 'دینار'],
      ['offerRange', 'ڕێژەی گۆڕینی نرخ لەلایەن شۆفێر', '%'],
      ['oneWayFactor', 'نرخی یەک ئاراستە (لە نرخی تەواو)', '%'],
      ['privateFactor', 'نرخی تەکسی تایبەت', '%'],
      ['familyFactor', 'نرخی خێزان بە تەنها', '%'],
      ['kidsFactor', 'نرخی گەشتی منداڵان', '%'],
      ['extraRiderFactor', 'نرخی کەسی دووەم بەدواوە', '%'],
    ]],
    ['سزا، قەرەبوو و پاداشت', [
      ['noShowPenalty', 'سزای نەهاتنی شۆفێر', 'دینار'],
      ['noShowCreditMin', 'کەمترین قەرەبووی سەرنشین', 'دینار'],
      ['bonusAmount', 'پاداشتی مانگانەی شۆفێر', 'دینار'],
      ['bonusDays', 'ڕۆژی کار بۆ پاداشت', 'ڕۆژ'],
      ['debtLimit', 'سنووری قەرزی شۆفێر', 'دینار'],
      ['pointsPer1000', 'خاڵی پاداشت بۆ هەر ١٠٠٠ دینار', 'خاڵ'],
    ]],
    ['کات', [
      ['skipCutoffMin', '«نایەم» تا چەند خولەک پێش گەشت', 'خولەک'],
      ['requestHours', 'ماوەی داواکاری', 'کاتژمێر'],
      ['startEarlyMin', 'شۆفێر چەند خولەک پێش کات دەتوانێت «بەڕێ کەوتم» بکات (٠ = بێ سنوور)', 'خولەک'],
      ['autoCloseMin', 'داخستنی خۆکاری گەشتێک کە لەبیر کراوە (٠ = هەرگیز)', 'خولەک'],
      ['absentWaitMin', 'شۆفێر چەند خولەک چاوەڕێی سەرنشین بکات پێش «نەهات»', 'خولەک'],
      ['nearAlertM', 'ئاگادارکردنەوەی «شۆفێرەکەت نزیکە» لە چەند مەترەوە (٠ = هەرگیز)', 'مەتر'],
    ]],
    ['ڕۆت (تەکسی هاوبەش)', [
      ['stopMin', 'ماوەی نێوان دوو وێستگە', 'خولەک'],
      ['poolWindowMin', 'زۆرترین جیاوازی کاتی سەرنشینانی یەک ڕۆت', 'خولەک'],
    ]],
    ['شۆفێر و بەڵگەنامە', [
      ['minDriverAge', 'کەمترین تەمەنی شۆفێر', 'ساڵ'],
      ['minCarYear', 'کۆنترین ساڵی دروستکردنی ئۆتۆمبێل', 'ساڵ'],
      ['expiryWarnDays', 'ئاگادارکردنەوە پێش بەسەرچوونی بەڵگەنامە', 'ڕۆژ'],
      ['securityValidDays', 'ماوەی دروستبوونی کۆدی ئاسایش', 'ڕۆژ'],
    ]],
  ];
  // ئەو ڕێژانەی بە بەراورد بە نرخی ئاسایین (١٠٠٪ = هەمان نرخ)
  const FACTOR = ['oneWayFactor', 'privateFactor', 'familyFactor', 'kidsFactor', 'extraRiderFactor'];
  const PCT = ['commission', 'offerRange', 'oneWayFactor', 'privateFactor', 'familyFactor', 'kidsFactor', 'extraRiderFactor'];
  TK.route('settings', {
    guard,
    render() {
      const c = TK.CONFIG;
      return layout('settings', 'یاسا و ڕێکخستن', `
        <div class="xs muted">هەر گۆڕانکارییەک دەستبەجێ لە هەموو ئەپەکان جێبەجێ دەکرێت. بۆ نموونە گۆڕینی کۆمیسیۆن یەکسەر لە داهاتی شۆفێران دەردەکەوێت.</div>
        <div class="cols">${RULES.map(([title, rows]) => `<div class="card col"><div class="h3">${title}</div><div class="form-grid rules">${rows.map(([k, l, unit]) => {
          const v = PCT.includes(k) ? Math.round(c[k] * 100) : c[k];
          const hints = [];
          if (FACTOR.includes(k)) hints.push(v > 100 ? `واتە ${v - 100}٪ زیاتر لە نرخی ئاسایی` : v < 100 ? `واتە ${100 - v}٪ کەمتر لە نرخی ئاسایی` : 'هەمان نرخی ئاسایی');
          if (c[k] !== TK.CONFIG_DEFAULTS[k]) hints.push(`بنەڕەت: ${PCT.includes(k) ? Math.round(TK.CONFIG_DEFAULTS[k] * 100) : fmt.group(TK.CONFIG_DEFAULTS[k])}`);
          return input('cfg-' + k, l, unit === 'دینار' ? fmt.group(v) : v, { unit: unit === '%' ? '٪' : unit || 'ژمارە', attrs: 'data-input="cfgDirty"', hint: hints.join('، ') });
        }).join('')}</div></div>`).join('')}</div>
        <div class="savebar ${U.cfgDirty ? 'dirty' : ''}" id="savebar">
          <span class="sm grow">${U.cfgDirty ? 'گۆڕانکارییەکان هێشتا پاشەکەوت نەکراون' : 'هەموو یاساکانی سەرەوە پێکەوە پاشەکەوت دەکرێن'}</span>
          <button class="btn secondary sm" data-act="resetRules">گەڕاندنەوە بۆ بنەڕەت</button>
          <button class="btn sm" data-act="saveRules">${icon('check', 18, 'currentColor', 2.4)}پاشەکەوتی یاساکان</button>
        </div>
        <div class="card col"><div class="h3">شێوازەکانی وەرگرتنی موچەی شۆفێر</div>
          <div class="xs muted">شۆفێر لە ئەپەکەی خۆیەوە یەکێک لەمانە هەڵدەبژێرێت. هەر کاتێک گۆڕی، ئاگادار دەکرێیتەوە.</div>
          <div class="list">${TK.payMethods().map((m) => `<div class="item"><div class="ico-box">${icon('wallet', 18, 'var(--brand)')}</div><div class="grow"><b class="sm">${esc(m.name)}</b><div class="xs muted">${m.account === false ? 'بێ ژمارەی حیساب' : 'ژمارەی حیساب پێویستە'}، ${S().drivers.filter((d) => d.payMethod === m.id).length} شۆفێر</div></div>${ui.toggle('payMethodOn', m.on !== false, m.id)}</div>`).join('')}</div>
          <div class="row wrap" style="gap:8px"><input class="input grow" id="pm-name" style="min-height:42px;min-width:160px" placeholder="ناوی شێوازی نوێ، بۆ نموونە: Zain Cash"><label class="row sm" style="gap:6px"><input type="checkbox" id="pm-acc" checked>ژمارەی حیساب پێویستە</label><button class="btn sm" data-act="addPayMethod">${icon('plus', 16)}زیادکردن</button></div>
        </div>
        <div class="cols">
          <div class="card col"><div class="h3">ئەکاونتی بەڕێوەبەر</div>
            <div class="sm muted">ئیمەیڵ: <b class="latin">${esc((TK.cloud.user || {}).email || '')}</b></div>
            ${input('adm-old', 'وشەی نهێنی ئێستا', '', { type: 'password', ltr: true })}
            ${input('adm-pass', 'وشەی نهێنی نوێ', '', { type: 'password', ltr: true, ph: 'لانیکەم ٨ پیت' })}
            <button class="btn sm secondary" data-act="saveAdminPass">گۆڕینی وشەی نهێنی</button></div>
          <div class="card col ${backupDue() ? 'red-notice' : ''}"><div class="h3" style="${backupDue() ? 'color:var(--danger-text)' : ''}">پاشەکەوتی زانیارییەکان (Backup)</div>
            <div class="sm muted">هەموو زانیارییەکان لە Firebase هەڵگیراون. بۆ دڵنیایی زیاتر، هەفتەی جارێک فایلێکی پاشەکەوت دابگرە و لە شوێنێکی پارێزراو هەڵیبگرە (وێنەکان لەناو فایلەکەدا نین).</div>
            <div class="sm">دوایین پاشەکەوت: <b>${S().lastBackupAt ? fmt.ago(S().lastBackupAt) : 'هێشتا نەکراوە'}</b></div>
            <div class="row wrap" style="gap:8px">
              <button class="btn sm ${backupDue() ? '' : 'secondary'}" data-act="exportData">${icon('download', 16)}داگرتنی فایلی پاشەکەوت</button>
              <label class="btn sm secondary">${icon('plus', 16)}گەڕاندنەوە لە فایل<input type="file" accept="application/json" data-change="importData" style="display:none"></label>
            </div>
            <div class="danger-zone"><span class="xs muted grow">سڕینەوەی هەموو زانیارییەکان لە Firebase: شۆفێر، سەرنشین و حیساب (هەژمارەکانی چوونەژوورەوە لە Authentication دەمێننەوە)</span><button class="btn sm danger" data-act="wipeAll">سڕینەوەی هەمووی</button></div></div>
          <div class="card col"><div class="h3">ڕووکار</div>${ui.settingsCard()}</div>
        </div>`);
    },
  });
  acts.saveRules = () => {
    const next = {};
    RULES.forEach(([, rows]) => rows.forEach(([k]) => {
      const raw = String(val('cfg-' + k)).replace(/[,٬\s]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      if (raw === '') return;
      let v = +raw;
      if (isNaN(v)) return;
      if (PCT.includes(k)) v = v / 100;
      if (v !== TK.CONFIG_DEFAULTS[k]) next[k] = v;
    }));
    U.cfgDirty = false;
    TK.update((s) => {
      s.config = next;
    });
    TK.toast('یاساکان پاشەکەوت کران');
  };
  /** نیشاندانی «پاشەکەوت نەکراوە» بێ نوێکردنەوەی شاشە */
  acts.cfgDirty = () => {
    if (U.cfgDirty) return;
    U.cfgDirty = true;
    const b = document.getElementById('savebar');
    if (b) {
      b.classList.add('dirty');
      b.querySelector('span').textContent = 'گۆڕانکارییەکان هێشتا پاشەکەوت نەکراون';
    }
  };
  acts.resetRules = async () => {
    if (!(await TK.ask('هەموو یاساکان دەگەڕێنەوە بۆ بنەڕەت؟'))) return;
    TK.update((s) => {
      s.config = {};
    });
  };
  const ensurePay = (s) => {
    if (!s.payMethods || !s.payMethods.length) s.payMethods = JSON.parse(JSON.stringify(TK.PAY_METHODS_DEFAULTS));
    return s.payMethods;
  };
  acts.payMethodOn = (id) => {
    const on = TK.payMethods().filter((m) => m.on !== false);
    const m = TK.payMethod(id);
    if (m && m.on !== false && on.length <= 1) return TK.toast('دەبێت لانیکەم یەک شێواز چالاک بێت');
    TK.update((s) => {
      const x = ensurePay(s).find((y) => y.id === id);
      if (x) x.on = x.on === false;
    });
  };
  acts.addPayMethod = () => {
    const name = String(val('pm-name') || '').trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    if (TK.payMethods().some((m) => m.name.toLowerCase() === name.toLowerCase())) return TK.toast('ئەم ناوە هەیە');
    const acc = !!(document.getElementById('pm-acc') || {}).checked;
    TK.update((s) => {
      ensurePay(s).push({ id: 'pm' + TK.uid(), name, on: true, account: acc });
    });
    TK.toast('زیاد کرا');
  };
  acts.ackPay = (id) => {
    actions.ackPayChange(id);
    TK.toast('پشتڕاست کرایەوە');
  };
  acts.saveAdminPass = async (a, el) => {
    const done = TK.busyBtn(el);
    const err = await actions.adminChangePassword(String(val('adm-old')), String(val('adm-pass')));
    done();
    if (err) return TK.toast(err);
    TK.toast('وشەی نهێنی گۆڕدرا');
    TK.render();
  };
  acts.exportData = async () => {
    TK.update((s) => {
      s.lastBackupAt = Date.now();
    });
    const data = JSON.parse(JSON.stringify(S()));
    delete data.settings;
    const blob = new Blob([JSON.stringify({ ...data, cloud: 1 })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yeksa-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  acts.importData = (v, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const data = JSON.parse(r.result);
        // فایلی وەشانە کۆنەکان (بێ سێرڤەر) ناگونجێن، چونکە هەژمارەکان لەسەر Firebase نین
        if (!data || !data.cloud) return TK.toast('ئەم فایلە هی وەشانی کۆنە (بێ سێرڤەر) و ناگونجێت');
        if (!(await TK.ask('هەموو زانیارییەکانی ئێستا لە Firebase دەگۆڕدرێن.'))) return;
        delete data.cloud;
        delete data.__images;
        data.settings = S().settings;
        data.routes = data.routes || [];
        TK.update(() => data);
        TK.toast('بارکرا');
      } catch (e) {
        TK.toast('فایلەکە دروست نییە');
      }
    };
    r.readAsText(f);
  };

  TK.start({
    home: 'dash',
    validBack: (p) => p !== 'login',
    watch: (s) => (isAuthed() ? s.reports.filter((r) => r.status === 'open').map((r) => ({ id: r.id, kind: 'offer', title: 'ڕاپۆرتی نوێ: شۆفێر نەهات', body: `${r.by}، ${(s.drivers.find((d) => d.id === r.driverId) || {}).name || ''}`, link: 'reports' }))
      .concat(s.drivers.filter((d) => d.status === 'pending').map((d) => ({ id: 'pd' + d.id, kind: 'info', title: 'شۆفێری نوێ داوای تۆمارکردنی کردووە', body: d.name, link: `driver/${d.id}` }))) : []),
  });
})();
