/* تەکسیەکەم، ئەپی شۆفێر */
(function () {
  'use strict';
  const { ui, fmt, sel, actions, esc, sim } = TK;
  const icon = TK.icon;
  const S = () => TK.get();
  const U = TK.app.ui;
  const acts = TK.app.acts;
  const C = TK.CONFIG;

  // قەبارەی نووسینی ئەپی شۆفێر جیایە لە سەرنشین (بنەڕەت: ئاسایی، شۆفێر خۆی دەیگۆڕێت)
  TK.scaleKey = 'dTextScale';
  // ستایلی تایبەتی ئەپی شۆفێر (فۆنت و ڕەنگەکان) لە core.css لە ژێر html.drv
  document.documentElement.classList.add('drv');
  /** تەنها ٤ بەش: ئەمڕۆ، ڕۆتەکان، داواکاری، زیاتر */
  function nav(active) {
    const n = sel.openForMe().length;
    // تەنها نامەی نەخوێندراوە (ئاگادارکردنەوەکان نیشانەی خۆیان هەیە لەسەر زەنگ)
    const more = sel.unreadMsgsD();
    return ui.nav(
      [
        { key: 'today', path: 'today', icon: 'home', label: 'ئەمڕۆ' },
        { key: 'routes', path: 'routes', icon: 'route', label: 'ڕۆتەکان' },
        { key: 'requests', path: 'requests', icon: 'megaphone', label: 'داواکاری', badge: n || '' },
        { key: 'more', path: 'more', icon: 'menu', label: 'زیاتر', badge: more || '' },
      ],
      active
    );
  }
  const page = (body, active) => `<div class="screen ${active ? '' : 'no-nav'}">${body}</div>${active ? nav(active) : ''}`;
  const authed = () => (S().driver.meId && sel.me() ? null : 'login');

  /* =========================================================
   * تۆمارکردنی شۆفێر (٥ هەنگاو) و چوونەژوورەوە
   * ======================================================= */
  const DRAFT_KEY = 'taxikam:driverDraft';
  const loadDraft = () => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || { step: 1, gender: '', city: 'erbil', seats: 4, plateCode: '22', plateLetter: 'A', payMethod: 'fib', licClass: 'گشتی' };
    } catch (e) {
      return { step: 1, city: 'erbil' };
    }
  };
  const saveDraft = () => {
    try {
      const d = Object.assign({}, U.reg);
      delete d.pass;
      delete d.pass2; // وشەی نهێنی پاشەکەوت ناکرێت
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) {
      /* هیچ */
    }
  };
  const REG_STEPS = ['زانیاری کەسی', 'ناونیشان و فریاکەوتن', 'کارتی نیشتمانی و مۆڵەت', 'ئۆتۆمبێل و ساڵانە', 'ئاسایش، کار و پارە'];
  const thisYear = new Date().getFullYear();
  const fld = (id, label, val, opts = {}) => `<div class="field ${opts.cls || ''}"><label for="${id}">${label}</label><input class="input ${opts.ltr ? 'ltr latin' : ''}" id="${id}" value="${esc(val == null ? '' : val)}" ${opts.type ? `type="${opts.type}"` : ''} ${opts.mode ? `inputmode="${opts.mode}"` : ''} placeholder="${esc(opts.ph || '')}" ${opts.max ? `maxlength="${opts.max}"` : ''}>${opts.hint ? `<span class="xs muted">${opts.hint}</span>` : ''}</div>`;
  const sel1 = (id, label, val, list) => `<div class="field"><label for="${id}">${label}</label><select class="input" id="${id}">${list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const dateF = (id, label, val, from, to, hint) => `<div class="field"><label>${label}</label>${ui.dateParts(id, val, from, to)}${hint ? `<span class="xs muted">${hint}</span>` : ''}</div>`;
  const v = (id) => ((document.getElementById(id) || {}).value || '').trim();

  /** خانەکانی هەر بەشێک (بۆ تۆمارکردن و نوێکردنەوەی بەڵگەنامە) */
  const SECTION = {
    personal: (r) => `
      ${fld('r-name', 'ناوی سیانی (وەک کارتی نیشتمانی)', r.name, { ph: 'ناو، ناوی باوک، ناوی باپیر' })}
      <div class="field"><label>ڕەگەز</label>${ui.seg('regGender', [{ v: 'm', l: 'نێر' }, { v: 'f', l: 'مێ' }], r.gender)}</div>
      ${dateF('r-birth', 'ڕۆژی لەدایکبوون', r.birth, 1940, thisYear - 18, `لانیکەم ${TK.CONFIG.minDriverAge} ساڵ`)}
      <div class="field"><label>وێنەی ڕووخسار</label><div class="photos">${ui.photoField('photo', 'وێنەیەکی ڕوون لە ڕووخسار', r.photo)}</div><span class="xs muted">بێ چاویلکەی ڕەش، ڕووخسار بە ڕوونی دیار بێت</span></div>`,
    address: (r) => {
      const city = TK.city(r.city) || TK.cities()[0];
      return `
      ${sel1('r-city', 'شار', r.city, TK.cities().map((c) => [c.id, c.name]))}
      ${sel1('r-district', 'قەزا', r.district, [['', 'هەڵبژێرە']].concat((city ? city.districts : []).map((d) => [d, d])))}
      ${fld('r-neighborhood', 'گەڕەک', r.neighborhood, { ph: 'ناوی گەڕەک' })}
      ${fld('r-landmark', 'نزیکترین شوێنی ناسراو', r.landmark, { ph: 'بۆ نموونە: نزیک مزگەوت یان قوتابخانە' })}`;
    },
    emergency: (r) => `
      ${fld('r-ename', 'ناوی کەسێکی نزیک بۆ فریاکەوتن', r.emergencyName, { ph: 'بۆ نموونە: برا، هاوسەر' })}
      <div class="field"><label for="r-ephone">ژمارەی ئەو کەسە</label><div class="input-wrap"><span class="prefix latin">+964</span><input class="input ltr latin" id="r-ephone" inputmode="tel" value="${esc(r.emergencyPhone || '')}" placeholder="7XX XXX XXXX"></div></div>`,
    id: (r) => `
      ${fld('r-idno', 'ژمارەی سەر کارتی نیشتمانی', r.idNo, { ltr: true, mode: 'numeric', max: 20 })}
      ${dateF('r-idexp', 'بەرواری بەسەرچوونی کارت', r.idExpiry, thisYear, thisYear + 15)}
      <div class="photos">${ui.photoField('idFront', 'ڕووی پێشەوە', r.idFront)}${ui.photoField('idBack', 'ڕووی دواوە', r.idBack)}</div>`,
    license: (r) => `
      ${fld('r-licno', 'ژمارەی مۆڵەتی شۆفێری', r.licNo, { ltr: true, max: 20 })}
      ${sel1('r-licclass', 'جۆری مۆڵەت', r.licClass, [['گشتی', 'گشتی (تەکسی)'], ['تایبەت', 'تایبەت'], ['بار', 'بار']])}
      ${dateF('r-licexp', 'بەرواری بەسەرچوونی مۆڵەت', r.licExpiry, thisYear, thisYear + 15)}
      <div class="photos">${ui.photoField('licFront', 'ڕووی پێشەوە', r.licFront)}${ui.photoField('licBack', 'ڕووی دواوە', r.licBack)}</div>`,
    car: (r) => `
      <div class="grid2">${fld('r-make', 'جۆری ئۆتۆمبێل', r.carMake, { ph: 'تۆیۆتا، کیا، هیۆندای...' })}${fld('r-model', 'مۆدێل', r.carModel, { ph: 'کامری، سۆرێنتۆ...' })}</div>
      <div class="grid2">${sel1('r-year', 'ساڵی دروستکردن', r.carYear || '', [['', 'هەڵبژێرە']].concat(Array.from({ length: thisYear + 1 - 1995 + 1 }, (_, i) => [thisYear + 1 - i, thisYear + 1 - i])))}${fld('r-color', 'ڕەنگ', r.carColor, { ph: 'سپی، ڕەش...' })}</div>
      ${sel1('r-seats', 'ژمارەی کورسی بۆ سەرنشین', r.seats || 4, [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]])}
      <div class="field"><label>ژمارەی تابلۆ</label><div class="plate-in">
        <input class="input ltr latin" id="r-pcode" value="${esc(r.plateCode || '22')}" inputmode="numeric" maxlength="2" aria-label="کۆدی پارێزگا">
        <input class="input ltr latin" id="r-pletter" value="${esc(r.plateLetter || 'A')}" maxlength="1" style="text-transform:uppercase" aria-label="پیت">
        <input class="input ltr latin" id="r-pno" value="${esc(r.plateNo || '')}" inputmode="numeric" maxlength="6" placeholder="12345" aria-label="ژمارە">
      </div><span class="xs muted">وەک سەر تابلۆکە: کۆد، پیت، ژمارە</span></div>
      <div class="field"><label>وێنەکانی ئۆتۆمبێل (تابلۆکە لە وێنەی پێشەوە دیار بێت)</label><div class="photos">
        ${ui.photoField('carFront', 'پێشەوە', r.carFront)}${ui.photoField('carBack', 'دواوە', r.carBack)}${ui.photoField('carLeft', 'لای چەپ', r.carLeft)}${ui.photoField('carRight', 'لای ڕاست', r.carRight)}${ui.photoField('carInside', 'ناوەوە', r.carInside)}
      </div></div>`,
    registration: (r) => `
      ${fld('r-regno', 'ژمارەی ساڵانەی ئۆتۆمبێل', r.regNo, { ltr: true, max: 20 })}
      ${dateF('r-regexp', 'بەرواری بەسەرچوونی ساڵانە', r.regExpiry, thisYear, thisYear + 5)}
      <div class="photos">${ui.photoField('regPhoto', 'وێنەی ساڵانە', r.regPhoto)}</div>`,
    security: (r) => `
      ${dateF('r-secdate', 'بەرواری وەرگرتنی کۆدی ئاسایش', r.secDate, thisYear - 2, thisYear, `کۆدی ئاسایش ${TK.CONFIG.securityValidDays} ڕۆژ بە دروست دەمێنێتەوە`)}
      <div class="photos">${ui.photoField('secPhoto', 'وێنەی کۆدی ئاسایش', r.secPhoto)}</div>`,
    work: (r) => `
      ${fld('r-areas', 'ناوچەکانی کار', r.workAreas, { ph: 'بۆ نموونە: ئازادی، ئیسکان، ناوەندی شار' })}
      <div class="card row"><div class="grow"><b>شۆفێری منداڵان</b><div class="xs muted">دەتوانیت گەشتی منداڵان وەربگریت</div></div>${ui.toggle('regToggle', !!r.kidsDriver, 'kidsDriver')}</div>
      <div class="card row"><div class="grow"><b>کورسیی منداڵم هەیە</b><div class="xs muted">بۆ منداڵی بچووک</div></div>${ui.toggle('regToggle', !!r.childSeat, 'childSeat')}</div>
      ${sel1('r-pay', 'شێوازی وەرگرتنی موچە', r.payMethod, TK.payMethods().filter((m) => m.on !== false).map((m) => [m.id, m.name]))}
      ${fld('r-payacc', 'ژمارەی حیساب (ئەگەر کاش نییە)', r.payAccount, { ltr: true })}`,
  };
  /** خوێندنەوەی خانەکانی شاشە بۆ ناو draft */
  function collect(r) {
    const map = {
      'r-name': 'name', 'r-city': 'city', 'r-district': 'district', 'r-neighborhood': 'neighborhood', 'r-landmark': 'landmark', 'r-ename': 'emergencyName', 'r-ephone': 'emergencyPhone',
      'r-idno': 'idNo', 'r-licno': 'licNo', 'r-licclass': 'licClass', 'r-make': 'carMake', 'r-model': 'carModel', 'r-year': 'carYear', 'r-color': 'carColor', 'r-seats': 'seats',
      'r-pcode': 'plateCode', 'r-pletter': 'plateLetter', 'r-pno': 'plateNo', 'r-regno': 'regNo', 'r-areas': 'workAreas', 'r-pay': 'payMethod', 'r-payacc': 'payAccount',
      'r-phone': 'phone', 'r-pass': 'pass', 'r-pass2': 'pass2',
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) r[map[id]] = el.value.trim();
    });
    if (r.plateLetter) r.plateLetter = r.plateLetter.toUpperCase();
    [['r-birth', 'birth'], ['r-idexp', 'idExpiry'], ['r-licexp', 'licExpiry'], ['r-regexp', 'regExpiry'], ['r-secdate', 'secDate']].forEach(([id, k]) => {
      if (document.getElementById(id)) r[k] = TK.readDate(id);
    });
    return r;
  }
  /** پشکنینی هەر هەنگاوێک پێش چوونە هەنگاوی دواتر */
  function checkStep(r, step) {
    const bad = ['birth', 'idExpiry', 'licExpiry', 'regExpiry', 'secDate'].find((k) => r[k] === 'bad');
    if (bad) return 'بەروارێک دروست نییە (بۆ نموونە ٣١ی شوبات)';
    if (step === 1) {
      if (!r.name || r.name.split(/\s+/).length < 3) return 'ناوی سیانی وەک کارتی نیشتمانی بنووسە';
      if (!r.gender) return 'ڕەگەز هەڵبژێرە';
      if (!r.birth) return 'ڕۆژی لەدایکبوون هەڵبژێرە';
      if (TK.age(r.birth) < TK.CONFIG.minDriverAge) return `تەمەنی شۆفێر دەبێت لانیکەم ${TK.CONFIG.minDriverAge} ساڵ بێت`;
      if (!/^7\d{9}$/.test(TK.cleanPhone(r.phone))) return 'ژمارەی مۆبایل دروست نییە (وەک 750 123 4567)';
      if (!r.pass || r.pass.length < 6) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت';
      if (r.pass !== r.pass2) return 'وشە نهێنییەکان وەک یەک نین';
      if (!r.photo) return 'وێنەی ڕووخسار بار بکە';
    }
    if (step === 2) {
      if (!r.city || !r.district || !r.neighborhood) return 'شار، قەزا و گەڕەک بنووسە';
      if (!r.emergencyName || !/^7\d{9}$/.test(TK.cleanPhone(r.emergencyPhone))) return 'ناو و ژمارەی کەسێکی نزیک بۆ فریاکەوتن بنووسە';
      if (TK.cleanPhone(r.emergencyPhone) === TK.cleanPhone(r.phone)) return 'ژمارەی فریاکەوتن دەبێت جیا بێت لە ژمارەکەی خۆت';
    }
    if (step === 3) return TK.validateDriver({ idNo: r.idNo, idExpiry: r.idExpiry, idFront: r.idFront, idBack: r.idBack, licNo: r.licNo, licExpiry: r.licExpiry, licFront: r.licFront, licBack: r.licBack });
    if (step === 4) return TK.validateDriver({ carMake: r.carMake, carModel: r.carModel, carColor: r.carColor, carYear: r.carYear, seats: r.seats, plateCode: r.plateCode, plateNo: r.plateNo, carFront: r.carFront, carBack: r.carBack, carLeft: r.carLeft, carRight: r.carRight, carInside: r.carInside, regNo: r.regNo, regExpiry: r.regExpiry, regPhoto: r.regPhoto });
    if (step === 5) {
      const e = TK.validateDriver({ secPhoto: r.secPhoto, secDate: r.secDate });
      if (e) return e;
      if (!r.payMethod) return 'شێوازی وەرگرتنی موچە هەڵبژێرە';
      if (!r.terms) return 'دەبێت ڕازی بیت بە مەرج و ڕێساکان';
    }
    return null;
  }

  TK.route('register', {
    guard: () => (S().driver.meId ? 'today' : null),
    render() {
      if (!U.reg) U.reg = loadDraft();
      const r = U.reg;
      const st = r.step || 1;
      let body = '';
      if (st === 1) {
        body = `${SECTION.personal(r)}
          <div class="field"><label for="r-phone">ژمارەی مۆبایل</label><div class="input-wrap"><span class="prefix latin">+964</span><input class="input ltr latin" id="r-phone" inputmode="tel" value="${esc(r.phone || '')}" placeholder="7XX XXX XXXX"></div></div>
          <div class="grid2">${fld('r-pass', 'وشەی نهێنی', r.pass, { ltr: true, type: 'password', ph: 'لانیکەم ٦ پیت' })}${fld('r-pass2', 'دووبارەکردنەوە', r.pass2, { ltr: true, type: 'password' })}</div>`;
      } else if (st === 2) body = SECTION.address(r) + SECTION.emergency(r);
      else if (st === 3) body = `<div class="h3">کارتی نیشتمانی</div>${SECTION.id(r)}<div class="hr"></div><div class="h3">مۆڵەتی شۆفێری</div>${SECTION.license(r)}`;
      else if (st === 4) body = `${SECTION.car(r)}<div class="hr"></div><div class="h3">ساڵانەی ئۆتۆمبێل</div>${SECTION.registration(r)}`;
      else body = `<div class="h3">کۆدی ئاسایش</div>${SECTION.security(r)}<div class="hr"></div><div class="h3">کار و موچە</div>${SECTION.work(r)}
          <label class="card row" style="cursor:pointer"><span class="check ${r.terms ? 'on' : ''}" data-act="regTerms">${r.terms ? icon('check', 16, '#0B1733', 3) : ''}</span><span class="grow sm" data-act="regTerms">ڕازیم بە <b class="link" data-act="regShowTerms">مەرج و ڕێساکان</b> و پشتڕاست دەکەمەوە کە هەموو زانیارییەکان ڕاستن</span></label>`;
      return page(`
        ${st === 1 ? `<div class="col center" style="align-items:center;gap:6px;padding-top:8px">
          <img src="../shared/logo.png" alt="" style="width:72px;height:72px;border-radius:20px;background:#fff;padding:6px;box-shadow:var(--shadow)">
          <div class="h1">ببە بە شۆفێری تەکسیەکەم</div>
          <div class="sm muted">زانیارییەکان ورد و ڕاست بنووسە. پێش دەستپێکردنی کار پشکنینیان بۆ دەکرێت.</div>
        </div>` : ui.header('تۆمارکردنی شۆفێر', { back: false })}
        <div class="row between"><b class="sm">هەنگاوی ${st} لە ٥، ${REG_STEPS[st - 1]}</b></div>
        <div class="steps">${REG_STEPS.map((_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</div>
        <div class="card col">${body}</div>
        ${U.regErr ? `<div class="card danger sm row">${icon('alert', 18)}<span class="grow">${esc(U.regErr)}</span></div>` : ''}
        <div class="row" style="gap:10px">${st > 1 ? `<button class="btn secondary" data-act="regPrev">گەڕانەوە</button>` : ''}<button class="btn grow lg" data-act="regNext">${st < 5 ? 'دواتر' : 'ناردن بۆ پشکنین'}</button></div>
        ${st === 1 ? `<div class="center sm">پێشتر تۆمارت کردووە؟ <button class="link" data-go="login">چوونەژوورەوە</button></div>` : ''}`);
    },
  });
  acts.regGender = (g) => {
    collect(U.reg);
    U.reg.gender = g;
    saveDraft();
    TK.render();
  };
  acts.regToggle = (k) => {
    collect(U.reg);
    U.reg[k] = !U.reg[k];
    saveDraft();
    TK.render();
  };
  acts.regTerms = (a, el, e) => {
    if (e && e.target.closest('[data-act="regShowTerms"]')) return;
    collect(U.reg);
    U.reg.terms = !U.reg.terms;
    TK.render();
  };
  acts.regShowTerms = () => TK.showTerms('driver');
  /** وێنە: بچووک دەکرێتەوە، هەڵدەگیرێت و ناسنامەکەی لە draft دادەنرێت */
  acts.pickPhoto = async (val, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const key = el.getAttribute('data-arg');
    const target = U.docEdit ? U.docEdit.data : U.reg;
    if (!U.docEdit) collect(U.reg);
    TK.toast('وێنەکە ئامادە دەکرێت...');
    try {
      const data = await TK.compressImage(f);
      const id = await TK.saveImage(data);
      if (!id) return TK.toast('جێگای پاشەکەوت پڕە. وێنەیەکی بچووکتر هەڵبژێرە');
      if (target[key] && target[key] !== (sel.me() || {})[key]) TK.removeImage(target[key]);
      target[key] = id;
      if (!U.docEdit) saveDraft();
      if (U.docEdit) TK.sheet.refresh();
      else TK.render();
    } catch (e) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە. وێنەیەکی تر هەڵبژێرە');
    }
  };
  // کاتی گۆڕینی شار، لیستی قەزاکان نوێ دەبێتەوە
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'r-city' && U.reg && !U.docEdit) {
      collect(U.reg);
      U.reg.district = '';
      TK.render();
    }
  });
  acts.regNext = async (a, el) => {
    if (U.busy) return;
    const r = collect(U.reg);
    U.regErr = checkStep(r, r.step || 1);
    if (U.regErr) return TK.render();
    if ((r.step || 1) < 5) {
      r.step = (r.step || 1) + 1;
      saveDraft();
      TK.render();
      window.scrollTo(0, 0);
      return;
    }
    const done = TK.busyBtn(el);
    const err = await actions.driverRegister(r);
    done();
    U.regErr = err;
    if (err) return TK.render();
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      /* هیچ */
    }
    U.reg = null;
    TK.toast('زانیارییەکانت نێردران');
    TK.go('today', true);
  };
  acts.regPrev = () => {
    collect(U.reg);
    U.regErr = '';
    U.reg.step = Math.max(1, (U.reg.step || 1) - 1);
    saveDraft();
    TK.render();
    window.scrollTo(0, 0);
  };

  TK.route('login', {
    guard: () => (S().driver.meId ? 'today' : null),
    render() {
      return page(`
        <div class="col center" style="align-items:center;gap:8px;padding-top:20px">
          <img src="../shared/logo.png" alt="" style="width:84px;height:84px;border-radius:24px;background:#fff;padding:6px;box-shadow:var(--shadow)">
          <div class="h1">چوونەژوورەوەی شۆفێر</div>
        </div>
        <form class="col" data-submit="driverDoLogin" style="gap:12px">
          <div class="field"><label for="dlp">ژمارەی مۆبایل</label>
            <div class="input-wrap"><span class="prefix latin">+964</span><input class="input ltr latin" id="dlp" name="phone" inputmode="tel" autocomplete="tel" placeholder="7XX XXX XXXX"></div></div>
          <div class="field"><label for="dlw">وشەی نهێنی</label>
            <div class="pass-wrap"><input class="input ltr latin" id="dlw" name="pass" type="${U.showPass ? 'text' : 'password'}" autocomplete="current-password"><button type="button" class="eye" data-act="togglePass" aria-label="پیشاندانی وشەی نهێنی">${icon(U.showPass ? 'eyeOff' : 'eye', 20)}</button></div></div>
          ${U.dLoginErr ? `<div class="err">${esc(U.dLoginErr)}</div>` : ''}
          <button class="btn block lg" type="submit">چوونەژوورەوە</button>
          <div class="row" style="justify-content:flex-end"><button type="button" class="link" data-act="dForgot">وشەی نهێنیت لەبیر چووە؟</button></div>
        </form>
        <div class="center sm">هێشتا تۆمارت نەکردووە؟ <button class="link" data-go="register">ببە بە شۆفێر</button></div>`);
    },
  });
  acts.togglePass = () => {
    U.showPass = !U.showPass;
    TK.render();
  };
  acts.dForgot = () => TK.sheet(() => `<div class="h2">وشەی نهێنیت لەبیر چووە؟</div>
      <div class="sm muted" style="line-height:1.9">پەیوەندی بە تیمی تەکسیەکەم بکە بۆ یارمەتی.</div>
      <button class="btn ghost block" data-close>باشە</button>`);
  acts.driverDoLogin = async (f, form) => {
    if (U.busy) return;
    const done = TK.busyBtn(form);
    U.dLoginErr = await actions.driverLogin(f.phone || '', f.pass || '');
    done();
    if (U.dLoginErr) return TK.render();
    const d = sel.me();
    TK.toast(`بەخێربێیتەوە ${d.name.split(' ')[0]}`);
    TK.go('today', true);
  };

  /* ---------- نوێکردنەوەی بەڵگەنامەیەک (ڕەتکراو یان بەسەرچوو) ---------- */
  const DOC_FORM = {
    personal: ['personal'], id: ['id'], license: ['license'], car: ['car'], registration: ['registration'], security: ['security'],
  };
  acts.editDocs = (group) => {
    const me = sel.me();
    U.docEdit = { group, data: Object.assign({}, me), err: '' };
    TK.sheet(() => {
      const e = U.docEdit;
      if (!e) return null;
      const g = TK.DOC_GROUPS.find((x) => x.key === e.group);
      return `<div class="h2">${g.label}</div>
        ${me.docReason && me.docReason[e.group] ? `<div class="card danger sm"><b>هۆکاری ڕەتکردنەوە:</b> ${esc(me.docReason[e.group])}</div>` : ''}
        <div class="col">${DOC_FORM[e.group].map((k) => SECTION[k](e.data)).join('')}</div>
        ${e.err ? `<div class="err">${esc(e.err)}</div>` : ''}
        <button class="btn block" data-act="saveDocs">ناردن بۆ پشکنین</button>
        <button class="btn ghost block" data-act="cancelDocs">پاشگەزبوونەوە</button>`;
    });
  };
  acts.cancelDocs = () => {
    U.docEdit = null;
    TK.closeSheet();
  };
  acts.saveDocs = () => {
    const e = U.docEdit;
    const d = collect(e.data);
    const pick = {
      personal: ['name', 'birth', 'photo'], id: ['idNo', 'idExpiry', 'idFront', 'idBack'], license: ['licNo', 'licClass', 'licExpiry', 'licFront', 'licBack'],
      car: ['carMake', 'carModel', 'carYear', 'carColor', 'seats', 'plateCode', 'plateLetter', 'plateNo', 'carFront', 'carBack', 'carLeft', 'carRight', 'carInside'],
      registration: ['regNo', 'regExpiry', 'regPhoto'], security: ['secPhoto', 'secDate'],
    }[e.group];
    const patch = {};
    pick.forEach((k) => (patch[k] = d[k]));
    let err = null;
    if (e.group === 'personal') {
      if (!d.name || d.name.split(/\s+/).length < 3) err = 'ناوی سیانی بنووسە';
      else if (!d.birth || d.birth === 'bad' || TK.age(d.birth) < TK.CONFIG.minDriverAge) err = `تەمەن دەبێت لانیکەم ${TK.CONFIG.minDriverAge} ساڵ بێت`;
      else if (!d.photo) err = 'وێنەی ڕووخسار بار بکە';
    } else err = TK.validateDriver(patch);
    if (err) {
      e.err = err;
      return TK.sheet.refresh();
    }
    if (e.group === 'car') {
      patch.plate = `${d.plateCode} ${String(d.plateLetter || 'A').toUpperCase()} ${d.plateNo}`;
      patch.seats = +d.seats;
    }
    if (e.group === 'personal') patch.initial = d.name.slice(0, 1);
    actions.updateDriverDocs(e.group, patch);
    U.docEdit = null;
    TK.closeSheet();
    TK.toast('نێردرا بۆ پشکنین');
  };

  /* =========================================================
   * یارمەتیدەرەکانی گەشت
   * ======================================================= */
  const meId = () => S().driver.meId;
  const cityName = () => (TK.city((sel.me() || {}).city) || {}).name || 'هەولێر';
  /** کردنەوەی Google Maps بۆ ڕێنمایی ڕێگا بۆ وێستگەیەک */
  /** ڕێنمایی ڕێگا بۆ وێستگەیەک: Google Maps یان Waze (بە شوێنی ورد ئەگەر دیاری کرابێت) */
  acts.nav = (arg) => {
    const [id, stopId] = String(arg).split('|');
    const rv = sel.run(id);
    const st = rv && rv.stops.find((x) => x.id === stopId);
    if (!st) return;
    TK.navSheet(TK.stopGeo(rv.lead, st), st.place, cityName());
  };
  /** دۆخی GPS لەسەر نەخشەی گەشت (maps.js نوێی دەکاتەوە) */
  const gpsTag = () => '<span class="live-dot"></span><span data-gps-tag>سەرنشینەکان دەیبینن</span>';
  /** ئەگەر GPS کار ناکات، ڕوونکردنەوە */
  function gpsCard() {
    const g = TK.gpsState ? TK.gpsState() : 'ok';
    if (g === 'denied') return `<div class="card danger col tight"><b>ڕێگە بە شوێن (Location) نەدراوە</b><span class="sm">سەرنشینەکان ئۆتۆمبێلەکەت لەسەر نەخشە نابینن. لە ڕێکخستنەکانی مۆبایل ڕێگە بە شوێن بدە بۆ وێبگەڕەکە، پاشان دووبارە هەوڵ بدەرەوە.</span><button class="btn sm secondary" data-act="retryGps">دووبارە هەوڵدانەوە</button></div>`;
    if (g === 'insecure') return `<div class="card note sm">شوێنی GPS تەنها لەسەر ناونیشانی https کار دەکات.</div>`;
    return '';
  }
  acts.retryGps = () => {
    TK.retryGps && TK.retryGps();
    setTimeout(() => TK.render(), 1500);
  };
  const num = (n, cls = '') => `<span class="num ${cls}">${n}</span>`;
  const KIND = { pickup: 'سوارکردن', dropoff: 'دابەزاندن' };
  /** کرداری داهاتووی گەشتێک بۆ دوگمە گەورەکە */
  function nextAction(rv) {
    if (!rv || rv.driverId !== meId()) return null;
    if (rv.status === 'scheduled') return { kind: 'start' };
    if (rv.status !== 'active') return null;
    const i = rv.stops.findIndex((x) => !x.done);
    const st = rv.stops[i];
    if (!st) return null;
    if (st.kind === 'pickup') return { kind: st.arrivedAt ? 'board' : 'arrive', st, i };
    return { kind: 'drop', st, i };
  }
  const activeRun = () => sel.driverRuns().find((r) => r.status === 'active' && r.driverId === meId());
  /** دوگمە گەورەکە: بەڕێ کەوتم ← گەیشتم ← سوار بوو ← ... ← گەیاندم */
  function bigButton(rv) {
    const a = nextAction(rv);
    if (!a) return '';
    const cap = (t) => `<div class="bcap">${t}</div>`;
    if (a.kind === 'start') {
      const me = sel.me();
      const busy = activeRun();
      const wait = TK.startWait(rv.lead);
      if (!me || me.status !== 'active') return `<button class="bigact off" disabled>${icon('lock', 24, 'currentColor', 2.2)}<span>هەژمارەکەت چالاک نییە</span></button>`;
      if (busy && busy.key !== rv.key) return `<button class="bigact off" disabled>${icon('hourglass', 24, 'currentColor', 2.2)}<span>سەرەتا گەشتی ئێستا تەواو بکە</span></button>`;
      if (wait > 0) return `<button class="bigact off" disabled>${icon('clock', 24, 'currentColor', 2.2)}<span>بەڕێ کەوتم</span></button>${cap(`لە ${fmt.clock(fmt.addMin(rv.time, -TK.CONFIG.startEarlyMin))}ەوە دەتوانیت دەست پێبکەیت`)}`;
      return `<button class="bigact go" data-act="runStep" data-arg="${rv.id}">${icon('play', 22, 'currentColor', 2, 'currentColor')}<span>بەڕێ کەوتم</span></button>${cap(rv.pooled ? `${rv.people} سەرنشین بە شوێنکەوتنی زیندوو ئاگادار دەکرێنەوە` : 'سەرنشین بە شوێنکەوتنی زیندوو ئاگادار دەکرێتەوە')}`;
    }
    if (a.kind === 'arrive') return `<button class="bigact go" data-act="runStep" data-arg="${rv.id}">${icon('pin', 24, 'currentColor', 2.4)}<span>گەیشتم</span></button>${cap(`کاتێک گەیشتیتە ${esc(a.st.place)} دایبگرە`)}`;
    if (a.kind === 'board') {
      const until = TK.absentAt(a.st);
      return `<button class="bigact ok" data-act="runStep" data-arg="${rv.id}">${icon('check', 26, 'currentColor', 3)}<span>سوار بوو</span></button>
        <button class="btn block danger" data-act="absent" data-arg="${rv.id}" data-wait-until="${until}" ${Date.now() < until ? 'disabled' : ''}>${icon('x', 18, 'currentColor', 2.4)}نەهات، بڕۆ بۆ وێستگەی داهاتوو <span class="wait"></span></button>
        ${cap(`«نەهات» دوای ${TK.CONFIG.absentWaitMin} خولەک چاوەڕوانی چالاک دەبێت`)}`;
    }
    return `<button class="bigact ok" data-act="runStep" data-arg="${rv.id}">${icon('check', 26, 'currentColor', 3)}<span>گەیاندم</span></button>${cap(`دوای دابەزاندنی ${esc(a.st.riders)} دایبگرە`)}`;
  }
  /** پەیوەندی بە سەرنشینێک: تەلەفۆن ئەگەر ژمارەکەی پیشان دابێت، هەمیشە نامە */
  function contactBtns(owner) {
    const ph = sel.peerPhone(owner);
    return `${ph ? `<a class="rbtn ok" href="tel:0${esc(ph)}" aria-label="پەیوەندی">${icon('phone', 20)}</a>` : ''}<button class="rbtn" data-go="chat/${encodeURIComponent(owner)}" aria-label="نامە">${icon('chat', 20)}</button>`;
  }
  /** تێبینییەکانی سەرنشینانی وێستگەیەک (بۆ نموونە «کورسیی منداڵ پێویستە») */
  const notesOf = (st) => [...new Set((st.parts || []).map((p) => TK.subNote(p.subId)).filter(Boolean))];
  /** بەشی «ئێستا»: وێستگەی داهاتوو بە نووسینی گەورە */
  function nowPanel(rv) {
    const a = nextAction(rv);
    const st = a && a.st ? a.st : rv.status === 'scheduled' ? rv.stops[0] : null;
    if (!st) return '';
    const label = rv.status === 'scheduled' ? 'یەکەم وێستگە' : a.kind === 'drop' ? 'ئێستا بیگەیەنە' : a.kind === 'board' ? 'لە بەردەم دەرگایت' : 'ئێستا بڕۆ بۆ';
    const owners = [...new Set((st.parts || []).map((p) => p.owner))];
    return `<div class="nowbox">
      <div class="row" style="gap:10px">${num(rv.stops.indexOf(st) + 1, 'big')}<div class="grow">
        <div class="xs muted">${label}</div>
        <div class="now-place">${esc(st.place)}</div>
        <div class="sm">${KIND[st.kind]}ی <b>${esc(st.riders)}</b>، ${fmt.clock(st.time)}</div>
      </div></div>
      ${st.kind === 'pickup' ? notesOf(st).map((n) => `<div class="sm quote">${icon('doc', 14, 'var(--brand)')} ${esc(n)}</div>`).join('') : ''}
      <div class="row" style="gap:8px"><button class="btn secondary grow" data-act="nav" data-arg="${rv.id}|${st.id}">${icon('navigate', 18, 'currentColor', 2.2)}ڕێنمایی ڕێگا</button>${st.kind === 'pickup' ? owners.map(contactBtns).join('') : ''}</div>
    </div>`;
  }
  /** لیستی وێستگەکان بە ژمارە */
  function stopList(rv, full) {
    const ni = rv.status === 'active' ? rv.stops.findIndex((x) => !x.done) : -1;
    return `<div class="stoplist">${rv.stops.map((st, i) => {
      const cur = i === ni;
      const owners = [...new Set((st.parts || []).map((p) => p.owner))];
      return `<div class="srow ${st.done ? 'done' : ''} ${cur ? 'cur' : ''}">
        ${st.done ? `<span class="num ${st.absent ? 'bad' : 'okc'}">${st.absent ? icon('x', 14, '#fff', 3) : icon('check', 14, '#fff', 3)}</span>` : num(i + 1, cur ? 'cur' : '')}
        <div class="grow"><div class="row between"><b>${esc(st.place)}</b><span class="sm ${st.done ? 'ok' : 'muted'}" style="white-space:nowrap">${st.done ? (st.absent ? 'نەهات' : fmt.clock(fmt.hhmm(st.doneAt))) : fmt.clock(st.time)}</span></div>
          <div class="xs muted">${KIND[st.kind]}ی ${esc(st.riders)}</div>${st.kind === 'pickup' && !st.done ? notesOf(st).map((n) => `<div class="xs brand">${icon('doc', 12, 'currentColor')} ${esc(n)}</div>`).join('') : ''}</div>
        ${full && !st.done && st.kind === 'pickup' && rv.status !== 'done' ? `<div class="row" style="gap:6px">${owners.map(contactBtns).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }
  const statusBadge = (rv) => (rv.driverId !== meId() ? ui.badge('دراوە بە جێگرەوە', 'info') : rv.status === 'active' ? ui.badge('لە ڕێگەیە', 'ok') : rv.status === 'done' ? ui.badge('تەواو', 'ok') : rv.status === 'skipped' ? ui.badge('نایەن', 'danger') : sel.swapOf(rv.id) && sel.swapOf(rv.id).status === 'open' ? ui.badge('چاوەڕێی جێگرەوە', 'note') : '');
  /** کارتی سەرەکی: گەشتی ئێستا یان داهاتوو */
  function heroCard(rv) {
    const a = nextAction(rv);
    const st = a && a.st ? a.st : rv.stops[0];
    const idx = Math.max(0, rv.stops.indexOf(st));
    const last = rv.stops[rv.stops.length - 1];
    const firstRiders = ((rv.stops[0].parts || [])[0] || {}).riders || rv.title;
    // گەشتی هاوبەش: ناو = شوێنی گەیشتن، چونکە کات لە لای چەپ نووسراوە
    const name = rv.pooled ? last.place.split('، ')[0] : firstRiders;
    const sub = rv.pooled ? `تەکسی هاوبەش، ${rv.dir === 'back' || rv.lead.dir === 'back' ? 'هاتنەوە' : 'چوون'}` : last.place;
    const owners = st.kind === 'pickup' ? [...new Set((st.parts || []).map((p) => p.owner))].slice(0, 2) : [];
    const wait = rv.status === 'scheduled' ? TK.startWait(rv.lead) : 0;
    const chip = rv.status === 'active' ? '<span class="hchip ok"><i></i>لە ڕێگەیە</span>' : wait > 0 ? `<span class="hchip"><i></i>لە ${fmt.clock(fmt.addMin(rv.time, -TK.CONFIG.startEarlyMin))}ەوە</span>` : '<span class="hchip amb"><i></i>ئامادەیە</span>';
    const between = rv.stops.length - idx - 2;
    const lbl = idx === 0 ? 'یەکەم وێستگە' : `وێستگەی ${idx + 1}`;
    return `<div class="card hero2">
      <div class="h2top tap" data-go="trip/${rv.id}">
        <div class="hav">${rv.pooled ? icon('users', 26, '#fff', 2) : esc(name.slice(0, 1))}</div>
        <div class="grow"><div class="hname">${esc(name)}</div><div class="hsub">${esc(sub)}</div></div>
        <div class="htm"><small>${rv.status === 'active' ? 'کاتی ئەم وێستگەیە' : 'کاتی سوارکردن'}</small><div><b>${fmt.clockBare(rv.status === 'active' ? st.time : rv.time)}</b> ${fmt.period(rv.status === 'active' ? st.time : rv.time)}</div></div>
      </div>
      <div class="hchips"><span class="hchip">${icon('user', 16)}${rv.people} سەرنشین</span><span class="hchip">${icon('pin', 16)}${rv.stops.length} وێستگە</span>${chip}</div>
      ${rv.status === 'active' ? ui.map(rv.lead, { tag: gpsTag() }) + gpsCard() : '<div class="hsep"></div>'}
      <div class="htl">
        <div class="htl-row"><span class="htl-n">${idx + 1}</span><div class="grow">
          <div class="htl-k">${KIND[st.kind]} · ${lbl}${a && a.kind === 'board' ? ' · لە بەردەم دەرگایت' : ''}</div>
          <div class="htl-p">${esc(st.place)}</div>
          <div class="htl-s">${esc(st.riders)} · ${fmt.clock(st.time)}</div>
          ${st.kind === 'pickup' ? notesOf(st).map((n) => `<div class="htl-note">${icon('doc', 13, 'currentColor')} ${esc(n)}</div>`).join('') : ''}
        </div></div>
        ${st !== last ? `<div class="htl-row end"><span class="htl-sq"></span><div class="grow">
          <div class="htl-k2">گەیشتن · دواین وێستگە${between > 0 ? ` · ${between} وێستگەی تر` : ''}</div>
          <div class="htl-p2">${esc(last.place)}</div>
        </div></div>` : ''}
      </div>
      <div class="hacts"><button class="hnav" data-act="nav" data-arg="${rv.id}|${st.id}">${icon('navigate', 20, 'currentColor', 2.2)}ڕێنمایی ڕێگا</button>${owners.map((o) => `<button class="hsq" data-go="chat/${encodeURIComponent(o)}" aria-label="نامە">${icon('chat', 22)}</button>${sel.peerPhone(o) ? `<a class="hsq" href="tel:0${esc(sel.peerPhone(o))}" aria-label="پەیوەندی">${icon('phone', 22)}</a>` : ''}`).join('')}</div>
      ${bigButton(rv)}
      ${rv.stops.length > 2 ? `<button class="btn ghost block sm" data-go="trip/${rv.id}">هەموو وێستگەکان (${rv.stops.length})</button>` : ''}
    </div>`;
  }
  /** دێڕێکی بچووک بۆ گەشتەکانی تری ئەمڕۆ */
  function runRow(rv) {
    const faded = rv.status === 'skipped' || rv.driverId !== meId();
    return `<button class="card row tap runrow glass" data-go="trip/${rv.id}" style="${faded ? 'opacity:.6' : ''}">
      <div class="htime sm ${rv.status === 'done' ? 'ok' : ''}">${fmt.clock(rv.time)}</div>
      <div class="grow" style="text-align:right"><b>${esc(rv.title)}</b><div class="xs muted">${rv.people} کەس${rv.pooled ? `، ${rv.stops.filter((x) => x.kind === 'pickup').length} وێستگەی سوارکردن` : ''}${rv.skipped.length && rv.status !== 'skipped' ? `، ${rv.skipped.length} نایەن` : ''}</div></div>
      ${statusBadge(rv) || icon('forward', 18, 'var(--muted)')}
    </button>`;
  }

  /* =========================================================
   * ئەمڕۆ
   * ======================================================= */
  TK.route('today', {
    guard: () => authed() || (sel.me().introSeen ? null : 'intro'),
    render() {
      const me = sel.me();
      const runs = sel.driverRuns();
      const mine = runs.filter((r) => r.driverId === meId());
      const hero = mine.find((r) => r.status === 'active') || mine.find((r) => r.status === 'scheduled');
      const rest = runs.filter((r) => r !== hero);
      const open = sel.openForMe();
      const unread = sel.dUnread();
      return page(`
        <div class="topbar">
          <button class="icon-btn plain" data-go="profile" aria-label="پرۆفایل">${ui.dAvatar(me, 40)}</button>
          <div class="brandmark"><img src="../shared/logo.png" alt=""><span class="name">تەکسیەکەم</span></div>
          <button class="icon-btn" data-go="notices" aria-label="ئاگادارکردنەوەکان">${icon('bell', 22)}${unread ? `<span class="dot-badge">${unread}</span>` : ''}</button>
        </div>
        ${me.status !== 'active' ? verifyBar(me) : onlineCard(me)}
        ${expiryCards(me)}
        ${sel.openSwapsForMe().map(swapCard).join('')}
        ${open.length && me.online ? `<button class="card note row tap" data-go="requests" style="text-align:right"><div class="ico-box" style="background:var(--amber)">${icon('megaphone', 22, '#0B1733')}</div><div class="grow"><b>${open.length} داواکاری نوێ</b><div class="sm muted">سەرنشینی نوێ وەربگرە</div></div>${icon('forward', 20)}</button>` : ''}
        ${me.status === 'active' && (hero || runs.length) ? `<div class="daylabel">${icon('calendar', 16, 'var(--muted)')}<span>ئەمڕۆ، ${fmt.today()}</span></div>` : ''}
        ${hero ? heroCard(hero) : me.status === 'active' ? (runs.length ? `<div class="card ok row">${icon('check', 24, 'currentColor', 2.6)}<div class="grow"><b>هەموو گەشتەکانی ئەمڕۆ تەواو بوون</b><div class="xs">دەستخۆش</div></div></div>` : '') + tomorrowSection(!runs.length && !mySubs().length) : ''}
        ${rest.length ? `<div class="section-title"><div class="h3">${hero ? 'گەشتەکانی تری ئەمڕۆ' : 'گەشتەکانی ئەمڕۆ'}</div><span class="xs muted">${rest.length}</span></div>${rest.map(runRow).join('')}` : ''}
        <button class="fab-msg" data-go="inbox" aria-label="نامەکان">${icon('chat', 28, 'currentColor', 2.1)}${sel.unreadMsgsD() ? `<span class="nb">${sel.unreadMsgsD()}</span>` : ''}</button>`, 'today');
    },
  });
  /** گەشتەکانی بەیانی (سبەینێ) بە پێی بەژداری و ڕۆتەکان، بێ ئەوەی هێشتا دروست کرابن */
  function tomorrowPlan() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const subs = mySubs().filter((x) => x.status === 'active' && TK.dayApplies(x, d));
    const out = [];
    ['go', 'back'].forEach((dir) => {
      const rs = myRoutes().filter((r) => r.dir === dir);
      rs.forEach((r) => {
        const list = r.subIds.map(subById).filter((x) => x && subs.includes(x));
        if (list.length) out.push({ time: r.time, title: r.name, people: list.reduce((n, x) => n + ppl(x), 0), stops: list.length, pooled: true, from: TK.subLeg(list[0], dir).from });
      });
      subs.filter((x) => TK.subTime(x, dir) && !rs.some((r) => r.subIds.includes(x.id))).forEach((x) => out.push({ time: TK.subTime(x, dir), title: dir === 'back' ? `هاتنەوە، ${x.riderNames}` : `${x.riderNames}، ${x.to.split('، ')[0]}`, people: ppl(x), stops: 1, pooled: false, from: TK.subLeg(x, dir).from }));
    });
    return { date: d, list: out.sort((a, b) => a.time.localeCompare(b.time)) };
  }
  function tomorrowSection(noClients) {
    if (noClients) return ui.empty('calendar', 'هێشتا هیچ گەشتێکت نییە', 'لە «داواکاری» سەرنشینی نوێ وەربگرە', '<button class="btn" data-go="requests">داواکارییەکان</button>');
    const { date, list } = tomorrowPlan();
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `<div class="section-title"><div><div class="h3">گەشتەکانی بەیانی</div><div class="xs muted">${fmt.day(iso)}</div></div><span class="xs muted">${list.length}</span></div>
      ${list.length ? list.map((x) => `<div class="card row runrow"><div class="htime sm">${fmt.clock(x.time)}</div><div class="grow"><b>${esc(x.title)}</b><div class="xs muted">${x.people} کەس${x.pooled ? `، ${x.stops} وێستگە، هاوبەش` : ''}، یەکەم: ${esc(x.from.split('، ')[0])}</div></div></div>`).join('') : `<div class="card sm muted center">بەیانی هیچ گەشتێکت نییە</div>`}`;
  }
  function onlineCard(me) {
    return `<div class="card row onlcard">
      <span class="onl ${me.online ? 'on' : ''}"></span>
      <div class="grow"><b>${me.online ? 'ئامادەی کارم' : 'ئۆفلاین'}</b><div class="xs" style="opacity:.8">${me.online ? 'داواکاری نوێ وەردەگریت' : 'داواکاری نوێت بۆ نایەت'}</div></div>
      ${ui.toggle('online', me.online)}
    </div>`;
  }
  /** شریتی سوور کاتێک هەژمار هێشتا پشتڕاست نەکراوەتەوە یان ڕاگیراوە */
  function verifyBar(me) {
    const rej = TK.DOC_GROUPS.filter((g) => me.docStatus && me.docStatus[g.key] === 'rejected');
    const title = me.status === 'suspended' ? 'هەژمارەکەت ڕاگیراوە' : 'هێشتا هەژمارەکەت پشتڕاست نەکراوەتەوە';
    const sub = me.status === 'suspended' ? 'ناتوانیت داواکاری وەربگریت. پەیوەندی بە تیمی تەکسیەکەم بکە.' : rej.length ? `${rej.length} بەڵگەنامە ڕەتکرایەوە. لە پرۆفایل نوێیان بکەرەوە.` : 'تیمی تەکسیەکەم بەڵگەنامەکانت دەپشکنێت. دوای پشتڕاستکردنەوە دەتوانیت کار بکەیت.';
    return `<div class="verify-bar tap" data-go="profile">${icon('lock', 24, '#fff', 2)}<div class="grow"><b>${title}</b><div>${sub}</div></div></div>`;
  }
  /** ئاگاداری بەسەرچوونی بەڵگەنامە */
  function expiryCards(me) {
    const warn = TK.expiries(me).filter((e) => e.days <= TK.CONFIG.expiryWarnDays);
    return warn.map((e) => `<div class="card danger row tap" data-act="editDocs" data-arg="${e.key}">${icon('alert', 20)}<div class="grow"><b>${e.days < 0 ? `${e.label}ەکەت بەسەرچووە` : `${e.label}ەکەت ${e.days} ڕۆژی ماوە`}</b><div class="xs">وێنەی نوێ بنێرە</div></div>${icon('forward', 18)}</div>`).join('');
  }
  acts.online = () => {
    const me = sel.me();
    if (!me || me.status !== 'active') return TK.toast('هێشتا هەژمارەکەت پشتڕاست نەکراوەتەوە');
    actions.setMyDriver({ online: !me.online });
  };
  /** داواکاری جێگرەوە لە شۆفێرێکی تر */
  function swapCard(w) {
    const t = sel.trip(w.tripId);
    const rv = sel.run(w.tripId);
    const from = sel.driver(w.fromDriverId);
    if (!t || !rv || !from) return '';
    return `<div class="card col" style="border:2px solid var(--amber)">
      <div class="row">${icon('swap', 22, 'var(--brand)')}<b class="grow">${esc(from.name.split(' ')[0])} جێگرەوەی دەوێت</b><b class="ok">${fmt.money(w.pay)}</b></div>
      <div class="sm">${esc(rv.title)}، ${fmt.time(rv.time)}، ${rv.people} کەس</div>
      <div class="xs muted">${esc(rv.stops[0].place)} ← ${esc(rv.stops[rv.stops.length - 1].place)}، ${rv.stops.length} وێستگە${t.kind === 'kids' ? '، منداڵان' : ''}</div>
      ${w.note ? `<div class="sm quote">«${esc(w.note)}»</div>` : ''}
      <button class="btn block" data-act="takeSwap" data-arg="${w.id}">${icon('check', 18, 'currentColor', 2.4)}وەریدەگرم</button>
    </div>`;
  }
  acts.takeSwap = (id) => {
    actions.takeSwap(id);
    TK.toast('گەشتەکە زیاد کرا بۆ ئەمڕۆت');
  };
  /** دوگمە گەورەکە: هەنگاوی داهاتووی گەشت */
  acts.runStep = (id) => {
    const rv = sel.run(id);
    const a = nextAction(rv);
    if (!a) return;
    if (navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        /* هیچ */
      }
    }
    if (a.kind === 'start') {
      const err = actions.startTrip(rv.id);
      if (err) return TK.toast(err);
      TK.toast(rv.pooled ? 'سەرنشینەکان ئاگادار کرانەوە' : 'سەرنشین ئاگادار کرایەوە');
      return;
    }
    const finished = actions.completeStop(rv.id);
    TK.toast(a.kind === 'arrive' ? 'ئاگادار کرانەوە کە گەیشتوویت' : a.kind === 'board' ? `${a.st.riders} سوار بوون` : `${a.st.riders} گەیاندران`);
    if (finished) TK.go(`rate/${rv.id}`, true);
  };
  acts.absent = async (id) => {
    const rv = sel.run(id);
    const a = nextAction(rv);
    if (!a || a.kind !== 'board') return;
    if (Date.now() < TK.absentAt(a.st)) return TK.toast(`تکایە لانیکەم ${TK.CONFIG.absentWaitMin} خولەک چاوەڕێ بکە`);
    if (!(await TK.ask(`${a.st.riders} نەهاتن؟ ئاگادار دەکرێنەوە کە چاوەڕێت کردن. چونکە پێشتر «نایەم»یان نەکردبوو، ئەم گەشتە بۆیان حیساب دەکرێت.`, { yes: 'بەڵێ، نەهات' }))) return;
    const finished = actions.riderAbsent(rv.id);
    TK.toast('تۆمار کرا');
    if (finished) TK.go('today', true);
  };

  /* =========================================================
   * گەشت (هەموو وێستگەکان)
   * ======================================================= */
  TK.route('trip/:id', {
    guard: authed,
    render({ id }) {
      const rv = sel.run(id);
      if (!rv) return page(ui.header('گەشت', { back: 'today' }) + ui.empty('route', 'نەدۆزرایەوە', ''));
      const mineRun = rv.driverId === meId();
      const sw = sel.swapOf(rv.id);
      const QUICK = ['٥ خولەکی تر دەگەم', 'لە بەردەم دەرگام', 'ترافیک قەرەباڵغە، کەمێک دوا دەکەوم'];
      let top = '';
      if (!mineRun) top = `<div class="card info sm row">${icon('swap', 18)}<span>ئەم گەشتە دراوە بە ${esc((sel.driver(rv.driverId) || {}).name || '')}. پێویست ناکات بڕۆیت.</span></div>`;
      else if (rv.status === 'skipped') top = `<div class="card danger col tight"><b>ئەمڕۆ نایەن</b><span class="sm">${esc(rv.lead.skipReason || '')} پێویست ناکات بڕۆیت.</span></div>`;
      else if (rv.status === 'done') top = `<div class="card ok row">${icon('check', 24, 'currentColor', 2.6)}<b class="grow">گەشتەکە تەواو بوو</b></div>${rv.rated ? '' : `<button class="btn block" data-go="rate/${rv.id}">هەڵسەنگاندنی سەرنشینەکان</button>`}`;
      return page(`
        ${ui.header(rv.title, { back: 'today', sub: `${fmt.clock(rv.time)}، ${rv.people} کەس${rv.pooled ? '، هاوبەش' : ''}` })}
        ${top}
        ${rv.status === 'active' || rv.status === 'scheduled' ? ui.map(rv.lead, { tag: rv.status === 'active' ? gpsTag() : '' }) + (mineRun && rv.status === 'active' ? gpsCard() : '') : ''}
        ${mineRun && (rv.status === 'active' || rv.status === 'scheduled') ? nowPanel(rv) + bigButton(rv) : ''}
        <div class="card col"><div class="h3">وێستگەکان</div>${stopList(rv, mineRun)}</div>
        ${rv.skipped.length && rv.status !== 'skipped' ? `<div class="card note sm col tight"><b>ئەمڕۆ نایەن</b>${rv.skipped.map((t) => `<span>${esc((subById(t.subId) || {}).riderNames || t.title)}${t.skipReason ? '، ' + esc(t.skipReason) : ''}</span>`).join('')}</div>` : ''}
        ${mineRun && rv.status !== 'done' && rv.status !== 'skipped' ? `<div class="h3">نامەی خێرا بۆ ${rv.pooled ? 'هەموو سەرنشینەکان' : 'سەرنشین'}</div><div class="chips">${QUICK.map((q) => `<button class="chip" data-act="quick" data-arg="${q}">${q}</button>`).join('')}</div>` : ''}
        ${mineRun && rv.status === 'scheduled' ? (sw && sw.status === 'open' ? `<div class="card note col tight"><b class="sm">بڵاو کراوەتەوە بۆ جێگرەوە، ${fmt.money(sw.pay)}</b><span class="xs muted">ئەگەر کەس وەری نەگرت، دەبێت خۆت بڕۆیت.</span><button class="btn sm ghost" data-act="cancelSwap" data-arg="${sw.id}">هەڵوەشاندنەوە</button></div>` : `<button class="btn secondary block" data-act="postSwap" data-arg="${rv.id}">${icon('swap', 18)}ناتوانم بڕۆم، جێگرەوە</button>`) : ''}`);
    },
  });
  /** نامەی خێرا بۆ هەموو سەرنشینانی گەشتەکە */
  acts.quick = (q) => {
    const rv = sel.run(TK.app.current.params.id);
    if (!rv) return;
    const owners = [...new Set(rv.trips.filter((t) => t.status !== 'skipped').map((t) => t.owner || 'me'))];
    owners.forEach((o) => actions.sendMessage(meId(), o, q, true));
    TK.toast(owners.length > 1 ? `نێردرا بۆ ${owners.length} سەرنشین` : 'نێردرا');
  };
  acts.postSwap = (id) => {
    U.swap = { id, pay: 6000, note: '' };
    TK.sheet(() => {
      const w = U.swap;
      const rv = sel.run(w.id);
      if (!rv) return null;
      const NOTES = ['نەخۆشم', 'کارێکی بەپەلەم هەیە', 'ئۆتۆمبێلەکەم تێکچووە'];
      return `<div class="h2">داوای جێگرەوە</div>
        <div class="sm">${esc(rv.title)}، ${fmt.time(rv.time)}، ${rv.people} کەس</div>
        <div class="sm muted">ئەو بڕە پارەیە دیاری بکە کە دەیدەیت بەو شۆفێرەی جێگات دەگرێتەوە.</div>
        <div class="stepper"><button data-act="swapStep" data-arg="1000">+</button><div class="val brand">${fmt.money(w.pay)}</div><button data-act="swapStep" data-arg="-1000">−</button></div>
        <div class="field"><label>هۆکار</label><div class="chips">${NOTES.map((n) => `<button class="chip ${w.note === n ? 'on' : ''}" data-act="swapNote" data-arg="${n}">${n}</button>`).join('')}</div></div>
        <div class="card note sm">سەرنشینەکان تەنها کاتێک ئاگادار دەکرێنەوە کە شۆفێرێک وەری بگرێت.</div>
        <button class="btn block lg" data-act="sendSwap">${icon('megaphone', 18)}بڵاوکردنەوە</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.swapStep = (d) => {
    U.swap.pay = Math.min(30000, Math.max(1000, U.swap.pay + +d));
    TK.sheet.refresh();
  };
  acts.swapNote = (n) => {
    U.swap.note = U.swap.note === n ? '' : n;
    TK.sheet.refresh();
  };
  acts.sendSwap = () => {
    actions.postSwap(U.swap.id, U.swap.pay, U.swap.note);
    TK.closeSheet();
    TK.toast('بڵاو کرایەوە');
  };
  acts.cancelSwap = (id) => {
    actions.cancelSwap(id);
    TK.toast('هەڵوەشێنرایەوە');
  };

  /* =========================================================
   * ڕۆتەکان: چەند سەرنشین لە یەک تەکسیدا
   * ======================================================= */
  const DIRS = [{ v: 'go', l: 'چوون' }, { v: 'back', l: 'هاتنەوە' }];
  const mySubs = () => S().subscriptions.filter((x) => x.driverId === meId() && x.status !== 'ended');
  const myRoutes = () => (S().routes || []).filter((r) => r.driverId === meId());
  const subById = (id) => S().subscriptions.find((x) => x.id === id);
  const ppl = (x) => x.riders || (x.memberIds || []).length || 1;
  TK.route('routes', {
    guard: authed,
    render() {
      const routes = myRoutes();
      const subs = mySubs();
      const section = (dir) => {
        const rs = routes.filter((r) => r.dir === dir).sort((a, b) => a.time.localeCompare(b.time));
        const alone = subs.filter((x) => TK.subTime(x, dir) && !rs.some((r) => r.subIds.includes(x.id))).sort((a, b) => TK.subTime(a, dir).localeCompare(TK.subTime(b, dir)));
        if (!rs.length && !alone.length) return '';
        return `${rs.map(routeCard).join('')}
          ${alone.length ? `<div class="card col"><div class="row"><b class="grow sm">بە تەنها (لە هیچ ڕۆتێکدا نین)</b><span class="xs muted">${alone.length}</span></div>
            ${alone.map((x) => {
              const fit = rs.find((r) => !TK.poolError(r.subIds.map(subById).filter(Boolean).concat([x]), dir, sel.me()));
              return `<div class="col tight" style="gap:6px;padding:6px 0;border-bottom:1px dashed var(--line)"><div class="row sm" style="gap:8px">${icon(x.hasChild ? 'child' : 'user', 18, 'var(--muted)')}<span class="grow">${esc(x.riderNames)}${x.rideType === 'private' ? ` ${ui.badge('تایبەت')}` : ''}${x.status === 'paused' ? ` ${ui.badge('ڕاگیراوە', 'danger')}` : ''}<span class="xs muted">، ${esc(TK.subLeg(x, dir).from.split('، ')[0])}</span></span><b>${fmt.clock(TK.subTime(x, dir))}</b></div>
                ${fit ? `<button class="btn sm secondary" data-act="quickAdd" data-arg="${x.id}|${fit.id}">${icon('plus', 16, 'currentColor', 2.4)}بیخە ناو «${esc(fit.name)}»</button>` : ''}</div>`;
            }).join('')}</div>` : ''}`;
      };
      // دوو بەش: چوون و هاتنەوە (یەکێکیان لە هەر کاتێکدا)
      const tab = U.rtabDir || 'go';
      const cnt = (d) => routes.filter((r) => r.dir === d).length;
      const body = section(tab);
      return page(`
        <div class="h1">ڕۆتەکان</div>
        <div class="sm muted" style="margin-top:-8px">چەند سەرنشینێک بخە یەک تەکسی و یەک لە دوای یەک سواریان بکە</div>
        ${routes.length ? '' : `<div class="card info col">
          <b>ڕۆت چییە؟</b>
          <div class="howto"><span>${num(1)}سەرنشینەکان هەڵبژێرە</span><span>${num(2)}ڕیزیان بکە: یەکەم کێ؟</span><span>${num(3)}پاشەکەوت. هەموو ڕۆژێک یەک گەشتە</span></div>
          <span class="xs">سەرنشینەکان دەزانن چەند کەس لە تەکسییەکەن (تەنها ناوی یەکەم و ڕەگەز). نرخ ناگۆڕێت.</span></div>`}
        <button class="bigact go" data-act="newRoute" ${subs.length < 2 ? 'disabled' : ''}>${icon('plus', 28, 'currentColor', 2.6)}<span>ڕۆتی نوێ<small>${subs.length < 2 ? 'لانیکەم دوو سەرنشینت پێویستە' : `${subs.length} سەرنشینت هەیە`}</small></span></button>
        ${subs.length ? ui.seg('rtabDir', [{ v: 'go', l: `چوون (${cnt('go')})` }, { v: 'back', l: `هاتنەوە (${cnt('back')})` }], tab) : ''}
        ${body || (subs.length ? ui.empty('route', tab === 'go' ? 'هیچ گەشتێکی چوون نییە' : 'هیچ گەشتێکی هاتنەوە نییە', '') : ui.empty('users', 'هێشتا سەرنشینت نییە', 'لە «داواکاری» سەرنشینی نوێ وەربگرە', '<button class="btn" data-go="requests">داواکارییەکان</button>'))}`, 'routes');
    },
  });
  function routeCard(r) {
    const subs = r.subIds.map(subById).filter(Boolean);
    const stops = TK.routeStops(r, subs);
    const picks = stops.filter((x) => x.kind === 'pickup');
    const drops = stops.filter((x) => x.kind === 'dropoff');
    const n = subs.reduce((k, x) => k + ppl(x), 0);
    const live = S().trips.find((t) => t.routeId === r.id && t.status === 'active');
    const cap = (sel.me() || {}).seats || 4;
    const free = Math.max(0, cap - n);
    const open = (U.openRoutes || {})[r.id];
    return `<div class="card col rcard ${free ? 'hasfree' : ''}">
      <div class="row tap" data-act="toggleRoute" data-arg="${r.id}"><div class="htime">${fmt.clock(r.time)}</div><div class="grow"><b>${esc(r.name)}</b><div class="xs muted">${n} لە ${cap} کورسی، ${picks.length} وێستگەی سوارکردن</div>${!live && free ? `<div style="margin-top:4px">${ui.badge(`${free} کورسی بەتاڵە`, 'amber')}</div>` : ''}</div>${live ? ui.badge('لە ڕێگەیە', 'ok') : ''}<span class="rchev ${open ? 'open' : ''}">${icon('down', 20, 'var(--muted)', 2.2)}</span></div>
      ${open ? `<div class="stoplist compact">${picks.map((st, i) => `<div class="srow">${num(i + 1)}<div class="grow"><b class="sm">${esc(st.riders)}</b><div class="xs muted">${esc(st.place)}</div></div><span class="sm muted">${fmt.clock(st.time)}</span></div>`).join('')}
        ${drops.map((st) => `<div class="srow">${num(icon('flag', 13, 'currentColor', 2.4), 'dest')}<div class="grow"><b class="sm">${esc(st.place)}</b><div class="xs muted">دابەزاندنی ${esc(st.riders)}</div></div><span class="sm muted">${fmt.clock(st.time)}</span></div>`).join('')}</div>
      ${free ? `<button class="btn sm block" data-act="editRoute" data-arg="${r.id}" ${live ? 'disabled' : ''}>${icon('plus', 16, 'currentColor', 2.4)}زیادکردنی کەس بۆ ئەم ڕۆتە</button>` : ''}` : `<div class="xs muted rnames">${esc(picks.map((p) => p.riders).join('، '))}</div>`}
      <div class="row" style="gap:8px"><button class="btn sm secondary grow" data-act="editRoute" data-arg="${r.id}" ${live ? 'disabled' : ''}>${icon('edit', 16)}دەستکاری</button><button class="btn sm ghost" data-act="delRoute" data-arg="${r.id}" ${live ? 'disabled' : ''} style="color:var(--danger-text)">${icon('x', 16)}سڕینەوە</button></div>
    </div>`;
  }
  acts.rtabDir = (d) => {
    U.rtabDir = d;
    TK.render();
  };
  /** کردنەوە و داخستنی کارتی ڕۆت */
  acts.toggleRoute = (id) => {
    U.openRoutes = U.openRoutes || {};
    U.openRoutes[id] = !U.openRoutes[id];
    TK.render();
  };
  acts.newRoute = () => {
    U.rb = { id: null, step: 1, dir: U.rtabDir || 'go', subIds: [], dropOrder: [], time: '', name: '', pair: true, err: '' };
    TK.go('route-edit');
  };
  acts.editRoute = (id) => {
    const r = myRoutes().find((x) => x.id === id);
    if (!r) return;
    U.rb = { id, step: 1, dir: r.dir, subIds: r.subIds.slice(), dropOrder: (r.dropOrder || []).slice(), time: r.time, name: r.name, pair: false, err: '' };
    TK.go('route-edit');
  };
  /** کەسێکی بێ ڕۆت ڕاستەوخۆ دەخرێتە ناو ڕۆتێک (بە پێی کاتەکەی لە ڕیزەکەدا دادەنرێت) */
  acts.quickAdd = (arg) => {
    const [sid, rid] = arg.split('|');
    const r = myRoutes().find((x) => x.id === rid);
    const x = subById(sid);
    if (!r || !x) return;
    const ids = r.subIds.concat([sid]).sort((a, b) => TK.subTime(subById(a), r.dir).localeCompare(TK.subTime(subById(b), r.dir)));
    const t = TK.subTime(x, r.dir) < r.time ? TK.subTime(x, r.dir) : r.time;
    const drop = (r.dropOrder || []).length ? r.dropOrder.concat([sid]) : [];
    const res = actions.saveRoute({ id: r.id, dir: r.dir, time: t, name: r.name, subIds: ids, dropOrder: drop, pair: false });
    TK.toast(res.err || `${x.riderNames} خرایە ناو «${r.name}»`);
  };
  acts.delRoute = async (id) => {
    const r = myRoutes().find((x) => x.id === id);
    if (!r || !(await TK.ask(`«${r.name}» دەسڕدرێتەوە و هەر سەرنشینێک بە تەنها و بە کاتی خۆی دەچێت. سەرنشینەکان ئاگادار دەکرێنەوە.`, { yes: 'سڕینەوە' }))) return;
    const err = actions.deleteRoute(id);
    TK.toast(err || 'سڕایەوە');
  };

  /* ---------- دروستکردن و دەستکاریی ڕۆت (٣ هەنگاو) ---------- */
  const RB_STEPS = ['کێ لەگەڵ کێ؟', 'ڕیزبەندی', 'پاشەکەوت'];
  /** کاتی سوارکردنی یەکەم: زووترین کاتی سەرنشینە هەڵبژێردراوەکان */
  const earliest = (rb) => rb.subIds.map(subById).filter(Boolean).map((x) => TK.subTime(x, rb.dir)).filter(Boolean).sort()[0] || '07:00';
  /** وێستگەکانی پێشبینی بۆ ڕۆتی ناو دروستکردن */
  const rbStops = (rb) => TK.routeStops({ dir: rb.dir, time: rb.time || earliest(rb), subIds: rb.subIds, dropOrder: rb.dropOrder }, rb.subIds.map(subById).filter(Boolean));
  /** هۆکاری کورت بۆ ئەوەی سەرنشینێک ناگونجێت (یەک دوو وشە) */
  const shortWhy = (w) => (/ڕۆتی|«/.test(w) && /دایە/.test(w) ? 'لە ڕۆتێکی ترە' : /تایبەت/.test(w) ? 'تەکسی تایبەتە' : /ئافرەت/.test(w) ? 'تەنها ئافرەت' : /کات/.test(w) ? 'کاتی جیاوازە' : /کورسی/.test(w) ? 'کورسی پڕە' : /نییە/.test(w) ? 'ئەم گەشتەی نییە' : /منداڵ|خێزان|ناگونجێت/.test(w) ? 'جۆری جیاوازە' : w);
  TK.route('route-edit', {
    guard: () => authed() || (U.rb ? null : 'routes'),
    render() {
      const rb = U.rb;
      const me = sel.me();
      const st = rb.step;
      let body = '';
      if (st === 1) {
        const cands = mySubs().filter((x) => TK.subTime(x, rb.dir)).sort((a, b) => TK.subTime(a, rb.dir).localeCompare(TK.subTime(b, rb.dir)));
        const chosen = rb.subIds.map(subById).filter(Boolean);
        const seats = chosen.reduce((n, x) => n + ppl(x), 0);
        const cap = me.seats || 4;
        body = `${rb.id ? '' : `<div class="field"><label>کام گەشت؟</label>${ui.seg('rbDir', DIRS, rb.dir)}</div>`}
          <div class="card col tight"><div class="row between"><b>کورسییەکان</b><b class="${seats > cap ? 'neg' : 'brand'}">${seats} لە ${cap}</b></div><div class="progress"><i style="width:${Math.min(100, (seats / cap) * 100)}%;${seats > cap ? 'background:var(--danger)' : ''}"></i></div></div>
          <div class="sm muted">ئەوانە هەڵبژێرە کە پێکەوە دەیانبەیت. ئەوانەی ناگونجێن خۆڵەمێشین.</div>
          ${cands.length ? cands.map((x) => {
            const on = rb.subIds.includes(x.id);
            const other = myRoutes().find((r) => r.id !== rb.id && r.dir === rb.dir && r.subIds.includes(x.id));
            const why = on ? null : other ? `لە «${other.name}» دایە` : TK.poolError(chosen.concat([x]), rb.dir, me);
            const leg = TK.subLeg(x, rb.dir);
            return `<button class="card pick ${on ? 'on' : ''} ${why ? 'no' : ''}" data-act="rbPick" data-arg="${x.id}" ${why ? 'aria-disabled="true"' : ''}>
              <span class="check ${on ? 'on' : ''}">${on ? icon('check', 18, '#0B1733', 3) : ''}</span>
              <span class="grow col tight" style="text-align:right">
                <span class="row wrap" style="gap:6px"><b>${esc(x.riderNames)}</b><span class="xs muted">${ppl(x)} کەس</span>${x.hasChild ? ui.badge('منداڵ', 'note') : ''}${x.womanOnly ? ui.badge('تەنها ئافرەت', 'woman') : ''}${x.status === 'paused' ? ui.badge('ڕاگیراوە', 'danger') : ''}</span>
                <span class="row sm" style="gap:6px;align-items:flex-start">${icon('pin', 16, 'var(--brand)')}<span class="grow">${esc(leg.from)} ← ${esc(leg.to.split('، ')[0])}</span></span>
                ${why ? `<span class="whyno">${icon('lock', 14, 'currentColor', 2.4)}${esc(shortWhy(why))}</span>` : ''}
              </span>
              <b class="htime sm">${fmt.clock(TK.subTime(x, rb.dir))}</b>
            </button>`;
          }).join('') : ui.empty('users', 'هیچ سەرنشینێکت نییە بۆ ئەم گەشتە', '')}`;
      } else if (st === 2) {
        const stops = rbStops(rb);
        const picks = stops.filter((x) => x.kind === 'pickup');
        const drops = stops.filter((x) => x.kind === 'dropoff');
        const order = rb.subIds;
        const dOrder = rb.dropOrder.length ? rb.dropOrder : order;
        const dests = [...new Set(order.map((id) => TK.subLeg(subById(id), rb.dir).to))];
        const timeOf = (id) => (picks.find((p) => p.subIds.includes(id)) || {}).time;
        body = `<div class="card col tight"><b>کاتی دەستپێکردن (یەکەم سوارکردن)</b>
            <div class="stepper"><button data-act="rbTime" data-arg="5">+</button><div class="val">${fmt.clock(rb.time || earliest(rb))}</div><button data-act="rbTime" data-arg="-5">−</button></div>
            <span class="xs muted">هەر وێستگەیەک ${TK.CONFIG.stopMin} خولەک دوای پێشوو</span></div>
          <div class="h3">ڕیزی سوارکردن</div>
          <div class="sm muted" style="margin-top:-6px">یەکەم کەس لە سەرەوەیە. بە ▲▼ بیگۆڕە.</div>
          <div class="col" style="gap:8px">${order.map((id, i) => {
            const x = subById(id);
            return `<div class="card row order">${num(i + 1, 'big')}<div class="grow"><b>${esc(x.riderNames)}</b><div class="xs muted">${esc(TK.subLeg(x, rb.dir).from)}، ${fmt.clock(timeOf(id))}</div><div class="xs muted">کاتی خۆی: ${fmt.clock(TK.subTime(x, rb.dir))}</div></div>
              <div class="col tight"><button class="rbtn" data-act="rbMove" data-arg="p|${i}|-1" ${i === 0 ? 'disabled' : ''} aria-label="بەرز">${icon('up', 20, 'currentColor', 2.6)}</button><button class="rbtn" data-act="rbMove" data-arg="p|${i}|1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="نزم">${icon('down', 20, 'currentColor', 2.6)}</button></div></div>`;
          }).join('')}</div>
          ${dests.length > 1 ? `<div class="h3">ڕیزی گەیاندن</div><div class="col" style="gap:8px">${dOrder.map((id, i) => {
            const x = subById(id);
            return `<div class="card row order">${num(i + 1)}<div class="grow"><b class="sm">${esc(x.riderNames)}</b><div class="xs muted">${esc(TK.subLeg(x, rb.dir).to)}</div></div>
              <div class="col tight"><button class="rbtn" data-act="rbMove" data-arg="d|${i}|-1" ${i === 0 ? 'disabled' : ''}>${icon('up', 20, 'currentColor', 2.6)}</button><button class="rbtn" data-act="rbMove" data-arg="d|${i}|1" ${i === dOrder.length - 1 ? 'disabled' : ''}>${icon('down', 20, 'currentColor', 2.6)}</button></div></div>`;
          }).join('')}</div>` : `<div class="card row sm">${icon('flag', 18, 'var(--brand)')}<span class="grow">هەموویان دەچن بۆ <b>${esc(drops[0] ? drops[0].place : '')}</b>، ${fmt.clock(drops[0] ? drops[0].time : '')}</span></div>`}`;
      } else {
        const stops = rbStops(rb);
        const subs = rb.subIds.map(subById);
        const canPair = !rb.id && rb.dir === 'go' && subs.filter((x) => x.back).length >= 2;
        body = `<div class="field"><label for="rb-name">ناوی ڕۆت</label><input class="input" id="rb-name" value="${esc(rb.name || `${rb.dir === 'back' ? 'هاتنەوە' : 'چوون'} ${fmt.n(fmt.clock(rb.time || earliest(rb)))}`)}" maxlength="40"></div>
          <div class="card col"><div class="h3">ڕۆتەکەت</div>${stopList({ stops, status: 'preview' }, false)}</div>
          ${canPair ? `<label class="card row" style="cursor:pointer" data-act="rbPair"><span class="check ${rb.pair ? 'on' : ''}">${rb.pair ? icon('check', 16, '#0B1733', 3) : ''}</span><span class="grow"><b>ڕۆتی هاتنەوەش دروست بکە</b><div class="xs muted">هەمان سەرنشینەکان، بە کاتی هاتنەوەیان. یەکەم کەس کە سوار بوو دواین کەس دادەبەزێت.</div></span></label>` : ''}
          <div class="card note sm">${subs.length} سەرنشین ئاگادار دەکرێنەوە کە لە تەکسییەکی هاوبەشن و کاتی سوارکردنیان چەندە. نرخیان ناگۆڕێت.</div>`;
      }
      const chosenN = rb.subIds.length;
      return page(`
        ${ui.header(rb.id ? 'دەستکاریی ڕۆت' : 'ڕۆتی نوێ', { back: 'routes', sub: `هەنگاوی ${st} لە ٣، ${RB_STEPS[st - 1]}` })}
        <div class="steps">${RB_STEPS.map((_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</div>
        ${body}
        ${rb.err ? `<div class="card danger sm row">${icon('alert', 18)}<span class="grow">${esc(rb.err)}</span></div>` : ''}
        <div class="row stickybar" style="gap:10px">
          ${st > 1 ? `<button class="btn secondary lg" data-act="rbPrev">گەڕانەوە</button>` : ''}
          ${st < 3 ? `<button class="btn lg grow" data-act="rbNext" ${st === 1 && chosenN < 2 ? 'disabled' : ''}>${st === 1 ? (chosenN < 2 ? 'لانیکەم دوو کەس هەڵبژێرە' : `دواتر (${chosenN} سەرنشین)`) : 'دواتر'}</button>` : `<button class="btn lg grow ok" data-act="rbSave">${icon('check', 20, 'currentColor', 2.6)}پاشەکەوتکردن</button>`}
        </div>`);
    },
  });
  acts.rbDir = (d) => {
    U.rb = Object.assign(U.rb, { dir: d, subIds: [], dropOrder: [], time: '', err: '' });
    TK.render();
  };
  acts.rbPick = (id) => {
    const rb = U.rb;
    rb.err = '';
    if (rb.subIds.includes(id)) rb.subIds = rb.subIds.filter((x) => x !== id);
    else {
      const x = subById(id);
      const other = myRoutes().find((r) => r.id !== rb.id && r.dir === rb.dir && r.subIds.includes(id));
      const why = other ? `لە «${other.name}» دایە` : TK.poolError(rb.subIds.map(subById).concat([x]), rb.dir, sel.me());
      if (why) return TK.toast(why);
      rb.subIds.push(id);
    }
    // ڕیزی بنەڕەت: بە پێی کاتی هەر کەسێک
    rb.subIds.sort((a, b) => TK.subTime(subById(a), rb.dir).localeCompare(TK.subTime(subById(b), rb.dir)));
    rb.dropOrder = [];
    rb.time = '';
    TK.render();
  };
  acts.rbNext = () => {
    const rb = U.rb;
    if (rb.step === 1) {
      const err = rb.subIds.length < 2 ? 'لانیکەم دوو سەرنشین هەڵبژێرە' : TK.poolError(rb.subIds.map(subById), rb.dir, sel.me());
      if (err) {
        rb.err = err;
        return TK.render();
      }
      if (!rb.time) rb.time = earliest(rb);
    }
    rb.err = '';
    rb.step += 1;
    TK.render();
    window.scrollTo(0, 0);
  };
  acts.rbPrev = () => {
    const rb = U.rb;
    const el = document.getElementById('rb-name');
    if (el) rb.name = el.value.trim();
    rb.err = '';
    rb.step = Math.max(1, rb.step - 1);
    TK.render();
    window.scrollTo(0, 0);
  };
  acts.rbTime = (d) => {
    const rb = U.rb;
    const t = fmt.addMin(rb.time || earliest(rb), +d);
    if (t < '04:00' || t > '23:30') return;
    rb.time = t;
    TK.render();
  };
  acts.rbMove = (arg) => {
    const [which, i, d] = arg.split('|');
    const rb = U.rb;
    const list = which === 'p' ? rb.subIds : rb.dropOrder.length ? rb.dropOrder : (rb.dropOrder = rb.subIds.slice());
    const a = +i;
    const b = a + +d;
    if (b < 0 || b >= list.length) return;
    [list[a], list[b]] = [list[b], list[a]];
    TK.render();
  };
  acts.rbPair = () => {
    U.rb.pair = !U.rb.pair;
    TK.render();
  };
  acts.rbSave = () => {
    const rb = U.rb;
    const el = document.getElementById('rb-name');
    rb.name = el ? el.value.trim() : rb.name;
    const res = actions.saveRoute({ id: rb.id, dir: rb.dir, time: rb.time || earliest(rb), name: rb.name, subIds: rb.subIds, dropOrder: rb.dropOrder, pair: rb.pair });
    if (res.err) {
      rb.err = res.err;
      return TK.render();
    }
    U.rb = null;
    TK.toast(res.warn || 'پاشەکەوت کرا. سەرنشینەکان ئاگادار کرانەوە');
    TK.go('routes', true);
  };

  /* =========================================================
   * سەرنشینەکانم
   * ======================================================= */
  /* =========================================================
   * گەشتە کۆنەکانم (مێژووی شۆفێر)
   * ======================================================= */
  const LOG_ST = { done: ['گەیاندرا', 'ok'], absent: ['نەهات', 'danger'], skipped: ['نایەم', 'note'], noshow: ['ڕاپۆرتی نەهاتنی شۆفێر', 'danger'], missed: ['نەکرا', 'danger'] };
  TK.route('history', {
    guard: authed,
    render() {
      const me = meId();
      const list = (S().driverLog || []).filter((e) => e.driverId === me || e.originalDriverId === me);
      let lastDay = '';
      return page(`
        ${ui.header('گەشتە کۆنەکانم', { back: 'more', sub: `${list.length} گەشت` })}
        ${list.length ? list.map((e) => {
          const sep = e.day !== lastDay ? `<div class="sm bold muted" style="margin-top:6px">${fmt.day(e.day)}</div>` : '';
          lastDay = e.day;
          const gone = e.driverId !== me;
          const done = e.riders.filter((r) => r.status === 'done').length;
          return `${sep}<div class="card col" style="${gone ? 'opacity:.65' : ''}">
            <div class="row"><div class="htime sm ${done ? 'ok' : ''}">${fmt.clock(e.time)}</div><div class="grow"><b>${esc(e.title)}</b><div class="xs muted">${esc((e.from || '').split('، ')[0])} ← ${esc((e.to || '').split('، ')[0])}${e.pooled ? '، هاوبەش' : ''}${e.auto ? '، خۆکار داخرا' : ''}</div></div>${gone ? ui.badge('دراوە بە جێگرەوە', 'info') : ''}</div>
            <div class="col tight">${e.riders.map((r) => `<div class="row between sm"><span>${esc(r.names)}</span>${ui.badge(LOG_ST[r.status][0], LOG_ST[r.status][1])}</div>`).join('')}</div>
          </div>`;
        }).join('') : ui.empty('clock', 'هێشتا هیچ گەشتێکت تەواو نەکردووە', 'دوای هەر گەشتێک لێرە تۆمار دەکرێت')}`, 'more');
    },
  });
  // لینکی کۆن
  TK.route('trips', { guard: () => 'today', render: () => '' });
  TK.route('riders', {
    guard: authed,
    render() {
      const list = sel.myClients();
      const groups = [['بەیانی', (c) => (c.go || c.back) < '12:00'], ['نیوەڕۆ و ئێوارە', (c) => (c.go || c.back) >= '12:00']];
      const total = list.filter((c) => !c.paused).reduce((n, c) => n + (c.price || 0), 0);
      const card = (c) => {
        const phone = sel.peerPhone(c.peer) || null;
        const inRoutes = myRoutes().filter((r) => r.subIds.includes(c.id));
        return `<div class="card col" style="${c.paused ? 'opacity:.6' : ''}">
          <div class="row">${ui.avatar(c.name.slice(0, 1), c.child ? 'amber' : 'navy', 46)}
            <div class="grow"><div class="row wrap" style="gap:6px"><b>${esc(c.name)}</b>${c.child ? ui.badge('منداڵ', 'note') : ''}${c.paused ? ui.badge('ڕاگیراوە', 'danger') : ''}</div><div class="xs muted">${esc(c.role || '')}</div></div>
            <b class="brand sm">${fmt.group(c.price || 0)}</b></div>
          ${ui.requestSummary(c)}
          ${TK.subNote(c.id) ? `<div class="sm quote">${icon('doc', 14, 'var(--brand)')} ${esc(TK.subNote(c.id))}</div>` : ''}
          ${inRoutes.length ? `<div class="row wrap" style="gap:6px">${inRoutes.map((r) => ui.badge(r.name, 'info')).join('')}</div>` : ''}
          <div class="row" style="gap:8px">
            <button class="btn sm secondary grow" data-go="chat/${encodeURIComponent(c.peer)}">${icon('chat', 16)}نامە</button>
            ${phone ? `<a class="btn sm secondary grow" href="tel:0${esc(phone)}">${icon('phone', 16)}<span class="latin">${fmt.phone(phone)}</span></a>` : `<span class="btn sm ghost grow" style="pointer-events:none">${icon('lock', 16)}ژمارە شاراوەیە</span>`}
          </div>
        </div>`;
      };
      return page(`
        ${ui.header('سەرنشینەکانم', { back: 'more', sub: `${list.length} سەرنشین، ${fmt.money(total)} مانگانە` })}
        ${list.length ? groups.map(([label, fn]) => {
          const g = list.filter(fn);
          return g.length ? `<div class="section-title"><div class="h3">${label}</div><span class="xs muted">${g.length}</span></div>${g.map(card).join('')}` : '';
        }).join('') : ui.empty('users', 'هێشتا هیچ سەرنشینێکت نییە', 'لە بەشی داواکاری سەرنشینی نوێ وەربگرە', '<button class="btn" data-go="requests">داواکارییەکان</button>')}`, 'more');
    },
  });

  /* =========================================================
   * داواکارییەکان: لیست و پەڕەی «وەک تەلەفۆن»
   * ======================================================= */
  /** ئایا داواکارییەک لەگەڵ یەکێک لە ڕۆتەکانم دەگونجێت؟ */
  function routeFit(r) {
    const me = sel.me();
    const fake = { id: '_new', owner: r.owner, memberIds: r.memberIds, riderNames: r.riderNames, rideType: r.rideType, womanOnly: r.womanOnly, riders: r.riders, go: r.go, back: r.back, from: r.from, to: r.to, km: r.km, hasChild: r.hasChild };
    for (const rt of myRoutes()) {
      if (!TK.subTime(fake, rt.dir)) continue;
      const subs = rt.subIds.map(subById).filter(Boolean);
      if (Math.abs(TK.toMin(TK.subTime(fake, rt.dir)) - TK.toMin(rt.time)) > TK.CONFIG.poolWindowMin) continue;
      if (!TK.poolError(subs.concat([fake]), rt.dir, me)) {
        const left = (me.seats || 4) - subs.reduce((n, x) => n + ppl(x), 0) - ppl(fake);
        return { route: rt, left };
      }
    }
    return null;
  }
  const fitLine = (r) => {
    const f = routeFit(r);
    return f ? `<div class="fit">${icon('route', 16, 'currentColor', 2.2)}<span>دەگونجێت لەگەڵ «${esc(f.route.name)}»، ${f.left} کورسی دەمێنێتەوە</span></div>` : '';
  };
  TK.route('requests', {
    guard: authed,
    render() {
      const tab = U.rtab || 'new';
      const open = sel.openForMe();
      const mine = sel.myOffers().sort((a, b) => b.o.at - a.o.at);
      const me = sel.me();
      return page(`
        <div class="h1">داواکارییەکان</div>
        ${ui.seg('rtab', [{ v: 'new', l: `نوێ (${open.length})` }, { v: 'mine', l: `نرخەکانم (${mine.length})` }], tab)}
        ${me.status !== 'active' ? verifyBar(me) : !me.online && tab === 'new' ? `<div class="card note row">${icon('alert', 20, 'var(--brand)')}<span class="grow">ئۆفلاینیت. بۆ وەرگرتنی داواکاری «ئامادەی کارم» چالاک بکە</span>${ui.toggle('online', false)}</div>` : ''}
        ${me.status !== 'active' ? '' : tab === 'new'
          ? open.length ? open.map(reqCard).join('') : ui.empty('megaphone', 'هیچ داواکارییەکی نوێ نییە', 'کاتێک سەرنشینێک داوا بکات دەنگێکت بۆ دێت و لێرە دەردەکەوێت')
          : mine.length ? mine.map(({ r, o }) => myOfferCard(r, o)).join('') : ui.empty('tag', 'هێشتا هیچ نرخێکت نەناردووە', '')}`, 'requests');
    },
  });
  acts.rtab = (v) => {
    U.rtab = v;
    TK.render();
  };
  const reqTimes = (r) => [r.go ? `چوون ${fmt.clock(r.go)}` : '', r.back ? `هاتنەوە ${fmt.clock(r.back)}` : ''].filter(Boolean).join('، ');
  function reqCard(r) {
    const me = sel.me();
    const direct = r.target === me.id;
    return `<button class="card col tap req" data-go="req/${r.id}" style="text-align:right">
      <div class="row">${ui.avatar(r.ownerName.slice(0, 1), r.hasChild ? 'amber' : 'navy', 44)}
        <div class="grow"><b>${esc(r.ownerName)}</b><div class="xs muted">${esc(r.riderNames)}، ${fmt.ago(r.createdAt)}</div></div>
        ${direct ? ui.badge('ڕاستەوخۆ بۆ تۆ', 'amber') : ''}</div>
      <div class="req-route"><span>${esc(r.from.split('، ')[0])}</span>${icon('forward', 18, 'var(--brand)', 2.4)}<span>${esc(r.to.split('، ')[0])}</span></div>
      <div class="row wrap sm" style="gap:10px">${icon('clock', 16, 'var(--muted)')}<span>${reqTimes(r)}</span>${icon('users', 16, 'var(--muted)')}<span>${r.riders} کەس</span>${r.hasChild ? ui.badge('منداڵ', 'note') : ''}${r.womanOnly ? ui.badge('تەنها ئافرەت', 'woman') : ''}${r.rideType === 'private' ? ui.badge('تایبەت') : ''}</div>
      ${fitLine(r)}
      <div class="row between"><b class="price brand">${fmt.money(r.price)}</b><span class="btn sm">بینین</span></div>
    </button>`;
  }
  function myOfferCard(r, o) {
    const st = { pending: ['چاوەڕێی هەڵبژاردن', 'note'], chosen: ['تۆ هەڵبژێردرایت', 'ok'], lost: ['کەسێکی تر هەڵبژێردرا', 'danger'] }[r.status === 'closed' && o.status === 'pending' ? 'lost' : o.status];
    return `<div class="card col">
      <div class="row"><b class="grow">${esc(r.ownerName)}، ${esc(r.to.split('، ')[0])}</b>${ui.badge(st[0], st[1])}</div>
      <div class="row between sm"><span class="muted">${reqTimes(r)}، ${fmt.days(r.days)}</span><b class="brand">${fmt.money(o.price)}</b></div>
      ${o.status === 'pending' && r.status === 'open' ? `<div class="row between"><span class="xs muted">${r.offers.length} شۆفێر نرخیان ناردووە</span><button class="btn sm ghost" data-act="withdraw" data-arg="${r.id}">کشانەوە</button></div>` : ''}
      ${o.status === 'chosen' ? `<button class="btn sm secondary" data-go="routes">زیادکردن بۆ ڕۆتێک</button>` : ''}
    </div>`;
  }
  TK.route('req/:id', {
    guard: authed,
    render({ id }) {
      const r = sel.request(id);
      const me = sel.me();
      if (!r) return page(ui.header('داواکاری', { back: 'requests' }) + ui.empty('megaphone', 'نەدۆزرایەوە', ''));
      const mineO = r.offers.find((o) => o.driverId === me.id);
      if (!U.offer || U.offer.id !== id) U.offer = { id, price: r.price };
      const b = TK.offerBounds(r.price);
      const o = U.offer;
      const net = Math.round(o.price * (1 - TK.CONFIG.commission));
      const can = r.status === 'open' && !mineO && me.status === 'active';
      return page(`
        <div class="callscreen col">
          <div class="row"><button class="icon-btn" data-back="requests" aria-label="داخستن">${icon('x', 22)}</button><span class="grow"></span>${r.target === me.id ? ui.badge('ڕاستەوخۆ بۆ تۆ', 'amber') : r.offers.length ? ui.badge(`${r.offers.length} شۆفێر نرخیان ناردووە`, 'info') : ''}</div>
          <div class="col center" style="align-items:center;gap:6px">${ui.avatar(r.ownerName.slice(0, 1), r.hasChild ? 'amber' : 'navy', 86)}<div class="h1">${esc(r.ownerName)}</div><div class="sm muted">داواکاری مانگانە، ${esc(r.riderNames)}</div></div>
          <div class="card col">
            <div class="req-route big"><span>${esc(r.from)}</span>${icon('forward', 22, 'var(--brand)', 2.4)}<span>${esc(r.to)}</span></div>
            <div class="row sm">${icon('clock', 18, 'var(--muted)')}<b>${reqTimes(r)}</b></div>
            <div class="row sm">${icon('calendar', 18, 'var(--muted)')}<span>${fmt.days(r.days)}${r.startDate ? `، لە ${fmt.day(r.startDate)}ەوە` : ''}</span></div>
            <div class="row sm">${icon('users', 18, 'var(--muted)')}<span>${r.riders} کەس</span></div>
            <div class="row sm">${icon('route', 18, 'var(--muted)')}<span>دووری نزیکەی ${r.km} کم${r.go && r.back ? `، ڕۆژانە ${Math.round(r.km * 2)} کم (چوون و هاتنەوە)` : ''}</span></div>
            ${ui.requestTags(r)}
            ${r.note ? `<div class="sm quote">«${esc(r.note)}»</div>` : ''}
            ${fitLine(r)}
          </div>
          ${mineO ? `<div class="card ok col tight center"><b>نرخەکەت نێردرا: ${fmt.money(mineO.price)}</b><span class="sm">کاتێک هەڵتبژێرێت ئاگادار دەکرێیتەوە</span></div>`
            : r.status !== 'open' ? `<div class="card note center">ئەم داواکارییە داخراوە</div>`
            : `<div class="card col center" style="gap:6px">
              <div class="sm muted">نرخی مانگانە</div>
              <div class="stepper"><button data-act="offStep" data-arg="5000" ${o.price >= b.max ? 'disabled' : ''}>+</button><div class="val brand">${fmt.money(o.price)}</div><button data-act="offStep" data-arg="-5000" ${o.price <= b.min ? 'disabled' : ''}>−</button></div>
              <div class="xs muted">${o.price === r.price ? 'نرخی پێشنیارکراو بە پێی دووری و ڕۆژەکان' : `پێشنیارکراو بە پێی دووری: ${fmt.money(r.price)}`}، بۆ تۆ پاش کۆمیسیۆن <b class="ok">${fmt.money(net)}</b></div>
            </div>`}
          <button class="btn ghost block" data-go="chat/${encodeURIComponent(r.owner)}">${icon('chat', 18)}پرسیار لە سەرنشین</button>
          ${can ? `<div class="callfoot">${me.online ? '' : `<div class="row center sm muted" style="justify-content:center;gap:8px">بۆ قبووڵکردن «ئامادەی کارم» چالاک بکە ${ui.toggle('online', false)}</div>`}
            <div class="callbar"><button class="callbtn no" data-act="decline" data-arg="${r.id}">${icon('x', 30, '#fff', 2.6)}<span>نا</span></button><button class="callbtn yes" data-act="sendOffer" data-arg="${r.id}" ${me.online ? '' : 'disabled'}>${icon('check', 34, '#fff', 3)}<span>قبووڵکردن</span></button></div></div>` : ''}
        </div>`);
    },
  });
  acts.offStep = (d) => {
    const r = sel.request(U.offer.id);
    const b = TK.offerBounds(r.price);
    U.offer.price = Math.min(b.max, Math.max(b.min, U.offer.price + +d));
    TK.render();
  };
  acts.sendOffer = (id) => {
    actions.makeOffer(id, U.offer.price, '');
    U.rtab = 'mine';
    TK.toast('نرخەکەت نێردرا. کاتێک هەڵتبژێرێت ئاگادار دەکرێیتەوە');
    TK.go('requests', true);
  };
  acts.decline = (id) => {
    actions.declineRequest(id);
    TK.toast('ئەم داواکارییە لابرا');
    if (TK.app.current && TK.app.current.path.startsWith('req/')) TK.go('requests', true);
  };
  acts.withdraw = (id) => {
    actions.withdrawOffer(id);
    TK.toast('نرخەکەت کشایەوە');
  };

  /* ---------- نامەکان ---------- */
  TK.route('inbox', {
    guard: authed,
    render() {
      const s = S();
      const threads = sel.threadsD();
      return page(`
        ${ui.header('نامەکان', { back: 'more', right: sel.unreadMsgsD() ? ui.badge(`${sel.unreadMsgsD()} نوێ`, 'amber') : '' })}
        ${ui.threads(threads, true, (t) => {
          const name = sel.peerName(t.peer);
          const sub = s.subscriptions.filter((x) => x.driverId === s.driver.meId && (x.owner || 'me') === t.peer).map((x) => x.riderNames).join('، ');
          return { name, sub: sub || 'سەرنشین', link: `chat/${encodeURIComponent(t.peer)}`, avatar: ui.avatar(name.slice(0, 1), 'navy', 48) };
        })}`, 'more');
    },
  });
  function threadHtml(peer) {
    return ui.chat(S().messages.filter((m) => m.driverId === meId() && m.peer === peer), true);
  }
  TK.route('chat/:peer', {
    guard: authed,
    render({ peer }) {
      const name = sel.peerName(peer);
      const phone = sel.peerPhone(peer) || null;
      const QUICK = ['٥ خولەکی تر دەگەم', 'لە بەردەم دەرگام', 'گەیشتین', 'باشە، سوپاس'];
      return `<div class="screen" style="padding-bottom:150px">
        ${ui.header(name, { back: 'inbox', sub: 'سەرنشین', right: phone ? `<a class="icon-btn" href="tel:0${esc(phone)}" aria-label="پەیوەندی">${icon('phone', 20)}</a>` : '' })}
        <div class="phone-line">${icon(phone ? 'phone' : 'lock', 16)}<span class="grow">${phone ? 'ژمارەی سەرنشین' : 'سەرنشین ژمارەکەی شاردووەتەوە. لە ڕێگەی نامەوە پەیوەندی بکە.'}</span>${phone ? `<a class="latin bold" dir="ltr" href="tel:0${esc(phone)}">${fmt.phone(phone)}</a>` : ''}</div>
        <div id="thread">${threadHtml(peer)}</div>
      </div>
      <div class="composer">
        <div class="quick">${QUICK.map((q) => `<button data-act="quickChat" data-arg="${q}">${q}</button>`).join('')}</div>
        <form class="row" data-submit="sendMsg" style="gap:8px">
          <input class="input" id="msg" name="text" placeholder="نامە بنووسە..." autocomplete="off" enterkeyhint="send" style="min-height:46px">
          <button class="btn" style="min-height:46px;padding:0 14px" aria-label="ناردن">${icon('send', 20)}</button>
        </form>
      </div>`;
    },
    partial({ peer }) {
      const el = document.getElementById('thread');
      if (el) {
        el.innerHTML = threadHtml(peer);
        TK.localizeDigits(el);
        window.scrollTo(0, document.body.scrollHeight);
      }
      actions.markThreadRead(meId(), peer, true);
    },
    after({ peer }) {
      window.scrollTo(0, document.body.scrollHeight);
      setTimeout(() => actions.markThreadRead(meId(), peer, true), 300);
    },
  });
  function sendText(text) {
    const t = text.trim();
    if (!t) return;
    actions.sendMessage(meId(), TK.app.current.params.peer, t, true);
    const el = document.getElementById('msg');
    if (el) el.value = '';
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  }
  acts.sendMsg = (f) => sendText(f.text || '');
  acts.quickChat = (q) => sendText(q);

  /* ---------- هەڵسەنگاندنی سەرنشینەکان ---------- */
  TK.route('rate/:id', {
    guard: authed,
    render({ id }) {
      const rv = sel.run(id);
      if (!rv) return page(ui.header('هەڵسەنگاندن', { back: 'today' }));
      const riders = [];
      rv.stops.filter((x) => x.kind === 'pickup' && !x.absent).forEach((x) => (x.parts || [{ riders: x.riders }]).forEach((p) => riders.push(p.riders)));
      U.rr = U.rr || {};
      return page(`
        ${ui.header('گەشتەکە تەواو بوو', { back: 'today', sub: rv.title })}
        <div class="card ok row">${icon('check', 24, 'currentColor', 2.6)}<b class="grow">دەستخۆش! هەموو سەرنشینەکان گەیاندران</b></div>
        ${riders.map((name, i) => {
          const v = U.rr[i] || 5;
          return `<div class="card col"><div class="row">${ui.avatar(name.slice(0, 1), 'navy', 40)}<b class="grow">${esc(name)}</b></div>
            <div class="row" style="gap:6px;justify-content:center">${[1, 2, 3, 4, 5].map((n) => `<button data-act="rrStar" data-arg="${i}|${n}" aria-label="${n}">${icon('star', 34, 'var(--amber)', 1.5, n <= v ? 'var(--amber)' : 'none')}</button>`).join('')}</div></div>`;
        }).join('')}
        <div class="sm muted">هەڵسەنگاندنەکان نهێنین و تەنها تیمی تەکسیەکەم دەیانبینێت.</div>
        <button class="btn block lg" data-act="sendRR" data-arg="${rv.id}">ناردن</button>
        <button class="btn ghost block" data-act="sendRR" data-arg="${rv.id}">تێپەڕاندن (بێ هەڵسەنگاندن)</button>`);
    },
  });
  acts.rrStar = (arg) => {
    const [i, n] = arg.split('|');
    U.rr = U.rr || {};
    U.rr[i] = +n;
    TK.render();
  };
  acts.sendRR = (id) => {
    actions.rateRiders(id);
    U.rr = {};
    TK.go('today', true);
  };

  /* =========================================================
   * داهات
   * ======================================================= */
  const LEDGER_LABEL = { penalty: ['سزا', 'danger'], bonus: ['پاداشت', 'ok'], swap: ['جێگرەوە', 'info'], adjust: ['ڕێکخستن', ''] };
  TK.route('earnings', {
    guard: authed,
    render() {
      const s = S();
      const c = TK.CONFIG;
      const po = TK.payout(s, meId());
      const now = new Date();
      const payDay = `١ی ${fmt.MONTHS[(now.getMonth() + 1) % 12]}`;
      const history = s.payouts.filter((p) => p.driverId === meId());
      return page(`
        ${ui.header('داهات', { back: 'more' })}
        <div class="card navy big col">
          <div style="opacity:.8">داهاتی ئەم مانگە (پاش کۆمیسیۆن)</div>
          <div class="h1" style="font-size:2rem;color:var(--amber)">${fmt.money(po.net)}</div>
          <div class="xs" style="opacity:.8">ڕۆژی موچە: ${payDay}، ${po.subs} سەرنشین</div>
        </div>
        <div class="card col tight">
          ${po.lines.map((l) => `<div class="row between sm"><span class="grow" style="min-width:0"><span class="ellipsis" style="display:block">${esc(l.riderNames)}</span>${l.note ? `<span class="xs muted">${esc(l.note)}، نرخی تەواو ${fmt.group(l.full)}</span>` : ''}</span><b>${fmt.group(l.amount)}</b></div>`).join('')}
          ${po.lines.length ? '<div class="hr"></div>' : ''}
          <div class="row between"><span class="muted">کۆی بەژدارییەکان</span><b>${fmt.money(po.gross)}</b></div>
          <div class="row between"><span class="muted">کۆمیسیۆنی تەکسیەکەم (${Math.round(c.commission * 100)}٪)</span><b class="neg">${fmt.money(po.commission)}</b></div>
          ${po.entries.map((x) => `<div class="row between"><span class="muted">${(LEDGER_LABEL[x.type] || ['', ''])[0]}، ${esc(x.note)}</span><b class="${x.amount < 0 ? 'neg' : 'ok'}">${fmt.money(Math.abs(x.amount))}</b></div>`).join('')}
          <div class="row between"><span class="muted">پاداشتی مانگانە</span><b class="${po.bonus ? 'ok' : 'muted'}">${po.bonus ? fmt.money(po.bonus) : 'هێشتا نا'}</b></div>
          <div class="hr"></div>
          <div class="xs muted"><span class="neg">سوور</span> = لێی دەبڕدرێت، <span class="ok">سەوز</span> = بۆت زیاد دەکرێت</div>
          <div class="row between"><b>بۆ تۆ</b><b class="brand">${fmt.money(po.net)}</b></div>
        </div>
        <div class="xs muted">بڕی هەر سەرنشینێک بە پێی ئەو ڕۆژانەیە کە لەم مانگەدا بەژدارییەکەی چالاک بووە (ڕۆژە ڕاگیراوەکان حیساب ناکرێن).</div>
        <div class="card row">${icon('wallet', 22, 'var(--brand)')}<div class="grow"><b>شێوازی وەرگرتنی موچە</b><div class="sm">${esc(TK.payName(sel.me().payMethod))}${sel.me().payAccount ? ` <span class="latin">${esc(sel.me().payAccount)}</span>` : ''}</div></div><button class="btn sm secondary" data-act="payForm">گۆڕین</button></div>
        <div class="card col">
          <div class="row">${icon('trophy', 22, 'var(--amber)')}<b class="grow">پاداشتی مانگانە</b><b class="brand">${fmt.group(c.bonusAmount)}</b></div>
          <div class="progress"><i style="width:${Math.min(100, (po.bonusDays / c.bonusDays) * 100)}%"></i></div>
          <div class="xs muted">${po.bonusDays} لە ${c.bonusDays} ڕۆژی کار لەم مانگەدا</div>
        </div>
        <div class="card info sm col tight"><b>یاساکان</b>
          <span>نەهاتن بێ جێگرەوە: ${fmt.money(c.noShowPenalty)} سزا</span>
          <span>جێگرەوە: پارەکە دوای تەواوبوونی گەشت دەگوازرێتەوە</span></div>
        <div class="h3">موچە وەرگیراوەکان</div>
        ${history.length ? `<div class="list">${history.map((h) => `<div class="item"><div class="ico-box ok">${icon('wallet', 18, 'var(--ok-text)')}</div><b class="grow">${fmt.date(h.at)}</b><b>${fmt.money(h.amount)}</b></div>`).join('')}</div>` : '<div class="sm muted">هێشتا هیچ موچەیەک نەدراوە</div>'}`, 'more');
    },
  });

  /** گۆڕینی شێوازی وەرگرتنی موچە */
  acts.payForm = () => {
    const d = sel.me();
    U.pay = { method: d.payMethod || (TK.payMethods().find((m) => m.on !== false) || {}).id, err: '' };
    TK.sheet(() => {
      const m = TK.payMethod(U.pay.method) || {};
      return `<div class="h2">شێوازی وەرگرتنی موچە</div>
        <div class="list">${TK.payMethods().filter((x) => x.on !== false || x.id === d.payMethod).map((x) => `<button type="button" class="item tap" data-act="payPick" data-arg="${esc(x.id)}" style="text-align:right"><span class="radio ${U.pay.method === x.id ? 'on' : ''}"></span><b class="grow">${esc(x.name)}</b></button>`).join('')}</div>
        ${m.account !== false ? `<div class="field"><label for="pay-acc">ژمارەی حیساب یان ژمارەی مۆبایلی ${esc(m.name || '')}</label><input class="input ltr latin" id="pay-acc" inputmode="numeric" value="${esc(U.pay.method === d.payMethod ? d.payAccount || '' : '')}"></div>` : ''}
        <div class="card note sm">بۆ پاراستنی پارەکەت، تیمی تەکسیەکەم ئاگادار دەکرێتەوە و پێش ناردنی موچە لەگەڵت پشتڕاستی دەکاتەوە.</div>
        ${U.pay.err ? `<div class="err">${esc(U.pay.err)}</div>` : ''}
        <button class="btn block" data-act="paySave">پاشەکەوت</button>
        <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`;
    });
  };
  acts.payPick = (id) => {
    U.pay.method = id;
    U.pay.err = '';
    TK.sheet.refresh();
  };
  acts.paySave = () => {
    const el = document.getElementById('pay-acc');
    const err = actions.setPayout(U.pay.method, el ? el.value : '');
    if (err) {
      U.pay.err = err;
      return TK.sheet.refresh();
    }
    TK.closeSheet();
    TK.toast('پاشەکەوت کرا');
  };

  /* =========================================================
   * هەواڵ و ئاگادارکردنەوە
   * ======================================================= */
  TK.route('news', {
    guard: authed,
    render() {
      const list = sel.newsFor('driver');
      return page(`
        ${ui.header('هەواڵ', { back: 'more' })}
        ${list.length ? list.map((n) => `<div class="card news-card tap" data-go="news/${n.id}">${ui.newsThumb(n, 72)}<div class="grow col tight"><span>${ui.badge(n.tag, 'note')}</span><b style="font-size:.95rem">${esc(n.title)}</b><span class="xs muted">${esc(n.sub)}</span></div></div>`).join('') : ui.empty('news', 'هیچ هەواڵێک نییە', '')}`, 'more');
    },
  });
  TK.route('news/:id', {
    guard: authed,
    render({ id }) {
      const n = S().news.find((x) => x.id === id);
      if (!n) return page(ui.header('هەواڵ', { back: 'news' }));
      const src = n.image ? TK.img(n.image) : '';
      return page(`
        ${ui.header(n.tag, { back: 'news' })}
        ${src ? `<div class="news-photo"><img src="${src}" alt=""></div><div class="h2">${esc(n.title)}</div>` : `<div class="news-hero th-${n.theme}">
          <div style="position:absolute;left:14px;top:14px;opacity:.9">${n.big ? `<span class="big" style="font-size:3.6rem;font-weight:700;display:block;text-align:center">${ui.bigHtml(n.big)}</span>` : icon(n.icon, 84, 'currentColor', 1.3)}</div>
          <div class="h2">${esc(n.title)}</div><div class="sm" style="opacity:.9">${esc(n.sub)}</div>
        </div>`}
        <div style="font-size:1.02rem;line-height:1.9">${esc(n.body)}</div>`, 'more');
    },
  });
  TK.route('notices', {
    guard: authed,
    render() {
      if (U.readAt == null) U.readAt = (sel.me() || {}).readNoticesAt || 0;
      return page(`${ui.header('ئاگادارکردنەوەکان', { back: 'today' })}${ui.noticeList(sel.myDNotices(), U.readAt)}`, 'more');
    },
    after() {
      if (sel.dUnread()) setTimeout(() => actions.markDNoticesRead(), 400);
    },
  });

  /* =========================================================
   * زیاتر، پرۆفایل، ڕێکخستنەکان
   * ======================================================= */
  const item = (ic, label, go, extra = '', act) => `<button class="item tap" ${act ? `data-act="${act}"` : `data-go="${go}"`} style="text-align:right;width:100%"><div class="ico-box navy">${icon(ic, 22, 'var(--text)')}</div><b class="grow">${label}</b>${extra}${icon('forward', 18, 'var(--muted)')}</button>`;
  /** ڕێژەی قبووڵکردن: ئەو داواکارییانەی نرخی بۆ ناردوون بەراورد بە ئەوانەی ڕەتی کردوونەتەوە */
  function acceptRate(id) {
    const rs = S().requests;
    const yes = rs.filter((r) => r.offers.some((o) => o.driverId === id)).length;
    const no = rs.filter((r) => r.declined.includes(id)).length;
    return yes + no ? Math.round((yes / (yes + no)) * 100) : null;
  }
  /** کارتی پرۆفایلی شۆفێر لە «زیاتر» */
  function profileCard(me) {
    const src = me.photo ? TK.img(me.photo) : '';
    const plate = String(me.plate || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const ar = acceptRate(me.id);
    return `<button class="card pcard tap" data-go="profile">
      <div class="pc-top">
        <div class="pc-av">${src ? `<img src="${src}" alt="">` : esc((me.name || '?').slice(0, 1))}${me.status === 'active' ? `<span class="pc-ok">${icon('check', 14, '#fff', 3)}</span>` : ''}</div>
        <div class="grow"><div class="pc-name">${esc(me.name)}</div><div class="pc-car">${esc([`${me.carMake || ''} ${me.carModel || ''}`.trim() || me.car, me.carColor].filter(Boolean).join(' · '))}</div>
          <span class="mplate" data-raw><span class="mp-s">IRQ<br>KR</span><span class="mp-n latin">${esc(plate)}</span></span></div>
        ${icon('forward', 22, 'var(--muted)')}
      </div>
      <div class="pc-stats">
        <div><b>${me.reviews ? `${icon('star', 16, 'var(--amber)', 1.5, 'var(--amber)')} ${me.rating}` : '-'}</b><span>هەڵسەنگاندن</span></div>
        <div><b>${me.trips || 0}</b><span>گەشت</span></div>
        <div><b>${ar == null ? '-' : `٪${ar}`}</b><span>قبووڵکردن</span></div>
      </div>
    </button>`;
  }
  TK.route('more', {
    guard: authed,
    render() {
      const me = sel.me();
      const msgs = sel.unreadMsgsD();
      const nts = sel.dUnread();
      return page(`
        <div class="h1">زیاتر</div>
        ${profileCard(me)}
        ${me.status === 'active' ? onlineCard(me) : verifyBar(me)}
        <div class="list">
          ${item('chat', 'نامەکان', 'inbox', msgs ? ui.badge(msgs, 'amber') : '')}
          ${item('bell', 'ئاگادارکردنەوەکان', 'notices', nts ? ui.badge(nts, 'amber') : '')}
          ${item('users', 'سەرنشینەکانم', 'riders', `<span class="sm muted">${sel.myClients().length}</span>`)}
          ${item('clock', 'گەشتە کۆنەکانم', 'history')}
          ${item('wallet', 'داهات', 'earnings', `<span class="sm brand bold">${fmt.money(TK.payout(S(), meId()).net)}</span>`)}
          ${item('news', 'هەواڵ', 'news')}
        </div>
        <div class="list">
          ${item('doc', 'پرۆفایل و بەڵگەنامەکان', 'profile')}
          ${item('settings', 'ڕێکخستنەکان', 'settings')}
          ${item('help', 'فێرکاری ئەپ', '', '', 'showIntro')}
          ${item('doc', 'مەرج و ڕێساکان', '', '', 'showTerms')}
        </div>
        <button class="btn danger block" data-act="logout">${icon('logout', 18)}چوونەدەرەوە</button>
        <div class="center xs muted">تەکسیەکەم شۆفێر</div>`, 'more');
    },
  });
  TK.route('profile', {
    guard: authed,
    render() {
      const me = sel.me();
      return page(`
        ${ui.header('پرۆفایل', { back: 'more' })}
        <div class="card big col" style="align-items:center;text-align:center;gap:4px">
          ${ui.dAvatar(me, 84)}
          <div class="row" style="gap:6px"><div class="h2">${esc(me.name)}</div>${me.status === 'active' ? icon('shield', 18, 'var(--success)', 2.2) : ''}</div>
          <div class="sm muted">${esc(me.car)}${me.carYear ? `، ${me.carYear}` : ''}</div><div style="margin:4px 0">${ui.plate(me.plate, me.plateType)}</div>
          <div class="latin sm" dir="ltr">${fmt.phone(me.phone)}</div>
          <div class="row wrap" style="gap:6px;justify-content:center;margin-top:6px">${me.status === 'active' ? ui.badge('پشتڕاستکراوە', 'ok') : me.status === 'suspended' ? ui.badge('ڕاگیراوە', 'danger') : ui.badge('چاوەڕێی پشتڕاستکردنەوە', 'danger')}${me.kidsDriver ? ui.badge('شۆفێری منداڵان', 'note') : ''}${me.woman ? ui.badge('شۆفێری ئافرەت', 'woman') : ''}</div>
        </div>
        ${me.status !== 'active' ? verifyBar(me) : ''}
        ${me.status === 'active' ? `<div class="grid3">
          <div class="card stat"><b class="brand">★ ${me.rating || '-'}</b><span class="xs muted">${me.reviews} هەڵسەنگاندن</span></div>
          <div class="card stat"><b>${me.trips}</b><span class="xs muted">گەشت</span></div>
          <div class="card stat"><b>${me.seats || 4}</b><span class="xs muted">کورسی</span></div>
        </div>
        <div class="card col">
          <div class="col tight"><b>ژمارەی کورسی بۆ سەرنشین</b><span class="xs muted">لە ڕۆتێکدا زیاتر لەم ژمارەیە سەرنشین ناخرێتە یەک تەکسی</span>
            <div class="stepper"><button data-act="seats" data-arg="1">+</button><div class="val">${me.seats || 4}</div><button data-act="seats" data-arg="-1">−</button></div></div>
          <div class="row between"><span>شۆفێری منداڵان</span>${ui.toggle('kidsToggle', me.kidsDriver)}</div>
        </div>
        ${me.tags && me.tags.length ? `<div class="h3">سەرنشینەکان چی دەڵێن</div><div class="chips">${me.tags.map((t) => `<span class="chip">${esc(t.label)}، <b>${t.count}</b></span>`).join('')}</div>` : ''}` : ''}
        <div class="h3">وێنەی ئۆتۆمبێل بۆ سەرنشینەکان</div>
        <div class="card col">
          <span class="sm muted">ئارەزوومەندانەیە. سەرنشینەکان لە پرۆفایلەکەت دەیبینن (لانیکەم یەک، زۆرترین دوو وێنە). وێنەیەکی ڕوون و پاک لە ئۆتۆمبێلەکەت هەڵبژێرە.</span>
          <div class="photos">${[0, 1].map((i) => {
            const id = (me.showPhotos || [])[i];
            return `<div class="col tight">${ui.photoField('show' + i, i ? 'وێنەی دووەم' : 'وێنەی یەکەم', id, 'pickShow')}${id ? `<button class="btn sm ghost" data-act="delShow" data-arg="${i}" style="color:var(--danger-text)">${icon('x', 14)}سڕینەوە</button>` : ''}</div>`;
          }).join('')}</div>
        </div>
        <div class="h3">بەڵگەنامەکانم</div>
        <div class="list">${TK.DOC_GROUPS.map((g) => {
          const st = (me.docStatus || {})[g.key] || 'pending';
          const exp = TK.expiries(me).find((e) => e.key === g.key);
          const warn = exp && exp.days <= TK.CONFIG.expiryWarnDays;
          const tag = st === 'ok' ? (warn ? ui.badge(exp.days < 0 ? 'بەسەرچووە' : `${exp.days} ڕۆژی ماوە`, 'danger') : ui.badge('پەسەندکراو', 'ok')) : st === 'rejected' ? ui.badge('ڕەتکرایەوە', 'danger') : ui.badge('چاوەڕێی پشکنین', 'note');
          const can = st === 'rejected' || warn;
          return `<div class="item ${can ? 'tap' : ''}" ${can ? `data-act="editDocs" data-arg="${g.key}"` : ''}><div class="ico-box ${st === 'ok' && !warn ? 'ok' : st === 'rejected' || warn ? 'danger' : ''}">${icon(g.icon, 20, st === 'ok' && !warn ? 'var(--ok-text)' : st === 'rejected' || warn ? 'var(--danger-text)' : 'var(--brand)')}</div>
            <div class="grow"><b class="sm">${g.label}</b>${st === 'rejected' && me.docReason[g.key] ? `<div class="xs" style="color:var(--danger-text)">${esc(me.docReason[g.key])}</div>` : exp ? `<div class="xs muted">بەسەرچوون: ${fmt.day(exp.date)}</div>` : ''}</div>${tag}${can ? icon('forward', 18, 'var(--muted)') : ''}</div>`;
        }).join('')}</div>`, 'more');
    },
  });
  TK.route('settings', {
    guard: authed,
    render() {
      const st = S().settings;
      return page(`
        ${ui.header('ڕێکخستنەکان', { back: 'more' })}
        <div class="card row">${icon('bell', 22, 'var(--brand)')}<div class="grow"><b>ئاگادارکردنەوە لەسەر مۆبایل</b><div class="xs muted">${notifyText()}</div></div><button class="btn sm secondary" data-act="askNotify">${TK.notifyStatus() === 'granted' ? 'چالاکە' : 'چالاککردن'}</button></div>
        <div class="card row">${icon('volume', 22, 'var(--brand)')}<div class="grow"><b>دەنگ بۆ داواکاری و نامەی نوێ</b><div class="xs muted">کاتێک ئەپەکە کراوەیە</div></div>${ui.toggle('soundToggle', st.dSound !== false)}</div>
        ${st.dSound !== false ? `<button class="btn secondary block" data-act="testSound">${icon('play', 16, 'currentColor', 2, 'currentColor')}تاقیکردنەوەی دەنگ</button>` : ''}
        ${ui.settingsCard()}
        <button class="btn secondary block" data-act="changePass">${icon('lock', 18)}گۆڕینی وشەی نهێنی</button>`, 'more');
    },
  });
  function notifyText() {
    const st = TK.notifyStatus();
    if (st === 'granted') return 'داواکاری نوێ و نامە کاتێک لە ئەپەکە نیت لەسەر شاشە دەردەکەون';
    if (st === 'denied') return 'ڕێگەپێدان ڕەتکرایەوە. لە ڕێکخستنی مۆبایل بیگۆڕە';
    if (st === 'insecure' || st === 'unsupported') return 'ئەم مۆبایلە ئێستا پشتگیری ناکات. ئەپەکە بخە سەر شاشەی سەرەکی (Add to Home Screen)';
    return 'بۆ ئەوەی داواکاری و نامەی نوێ لەدەست نەدەیت';
  }
  acts.askNotify = () => {
    TK.askNotify().then((r) => {
      const msg = { granted: 'ئاگادارکردنەوە چالاک کرا', denied: 'ڕێگەپێدان ڕەتکرایەوە', insecure: 'ئێستا تەنها ئاگادارکردنەوەی ناو ئەپ کار دەکات', unsupported: 'ئەم وێبگەڕە پشتگیری ناکات. ئەپەکە بخە سەر شاشەی سەرەکی' }[r] || '';
      if (msg) TK.toast(msg);
      TK.render();
    });
  };
  acts.changePass = () => {
    U.cpErr = '';
    TK.sheet(() => `<div class="h2">گۆڕینی وشەی نهێنی</div>
      <div class="field"><label for="cp-old">وشەی نهێنی ئێستا</label><input class="input ltr latin" id="cp-old" type="password" autocomplete="current-password"></div>
      <div class="field"><label for="cp-new">وشەی نهێنی نوێ</label><input class="input ltr latin" id="cp-new" type="password" autocomplete="new-password" placeholder="لانیکەم ٦ پیت"></div>
      <div class="field"><label for="cp-new2">دووبارەکردنەوەی وشەی نوێ</label><input class="input ltr latin" id="cp-new2" type="password" autocomplete="new-password"></div>
      ${U.cpErr ? `<div class="err">${esc(U.cpErr)}</div>` : ''}
      <button class="btn block lg" data-act="saveNewPass">پاشەکەوت</button>
      <button class="btn ghost block" data-close>پاشگەزبوونەوە</button>`);
  };
  acts.saveNewPass = async (a, el) => {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const n = v('cp-new');
    const done = TK.busyBtn(el);
    U.cpErr = n !== v('cp-new2') ? 'وشە نوێیەکان وەک یەک نین' : await actions.driverChangePassword(v('cp-old'), n);
    done();
    if (U.cpErr) return TK.sheet.refresh();
    TK.closeSheet();
    TK.toast('وشەی نهێنی گۆڕدرا');
  };
  /** وێنەی ئۆتۆمبێل بۆ سەرنشینەکان (زۆرترین دوو) */
  acts.pickShow = async (val, el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const i = +String(el.getAttribute('data-arg')).slice(4);
    TK.toast('وێنەکە ئامادە دەکرێت...');
    try {
      const id = await TK.saveImage(await TK.compressImage(f, 1100, 0.75));
      if (!id) return TK.toast('جێگای پاشەکەوت پڕە. وێنەیەکی بچووکتر هەڵبژێرە');
      const list = ((sel.me() || {}).showPhotos || []).slice(0, 2);
      if (list[i]) TK.removeImage(list[i]);
      list[i] = id;
      actions.setMyDriver({ showPhotos: list.filter(Boolean) });
      TK.toast('پاشەکەوت کرا. سەرنشینەکان دەیبینن');
    } catch (e) {
      TK.toast('ئەم وێنەیە ناخوێندرێتەوە. وێنەیەکی تر هەڵبژێرە');
    }
  };
  acts.delShow = async (i) => {
    const list = ((sel.me() || {}).showPhotos || []).slice();
    if (!list[+i] || !(await TK.ask('ئەم وێنەیە دەسڕدرێتەوە.', { yes: 'سڕینەوە' }))) return;
    TK.removeImage(list[+i]);
    list.splice(+i, 1);
    actions.setMyDriver({ showPhotos: list });
  };
  acts.seats = (d) => {
    const me = sel.me();
    const v = Math.min(7, Math.max(1, (me.seats || 4) + +d));
    actions.setMyDriver({ seats: v, freeSeats: Math.max(0, (me.freeSeats || 0) + (v - (me.seats || 4))) });
  };
  acts.showTerms = () => TK.showTerms('driver');
  acts.kidsToggle = () => actions.setMyDriver({ kidsDriver: !sel.me().kidsDriver });
  acts.soundToggle = () => actions.setSetting('dSound', S().settings.dSound === false);
  acts.testSound = () => beep('offer');
  acts.showIntro = () => {
    U.intro = 0;
    TK.go('intro');
  };
  acts.logout = async () => {
    if (!(await TK.ask('دڵنیایت دەتەوێت بچیتە دەرەوە؟', { yes: 'چوونەدەرەوە' }))) return;
    await actions.driverLogout();
    TK.go('login', true);
  };

  /* ---------- فێرکاری یەکەم جار ---------- */
  const INTRO = [
    { ic: 'home', t: 'ئەمڕۆ', d: 'هەموو بەیانییەک لێرە دەبینیت کێ سوار دەکەیت و کەی. یەک دوگمەی گەورە هەیە: «بەڕێ کەوتم»، پاشان «گەیشتم»، «سوار بوو» و «گەیاندم».' },
    { ic: 'route', t: 'ڕۆتەکان', d: 'چەند سەرنشینێک کە نزیکی یەکن بخە یەک تەکسی. خۆت دیاری دەکەیت یەکەم کەس کێیە. هەموو ڕۆژێک خۆکار ئامادە دەبێت.' },
    { ic: 'megaphone', t: 'داواکاری نوێ', d: 'کاتێک سەرنشینێک تەکسی بوێت دەنگێکت بۆ دێت. نرخ ئامادەیە، تەنها «قبووڵکردن» دابگرە.' },
  ];
  TK.route('intro', {
    guard: authed,
    render() {
      const i = U.intro || 0;
      const x = INTRO[i];
      return page(`
        <div class="intro col center" style="align-items:center;gap:18px;min-height:70vh;justify-content:center;text-align:center">
          <div class="intro-ic">${icon(x.ic, 64, 'var(--brand)', 1.8)}</div>
          <div class="h1">${x.t}</div>
          <div style="font-size:1.08rem;line-height:1.9;max-width:340px">${x.d}</div>
          <div class="dots">${INTRO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <button class="btn block lg" data-act="introNext">${i < INTRO.length - 1 ? 'دواتر' : 'دەست پێبکە'}</button>
        ${i < INTRO.length - 1 ? '<button class="btn ghost block" data-act="introDone">تێپەڕاندن</button>' : ''}`);
    },
  });
  acts.introNext = () => {
    U.intro = (U.intro || 0) + 1;
    if (U.intro >= INTRO.length) return acts.introDone();
    TK.render();
  };
  acts.introDone = () => {
    U.intro = 0;
    actions.setMyDriver({ introSeen: true });
    TK.go('today', true);
  };

  /* ---------- دەنگ ---------- */
  let actx = null;
  // وێبگەڕ تەنها دوای یەکەم دەستلێدان ڕێگە بە دەنگ دەدات
  document.addEventListener('pointerdown', () => {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      actx = null;
    }
  });
  function beep(kind) {
    if (S().settings.dSound === false || !actx) return;
    try {
      if (actx.state === 'suspended') actx.resume();
      const tones = kind === 'offer' ? [880, 1175, 1568] : kind === 'chat' ? [740, 988] : [660, 880];
      tones.forEach((f, i) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        const t0 = actx.currentTime + i * 0.16;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        o.connect(g).connect(actx.destination);
        o.start(t0);
        o.stop(t0 + 0.16);
      });
    } catch (e) {
      /* هیچ */
    }
  }

  TK.start({
    home: 'today',
    sw: 'sw.js',
    start: 'today',
    watchKey: (s) => s.driver.meId,
    watch: (s) => (s.driver.meId ? s.dnotices.filter((n) => n.driverId === s.driver.meId && n.kind !== 'self') : []),
    onFresh: (fresh) => beep(fresh.some((n) => n.kind === 'offer') ? 'offer' : fresh.some((n) => n.kind === 'chat') ? 'chat' : 'info'),
    validBack: (p) => p !== 'register' && p !== 'login' && p !== 'intro',
  });
})();
