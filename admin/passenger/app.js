/* تەکسیەکەم، ئەپی سەرنشین */
(function () {
  'use strict';
  // ستایلی مۆدێرنی هاوبەش لەگەڵ ئەپی شۆفێر (drv) و ڕێکخستنی تایبەتی سەرنشین (pas)
  document.documentElement.classList.add('drv', 'pas');
  const { ui, fmt, sel, actions, esc, sim } = TK;
  const icon = TK.icon;
  const S = () => TK.get();
  const U = TK.app.ui; // باری کاتی شاشەکان (تاب، هەنگاو...)
  const acts = TK.app.acts;

  /* ---------- خوارەوەی ئەپ ---------- */
  function nav(active) {
    const waiting = S().requests.filter((r) => r.owner === 'me' && r.status === 'open' && r.offers.some((o) => o.status === 'pending')).length;
    return ui.nav(
      [
        { key: 'home', path: 'home', icon: 'home', label: 'سەرەکی' },
        { key: 'trips', path: 'trips', icon: 'route', label: 'گەشتەکان' },
        { key: 'subs', path: 'subs', icon: 'calendar', label: 'بەژداری', badge: waiting || '' },
        { key: 'inbox', path: 'inbox', icon: 'chat', label: 'نامەکان', badge: sel.unreadMsgsP() || '' },
        { key: 'profile', path: 'profile', icon: 'user', label: 'پرۆفایل' },
      ],
      active
    );
  }
  const authed = () => {
    const p = S().passenger;
    if (!p.loggedIn) return p.onboarded ? 'login' : 'onboard';
    return null;
  };
  const page = (body, active, cls = '') => `<div class="screen ${active ? '' : 'no-nav'} ${cls}">${body}</div>${active ? nav(active) : ''}`;

  /* =========================================================
   * سپلاش، ناساندن، چوونەژوورەوە
   * ======================================================= */
  TK.route('splash', {
    render: () => `<div class="splash"><img src="../shared/logo.png" alt=""><div class="h1">تەکسیەکەم</div><div class="sm" style="opacity:.75">هاتووچۆی مانگانە بۆ هەموو خێزان</div></div>`,
    after: () => setTimeout(() => TK.go(authed() || 'home', true), 1100),
  });

  const ONB = [
    { t: 'تەکسی مانگانە بۆ هەموو خێزان', s: 'یەک جار بەژداری بکە. هەموو ڕۆژێک شۆفێرێکی ناسراو لەکاتی خۆیدا دێت.', i: 'calendar', th: 'th-amber', f: [['car', '٧:٣٠ بەیانی'], ['check', 'یەکشەممە تا پێنجشەممە']] },
    { t: 'بە لایڤ ببینە لە کوێیە', s: 'کاتێک منداڵەکەت سوار دەبێت و دەگات ئاگادار دەکرێیتەوە، و ڕێگاکە لەسەر نەخشە دەبینیت.', i: 'route', th: 'th-navy', f: [['bell', 'ئارام سوار بوو'], ['clock', '٥ خولەکی ماوە']] },
    { t: 'شۆفێری پشکنراو، پیاو و ئافرەت', s: 'هەموو شۆفێرەکان پشکنینی پێشینەیان بۆ کراوە. بۆ ئافرەتان و منداڵان شۆفێری ئافرەت هەیە.', i: 'shield', th: 'th-violet', f: [['woman', 'شۆفێری ئافرەت'], ['star', '٤.٩ هەڵسەنگاندن']] },
  ];
  /** وێنەی ناساندن: ئایکۆنی سەرەکی لەگەڵ بازنە و دوو کارتی بچووک */
  /** وێنەی ناساندن: ساکار و پاک، ئایکۆنێکی هێڵی لە بازنەیەکی کاڵ و دوو نیشانەی بچووک */
  const onbArt = (o) => `<div class="onb2">
      <div class="onb2-ic">${icon(o.i, 64, 'var(--text)', 1.4)}</div>
      <div class="onb2-pills">${o.f.map(([ic, l]) => `<span>${icon(ic, 15, 'var(--brand)', 2.2)}${l}</span>`).join('')}</div>
    </div>`;
  TK.route('onboard', {
    render() {
      const i = U.onb || 0;
      const o = ONB[i];
      return page(`
        <div class="row between"><span></span><button class="link" data-act="onbSkip">تێپەڕاندن</button></div>
        ${onbArt(o)}
        <div class="col" style="gap:6px;margin-top:8px"><div class="h1">${o.t}</div><div class="muted">${o.s}</div></div>
        <div class="dots" style="justify-content:flex-start">${ONB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <div style="flex:1"></div>
        <button class="btn block lg" data-act="onbNext">${i < ONB.length - 1 ? 'دواتر' : 'دەست پێبکە'}</button>`, null, 'onb');
    },
  });
  acts.onbNext = () => {
    const i = U.onb || 0;
    if (i < ONB.length - 1) {
      U.onb = i + 1;
      TK.render();
    } else acts.onbSkip();
  };
  acts.onbSkip = () => {
    actions.finishOnboarding();
    TK.go('login', true);
  };

  TK.route('login', {
    render() {
      return page(`
        <div class="col center" style="align-items:center;gap:8px;padding-top:20px">
          <img src="../shared/logo.png" alt="" style="width:84px;height:84px;border-radius:24px;background:#fff;padding:6px;box-shadow:var(--shadow)">
          <div class="h1">بەخێربێیتەوە</div>
          <div class="muted sm">بە ژمارەی مۆبایل و وشەی نهێنی بچۆ ژوورەوە</div>
        </div>
        <form class="col" data-submit="doLogin" style="gap:12px">
          <div class="field"><label for="lp">ژمارەی مۆبایل</label>
            <div class="input-wrap"><span class="prefix latin">+964</span><input class="input ltr latin" id="lp" name="phone" inputmode="tel" autocomplete="tel" placeholder="750 123 4567"></div></div>
          <div class="field"><label for="lw">وشەی نهێنی</label>
            <div class="pass-wrap"><input class="input ltr latin" id="lw" name="pass" type="${U.showPass ? 'text' : 'password'}" autocomplete="current-password" placeholder="••••••">
            <button type="button" class="eye" data-act="togglePass" aria-label="${U.showPass ? 'شاردنەوەی وشەی نهێنی' : 'پیشاندانی وشەی نهێنی'}">${icon(U.showPass ? 'eyeOff' : 'eye', 20)}</button></div></div>
          <div class="row" style="justify-content:flex-end"><button type="button" class="link" data-act="forgot">وشەی نهێنیت لەبیر چووە؟</button></div>
          ${U.loginErr ? `<div class="err">${esc(U.loginErr)}</div>` : ''}
          <button class="btn block" type="submit">چوونەژوورەوە</button>
        </form>
        <div class="center sm">ئەکاونتت نییە؟ <button class="link" data-go="register">ئەکاونتی نوێ دروست بکە</button></div>`);
    },
  });
  acts.togglePass = () => {
    U.showPass = !U.showPass;
    TK.render();
  };
  acts.forgot = () => TK.sheet(() => `<div class="h2">وشەی نهێنیت لەبیر چووە؟</div>
      <div class="sm muted" style="line-height:1.9">پەیوەندی بە تیمی پشتگیری تەکسیەکەم بکە بۆ یارمەتی.</div>
      <button class="btn ghost block" data-close>باشە</button>`);
  acts.doLogin = async (f, form) => {
    if (U.busy) return;
    const done = TK.busyBtn(form);
    const err = await actions.login(f.phone || '', f.pass || '');
    done();
    U.loginErr = err;
    if (err) return TK.render();
    TK.toast('بەخێربێیتەوە');
    TK.go('home', true);
  };

  TK.route('register', {
    render(params, query) {
      // لینک یان QRی هاوبەش: passenger/#/register?ref=NAMUNA
      if (query && query.ref) U.ref = String(query.ref).toUpperCase();
      const pt = U.ref ? TK.partnerByCode(U.ref) : null;
      return page(`
        ${ui.header('ئەکاونتی نوێ', { back: 'login', sub: 'تەنها یەک خولەک دەخایەنێت' })}
        ${pt ? `<div class="card info row">${icon(pt.type === 'company' ? 'briefcase' : 'school', 22)}<div class="grow"><b>لە ڕێگەی ${esc(pt.name)}ەوە</b><div class="xs">کۆد: <span class="latin">${esc(pt.code)}</span></div></div></div>` : ''}
        <form class="col" data-submit="doRegister" style="gap:12px">
          <div class="field"><label for="rn">ناوی تەواو</label><input class="input" id="rn" name="name" autocomplete="name" placeholder="ناو و ناوی باوک"></div>
          <div class="field"><label for="rp">ژمارەی مۆبایل</label>
            <div class="input-wrap"><span class="prefix latin">+964</span><input class="input ltr latin" id="rp" name="phone" inputmode="tel" placeholder="750 000 0000"></div></div>
          <div class="field"><label for="rw">وشەی نهێنی</label><div class="pass-wrap"><input class="input ltr latin" id="rw" name="pass" type="${U.showPass ? 'text' : 'password'}" autocomplete="new-password" placeholder="لانیکەم ٦ پیت"><button type="button" class="eye" data-act="togglePass" aria-label="پیشاندانی وشەی نهێنی">${icon(U.showPass ? 'eyeOff' : 'eye', 20)}</button></div></div>
          <div class="field"><label for="rgender">ڕەگەز</label><select class="input" id="rgender" name="gender"><option value="">هەڵبژێرە</option><option value="m">نێر</option><option value="f">مێ</option></select><span class="xs muted">کاتێک لە تەکسییەکی هاوبەشدایت، سەرنشینانی تر تەنها ناوی یەکەم و ڕەگەزت دەبینن</span></div>
          <div class="field"><label for="rcity">شار</label><select class="input" id="rcity" name="city">${TK.cities().map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
          ${U.ref || U.showRef ? `<div class="field"><label for="rref">کۆدی قوتابخانە، زانکۆ یان کۆمپانیا</label><input class="input ltr latin" id="rref" name="ref" autocapitalize="characters" placeholder="CODE" value="${esc(U.ref || '')}" style="text-transform:uppercase"></div>` : `<button type="button" class="link sm" data-act="showRef" style="align-self:flex-start">کۆدی قوتابخانە یان کۆمپانیات هەیە؟</button>`}
          ${U.regErr ? `<div class="err">${esc(U.regErr)}</div>` : ''}
          <button class="btn block" type="submit">دروستکردنی ئەکاونت</button>
          <div class="xs muted center">بە دروستکردنی ئەکاونت ڕازی دەبیت بە <button type="button" class="link xs" data-act="showTerms">مەرج و ڕێساکان و پاراستنی زانیاری</button></div>
        </form>`);
    },
  });
  acts.showRef = () => {
    U.showRef = true;
    TK.render();
  };
  acts.doRegister = async (f, form) => {
    if (U.busy) return;
    const done = TK.busyBtn(form);
    const err = await actions.register(f.name || '', f.phone || '', f.pass || '', f.ref || '', f.city || 'erbil', f.gender || '');
    done();
    U.regErr = err;
    if (err) return TK.render();
    TK.toast('ئەکاونتەکەت دروست کرا');
    TK.go('home', true);
  };

  /* =========================================================
   * سەرەکی
   * ======================================================= */
  /** ناوی یەکەم و ڕەگەزی هاوڕێکانی تەکسی (هیچ زانیارییەکی تر نا) */
  const sexLabel = (p) => (p.kid ? (p.w === 1 ? 'کچ' : p.w === 0 ? 'کوڕ' : 'منداڵ') : p.w === 1 ? 'مێ' : p.w === 0 ? 'نێر' : '');
  const personChip = (p) => `<span class="pchip ${p.w === 1 ? 'f' : p.w === 0 ? 'm' : ''}">${esc(p.n)}${sexLabel(p) ? `<i>${sexLabel(p)}</i>` : ''}</span>`;
  function coLine(t) {
    const co = TK.coRiders(t).filter((c) => !c.mine);
    if (!co.length) return '';
    const ppl = [].concat(...co.map((c) => c.people));
    return `<div class="row wrap sm" style="gap:6px">${icon('users', 16, 'var(--muted)')}<span class="muted">لەگەڵت:</span>${ppl.map(personChip).join('')}</div>`;
  }
  /** کارتی «کێ لەگەڵمە» لە پەڕەی گەشت */
  function coRidersCard(t) {
    const co = TK.coRiders(t);
    if (co.filter((c) => !c.mine).length === 0) return '';
    const others = co.filter((c) => !c.mine).reduce((n, c) => n + c.people.length, 0);
    const mine = co.find((c) => c.mine);
    const before = mine ? co.filter((c) => !c.mine && c.order < mine.order && !c.done).length : 0;
    return `<div class="card col">
      <div class="row"><div class="ico-box info">${icon('users', 20, 'var(--info-text)')}</div><div class="grow"><b>تەکسی هاوبەش، ${others} کەسی تر لەگەڵتن</b><div class="xs muted">بە ڕیزی سوارکردن. تەنها ناوی یەکەم پیشان دەدرێت</div></div></div>
      <div class="co-list">${co.map((c) => `<div class="co-row ${c.mine ? 'me' : ''} ${c.absent ? 'absent' : c.done ? 'done' : ''}"><span class="co-n">${c.order}</span><span class="grow row wrap" style="gap:6px">${c.mine ? '<b>تۆ</b>' : ''}${c.people.map(personChip).join('')}</span>${c.absent ? ui.badge('نەهات', 'danger') : c.done ? `<span class="xs ok bold">سوار بوو</span>` : ''}</div>`).join('')}</div>
      ${t.status !== 'done' && mine && !mine.done && before ? `<div class="xs muted">شۆفێر سەرەتا ${before} وێستگە دەڕوات، پاشان دێت بۆ لای تۆ</div>` : ''}
    </div>`;
  }
  function tripCard(t) {
    const d = sel.driver(t.driverId);
    const names = sel.names(t.memberIds);
    const isKids = t.kind === 'kids';
    const lead = sel.member(t.memberIds[0]) || {};
    if (t.status === 'active') {
      const ni = sim.next(t);
      return `<div class="card big col tap" data-go="track/${t.id}">
        <div class="row">
          ${ui.avatar(lead.initial || 'ت', 'amber')}
          <div class="grow"><div class="bold">${esc(fmt.names(names))}، بۆ ${esc(TK.dest(t))}</div><div class="sm muted">${esc(d.name)}، ${isKids ? 'گەشتی منداڵان' : t.kind === 'private' ? 'تایبەت' : 'هاوبەش'}</div></div>
          ${ui.badge('لە ڕێگەیە', 'ok')}
        </div>
        ${ui.map(t, { mine: true, tag: `<span class="live-dot"></span>لایڤ` })}
        ${coLine(t)}
        <div class="row between">
          <div class="sm">${ni >= 0 ? (TK.ownStop(t, t.stops[ni]) ? `داهاتوو: <b>${esc(t.stops[ni].place)}</b>` : 'شۆفێر لای هاوڕێکانتە') : ''}<div class="muted">${sim.waiting(t) ? 'دەگاتە لات' : 'گەیشتن'}: <b class="brand" data-live-eta="${t.id}">${fmt.clock(sim.eta(t))}</b>، <span data-live-min="${t.id}">${sim.minutesLeft(t)}</span> خولەک</div></div>
          <button class="btn sm" data-go="track/${t.id}">بینینی لایڤ</button>
        </div>
      </div>`;
    }
    return `<div class="card row tap" data-go="track/${t.id}">
      ${ui.avatar(lead.initial || 'ت', lead.woman ? 'woman' : '')}
      <div class="grow">
        <div class="bold" style="font-size:.95rem">${esc(fmt.names(names))}، ${esc(TK.dest(t))}</div>
        <div class="row wrap sm muted" style="gap:6px">${esc(d.name)}${d.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}</div>
      </div>
      <div class="col tight" style="align-items:flex-end"><b class="${t.status === 'skipped' ? 'muted strike' : 'brand'}">${fmt.clock(t.time)}</b>${t.status === 'skipped' ? ui.badge('نایەن', 'danger') : t.status === 'absent' ? ui.badge('سوار نەبوون', 'danger') : `<span class="xs muted">${t.status === 'done' ? 'تەواو بوو' : t.originalDriverId ? 'جێگرەوە' : t.runId ? `هاوبەش، ${TK.coRiders(t).filter((c) => !c.mine).reduce((n, c) => n + c.people.length, 0) + t.memberIds.length} کەس` : 'چاوەڕێ'}</span>`}</div>
    </div>`;
  }

  /** گەشتی داهاتوو: ئەمڕۆ (ئەگەر ماوە) یان بەیانی، بە پێی بەژداری و ڕۆت */
  function upcoming() {
    const now = fmt.hhmm(Date.now());
    const today = sel.myTrips().filter((t) => t.status === 'scheduled').sort((a, b) => a.time.localeCompare(b.time));
    const t = today.find((x) => x.time >= now) || null;
    if (t) return { when: 'today', time: t.time, trip: t, sub: sel.sub(t.subId), dir: t.dir, pooled: !!t.runId };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const out = [];
    sel.mySubs().filter((x) => x.status === 'active' && TK.dayApplies(x, d)).forEach((x) => ['go', 'back'].forEach((dir) => {
      const base = TK.subTime(x, dir);
      if (!base) return;
      let time = base;
      const r = (S().routes || []).find((y) => y.dir === dir && y.subIds.includes(x.id));
      if (r) {
        const subs = r.subIds.map((id) => sel.sub(id)).filter((y) => y && y.status === 'active' && TK.dayApplies(y, d));
        const st = TK.routeStops(r, subs).find((y) => y.kind === 'pickup' && y.subIds.includes(x.id));
        if (st) time = st.time;
      }
      out.push({ when: 'tomorrow', time, sub: x, dir, pooled: !!r });
    }));
    return out.sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }
  /** کارتی گەشتی داهاتوو لە سەرەکی (گرنگترین شت بۆ سەرنشین) */
  function nextCard() {
    const n = upcoming();
    if (!n || !n.sub) return '';
    const x = n.sub;
    const d = sel.driver((n.trip && n.trip.driverId) || x.driverId);
    const leg = TK.subLeg(x, n.dir);
    const can = n.trip && TK.canSkip(n.trip);
    return `<div class="card col nextcard">
      <div class="row between"><span class="nc-when">${icon('calendar', 15, 'currentColor', 2.2)}${n.when === 'today' ? 'گەشتی داهاتوو، ئەمڕۆ' : 'گەشتی داهاتوو، بەیانی'}</span>${n.pooled ? ui.badge('تەکسی هاوبەش', 'info') : ''}</div>
      <div class="row nc-main" ${n.trip ? `data-go="track/${n.trip.id}"` : ''}>
        <div class="nc-time"><b>${fmt.clockBare(n.time)}</b><small>${fmt.period(n.time)}</small></div>
        <div class="grow" style="min-width:0"><b>${esc(x.riderNames)}</b><div class="sm muted ellipsis">${esc(leg.from.split('، ')[0])} ← ${esc(leg.to.split('، ')[0])}</div></div>
      </div>
      ${dHead(d, { go: `driver/${d.id}` })}
      <div class="row" style="gap:8px">
        ${can ? `<button class="btn sm secondary grow" data-act="skipTrip" data-arg="${n.trip.id}">${icon('x', 16)}نایەم</button>` : ''}
        <button class="btn sm secondary grow" data-go="chat/${d.id}">${icon('chat', 16)}نامە</button>
        ${n.trip ? `<button class="btn sm secondary grow" data-go="track/${n.trip.id}">وردەکاری</button>` : `<button class="btn sm secondary grow" data-go="trips">گەشتەکان</button>`}
      </div>
    </div>`;
  }
  /** دوای گەشت: داوای هەڵسەنگاندن لە سەرەکی */
  function rateNudge() {
    const t = sel.myTrips().filter((x) => x.status === 'done' && !x.ratedByPassenger).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))[0];
    if (!t) return '';
    const d = sel.driver(t.driverId) || {};
    return `<button class="card row tap" data-go="track/${t.id}" style="text-align:right">${icon('star', 26, 'var(--amber)', 1.5, 'var(--amber)')}<div class="grow"><b>گەشتەکە لەگەڵ ${esc((d.name || '').split(' ')[0])} چۆن بوو؟</b><div class="xs muted">هەڵسەنگاندنەکەت یارمەتی شۆفێرە باشەکان دەدات</div></div>${icon('forward', 18, 'var(--muted)')}</button>`;
  }
  TK.route('home', {
    guard: authed,
    render() {
      const s = S();
      const p = s.passenger;
      const trips = sel.myTrips().sort((a, b) => (a.status === 'active' ? -1 : b.status === 'active' ? 1 : a.time.localeCompare(b.time)));
      const allNews = sel.newsFor('passenger');
      const ads = allNews.filter((n) => sel.newsKind(n) === 'ad');
      const offerList = allNews.filter((n) => sel.newsKind(n) === 'offer');
      const openReqs = s.requests.filter((r) => r.owner === 'me' && r.status === 'open');
      const offers = openReqs.reduce((n, r) => n + r.offers.filter((o) => o.status === 'pending').length, 0);
      const unread = sel.unread();
      const swap = s.notices.find((n) => n.kind === 'swap');
      const isEmpty = !sel.mySubs().length && !openReqs.length;
      const first = p.name.split(' ')[0];

      return page(`
        <div class="topbar">
          <button class="icon-btn plain" data-go="profile" aria-label="پرۆفایل">${ui.avatar(first.slice(0, 1), 'navy', 40)}</button>
          <div class="brandmark"><img src="../shared/logo.png" alt=""><span class="name">تەکسیەکەم</span></div>
          <button class="icon-btn" data-go="notices" aria-label="ئاگادارکردنەوەکان">${icon('bell', 22)}${unread ? `<span class="dot-badge">${unread}</span>` : ''}</button>
        </div>
        ${ui.carousel(ads, { bleed: true })}

        ${offers ? `<div class="card note row tap" data-go="${openReqs.length === 1 ? 'request/' + openReqs[0].id : 'requests'}">
            <div class="ico-box" style="background:var(--amber)">${icon('tag', 20, '#0B1733')}</div>
            <div class="grow"><b>${offers} شۆفێر نرخیان بۆ ناردوویت</b><div class="sm muted">بیانبینە و یەکێکیان هەڵبژێرە</div></div>${icon('forward', 20)}
          </div>` : openReqs.length ? `<div class="card row tap" data-go="requests">
            <div class="ico-box">${icon('hourglass', 20, 'var(--brand)')}</div>
            <div class="grow"><b>داواکارییەکەت بڵاو کراوەتەوە</b><div class="sm muted">چاوەڕێی وەڵامی شۆفێرەکانین</div></div>${icon('forward', 20)}
          </div>` : ''}

        ${p.gender ? '' : `<div class="card note col"><b>ڕەگەزت دیاری بکە</b><span class="sm muted">کاتێک لە تەکسییەکی هاوبەشدایت، سەرنشینانی تر ناوی یەکەم و ڕەگەزت دەبینن.</span><div class="grid2"><button class="btn secondary" data-act="setGender" data-arg="m">نێر</button><button class="btn secondary" data-act="setGender" data-arg="f">مێ</button></div></div>`}
        ${isEmpty ? `<div class="card big col" style="background:var(--note-bg);border-color:var(--note-line)">
            <div class="row top">
              <div class="grow col tight"><div class="h3">هێشتا هیچ گەشتێکت نییە!</div><div class="sm muted">یەکەم بەژداری مانگانەت دروست بکە. شوێن و کات دیاری بکە، و شۆفێرەکان نرخت بۆ دەنێرن.</div></div>
              <div class="ico-box" style="width:64px;height:64px;background:var(--amber)">${icon('car', 36, '#0B1733', 1.6)}</div>
            </div>
            <button class="btn block" data-act="newSub">${icon('plus', 20, 'currentColor', 2.2)}یەکەم بەژداری</button>
          </div>` : ''}

        ${/* گەشتی لایڤ (کاتێک شۆفێر بەڕێ کەوتووە) یان گەشتی داهاتوو */ ''}
        ${trips.filter((t) => t.status === 'active').map(tripCard).join('') || nextCard()}
        ${rateNudge()}

        ${isEmpty || sel.mySubs().length ? '' : `<button class="btn block lg" data-act="newSub">${icon('plus', 20, 'currentColor', 2.4)}بەژداری نوێ</button>`}
        <div class="grid2">
          <button class="card qtile tap" data-go="family">${icon('users', 22, 'var(--text)', 1.9)}<span class="grow">خێزان</span>${icon('forward', 16, 'var(--muted)')}</button>
          <button class="card qtile tap" data-go="drivers">${icon('car', 22, 'var(--text)', 1.9)}<span class="grow">شۆفێرەکان</span>${icon('forward', 16, 'var(--muted)')}</button>
        </div>

        ${swap && sel.mySubs().length ? `<div class="card note row top">${icon('swap', 20, 'var(--brand)')}<div class="grow sm"><b>${esc(swap.title)}</b><div>${esc(swap.body)}</div></div></div>` : ''}

        ${!s.billing.paid && TK.invoice(s).total ? `<div class="card row tap" data-go="billing">
            <div class="ico-box info">${icon('wallet', 20, 'var(--info-text)')}</div>
            <div class="grow"><b>فاتورەی ${esc(s.billing.month)} ئامادەیە</b><div class="sm muted">${fmt.money(TK.invoice(s).total)}</div></div>${icon('forward', 20, 'var(--muted)')}
          </div>` : ''}
        ${offerList.length ? `<div class="section-title"><div class="h3">ئۆفەرەکان</div><button class="link" data-go="offers">هەمووی</button></div>` : ''}
        ${offerList.slice(0, 3).map((n) => `<div class="card news-card tap" data-go="news/${n.id}">${ui.newsThumb(n, 72)}<div class="grow col tight"><span>${ui.badge(n.tag, 'note')}</span><b style="font-size:.95rem">${esc(n.title)}</b><span class="xs muted">${esc(n.sub)}</span></div></div>`).join('')}
      `, 'home');
    },
    after: () => TK.initCarousel(),
  });

  /* =========================================================
   * ئاگادارکردنەوە و هەواڵ
   * ======================================================= */
  TK.route('notices', {
    guard: authed,
    render() {
      const s = S();
      const tab = U.ntab || 'all';
      const groups = { all: null, trips: ['ride', 'drop', 'driver', 'swap', 'chat'], offers: ['offer', 'info'], pay: ['pay'] };
      const list = groups[tab] ? s.notices.filter((n) => groups[tab].includes(n.kind)) : s.notices;
      if (!U.noticeReadAt) U.noticeReadAt = s.readNoticesAt;
      return page(`
        ${ui.header('ئاگادارکردنەوەکان', { back: 'home' })}
        <div class="tabs">${[['all', 'هەمووی'], ['trips', 'گەشت'], ['offers', 'داواکاری'], ['pay', 'پارەدان']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="ntab" data-arg="${k}">${l}</button>`).join('')}</div>
        ${ui.noticeList(list, U.noticeReadAt)}`);
    },
    after() {
      if (sel.unread()) setTimeout(() => actions.markNoticesRead(), 400);
    },
  });
  acts.ntab = (k) => {
    U.ntab = k;
    TK.render();
  };

  const newsList = (kind, title) => ({
    guard: authed,
    render() {
      const list = sel.newsFor('passenger').filter((n) => sel.newsKind(n) === kind);
      return page(`
        ${ui.header(title, { back: 'home' })}
        ${list.length ? list.map((n) => `<div class="card news-card tap" data-go="news/${n.id}">${ui.newsThumb(n)}<div class="grow col tight"><span>${ui.badge(n.tag, 'note')}</span><b>${esc(n.title)}</b><span class="sm muted">${esc(n.sub)}</span></div></div>`).join('') : ui.empty(kind === 'offer' ? 'tag' : 'news', kind === 'offer' ? 'ئێستا هیچ ئۆفەرێک نییە' : 'ئێستا هیچ هەواڵێک نییە', kind === 'offer' ? 'کاتێک داشکاندن یان ئۆفەرێکی نوێ هات، لێرە و لە سەرەکی دەیبینیت' : 'هەواڵ و ڕێکلامە نوێکان لێرە دەردەکەون', '<button class="btn secondary" data-go="home">گەڕانەوە بۆ سەرەکی</button>')}`);
    },
  });
  TK.route('news', newsList('ad', 'ڕێکلام و هەواڵ'));
  TK.route('offers', newsList('offer', 'ئۆفەرەکان'));
  TK.route('news/:id', {
    guard: authed,
    render({ id }) {
      const n = S().news.find((x) => x.id === id);
      if (!n) return page(ui.header('هەواڵ', { back: 'news' }) + ui.empty('news', 'ئەم هەواڵە نەدۆزرایەوە', ''));
      const cta = { w1: ['بەژداری نوێ', 'newSub'], w2: ['بەژداری نوێ', 'newSub'], w3: ['زیادکردنی ئەندام', 'goFamily'], w5: ['کۆدی بانگهێشت', 'goRewards'] }[n.id];
      return page(`
        ${ui.header(n.tag, { back: sel.newsKind(n) === 'offer' ? 'offers' : 'news' })}
        ${n.image && TK.img(n.image)
          ? `<div class="news-photo"><img src="${TK.img(n.image)}" alt=""><div class="news-photo-t"><span class="badge" style="background:rgba(255,255,255,.28);color:#fff">${esc(n.tag)}</span><div class="h2">${esc(n.title)}</div><div class="sm">${esc(n.sub)}</div></div></div>`
          : `<div class="news-hero th-${n.theme}">
          <div style="position:absolute;left:14px;top:14px;opacity:.9">${n.big ? `<span class="big" style="font-size:3.6rem;font-weight:700;display:block;text-align:center">${ui.bigHtml(n.big)}</span>` : icon(n.icon, 84, 'currentColor', 1.3)}</div>
          <span class="badge" style="background:rgba(255,255,255,.25);color:inherit;align-self:flex-start">${esc(n.tag)}</span>
          <div class="h2">${esc(n.title)}</div><div class="sm" style="opacity:.9">${esc(n.sub)}</div>
        </div>`}
        <div style="font-size:1.02rem;line-height:1.9">${esc(n.body)}</div>
        ${n.until ? `<div class="row sm muted">${icon('clock', 16)}${esc(n.until)}</div>` : ''}
        ${n.code ? `<div class="code-box"><div><div class="xs muted">کۆدی داشکاندن</div><div class="code latin">${esc(n.code)}</div></div><button class="btn sm secondary" data-act="copy" data-arg="${esc(n.code)}">${icon('copy', 18)}کۆپی</button></div>` : ''}
        ${cta ? `<button class="btn block" data-act="${cta[1]}">${cta[0]}</button>` : ''}`);
    },
    after: ({ id }) => actions.markNewsSeen(id),
  });
  acts.goFamily = () => TK.go('family');
  acts.goRewards = () => TK.go('rewards');

  /* =========================================================
   * چاودێری لایڤ و چات
   * ======================================================= */
  TK.route('track/:id', {
    guard: authed,
    render({ id }) {
      const t = sel.trip(id);
      if (!t) return page(ui.header('گەشت', { back: 'home' }) + ui.empty('route', 'ئەم گەشتە نەدۆزرایەوە', ''));
      const d = sel.driver(t.driverId);
      const ni = sim.next(t);
      const status = t.status === 'noshow' ? ui.badge('شۆفێر نەهات', 'danger') : t.status === 'absent' ? ui.badge('سوار نەبوون', 'danger') : t.status === 'skipped' ? ui.badge('نایەن', 'danger') : t.status === 'active' ? ui.badge('لە ڕێگەیە', 'ok') : t.status === 'done' ? ui.badge('گەیشت', 'ok') : ui.badge(`دەست پێدەکات ${fmt.clock(t.time)}`, 'note');
      return page(`
        ${ui.header(t.title, { back: 'home', right: `<button class="icon-btn sosbtn" data-act="sos" aria-label="فریاکەوتن">${icon('shield', 22, 'currentColor', 2.2)}</button>` })}
        <div class="row" style="margin-top:-8px">${status}${t.runId ? ui.badge('تەکسی هاوبەش', 'info') : ''}</div>
        ${ui.map(t, { tall: true, mine: true, tag: t.status === 'active' ? '<span class="live-dot"></span>لایڤ' : '' })}
        ${t.status === 'active' ? `<div class="card navy row">
            <div class="grow"><div class="sm" style="opacity:.8">${sim.waiting(t) ? 'شۆفێر دەگاتە لات' : `کاتی گەیشتن بە ${esc(TK.dest(t))}`}</div><div class="h1"><span data-live-eta="${t.id}" data-bare>${fmt.clockBare(sim.eta(t))}</span> <span class="sm" style="opacity:.8">${fmt.period(sim.eta(t))}</span></div></div>
            <div class="center"><div class="h1" style="color:var(--amber)" data-live-min="${t.id}">${sim.minutesLeft(t)}</div><div class="xs" style="opacity:.8">خولەک</div></div>
          </div>` : ''}
        ${t.status === 'absent' ? `<div class="card danger col tight"><b>شۆفێر لە وێستگەکەت چاوەڕێی کرد و کەس نەهات</b><span class="sm">چونکە پێشتر «نایەم»ت نەکردبوو، ئەم گەشتە وەک کراو حیساب دەکرێت. ئەگەر هەڵەیە، نامە بۆ شۆفێر بنێرە یان لە پشتگیری ڕاپۆرت بکە.</span></div>` : ''}
        ${t.status === 'done' && !t.ratedByPassenger ? rateCard(t) : ''}
        ${coRidersCard(t)}
        ${t.originalDriverId && !t.swapOk && t.status === 'scheduled' ? `<div class="card note col">
            <div class="row">${icon('swap', 20, 'var(--brand)')}<b class="grow">شۆفێری جێگرەوە بۆ ئەم گەشتە</b></div>
            <div class="sm">${esc(sel.driver(t.originalDriverId).name)} ناتوانێت بێت. ${esc(d.name)} لە جیاتی ئەو دێت. زانیارییەکانی لە خوارەوەیە.</div>
            <div class="row" style="gap:8px"><button class="btn sm secondary grow" data-act="rejectSwap" data-arg="${t.id}">ڕەتکردنەوە</button><button class="btn sm grow" data-act="approveSwap" data-arg="${t.id}">${icon('check', 16, 'currentColor', 2.4)}ڕازیم</button></div>
          </div>` : ''}
        <div class="card col">
          ${dHead(d, { go: `driver/${d.id}` })}
          <div class="row" style="gap:8px">
            <a class="btn navy grow" href="tel:0${esc(d.phone)}">${icon('phone', 20)}پەیوەندی بە ${esc(d.name.split(' ')[0])}</a>
            <button class="btn secondary" data-go="chat/${d.id}" aria-label="نامە" style="position:relative">${icon('chat', 20)}نامە${unreadFrom(d.id) ? `<span class="dot-badge">${unreadFrom(d.id)}</span>` : ''}</button>
          </div>
        </div>
        <div class="card"><div class="h3" style="margin-bottom:10px">وێستگەکان</div><div class="timeline">
          ${t.stops.map((x, i) => {
            // وێستگەی هاوڕێکانی تەکسی: شوێن نیشان نادرێت، تەنها ناوی یەکەم
            const own = TK.ownStop(t, x);
            const mineRiders = own && x.parts ? x.parts.filter((p) => p.subId === t.subId).map((p) => p.riders).join('، ') : x.riders;
            return `<div class="tl ${x.done ? 'done' : i === ni && t.status === 'active' ? 'now' : ''} ${own ? '' : 'other'}"><div class="dot"><i></i></div><div class="grow">
            <div class="row between"><b style="font-size:.95rem">${own ? esc(x.place) : `${x.kind === 'pickup' ? 'سوارکردنی' : 'دابەزاندنی'} هاوڕێکانت`}</b><span class="sm ${x.done ? 'ok' : 'muted'}">${x.done ? (x.absent ? 'نەهات' : fmt.clock(fmt.hhmm(x.doneAt)) + ' ✓') : fmt.clock(x.time)}</span></div>
            <div class="xs muted">${own ? `${x.kind === 'pickup' ? 'سوار بوون' : 'دابەزین'}، ${esc(mineRiders)}` : (x.people || []).map((p) => esc(p.n)).join('، ')}</div>
            ${own && x.arrivedAt && !x.done ? `<div class="xs ok bold">شۆفێر گەیشتووە، ${fmt.clock(fmt.hhmm(x.arrivedAt))}</div>` : ''}</div></div>`;
          }).join('')}
        </div></div>
        ${t.status === 'scheduled' ? `<button class="btn ghost block sm" data-act="noShow" data-arg="${t.id}">${icon('alert', 16)}شۆفێر نەهات؟</button>` : ''}
        <button class="btn secondary block" data-act="shareTrip" data-arg="${t.id}">${icon('share', 18)}هاوبەشکردنی گەشت</button>`);
    },
  });
  acts.approveSwap = (id) => {
    actions.approveSwap(id);
    TK.toast('سوپاس، جێگرەوەکە پەسەند کرا');
  };
  acts.rejectSwap = async (id) => {
    if (!(await TK.ask('جێگرەوەکە ڕەت دەکرێتەوە و شۆفێری خۆت ئاگادار دەکرێتەوە کە دەبێت خۆی بێت.', { yes: 'ڕەتکردنەوە' }))) return;
    actions.rejectSwap(id);
    TK.toast('ڕەتکرایەوە. شۆفێرەکەت ئاگادار کرایەوە');
  };
  acts.noShow = (id) => {
    const t = sel.trip(id);
    const late = TK.minutesUntil(t.time);
    TK.sheet(() => `<div class="h2">شۆفێر نەهات؟</div>
      <div class="sm muted">${late > 0 ? `کاتی گەشتەکە ${fmt.clock(t.time)}ـە و هێشتا ${late} خولەکی ماوە. ` : ''}ئەگەر ڕاپۆرت بکەیت، قەرەبوو خۆکار بۆ فاتورەکەت زیاد دەکرێت و شۆفێر سزا دەدرێت. تیمی تەکسیەکەم ڕاپۆرتەکە دەپشکنێت.</div>
      <div class="field"><label for="nsnote">تێبینی (ئارەزوومەندانە)</label><textarea class="input" id="nsnote" placeholder="بۆ نموونە: ٢٠ خولەک چاوەڕێمان کرد"></textarea></div>
      <button class="btn block" style="background:var(--danger);color:#fff" data-act="confirmNoShow" data-arg="${id}">ناردنی ڕاپۆرت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.confirmNoShow = (id) => {
    actions.reportNoShow(id, (document.getElementById('nsnote') || {}).value || '');
    TK.closeSheet();
    TK.toast('ڕاپۆرت تۆمار کرا و قەرەبوو زیاد کرا');
  };
  function rateCard(t) {
    const r = U.rate || { stars: 5, tags: [] };
    const TAGS = ['لەکاتی خۆیدا', 'ئارام لێدەخوڕێت', 'ئۆتۆمبێلی پاک', 'ڕێزدار', 'ئاگاداری منداڵ بوو'];
    return `<div class="card col">
      <div class="h3">گەشتەکە چۆن بوو؟</div>
      <div class="row" style="gap:6px;justify-content:center">${[1, 2, 3, 4, 5].map((n) => `<button data-act="rateStar" data-arg="${n}" aria-label="${n}">${icon('star', 34, 'var(--amber)', 1.5, n <= r.stars ? 'var(--amber)' : 'none')}</button>`).join('')}</div>
      <div class="chips">${TAGS.map((g) => `<button class="chip ${r.tags.includes(g) ? 'on' : ''}" data-act="rateTag" data-arg="${g}">${g}</button>`).join('')}</div>
      <button class="btn block" data-act="sendRate" data-arg="${t.id}">ناردنی هەڵسەنگاندن، +٢٠ خاڵ</button>
    </div>`;
  }
  acts.rateStar = (n) => {
    U.rate = U.rate || { stars: 5, tags: [] };
    U.rate.stars = +n;
    TK.render();
  };
  acts.rateTag = (g) => {
    U.rate = U.rate || { stars: 5, tags: [] };
    U.rate.tags = U.rate.tags.includes(g) ? U.rate.tags.filter((x) => x !== g) : [...U.rate.tags, g];
    TK.render();
  };
  acts.sendRate = (id) => {
    const r = U.rate || { stars: 5, tags: [] };
    actions.rateDriver(id, r.stars, r.tags);
    U.rate = null;
    TK.toast('سوپاس! ٢٠ خاڵ زیاد کرا');
  };
  const unreadFrom = (driverId) => S().messages.filter((m) => m.peer === 'me' && m.driverId === driverId && m.fromDriver && !m.readP).length;
  acts.sos = () => {
    TK.sheet(() => `
      <div class="h2">فریاکەوتن</div>
      <div class="muted">شوێنی ئێستای گەشتەکە بۆ سەرپەرشتیارەکانی خێزان و تیمی تەکسیەکەم دەنێردرێت.</div>
      <div class="grid2">
        <a class="btn danger-solid lg" href="tel:104">${icon('phone', 18)}پۆلیس ١٠٤</a>
        <a class="btn danger-solid lg" href="tel:122">${icon('phone', 18)}فریاگوزاری ١٢٢</a>
      </div>
      <button class="btn secondary block" data-act="sosTeam">ئاگادارکردنەوەی تیمی تەکسیەکەم</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.sosTeam = () => {
    TK.closeSheet();
    TK.toast('تیمی تەکسیەکەم ئاگادار کرا و پەیوەندیت پێوە دەکات');
  };
  /** هاوبەشکردنی دەق (یان کۆپی ئەگەر مۆبایل پشتگیری نەکات) */
  const shareText = (text) => (navigator.share ? navigator.share({ title: 'تەکسیەکەم', text }).catch(() => {}) : acts.copy(text));
  acts.shareTrip = (id) => {
    const t = sel.trip(id);
    shareText(`${t.title}، گەیشتن نزیکەی ${fmt.clock(sim.eta(t))}، تەکسیەکەم`);
  };

  /* =========================================================
   * هەموو گەشتەکانی ئەمڕۆ (نایەم / مەیە)
   * ======================================================= */
  TK.route('trips', {
    guard: authed,
    render() {
      const trips = sel.myTrips().sort((a, b) => a.time.localeCompare(b.time));
      const pending = trips.filter((t) => t.status === 'scheduled');
      return page(`
        <div><div class="h1">گەشتەکانی ئەمڕۆ</div><div class="sm muted">${fmt.today()}</div></div>
        <div class="card info row top sm">${icon('help', 18)}<span>ئەگەر ئەمڕۆ کەسێک نایەت، «نایەم» دابگرە. شۆفێرەکە دەستبەجێ ئاگادار دەکرێتەوە و پێویست ناکات بێت.</span></div>
        ${trips.length ? trips.map((t) => {
          const d = sel.driver(t.driverId);
          const names = fmt.names(sel.names(t.memberIds));
          const st = { active: ui.badge('لە ڕێگەیە', 'ok'), done: ui.badge('تەواو بوو', 'ok'), skipped: ui.badge('نایەن', 'danger'), noshow: ui.badge('شۆفێر نەهات', 'danger'), absent: ui.badge('سوار نەبوون', 'danger'), scheduled: ui.badge(t.dir === 'back' ? 'هاتنەوە' : 'چوون', 'note') }[t.status] || '';
          return `<div class="card col tripcard">
            <div class="row tap" data-go="track/${t.id}">
              <div class="ico-box ${t.status === 'skipped' ? 'danger' : ''}">${icon(t.dir === 'back' ? 'home' : t.kind === 'kids' ? 'school' : 'car', 20, 'var(--brand)')}</div>
              <div class="grow"><b>${esc(names)}، ${esc(TK.dest(t))}</b><div class="xs muted">${fmt.time(t.time)}، ${esc(d.name)}${t.originalDriverId ? ' (جێگرەوە)' : ''}${t.runId ? '، تەکسی هاوبەش' : ''}</div></div>${st}
            </div>
            ${t.status === 'scheduled' ? (TK.canSkip(t) ? `<div class="row" style="gap:8px"><button class="btn sm secondary grow" data-act="skipTrip" data-arg="${t.id}">${icon('x', 16)}نایەم</button><button class="btn sm secondary" data-go="chat/${d.id}">${icon('chat', 16)}</button></div>` : `<div class="row between"><span class="xs muted">کەمتر لە ${TK.CONFIG.skipCutoffMin} خولەک ماوە، «نایەم» ناکرێت. نامە بۆ شۆفێر بنێرە.</span><button class="btn sm secondary" data-go="chat/${d.id}">${icon('chat', 16)}</button></div>`) : ''}
            ${t.status === 'skipped' ? `<div class="row between"><span class="xs muted">${t.skipReason ? esc(t.skipReason) : 'شۆفێر ئاگادار کرایەوە'}</span><button class="btn sm secondary" data-act="unskip" data-arg="${t.id}">دەیەم</button></div>` : ''}
          </div>`;
        }).join('') : ui.empty('calendar', 'ئەمڕۆ هیچ گەشتێکت نییە', sel.mySubs().length ? 'گەشتەکانی بەیانی لە سەرەکی دەبینیت' : 'بەژدارییەکی مانگانە دروست بکە و هەموو ڕۆژێک شۆفێرەکەت دێت', sel.mySubs().length ? '<button class="btn secondary" data-go="home">سەرەکی</button>' : '<button class="btn" data-act="newSub">بەژداری نوێ</button>')}
        ${pending.length > 1 ? `<button class="btn ghost block" data-act="skipAll">ئەمڕۆ هیچ کەسێک نایەت</button>` : ''}
        <div class="xs muted center">«نایەم» تا ${TK.CONFIG.skipCutoffMin} خولەک پێش کاتی گەشت دەکرێت. نرخی مانگانە ناگۆڕێت.</div>
        <button class="card row tap" style="text-align:right" data-go="history">${icon('clock', 20, 'var(--brand)')}<span class="grow bold">گەشتە کۆنەکان</span>${icon('forward', 18, 'var(--muted)')}</button>`, 'trips');
    },
  });
  acts.skipTrip = (id) => {
    const t = sel.trip(id);
    // گەشتی هاوڕێی ئەم گەشتە (چوون ← هاتنەوە) لە هەمان بەژداری
    const pair = S().trips.find((x) => x.id !== t.id && x.subId && x.subId === t.subId && x.status === 'scheduled');
    U.skip = { ids: [t.id], pair: pair ? pair.id : null, mode: 'this', reason: '' };
    TK.sheet(() => {
      const k = U.skip;
      const tt = sel.trip(k.ids[0]);
      if (!tt) return null;
      const names = fmt.names(sel.names(tt.memberIds));
      const REASONS = ['نەخۆشە', 'پشووە', 'خۆمان دەیبەین', 'گەشتمان هەیە'];
      const opts = [{ v: 'this', l: tt.dir === 'back' ? 'تەنها هاتنەوە' : 'تەنها چوون' }];
      if (k.pair) opts.push({ v: 'both', l: 'چوون و هاتنەوە' });
      return `<div class="h2">${esc(names)} ئەمڕۆ نایەن؟</div>
        <div class="sm muted">شۆفێرەکە ئاگادار دەکرێتەوە و بۆ ئەم گەشتە نایەت.</div>
        ${opts.length > 1 ? ui.seg('skipMode', opts, k.mode) : ''}
        <div class="field"><label>هۆکار (ئارەزوومەندانە)</label><div class="chips">${REASONS.map((r) => `<button class="chip ${k.reason === r ? 'on' : ''}" data-act="skipReason" data-arg="${r}">${r}</button>`).join('')}</div></div>
        <button class="btn danger block" style="background:var(--danger);color:#fff" data-act="confirmSkip">ناردن بۆ شۆفێر</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.skipMode = (v) => {
    U.skip.mode = v;
    TK.sheet.refresh();
  };
  acts.skipReason = (r) => {
    U.skip.reason = U.skip.reason === r ? '' : r;
    TK.sheet.refresh();
  };
  acts.confirmSkip = () => {
    const k = U.skip;
    const ids = k.mode === 'both' && k.pair ? [k.ids[0], k.pair] : k.ids;
    if (!TK.canSkip(sel.trip(k.ids[0]))) {
      TK.closeSheet();
      return TK.toast(`کەمتر لە ${TK.CONFIG.skipCutoffMin} خولەک ماوە. نامە بۆ شۆفێر بنێرە`);
    }
    actions.skipTrips(ids, k.reason);
    TK.closeSheet();
    TK.toast('شۆفێر ئاگادار کرایەوە');
  };
  acts.unskip = (id) => {
    const err = actions.unskipTrip(id);
    if (err) return TK.toast(err);
    TK.toast('شۆفێر ئاگادار کرایەوە کە دێن');
  };
  acts.skipAll = async () => {
    if (!(await TK.ask('هەموو گەشتە ماوەکانی ئەمڕۆ هەڵدەوەشێنرێنەوە و شۆفێرەکان ئاگادار دەکرێنەوە.'))) return;
    const bySub = {};
    sel.myTrips().filter((t) => t.status === 'scheduled').forEach((t) => (bySub[t.subId || t.id] = (bySub[t.subId || t.id] || []).concat(t.id)));
    Object.values(bySub).forEach((ids) => actions.skipTrips(ids, ''));
    TK.toast('هەموو شۆفێرەکان ئاگادار کرانەوە');
  };

  /* =========================================================
   * گەشتەکانم (مێژوو)
   * ======================================================= */
  TK.route('history', {
    guard: authed,
    render() {
      const list = S().history.slice().sort((a, b) => b.date - a.date);
      let lastDay = '';
      return page(`
        ${ui.header('گەشتەکانم', { back: 'profile', sub: `${list.length} گەشتی تەواوبوو` })}
        ${list.length ? list.map((h) => {
          const d = sel.driver(h.driverId) || {};
          const day = fmt.date(h.date);
          const sep = day !== lastDay ? `<div class="sm bold muted" style="margin-top:4px">${day}</div>` : '';
          lastDay = day;
          const first = h.stops[0];
          const last = h.stops[h.stops.length - 1];
          if (h.absent) {
            return `${sep}<div class="card row tap" data-go="history/${h.id}">
            <div class="ico-box danger">${icon('x', 20, 'var(--danger-text)', 2.4)}</div>
            <div class="grow"><b>${esc(fmt.names(sel.names(h.memberIds)) || h.tripTitle)}</b>
              <div class="xs" style="color:var(--danger-text)">سوار نەبوون، حیساب کرا</div>
              <div class="xs muted">${esc(d.name || '')} ${h.waited || ''} خولەک لە ${esc(first.place)} چاوەڕێی کرد</div></div>
            ${icon('forward', 18, 'var(--muted)')}
          </div>`;
          }
          return `${sep}<div class="card row tap" data-go="history/${h.id}">
            <div class="ico-box ok">${icon('check', 20, 'var(--ok-text)', 2.4)}</div>
            <div class="grow"><b>${esc(fmt.names(sel.names(h.memberIds)) || h.tripTitle)}</b>
              <div class="xs muted">${esc(first.place)} ← ${esc(last.place)}</div>
              <div class="xs muted">${esc(d.name || '')}، سوار بوون ${fmt.clock(fmt.hhmm(first.doneAt))}، گەیشتن ${fmt.clock(fmt.hhmm(last.doneAt))}</div></div>
            ${icon('forward', 18, 'var(--muted)')}
          </div>`;
        }).join('') : ui.empty('clock', 'هێشتا هیچ گەشتێکت نییە', 'دوای هەر گەشتێک لێرە دەبینیت کەی سوار بوون و کەی گەیشتن')}`);
    },
  });
  TK.route('history/:id', {
    guard: authed,
    render({ id }) {
      const h = S().history.find((x) => x.id === id);
      if (!h) return page(ui.header('گەشت', { back: 'history' }) + ui.empty('clock', 'نەدۆزرایەوە', ''));
      const d = sel.driver(h.driverId) || {};
      const orig = h.originalDriverId ? sel.driver(h.originalDriverId) : null;
      const first = h.stops[0];
      const last = h.stops[h.stops.length - 1];
      const dur = Math.max(1, Math.round((last.doneAt - first.doneAt) / 60000));
      const ev = [];
      if (h.startedAt) ev.push({ at: h.startedAt, t: `${d.name} دەستی بە گەشت کرد`, ic: 'route' });
      h.stops.forEach((x) => {
        if (x.arrivedAt) ev.push({ at: x.arrivedAt, t: `تەکسی گەیشتە ${x.place}`, ic: 'pin' });
        if (x.absent) return ev.push({ at: x.doneAt, t: `کەس نەهات، شۆفێر ڕۆیشت`, ic: 'x' });
        ev.push({ at: x.doneAt, t: x.kind === 'pickup' ? `${x.riders} سوار بوون، ${x.place}` : `${x.riders} دابەزین، ${x.place}`, ic: x.kind === 'pickup' ? 'car' : 'check' });
      });
      ev.sort((a, b) => a.at - b.at);
      return page(`
        ${ui.header(h.tripTitle, { back: 'history', sub: fmt.date(h.date) })}
        <div class="card row">${ui.dAvatar(d, 48)}<div class="grow"><b>${esc(d.name || '')}</b><div class="xs muted">${esc(d.car || '')}، ${esc(d.plate || '')}</div>${orig ? `<div class="xs brand">جێگرەوەی ${esc(orig.name)}</div>` : ''}</div><button class="btn sm secondary" data-go="chat/${d.id}">${icon('chat', 16)}</button></div>
        ${h.absent ? `<div class="card danger col tight"><b>سوار نەبوون</b><span class="sm">شۆفێر ${h.waited || ''} خولەک چاوەڕێی کرد. چونکە پێشتر «نایەم» نەکرابوو، ئەم گەشتە وەک کراو حیساب کرا.</span></div>` : `<div class="grid3">
          <div class="card stat"><b>${fmt.clock(fmt.hhmm(first.doneAt))}</b><span class="xs muted">سوار بوون</span></div>
          <div class="card stat"><b>${fmt.clock(fmt.hhmm(last.doneAt))}</b><span class="xs muted">گەیشتن</span></div>
          <div class="card stat"><b>${dur}</b><span class="xs muted">خولەک</span></div>
        </div>`}
        <div class="card"><div class="h3" style="margin-bottom:10px">ڕووداوەکان</div><div class="timeline">
          ${ev.map((e) => `<div class="tl done"><div class="dot"><i></i></div><div class="grow row between"><span class="sm">${esc(e.t)}</span><b class="sm">${fmt.clock(fmt.hhmm(e.at))}</b></div></div>`).join('')}
        </div></div>
        <div class="card col tight"><div class="sm muted">سەرنشینەکان</div><b>${esc(fmt.names(sel.names(h.memberIds)))}</b></div>
        <button class="btn ghost block" data-go="support">${icon('help', 18)}کێشەیەک لەم گەشتەدا هەبوو؟</button>`);
    },
  });

  /* ---------- نامەکان ---------- */
  TK.route('inbox', {
    guard: authed,
    render() {
      const s = S();
      const threads = sel.threadsP();
      // ئەو شۆفێرانەی بەژداریت لەگەڵیان هەیە بەڵام هێشتا نامەت نەناردووە
      const subDrivers = [...new Set(sel.mySubs().map((x) => x.driverId))].filter((id) => !threads.some((t) => t.driverId === id));
      return page(`
        <div class="topbar"><div class="h1">نامەکان</div>${sel.unreadMsgsP() ? ui.badge(`${sel.unreadMsgsP()} نەخوێندراوە`, 'amber') : ''}</div>
        ${ui.threads(threads, false, (t) => {
          const d = sel.driver(t.driverId);
          const sub = sel.mySubs().find((x) => x.driverId === t.driverId);
          return { name: d.name, sub: sub ? `${fmt.names(sel.names(sub.memberIds))}، ${sub.to}` : d.car, link: `chat/${d.id}`, avatar: ui.dAvatar(d, 48), online: d.id !== s.driver.meId || s.driver.online };
        })}
        ${subDrivers.length ? `<div class="section-title"><div class="h3">شۆفێرەکانت</div></div>
          <div class="list">${subDrivers.map((id) => {
            const d = sel.driver(id);
            return `<div class="item tap" data-go="chat/${d.id}">${ui.dAvatar(d, 44)}<div class="grow"><b>${esc(d.name)}</b><div class="xs muted">${esc(d.car)}</div></div><span class="btn sm secondary">${icon('chat', 16)}نامە</span></div>`;
          }).join('')}</div>` : ''}
        <div class="card info row top sm">${icon('help', 18)}<span>بۆ ناردنی نامە بۆ شۆفێرێکی نوێ، پرۆفایلەکەی بکەرەوە و «نامە» دابگرە.</span></div>`, 'inbox');
    },
  });

  function threadHtml(driverId) {
    return ui.chat(S().messages.filter((m) => m.peer === 'me' && m.driverId === driverId), false);
  }
  TK.route('chat/:id', {
    guard: authed,
    render({ id }) {
      const s = S();
      const d = sel.driver(id);
      if (!d) return page(ui.header('نامە', { back: 'inbox' }) + ui.empty('chat', 'شۆفێرەکە نەدۆزرایەوە', ''));
      const QUICK = ['باشە، سوپاس', 'ئامادەین', '٥ خولەک چاوەڕێ بکە', 'ئەمڕۆ نایەین', 'لە بەردەم دەرگاین'];
      return `<div class="screen" style="padding-bottom:150px">
        ${ui.header(d.name, { back: 'inbox', sub: d.car, right: `<a class="icon-btn" href="tel:0${esc(d.phone)}" aria-label="پەیوەندی">${icon('phone', 20)}</a>` })}
        <div class="card col tight">
          <div class="row between"><span class="sm">ژمارەی شۆفێر</span><a class="latin bold" href="tel:0${esc(d.phone)}" dir="ltr">${fmt.phone(d.phone)}</a></div>
          <div class="row between"><span class="sm">ژمارەکەت بۆ شۆفێر شاراوەیە</span>${icon('lock', 16, 'var(--muted)')}</div>
        </div>
        <div id="thread">${threadHtml(d.id)}</div>
      </div>
      <div class="composer">
        <div class="quick">${QUICK.map((q) => `<button data-act="quickMsg" data-arg="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form class="row" data-submit="sendMsg" style="gap:8px">
          <input class="input" id="msg" name="text" placeholder="نامە بنووسە..." autocomplete="off" enterkeyhint="send" style="min-height:46px">
          <button class="btn" style="min-height:46px;padding:0 14px" aria-label="ناردن">${icon('send', 20)}</button>
        </form>
      </div>`;
    },
    partial({ id }) {
      const el = document.getElementById('thread');
      if (el) {
        el.innerHTML = threadHtml(id);
        TK.localizeDigits(el);
        window.scrollTo(0, document.body.scrollHeight);
      }
      actions.markThreadRead(id, 'me', false);
    },
    after({ id }) {
      window.scrollTo(0, document.body.scrollHeight);
      setTimeout(() => actions.markThreadRead(id, 'me', false), 300);
    },
  });
  function sendText(text) {
    const id = TK.app.current.params.id;
    const t = text.trim();
    if (!t) return;
    actions.sendMessage(id, 'me', t, false);
    const el = document.getElementById('msg');
    if (el) el.value = '';
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  }
  acts.sendMsg = (f) => sendText(f.text || '');
  acts.quickMsg = (q) => sendText(q);
  acts.toggleShare = () => {
    const v = !S().passenger.sharePhone;
    actions.setSharePhone(v);
    TK.toast(v ? 'ژمارەکەت بۆ شۆفێرەکانت دیار دەبێت' : 'ژمارەکەت شاردرایەوە');
  };

  /* =========================================================
   * بەژداری نوێ (٣ هەنگاو)
   * ======================================================= */
  /** بەرواری ئەمڕۆ + n ڕۆژ بە شێوەی 2026-11-01 */
  function isoDay(n) {
    const d = new Date(Date.now() + n * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function newDraft(prefDriver) {
    const s = S();
    return {
      step: 1, memberIds: s.family.members.length === 1 ? [s.family.members[0].id] : [], mode: 'one', rideType: 'shared', womanOnly: false,
      fromId: s.passenger.homeId || 'azadi', fromNote: '', toId: '', toNote: '', go: '07:30',
      // شوێنی ماڵ لەسەر نەخشە (ئەگەر پێشتر دیاری کرابێت)
      fromGeo: s.passenger.homeId && s.pins && s.pins._home ? s.pins._home : null, toGeo: null, dir: 'both', backTime: '14:00', startDate: isoDay(1),
      days: [false, true, true, true, true, true, false], note: '', prefDriver: prefDriver || null,
    };
  }
  acts.newSub = (pref) => {
    U.draft = newDraft(pref);
    TK.go('new');
  };
  /** ئایا هەموو زانیارییەکانی بەژداری پڕکراونەتەوە */
  const draftReady = (dr) => !!(dr && dr.memberIds.length && dr.fromId && dr.toId && dr.days.some(Boolean));
  /** بەژداری لەگەڵ شۆفێرێکی دیاریکراو: ئەگەر بەژدارییەک دەستی پێکردووە بەردەوام دەبێت */
  acts.subWith = (driverId) => {
    if (U.draft) U.draft.prefDriver = driverId;
    else U.draft = newDraft(driverId);
    TK.go('new');
  };
  const draftInfo = (dr) => {
    const members = dr.memberIds.map(sel.member).filter(Boolean);
    const hasChild = members.some((m) => m.kind === 'child');
    const hasAdult = members.some((m) => m.kind !== 'child');
    return { members, hasChild, hasAdult, mixed: hasChild && hasAdult };
  };
  /** نرخی مەزەندەکراو بۆ هەموو داواکارییەکانی ئەم بەژدارییە */
  function draftQuote(dr) {
    const info = draftInfo(dr);
    const groups = dr.mode === 'separate' ? info.members.map((m) => [m]) : [info.members];
    return groups.map((g) => {
      const hasChild = g.some((m) => m.kind === 'child');
      const hasAdult = g.some((m) => m.kind !== 'child');
      const rideType = dr.rideType === 'private' ? 'private' : hasChild && hasAdult ? 'family' : hasChild ? 'kids' : 'shared';
      return {
        names: fmt.names(g.map((m) => m.name)),
        price: TK.priceFor({ fromId: dr.fromId, toId: dr.toId, fromGeo: dr.fromGeo, toGeo: dr.toGeo, days: dr.days, oneWay: dr.dir !== 'both', mode: dr.mode, rideType, riders: g.length, hasChild }),
        hasChild, riders: g.length, rideType,
      };
    });
  }
  /** شێوەیەکی داواکاری بۆ پشکنینی گونجانی شۆفێر */
  const draftAsReq = (dr, target = 'all') => {
    const info = draftInfo(dr);
    return { womanOnly: dr.womanOnly, hasChild: info.hasChild, mode: dr.mode, riders: dr.mode === 'one' ? info.members.length : 1, target };
  };

  TK.route('new', {
    guard: () => authed() || (U.draft ? null : (U.draft = newDraft()) && null),
    render() {
      const dr = U.draft;
      const steps = ['سەرنشینەکان', 'شوێن و کات', 'نرخ و ناردن'];
      return page(`
        ${ui.header('بەژداری نوێ', { back: 'home', sub: `هەنگاوی ${dr.step} لە ٣، ${steps[dr.step - 1]}` })}
        <div class="row" style="gap:6px">${steps.map((_, i) => `<div class="progress grow"><i style="width:${i < dr.step ? 100 : 0}%"></i></div>`).join('')}</div>
        ${dr.step === 1 ? step1(dr) : dr.step === 2 ? step2(dr) : step3(dr)}`);
    },
  });

  function step1(dr) {
    const s = S();
    const info = draftInfo(dr);
    const sepLabel = info.members.length > 1;
    let typeBlock = '';
    if (info.members.length) {
      if (info.mixed && dr.mode === 'one') {
        typeBlock = `<div class="card info row top sm">${icon('shield', 20)}<span><b>تەنها خێزانەکەت لە ئۆتۆمبێلەکەدا دەبن.</b> چونکە منداڵ لەگەڵ کەسی گەورەی خێزانەکەیەتی، کەسی نەناسراو سوار ناکرێت. تەنها شۆفێری پشکنراوی منداڵان.</span></div>`;
      } else {
        const lbl = info.hasChild && !info.hasAdult
          ? [['shared', 'لەگەڵ منداڵانی تر', 'تەنها منداڵ لە ئۆتۆمبێلەکەدا دەبن، هەرزانتر'], ['private', 'تەنها منداڵەکانی خۆم', 'کەسی تر سوار ناکرێت']]
          : info.hasChild
            ? [['shared', 'هاوبەش', 'منداڵ تەنها لەگەڵ منداڵ، گەورە لەگەڵ گەورە'], ['private', 'تایبەت', 'هەر کەسێک تەکسی تایبەتی خۆی']]
            : [['shared', 'هاوبەش لەگەڵ کەسانی تر', 'هەرزانتر، لەسەر ڕێگاکەت'], ['private', 'تەکسی تایبەت', 'تەنها تۆ، ٤٠٪ زیاتر']];
        typeBlock = `<div class="col tight"><div class="sm bold muted">جۆری گەشت</div>
          ${lbl.map(([v, t, d]) => `<button class="card row ${dr.rideType === v ? 'selected' : ''}" style="text-align:right" data-act="dRide" data-arg="${v}" role="radio" aria-checked="${dr.rideType === v}"><span class="grow"><b>${t}</b><div class="xs muted">${d}</div></span><span class="radio ${dr.rideType === v ? 'on' : ''}"></span></button>`).join('')}
        </div>`;
        if (info.hasChild) typeBlock += `<div class="card info row top sm">${icon('shield', 20)}<span>منداڵ هەرگیز لەگەڵ کەسی گەورەی نەناسراو سوار ناکرێت. تەنها شۆفێرانی پشکنراوی منداڵان دەیبینن.</span></div>`;
      }
    }
    return `
      <div class="h3">کێ سوار دەبێت؟</div>
      <div class="sm muted" style="margin-top:-8px">دەتوانیت چەند کەسێک هەڵبژێریت</div>
      <div class="list">${s.family.members.map((m) => {
        const on = dr.memberIds.includes(m.id);
        return `<div class="item tap" data-act="dMember" data-arg="${m.id}">
          ${ui.avatar(m.initial, m.kind === 'child' ? 'amber' : m.woman ? 'woman' : '')}
          <div class="grow"><b>${esc(m.name)}</b><div class="xs muted">${esc(m.relation)}${m.kind === 'child' && m.age ? `، ${m.age} ساڵ` : ''}</div></div>
          ${m.kind === 'child' ? ui.badge('منداڵ', 'note') : ''}
          <span class="check ${on ? 'on' : ''}">${on ? icon('check', 16, '#0B1733', 3) : ''}</span>
        </div>`;
      }).join('')}</div>
      <button class="btn ghost sm" data-go="family" style="align-self:flex-start">${icon('plus', 18)}زیادکردنی ئەندام</button>
      ${sepLabel ? `<div class="col tight"><div class="sm bold muted">${info.members.length} کەس هەڵبژێردران. چۆن بڕۆن؟</div>${ui.seg('dMode', [{ v: 'one', l: 'یەک تەکسی پێکەوە' }, { v: 'separate', l: 'تەکسی جیا' }], dr.mode)}
        <div class="xs muted">${dr.mode === 'one' ? 'هەموویان پێکەوە لە یەک ئۆتۆمبێلدا. کەسی دووەم بەدواوە ٣٠٪ هەرزانترە.' : 'بۆ هەر کەسێک داواکارییەکی جیا دروست دەکرێت و هەر یەکەی شۆفێری خۆی دەبێت.'}</div></div>` : ''}
      ${typeBlock}
      ${info.members.length ? `<div class="card row"><div class="ico-box woman">${icon('woman', 20, 'var(--w-text)')}</div><div class="grow"><b>تەنها شۆفێری ئافرەت</b><div class="xs muted">تەنها شۆفێرە ئافرەتەکان داواکارییەکە دەبینن</div></div>${ui.toggle('dWoman', dr.womanOnly)}</div>` : ''}
      <button class="btn block" data-act="dNext" ${info.members.length ? '' : 'disabled'}>دواتر</button>
      ${info.members.length ? '' : `<div class="hint">${icon('help', 16)}سەرەتا کەسێک هەڵبژێرە کە سوار دەبێت</div>`}`;
  }

  async function pinPlaceWith(key, useHere) {
    const dr = U.draft;
    if (!dr) return;
    const id = dr[key + 'Id'];
    const cur = dr[key + 'Geo'] || TK.placeGeo(id);
    const r = await TK.pickLocation({ title: key === 'from' ? 'شوێنی سوار بوون' : 'شوێنی مەبەست', center: cur, q: id ? '' : (dr[key + 'Q'] || '').trim(), useHere });
    if (!r || U.draft !== dr) return;
    dr[key + 'Geo'] = { lat: r.lat, lng: r.lng };
    // ئەگەر هێشتا ناوی نییە، ناوی گەڕەکەکە بەکاردێت (نەک ناونیشانی ورد، چونکە پێش هەڵبژاردن هەموو شۆفێران دەیبینن)
    const label = (r.area || r.name || '').trim();
    if (!id && label) {
      dr[key + 'Id'] = 'c:' + label;
      dr[key + 'Q'] = '';
    }
    TK.render();
  }
  /** خانەی شوێن: بنووسە و ئەپەکە شوێنەکە دەدۆزێتەوە («بەخت» ← گەڕەکی بەختیاری) */
  function placeField(key, dr) {
    const id = dr[key + 'Id'];
    const other = dr[key === 'from' ? 'toId' : 'fromId'];
    const color = key === 'from' ? 'var(--success)' : 'var(--amber)';
    const geo = dr[key + 'Geo'];
    if (id) {
      const pl = TK.place(id);
      const pg = TK.placeGeo(id);
      // شوێنی ورد تەنها دوای هەڵبژاردنی شۆفێر دەدرێت بە شۆفێرەکە؛ پێش ئەوە تەنها ئەم ناوە دەبینرێت
      const line = geo
        ? `${icon('check', 16, 'var(--ok-text)', 2.6)}<span class="ok">شوێنی ورد لەسەر نەخشە دیاری کرا</span><button type="button" class="link" data-act="pinPlace" data-arg="${key}">گۆڕین</button>`
        : `${icon('pin', 16, 'var(--muted)')}<span class="muted">${pg ? 'شوێنی گشتی ئەم ناوچەیە' : 'شوێنی ورد دیاری نەکراوە'}</span><button type="button" class="link" data-act="pinPlace" data-arg="${key}">دیاریکردن لەسەر نەخشە</button>`;
      return `<div class="picked">${icon(TK.placeIcon(pl.kind), 20, color)}<b class="grow">${esc(pl.name)}</b><button type="button" class="link" data-act="clearPlace" data-arg="${key}">گۆڕین</button></div>
        <div class="geo-line">${line}</div>`;
    }
    return `${geo ? `<div class="geo-line">${icon('check', 16, 'var(--ok-text)', 2.6)}<span class="ok">شوێنی ورد وەرگیرا. ئێستا ناوی گەڕەکەکە بنووسە</span></div>` : ''}
    <div class="place-field">
      <span class="pin-ic">${icon('search', 20, 'var(--muted)')}</span>
      <input class="input" id="q-${key}" data-input="placeType" data-arg="${key}" placeholder="${key === 'from' ? 'بنووسە، بۆ نموونە: ئازادی' : 'بنووسە، بۆ نموونە: بەخت'}" autocomplete="off" value="${esc(dr[key + 'Q'] || '')}">
    </div>
    <div class="sugg" id="sugg-${key}">${suggHtml(key, dr[key + 'Q'] || '', other)}</div>
    ${geo ? '' : `<div class="place-tools">${TK.gmaps && (TK.gmaps.status === 'failed' || TK.gmaps.status === 'off') ? '' : `<button type="button" class="btn sm secondary" data-act="pinPlace" data-arg="${key}">${icon('pin', 16)}لەسەر نەخشە</button>`}<button type="button" class="btn sm secondary" data-act="herePlace" data-arg="${key}">${icon('navigate', 16)}شوێنی ئێستام</button></div>`}`;
  }
  function suggHtml(key, q, exclude) {
    const list = TK.searchPlaces(q, exclude);
    const qq = q.trim();
    const mark = (name) => {
      if (!qq) return esc(name);
      const i = name.indexOf(qq);
      return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + qq.length)) + '</mark>' + esc(name.slice(i + qq.length));
    };
    let html = list.map((p) => `<button type="button" data-act="pickPlace" data-arg="${key}|${p.id}">${icon(TK.placeIcon(p.kind), 18, 'var(--muted)')}<span class="grow">${mark(p.name)}</span></button>`).join('');
    if (qq.length >= 2 && !list.some((p) => p.name === qq)) {
      html += `<button type="button" data-act="pickPlace" data-arg="${key}|c:${esc(qq)}">${icon('pin', 18, 'var(--brand)')}<span class="grow">بەکارهێنانی «${esc(qq)}»</span></button>`;
      if (TK.gmaps && TK.gmaps.status !== 'failed' && TK.gmaps.status !== 'off') html += `<button type="button" data-act="pinPlace" data-arg="${key}">${icon('search', 18, 'var(--brand)')}<span class="grow">گەڕانی «${esc(qq)}» لەسەر نەخشە</span></button>`;
    }
    return html;
  }
  function step2(dr) {
    const km = dr.fromId && dr.toId ? TK.distance(dr.fromId, dr.toId, dr.fromGeo, dr.toGeo) : 0;
    return `
      <div class="card col">
        <div class="field"><label>${icon('pin', 14, 'var(--success)')} لە کوێوە (شوێنی سوار بوون)</label>${placeField('from', dr)}
          ${dr.fromId ? `<input class="input" id="fromNote" data-input="dNote" data-arg="fromNote" placeholder="وردەکاری: ناوی کۆڵان، نزیک... (ئارەزوومەندانە)" value="${esc(dr.fromNote)}">` : ''}</div>
        <div class="field"><label>${icon('pin', 14, 'var(--amber)')} بۆ کوێ (شوێنی مەبەست)</label>${placeField('to', dr)}
          ${dr.toId ? `<input class="input" id="toNote" data-input="dNote" data-arg="toNote" placeholder="وردەکاری: دەرگای سەرەکی، نهۆم... (ئارەزوومەندانە)" value="${esc(dr.toNote)}">` : ''}</div>
        ${km ? `<div class="row sm muted">${icon('route', 16)}نزیکەی ${km.toFixed(1)} کیلۆمەتر، ${Math.round(km * 2.5 + 8)} خولەک</div>` : ''}
      </div>
      <div class="card col">
        <div class="col tight"><div class="sm bold">جۆری هاتووچۆ</div>${ui.seg('dDir', [{ v: 'both', l: 'چوون و هاتنەوە' }, { v: 'go', l: 'تەنها چوون' }, { v: 'back', l: 'تەنها هاتنەوە' }], dr.dir)}</div>
        <div class="${dr.dir === 'both' ? 'grid2' : 'col'}">
          ${dr.dir !== 'back' ? `<div class="field"><label for="go">کاتی چوون</label>${ui.timeSelect('go', dr.go, 'data-change="dTime" data-arg="go"')}</div>` : ''}
          ${dr.dir !== 'go' ? `<div class="field"><label for="backTime">کاتی هاتنەوە</label>${ui.timeSelect('backTime', dr.backTime, 'data-change="dTime" data-arg="backTime"')}</div>` : ''}
        </div>
        ${dr.dir !== 'both' ? `<div class="xs muted">${dr.dir === 'go' ? 'تەنها لە ماڵەوە بۆ شوێنی مەبەست' : 'تەنها لە شوێنی مەبەستەوە بۆ ماڵەوە'}، نرخ کەمترە</div>` : ''}
        <div class="field"><label for="startDate">ڕۆژی دەستپێکردن</label>${ui.dateSelect('startDate', dr.startDate, 45, 'data-change="dTime" data-arg="startDate"')}</div>
        <div class="xs muted">مانگی یەکەم بە پێی ڕۆژە ماوەکان حیساب دەکرێت</div>
      </div>
      <div class="card col">
        <div class="row between"><b class="sm">ڕۆژەکانی هەفتە</b><span class="xs muted">${fmt.days(dr.days) || 'هیچ ڕۆژێک'}</span></div>
        <div class="days">${fmt.WEEKDAY_SHORT.map((d, i) => `<button class="${dr.days[i] ? 'on' : ''}" data-act="dDay" data-arg="${i}" aria-label="${fmt.WEEKDAYS[i]}">${d}</button>`).join('')}</div>
        <div class="row wrap" style="gap:6px">${DAY_PRESETS.map(([k, l]) => `<button class="chip ${presetOn(dr.days, k) ? 'on' : ''}" data-act="dDays" data-arg="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="row" style="gap:10px"><button class="btn secondary" data-act="dPrev">گەڕانەوە</button><button class="btn grow" data-act="dNext" ${dr.fromId && dr.toId && dr.days.some(Boolean) ? '' : 'disabled'}>بینینی نرخ</button></div>
      ${!dr.toId ? `<div class="hint">${icon('help', 16)}شوێنی مەبەست هەڵبژێرە بۆ بینینی نرخ</div>` : !dr.fromId ? `<div class="hint">${icon('help', 16)}شوێنی سوار بوون هەڵبژێرە</div>` : !dr.days.some(Boolean) ? `<div class="hint">${icon('help', 16)}لانیکەم یەک ڕۆژی هەفتە هەڵبژێرە</div>` : ''}`;
  }

  // ڕۆژە ئامادەکراوەکان: هەفتەی کاری هەرێم یەکشەممە تا پێنجشەممەیە
  const DAY_PRESETS = [['1-5', 'یەکشەممە تا پێنجشەممە'], ['0-5', 'شەممە تا پێنجشەممە'], ['0-6', 'هەموو ڕۆژێک']];
  const presetDays = (k) => {
    const [a, b] = k.split('-').map(Number);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => i >= a && i <= b);
  };
  const presetOn = (days, k) => presetDays(k).every((v, i) => v === !!days[i]);

  function step3(dr) {
    const q = draftQuote(dr);
    const total = q.reduce((n, x) => n + x.price, 0);
    const info = draftInfo(dr);
    const fits = S().drivers.filter((d) => sel.fits(d, draftAsReq(dr))).length;
    const pref = dr.prefDriver ? sel.driver(dr.prefDriver) : null;
    const prefFits = pref && sel.fits(pref, draftAsReq(dr, pref.id));
    const b = TK.offerBounds(total);
    return `
      <div class="card big col">
        <div class="row between"><b>نرخی پێشنیارکراوی مانگانە</b>${ui.badge('مەزەندە', 'note')}</div>
        <div class="h1 brand">${fmt.money(total)}</div>
        <div class="xs muted">شۆفێرەکان دەتوانن لە نێوان ${fmt.group(b.min)} تا ${fmt.group(b.max)} دینار نرخی خۆیان پێشنیار بکەن. تۆ هەموو نرخەکان دەبینیت و هەڵدەبژێریت.</div>
        ${q.length > 1 ? `<div class="hr"></div>${q.map((x) => `<div class="row between sm"><span>${esc(x.names)}</span><b>${fmt.money(x.price)}</b></div>`).join('')}` : ''}
      </div>
      <div class="card col tight">
        <div class="row sm"><b class="grow">${esc(fmt.names(info.members.map((m) => m.name)))}</b>${q.length > 1 ? ui.badge(`${q.length} داواکاری`, 'info') : ''}</div>
        ${ui.requestSummary({ from: TK.place(dr.fromId).name + (dr.fromNote ? '، ' + dr.fromNote : ''), to: TK.place(dr.toId).name + (dr.toNote ? '، ' + dr.toNote : ''), go: dr.dir !== 'back' ? dr.go : null, back: dr.dir !== 'go' ? dr.backTime : null, days: dr.days, startDate: dr.startDate })}
        <div style="margin-top:6px">${ui.requestTags({ hasChild: info.hasChild, rideType: q[0].rideType, womanOnly: dr.womanOnly, riders: dr.mode === 'one' ? info.members.length : 1 })}</div>
      </div>
      <div class="field"><label for="dnote">تێبینی بۆ شۆفێر (ئارەزوومەندانە)</label><textarea class="input" id="dnote" data-input="dNote" data-arg="note" placeholder="بۆ نموونە: کورسیی منداڵ پێویستە">${esc(dr.note)}</textarea></div>
      ${pref ? `
        <button class="btn block" data-act="sendDirect" data-arg="${pref.id}" ${prefFits ? '' : 'disabled'}>${icon('send', 18)}ناردن بۆ ${esc(pref.name)}</button>
        ${prefFits ? '' : `<div class="err">${esc(pref.name)} بۆ ئەم گەشتە ناگونجێت (کورسی، منداڵ یان ئافرەت)</div>`}
        <button class="btn secondary block" data-act="broadcast">${icon('megaphone', 18)}بڵاوکردنەوە بۆ هەموو شۆفێرەکان</button>
      ` : `
        <button class="card row tap" style="text-align:right;border:2px solid var(--amber)" data-act="broadcast">
          <div class="ico-box" style="background:var(--amber)">${icon('megaphone', 22, '#0B1733')}</div>
          <div class="grow"><b>بڵاوکردنەوە بۆ هەموو شۆفێرەکان</b><div class="xs muted">${fits} شۆفێری گونجاو دەیبینن و نرخ دەنێرن، پێشنیارکراو</div></div>${icon('forward', 20)}
        </button>
        <button class="card row tap" style="text-align:right" data-act="pickDriver">
          <div class="ico-box navy">${icon('search', 22, 'var(--text)')}</div>
          <div class="grow"><b>خۆم شۆفێر هەڵدەبژێرم</b><div class="xs muted">لیستی شۆفێرەکان ببینە و ڕاستەوخۆ بۆ یەکێکیان بنێرە</div></div>${icon('forward', 20)}
        </button>`}
      <button class="btn ghost block" data-act="dPrev">گەڕانەوە</button>`;
  }

  Object.assign(acts, {
    dMember(id) {
      const dr = U.draft;
      dr.memberIds = dr.memberIds.includes(id) ? dr.memberIds.filter((x) => x !== id) : [...dr.memberIds, id];
      if (dr.memberIds.length < 2) dr.mode = 'one';
      TK.render();
    },
    dMode(v) {
      U.draft.mode = v;
      TK.render();
    },
    dRide(v) {
      U.draft.rideType = v;
      TK.render();
    },
    dWoman() {
      U.draft.womanOnly = !U.draft.womanOnly;
      TK.render();
    },
    placeType(v, el) {
      const key = el.getAttribute('data-arg');
      U.draft[key + 'Q'] = v;
      const box = document.getElementById('sugg-' + key);
      if (box) {
        box.innerHTML = suggHtml(key, v, U.draft[key === 'from' ? 'toId' : 'fromId']);
        TK.localizeDigits(box);
      }
    },
    pickPlace(arg) {
      const i = arg.indexOf('|');
      const key = arg.slice(0, i);
      U.draft[key + 'Id'] = arg.slice(i + 1);
      U.draft[key + 'Q'] = '';
      if (document.activeElement) document.activeElement.blur();
      TK.render();
    },
    clearPlace(key) {
      U.draft[key + 'Id'] = '';
      U.draft[key + 'Q'] = '';
      U.draft[key + 'Geo'] = null;
      TK.render();
      setTimeout(() => {
        const el = document.getElementById('q-' + key);
        if (el) el.focus();
      }, 50);
    },
    dNote(v, el) {
      U.draft[el.getAttribute('data-arg')] = v;
    },
    /** دیاریکردنی شوێنی ورد: گەڕان یان دەرزی لەسەر نەخشە */
    pinPlace(key) {
      return pinPlaceWith(key, false);
    },
    /** شوێنی ئێستای مۆبایل (لەسەر نەخشە پشتڕاست دەکرێتەوە) */
    herePlace(key) {
      return pinPlaceWith(key, true);
    },
    dTime(v, el) {
      U.draft[el.getAttribute('data-arg')] = v || U.draft[el.getAttribute('data-arg')];
    },
    dDir(v) {
      U.draft.dir = v;
      TK.render();
    },
    dDay(i) {
      U.draft.days[+i] = !U.draft.days[+i];
      TK.render();
    },
    dDays(k) {
      U.draft.days = presetDays(k);
      TK.render();
    },
    dNext() {
      U.draft.step = Math.min(3, U.draft.step + 1);
      TK.render();
      window.scrollTo(0, 0);
    },
    dPrev() {
      U.draft.step = Math.max(1, U.draft.step - 1);
      TK.render();
      window.scrollTo(0, 0);
    },
    broadcast() {
      const ids = actions.createRequests(U.draft, 'all');
      U.draft = null;
      TK.toast('داواکارییەکەت بڵاو کرایەوە');
      TK.go(ids.length === 1 ? `request/${ids[0]}` : 'requests', true);
    },
    pickDriver() {
      TK.go('drivers');
    },
    sendDirect(id) {
      if (!draftReady(U.draft)) {
        acts.subWith(id);
        return;
      }
      const ids = actions.createRequests(U.draft, id);
      U.draft = null;
      TK.toast(`داواکارییەکە بۆ ${sel.driver(id).name} نێردرا`);
      TK.go(ids.length === 1 ? `request/${ids[0]}` : 'requests', true);
    },
  });

  /* =========================================================
   * شۆفێرەکان
   * ======================================================= */
  /** سەری ستانداردی شۆفێر لە هەموو شوێنێک: وێنە، ناو، پشکنراو، ئۆتۆمبێل، تابلۆ، هەڵسەنگاندن */
  function dHead(d, opts = {}) {
    if (!d) return '';
    const src = d.photo ? TK.img(d.photo) : '';
    const plate = String(d.plate || '').replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
    const car = [`${d.carMake || ''} ${d.carModel || ''}`.trim() || d.car, d.carColor].filter(Boolean).join(' · ');
    return `<div class="dhead ${opts.go ? 'tap' : ''}" ${opts.go ? `data-go="${opts.go}"` : ''}>
      <div class="dh-av ${d.woman ? 'w' : ''}">${src ? `<img src="${src}" alt="">` : esc((d.name || '?').slice(0, 1))}${d.status === 'active' ? `<span class="dh-ok">${icon('check', 11, '#fff', 3.2)}</span>` : ''}</div>
      <div class="grow" style="min-width:0">
        <div class="dh-name">${esc(d.name)}</div>
        <div class="dh-car">${esc(car)}</div>
        <div class="dh-meta"><span class="mplate sm" data-raw><span class="mp-s">IRQ<br>KR</span><span class="mp-n latin">${esc(plate)}</span></span>${d.reviews ? `<span class="dh-rate">${icon('star', 13, 'var(--amber)', 1.5, 'var(--amber)')}${d.rating}</span>` : ''}<span class="dh-ver">${icon('shield', 13, 'currentColor', 2.2)}پشکنراو</span></div>
      </div>
      ${opts.right || ''}
    </div>`;
  }
  function driverRow(d, opts = {}) {
    return `<div class="card col" data-dsearch="${esc([d.name, d.car, d.area, d.woman ? 'ئافرەت' : '', d.kidsDriver ? 'منداڵ' : ''].join(' '))}">
      ${dHead(d, { go: `driver/${d.id}`, right: icon('forward', 18, 'var(--muted)') })}
      ${d.woman || d.kidsDriver || d.area ? `<div class="row wrap xs muted" style="gap:6px">${d.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}${d.kidsDriver ? ui.badge('شۆفێری منداڵان', 'note') : ''}${d.area ? `<span class="row" style="gap:4px">${icon('pin', 14)}${esc(d.area)}</span>` : ''}</div>` : ''}
      ${opts.action || ''}
    </div>`;
  }
  TK.route('drivers', {
    guard: authed,
    after: () => filterDrivers(),
    render() {
      const dr = U.draft;
      const f = U.dfilter || 'all';
      let list = S().drivers.filter((d) => d.status === 'active');
      if (dr) list = list.filter((d) => sel.fits(d, draftAsReq(dr)));
      const q = U.dq || '';
      if (f === 'woman') list = list.filter((d) => d.woman);
      if (f === 'kids') list = list.filter((d) => d.kidsDriver);
      list.sort((a, b) => b.rating - a.rating);
      return page(`
        ${ui.header(dr ? 'هەڵبژاردنی شۆفێر' : 'شۆفێرەکان', { back: dr ? 'new' : 'home', sub: dr ? 'تەنها ئەو شۆفێرانەی بۆ گەشتەکەت دەگونجێن' : 'هەموو شۆفێرەکان پشکنراون' })}
        <div class="place-field"><span class="pin-ic">${icon('search', 20, 'var(--muted)')}</span><input class="input" id="dsearch" data-input="dSearch" placeholder="گەڕان: ناو، ئۆتۆمبێل یان ناوچە" autocomplete="off" value="${esc(q)}"></div>
        <div class="tabs">${[['all', 'هەمووی'], ['woman', 'شۆفێری ئافرەت'], ['kids', 'شۆفێری منداڵان']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="dfilter" data-arg="${k}">${l}</button>`).join('')}</div>
        <div class="empty" id="dnone" style="display:none">${icon('search', 30, 'var(--amber)')}<div class="h3">هیچ شۆفێرێک نەدۆزرایەوە</div><div class="sm muted">وشەیەکی تر تاقی بکەرەوە</div></div>
        ${list.length ? list.map((d) => driverRow(d, { action: dr ? `<button class="btn sm block secondary" data-act="sendDirect" data-arg="${d.id}">${icon('send', 16)}ناردنی داواکاری بۆ ${esc(d.name.split(' ')[0])}</button>` : '' })).join('') : ui.empty('search', 'هیچ شۆفێرێکی گونجاو نییە', 'داواکارییەکەت بڵاو بکەرەوە، شۆفێری نوێ دەیبینن', dr ? `<button class="btn" data-act="broadcast">بڵاوکردنەوە</button>` : '')}`);
    },
  });
  acts.dfilter = (k) => {
    U.dfilter = k;
    TK.render();
  };
  /** گەڕان بەناو شۆفێرەکاندا بێ نوێکردنەوەی شاشە (کیبۆرد دانابەزێت) */
  acts.dSearch = (v) => {
    U.dq = v;
    filterDrivers();
  };
  function filterDrivers() {
    const q = TK.normalize(U.dq || '');
    let shown = 0;
    document.querySelectorAll('[data-dsearch]').forEach((el) => {
      const ok = !q || TK.normalize(el.getAttribute('data-dsearch')).includes(q);
      el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    const none = document.getElementById('dnone');
    if (none) none.style.display = shown ? 'none' : '';
  }

  /** دوگمەکانی خوارەوەی پرۆفایلی شۆفێر بە پێی دۆخ */
  function profileActions(d) {
    const s = S();
    const first = esc(d.name.split(' ')[0]);
    // ئەگەر ئەم شۆفێرە نرخی بۆ یەکێک لە داواکارییەکانت ناردووە، ڕاستەوخۆ هەڵیبژێرە
    const offers = s.requests
      .filter((r) => r.owner === 'me' && r.status === 'open')
      .map((r) => ({ r, o: r.offers.find((o) => o.driverId === d.id && o.status === 'pending') }))
      .filter((x) => x.o);
    const q = TK.app.current.query || {};
    offers.sort((a, b) => (a.r.id === q.req ? -1 : b.r.id === q.req ? 1 : 0));
    const msg = `<div class="grid2"><button class="btn secondary" data-go="chat/${d.id}">${icon('chat', 18)}نامە</button><a class="btn secondary" href="tel:0${esc(d.phone)}">${icon('phone', 18)}پەیوەندی</a></div>`;
    if (offers.length) {
      return offers.map(({ r, o }) => `<div class="card note col">
          <div class="row between"><span class="sm">${first} نرخی ناردووە بۆ <b>${esc(r.riderNames)}، ${esc(r.to.split('، ')[0])}</b></span></div>
          <div class="row between"><b class="price brand">${fmt.money(o.price)}</b><span class="xs muted">مانگانە</span></div>
          ${o.note ? `<div class="sm">«${esc(o.note)}»</div>` : ''}
          <button class="btn block" data-act="pickOffer" data-arg="${r.id}|${d.id}">${icon('check', 18, 'currentColor', 2.4)}هەڵبژاردنی ${first}</button>
        </div>`).join('') + msg;
    }
    const dr = U.draft;
    if (draftReady(dr) && dr.step === 3) {
      const ok = sel.fits(d, draftAsReq(dr, d.id));
      return `<button class="btn block" data-act="sendDirect" data-arg="${d.id}" ${ok ? '' : 'disabled'}>${icon('send', 18)}ناردنی داواکاری بۆ ${first}</button>${ok ? '' : `<div class="err">${first} بۆ ئەم گەشتە ناگونجێت</div>`}${msg}`;
    }
    return `<button class="btn block" data-act="subWith" data-arg="${d.id}">بەژداری لەگەڵ ${first}</button>${msg}`;
  }

  /** وێنەی ئۆتۆمبێلی شۆفێر (ئەگەر داینابێت). پەنجەنان بە تەواوی شاشە دەیکاتەوە */
  function carPhotos(d) {
    const list = (d.showPhotos || []).map((id) => ({ id, src: TK.img(id) })).filter((x) => x.src);
    if (!list.length) return '';
    return `<div class="h3">ئۆتۆمبێلەکە</div>
      <div class="carpics ${list.length === 1 ? 'one' : ''}">${list.map((x, i) => `<button class="carpic" data-act="viewCar" data-arg="${d.id}|${i}" aria-label="کردنەوەی وێنە"><img src="${x.src}" alt=""><span>${icon('eye', 16, '#fff', 2.2)}</span></button>`).join('')}</div>`;
  }
  acts.viewCar = (arg) => {
    const [did, i] = arg.split('|');
    U.carView = { did, i: +i };
    showCarViewer();
  };
  function showCarViewer() {
    const v = U.carView;
    const d = sel.driver(v.did);
    const list = ((d && d.showPhotos) || []).map((id) => TK.img(id)).filter(Boolean);
    let el = document.getElementById('carviewer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'carviewer';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-cv="next"]')) {
          U.carView.i = (U.carView.i + 1) % list.length;
          return showCarViewer();
        }
        if (e.target.closest('[data-cv="prev"]')) {
          U.carView.i = (U.carView.i - 1 + list.length) % list.length;
          return showCarViewer();
        }
        if (e.target.closest('img')) return;
        el.classList.remove('show');
      });
    }
    if (!list.length) return el.classList.remove('show');
    const i = Math.min(v.i, list.length - 1);
    el.innerHTML = `<button class="cv-x" aria-label="داخستن">${icon('x', 26, '#fff', 2.4)}</button>
      <img src="${list[i]}" alt="">
      ${list.length > 1 ? `<div class="cv-nav"><button data-cv="prev" aria-label="پێشوو">${icon('back', 24, '#fff', 2.4)}</button><span>${fmt.n(i + 1)} / ${fmt.n(list.length)}</span><button data-cv="next" aria-label="دواتر">${icon('forward', 24, '#fff', 2.4)}</button></div>` : ''}`;
    el.classList.add('show');
  }
  TK.route('driver/:id', {
    guard: authed,
    render({ id }) {
      const d = sel.driver(id);
      if (!d) return page(ui.header('شۆفێر') + ui.empty('user', 'نەدۆزرایەوە', ''));
      const dr = U.draft;
      return page(`
        ${ui.header('پرۆفایلی شۆفێر', { back: 'home' })}
        <div class="phone-line">${icon('phone', 16)}<span class="grow">ژمارەی شۆفێر</span><a class="latin bold" dir="ltr" href="tel:0${esc(d.phone)}">${fmt.phone(d.phone)}</a></div>
        <div class="card big col" style="align-items:center;text-align:center;gap:6px">
          ${ui.dAvatar(d, 84)}
          <div class="row" style="gap:6px"><div class="h2">${esc(d.name)}</div>${icon('shield', 20, 'var(--success)', 2.2)}</div>
          <div class="sm muted">${esc(d.car)}</div><div style="margin:4px 0">${ui.plate(d.plate, d.plateType)}</div>
          <div class="row wrap" style="gap:6px;justify-content:center">${ui.badge('پشکنراو', 'ok')}${d.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}${d.kidsDriver ? ui.badge('شۆفێری منداڵان', 'note') : ''}${d.joinedAt ? ui.badge(`لەگەڵ تەکسیەکەم لە ${fmt.MONTHS[new Date(d.joinedAt).getMonth()]}ی ${new Date(d.joinedAt).getFullYear()}ەوە`) : ''}</div>
        </div>
        <div class="grid3">
          <div class="card stat"><b class="brand">★ ${d.rating}</b><span class="xs muted">${d.reviews} هەڵسەنگاندن</span></div>
          <div class="card stat"><b>${d.trips}</b><span class="xs muted">گەشت</span></div>
          <div class="card stat"><b>${d.onTime}٪</b><span class="xs muted">لەکاتی خۆیدا</span></div>
        </div>
        <div class="card col tight"><div class="row sm">${icon('pin', 16)}<span>ناوچەکانی کار: ${esc(d.area)}</span></div><div class="row sm">${icon('seat', 16)}<span>${d.seats || 4} کورسی بۆ سەرنشین</span></div></div>
        ${(d.tags || []).length ? `<div class="h3">سەرنشینەکان چی دەڵێن</div>
        <div class="chips">${d.tags.map((t) => `<span class="chip">${esc(t.label)}، <b>${t.count}</b></span>`).join('')}</div>` : ''}
        ${d.review ? `<div class="card col tight"><div class="row">${ui.avatar(d.review.by.slice(0, 1), 'woman', 32)}<b class="grow sm">${esc(d.review.by)}</b><span class="xs muted">${esc(d.review.ago)}</span></div><div class="sm">«${esc(d.review.text)}»</div></div>` : ''}
        ${profileActions(d)}
        ${carPhotos(d)}`);
    },
  });

  /* =========================================================
   * داواکارییەکان و نرخەکان
   * ======================================================= */
  function reqStatus(r) {
    if (r.status === 'matched') return ui.badge('ڕێککەوتن', 'ok');
    if (r.status === 'closed') return ui.badge(r.closedReason === 'expired' ? 'کاتی تەواو بوو' : r.closedReason === 'declined' ? 'ڕەتکرایەوە' : 'هەڵوەشێنرایەوە', 'danger');
    const n = r.offers.filter((o) => o.status === 'pending').length;
    return n ? ui.badge(`${n} نرخ هات`, 'amber') : ui.badge('چاوەڕێ', 'note');
  }
  function reqCard(r) {
    const tgt = r.target === 'all' ? 'بڵاوکراوە بۆ هەمووان' : `ڕاستەوخۆ بۆ ${(sel.driver(r.target) || {}).name || ''}`;
    return `<div class="card col tap" data-go="request/${r.id}">
      <div class="row"><div class="ico-box ${r.status === 'open' ? '' : r.status === 'matched' ? 'ok' : 'danger'}">${icon(r.target === 'all' ? 'megaphone' : 'send', 20, 'var(--brand)')}</div>
        <div class="grow"><b>${esc(r.riderNames)}، ${esc(r.to)}</b><div class="xs muted">${tgt}${r.status === 'open' ? `، <span data-live-left="${r.expiresAt}">${fmt.left(r.expiresAt)}</span>` : ''}</div></div>${reqStatus(r)}</div>
      <div class="row between sm"><span class="muted">${fmt.schedule(r)}، ${fmt.days(r.days)}</span><b class="brand">${fmt.money(r.price)}</b></div>
    </div>`;
  }
  TK.route('requests', {
    guard: authed,
    render() {
      const all = S().requests.filter((r) => r.owner === 'me');
      const tab = U.rtab || 'open';
      const list = all.filter((r) => (tab === 'open' ? r.status === 'open' : tab === 'matched' ? r.status === 'matched' : r.status === 'closed'));
      return page(`
        ${ui.header('داواکارییەکانم', { back: 'home', right: `<button class="icon-btn" data-act="newSub" aria-label="نوێ">${icon('plus', 22)}</button>` })}
        <div class="seg">${[['open', 'کراوە'], ['matched', 'ڕێککەوتوو'], ['closed', 'داخراو']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="rtab" data-arg="${k}">${l} (${all.filter((r) => (k === 'open' ? r.status === 'open' : k === 'matched' ? r.status === 'matched' : r.status === 'closed')).length})</button>`).join('')}</div>
        ${list.length ? list.map(reqCard).join('') : ui.empty('megaphone', 'هیچ داواکارییەک نییە', 'بەژدارییەکی نوێ دروست بکە و بۆ شۆفێرەکان بڵاوی بکەرەوە', tab === 'open' ? '<button class="btn" data-act="newSub">بەژداری نوێ</button>' : '')}`);
    },
  });
  acts.rtab = (k) => {
    U.rtab = k;
    TK.render();
  };

  TK.route('request/:id', {
    guard: authed,
    render({ id }) {
      const r = sel.request(id);
      if (!r) return page(ui.header('داواکاری', { back: 'requests' }) + ui.empty('megaphone', 'نەدۆزرایەوە', ''));
      const offers = r.offers.slice().sort((a, b) => a.price - b.price);
      const pending = offers.filter((o) => o.status === 'pending');
      const chosen = offers.find((o) => o.status === 'chosen');
      let body = '';
      if (r.status === 'open') {
        body += pending.length
          ? `<div class="section-title"><div class="h3">ئەو شۆفێرانەی قبووڵیان کرد</div><span class="xs muted">هەرزانترین لە سەرەوە</span></div>${pending.map((o) => offerCard(r, o, pending)).join('')}`
          : `<div class="card col" style="align-items:center;text-align:center;padding:24px">
              <div class="ico-box" style="width:64px;height:64px;border-radius:20px">${icon('hourglass', 32, 'var(--amber)')}</div>
              <div class="h3">چاوەڕێی وەڵامی شۆفێرەکانین</div>
              <div class="sm muted">${r.target === 'all' ? 'داواکارییەکەت بۆ هەموو شۆفێرە گونجاوەکان نیشان دراوە. کاتێک یەکێکیان قبووڵی بکات ئاگادار دەکرێیتەوە.' : 'داواکارییەکەت بۆ شۆفێرەکە نێردرا. کاتێک وەڵام بداتەوە ئاگادار دەکرێیتەوە.'}</div>
              <div class="skeleton" style="width:100%;height:64px;margin-top:6px"></div>
            </div>`;
        if (r.target !== 'all') body += `<button class="btn secondary block" data-act="rebroadcast" data-arg="${r.id}">${icon('megaphone', 18)}بڵاوکردنەوە بۆ هەموو شۆفێرەکان</button>`;
        body += `<button class="btn ghost block" data-act="cancelReq" data-arg="${r.id}">هەڵوەشاندنەوەی داواکاری</button>`;
      } else if (r.status === 'matched' && chosen) {
        const d = sel.driver(chosen.driverId);
        body += `<div class="card ok col"><div class="row">${icon('check', 22, 'currentColor', 2.6)}<b class="grow">ڕێککەوتن لەگەڵ ${esc(d.name)}</b></div><div class="sm">نرخی مانگانە: <b>${fmt.money(chosen.price)}</b>. گەشتەکان لە بەشی سەرەکی دەردەکەون.</div></div>
          ${driverRow(d)}<button class="btn block" data-go="subs">بینینی بەژدارییەکان</button>`;
      } else {
        body += `<div class="card danger sm">${r.closedReason === 'expired' ? 'کاتی ئەم داواکارییە تەواو بوو و هیچ شۆفێرێک هەڵنەبژێردرا.' : r.closedReason === 'declined' ? 'شۆفێرەکە نەیتوانی ئەم گەشتە وەربگرێت.' : 'ئەم داواکارییە هەڵوەشێنرایەوە.'}</div>
          <button class="btn block" data-act="rebroadcast" data-arg="${r.id}">${icon('megaphone', 18)}دووبارە بڵاوکردنەوە بۆ هەمووان</button>`;
      }
      return page(`
        ${ui.header('داواکاری', { back: 'requests', right: reqStatus(r) })}
        <div class="card col">
          <div class="row"><b class="grow">${esc(r.riderNames)}</b><span class="xs muted">${fmt.ago(r.createdAt)}</span></div>
          ${ui.requestSummary(r)}
          ${ui.requestTags(r)}
          <div class="hr"></div>
          <div class="row between"><span class="sm muted">نرخی پێشنیارکراو</span><b class="brand">${fmt.money(r.price)}</b></div>
          ${r.status === 'open' ? `<div class="row between"><span class="sm muted">${r.target === 'all' ? 'بڵاوکراوە بۆ هەمووان' : 'ڕاستەوخۆ بۆ ' + esc((sel.driver(r.target) || {}).name || '')}</span><span class="xs muted" data-live-left="${r.expiresAt}">${fmt.left(r.expiresAt)}</span></div>` : ''}
          ${r.note ? `<div class="sm">${icon('chat', 14)} ${esc(r.note)}</div>` : ''}
        </div>
        ${body}`);
    },
  });
  /** پێشنیاری تەکسیەکەم: باشترین هەڵسەنگاندن (٤.٥ یان زیاتر) کە هەرزانترینیشە، ئەگەرنا باشترین هەڵسەنگاندن */
  function recommended(all) {
    if (all.length < 2) return null;
    const rated = all.map((o) => ({ o, d: sel.driver(o.driverId) || {} }));
    const good = rated.filter((x) => (x.d.rating || 0) >= 4.5).sort((a, b) => a.o.price - b.o.price);
    const pick = good[0] || rated.sort((a, b) => (b.d.rating || 0) - (a.d.rating || 0))[0];
    return pick ? pick.o : null;
  }
  function offerCard(r, o, all = []) {
    const d = sel.driver(o.driverId);
    const diff = o.price - r.price;
    // نیشانەی یارمەتیدەر بۆ بڕیاردان
    const tags = [];
    if (all.length > 1 && o.price === Math.min(...all.map((x) => x.price))) tags.push(ui.badge('هەرزانترین', 'ok'));
    if (all.length > 1 && d.rating === Math.max(...all.map((x) => (sel.driver(x.driverId) || {}).rating || 0))) tags.push(ui.badge('باشترین هەڵسەنگاندن', 'note'));
    if (d.woman) tags.push(ui.badge('شۆفێری ئافرەت', 'woman'));
    const best = recommended(all);
    return `<div class="card offer ${best && best.driverId === o.driverId ? 'reco' : ''}">
      ${best && best.driverId === o.driverId ? `<div class="reco-tag">${icon('star', 13, 'currentColor', 1.5, 'currentColor')}پێشنیاری تەکسیەکەم</div>` : ''}
      ${dHead(d, { go: `driver/${d.id}?req=${r.id}` })}
      <div class="row between"><div class="col tight"><div class="price">${fmt.group(o.price)} <small>دینار مانگانە</small></div>${diff ? `<span class="xs ${diff < 0 ? 'ok' : 'neg'}">${diff < 0 ? fmt.group(-diff) + ' کەمتر لە پێشنیارکراو' : fmt.group(diff) + ' زیاتر لە پێشنیارکراو'}</span>` : '<span class="xs muted">نرخی پێشنیارکراو</span>'}</div><span class="xs muted">${d.trips || 0} گەشت</span></div>
      ${tags.length ? `<div class="row wrap" style="gap:6px">${tags.join('')}</div>` : ''}
      ${o.note ? `<div class="sm" style="background:var(--chip);border-radius:12px;padding:6px 10px">«${esc(o.note)}»</div>` : ''}
      <div class="row" style="gap:8px"><button class="btn sm secondary" data-go="driver/${d.id}?req=${r.id}">پرۆفایل</button><button class="btn sm secondary" data-go="chat/${d.id}" aria-label="نامە">${icon('chat', 16)}</button><button class="btn sm grow" data-act="pickOffer" data-arg="${r.id}|${d.id}">${icon('check', 16, 'currentColor', 2.6)}هەڵبژاردنی ${esc(d.name.split(' ')[0])}</button></div>
    </div>`;
  }
  acts.pickOffer = (arg) => {
    const [rid, did] = arg.split('|');
    TK.sheet(() => {
      const r = sel.request(rid);
      const o = r && r.offers.find((x) => x.driverId === did);
      if (!r || !o || r.status !== 'open') return null;
      const d = sel.driver(did);
      return `<div class="h2">پەسەندکردنی ${esc(d.name)}</div>
        <div class="card col tight">
          <div class="row between"><span class="muted">سەرنشین</span><b>${esc(r.riderNames)}</b></div>
          <div class="row between"><span class="muted">ڕێگا</span><b class="sm">${esc(r.from.split('، ')[0])} ← ${esc(r.to.split('، ')[0])}</b></div>
          <div class="row between"><span class="muted">کات</span><b>${fmt.schedule(r)}</b></div>
          <div class="row between"><span class="muted">ڕۆژەکان</span><b class="sm">${fmt.days(r.days)}</b></div>
          <div class="hr"></div>
          <div class="row between"><span class="muted">نرخی مانگانە</span><b class="price brand">${fmt.money(o.price)}</b></div>
        </div>
        <div class="xs muted">پارەدان لە کۆتایی هەر مانگێک لە ڕێگەی ئەپەوە دەبێت. دەتوانیت هەر کاتێک بەژدارییەکە ڕابگریت.</div>
        <button class="btn block" data-act="confirmOffer" data-arg="${rid}|${did}">پەسەندکردن و دەستپێکردن</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.confirmOffer = (arg) => {
    const [rid, did] = arg.split('|');
    actions.chooseOffer(rid, did);
    TK.closeSheet();
    TK.toast('بەژدارییەکەت چالاک کرا');
    TK.go('subs', true);
  };
  acts.cancelReq = async (id) => {
    if (!(await TK.ask('ئەم داواکارییە هەڵدەوەشێنرێتەوە.'))) return;
    actions.cancelRequest(id);
    TK.toast('داواکارییەکە هەڵوەشێنرایەوە');
  };
  acts.rebroadcast = (id) => {
    actions.rebroadcast(id);
    TK.toast('بۆ هەموو شۆفێرەکان بڵاو کرایەوە');
  };

  /* =========================================================
   * بەژدارییەکان
   * ======================================================= */
  TK.route('subs', {
    guard: authed,
    render() {
      const s = S();
      const open = s.requests.filter((r) => r.owner === 'me' && r.status === 'open');
      return page(`
        <div class="topbar"><div class="h1">بەژدارییەکان</div><button class="btn sm" data-act="newSub">${icon('plus', 18, 'currentColor', 2.2)}نوێ</button></div>
        ${open.length ? `<div class="section-title"><div class="h3">داواکارییە کراوەکان</div><button class="link" data-go="requests">هەمووی</button></div>${open.map(reqCard).join('')}` : ''}
        <div class="section-title"><div class="h3">بەژدارییە چالاکەکان</div>${sel.mySubs().length ? `<span class="cntp">${sel.mySubs().length}</span>` : ''}</div>
        ${sel.mySubs().length ? sel.mySubs().map(subCard).join('') : ui.empty('calendar', 'هێشتا هیچ بەژدارییەکت نییە', 'شوێن و کات دیاری بکە و شۆفێرەکان نرخت بۆ دەنێرن', '<button class="btn" data-act="newSub">یەکەم بەژداری</button>')}
        <button class="card row tap" style="text-align:right" data-go="drivers">${icon('search', 20)}<span class="grow bold">گەڕان بەناو شۆفێرەکاندا</span>${icon('forward', 18)}</button>`, 'subs');
    },
  });
  function subCard(sub) {
    const d = sel.driver(sub.driverId);
    const names = sel.names(sub.memberIds);
    const paused = sub.status === 'paused';
    return `<div class="card col" style="${paused ? 'opacity:.7' : ''}">
      <div class="row">
        <div class="row" style="gap:0">${sub.memberIds.slice(0, 3).map((id, i) => {
          const m = sel.member(id) || {};
          return `<span style="margin-left:${i ? -12 : 0}px;border:2px solid var(--card);border-radius:50%">${ui.avatar(m.initial || '?', m.kind === 'child' ? 'amber' : m.woman ? 'woman' : '', 38)}</span>`;
        }).join('')}</div>
        <div class="grow"><b>${esc(fmt.names(names))}</b><div class="xs muted">${esc(sub.to)}</div></div>
        ${paused ? ui.badge('ڕاگیراوە', 'danger') : ui.badge('چالاک', 'ok')}
      </div>
      <div class="col tight">
        <div class="row sm">${icon('clock', 16, 'var(--muted)')}<span class="grow">${fmt.schedule(sub)}</span></div>
        <div class="row sm muted">${icon('calendar', 16)}<span class="grow">${fmt.days(sub.days)}</span></div>
      </div>
      <details class="more"><summary class="link">وردەکاری زیاتر</summary><div style="margin-top:8px">${ui.requestSummary(sub)}</div></details>
      <div class="hr"></div>
      ${dHead(d, { go: `driver/${d.id}` })}
      <div class="row between sm"><span class="muted">نرخی مانگانە</span><b class="brand">${fmt.money(sub.price)}</b></div>
      <div class="row" style="gap:8px"><button class="btn sm secondary grow" data-act="pauseSub" data-arg="${sub.id}">${icon(paused ? 'play' : 'clock', 16)}${paused ? 'دەستپێکردنەوە' : 'ڕاگرتنی کاتی'}</button><button class="btn sm secondary grow" data-act="editSub" data-arg="${sub.id}">${icon('edit', 16)}گۆڕانکاری</button><button class="btn sm secondary" data-go="chat/${d.id}" aria-label="نامە">${icon('chat', 16)}</button></div>
    </div>`;
  }
  acts.pauseSub = async (id) => {
    const sub = sel.sub(id);
    const d = sel.driver(sub.driverId);
    if (sub.status !== 'paused' && !(await TK.ask(`بەژدارییەکە ڕادەگیرێت و ${d.name} ئاگادار دەکرێتەوە.`))) return;
    actions.toggleSubPause(id);
    TK.toast(sub.status === 'paused' ? `دەستی پێکردەوە، ${d.name} ئاگادار کرا` : `ڕاگیرا، ${d.name} ئاگادار کرا`);
  };
  acts.editSub = (id) => {
    const sub = sel.sub(id);
    U.edit = { id, go: sub.go, back: sub.back || '', days: sub.days.slice() };
    TK.sheet(() => {
      const e = U.edit;
      const x = sel.sub(e.id);
      if (!x) return null;
      const d = sel.driver(x.driverId);
      return `<div class="h2">گۆڕانکاری لە بەژداری</div>
        <div class="sm muted">${esc(fmt.names(sel.names(x.memberIds)))}، ${esc(d.name)}. هەر گۆڕانکارییەک بۆ شۆفێرەکە دەنێردرێت.</div>
        <div class="grid2">
          <div class="field" style="${x.go ? '' : 'opacity:.45'}"><label for="e-go">کاتی چوون</label>${ui.timeSelect('e-go', e.go || '07:30', x.go ? '' : 'disabled')}</div>
          <div class="field" style="${x.back ? '' : 'opacity:.45'}"><label for="e-back">کاتی هاتنەوە</label>${ui.timeSelect('e-back', e.back || '14:00', x.back ? '' : 'disabled')}</div>
        </div>
        <div class="days">${fmt.WEEKDAY_SHORT.map((w, i) => `<button class="${e.days[i] ? 'on' : ''}" data-act="eDay" data-arg="${i}" aria-label="${fmt.WEEKDAYS[i]}">${w}</button>`).join('')}</div>
        <button class="btn block" data-act="saveSub">پاشەکەوت و ناردن بۆ شۆفێر</button>
        <div class="grid2">
          <button class="btn secondary sm" data-go="chat/${d.id}" data-close-first>${icon('chat', 16)}نامە بۆ شۆفێر</button>
          <button class="btn secondary sm" data-act="changeDriver" data-arg="${x.id}">${icon('swap', 16)}گۆڕینی شۆفێر</button>
        </div>
        <button class="btn danger block sm" data-act="cancelSub" data-arg="${x.id}">هەڵوەشاندنەوەی بەژداری</button>
        <button class="btn ghost block" data-close>داخستن</button>`;
    });
  };
  acts.eDay = (i) => {
    const go = document.getElementById('e-go');
    const back = document.getElementById('e-back');
    if (go) U.edit.go = go.value || U.edit.go;
    if (back && back.value) U.edit.back = back.value;
    U.edit.days[+i] = !U.edit.days[+i];
    TK.sheet.refresh();
  };
  acts.saveSub = () => {
    const e = U.edit;
    const goEl = document.getElementById('e-go');
    const backEl = document.getElementById('e-back');
    if (!e.days.some(Boolean)) return TK.toast('لانیکەم یەک ڕۆژ هەڵبژێرە');
    const patch = { days: e.days.slice() };
    if (goEl && !goEl.disabled && goEl.value) patch.go = goEl.value;
    if (backEl && !backEl.disabled && backEl.value) patch.back = backEl.value;
    actions.updateSub(e.id, patch);
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا و شۆفێرەکە ئاگادار کرایەوە');
  };
  acts.cancelSub = async (id) => {
    if (!(await TK.ask('بەژدارییەکە هەڵدەوەشێنرێتەوە و گەشتە نەکراوەکان لادەبرێن. گەشتە کراوەکان لە «گەشتەکانم» دەمێننەوە.'))) return;
    actions.cancelSub(id);
    TK.closeSheet();
    TK.toast('بەژدارییەکە هەڵوەشێنرایەوە');
  };
  /** گۆڕینی شۆفێر: بەژدارییەکی نوێ بە هەمان زانیاری دەست پێدەکات */
  acts.changeDriver = (id) => {
    const x = sel.sub(id);
    const findId = (name) => (TK.PLACES.find((p) => name.startsWith(p.name)) || {}).id || 'c:' + name.split('، ')[0];
    U.draft = Object.assign(newDraft(), {
      step: 3, memberIds: x.memberIds.slice(), mode: x.mode, rideType: x.rideType === 'private' ? 'private' : 'shared', womanOnly: x.womanOnly,
      fromId: findId(x.from), toId: findId(x.to), go: x.go || '07:30', dir: x.go && x.back ? 'both' : x.go ? 'go' : 'back', backTime: x.back || '14:00', days: x.days.slice(),
      note: 'بۆ گۆڕینی شۆفێر', replacesSub: x.id,
      // هەمان شوێنی وردی بەژدارییە کۆنەکە (نەک شوێنی ماڵ)
      fromGeo: x.fromGeo || null, toGeo: x.toGeo || null,
    });
    TK.closeSheet();
    TK.go('new');
    TK.toast('شۆفێری نوێ هەڵبژێرە. کاتێک ڕێککەوتن، بەژداری کۆن هەڵدەوەشێتەوە');
  };

  /* =========================================================
   * خێزان
   * ======================================================= */
  TK.route('family', {
    guard: authed,
    render() {
      const s = S();
      const subsOf = (id) => sel.mySubs().filter((x) => x.memberIds.includes(id));
      return page(`
        ${ui.header('خێزان', { back: 'home', right: `<button class="btn sm" data-act="addMember">${icon('plus', 18, 'currentColor', 2.2)}ئەندام</button>` })}
        <div class="sm muted" style="margin-top:-8px">هەموو ئەندامانی خێزان لە یەک ئەکاونت. هەر ئەندامێک دەتوانێت تەکسی خۆی هەبێت.</div>
        <div class="list">${s.family.members.map((m, i) => {
          const subs = subsOf(m.id);
          return `<div class="item">
            ${ui.avatar(m.initial, m.kind === 'child' ? 'amber' : m.woman ? 'woman' : '', 46)}
            <div class="grow"><div class="row" style="gap:6px"><b>${esc(m.name)}</b>${m.kind === 'child' ? ui.badge(`منداڵ${m.age ? '، ' + m.age + ' ساڵ' : ''}`, 'note') : ''}</div>
              <div class="xs muted">${esc(m.relation)}، ${subs.length ? subs.map((x) => esc(x.to)).join('، ') : 'هیچ بەژدارییەک'}</div></div>
            ${i > 0 ? `<button class="icon-btn plain" data-act="removeMember" data-arg="${m.id}" aria-label="لابردن">${icon('x', 18, 'var(--muted)')}</button>` : ''}
          </div>`;
        }).join('')}</div>
        <div class="section-title"><div class="h3">سەرپەرشتیارەکان</div><button class="link" data-act="addGuardian">زیادکردن</button></div>
        <div class="sm muted" style="margin-top:-8px">ئەم کەسانە ئاگادارکردنەوەی سوار بوون و گەیشتنی منداڵەکان وەردەگرن و گەشتەکان بە لایڤ دەبینن.</div>
        <div class="list">${s.family.guardians.map((g) => `<div class="item">${ui.avatar(g.initial, g.woman ? 'woman' : 'navy', 40)}<b class="grow">${esc(g.name)}</b>${icon('bell', 18, 'var(--success)')}</div>`).join('')}</div>
        <div class="card info row top sm">${icon('shield', 20)}<span>منداڵ هەرگیز لەگەڵ کەسی گەورەی نەناسراو سوار ناکرێت. گەشتی منداڵان تەنها بە شۆفێری پشکنراوی منداڵانە.</span></div>`);
    },
  });
  acts.addMember = () => {
    U.nm = U.nm || { kind: 'child', woman: false };
    TK.sheet(() => `
      <div class="h2">زیادکردنی ئەندام</div>
      <div class="field"><label for="mname">ناو</label><input class="input" id="mname" placeholder="بۆ نموونە: ئارام"></div>
      ${ui.seg('nmKind', [{ v: 'child', l: 'منداڵ' }, { v: 'adult', l: 'گەورە' }], U.nm.kind)}
      ${ui.seg('nmSex', [{ v: 'm', l: 'کوڕ / پیاو' }, { v: 'f', l: 'کچ / ئافرەت' }], U.nm.woman ? 'f' : 'm')}
      ${U.nm.kind === 'child' ? `<div class="field"><label for="mage">تەمەن</label><input class="input latin" id="mage" type="number" min="3" max="17" value="8"></div>` : ''}
      <button class="btn block" data-act="saveMember">زیادکردن</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.nmKind = (v) => {
    U.nm.kind = v;
    TK.sheet.refresh();
  };
  acts.nmSex = (v) => {
    U.nm.woman = v === 'f';
    TK.sheet.refresh();
  };
  acts.saveMember = () => {
    const name = document.getElementById('mname').value.trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    const age = U.nm.kind === 'child' ? +(document.getElementById('mage') || {}).value || undefined : undefined;
    actions.addMember(name, U.nm.kind, U.nm.woman, age);
    TK.closeSheet();
    TK.toast(`${name} زیاد کرا`);
  };
  acts.removeMember = async (id) => {
    const m = sel.member(id);
    if (sel.mySubs().some((x) => x.memberIds.includes(id))) return TK.toast(`${m.name} بەژداری چالاکی هەیە. سەرەتا بەژدارییەکە ڕابگرە`);
    if (!(await TK.ask(`${m.name} لاببرێت؟`))) return;
    actions.removeMember(id);
  };
  acts.addGuardian = () => {
    TK.sheet(() => `
      <div class="h2">زیادکردنی سەرپەرشتیار</div>
      <div class="sm muted">بۆ نموونە باپیرە، داپیرە یان مامۆستا. لە وەشانی ڕاستەقینەدا بانگهێشتێک بۆ ژمارەکەی دەنێردرێت.</div>
      <div class="field"><label for="gname">ناو</label><input class="input" id="gname" placeholder="ناوی سەرپەرشتیار"></div>
      <div class="field"><label for="gphone">ژمارەی مۆبایل</label><input class="input ltr latin" id="gphone" inputmode="tel" placeholder="750 000 0000"></div>
      <button class="btn block" data-act="saveGuardian">ناردنی بانگهێشت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveGuardian = () => {
    const name = document.getElementById('gname').value.trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    actions.addGuardian(name, false);
    TK.closeSheet();
    TK.toast('بانگهێشت نێردرا');
  };

  /* =========================================================
   * پارەدان
   * ======================================================= */
  const invoice = () => TK.invoice(S());
  TK.route('billing', {
    guard: authed,
    render() {
      const s = S();
      const inv = invoice();
      const b = s.billing;
      const methods = [{ v: 'fib', l: 'FIB' }, { v: 'fastpay', l: 'FastPay' }, { v: 'cash', l: 'کاش' }];
      return page(`
        ${ui.header('پارەدان', { back: 'profile' })}
        <div class="card big col">
          <div class="row between"><b>فاتورەی ${esc(b.month)}</b>${b.paid ? ui.badge('دراوە', 'ok') : ui.badge('ئامادەیە', 'note')}</div>
          ${inv.lines.length ? inv.lines.map((l) => `<div class="row between sm"><span class="grow" style="min-width:0"><span class="ellipsis" style="display:block">${esc(l.label)}</span>${l.note ? `<span class="xs muted">${esc(l.note)}، نرخی تەواو ${fmt.group(l.full)}</span>` : ''}</span><b>${fmt.group(l.amount)}</b></div>`).join('') : '<div class="sm muted">هیچ بەژدارییەکی چالاک نییە</div>'}
          ${inv.promo ? `<div class="row between sm ok"><span>داشکاندن (<span class="latin">${esc(b.promo.code)}</span>)</span><b>${fmt.group(inv.promo)}</b></div>` : ''}
          ${inv.credit ? inv.adjustments.map((a) => `<div class="row between sm ok"><span>${esc(a.note)}</span><b>${fmt.group(a.amount)}</b></div>`).join('') : ''}
          <div class="hr"></div>
          <div class="row between"><b>کۆی گشتی</b><span class="h2 brand">${fmt.money(inv.total)}</span></div>
        </div>
        ${b.paid ? `<button class="btn secondary block" data-act="receipt">${icon('receipt', 18)}پسوولە (چاپکردن / PDF)</button>` : `
          <div class="col tight"><div class="sm bold muted">شێوازی پارەدان</div>${ui.seg('payMethod', methods, b.method)}</div>
          ${b.promo ? '' : `<div class="row" style="gap:8px"><input class="input latin" id="promo" placeholder="کۆدی داشکاندن" style="text-transform:uppercase"><button class="btn secondary" data-act="applyPromo">جێبەجێکردن</button></div>`}
          <button class="btn block" data-act="payNow" ${inv.total ? '' : 'disabled'}>پارەدان، ${fmt.money(inv.total)}</button>
          <div class="xs muted center">بە هەر ١٠٠٠ دینار، یەک خاڵی پاداشت وەردەگریت</div>`}
        <div class="section-title"><div class="h3">مێژووی پارەدان</div></div>
        ${b.history.length ? `<div class="list">${b.history.map((h) => `<div class="item"><div class="ico-box ok">${icon('check', 18, 'var(--ok-text)', 2.4)}</div><div class="grow"><b>${esc(h.month)}</b><div class="xs muted">${fmt.ago(h.at)}</div></div><b>${fmt.money(h.total)}</b></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ پارەدانێک نییە</div>'}`);
    },
  });
  acts.payMethod = (v) => actions.setPayMethod(v);
  acts.applyPromo = () => {
    const err = actions.applyPromo(document.getElementById('promo').value);
    TK.toast(err || 'داشکاندنی ١٠٪ جێبەجێ کرا');
  };
  acts.payNow = () => {
    const inv = invoice();
    const m = { fib: 'FIB', fastpay: 'FastPay', cash: 'کاش' }[S().billing.method];
    TK.sheet(() => `
      <div class="h2">پشتڕاستکردنەوەی پارەدان</div>
      <div class="card col tight"><div class="row between"><span class="muted">بڕ</span><b class="brand">${fmt.money(inv.total)}</b></div><div class="row between"><span class="muted">شێواز</span><b>${m}</b></div></div>
      <div class="xs muted">ئەمە تەنها نموونەیە. لە وەشانی ڕاستەقینەدا ئەپی ${m} دەکرێتەوە.</div>
      <button class="btn block" data-act="confirmPay">پارەدان</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.confirmPay = () => {
    const inv = invoice();
    actions.pay(inv.total, Math.floor(inv.total / 1000));
    TK.closeSheet();
    TK.toast(`پارەدان سەرکەوتوو بوو، ${Math.floor(inv.total / 1000)} خاڵ زیاد کرا`);
  };
  acts.receipt = () => {
    const s = S();
    const h = s.billing.history[0];
    const inv = h && h.lines ? h : invoice();
    TK.sheet(() => `
      <div class="receipt">
        <div class="row between"><div class="brandmark"><img src="../shared/logo.png" alt=""><b>تەکسیەکەم</b></div><span class="badge ok">دراوە</span></div>
        <div style="margin:10px 0"><b>پسوولەی ${esc(h ? h.month : s.billing.month)}</b><div class="xs">${h ? fmt.date(h.at) : ''}</div><div class="xs">${esc(s.passenger.name)}، <span class="latin">+964 ${esc(s.passenger.phone)}</span></div></div>
        ${inv.lines.map((l) => `<div class="line"><span>${esc(l.label)}</span><b>${fmt.group(l.amount)}</b></div>`).join('')}
        ${inv.promo ? `<div class="line"><span>داشکاندن</span><b>${fmt.group(inv.promo)}</b></div>` : ''}
        ${inv.credit ? `<div class="line"><span>قەرەبوو</span><b>${fmt.group(inv.credit)}</b></div>` : ''}
        <div class="line"><b>کۆی گشتی</b><b>${fmt.money(h ? h.total : inv.total)}</b></div>
      </div>
      <button class="btn block" data-act="printReceipt">${icon('download', 18)}چاپکردن / پاشەکەوت وەک PDF</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.printReceipt = () => window.print();

  /* =========================================================
   * پاداشت
   * ======================================================= */
  const REWARDS = [
    { id: 'rw1', cost: 500, title: '١٠٬٠٠٠ دینار داشکاندن', sub: 'لە فاتورەی داهاتوو', icon: 'tag' },
    { id: 'rw2', cost: 1000, title: 'ڕۆژێکی بەخۆڕایی', sub: 'بۆ یەک ئەندامی خێزان', icon: 'car' },
    { id: 'rw3', cost: 2500, title: 'مانگێکی بەخۆڕایی بۆ منداڵێک', sub: 'گەشتی قوتابخانە', icon: 'school' },
  ];
  TK.route('rewards', {
    guard: authed,
    render() {
      const r = S().rewards;
      const next = REWARDS.find((x) => x.cost > r.points) || REWARDS[REWARDS.length - 1];
      return page(`
        ${ui.header('پاداشت', { back: 'home' })}
        <div class="card navy big col">
          <div class="row between"><span style="opacity:.8">خاڵەکانت</span>${icon('medal', 26, 'var(--amber)')}</div>
          <div class="h1" style="font-size:2.2rem;color:var(--amber)">${r.points}</div>
          <div class="progress" style="background:rgba(255,255,255,.15)"><i style="width:${Math.min(100, (r.points / next.cost) * 100)}%"></i></div>
          <div class="xs" style="opacity:.8">${r.points >= next.cost ? 'دەتوانیت پاداشتێک وەربگریت' : `${next.cost - r.points} خاڵی تر بۆ «${next.title}»`}</div>
        </div>
        <div class="h3">گۆڕینەوەی خاڵ</div>
        ${REWARDS.map((x) => {
          const got = r.redeemed.includes(x.id);
          return `<div class="card row"><div class="ico-box">${icon(x.icon, 20, 'var(--brand)')}</div><div class="grow"><b>${x.title}</b><div class="xs muted">${x.sub}، ${x.cost} خاڵ</div></div>
            <button class="btn sm ${got ? 'secondary' : ''}" data-act="redeem" data-arg="${x.id}" ${got || r.points < x.cost ? 'disabled' : ''}>${got ? 'وەرگیرا' : 'وەرگرتن'}</button></div>`;
        }).join('')}`);
    },
  });
  acts.redeem = (id) => {
    const x = REWARDS.find((y) => y.id === id);
    if (actions.redeem(id, x.cost)) TK.toast(`«${x.title}» وەرگیرا`);
  };
  acts.shareCode = () => {
    const code = S().rewards.code;
    shareText(`بە کۆدی ${code} لە تەکسیەکەم بەژداری بکە و ١٠٪ داشکاندن وەربگرە`);
  };

  /* =========================================================
   * پشتگیری
   * ======================================================= */
  const FAQ = [
    ['ئەگەر شۆفێرەکەم نەهات چی دەبێت؟', 'شۆفێرێکی جێگرەوە بە هەمان کات و نرخ دێت و پێشوەختە ئاگادار دەکرێیتەوە. ئەگەر دواکەوتن هەبوو، قەرەبووی ڕۆژەکە بۆ فاتورەی داهاتوو زیاد دەکرێت.'],
    ['چۆن نرخ دیاری دەکرێت؟', 'ئەپەکە بە پێی دووری ڕێگا، ژمارەی ڕۆژەکان و ژمارەی سەرنشینەکان نرخێک پێشنیار دەکات. شۆفێرەکان دەتوانن تا ١٥٪ کەمتر یان زیاتر نرخ بنێرن و تۆ هەڵدەبژێریت.'],
    ['دەتوانم بەژدارییەکەم ڕابگرم؟', 'بەڵێ، لە بەشی بەژداری «ڕاگرتنی کاتی» دابگرە. بۆ ئەو ڕۆژانەی ڕاگیراوە پارە نادەیت.'],
    ['بۆچی ژمارەی شۆفێر نابینم؟', 'بۆ پاراستنی تایبەتمەندی هەردوولا، هەموو پەیوەندییەکان لە ڕێگەی چاتی ناو ئەپەوەن.'],
  ];
  TK.route('support', {
    guard: authed,
    render() {
      const s = S();
      const st = { open: ['کراوە', 'note'], progress: ['لە کاردایە', 'info'], resolved: ['چارەسەر کرا', 'ok'] };
      return page(`
        ${ui.header('یارمەتی و پشتگیری', { back: 'profile' })}
        <div class="card danger col"><div><b>فریاکەوتن</b><div class="sm">لە کاتی مەترسیدا</div></div><div class="grid2"><a class="btn sm danger-solid" href="tel:104">${icon('phone', 16)}پۆلیس ١٠٤</a><a class="btn sm danger-solid" href="tel:122">${icon('phone', 16)}فریاگوزاری ١٢٢</a></div></div>
        <div class="h3">پرسیارە باوەکان</div>
        <div class="list">${FAQ.map(([q, a]) => `<details class="item" style="display:block"><summary class="bold" style="cursor:pointer">${q}</summary><div class="sm muted" style="margin-top:6px">${a}</div></details>`).join('')}</div>
        <div class="section-title"><div class="h3">داواکارییەکانی پشتگیری</div><button class="link" data-act="newTicket">نوێ</button></div>
        ${s.tickets.length ? `<div class="list">${s.tickets.map((t) => `<div class="item"><div class="grow"><div class="row" style="gap:6px"><b class="sm">#${t.id}</b>${ui.badge(st[t.status][0], st[t.status][1])}</div><div class="sm">${esc(t.subject)}</div>${t.reply ? `<div class="xs muted">وەڵام: ${esc(t.reply)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="sm muted">هیچ داواکارییەک نییە</div>'}`);
    },
  });
  acts.newTicket = () => {
    TK.sheet(() => `
      <div class="h2">داواکاری نوێ</div>
      <div class="chips">${['دواکەوتنی شۆفێر', 'گۆڕینی کات', 'گۆڕینی شۆفێر', 'پارەدان', 'شتی تر'].map((x) => `<button class="chip" data-act="ticketPreset" data-arg="${x}">${x}</button>`).join('')}</div>
      <div class="field"><label for="tsub">کێشەکە بنووسە</label><textarea class="input" id="tsub" placeholder="بە کورتی..."></textarea></div>
      <button class="btn block" data-act="saveTicket">ناردن</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.ticketPreset = (x) => {
    document.getElementById('tsub').value = x;
  };
  acts.saveTicket = () => {
    const v = document.getElementById('tsub').value.trim();
    if (v.length < 3) return TK.toast('کێشەکە بنووسە');
    actions.addTicket(v);
    TK.closeSheet();
    TK.toast('داواکارییەکەت نێردرا. بەم زووانە وەڵام دەدرێتەوە');
  };

  /* =========================================================
   * پرۆفایل
   * ======================================================= */
  TK.route('profile', {
    guard: authed,
    render() {
      const s = S();
      const p = s.passenger;
      const home = TK.place(p.homeId) || {};
      const nt = s.settings.notify;
      const item = (ic, label, go, extra = '') => `<div class="item tap" data-go="${go}"><div class="ico-box navy">${icon(ic, 20, 'var(--text)')}</div><b class="grow">${label}</b>${extra}${icon('forward', 18, 'var(--muted)')}</div>`;
      return page(`
        <div class="h1">پرۆفایل</div>
        <div class="card row">
          ${ui.avatar(p.name.slice(0, 1), 'navy', 60)}
          <div class="grow"><div class="h3">${esc(p.name)}</div><div class="sm muted latin" style="text-align:right">+964 ${esc(p.phone)}</div><div class="xs muted">${icon('home', 12)} ${esc(home.name || '')}</div></div>
          <button class="icon-btn" data-act="editProfile" aria-label="دەستکاری">${icon('edit', 18)}</button>
        </div>
        <div class="plabel">هەژمارەکەم</div>
        <div class="list">
          ${item('wallet', 'پارەدان و فاتورە', 'billing', !s.billing.paid && invoice().total ? ui.badge('ئامادەیە', 'note') : '')}
          ${item('users', 'خێزان', 'family', s.family.members.length > 1 ? `<span class="cntp">${s.family.members.length}</span>` : '')}
          ${item('calendar', 'بەژدارییەکانم', 'subs', sel.mySubs().length ? `<span class="cntp">${sel.mySubs().length}</span>` : '')}
          ${item('megaphone', 'داواکارییەکانم', 'requests')}
          ${item('clock', 'گەشتە کۆنەکان', 'history', S().history.length ? `<span class="cntp">${S().history.length}</span>` : '')}
        </div>
        <div class="plabel">زیاتر</div>
        <div class="list">
          ${item('tag', 'ئۆفەرەکان', 'offers')}
          ${item('news', 'ڕێکلام و هەواڵ', 'news')}
          ${item('gift', 'پاداشت', 'rewards', s.rewards.points ? `<span class="cntp">${s.rewards.points} خاڵ</span>` : '')}
          ${(() => {
            const acc = s.accounts.find((a) => a.phone === p.phone) || {};
            const pt = acc.partnerId ? TK.partner(acc.partnerId) : null;
            return pt
              ? `<div class="item"><div class="ico-box navy">${icon(pt.type === 'company' ? 'briefcase' : 'school', 20, 'var(--text)')}</div><div class="grow"><b>${esc(pt.name)}</b><div class="xs muted">لە ڕێگەی ئەم شوێنەوە تۆمار بوویت</div></div></div>`
              : `<div class="item tap" data-act="partnerCode"><div class="ico-box navy">${icon('school', 20, 'var(--text)')}</div><b class="grow">کۆدی قوتابخانە یان کۆمپانیا</b>${icon('forward', 18, 'var(--muted)')}</div>`;
          })()}
        </div>
        <div class="plabel">ڕێکخستن و یارمەتی</div>
        <div class="list">
          ${item('settings', 'ڕێکخستنەکان', 'settings')}
          <div class="item tap" data-act="changePass"><div class="ico-box navy">${icon('lock', 20, 'var(--text)')}</div><b class="grow">گۆڕینی وشەی نهێنی</b>${icon('forward', 18, 'var(--muted)')}</div>
          ${item('help', 'یارمەتی و پشتگیری', 'support')}
          <div class="item tap" data-act="showTerms"><div class="ico-box navy">${icon('doc', 20, 'var(--text)')}</div><b class="grow">مەرج و ڕێساکان</b>${icon('forward', 18, 'var(--muted)')}</div>
        </div>
        <button class="btn danger block" data-act="logout">${icon('logout', 18)}چوونەدەرەوە</button>
        <div class="center xs muted">تەکسیەکەم، وەشانی 1.0</div>`, 'profile');
    },
  });

  /* ڕێکخستنەکان لە لاپەڕەیەکی جیادا، بۆ ئەوەی پرۆفایل قەرەباڵغ نەبێت */
  TK.route('settings', {
    guard: authed,
    render() {
      const s = S();
      const p = s.passenger;
      const nt = s.settings.notify;
      return page(`
        ${ui.header('ڕێکخستنەکان', { back: 'profile' })}
        <div class="h3">ڕووکار</div>
        ${ui.settingsCard()}
        <div class="h3">تایبەتمەندی و ئاگادارکردنەوە</div>
        <div class="card col">
          <div class="row between"><div><div>ژمارەی مۆبایلەکەم</div><div class="xs muted">هەمیشە شاراوەیە. شۆفێر تەنها لە ڕێگەی نامەوە پەیوەندیت پێوە دەکات</div></div>${icon('lock', 18, 'var(--muted)')}</div>
          <div class="hr"></div>
          <div class="row between"><div><div>ئاگادارکردنەوە لەسەر مۆبایل</div><div class="xs muted">${notifyText()}</div></div><button class="btn sm secondary" data-act="askNotify">${TK.notifyStatus() === 'granted' ? 'چالاکە' : 'چالاککردن'}</button></div>
          <div class="hr"></div>
          <div class="row between"><span>ئاگادارکردنەوەی گەشت</span>${ui.toggle('notify', nt.ride, 'ride')}</div>
          <div class="row between"><span>ئاگادارکردنەوەی پارەدان</span>${ui.toggle('notify', nt.pay, 'pay')}</div>
          <div class="row between"><span>هەواڵ و ئۆفەر</span>${ui.toggle('notify', nt.news, 'news')}</div>
        </div>`);
    },
  });
  acts.partnerCode = () => {
    TK.sheet(() => `<div class="h2">کۆدی قوتابخانە یان کۆمپانیا</div>
      <div class="sm muted">ئەو کۆدەی قوتابخانە، زانکۆ یان کۆمپانیاکەت پێیداویت بنووسە. تەنها یەک جار دەنووسرێت.</div>
      <input class="input ltr latin" id="pcode" placeholder="CODE" style="text-transform:uppercase">
      ${U.pcErr ? `<div class="err">${esc(U.pcErr)}</div>` : ''}
      <button class="btn block" data-act="savePartnerCode">تۆمارکردن</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.savePartnerCode = () => {
    const err = actions.setPartnerCode((document.getElementById('pcode') || {}).value || '');
    U.pcErr = err;
    if (err) return TK.sheet.refresh();
    TK.closeSheet();
    TK.toast('کۆدەکە تۆمار کرا');
  };
  function notifyText() {
    const st = TK.notifyStatus();
    if (st === 'granted') return 'کاتێک ئەپەکە داخراوە ئاگادار دەکرێیتەوە';
    if (st === 'denied') return 'ڕێگەپێدان ڕەتکرایەوە. لە ڕێکخستنی مۆبایل بیگۆڕە';
    if (st === 'insecure' || st === 'unsupported') return 'ئەم مۆبایلە ئێستا پشتگیری ناکات. ئاگادارکردنەوەی ناو ئەپ کار دەکات';
    return 'بۆ ئاگادارکردنەوە کاتێک لە ئەپەکە نیت';
  }
  acts.askNotify = () => {
    TK.askNotify().then((r) => {
      const msg = { granted: 'ئاگادارکردنەوە چالاک کرا', denied: 'ڕێگەپێدان ڕەتکرایەوە', insecure: 'ئێستا تەنها ئاگادارکردنەوەی ناو ئەپ کار دەکات', unsupported: 'ئەم وێبگەڕە پشتگیری ناکات. ئەپەکە بخە سەر شاشەی سەرەکی' }[r] || '';
      if (msg) TK.toast(msg);
      TK.render();
    });
  };
  acts.notify = (k) => {
    const n = Object.assign({}, S().settings.notify);
    n[k] = !n[k];
    actions.setSetting('notify', n);
  };
  acts.logout = async () => {
    await actions.logout();
    TK.go('login', true);
  };
  acts.setGender = (g) => {
    const p = S().passenger;
    actions.updateProfile(p.name, p.homeId, p.city, g);
    TK.toast('پاشەکەوت کرا');
  };
  acts.editProfile = () => {
    const p = S().passenger;
    TK.sheet(() => `
      <div class="h2">دەستکاری پرۆفایل</div>
      <div class="field"><label for="pname">ناو</label><input class="input" id="pname" value="${esc(p.name)}"></div>
      <div class="field"><label for="pgender">ڕەگەز</label><select class="input" id="pgender"><option value="">هەڵبژێرە</option><option value="m" ${p.gender === 'm' ? 'selected' : ''}>نێر</option><option value="f" ${p.gender === 'f' ? 'selected' : ''}>مێ</option></select></div>
      <div class="field"><label for="pcity">شار</label><select class="input" id="pcity">${TK.cities().map((c) => `<option value="${c.id}" ${c.id === (p.city || 'erbil') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="phome">گەڕەکی ماڵ</label><select class="input" id="phome"><option value="">هەڵبژێرە</option>${TK.PLACES.filter((x) => x.kind === 'home').map((x) => `<option value="${x.id}" ${x.id === p.homeId ? 'selected' : ''}>${esc(x.name)}، ${esc((TK.city(x.city) || {}).name || '')}</option>`).join('')}</select></div>
      <button class="btn block" data-act="saveProfile">پاشەکەوت</button><button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveProfile = () => {
    const name = document.getElementById('pname').value.trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    actions.updateProfile(name, document.getElementById('phome').value, document.getElementById('pcity').value, document.getElementById('pgender').value);
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };

  acts.changePass = () => {
    TK.sheet(() => `<div class="h2">گۆڕینی وشەی نهێنی</div>
      <div class="field"><label for="op">وشەی نهێنی ئێستا</label><input class="input ltr latin" id="op" type="password"></div>
      <div class="field"><label for="np">وشەی نهێنی نوێ</label><input class="input ltr latin" id="np" type="password" placeholder="لانیکەم ٦ پیت"></div>
      ${U.cpErr ? `<div class="err">${esc(U.cpErr)}</div>` : ''}
      <button class="btn block" data-act="saveNewPass">پاشەکەوت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveNewPass = async (a, el) => {
    const done = TK.busyBtn(el);
    U.cpErr = await actions.changePassword(document.getElementById('op').value, document.getElementById('np').value);
    done();
    if (U.cpErr) return TK.sheet.refresh();
    TK.closeSheet();
    TK.toast('وشەی نهێنی گۆڕدرا');
  };
  acts.showTerms = () => TK.showTerms('passenger');

  /* ---------- دەستپێکردن ---------- */
  TK.start({
    home: 'home',
    start: 'splash',
    sw: 'sw.js',
    // ئەو ئاگادارکردنەوانەی کە لە دەرەوە دێن (شۆفێر، نامە، نرخ) بانەریان بۆ پیشان دەدرێت
    watchKey: (s) => s.passenger.phone,
    watch: (s) => (s.passenger.loggedIn ? s.notices.filter((n) => ['offer', 'chat', 'ride', 'drop', 'driver', 'swap'].includes(n.kind)) : []),
    validBack: (p) => !['splash', 'onboard', 'login', 'register'].includes(p) && (p !== 'new' || !!U.draft),
  });
})();
