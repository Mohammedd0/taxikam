/* یەکسا، ئەپی سەرنشین */
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
        { key: 'subs', path: 'subs', icon: 'calendar', label: 'بەشداری', badge: waiting || '' },
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
  /** وێنەی ئەندامی خێزان: خاوەن ئەکاونت وێنەکەی خۆی، ئەوانی تر وێنەی بنەڕەت (نەک پیت) */
  const memberAv = (m, size = 44) => ui.personAv(m && S().family.members[0] && m.id === S().family.members[0].id ? S().passenger.photo : null, size);
  const page = (body, active, cls = '') => `<div class="screen ${active ? '' : 'no-nav'} ${cls}">${body}</div>${active ? nav(active) : ''}`;

  /* =========================================================
   * سپلاش، ناساندن، چوونەژوورەوە
   * ======================================================= */
  // جووڵەی کرانەوە لە core.jsـدایە (playIntro)؛ ئەم پەڕەیە تەنها ڕاستەوخۆ دەچێتە سەرەکی
  TK.route('splash', {
    render: () => '<div class="splash"></div>',
    after: () => setTimeout(() => TK.go(authed() || 'home', true), 0),
  });

  const ONB = [
    { t: 'تەکسی مانگانە بۆ هەموو خێزان', s: 'یەک جار بەشداری بکە. هەموو ڕۆژێک شۆفێرێکی ناسراو لەکاتی خۆیدا دێت.', i: 'calendar', th: 'th-amber', f: [['car', '٧:٣٠ بەیانی'], ['check', 'یەکشەممە تا پێنجشەممە']] },
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
        <div class="col center auth-head">
          ${TK.logo('big')}
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
        <div class="center sm">ئەکاونتت نییە؟ <button class="link" data-go="register">ئەکاونتی نوێ دروست بکە</button></div>`, null, 'auth');
    },
  });
  acts.togglePass = () => {
    U.showPass = !U.showPass;
    TK.render();
  };
  acts.forgot = () => TK.sheet(() => `<div class="h2">وشەی نهێنیت لەبیر چووە؟</div>
      <div class="sm muted" style="line-height:1.9">پەیوەندی بە تیمی پشتگیری یەکسا بکە بۆ یارمەتی.</div>
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
      if (query && query.ref && query.ref !== U.refQ) {
        U.refQ = query.ref;
        U.ref = String(query.ref).toUpperCase();
        setTimeout(() => checkRef(U.ref), 0);
      }
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
          <div class="field"><label for="rref">کۆدی بانگهێشت <span class="muted xs">(ئارەزوومەندانە)</span></label>
            <input class="input ltr latin" id="rref" name="ref" autocapitalize="characters" autocomplete="off" placeholder="YK7Q4M" value="${esc(U.ref || '')}" style="text-transform:uppercase" data-input="refInput">
            <span class="xs muted">کۆدی هاوڕێ، ناوەندی خوێندن یان شوێنی کار</span>
            <div id="refmsg">${refMsg()}</div></div>
          ${U.regErr ? `<div class="err">${esc(U.regErr)}</div>` : ''}
          <button class="btn block" type="submit">دروستکردنی ئەکاونت</button>
          <div class="xs muted center">بە دروستکردنی ئەکاونت ڕازی دەبیت بە <button type="button" class="link xs" data-act="showTerms">مەرج و ڕێساکان و پاراستنی زانیاری</button></div>
        </form>`);
    },
  });
  /** پشکنینی کۆدی بانگهێشت لە کاتی نووسیندا: هاوبەش یان هاوڕێ */
  const refMsg = () => {
    const r = U.refRes;
    if (!r || !U.ref) return '';
    if (r.wait) return '<span class="xs muted">پشکنین...</span>';
    if (r.partner) return `<div class="ref-ok">${icon('check', 16, 'currentColor', 2.6)}<span>${esc(r.partner.name)}</span></div>`;
    if (r.friend) {
      const amt = TK.CONFIG.refOn ? `. ${TK.refText()} داشکاندن لە یەکەم مانگت` : '';
      return `<div class="ref-ok">${icon('check', 16, 'currentColor', 2.6)}<span>بانگهێشتی ${esc(r.friend.name || 'هاوڕێکەت')}${amt}</span></div>`;
    }
    return `<span class="xs err">${r.offline ? 'ئینتەرنێت نییە، دواتر دەپشکنرێت' : 'ئەم کۆدە نەدۆزرایەوە'}</span>`;
  };
  let refTimer = 0;
  function checkRef(v) {
    U.ref = String(v || '').trim().toUpperCase();
    const el = () => document.getElementById('refmsg');
    clearTimeout(refTimer);
    if (U.ref.length < 4) {
      U.refRes = null;
      if (el()) el().innerHTML = '';
      return;
    }
    U.refRes = { wait: true };
    if (el()) {
      el().innerHTML = refMsg();
      TK.localizeDigits(el());
    }
    const want = U.ref;
    refTimer = setTimeout(async () => {
      const r = await TK.resolveInvite(want);
      if (U.ref !== want) return;
      U.refRes = r || null;
      if (el()) {
        el().innerHTML = refMsg();
        TK.localizeDigits(el());
      }
    }, 350);
  }
  acts.refInput = (v) => checkRef(v);
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
    // وێنەی خاوەنی ئەکاونت ئەگەر خۆی سوار بێت، ئەگەر نا وێنەی بنەڕەت
    const leadAv = (size) => ui.personAv(lead.id && lead.id === (S().family.members[0] || {}).id ? S().passenger.photo : null, size);
    if (t.status === 'active') {
      const ni = sim.next(t);
      return `<div class="card big col tap" data-go="track/${t.id}">
        <div class="row">
          ${leadAv(44)}
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
      ${leadAv(44)}
      <div class="grow">
        <div class="bold" style="font-size:.95rem">${esc(fmt.names(names))}، ${esc(TK.dest(t))}</div>
        <div class="row wrap sm muted" style="gap:6px">${esc(d.name)}${d.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}</div>
      </div>
      <div class="col tight" style="align-items:flex-end"><b class="${t.status === 'skipped' ? 'muted strike' : 'brand'}">${fmt.clock(t.time)}</b>${t.status === 'skipped' ? ui.badge('نایەن', 'danger') : t.status === 'absent' ? ui.badge('سوار نەبوون', 'danger') : `<span class="xs muted">${t.status === 'done' ? 'تەواو بوو' : t.originalDriverId ? 'جێگرەوە' : t.runId ? `هاوبەش، ${TK.coRiders(t).filter((c) => !c.mine).reduce((n, c) => n + c.people.length, 0) + t.memberIds.length} کەس` : 'چاوەڕێ'}</span>`}</div>
    </div>`;
  }

  /** گەشتی داهاتوو: ئەمڕۆ (ئەگەر ماوە) یان بەیانی، بە پێی بەشداری و ڕۆت */
  function upcoming() {
    const now = fmt.hhmm(Date.now());
    const today = sel.myTrips().filter((t) => t.status === 'scheduled').sort((a, b) => a.time.localeCompare(b.time));
    const t = today.find((x) => x.time >= now) || null;
    if (t) return { when: 'today', time: t.time, trip: t, sub: sel.sub(t.subId), dir: t.dir, pooled: !!t.runId };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const out = [];
    sel.mySubs().filter((x) => x.status === 'active' && TK.dayApplies(x, d)).forEach((x) => ['go', 'back'].forEach((dir) => {
      const base = TK.dayTime(x, dir, d);
      if (!base) return;
      let time = base;
      const r = TK.inRouteOn(x, dir, d) ? (S().routes || []).find((y) => y.dir === dir && y.subIds.includes(x.id)) : null;
      if (r) {
        const subs = r.subIds.map((id) => sel.sub(id)).filter((y) => y && y.status === 'active' && TK.dayApplies(y, d) && TK.dayTime(y, dir, d) && TK.inRouteOn(y, dir, d));
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

      return page(`
        <div class="topbar">
          ${TK.logo()}
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

        ${isEmpty ? `<div class="card big col welcome-card">
            <div class="row top">
              <div class="grow col tight"><div class="h3">هێشتا هیچ گەشتێکت نییە!</div><div class="sm muted">یەکەم بەشداری مانگانەت دروست بکە. شوێن و کات دیاری بکە، و شۆفێرەکان نرخت بۆ دەنێرن.</div></div>
              <div class="ico-box xl">${icon('car', 34, 'var(--act)', 1.6)}</div>
            </div>
            <button class="btn block" data-act="newSub">${icon('plus', 20, 'currentColor', 2.2)}یەکەم بەشداری</button>
          </div>` : ''}

        ${/* گەشتی لایڤ (کاتێک شۆفێر بەڕێ کەوتووە) یان گەشتی داهاتوو */ ''}
        ${trips.filter((t) => t.status === 'active').map(tripCard).join('') || nextCard()}
        ${rateNudge()}

        ${isEmpty || sel.mySubs().length ? '' : `<button class="btn block lg" data-act="newSub">${icon('plus', 20, 'currentColor', 2.4)}بەشداری نوێ</button>`}
        <div class="grid2">
          <button class="card qtile tap" data-go="family">${icon('users', 22, 'var(--text)', 1.9)}<span class="grow">خێزان</span>${icon('forward', 16, 'var(--muted)')}</button>
          <button class="card qtile tap" data-go="drivers">${icon('car', 22, 'var(--text)', 1.9)}<span class="grow">شۆفێرەکان</span>${icon('forward', 16, 'var(--muted)')}</button>
        </div>

        ${swap && sel.mySubs().length ? `<div class="card note row top">${icon('swap', 20, 'var(--brand)')}<div class="grow sm"><b>${esc(swap.title)}</b><div>${esc(swap.body)}</div></div></div>` : ''}

        ${TK.walletOn() && TK.invoice(s, 'me', { due: true }).lines.length ? `<div class="card row tap" data-go="paymonth">
            <div class="ico-box" style="background:var(--amber)">${icon('wallet', 20, '#0B1733')}</div>
            <div class="grow"><b>پارەی ${esc(s.billing.month)} ئامادە بکە</b><div class="sm muted">${fmt.money(TK.invoice(s, 'me', { due: true }).total)}، گەشتەکان دوای پارەدان دەست پێدەکەن</div></div>${icon('forward', 20, 'var(--muted)')}
          </div>` : ''}
        ${!TK.walletOn() && !s.billing.paid && TK.invoice(s).total ? `<div class="card row tap" data-go="billing">
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
      const groups = { all: null, trips: ['ride', 'drop', 'driver', 'swap'], offers: ['offer', 'info'], pay: ['pay'] };
      const all = sel.myNotices();
      const list = groups[tab] ? all.filter((n) => groups[tab].includes(n.kind)) : all;
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
      const cta = { w1: ['بەشداری نوێ', 'newSub'], w2: ['بەشداری نوێ', 'newSub'], w3: ['زیادکردنی ئەندام', 'goFamily'], w5: ['کۆدی بانگهێشت', 'goRewards'] }[n.id];
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
      <div class="sm muted">${late > 0 ? `کاتی گەشتەکە ${fmt.clock(t.time)}ـە و هێشتا ${late} خولەکی ماوە. ` : ''}ئەگەر ڕاپۆرت بکەیت، قەرەبوو خۆکار بۆ فاتورەکەت زیاد دەکرێت و شۆفێر سزا دەدرێت. تیمی یەکسا ڕاپۆرتەکە دەپشکنێت.</div>
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
      <button class="btn block" data-act="sendRate" data-arg="${t.id}">ناردنی هەڵسەنگاندن${TK.CONFIG.pointsPerRating ? `، +${fmt.n(TK.CONFIG.pointsPerRating)} خاڵ` : ''}</button>
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
    TK.toast(TK.CONFIG.pointsPerRating ? `سوپاس! ${fmt.n(TK.CONFIG.pointsPerRating)} خاڵ زیاد کرا` : 'سوپاس!');
  };
  const unreadFrom = (driverId) => S().messages.filter((m) => m.peer === 'me' && m.driverId === driverId && m.fromDriver && !m.readP).length;
  acts.sos = () => {
    TK.sheet(() => `
      <div class="h2">فریاکەوتن</div>
      <div class="muted">شوێنی ئێستای گەشتەکە بۆ سەرپەرشتیارەکانی خێزان و تیمی یەکسا دەنێردرێت.</div>
      <div class="grid2">
        <a class="btn danger-solid lg" href="tel:104">${icon('phone', 18)}پۆلیس ١٠٤</a>
        <a class="btn danger-solid lg" href="tel:122">${icon('phone', 18)}فریاگوزاری ١٢٢</a>
      </div>
      <button class="btn secondary block" data-act="sosTeam">ئاگادارکردنەوەی تیمی یەکسا</button>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  acts.sosTeam = () => {
    TK.closeSheet();
    TK.toast('تیمی یەکسا ئاگادار کرا و پەیوەندیت پێوە دەکات');
  };
  /** هاوبەشکردنی دەق (یان کۆپی ئەگەر مۆبایل پشتگیری نەکات) */
  const shareText = (text) => (navigator.share ? navigator.share({ title: 'یەکسا', text }).catch(() => {}) : acts.copy(text));
  acts.shareTrip = (id) => {
    const t = sel.trip(id);
    shareText(`${t.title}، گەیشتن نزیکەی ${fmt.clock(sim.eta(t))}، یەکسا`);
  };

  /* =========================================================
   * هەموو گەشتەکانی ئەمڕۆ (نایەم / مەیە)
   * ======================================================= */
  Object.assign(TK.HELP, {
    trips: { title: 'گەشتەکانی ئەمڕۆ', body: () => `<p>ئەگەر ئەمڕۆ کەسێک نایەت، «نایەم» دابگرە. شۆفێرەکە دەستبەجێ ئاگادار دەکرێتەوە و پێویست ناکات بێت.</p><p class="muted">«نایەم» تا ${TK.CONFIG.skipCutoffMin} خولەک پێش کاتی گەشت دەکرێت. نرخی مانگانە ناگۆڕێت.</p>` },
    inbox: { title: 'نامەکان', body: '<p>بۆ ناردنی نامە بۆ شۆفێرێکی نوێ، پرۆفایلەکەی بکەرەوە و «نامە» دابگرە.</p><p class="muted">ژمارەی مۆبایلەکەت بۆ شۆفێر شاراوەیە. نامەی خۆت تا ٥ خولەک دەتوانیت بگەڕێنیتەوە.</p>' },
  });
  TK.route('trips', {
    guard: authed,
    render() {
      const trips = sel.myTrips().sort((a, b) => a.time.localeCompare(b.time));
      const pending = trips.filter((t) => t.status === 'scheduled');
      return page(`
        <div class="topbar"><div><div class="h1">گەشتەکانی ئەمڕۆ</div><div class="sm muted">${fmt.today()}</div></div>${TK.helpBtn('trips')}</div>
        ${trips.length ? trips.map((t) => {
          const d = sel.driver(t.driverId);
          const names = fmt.names(sel.names(t.memberIds));
          const st = { active: ui.badge('لە ڕێگەیە', 'ok'), done: ui.badge('تەواو بوو', 'ok'), skipped: ui.badge('نایەن', 'danger'), noshow: ui.badge('شۆفێر نەهات', 'danger'), absent: ui.badge('سوار نەبوون', 'danger'), scheduled: `<span class="badge dir ${t.dir === 'back' ? 'back' : 'go'}">${t.dir === 'back' ? 'هاتنەوە' : 'چوون'}</span>` }[t.status] || '';
          return `<div class="card col tripcard">
            <div class="row tap" data-go="track/${t.id}">
              <div class="ico-box ${t.status === 'skipped' ? 'danger' : ''}">${icon(t.dir === 'back' ? 'home' : t.kind === 'kids' ? 'school' : 'car', 20, 'var(--brand)')}</div>
              <div class="grow"><b>${esc(names)}، ${esc(TK.dest(t))}</b><div class="xs muted">${fmt.time(t.time)}، ${esc(d.name)}${t.originalDriverId ? ' (جێگرەوە)' : ''}${t.runId ? '، تەکسی هاوبەش' : ''}</div></div>${st}
            </div>
            ${t.status === 'scheduled' ? (TK.canSkip(t) ? `<div class="row" style="gap:8px"><button class="btn sm secondary grow" data-act="skipTrip" data-arg="${t.id}">${icon('x', 16)}نایەم</button><button class="btn sm secondary" data-go="chat/${d.id}">${icon('chat', 16)}</button></div>` : `<div class="row between"><span class="xs muted">کەمتر لە ${TK.CONFIG.skipCutoffMin} خولەک ماوە، «نایەم» ناکرێت. نامە بۆ شۆفێر بنێرە.</span><button class="btn sm secondary" data-go="chat/${d.id}">${icon('chat', 16)}</button></div>`) : ''}
            ${t.status === 'skipped' ? `<div class="row between"><span class="xs muted">${t.skipReason ? esc(t.skipReason) : 'شۆفێر ئاگادار کرایەوە'}</span><button class="btn sm secondary" data-act="unskip" data-arg="${t.id}">دەیەم</button></div>` : ''}
          </div>`;
        }).join('') : TK.walletOn() && TK.invoice(S(), 'me', { due: true }).lines.length ? ui.empty('calendar', 'پارەی مانگ چاوەڕێیە', 'گەشتەکان دوای پارەدانی ئەم مانگە دەست پێدەکەن', '<button class="btn" data-go="paymonth">پارەدانی مانگ</button>') : ui.empty('calendar', 'ئەمڕۆ هیچ گەشتێکت نییە', sel.mySubs().length ? 'گەشتەکانی بەیانی لە سەرەکی دەبینیت' : 'بەشدارییەکی مانگانە دروست بکە و هەموو ڕۆژێک شۆفێرەکەت دێت', sel.mySubs().length ? '<button class="btn secondary" data-go="home">سەرەکی</button>' : '<button class="btn" data-act="newSub">بەشداری نوێ</button>')}
        ${pending.length > 1 ? `<button class="btn ghost block" data-act="skipAll">ئەمڕۆ هیچ کەسێک نایەت</button>` : ''}
        <div class="xs muted center">«نایەم» تا ${TK.CONFIG.skipCutoffMin} خولەک پێش کاتی گەشت دەکرێت.</div>
        <button class="card row tap" style="text-align:right" data-go="history">${icon('clock', 20, 'var(--brand)')}<span class="grow bold">گەشتە کۆنەکان</span>${icon('forward', 18, 'var(--muted)')}</button>`, 'trips');
    },
  });
  acts.skipTrip = (id) => {
    const t = sel.trip(id);
    // گەشتی هاوڕێی ئەم گەشتە (چوون ← هاتنەوە) لە هەمان بەشداری
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
      // ئەو شۆفێرانەی بەشداریت لەگەڵیان هەیە بەڵام هێشتا نامەت نەناردووە
      const subDrivers = [...new Set(sel.mySubs().map((x) => x.driverId))].filter((id) => !threads.some((t) => t.driverId === id));
      return page(`
        <div class="topbar"><div class="h1">نامەکان</div><div class="row" style="gap:8px">${sel.unreadMsgsP() ? ui.badge(`${sel.unreadMsgsP()} نەخوێندراوە`, 'amber') : ''}${TK.helpBtn('inbox')}</div></div>
        ${ui.threads(threads, false, (t) => {
          const d = sel.driver(t.driverId);
          return { name: d.name, link: `chat/${d.id}`, avatar: ui.dAvatar(d, 54), online: d.id !== s.driver.meId || s.driver.online };
        })}
        ${subDrivers.length ? `<div class="section-title"><div class="h3">شۆفێرەکانت</div></div>
          <div class="list">${subDrivers.map((id) => {
            const d = sel.driver(id);
            return `<div class="item tap" data-go="chat/${d.id}">${ui.dAvatar(d, 44)}<div class="grow"><b>${esc(d.name)}</b><div class="xs muted">${esc(d.car)}</div></div><span class="btn sm secondary">${icon('chat', 16)}نامە</span></div>`;
          }).join('')}</div>` : ''}`, 'inbox');
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
        ${ui.header(d.name, { back: 'inbox', sub: d.car, cls: 'chathead', avatar: ui.dAvatar(d, 42), right: `<a class="icon-btn" href="tel:0${esc(d.phone)}" aria-label="پەیوەندی">${icon('phone', 20)}</a>` })}
        <div class="card col tight">
          <div class="row between"><span class="sm">ژمارەی شۆفێر</span><a class="latin bold" href="tel:0${esc(d.phone)}" dir="ltr">${fmt.phone(d.phone)}</a></div>
          <div class="row between"><span class="sm">ژمارەکەت بۆ شۆفێر شاراوەیە</span>${icon('lock', 16, 'var(--muted)')}</div>
        </div>
        <div id="thread">${threadHtml(d.id)}</div>
      </div>
      <div class="composer">
        <div class="quick">${QUICK.map((q) => `<button data-act="quickMsg" data-arg="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form class="row chat-form" data-submit="sendMsg" style="gap:8px">
          <textarea class="input chat-in" id="msg" name="text" rows="1" placeholder="نامە بنووسە..." autocomplete="off" enterkeyhint="enter"></textarea>
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
      TK.chatEnd();
      setTimeout(() => actions.markThreadRead(id, 'me', false), 300);
    },
  });
  function sendText(text) {
    const id = TK.app.current.params.id;
    const t = text.trim();
    if (!t) return;
    actions.sendMessage(id, 'me', t, false);
    const el = document.getElementById('msg');
    if (el) {
      el.value = '';
      TK.fitChat(el);
    }
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  }
  acts.sendMsg = (f) => sendText(f.text || '');
  acts.quickMsg = (q) => sendText(q);
  /* =========================================================
   * بەشداری نوێ (٣ هەنگاو)
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
  /** ئایا هەموو زانیارییەکانی بەشداری پڕکراونەتەوە */
  const draftReady = (dr) => !!(dr && dr.memberIds.length && dr.fromId && dr.toId && schedOk(dr));
  /** بەشداری لەگەڵ شۆفێرێکی دیاریکراو: ئەگەر بەشدارییەک دەستی پێکردووە بەردەوام دەبێت */
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
  /** نرخی مەزەندەکراو بۆ هەموو داواکارییەکانی ئەم بەشدارییە */
  function draftQuote(dr) {
    const info = draftInfo(dr);
    const groups = dr.mode === 'separate' ? info.members.map((m) => [m]) : [info.members];
    return groups.map((g) => {
      const hasChild = g.some((m) => m.kind === 'child');
      const hasAdult = g.some((m) => m.kind !== 'child');
      const rideType = dr.rideType === 'private' ? 'private' : hasChild && hasAdult ? 'family' : hasChild ? 'kids' : 'shared';
      return {
        names: fmt.names(g.map((m) => m.name)),
        price: TK.priceFor(Object.assign({ fromId: dr.fromId, toId: dr.toId, fromGeo: dr.fromGeo, toGeo: dr.toGeo, mode: dr.mode, rideType, riders: g.length, hasChild }, draftSched(dr))),
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
        ${ui.header('بەشداری نوێ', { back: 'home', sub: `هەنگاوی ${dr.step} لە ٣، ${steps[dr.step - 1]}` })}
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
          ${memberAv(m)}
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
  /** کاتەکانی داواکاری: یان یەک کات بۆ هەموو ڕۆژەکان، یان کاتی جیاواز بۆ هەر ڕۆژێک */
  function draftSched(dr) {
    if (dr.perDay) {
      const n = TK.normPerDay(dr.perDay);
      if (!n.empty) return { perDay: n.perDay, days: n.days, go: n.go, back: n.back };
    }
    return { perDay: null, days: dr.days.slice(), go: dr.dir !== 'back' ? dr.go : null, back: dr.dir !== 'go' ? dr.backTime : null };
  }
  const schedOk = (dr) => (dr.perDay ? !TK.normPerDay(dr.perDay).empty : dr.days.some(Boolean));
  /** خشتەی کاتی هەر ڕۆژێک. key: «d» بۆ داواکاری نوێ، «e» بۆ گۆڕانکاری بەشداری */
  function pdTable(src, key) {
    const rows = [0, 1, 2, 3, 4, 5, 6].filter((i) => src.days[i]);
    if (!rows.length) return '<div class="xs muted">سەرەتا ڕۆژەکان هەڵبژێرە</div>';
    const cell = (i, dir) => {
      const e = src.perDay[i] || {};
      const arg = `${key}|${dir}|${i}`;
      return e[dir]
        ? `<div class="pdcell">${ui.timeSelect(`pd-${key}-${dir}-${i}`, e[dir], `data-change="pdTime" data-arg="${arg}"`)}<button type="button" class="pdx" data-act="pdLeg" data-arg="${arg}" aria-label="لابردن">${icon('x', 14, 'currentColor', 2.4)}</button></div>`
        : `<div class="pdcell"><button type="button" class="pdoff" data-act="pdLeg" data-arg="${arg}">${icon('plus', 14)}${dir === 'go' ? 'چوون' : 'هاتنەوە'}</button></div>`;
    };
    return `<div class="pdtable">
      <div class="pdhead"><span></span><span>چوون</span><span>هاتنەوە</span></div>
      ${rows.map((i) => `<div class="pdrow"><b>${fmt.WEEKDAYS[i]}</b>${cell(i, 'go')}${cell(i, 'back')}</div>`).join('')}
      <div class="xs muted row" style="gap:4px">${icon('x', 12)}<span>واتە ئەو ڕۆژە ئەو بەشەی نییە، بۆ نموونە «بەیانی خۆم دەیبەم».</span></div>
    </div>`;
  }
  const pdSrc = (key) => (key === 'e' ? U.edit : U.draft);
  const pdRefresh = (key) => (key === 'e' ? TK.sheet.refresh() : TK.render());
  /** کاتی بنەڕەتی بۆ ڕۆژێکی نوێ لە خشتەکەدا */
  const pdDefault = (src, dir) => (dir === 'go' ? src.go || src.defGo || '07:30' : src.backTime || src.back || src.defBack || '14:00');
  acts.pdToggle = (key) => {
    const src = pdSrc(key);
    if (!src) return;
    if (src.perDay) {
      src.perDay = null;
    } else {
      const both = key === 'e' ? { go: !!src.go, back: !!src.back } : { go: src.dir !== 'back', back: src.dir !== 'go' };
      src.perDay = {};
      src.days.forEach((on, i) => on && (src.perDay[i] = { go: both.go ? pdDefault(src, 'go') : null, back: both.back ? pdDefault(src, 'back') : null }));
    }
    pdRefresh(key);
  };
  acts.pdTime = (v, el) => {
    const [key, dir, i] = el.getAttribute('data-arg').split('|');
    const src = pdSrc(key);
    if (!src || !src.perDay || !v) return;
    src.perDay[i] = Object.assign({ go: null, back: null }, src.perDay[i], { [dir]: v });
  };
  acts.pdLeg = (arg) => {
    const [key, dir, i] = arg.split('|');
    const src = pdSrc(key);
    if (!src || !src.perDay) return;
    const e = Object.assign({ go: null, back: null }, src.perDay[i]);
    if (!e[dir] && src.allow && !src.allow[dir]) return TK.toast(`ئەم بەشدارییە ${dir === 'go' ? 'چوونی' : 'هاتنەوەی'} تێدا نییە. بۆ زیادکردنی، داواکارییەکی نوێ بنێرە`);
    e[dir] = e[dir] ? null : pdDefault(src, dir);
    src.perDay[i] = e;
    pdRefresh(key);
  };
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
        ${dr.perDay ? '' : `<div class="col tight"><div class="sm bold">جۆری هاتووچۆ</div>${ui.seg('dDir', [{ v: 'both', l: 'چوون و هاتنەوە' }, { v: 'go', l: 'تەنها چوون' }, { v: 'back', l: 'تەنها هاتنەوە' }], dr.dir)}</div>
        <div class="${dr.dir === 'both' ? 'grid2' : 'col'}">
          ${dr.dir !== 'back' ? `<div class="field"><label for="go">کاتی چوون</label>${ui.timeSelect('go', dr.go, 'data-change="dTime" data-arg="go"')}</div>` : ''}
          ${dr.dir !== 'go' ? `<div class="field"><label for="backTime">کاتی هاتنەوە</label>${ui.timeSelect('backTime', dr.backTime, 'data-change="dTime" data-arg="backTime"')}</div>` : ''}
        </div>
        ${dr.dir !== 'both' ? `<div class="xs muted">${dr.dir === 'go' ? 'تەنها لە ماڵەوە بۆ شوێنی مەبەست' : 'تەنها لە شوێنی مەبەستەوە بۆ ماڵەوە'}، نرخ کەمترە</div>` : ''}`}
        <div class="field"><label for="startDate">ڕۆژی دەستپێکردن</label>${ui.dateSelect('startDate', dr.startDate, 45, 'data-change="dTime" data-arg="startDate"')}</div>
        <div class="xs muted">مانگی یەکەم بە پێی ڕۆژە ماوەکان حیساب دەکرێت</div>
      </div>
      <div class="card col">
        <div class="row between"><b class="sm">ڕۆژەکانی هەفتە</b><span class="xs muted">${fmt.days(dr.days) || 'هیچ ڕۆژێک'}</span></div>
        <div class="days">${fmt.WEEKDAY_SHORT.map((d, i) => `<button class="${dr.days[i] ? 'on' : ''}" data-act="dDay" data-arg="${i}" aria-label="${fmt.WEEKDAYS[i]}">${d}</button>`).join('')}</div>
        <div class="row wrap" style="gap:6px">${DAY_PRESETS.map(([k, l]) => `<button class="chip ${presetOn(dr.days, k) ? 'on' : ''}" data-act="dDays" data-arg="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="card col">
        <div class="row between" style="gap:10px"><div class="grow"><b class="sm">هەموو ڕۆژەکان هەمان کات نین</b><div class="xs muted">بۆ نموونە هەندێک ڕۆژ دەوامی بەیانی و هەندێک ڕۆژ نیوەڕۆ، یان هەندێک ڕۆژ تەنها چوون</div></div>${ui.toggle('pdToggle', !!dr.perDay, 'd')}</div>
        ${dr.perDay ? pdTable(dr, 'd') : ''}
      </div>
      <div class="row" style="gap:10px"><button class="btn secondary" data-act="dPrev">گەڕانەوە</button><button class="btn grow" data-act="dNext" ${dr.fromId && dr.toId && schedOk(dr) ? '' : 'disabled'}>بینینی نرخ</button></div>
      ${!dr.toId ? `<div class="hint">${icon('help', 16)}شوێنی مەبەست هەڵبژێرە بۆ بینینی نرخ</div>` : !dr.fromId ? `<div class="hint">${icon('help', 16)}شوێنی سوار بوون هەڵبژێرە</div>` : !schedOk(dr) ? `<div class="hint">${icon('help', 16)}لانیکەم یەک ڕۆژی هەفتە هەڵبژێرە${dr.perDay ? ' و چوون یان هاتنەوەی بۆ دیاری بکە' : ''}</div>` : ''}`;
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
        ${ui.requestSummary(Object.assign({ from: TK.place(dr.fromId).name + (dr.fromNote ? '، ' + dr.fromNote : ''), to: TK.place(dr.toId).name + (dr.toNote ? '، ' + dr.toNote : ''), startDate: dr.startDate }, draftSched(dr)))}
        <div style="margin-top:6px">${ui.requestTags({ hasChild: info.hasChild, rideType: q[0].rideType, womanOnly: dr.womanOnly, riders: dr.mode === 'one' ? info.members.length : 1 })}</div>
      </div>
      <div class="field"><label for="dnote">تێبینی بۆ شۆفێر (ئارەزوومەندانە)</label><textarea class="input" id="dnote" data-input="dNote" data-arg="note" placeholder="بۆ نموونە: کورسیی منداڵ پێویستە">${esc(dr.note)}</textarea></div>
      ${pref ? `
        <button class="btn block" data-act="sendDirect" data-arg="${pref.id}" ${prefFits ? '' : 'disabled'}>${icon('send', 18)}ناردن بۆ ${esc(pref.name)}</button>
        ${prefFits ? '' : `<div class="err">${esc(pref.name)} بۆ ئەم گەشتە ناگونجێت (کورسی، منداڵ یان ئافرەت)</div>`}
        <button class="btn secondary block" data-act="broadcast">${icon('megaphone', 18)}بڵاوکردنەوە بۆ هەموو شۆفێرەکان</button>
      ` : `
        <button class="card row tap pick-main" style="text-align:right" data-act="broadcast">
          <div class="ico-box">${icon('megaphone', 22, 'var(--act)')}</div>
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
      const dr = U.draft;
      dr.days[+i] = !dr.days[+i];
      if (dr.perDay) {
        if (dr.days[+i]) dr.perDay[i] = dr.perDay[i] || { go: dr.dir !== 'back' ? dr.go : null, back: dr.dir !== 'go' ? dr.backTime : null };
        else delete dr.perDay[i];
      }
      TK.render();
    },
    dDays(k) {
      const dr = U.draft;
      dr.days = presetDays(k);
      if (dr.perDay) {
        Object.keys(dr.perDay).forEach((i) => !dr.days[+i] && delete dr.perDay[i]);
        dr.days.forEach((on, i) => on && !dr.perDay[i] && (dr.perDay[i] = { go: dr.dir !== 'back' ? dr.go : null, back: dr.dir !== 'go' ? dr.backTime : null }));
      }
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
    const car = [`${d.carMake || ''} ${d.carModel || ''}`.trim() || d.car, d.carColor].filter(Boolean).join(' · ');
    return `<div class="dhead ${opts.go ? 'tap' : ''}" ${opts.go ? `data-go="${opts.go}"` : ''}>
      <div class="dh-av ${d.woman ? 'w' : ''}">${src ? `<img src="${src}" alt="">` : ui.personSvg()}${d.status === 'active' ? `<span class="dh-ok">${icon('check', 11, '#fff', 3.2)}</span>` : ''}</div>
      <div class="grow" style="min-width:0">
        <div class="dh-name">${esc(d.name)}</div>
        <div class="dh-car">${esc(car)}</div>
        <div class="dh-meta">${ui.plate(d.plate, d.plateType, 'sm')}${d.reviews ? `<span class="dh-rate">${icon('star', 13, 'var(--amber)', 1.5, 'var(--amber)')}${d.rating}</span>` : ''}<span class="dh-ver">${icon('shield', 13, 'currentColor', 2.2)}پشکنراو</span></div>
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
        <div class="empty" id="dnone" style="display:none">${icon('search', 30, 'var(--muted)')}<div class="h3">هیچ شۆفێرێک نەدۆزرایەوە</div><div class="sm muted">وشەیەکی تر تاقی بکەرەوە</div></div>
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
    return `<button class="btn block" data-act="subWith" data-arg="${d.id}">بەشداری لەگەڵ ${first}</button>${msg}`;
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
          <div class="row wrap" style="gap:6px;justify-content:center">${ui.badge('پشکنراو', 'ok')}${d.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}${d.kidsDriver ? ui.badge('شۆفێری منداڵان', 'note') : ''}${d.joinedAt ? ui.badge(`لەگەڵ یەکسا لە ${fmt.MONTHS[new Date(d.joinedAt).getMonth()]}ی ${new Date(d.joinedAt).getFullYear()}ەوە`) : ''}</div>
        </div>
        <div class="grid3">
          <div class="card stat"><b class="brand">★ ${d.rating}</b><span class="xs muted">${d.reviews} هەڵسەنگاندن</span></div>
          <div class="card stat"><b>${d.trips}</b><span class="xs muted">گەشت</span></div>
          <div class="card stat"><b>${d.onTime}٪</b><span class="xs muted">لەکاتی خۆیدا</span></div>
        </div>
        <div class="card col tight"><div class="row sm">${icon('pin', 16)}<span>ناوچەکانی کار: ${esc(d.area)}</span></div><div class="row sm">${icon('seat', 16)}<span>${d.seats || 4} کورسی بۆ سەرنشین</span></div></div>
        ${(d.tags || []).length ? `<div class="h3">سەرنشینەکان چی دەڵێن</div>
        <div class="chips">${d.tags.map((t) => `<span class="chip">${esc(t.label)}، <b>${t.count}</b></span>`).join('')}</div>` : ''}
        ${d.review ? `<div class="card col tight"><div class="row">${ui.personAv(null, 32)}<b class="grow sm">${esc(d.review.by)}</b><span class="xs muted">${esc(d.review.ago)}</span></div><div class="sm">«${esc(d.review.text)}»</div></div>` : ''}
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
        ${list.length ? list.map(reqCard).join('') : ui.empty('megaphone', 'هیچ داواکارییەک نییە', 'بەشدارییەکی نوێ دروست بکە و بۆ شۆفێرەکان بڵاوی بکەرەوە', tab === 'open' ? '<button class="btn" data-act="newSub">بەشداری نوێ</button>' : '')}`);
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
              <div class="ico-box xl mute">${icon('hourglass', 32, 'var(--muted)')}</div>
              <div class="h3">چاوەڕێی وەڵامی شۆفێرەکانین</div>
              <div class="sm muted">${r.target === 'all' ? 'داواکارییەکەت بۆ هەموو شۆفێرە گونجاوەکان نیشان دراوە. کاتێک یەکێکیان قبووڵی بکات ئاگادار دەکرێیتەوە.' : 'داواکارییەکەت بۆ شۆفێرەکە نێردرا. کاتێک وەڵام بداتەوە ئاگادار دەکرێیتەوە.'}</div>
              <div class="skeleton" style="width:100%;height:64px;margin-top:6px"></div>
            </div>`;
        if (r.target !== 'all') body += `<button class="btn secondary block" data-act="rebroadcast" data-arg="${r.id}">${icon('megaphone', 18)}بڵاوکردنەوە بۆ هەموو شۆفێرەکان</button>`;
        body += `<button class="btn ghost block" data-act="cancelReq" data-arg="${r.id}">هەڵوەشاندنەوەی داواکاری</button>`;
      } else if (r.status === 'matched' && chosen) {
        const d = sel.driver(chosen.driverId);
        body += `<div class="card ok col"><div class="row">${icon('check', 22, 'currentColor', 2.6)}<b class="grow">ڕێککەوتن لەگەڵ ${esc(d.name)}</b></div><div class="sm">نرخی مانگانە: <b>${fmt.money(chosen.price)}</b>. گەشتەکان لە بەشی سەرەکی دەردەکەون.</div></div>
          ${driverRow(d)}<button class="btn block" data-go="subs">بینینی بەشدارییەکان</button>`;
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
  /** پێشنیاری یەکسا: باشترین هەڵسەنگاندن (٤.٥ یان زیاتر) کە هەرزانترینیشە، ئەگەرنا باشترین هەڵسەنگاندن */
  function recommended(all) {
    if (all.length < 2) return null;
    const rated = all.map((o) => ({ o, d: sel.driver(o.driverId) || {} }));
    const good = rated.filter((x) => (x.d.rating || 0) >= 4.5).sort((a, b) => a.o.price - b.o.price);
    const pick = good[0] || rated.sort((a, b) => (b.d.rating || 0) - (a.d.rating || 0))[0];
    return pick ? pick.o : null;
  }
  /** داشکاندنی بانگهێشت بۆ یەکەم بەشداری (تەنها پێش بەشداری کردن) */
  const refDeal = () => {
    const r = TK.refAsInvitee(S());
    return r && r.status === 'joined' && TK.CONFIG.refOn ? r : null;
  };
  /** نرخ لەگەڵ داشکاندنی یەکەم مانگ: ٧٥٬٠٠٠ هێڵی بەسەردا ← ٧٠٬٠٠٠ */
  function dealPrice(price) {
    const a = refDeal() ? TK.refAmount(price) : 0;
    if (!a) return null;
    return { a, html: `<div class="price"><s class="was">${fmt.group(price)}</s> ${fmt.group(price - a)} <small>دینار یەکەم مانگ</small></div><span class="xs ok deal">${icon('gift', 14, 'currentColor', 2)}${fmt.money(a)} داشکاندنی بانگهێشتی هاوڕێ، یەکەم مانگ</span>` };
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
      ${best && best.driverId === o.driverId ? `<div class="reco-tag">${icon('star', 13, 'currentColor', 1.5, 'currentColor')}پێشنیاری یەکسا</div>` : ''}
      ${dHead(d, { go: `driver/${d.id}?req=${r.id}` })}
      <div class="row between"><div class="col tight">${(dealPrice(o.price) || {}).html || `<div class="price">${fmt.group(o.price)} <small>دینار مانگانە</small></div>`}${diff ? `<span class="xs ${diff < 0 ? 'ok' : 'neg'}">${diff < 0 ? fmt.group(-diff) + ' کەمتر لە پێشنیارکراو' : fmt.group(diff) + ' زیاتر لە پێشنیارکراو'}</span>` : '<span class="xs muted">نرخی پێشنیارکراو</span>'}</div><span class="xs muted">${d.trips || 0} گەشت</span></div>
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
          ${(() => {
            const dp = dealPrice(o.price);
            return dp ? `<div class="row between sm ok"><span>داشکاندنی بانگهێشتی هاوڕێ</span><b>${fmt.group(-dp.a)}</b></div>
              <div class="row between"><span class="muted">یەکەم مانگ</span><b><s class="was">${fmt.group(o.price)}</s> ${fmt.money(o.price - dp.a)}</b></div>` : '';
          })()}
        </div>
        <div class="xs muted">پارەدان لە کۆتایی هەر مانگێک لە ڕێگەی ئەپەوە دەبێت. دەتوانیت هەر کاتێک بەشدارییەکە ڕابگریت.</div>
        <button class="btn block" data-act="confirmOffer" data-arg="${rid}|${did}">پەسەندکردن و دەستپێکردن</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.confirmOffer = (arg) => {
    const [rid, did] = arg.split('|');
    actions.chooseOffer(rid, did);
    TK.closeSheet();
    TK.toast('بەشدارییەکەت چالاک کرا');
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
   * بەشدارییەکان
   * ======================================================= */
  TK.route('subs', {
    guard: authed,
    render() {
      const s = S();
      const open = s.requests.filter((r) => r.owner === 'me' && r.status === 'open');
      return page(`
        <div class="topbar"><div class="h1">بەشدارییەکان</div><button class="btn sm" data-act="newSub">${icon('plus', 18, 'currentColor', 2.2)}نوێ</button></div>
        ${open.length ? `<div class="section-title"><div class="h3">داواکارییە کراوەکان</div><button class="link" data-go="requests">هەمووی</button></div>${open.map(reqCard).join('')}` : ''}
        <div class="section-title"><div class="h3">بەشدارییە چالاکەکان</div>${sel.mySubs().length ? `<span class="cntp">${sel.mySubs().length}</span>` : ''}</div>
        ${sel.mySubs().length ? sel.mySubs().map(subCard).join('') : ui.empty('calendar', 'هێشتا هیچ بەشدارییەکت نییە', 'شوێن و کات دیاری بکە و شۆفێرەکان نرخت بۆ دەنێرن', '<button class="btn" data-act="newSub">یەکەم بەشداری</button>')}
        <button class="sfind tap" data-go="drivers">
          <span class="sf-ic">${icon('search', 24, '#F5A623', 2.4)}</span>
          <span class="grow"><b>گەڕان بەناو شۆفێرەکاندا</b><small>دۆزینەوەی شۆفێری نوێ بەپێی گەڕەک و کاتەکەت</small></span>
          <span class="sf-go">${icon('forward', 18)}</span>
        </button>`, 'subs');
    },
  });
  /** کارتی بەشداری (شێوازی D): ڕێگای گەشت لە ناوەڕاست، شۆفێر، نرخ و کردارەکان */
  function subCard(sub, i, all) {
    const d = sel.driver(sub.driverId) || {};
    const names = sel.names(sub.memberIds);
    const paused = sub.status === 'paused';
    const lead = sel.member(sub.memberIds[0]) || {};
    const src = d.photo ? TK.img(d.photo) : '';
    const per = TK.hasPerDay(sub);
    const place = (x) => esc(String(x || '').split('، ')[0]);
    const tm = (t, k) => (per ? '' : t ? `<span class="ds-t"><small>${k}</small>${fmt.clock(t)}</span>` : `<span class="ds-t off">${k === 'چوون' ? 'بێ چوون' : 'بێ هاتنەوە'}</span>`);
    const n = all && all.length > 1 ? `<div class="sub-sec"><span class="n">${i + 1}</span><b class="ellipsis">${esc(fmt.names(names))}</b><span class="ln"></span><span class="xs muted">بەشداری ${i + 1} لە ${all.length}</span></div>` : '';
    return `${n}<div class="dsub ${paused ? 'paused' : ''}">
      <div class="row between" style="gap:10px">
        <div class="row grow" style="min-width:0;gap:12px">
          ${memberAv(lead, 52)}
          <div class="grow" style="min-width:0"><b class="ds-name ellipsis">${esc(fmt.names(names))}</b><div class="xs muted">${esc(fmt.days(sub.days))}</div></div>
        </div>
        ${!paused && TK.walletOn() && !TK.subPaid(sub) ? `<button class="ts-state due tap" data-go="paymonth"><i></i>چاوەڕێی پارەدانە</button>` : `<span class="ts-state ${paused ? 'off' : ''}"><i></i>${paused ? 'ڕاگیراوە' : 'چالاک'}</span>`}
      </div>
      <div class="ds-route">
        <span class="ds-dot"></span><div class="ds-rt"><b class="ellipsis">${place(sub.from)}</b>${tm(sub.go, 'چوون')}</div>
        <span class="ds-line"></span><span></span>
        <span class="ds-dot end"></span><div class="ds-rt"><b class="ellipsis">${place(sub.to)}</b>${tm(sub.back, 'هاتنەوە')}</div>
      </div>
      ${per ? `<div class="ds-per">${icon('calendar', 16, 'currentColor', 2)}کاتی جیاواز بۆ هەر ڕۆژێک</div>` : ''}
      <details class="ds-more"><summary>${icon('doc', 16, 'currentColor', 2)}<span class="grow">وردەکاری زیاتر</span>${icon('down', 16, 'currentColor', 2.4)}</summary><div class="ds-detail">${ui.requestSummary(sub)}</div></details>
      <div class="ds-drv tap" data-go="driver/${d.id}">
        <div class="ts-dav ${d.woman ? 'w' : ''}">${src ? `<img src="${src}" alt="">` : ui.personSvg()}${d.status === 'active' ? `<span class="ts-ok">${icon('check', 11, '#fff', 3.2)}</span>` : ''}</div>
        <div class="grow" style="min-width:0">
          <div class="row" style="gap:8px"><b class="ellipsis">${esc(d.name || '')}</b><span class="ts-rate">${icon('star', 13, 'var(--amber)', 1.5, 'var(--amber)')}${d.reviews ? Number(d.rating).toFixed(1) : '0.0'}</span></div>
          <div class="ts-car"><span class="latin">${esc(`${d.carMake || ''} ${d.carModel || ''}`.trim() || d.car || '')}</span>${d.carColor ? `<i></i>${esc(d.carColor)}` : ''}</div>
        </div>
        ${ui.plate(d.plate, d.plateType, 'sm')}
      </div>
      <div class="ds-price"><span>نرخی مانگانە</span><b>${fmt.group(sub.price)} <small>دینار</small></b></div>
      <div class="ts-acts">
        <button class="btn secondary" data-act="pauseSub" data-arg="${sub.id}">${icon(paused ? 'play' : 'pause', 18)}${paused ? 'دەستپێکردنەوە' : 'ڕاگرتنی کاتی'}</button>
        <button class="btn secondary" data-act="editSub" data-arg="${sub.id}">${icon('sliders', 18)}گۆڕانکاری</button>
        <button class="ts-chat" data-go="chat/${d.id}" aria-label="نامە">${icon('chat', 22, '#fff', 2.2)}</button>
      </div>
    </div>`;
  }
  acts.pauseSub = async (id) => {
    const sub = sel.sub(id);
    const d = sel.driver(sub.driverId);
    if (sub.status !== 'paused' && !(await TK.ask(`بەشدارییەکە ڕادەگیرێت و ${d.name} ئاگادار دەکرێتەوە.`))) return;
    actions.toggleSubPause(id);
    TK.toast(sub.status === 'paused' ? `دەستی پێکردەوە، ${d.name} ئاگادار کرا` : `ڕاگیرا، ${d.name} ئاگادار کرا`);
  };
  acts.editSub = (id) => {
    const sub = sel.sub(id);
    // تەنها ئەو بەشانەی لە نرخەکەدا هەن (چوون/هاتنەوە) دەتوانرێن زیاد بکرێن
    const has = (dir) => (TK.hasPerDay(sub) ? Object.values(sub.perDay).some((x) => x && x[dir]) : !!sub[dir]);
    U.edit = { id, go: sub.go, back: sub.back || '', days: sub.days.slice(), perDay: TK.hasPerDay(sub) ? JSON.parse(JSON.stringify(sub.perDay)) : null, defGo: sub.go || '07:30', defBack: sub.back || '14:00', allow: { go: has('go'), back: has('back') } };
    TK.sheet(() => {
      const e = U.edit;
      const x = sel.sub(e.id);
      if (!x) return null;
      const d = sel.driver(x.driverId);
      return `<div class="h2">گۆڕانکاری لە بەشداری</div>
        <div class="sm muted">${esc(fmt.names(sel.names(x.memberIds)))}، ${esc(d.name)}. هەر گۆڕانکارییەک بۆ شۆفێرەکە دەنێردرێت.</div>
        ${e.perDay ? '' : `<div class="grid2">
          <div class="field" style="${x.go ? '' : 'opacity:.45'}"><label for="e-go">کاتی چوون</label>${ui.timeSelect('e-go', e.go || '07:30', x.go ? '' : 'disabled')}</div>
          <div class="field" style="${x.back ? '' : 'opacity:.45'}"><label for="e-back">کاتی هاتنەوە</label>${ui.timeSelect('e-back', e.back || '14:00', x.back ? '' : 'disabled')}</div>
        </div>`}
        <div class="days">${fmt.WEEKDAY_SHORT.map((w, i) => `<button class="${e.days[i] ? 'on' : ''}" data-act="eDay" data-arg="${i}" aria-label="${fmt.WEEKDAYS[i]}">${w}</button>`).join('')}</div>
        <div class="row between" style="gap:10px"><div class="grow"><b class="sm">هەموو ڕۆژەکان هەمان کات نین</b><div class="xs muted">کاتی جیاواز بۆ هەر ڕۆژێک</div></div>${ui.toggle('pdToggle', !!e.perDay, 'e')}</div>
        ${e.perDay ? pdTable(e, 'e') : ''}
        <button class="btn block" data-act="saveSub">پاشەکەوت و ناردن بۆ شۆفێر</button>
        <div class="grid2">
          <button class="btn secondary sm" data-go="chat/${d.id}" data-close-first>${icon('chat', 16)}نامە بۆ شۆفێر</button>
          <button class="btn secondary sm" data-act="changeDriver" data-arg="${x.id}">${icon('swap', 16)}گۆڕینی شۆفێر</button>
        </div>
        <button class="btn danger block sm" data-act="cancelSub" data-arg="${x.id}">هەڵوەشاندنەوەی بەشداری</button>
        <button class="btn ghost block" data-close>داخستن</button>`;
    });
  };
  acts.eDay = (i) => {
    const go = document.getElementById('e-go');
    const back = document.getElementById('e-back');
    if (go) U.edit.go = go.value || U.edit.go;
    if (back && back.value) U.edit.back = back.value;
    const e = U.edit;
    e.days[+i] = !e.days[+i];
    if (e.perDay) {
      if (e.days[+i]) e.perDay[i] = e.perDay[i] || { go: e.go || null, back: e.back || null };
      else delete e.perDay[i];
    }
    TK.sheet.refresh();
  };
  acts.saveSub = () => {
    const e = U.edit;
    const goEl = document.getElementById('e-go');
    const backEl = document.getElementById('e-back');
    if (!e.days.some(Boolean)) return TK.toast('لانیکەم یەک ڕۆژ هەڵبژێرە');
    let patch;
    if (e.perDay) {
      const n = TK.normPerDay(e.perDay);
      if (n.empty) return TK.toast('لانیکەم یەک چوون یان هاتنەوە دیاری بکە');
      patch = { perDay: n.perDay, days: n.days, go: n.go, back: n.back };
    } else {
      patch = { days: e.days.slice(), perDay: null };
      if (goEl && !goEl.disabled && goEl.value) patch.go = goEl.value;
      if (backEl && !backEl.disabled && backEl.value) patch.back = backEl.value;
    }
    actions.updateSub(e.id, patch);
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا و شۆفێرەکە ئاگادار کرایەوە');
  };
  acts.cancelSub = async (id) => {
    if (!(await TK.ask('بەشدارییەکە هەڵدەوەشێنرێتەوە و گەشتە نەکراوەکان لادەبرێن. گەشتە کراوەکان لە «گەشتەکانم» دەمێننەوە.'))) return;
    actions.cancelSub(id);
    TK.closeSheet();
    TK.toast('بەشدارییەکە هەڵوەشێنرایەوە');
  };
  /** گۆڕینی شۆفێر: بەشدارییەکی نوێ بە هەمان زانیاری دەست پێدەکات */
  acts.changeDriver = (id) => {
    const x = sel.sub(id);
    const findId = (name) => (TK.PLACES.find((p) => name.startsWith(p.name)) || {}).id || 'c:' + name.split('، ')[0];
    U.draft = Object.assign(newDraft(), {
      step: 3, memberIds: x.memberIds.slice(), mode: x.mode, rideType: x.rideType === 'private' ? 'private' : 'shared', womanOnly: x.womanOnly,
      fromId: findId(x.from), toId: findId(x.to), go: x.go || '07:30', dir: x.go && x.back ? 'both' : x.go ? 'go' : 'back', backTime: x.back || '14:00', days: x.days.slice(),
      note: 'بۆ گۆڕینی شۆفێر', replacesSub: x.id,
      // هەمان شوێنی وردی بەشدارییە کۆنەکە (نەک شوێنی ماڵ)
      fromGeo: x.fromGeo || null, toGeo: x.toGeo || null,
      perDay: TK.hasPerDay(x) ? JSON.parse(JSON.stringify(x.perDay)) : null,
    });
    TK.closeSheet();
    TK.go('new');
    TK.toast('شۆفێری نوێ هەڵبژێرە. کاتێک ڕێککەوتن، بەشداری کۆن هەڵدەوەشێتەوە');
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
            ${memberAv(m, 46)}
            <div class="grow"><div class="row" style="gap:6px"><b>${esc(m.name)}</b>${m.kind === 'child' ? ui.badge(`منداڵ${m.age ? '، ' + m.age + ' ساڵ' : ''}`, 'note') : ''}</div>
              <div class="xs muted">${esc(m.relation)}، ${subs.length ? subs.map((x) => esc(x.to)).join('، ') : 'هیچ بەشدارییەک'}</div></div>
            ${i > 0 ? `<button class="icon-btn plain" data-act="removeMember" data-arg="${m.id}" aria-label="لابردن">${icon('x', 18, 'var(--muted)')}</button>` : ''}
          </div>`;
        }).join('')}</div>
        <div class="section-title"><div class="h3">سەرپەرشتیارەکان</div><button class="link" data-act="addGuardian">زیادکردن</button></div>
        <div class="sm muted" style="margin-top:-8px">ئەم کەسانە ئاگادارکردنەوەی سوار بوون و گەیشتنی منداڵەکان وەردەگرن و گەشتەکان بە لایڤ دەبینن.</div>
        <div class="list">${s.family.guardians.map((g) => `<div class="item">${ui.personAv(/\(تۆ\)/.test(g.name) ? s.passenger.photo : null, 40)}<b class="grow">${esc(g.name)}</b>${icon('bell', 18, 'var(--success)')}</div>`).join('')}</div>
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
    if (sel.mySubs().some((x) => x.memberIds.includes(id))) return TK.toast(`${m.name} بەشداری چالاکی هەیە. سەرەتا بەشدارییەکە ڕابگرە`);
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
  /* =========================================================
   * جزدان (کاتێک بەڕێوەبەر چالاکی کردبێت)
   * ======================================================= */
  const W = () => TK.walletOn();
  const myBal = () => TK.balance(S(), 'me');
  const dueInv = () => TK.invoice(S(), 'me', { due: true });
  const myTx = () => TK.walletOf(S(), 'me').filter((e) => e.type !== 'legacy');
  const pendingTp = () => (S().topups || []).filter((x) => x.owner === 'me' && x.status === 'pending');
  const topupMethods = () => TK.payMethods().filter((m) => m.on !== false && m.topup !== false && (m.account === false || m.yeksaAccount));
  const monoOf = (m) => (m.account === false ? icon('cash', 22) : `<span class="latin">${esc(m.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || m.name.slice(0, 2))}</span>`);
  Object.assign(TK.HELP, {
    wallet: { title: 'جزدانەکەم', body: () => `<p>پارە دەخەیتە سەر جزدانەکەت (FIB، FastPay یان کاش)، و پارەی هەر مانگێک پێش یەکەم گەشت لێی دەدرێت.</p><p>پارەکە لای یەکسا دەمێنێتەوە و ڕۆژ بە ڕۆژ، تەنها دوای تەواوبوونی هەر گەشتێک، دەچێتە سەر حیسابی شۆفێر.</p><p>بۆ هەر ${fmt.n(TK.CONFIG.skipEvery)} ڕۆژ «نایەم» لە مانگێکدا، پارەی ${fmt.n(TK.CONFIG.skipRefundDays)} ڕۆژ دەگەڕێتەوە سەر جزدانەکەت. ئەگەر شۆفێر نەهات و یەکسا پەسەندی کرد، قەرەبووەکەش لێرە دەبینیت.</p>` },
  });
  TK.route('wallet', {
    guard: () => authed() || (W() ? null : 'billing'),
    render() {
      const s = S();
      const bal = myBal();
      const inv = dueInv();
      const need = Math.max(0, inv.total - bal);
      const paidNow = sel.mySubs().some((x) => TK.subPaid(x));
      const pend = pendingTp();
      const tx = myTx();
      const auto = s.billing.autoPay !== false;
      const pills = [[inv.lines.length ? 'calendar' : 'check', inv.lines.length ? `ئەم مانگە <b>${fmt.group(inv.total)}</b>` : paidNow ? 'ئەم مانگە دراوە' : 'هیچ پارەیەک نییە', '#FBBF24'], [auto ? 'check' : 'pause', auto ? 'خۆکار' : 'دەستی', '#FDE68A']];
      return page(`
        ${ui.header('جزدانەکەم', { back: 'profile', right: TK.helpBtn('wallet') })}
        ${ui.walletCard('باڵانسی بەردەست', 'جزدانی یەکسا', bal, pills)}
        <div class="qa">
          <button data-go="topup"><span class="c pri">${icon('plus', 22, 'currentColor', 2.4)}</span>پڕکردنەوە</button>
          <button data-go="paymonth"><span class="c">${icon('receipt', 20)}</span>پارەدانی مانگ</button>
          <button data-act="autoPay"><span class="c">${icon(auto ? 'check' : 'pause', 20)}</span>${auto ? 'خۆکار' : 'دەستی'}</button>
          <button data-act="help" data-arg="wallet"><span class="c">${icon('help', 20)}</span>یارمەتی</button>
        </div>
        ${inv.lines.length ? `<div class="card col" style="gap:10px">
          <div class="row between"><b>پارەی ${esc(s.billing.month)}</b><span class="badge note">گەشتەکان چاوەڕێن</span></div>
          <div class="progress"><i style="width:${Math.min(100, Math.round((bal / Math.max(1, inv.total)) * 100))}%"></i></div>
          <div class="row between sm"><span class="muted">ئامادەیە <b style="color:var(--text)">${fmt.group(Math.max(0, Math.min(bal, inv.total)))}</b></span><span class="muted">لە ${fmt.group(inv.total)}</span></div>
          ${need ? `<button class="btn block secondary sm" data-act="topupNeed" data-arg="${need}">${icon('plus', 16)}پڕکردنەوەی ${fmt.group(need)} ی ماوە</button>` : `<button class="btn block sm" data-go="paymonth">${icon('check', 16, 'currentColor', 2.4)}پارەدان لە جزدان</button>`}
        </div>` : ''}
        <div class="trust">${icon('shield', 16, 'var(--ok-text)')}<span>پارەکەت لای یەکسا پارێزراوە. هەر جووڵەیەک لێرە تۆمار دەکرێت.</span></div>
        ${pend.length ? `<div class="dayh">چاوەڕێی پشکنین</div><div class="list">${pend.map((x) => ui.txRow({ id: x.id, type: x.kind === 'refund' ? 'refund' : 'topup', amount: x.amount, method: x.kind === 'refund' ? null : x.method, note: x.kind === 'refund' ? x.note : `چاوەڕێی پشکنینی یەکسا${x.ref ? '، حەواڵە ' + x.ref : ''}`, at: x.at }, { pending: true, act: 'tpOpen' })).join('')}</div>` : ''}
        ${tx.length ? ui.txGroups(tx, (e) => ui.txRow(e)) : pend.length ? '' : ui.empty('wallet', 'هێشتا هیچ جووڵەیەک نییە', 'جزدانەکەت پڕ بکەرەوە بۆ پارەدانی مانگ', '<button class="btn" data-go="topup">پڕکردنەوە</button>')}`);
    },
  });
  acts.autoPay = () => {
    const on = S().billing.autoPay !== false;
    actions.setAutoPay(!on);
    TK.toast(on ? 'پارەدانی خۆکار کوژایەوە' : 'پارەدانی خۆکار چالاک کرا');
  };
  acts.topupNeed = (a) => {
    U.tp = { amount: +a, method: (topupMethods()[0] || {}).id };
    TK.go('topup');
  };
  acts.txOpen = (id) => {
    const e = S().wallet.find((x) => x.id === id);
    if (!e) return;
    TK.sheet(() => ui.receipt(e, `<button class="btn secondary block" data-act="txShare" data-arg="${esc(id)}">${icon('share', 18)}هاوبەشکردنی پسوولە</button>`));
  };
  acts.txShare = (id) => {
    const e = S().wallet.find((x) => x.id === id);
    if (!e) return;
    const L = TK.txLabel(e);
    shareText(`یەکسا: ${L.title}\n${e.amount > 0 ? '+' : '−'}${fmt.money(Math.abs(e.amount))}\n${fmt.date(e.at)}، ${fmt.hhmm(e.at)}\n${String(e.id).slice(-10).toUpperCase()}`);
  };
  acts.tpOpen = (id) => {
    const x = (S().topups || []).find((y) => y.id === id);
    if (!x) return;
    TK.sheet(() => ui.receipt({ id: x.id, type: x.kind === 'refund' ? 'refund' : 'topup', amount: x.amount, method: x.kind === 'refund' ? null : x.method, ref: x.ref, note: x.note || '', at: x.at, _pending: true }, x.kind === 'refund' ? '' : `<button class="btn secondary block" data-act="tpCancel" data-arg="${esc(id)}">هەڵوەشاندنەوەی داواکاری</button>`));
  };
  acts.tpCancel = async (id) => {
    if (!(await TK.ask('داواکاری پڕکردنەوە هەڵدەوەشێتەوە؟ ئەگەر پارەت ناردووە، هەڵی مەوەشێنەرەوە.'))) return;
    actions.cancelTopup(id);
    TK.closeSheet();
  };
  /** پڕکردنەوە، هەنگاوی ١: بڕ و شێواز */
  TK.route('topup', {
    guard: () => authed() || (W() ? null : 'billing'),
    render() {
      const ms = topupMethods();
      const inv = dueInv();
      const need = Math.max(0, inv.total - myBal());
      if (!U.tp) U.tp = { amount: need > 0 ? Math.ceil(need / 1000) * 1000 : 50000, method: (ms[0] || {}).id };
      if (!ms.some((m) => m.id === U.tp.method)) U.tp.method = (ms[0] || {}).id;
      const chips = [25000, 50000, 100000].concat(need > 0 && ![25000, 50000, 100000].includes(Math.ceil(need / 1000) * 1000) ? [Math.ceil(need / 1000) * 1000] : []);
      return page(`
        ${ui.header('پڕکردنەوەی جزدان', { back: 'wallet' })}
        <div class="steps"><i class="on"></i><i></i><i></i></div>
        <div class="amt-hero"><div class="xs muted">چەند دەخەیتە سەر جزدانەکەت؟</div>
          <input class="amt-in latin" id="tp-amt" inputmode="numeric" value="${fmt.group(U.tp.amount)}" data-change="tpAmt" aria-label="بڕ"><div class="xs muted">دینار</div></div>
        <div class="chips" style="justify-content:center">${chips.map((a) => `<button class="chip ${U.tp.amount === a ? 'on' : ''}" data-act="tpPick" data-arg="${a}">${a === Math.ceil(need / 1000) * 1000 && need > 0 ? `بۆ ئەم مانگە ${fmt.group(a)}` : fmt.group(a)}</button>`).join('')}</div>
        <div class="h3" style="margin-top:6px">بە چی دەینێریت؟</div>
        ${ms.length ? `<div class="list">${ms.map((m) => `<div class="item tap mth ${U.tp.method === m.id ? 'on' : ''}" data-act="tpMethod" data-arg="${m.id}"><span class="mono">${monoOf(m)}</span><div class="grow"><b>${esc(m.name)}</b><div class="xs muted">${m.account === false ? 'بیدە بە بەڕێوەبەر یان نوێنەری یەکسا' : `لە ئەپی ${esc(m.name)} بنێرە بۆ هەژماری یەکسا`}</div></div><span class="radio ${U.tp.method === m.id ? 'on' : ''}"></span></div>`).join('')}</div>` : '<div class="card note sm">هێشتا هیچ شێوازێکی پارەدان دانەنراوە. پەیوەندی بە یەکسا بکە.</div>'}
        <button class="btn block lg" data-act="tpNext" ${ms.length ? '' : 'disabled'}>بەردەوام بوون</button>
        <div class="trust">${icon('lock', 16)}<span>پارەدانی ڕاستەوخۆ لە ناو ئەپ بە FIB و FastPay بەم زووانە دێت.</span></div>`);
    },
  });
  const readAmt = () => {
    const el = document.getElementById('tp-amt');
    const v = el ? Number(String(el.value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, '')) : 0;
    if (v) U.tp.amount = v;
    return U.tp.amount;
  };
  acts.tpAmt = () => readAmt() && TK.render();
  acts.tpPick = (a) => {
    U.tp.amount = +a;
    TK.render();
  };
  acts.tpMethod = (id) => {
    readAmt();
    U.tp.method = id;
    TK.render();
  };
  acts.tpNext = () => {
    const a = readAmt();
    if (!(a >= 1000)) return TK.toast('بڕەکە بنووسە');
    if (a > 5000000) return TK.toast('بڕەکە زۆرە');
    TK.go('topup/send');
  };
  /** پڕکردنەوە، هەنگاوی ٢: ناردن و ژمارەی حەواڵە */
  TK.route('topup/send', {
    guard: () => authed() || (W() && U.tp ? null : 'wallet'),
    render() {
      const m = TK.payMethod(U.tp.method) || {};
      const cash = m.account === false;
      const photo = U.tp.photo ? TK.img(U.tp.photo) : '';
      return page(`
        ${ui.header(cash ? 'پارەدان بە کاش' : 'ناردنی پارەکە', { back: 'topup' })}
        <div class="steps"><i class="on"></i><i class="on"></i><i></i></div>
        ${cash ? `<div class="card col" style="gap:12px">
            <div class="row"><span class="mono">${icon('cash', 22)}</span><div class="grow"><b>${fmt.money(U.tp.amount)} بە کاش</b><div class="xs muted">بیدە بە بەڕێوەبەر یان نوێنەری یەکسا</div></div></div>
            <div class="sm muted">کاتێک پارەکەیان وەرگرت، باڵانسەکەت زیاد دەکەن و ئاگادار دەکرێیتەوە. بۆ کات و شوێن «پەیوەندی» بکە.</div>
            <button class="btn secondary block sm" data-act="contactUs">${icon('phone', 16)}پەیوەندی بە یەکسا</button>
          </div>`
        : `<div class="card col" style="gap:12px">
            <div class="row"><span class="mono">${monoOf(m)}</span><div class="grow"><div class="xs muted">بنێرە بۆ</div><b>${esc(m.holder || 'یەکسا')}</b></div><span class="badge ok">پشتڕاستکراو</span></div>
            <div class="acct"><span class="latin" dir="ltr" data-raw>${esc(m.yeksaAccount || '')}</span><button class="btn sm secondary" data-act="copy" data-arg="${esc(m.yeksaAccount || '')}">${icon('copy', 16)}کۆپی</button></div>
            <div class="row between"><span class="muted">بڕ</span><b>${fmt.money(U.tp.amount)}</b></div>
          </div>
          <div class="card col vsteps">
            <div class="row" style="gap:12px"><span class="vs-n">١</span><div class="grow"><b class="sm">ئەپی ${esc(m.name)} بکەرەوە و ${fmt.group(U.tp.amount)} بنێرە</b><div class="xs muted">بۆ ئەو ژمارەیەی سەرەوە</div></div></div>
            <div class="row" style="gap:12px"><span class="vs-n">٢</span><div class="grow"><b class="sm">ژمارەی حەواڵەکە لێرە بنووسە</b><div class="xs muted">لە پسوولەی ${esc(m.name)} کۆپی بکە</div></div></div>
            <div class="row" style="gap:12px"><span class="vs-n">٣</span><div class="grow"><b class="sm">داواکاری بنێرە</b><div class="xs muted">یەکسا دەیپشکنێت و باڵانسەکەت زیاد دەکات</div></div></div>
          </div>
          <div class="field"><label for="tp-ref">ژمارەی حەواڵە</label><input class="input ltr latin" id="tp-ref" autocomplete="off" value="${esc(U.tp.ref || '')}"></div>
          <label class="dash">${photo ? `<img src="${photo}" alt="">` : icon('camera', 20)}<span>${photo ? 'وێنەی پسوولە زیاد کرا، بۆ گۆڕین دابگرە' : 'وێنەی پسوولەکە زیاد بکە (ئارەزوومەندانە)'}</span><input type="file" accept="image/*" data-change="tpPhoto" style="display:none"></label>`}
        <button class="btn block lg" data-act="tpSend">${icon('send', 18)}${cash ? 'ناردنی داواکاری' : 'پارەم نارد، پشکنین بکە'}</button>
        <div class="xs muted center">ئاسایی لە ماوەیەکی کورتدا پەسەند دەکرێت و ئاگادار دەکرێیتەوە.</div>`);
    },
  });
  acts.tpPhoto = async (v, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    U.tp.ref = (document.getElementById('tp-ref') || {}).value || U.tp.ref;
    try {
      U.tp.photo = await TK.saveImage(await TK.compressImage(f));
      TK.render();
    } catch (e) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە');
    }
  };
  acts.tpSend = () => {
    const m = TK.payMethod(U.tp.method) || {};
    const ref = String((document.getElementById('tp-ref') || {}).value || '').trim();
    if (m.account !== false && ref.length < 3) return TK.toast('ژمارەی حەواڵە بنووسە');
    actions.requestTopup(U.tp.amount, U.tp.method, ref, U.tp.photo || null);
    U.tp = null;
    TK.toast('داواکارییەکەت نێردرا');
    TK.go('wallet', true);
  };
  /** پارەدانی مانگ لە جزدان */
  TK.route('paymonth', {
    guard: () => authed() || (W() ? null : 'billing'),
    render() {
      const s = S();
      const inv = dueInv();
      const bal = myBal();
      const need = Math.max(0, inv.total - bal);
      if (!inv.lines.length) return page(`${ui.header('پارەدانی مانگ', { back: 'wallet' })}${ui.empty('receipt', sel.mySubs().length ? 'پارەی ئەم مانگە دراوە' : 'هیچ بەشدارییەکت نییە', sel.mySubs().length ? 'گەشتەکانت بەردەوامن. مانگی داهاتوو لێرە دەردەکەوێت.' : 'بەشدارییەکی مانگانە دروست بکە', '<button class="btn secondary" data-go="wallet">جزدانەکەم</button>')}`);
      return page(`
        ${ui.header('پارەدانی مانگ', { back: 'wallet' })}
        <div class="card col" style="gap:12px">
          ${inv.lines.map((l) => {
            const sub = s.subscriptions.find((x) => x.id === l.subId) || {};
            const d = sel.driver(sub.driverId) || {};
            return `<div class="row" style="gap:12px">${ui.dAvatar(d, 48)}<div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(l.label)}</b><div class="xs muted">${esc(fmt.days(sub.days))}${l.note ? '، ' + esc(l.note) : ''}</div></div><b>${fmt.group(l.amount)}</b></div>`;
          }).join('<div class="hr"></div>')}
          ${inv.promo || inv.discounts.length ? '<div class="hr"></div>' : ''}
          ${inv.promo ? `<div class="row between"><span class="muted">داشکاندنی هاوبەش</span><b class="ok">−${fmt.group(inv.promo)}</b></div>` : ''}
          ${inv.discounts.map((d) => `<div class="row between"><span class="muted">${esc(d.label)}</span><b class="ok">−${fmt.group(d.amount)}</b></div>`).join('')}
          <div class="hr"></div>
          <div class="row between"><span class="muted">کۆی پارەی ${esc(s.billing.month)}</span><b>${fmt.money(inv.total)}</b></div>
          <div class="row between"><span class="muted">باڵانسی جزدانەکەت</span><b class="${bal >= inv.total ? 'ok' : ''}">${fmt.money(bal)}</b></div>
          ${need ? `<div class="progress"><i style="width:${Math.min(100, Math.round((bal / Math.max(1, inv.total)) * 100))}%"></i></div>
            <div class="row between sm"><span class="muted">لە جزدانەکەت <b style="color:var(--text)">${fmt.group(Math.max(0, bal))}</b></span><span class="muted">پێویستە <b class="neg">${fmt.group(need)}</b> ی تر</span></div>
            <button class="btn block lg" data-act="topupNeed" data-arg="${need}">${icon('plus', 20, 'currentColor', 2.4)}پڕکردنەوەی ${fmt.group(need)}</button>`
          : `<div class="row between"><span class="muted">باڵانس دوای پارەدان</span><b>${fmt.money(bal - inv.total)}</b></div>
            <button class="btn block lg" data-act="payMonthNow">${icon('check', 20, 'currentColor', 2.4)}پارەدان لە جزدان</button>`}
          <div class="trust" style="padding:0">${icon('shield', 16, 'var(--ok-text)')}<span>پارەکە لای یەکسا دەمێنێتەوە و ڕۆژ بە ڕۆژ، تەنها دوای تەواوبوونی هەر گەشتێک، دەچێتە سەر حیسابی شۆفێر.</span></div>
        </div>
        ${inv.waiting.length ? `<div class="xs muted">${inv.waiting.map((w) => esc(w.label)).join('، ')} بۆ مانگی داهاتوو دەمێنێتەوە.</div>` : ''}`);
    },
  });
  acts.payMonthNow = async (a, el) => {
    const err = actions.payMonth();
    if (err) return TK.toast(err);
    TK.toast('پارەی مانگ درا، گەشتەکان دەست پێدەکەن');
    TK.go('wallet', true);
  };

  TK.route('billing', {
    guard: () => authed() || (TK.walletOn() ? 'wallet' : null),
    render() {
      const s = S();
      const b = s.billing;
      // دوای پارەدان، هەمان ئەو فاتورەیە نیشان دەدرێت کە دراوە (نەک حیسابێکی نوێ)
      const h0 = b.paid && b.history[0] && b.history[0].month === b.month && b.history[0].lines ? b.history[0] : null;
      const inv = h0 ? { lines: h0.lines, sub: h0.lines.reduce((n, l) => n + l.amount, 0), promo: h0.promo || 0, discounts: h0.discounts || [], waiting: [], credit: h0.credit || 0, adjustments: h0.credit ? [{ note: 'قەرەبوو', amount: h0.credit }] : [], total: h0.total } : invoice();
      const methods = [{ v: 'fib', l: 'FIB' }, { v: 'fastpay', l: 'FastPay' }, { v: 'cash', l: 'کاش' }];
      return page(`
        ${ui.header('پارەدان', { back: 'profile' })}
        <div class="card big col">
          <div class="row between"><b>فاتورەی ${esc(b.month)}</b>${b.paid ? ui.badge('دراوە', 'ok') : ui.badge('ئامادەیە', 'note')}</div>
          ${inv.lines.length ? inv.lines.map((l) => `<div class="row between sm"><span class="grow" style="min-width:0"><span class="ellipsis" style="display:block">${esc(l.label)}</span>${l.note ? `<span class="xs muted">${esc(l.note)}، نرخی تەواو ${fmt.group(l.full)}</span>` : ''}</span><b>${fmt.group(l.amount)}</b></div>`).join('') : '<div class="sm muted">هیچ بەشدارییەکی چالاک نییە</div>'}
          ${inv.promo ? `<div class="row between sm ok"><span>داشکاندن (<span class="latin">${esc(b.promo.code)}</span>)</span><b>${fmt.group(inv.promo)}</b></div>` : ''}
          ${inv.discounts.map((d) => `<div class="row between sm ok"><span>${esc(d.label)}</span><b>${fmt.group(-d.amount)}</b></div>`).join('')}
          ${inv.credit ? inv.adjustments.map((a) => `<div class="row between sm ok"><span>${esc(a.note)}</span><b>${fmt.group(a.amount)}</b></div>`).join('') : ''}
          <div class="hr"></div>
          <div class="row between"><b>کۆی گشتی</b><span class="h2 brand">${fmt.money(inv.total)}</span></div>
          ${inv.waiting.length ? `<div class="xs muted">${fmt.money(inv.waiting.reduce((n, d) => n + d.amount, 0))} داشکاندنی چاوەڕوان لە فاتورەی داهاتوو دەبڕدرێت</div>` : ''}
        </div>
        ${b.paid ? `<button class="btn secondary block" data-act="receipt">${icon('receipt', 18)}پسوولە (چاپکردن / PDF)</button>` : `
          <div class="col tight"><div class="sm bold muted">شێوازی پارەدان</div>${ui.seg('payMethod', methods, b.method)}</div>
          ${b.promo ? '' : `<div class="row" style="gap:8px"><input class="input latin" id="promo" placeholder="کۆدی داشکاندن" style="text-transform:uppercase"><button class="btn secondary" data-act="applyPromo">جێبەجێکردن</button></div>`}
          <button class="btn block" data-act="payNow" ${inv.total ? '' : 'disabled'}>پارەدان، ${fmt.money(inv.total)}</button>
          ${TK.CONFIG.pointsPer1000 ? `<div class="xs muted center">بە هەر ${fmt.group(1000)} دینار، ${fmt.n(TK.CONFIG.pointsPer1000)} خاڵی پاداشت وەردەگریت</div>` : ''}`}
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
    const pts = TK.pointsFor(inv.total);
    actions.pay(inv.total, pts);
    TK.closeSheet();
    TK.toast(`پارەدان سەرکەوتوو بوو${pts ? `، ${pts} خاڵ زیاد کرا` : ''}`);
  };
  /** وێنەی پرۆفایل: بچووک دەکرێتەوە و تەنها شۆفێرەکانی خۆی دەیبینن */
  acts.pickMyPhoto = async (val, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    TK.toast('وێنەکە ئامادە دەکرێت...');
    try {
      const id = await TK.saveImage(await TK.compressImage(f));
      if (!id) return TK.toast('جێگای پاشەکەوت پڕە. وێنەیەکی بچووکتر هەڵبژێرە');
      actions.setMyPhoto(id);
      TK.toast('وێنەکەت دانرا');
    } catch (e) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە. وێنەیەکی تر هەڵبژێرە');
    }
  };
  acts.removeMyPhoto = async () => {
    if (!(await TK.ask('وێنەی پرۆفایلەکەت لادەبرێت؟'))) return;
    actions.setMyPhoto(null);
  };
  acts.receipt = () => {
    const s = S();
    const h = s.billing.history[0];
    const inv = h && h.lines ? h : invoice();
    TK.sheet(() => `
      <div class="receipt">
        <div class="row between">${TK.logo('sm')}<span class="badge ok">دراوە</span></div>
        <div style="margin:10px 0"><b>پسوولەی ${esc(h ? h.month : s.billing.month)}</b><div class="xs">${h ? fmt.date(h.at) : ''}</div><div class="xs">${esc(s.passenger.name)}، <span class="latin" dir="ltr">${fmt.phone(s.passenger.phone)}</span></div></div>
        ${inv.lines.map((l) => `<div class="line"><span>${esc(l.label)}</span><b>${fmt.group(l.amount)}</b></div>`).join('')}
        ${inv.promo ? `<div class="line"><span>داشکاندن</span><b>${fmt.group(inv.promo)}</b></div>` : ''}
        ${(inv.discounts || []).map((d) => `<div class="line"><span>${esc(d.label)}</span><b>${fmt.group(-d.amount)}</b></div>`).join('')}
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
  const REF_ST = { joined: ['چاوەڕێی بەشداری', ''], subscribed: ['بەشداری کرد', 'ok'], cancelled: ['هەڵوەشاوە', 'danger'], revoked: ['لابراوە', 'danger'] };
  TK.route('rewards', {
    guard: authed,
    render() {
      const s = S();
      const r = s.rewards;
      const c = TK.CONFIG;
      if (!r.codeOk) TK.ensureRefCode();
      const list = TK.rewardsList().filter((x) => x.on !== false).slice().sort((x, y) => x.cost - y.cost);
      const next = list.find((x) => x.cost > r.points) || list[list.length - 1];
      const inv = TK.invoice(s);
      const pend = inv.discounts.concat(inv.waiting);
      const pendSum = pend.reduce((n, d) => n + d.amount, 0);
      const mine = TK.refsAsInviter(s);
      const joined = mine.filter((x) => x.status !== 'revoked').length;
      const subd = mine.filter((x) => x.status === 'subscribed').length;
      return page(`
        ${ui.header('پاداشت', { back: 'home' })}
        <div class="card navy big col pts-card">
          <div class="row between"><span>خاڵەکانت</span>${icon('medal', 26, 'var(--amber)')}</div>
          <div class="pts-n">${fmt.n(fmt.group(r.points))}</div>
          ${next ? `<div class="progress"><i style="width:${Math.min(100, (r.points / next.cost) * 100)}%"></i></div>
          <div class="xs">${r.points >= next.cost ? 'دەتوانیت پاداشتێک وەربگریت' : `${fmt.n(fmt.group(next.cost - r.points))} خاڵی تر بۆ «${esc(next.title)}»`}</div>` : ''}
        </div>
        ${pend.length ? `<div class="card ok col tight">
          <div class="row between"><b>داشکاندنی چاوەڕوان</b><b>${fmt.money(pendSum)}</b></div>
          ${pend.map((d) => `<div class="row between sm"><span>${esc(d.label)}</span><span>${fmt.group(d.amount)}</span></div>`).join('')}
          <div class="xs muted">${inv.sub ? 'لە فاتورەی داهاتووت دەبڕدرێت' : 'کاتێک بەشداری بکەیت، لە یەکەم فاتورەت دەبڕدرێت'}. پارە نییە و ناکێشرێتەوە.</div>
        </div>` : ''}
        ${c.refOn ? `<div class="card big col invite-card">
          <div class="row" style="gap:12px"><div class="ico-box">${icon('users', 22, 'var(--act)')}</div><div class="grow"><div class="h3">بانگهێشتی هاوڕێ</div><div class="sm muted">کاتێک هاوڕێکەت بە کۆدەکەت بەشداری دەکات، هەردووکتان ${TK.refText()} داشکاندن وەردەگرن</div></div></div>
          ${r.code && r.codeOk ? `<div class="ref-code"><span class="latin">${esc(r.code)}</span><button class="btn sm secondary" data-act="copy" data-arg="${esc(r.code)}">${icon('copy', 16)}کۆپی</button></div>
          <button class="btn block" data-act="shareCode">${icon('send', 18)}ناردنی کۆد بۆ هاوڕێ</button>` : `<div class="skeleton" style="height:56px"></div><div class="xs muted center">کۆدەکەت ئامادە دەکرێت...</div>`}
          ${mine.length ? `<div class="row between sm"><span class="muted">${fmt.n(joined)} هاوڕێ هاتوون</span><span class="muted">${fmt.n(subd)} بەشدارییان کردووە</span></div>
          <div class="list">${mine.map((x) => {
            const st = REF_ST[x.status] || ['', ''];
            const used = x.status === 'subscribed' && x.inviterUsedAt;
            return `<div class="item">${ui.personAv(null, 36)}<div class="grow"><b class="sm">${esc(x.inviteeName || '')}</b><div class="xs muted">${fmt.ago(x.subAt || x.at)}</div></div>${used ? ui.badge('بەکارهات', '') : ui.badge(x.status === 'subscribed' ? `${fmt.money(x.amount)}` : st[0], st[1])}</div>`;
          }).join('')}</div>` : ''}
        </div>` : ''}
        ${list.length ? `<div class="h3">گۆڕینەوەی خاڵ</div>
        ${list.map((x) => {
          const got = !x.repeat && (r.redeemed || []).includes(x.id);
          return `<div class="card row"><div class="ico-box">${icon(x.kind === 'days' ? 'calendar' : 'tag', 20, 'var(--act)')}</div><div class="grow"><b>${esc(x.title)}</b><div class="xs muted">${fmt.n(fmt.group(x.cost))} خاڵ، ${TK.rewardValue(x)}</div></div>
            <button class="btn sm ${got || r.points < x.cost ? 'secondary' : ''}" data-act="redeem" data-arg="${x.id}" ${got || r.points < x.cost ? 'disabled' : ''}>${got ? 'وەرگیرا' : 'وەرگرتن'}</button></div>`;
        }).join('')}
        <div class="xs muted">پاداشت دەبێت بە داشکاندن و لە فاتورەی داهاتووت دەبڕدرێت.</div>` : ''}`);
    },
  });
  acts.redeem = async (id) => {
    const x = TK.rewardsList().find((y) => y.id === id);
    if (!x || !(await TK.ask(`«${x.title}» بە ${fmt.n(fmt.group(x.cost))} خاڵ وەردەگریت؟ ${TK.rewardValue(x)} لە فاتورەی داهاتووت دەبڕدرێت.`, { danger: false, icon: 'gift', yes: 'وەرگرتن' }))) return;
    if (actions.redeem(id)) TK.toast(`«${x.title}» وەرگیرا`);
  };
  acts.shareCode = () => {
    const code = S().rewards.code;
    if (!code) return;
    const link = `${location.href.split('#')[0]}#/register?ref=${code}`;
    shareText(`لە یەکسا بە کۆدی ${code} تۆمار بکە و ${TK.refText()} داشکاندن لە یەکەم مانگت وەربگرە:\n${link}`);
  };

  /* =========================================================
   * پشتگیری
   * ======================================================= */
  TK.route('support', {
    guard: authed,
    render() {
      const s = S();
      const st = { open: ['کراوە', 'note'], progress: ['لە کاردایە', 'info'], resolved: ['چارەسەر کرا', 'ok'] };
      return page(`
        ${ui.header('یارمەتی و سکاڵاکان', { back: 'profile' })}
        <div class="card danger col"><div><b>فریاکەوتن</b><div class="sm">لە کاتی مەترسیدا</div></div><div class="grid2"><a class="btn sm danger-solid" href="tel:104">${icon('phone', 16)}پۆلیس ١٠٤</a><a class="btn sm danger-solid" href="tel:122">${icon('phone', 16)}فریاگوزاری ١٢٢</a></div></div>
        <div class="section-title"><div class="h3">سکاڵاکان</div><button class="link" data-act="newTicket">نوێ</button></div>
        ${s.tickets.length ? `<div class="list">${s.tickets.map((t) => `<div class="item"><div class="grow"><div class="row" style="gap:6px"><b class="sm">#${t.id}</b>${ui.badge(st[t.status][0], st[t.status][1])}</div><div class="sm">${esc(t.subject)}</div>${t.reply ? `<div class="xs muted">وەڵام: ${esc(t.reply)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="sm muted">هیچ سکاڵایەک نییە</div>'}`);
    },
  });
  acts.newTicket = () => {
    TK.sheet(() => `
      <div class="h2">سکاڵای نوێ</div>
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
          <label class="me-photo" aria-label="وێنەی پرۆفایل">${ui.personAv(p.photo, 64)}<span class="me-cam">${icon('camera', 15, 'currentColor', 2.2)}</span><input type="file" accept="image/*" data-change="pickMyPhoto" style="display:none"></label>
          <div class="grow"><div class="h3">${esc(p.name)}</div><div class="sm muted latin" dir="ltr" style="text-align:right">${fmt.phone(p.phone)}</div><div class="xs muted">${icon('home', 12)} ${esc(home.name || '')}</div></div>
          <button class="icon-btn" data-go="profile/edit" aria-label="دەستکاری">${icon('edit', 18)}</button>
        </div>
        <div class="plabel">هەژمارەکەم</div>
        <div class="list">
          ${TK.walletOn() ? item('wallet', 'جزدانەکەم', 'wallet', `<span class="cntp">${fmt.money(TK.balance(s, 'me'))}</span>${TK.invoice(s, 'me', { due: true }).lines.length ? ui.badge('پارەی مانگ', 'note') : ''}`) : item('wallet', 'پارەدان و فاتورە', 'billing', !s.billing.paid && invoice().total ? ui.badge('ئامادەیە', 'note') : '')}
          ${item('users', 'خێزان', 'family', s.family.members.length > 1 ? `<span class="cntp">${s.family.members.length}</span>` : '')}
          ${item('calendar', 'بەشدارییەکانم', 'subs', sel.mySubs().length ? `<span class="cntp">${sel.mySubs().length}</span>` : '')}
          ${item('megaphone', 'داواکارییەکانم', 'requests')}
          ${item('clock', 'گەشتە کۆنەکان', 'history', S().history.length ? `<span class="cntp">${S().history.length}</span>` : '')}
        </div>
        <div class="plabel">زیاتر</div>
        <div class="list">
          ${item('tag', 'ئۆفەرەکان', 'offers')}
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
          ${item('help', 'پرسیارە باوەکان', 'faq')}
          ${item('flag', 'یارمەتی و سکاڵاکان', 'support')}
          <div class="item tap" data-act="contactUs"><div class="ico-box navy">${icon('phone', 20, 'var(--text)')}</div><b class="grow">پەیوەندی</b>${icon('forward', 18, 'var(--muted)')}</div>
          <div class="item tap" data-act="showTerms"><div class="ico-box navy">${icon('doc', 20, 'var(--text)')}</div><b class="grow">مەرج و ڕێساکان</b>${icon('forward', 18, 'var(--muted)')}</div>
        </div>
        <button class="btn secondary block" data-act="logout">${icon('logout', 18)}چوونەدەرەوە</button>
        <div class="center xs muted">یەکسا، وەشانی 1.0</div>`, 'profile');
    },
  });

  /* دەستکاریی پرۆفایل: لاپەڕەیەکی تەواو (وێنە، ناو، شار، گەڕەک، ڕەگەز). سڕینەوەی هەژمار لێرەیە نەک لە ژێر چوونەدەرەوە */
  TK.route('profile/edit', {
    guard: authed,
    render() {
      const p = S().passenger;
      if (U.peFor !== p.phone) { U.peFor = p.phone; U.peGender = p.gender || ''; }
      const g = U.peGender;
      const city = p.city || 'erbil';
      const gbtn = (v, l) => `<button type="button" class="pe-g ${g === v ? 'on' : ''}" data-act="peGender" data-arg="${v}" aria-pressed="${g === v}"><span class="radio ${g === v ? 'on' : ''}"></span>${l}</button>`;
      return page(`
        ${ui.header('زانیاری پرۆفایل', { back: 'profile' })}
        <div class="pe-top">
          <label class="pe-av" aria-label="گۆڕینی وێنە">${ui.personAv(p.photo, 112)}<span class="pe-cam">${icon('camera', 18, 'currentColor', 2.2)}</span><input type="file" accept="image/*" data-change="pickMyPhoto" style="display:none"></label>
          ${p.photo ? `<button class="link sm" data-act="removeMyPhoto">لابردنی وێنە</button>` : ''}
        </div>
        <div class="card col pe-form">
          <div class="field"><label for="pname">ناوی تەواو</label><input class="input" id="pname" value="${esc(p.name)}" autocomplete="name"></div>
          <div class="field"><label>ژمارەی مۆبایل</label><div class="input pe-ro"><span class="latin" dir="ltr" data-raw>${fmt.phone(p.phone)}</span>${icon('lock', 16, 'var(--muted)')}</div></div>
          <div class="field"><label for="pcity">شار</label><select class="input" id="pcity">${TK.cities().map((c) => `<option value="${c.id}" ${c.id === city ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="phome">گەڕەکی ماڵ</label><select class="input" id="phome"><option value="">هەڵبژێرە</option>${TK.PLACES.filter((x) => x.kind === 'home').map((x) => `<option value="${x.id}" ${x.id === p.homeId ? 'selected' : ''}>${esc(x.name)}، ${esc((TK.city(x.city) || {}).name || '')}</option>`).join('')}</select></div>
          <div class="field"><label>ڕەگەز</label><div class="pe-gs">${gbtn('m', 'نێر')}${gbtn('f', 'مێ')}</div></div>
        </div>
        <div class="list"><div class="item tap" data-act="changePass"><div class="ico-box navy">${icon('lock', 20, 'var(--text)')}</div><b class="grow">گۆڕینی وشەی نهێنی</b>${icon('forward', 18, 'var(--muted)')}</div></div>
        <button class="btn block" data-act="saveProfile">پاشەکەوت</button>
        <div class="pe-danger">
          <button class="pe-del" data-act="delAccount">${icon('trash', 17)}سڕینەوەی هەژمار</button>
        </div>`);
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
  /** سڕینەوەی هەژمار: ڕوونکردنەوە + وشەی نهێنی بۆ پشتڕاستکردنەوە */
  acts.delAccount = () => {
    U.delErr = '';
    TK.sheet(() => {
      const subs = sel.mySubs().length;
      return `<div class="row top" style="gap:12px"><div class="ico-box danger">${icon('alert', 22, 'var(--danger-text)')}</div><div class="grow"><div class="h2">سڕینەوەی هەژمار</div><div class="sm muted">ئەمە ناگەڕێتەوە.</div></div></div>
        <div class="card flat col tight sm" style="line-height:1.9">
          <b>ئەمانە دەسڕێنەوە:</b>
          <span>• ناو، ژمارەی مۆبایل و ئەندامانی خێزان</span>
          <span>• شوێنەکانی سەر نەخشە، ئاگادارکردنەوەکان و مێژووی گەشتەکانت</span>
          ${subs ? `<span>• ${subs} بەشداری هەڵدەوەشێتەوە و شۆفێرەکە ئاگادار دەکرێتەوە</span>` : ''}
          <b style="margin-top:6px">ئەمانە بێ ناو دەمێننەوە:</b>
          <span>• گەشتە کراوەکان و نامەکان، بۆ حیسابی شۆفێر و چارەسەرکردنی سکاڵا</span>
        </div>
        <div class="field"><label for="del-pass">وشەی نهێنی بۆ پشتڕاستکردنەوە</label><input class="input ltr latin" id="del-pass" type="password" autocomplete="current-password"></div>
        ${U.delErr ? `<div class="err">${esc(U.delErr)}</div>` : ''}
        <button class="btn block danger-solid" data-act="delAccountGo">سڕینەوەی هەمیشەیی</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.delAccountGo = async (a, el) => {
    const pass = (document.getElementById('del-pass') || {}).value || '';
    if (!pass) {
      U.delErr = 'وشەی نهێنی بنووسە';
      return TK.sheet.refresh();
    }
    const done = TK.busyBtn(el);
    const err = await actions.deleteMyAccount(pass);
    done();
    if (err) {
      U.delErr = err;
      return TK.sheet.refresh();
    }
  };
  acts.logout = async () => {
    await actions.logout();
    TK.go('login', true);
  };
  acts.peGender = (v) => {
    U.peGender = U.peGender === v ? '' : v;
    TK.render();
  };
  acts.saveProfile = () => {
    const name = document.getElementById('pname').value.trim();
    if (name.length < 2) return TK.toast('ناوەکە بنووسە');
    actions.updateProfile(name, document.getElementById('phome').value, document.getElementById('pcity').value, U.peGender || '');
    TK.toast('پاشەکەوت کرا');
    TK.back ? TK.back('profile') : TK.go('profile');
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
  acts.contactUs = () => TK.contactSheet('p');
  TK.route('faq', {
    guard: authed,
    render() {
      const list = TK.faqList('p');
      return page(`
        ${ui.header('پرسیارە باوەکان', { back: 'profile' })}
        ${list.length ? ui.faq(list) : ui.empty('help', 'هیچ پرسیارێک نییە', 'تیمی یەکسا لێرە وەڵامی پرسیارە باوەکان دادەنێت')}`);
    },
  });

  /* ---------- دەستپێکردن ---------- */
  TK.start({
    home: 'home',
    start: 'splash',
    intro: true,
    sw: 'sw.js',
    // ئەو ئاگادارکردنەوانەی کە لە دەرەوە دێن (شۆفێر، نامە، نرخ) بانەریان بۆ پیشان دەدرێت
    watchKey: (s) => s.passenger.phone,
    watch: (s) => (s.passenger.loggedIn ? s.notices.filter((n) => ['offer', 'chat', 'ride', 'drop', 'driver', 'swap'].includes(n.kind)) : []),
    validBack: (p) => !['splash', 'onboard', 'login', 'register'].includes(p) && (p !== 'new' || !!U.draft),
  });
})();
