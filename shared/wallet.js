/* =========================================================
 * جزدان: پەڕە هاوبەشەکانی سەرنشین و شۆفێر
 * زیادکردن (پڕکردنەوە)، ڕاکێشان، ناردن (سەرنشین بۆ سەرنشین، شۆفێر بۆ شۆفێر) و مامەڵەکان.
 * هەر ئەپێک بە TK.walletUI.install({...}) ڕێکی دەخات.
 * ======================================================= */
(function () {
  'use strict';
  const { ui, fmt, actions, esc } = TK;
  const icon = TK.icon;
  const S = () => TK.get();
  const U = TK.app.ui;
  const acts = TK.app.acts;
  // ئایکۆنەکانی دوگمەکان (هەمان ستایلی هێڵی ئەپەکە)
  const SV = (d) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    add: SV('<path d="M4 8.5V17a3 3 0 0 0 3 3h3"/><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H17a3 3 0 0 1 3 3v2"/><path d="M6 6l7.5-2.6a1.6 1.6 0 0 1 2.1 1.5V6"/><circle cx="16.5" cy="16.5" r="4"/><path d="M16.5 14.8v3.4M14.8 16.5h3.4"/>'),
    out: SV('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 14V7.5M9.2 10.2 12 7.4l2.8 2.8"/><path d="M7.5 15.5c1.2 1.3 2.7 2 4.5 2s3.3-.7 4.5-2"/>'),
    send: SV('<path d="M20.5 3.5 3.8 10.1c-.8.3-.8 1.4 0 1.7l6.4 2.3 2.3 6.4c.3.8 1.4.8 1.7 0z"/><path d="m10.2 13.8 4.2-4.2"/>'),
    list: SV('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 9.5h8M8 14.5h5"/>'),
  };
  const num = (v) => Number(String(v || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, '')) || 0;
  const valOf = (id) => (document.getElementById(id) || {}).value || '';
  let C = null;
  const me = () => C.me();
  const free = () => TK.balance(S(), me()) - TK.pendingWithdraw(S(), me());
  const page = (body) => C.page(body);
  const topupMethods = () => TK.payMethods().filter((m) => m.on !== false && m.topup !== false && (m.account === false || m.yeksaAccount));
  const outMethods = () => TK.payMethods().filter((m) => m.on !== false);
  const monoOf = (m) => (m.account === false ? icon('cash', 22) : `<span class="latin">${esc(m.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || m.name.slice(0, 2))}</span>`);
  const fwd = () => icon('forward', 16, 'var(--muted)');
  const ownPhone = () => (C.role === 'd' ? (TK.sel.me() || {}).phone : S().passenger.phone) || '';

  /** چوار دوگمەکەی ژێر کارتی جزدان */
  function tiles() {
    return `<div class="wt">
      <button class="card qtile tap k1 f" data-go="topup"><span class="ic">${IC.add}</span><span class="grow">زیادکردن</span>${fwd()}</button>
      <button class="card qtile tap k2 g" data-go="withdraw"><span class="ic">${IC.out}</span><span class="grow">ڕاکێشان</span>${fwd()}</button>
      <button class="card qtile tap k3 i" data-go="send"><span class="ic">${IC.send}</span><span class="grow">ناردن</span>${fwd()}</button>
      <button class="card qtile tap k4 h" data-go="txs"><span class="ic">${IC.list}</span><span class="grow">مامەڵەکان</span>${fwd()}</button>
    </div>`;
  }
  const trust = () => `<div class="trust">${icon('shield', 16, 'var(--ok-text)')}<span>پارەکەت لای یەکسا پارێزراوە. هەر جووڵەیەک لێرە تۆمار دەکرێت.</span></div>`;

  /* ---------- زیادکردن (پڕکردنەوە) ---------- */
  function routes() {
    const guard = () => C.guard() || (TK.walletOn() ? null : C.home);
    TK.route('topup', {
      guard,
      render() {
        const ms = topupMethods();
        const need = C.need ? C.need() : 0;
        const needR = need > 0 ? Math.ceil(need / 1000) * 1000 : 0;
        if (!U.tp) U.tp = { amount: needR || 50000, method: (ms[0] || {}).id };
        if (!ms.some((m) => m.id === U.tp.method)) U.tp.method = (ms[0] || {}).id;
        const base = [25000, 50000, 100000];
        const chips = base.concat(needR && !base.includes(needR) ? [needR] : []);
        return page(`
          ${ui.header('زیادکردنی پارە', { back: C.home })}
          <div class="steps"><i class="on"></i><i></i><i></i></div>
          <div class="amt-hero"><div class="xs muted">چەند دەخەیتە سەر جزدانەکەت؟</div>
            <input class="amt-in latin" id="tp-amt" inputmode="numeric" value="${fmt.group(U.tp.amount)}" data-change="tpAmt" aria-label="بڕ"><div class="xs muted">دینار</div></div>
          <div class="chips" style="justify-content:center">${chips.map((a) => `<button class="chip ${U.tp.amount === a ? 'on' : ''}" data-act="tpPick" data-arg="${a}">${a === needR ? `${C.role === 'd' ? 'قەرزەکەم' : 'بۆ ئەم مانگە'} ${fmt.group(a)}` : fmt.group(a)}</button>`).join('')}</div>
          <div class="h3" style="margin-top:6px">بە چی دەینێریت؟</div>
          ${ms.length ? `<div class="list">${ms.map((m) => `<div class="item tap mth ${U.tp.method === m.id ? 'on' : ''}" data-act="tpMethod" data-arg="${m.id}"><span class="mono">${monoOf(m)}</span><div class="grow"><b>${esc(m.name)}</b><div class="xs muted">${m.account === false ? 'بیدە بە بەڕێوەبەر یان نوێنەری یەکسا' : `لە ئەپی ${esc(m.name)} بنێرە بۆ هەژماری یەکسا`}</div></div><span class="radio ${U.tp.method === m.id ? 'on' : ''}"></span></div>`).join('')}</div>` : '<div class="card note sm">هێشتا هیچ شێوازێکی پارەدان دانەنراوە. پەیوەندی بە یەکسا بکە.</div>'}
          <button class="btn block lg" data-act="tpNext" ${ms.length ? '' : 'disabled'}>بەردەوام بوون</button>
          <div class="trust">${icon('lock', 16)}<span>پارەدانی ڕاستەوخۆ لە ناو ئەپ بە FIB و FastPay بەم زووانە دێت.</span></div>`);
      },
    });
    TK.route('topup/send', {
      guard: () => guard() || (U.tp ? null : C.home),
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

    /* ---------- ڕاکێشان ---------- */
    TK.route('withdraw', {
      guard,
      render() {
        const f = Math.max(0, free());
        const ms = outMethods();
        const d = C.role === 'd' ? TK.sel.me() : null;
        if (!U.wd) U.wd = { amount: f, method: (d && d.payMethod && ms.some((m) => m.id === d.payMethod) ? d.payMethod : (ms[0] || {}).id), account: '' };
        const m = TK.payMethod(U.wd.method) || {};
        const accDefault = d && d.payMethod === U.wd.method && d.payAccount ? d.payAccount : '0' + ownPhone();
        const min = TK.CONFIG.withdrawMin || 0;
        const chips = [f, 25000, 50000].filter((a, i, l) => a > 0 && a <= f && l.indexOf(a) === i);
        const pend = (S().withdraws || []).filter((w) => w.driverId === me() && w.status === 'pending');
        return page(`
          ${ui.header('ڕاکێشانی پارە', { back: C.home })}
          <div class="amt-hero"><div class="xs muted">چەند ڕادەکێشیت؟</div>
            <input class="amt-in latin" id="wd-amt" inputmode="numeric" value="${fmt.group(U.wd.amount)}" data-change="wdAmt" aria-label="بڕ"><div class="xs muted">دینار</div></div>
          ${chips.length ? `<div class="chips" style="justify-content:center">${chips.map((a, i) => `<button class="chip ${U.wd.amount === a ? 'on' : ''}" data-act="wdPick" data-arg="${a}">${i === 0 ? 'هەمووی ' : ''}${fmt.group(a)}</button>`).join('')}</div>` : ''}
          <div class="sumrow"><div><span>بەردەست بۆ ڕاکێشان</span><b>${fmt.group(f)}</b></div><div><span>${min ? 'کەمترین بڕ' : 'چاوەڕێی ناردن'}</span><b class="muted">${fmt.group(min || pend.reduce((n, w) => n + w.amount, 0))}</b></div></div>
          <div class="h3">بۆ کوێ بنێردرێت؟</div>
          <div class="list">${ms.map((x) => `<div class="item tap mth ${U.wd.method === x.id ? 'on' : ''}" data-act="wdMethod" data-arg="${x.id}"><span class="mono">${monoOf(x)}</span><div class="grow"><b>${esc(x.name)}</b><div class="xs muted">${x.account === false ? 'لە ئۆفیسی یەکسا وەریدەگریتەوە' : `بۆ هەژماری ${esc(x.name)} ـی خۆت`}</div></div><span class="radio ${U.wd.method === x.id ? 'on' : ''}"></span></div>`).join('')}</div>
          ${m.account !== false ? `<div class="field"><label for="wd-acc">ژمارەی هەژماری ${esc(m.name || '')} ـەکەت</label><input class="input ltr latin" id="wd-acc" inputmode="tel" autocomplete="off" value="${esc(U.wd.account || accDefault)}"></div>` : ''}
          ${U.wd.err ? `<div class="err">${esc(U.wd.err)}</div>` : ''}
          <button class="btn block lg" data-act="wdSend" ${f > 0 ? '' : 'disabled'}>داوای ڕاکێشان</button>
          <div class="trust">${icon('clock', 16)}<span>یەکسا پارەکەت بۆ دەنێرێت و ئاگادار دەکرێیتەوە. تا نەنێردرێت، دەتوانیت هەڵیبوەشێنیتەوە.</span></div>
          ${pend.length ? `<div class="dayh">چاوەڕێی ناردن</div><div class="list">${pend.map((w) => ui.txRow({ id: w.id, type: 'withdraw', amount: -w.amount, method: w.method, note: w.account || '', at: w.at }, { pending: true, act: 'wdOpen' })).join('')}</div>` : ''}`);
      },
    });

    /* ---------- ناردن ---------- */
    TK.route('send', {
      guard,
      render() {
        if (!U.xf) U.xf = { phone: '', peer: null, amount: 0, note: '', err: '' };
        const x = U.xf;
        const f = Math.max(0, free());
        const who = C.role === 'd' ? 'شۆفێر' : 'سەرنشین';
        return page(`
          ${ui.header(`ناردن بۆ ${who}`, { back: C.home })}
          ${x.peer ? `<div class="rcp">${ui.personAv(null, 44)}<div class="grow"><b>${esc(x.peer.name)}</b><div class="xs muted"><span class="latin" dir="ltr">${fmt.phone(x.peer.phone)}</span> · ${who}ی یەکسا</div></div><button class="btn sm secondary" data-act="xfClear">گۆڕین</button></div>`
          : `<div class="field"><label for="xf-ph">ژمارەی مۆبایلی ${who}ی وەرگر</label><div class="row" style="gap:8px"><input class="input ltr latin grow" id="xf-ph" inputmode="tel" autocomplete="off" placeholder="0750 123 4567" value="${esc(x.phone)}" data-input="xfPhone"><button class="btn secondary" data-act="xfFind" style="flex:none">${icon('search', 18)}دۆزینەوە</button></div></div>
            <div class="xs muted">${C.role === 'd' ? 'تەنها دەتوانیت بۆ شۆفێرێکی تری یەکسا بنێریت.' : 'تەنها دەتوانیت بۆ سەرنشینێکی تری یەکسا بنێریت.'}</div>`}
          ${x.err ? `<div class="err">${esc(x.err)}</div>` : ''}
          ${x.peer ? `<div class="amt-hero"><div class="xs muted">بڕ</div>
              <input class="amt-in latin" id="xf-amt" inputmode="numeric" value="${x.amount ? fmt.group(x.amount) : ''}" placeholder="0" data-change="xfAmt" aria-label="بڕ"><div class="xs muted">دینار · بەردەست ${fmt.group(f)}</div></div>
            <div class="field"><label for="xf-note">تێبینی (ئارەزوومەندانە)</label><input class="input" id="xf-note" maxlength="80" value="${esc(x.note)}" placeholder="${C.role === 'd' ? 'بۆ نموونە: پارەی گەشتی جێگرەوە' : 'بۆ نموونە: پارەی مانگی خوشکم'}"></div>
            <button class="btn block lg" data-act="xfSend" ${f > 0 ? '' : 'disabled'}>${icon('send', 20)}ناردن</button>
            <div class="trust">${icon('shield', 16, 'var(--ok-text)')}<span>پارەکە یەکسەر دەچێتە جزدانی وەرگر. دوای ناردن ناگەڕێتەوە، بۆیە ناوەکە باش بپشکنە.</span></div>` : ''}`);
      },
    });

    /* ---------- مامەڵەکان ---------- */
    TK.route('txs', {
      guard,
      render() {
        const s = S();
        const all = TK.walletOf(s, me()).filter((e) => e.type !== 'legacy');
        const F = C.role === 'd'
          ? [['all', 'هەمووی'], ['earn', 'داهات'], ['in', 'زیادکردن'], ['out', 'ڕاکێشان'], ['xfer', 'ناردن و وەرگرتن'], ['fine', 'سزا و پاداشت']]
          : [['all', 'هەمووی'], ['in', 'زیادکردن'], ['out', 'ڕاکێشان'], ['xfer', 'ناردن و وەرگرتن'], ['month', 'پارەی مانگ'], ['back', 'گەڕاندنەوە']];
        const T = {
          earn: ['earn', 'swapin', 'swapout', 'skipdeduct'],
          in: ['topup', 'adjust+'],
          out: ['withdraw', 'adjust-'],
          xfer: ['xfer'],
          fine: ['penalty', 'bonus'],
          month: ['monthpay'],
          back: ['refund', 'skipref', 'comp'],
        };
        const k = U.txf && F.some((f) => f[0] === U.txf) ? U.txf : 'all';
        const list = k === 'all' ? all : all.filter((e) => T[k].includes(e.type) || (e.type === 'adjust' && T[k].includes(e.amount >= 0 ? 'adjust+' : 'adjust-')));
        const m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const inM = all.filter((e) => e.at >= m0);
        const sumIn = inM.reduce((n, e) => n + (e.amount > 0 ? e.amount : 0), 0);
        const sumOut = inM.reduce((n, e) => n + (e.amount < 0 ? -e.amount : 0), 0);
        const pTp = (s.topups || []).filter((x) => x.owner === me() && x.status === 'pending' && (k === 'all' || k === 'in' || (k === 'back' && x.kind === 'refund')));
        const pWd = (s.withdraws || []).filter((w) => w.driverId === me() && w.status === 'pending' && (k === 'all' || k === 'out'));
        const pend = pTp.map((x) => ui.txRow({ id: x.id, type: x.kind === 'refund' ? 'refund' : 'topup', amount: x.amount, method: x.kind === 'refund' ? null : x.method, note: x.kind === 'refund' ? x.note : `چاوەڕێی پشکنینی یەکسا${x.ref ? '، حەواڵە ' + x.ref : ''}`, at: x.at }, { pending: true, act: 'tpOpen' }))
          .concat(pWd.map((w) => ui.txRow({ id: w.id, type: 'withdraw', amount: -w.amount, method: w.method, note: 'چاوەڕێی ناردنی یەکسا', at: w.at }, { pending: true, act: 'wdOpen' })));
        return page(`
          ${ui.header('مامەڵەکان', { back: C.home })}
          <div class="fchips">${F.map(([id, l]) => `<button class="chip ${k === id ? 'on' : ''}" data-act="txFilter" data-arg="${id}">${l}</button>`).join('')}</div>
          <div class="sumrow"><div><span>هاتوو ئەم مانگە</span><b class="ok">+${fmt.group(sumIn)}</b></div><div><span>چوو ئەم مانگە</span><b>−${fmt.group(sumOut)}</b></div></div>
          ${pend.length ? `<div class="dayh">چاوەڕێ</div><div class="list">${pend.join('')}</div>` : ''}
          ${list.length ? ui.txGroups(list, (e) => ui.txRow(e, C.row ? C.row(e) : {}), C.role === 'd') : pend.length ? '' : ui.empty('wallet', 'هیچ مامەڵەیەک نییە', k === 'all' ? 'هەر پارەیەک زیاد بکەیت، ڕایبکێشیت یان بینێریت، لێرە دەردەکەوێت' : 'لەم جۆرە هیچ مامەڵەیەک نییە')}`);
      },
    });
  }

  /* ---------- کردارەکان ---------- */
  const readTp = () => {
    const v = num(valOf('tp-amt'));
    if (v) U.tp.amount = v;
    return U.tp.amount;
  };
  Object.assign(acts, {
    // نووسین تەنها بڕەکە پاشەکەوت دەکات؛ ڕێندەری تەواو لێرەدا لە کاتی blur دەبێت و دەستلێدانی دواتر ون دەکات
    tpAmt() {
      if (!U.tp) return;
      const v = readTp();
      document.querySelectorAll('[data-act="tpPick"]').forEach((c) => c.classList.toggle('on', +c.dataset.arg === v));
    },
    tpPick(a) {
      U.tp.amount = +a;
      // پەڕەکە ئەوەی لە خانەکاندا نووسراوە دەهێڵێتەوە، بۆیە بڕە نوێیەکە ڕاستەوخۆ لە خانەکە دەنووسرێت
      const el = document.getElementById('tp-amt');
      if (el) el.value = fmt.group(U.tp.amount);
      TK.render();
    },
    tpMethod(id) {
      readTp();
      U.tp.method = id;
      TK.render();
    },
    tpNext() {
      const a = readTp();
      if (!(a >= 1000)) return TK.toast('بڕەکە بنووسە');
      if (a > 5000000) return TK.toast('بڕەکە زۆرە');
      TK.go('topup/send');
    },
    async tpPhoto(v, el) {
      const f = el.files && el.files[0];
      if (!f) return;
      U.tp.ref = valOf('tp-ref') || U.tp.ref;
      try {
        U.tp.photo = await TK.saveImage(await TK.compressImage(f));
        TK.render();
      } catch (e) {
        TK.toast('ئەم وێنەیە ناخوێندرێتەوە');
      }
    },
    tpSend(a, el) {
      const m = TK.payMethod(U.tp.method) || {};
      const ref = String(valOf('tp-ref')).trim();
      if (m.account !== false && ref.length < 3) return TK.toast('ژمارەی حەواڵە بنووسە');
      if (el) el.disabled = true; // دوو جار دانەگیرێت
      const id = actions.requestTopup(U.tp.amount, U.tp.method, ref, U.tp.photo || null);
      if (!id) {
        if (el) el.disabled = false;
        return TK.toast('نەنێردرا، دووبارە هەوڵ بدەرەوە');
      }
      U.tp = null;
      TK.toast('داواکارییەکەت نێردرا');
      TK.go(C.home, true);
    },
    tpOpen(id) {
      const x = (S().topups || []).find((y) => y.id === id);
      if (!x) return;
      TK.sheet(() => ui.receipt({ id: x.id, type: x.kind === 'refund' ? 'refund' : 'topup', amount: x.amount, method: x.kind === 'refund' ? null : x.method, ref: x.ref, note: x.note || '', at: x.at, _pending: true }, x.kind === 'refund' ? '' : `<button class="btn secondary block" data-act="tpCancel" data-arg="${esc(id)}">هەڵوەشاندنەوەی داواکاری</button>`));
    },
    async tpCancel(id) {
      if (!(await TK.ask('داواکاری پڕکردنەوە هەڵدەوەشێتەوە؟ ئەگەر پارەت ناردووە، هەڵی مەوەشێنەرەوە.'))) return;
      actions.cancelTopup(id);
      TK.closeSheet();
      TK.toast('هەڵوەشێنرایەوە');
    },
    /* ڕاکێشان */
    wdAmt() {
      if (!U.wd) return;
      const v = num(valOf('wd-amt'));
      U.wd.amount = v;
      document.querySelectorAll('[data-act="wdPick"]').forEach((c) => c.classList.toggle('on', +c.dataset.arg === v));
    },
    wdPick(a) {
      U.wd.amount = +a;
      const el = document.getElementById('wd-amt');
      if (el) el.value = fmt.group(U.wd.amount);
      TK.render();
    },
    wdMethod(id) {
      U.wd.amount = num(valOf('wd-amt')) || U.wd.amount;
      if (id !== U.wd.method) U.wd.account = '';
      U.wd.method = id;
      TK.render();
    },
    wdSend() {
      const amount = num(valOf('wd-amt'));
      const acc = valOf('wd-acc');
      U.wd.amount = amount;
      U.wd.account = acc;
      const err = actions.requestWithdraw(amount, U.wd.method, acc);
      if (err) {
        U.wd.err = err;
        return TK.render();
      }
      U.wd = null;
      TK.toast('داواکارییەکەت نێردرا');
      TK.go(C.home, true);
    },
    wdOpen(id) {
      const w = (S().withdraws || []).find((x) => x.id === id);
      if (!w) return;
      TK.sheet(() => ui.receipt({ id: w.id, type: 'withdraw', amount: -w.amount, method: w.method, note: w.account || '', at: w.at, _pending: true }, `<button class="btn secondary block" data-act="wdCancel" data-arg="${esc(id)}">هەڵوەشاندنەوەی داواکاری</button>`));
    },
    wdCancel(id) {
      actions.cancelWithdraw(id);
      TK.closeSheet();
      TK.toast('هەڵوەشێنرایەوە');
    },
    /* ناردن */
    xfPhone(v) {
      if (!U.xf) return;
      U.xf.phone = v;
      if (U.xf.err) {
        U.xf.err = '';
        const e = document.querySelector('.err');
        if (e) e.remove();
      }
      if (/^7\d{9}$/.test(TK.cleanPhone(v))) acts.xfFind();
    },
    async xfFind() {
      const x = U.xf;
      x.phone = valOf('xf-ph') || x.phone;
      if (x.busy) return;
      x.busy = true;
      const r = await actions.lookupPeer(x.phone);
      x.busy = false;
      if (r.err) x.err = r.err;
      else {
        x.peer = r;
        x.err = '';
      }
      TK.render();
      if (x.peer) setTimeout(() => (document.getElementById('xf-amt') || {}).focus && document.getElementById('xf-amt').focus(), 60);
    },
    xfClear() {
      U.xf = { phone: '', peer: null, amount: 0, note: '', err: '' };
      TK.render();
    },
    xfAmt() {
      if (!U.xf) return;
      U.xf.amount = num(valOf('xf-amt'));
    },
    async xfSend() {
      const x = U.xf;
      x.amount = num(valOf('xf-amt'));
      x.note = String(valOf('xf-note')).trim();
      if (!(x.amount > 0)) return TK.toast('بڕەکە بنووسە');
      if (x.amount > free()) {
        x.err = `باڵانسەکەت بەس نییە (${fmt.money(Math.max(0, free()))})`;
        return TK.render();
      }
      if (x.busy) return;
      if (!(await TK.ask(`${fmt.money(x.amount)} بۆ ${x.peer.name} دەنێردرێت. دوای ناردن ناگەڕێتەوە.`, { yes: 'ناردن' }))) return;
      if (x.busy) return;
      x.busy = true;
      const err = actions.sendMoney(x.peer, x.amount, x.note);
      x.busy = false;
      if (err) {
        x.err = err;
        return TK.render();
      }
      const done = { name: x.peer.name, amount: x.amount };
      U.xf = null;
      TK.go(C.home, true);
      TK.sheet(() => `<div class="col center" style="align-items:center;gap:10px;padding:6px 0 4px">
          <span class="okc">${icon('check', 34, 'var(--ok-text)', 2.6)}</span>
          <div class="h2" style="margin:0">نێردرا</div>
          <div class="sm muted">${fmt.money(done.amount)} چووە جزدانی ${esc(done.name)}</div>
        </div>
        <button class="btn block" data-close>باشە</button>`);
    },
    /* مامەڵەکان */
    txFilter(k) {
      U.txf = k;
      TK.render();
    },
    txOpen(id) {
      const e = TK.walletOf(S(), me()).find((x) => x.id === id);
      if (!e) return;
      const lines = (e.lines || []).filter(() => C.role === 'd').map((l) => `<div class="row between sm"><span>${esc(l.names)}، ${l.dir === 'back' ? 'هاتنەوە' : 'چوون'}${l.status === 'skipped' ? ' («نایەم»)' : l.status === 'absent' ? ' (نەهات)' : ''}</span><b>${fmt.group(l.amount)}</b></div>`).join('');
      TK.sheet(() => ui.receipt(e, `${lines ? `<div class="card flat col tight">${lines}</div>` : ''}<button class="btn secondary block" data-act="txShare" data-arg="${esc(id)}">${icon('share', 18)}هاوبەشکردنی پسوولە</button>`));
    },
    txShare(id) {
      const e = TK.walletOf(S(), me()).find((x) => x.id === id);
      if (!e) return;
      const L = TK.txLabel(e);
      const text = `یەکسا: ${L.title}\n${e.amount > 0 ? '+' : '−'}${fmt.money(Math.abs(e.amount))}\n${fmt.date(e.at)}، ${fmt.hhmm(e.at)}\n${String(e.id).slice(-10).toUpperCase()}`;
      if (navigator.share) navigator.share({ title: 'یەکسا', text }).catch(() => {});
      else acts.copy(text);
    },
  });

  TK.walletUI = {
    IC,
    tiles,
    trust,
    /** cfg: { role: 'p'|'d', home, me(), page(body), guard(), need(), row(e) } */
    install(cfg) {
      C = cfg;
      routes();
    },
  };
})();
