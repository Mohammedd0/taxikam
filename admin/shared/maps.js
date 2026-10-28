/* نەخشەی ڕاستەقینە (Google Maps) و شوێنی زیندووی شۆفێر (GPS ـی مۆبایل)
 * - ئەگەر Google Maps بار نەبوو (بێ ئینتەرنێت، کلیلی هەڵە، Billing نییە)، نەخشە ساختەکەی core.js وەک خۆی دەمێنێتەوە.
 * - شۆفێر: تەنها لە کاتی گەشتێکی چالاکدا شوێنەکەی دەنێرێت بۆ live/{uid}، کە تەنها سەرنشینانی ئەو گەشتە دەیخوێننەوە.
 * - سەرنشین: ئۆتۆمبێلەکە لەسەر نەخشە دەبینێت و کاتی گەیشتن لە شوێنی ڕاستەقینەوە حیساب دەکرێت.
 * - هەڵبژاردنی شوێن: گەڕان (Places API New)، دەرزی لەسەر نەخشە، یان شوێنی ئێستا.
 */
(function () {
  'use strict';
  const TK = window.TK;
  if (!TK) return;
  const fmt = TK.fmt;
  const esc = TK.esc;
  const icon = TK.icon;
  const S = () => TK.get();
  const KEY = (window.TK_FIREBASE || {}).mapsKey || '';
  const CITY_CENTER = { erbil: { lat: 36.1911, lng: 44.0092 }, sulaimani: { lat: 35.5613, lng: 45.4304 } };
  const DEFAULT_CENTER = CITY_CENTER.erbil;
  const STALE_MS = 3 * 60000; // شوێنی شۆفێر کە لەمە کۆنتر بێت پیشان نادرێت
  const ROAD = 1.35; // ڕێگای شار ≈ ١.٣٥ × هێڵی ڕاست
  const KMH = 24; // خێرایی مامناوەندی ناو شار

  /* =========================================================
   * ١. بارکردنی Google Maps
   * ======================================================= */
  const G = { status: KEY ? 'idle' : 'off', err: null, promise: null, lib: null, placesOk: null };
  TK.gmaps = G;
  const ready = () => G.status === 'ready';
  TK.mapsReady = ready;
  function fail(why) {
    if (G.status === 'failed') return;
    G.status = 'failed';
    G.err = why;
    console.warn('Google Maps بار نەبوو:', why);
    // نەخشەکان دەگەڕێنەوە بۆ نەخشە ساختەکە
    entries.forEach((e) => e.el.remove());
    entries.clear();
    if (picker) picker.el.remove();
    picker = null;
    if (TK.app && TK.app.current) TK.render();
  }
  function load() {
    if (G.status !== 'idle') return G.promise || Promise.resolve();
    if (navigator.onLine === false || Date.now() < (G.retryAt || 0)) return Promise.resolve();
    G.status = 'loading';
    G.promise = new Promise((resolve) => {
      const done = () => resolve();
      window.gm_authFailure = () => fail('auth'); // کلیلی هەڵە، ڕێگەپێنەدراو بۆ ئەم ناونیشانە، یان Billing
      window.__tkGmReady = async () => {
        try {
          const [core, maps] = await Promise.all([google.maps.importLibrary('core'), google.maps.importLibrary('maps')]);
          G.lib = Object.assign({}, core, maps);
          G.status = 'ready';
          defineMarker();
          if (TK.app && TK.app.current) paint();
        } catch (e) {
          fail('import');
        }
        done();
      };
      const sc = document.createElement('script');
      sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&region=IQ&callback=__tkGmReady`;
      sc.async = true;
      sc.onerror = () => {
        // دواتر دووبارە هەوڵ دەدرێتەوە (بۆ نموونە کاتێک ئینتەرنێت گەڕایەوە)، بەڵام نەک لە هەر پیشاندانێکدا
        G.status = 'idle';
        G.promise = null;
        G.retryAt = Date.now() + 30000;
        sc.remove();
        done();
      };
      document.head.appendChild(sc);
      setTimeout(() => {
        if (G.status === 'loading') fail('timeout');
        done();
      }, 15000);
    });
    return G.promise;
  }
  TK.loadMaps = load;
  window.addEventListener('online', () => {
    G.retryAt = 0;
    if (G.status === 'idle' && document.querySelector('[data-gmap],[data-gpick]')) load();
  });

  /** نیشانەی HTML لەسەر نەخشە (وەک ئۆتۆمبێل و ژمارەی وێستگە) */
  let HtmlMarker = null;
  function defineMarker() {
    const L = G.lib;
    HtmlMarker = class extends L.OverlayView {
      constructor(pos, html, cls) {
        super();
        this.pos = pos;
        this.div = document.createElement('div');
        this.div.className = 'gm-mk ' + (cls || '');
        this.html = '';
        this.setHtml(html);
      }
      onAdd() {
        this.getPanes().overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const pr = this.getProjection();
        if (!pr || !this.pos) return;
        const p = pr.fromLatLngToDivPixel(new L.LatLng(this.pos.lat, this.pos.lng));
        if (!p) return;
        this.div.style.left = p.x + 'px';
        this.div.style.top = p.y + 'px';
      }
      onRemove() {
        this.div.remove();
      }
      setPos(pos) {
        this.pos = pos;
        this.draw();
      }
      setHtml(h) {
        if (h === this.html) return;
        this.html = h;
        this.div.innerHTML = h;
      }
    };
  }

  // ڕەنگی نەخشە: ڕووناک (کەم ڕەنگ) و تاریک
  const STYLE_LIGHT = [
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ lightness: 20 }] },
  ];
  const STYLE_DARK = [
    { elementType: 'geometry', stylers: [{ color: '#14213d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9aa7c2' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1733' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22345c' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c4373' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1733' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ];
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  function newMap(el, center, zoom, extra) {
    return new G.lib.Map(el, Object.assign({
      center, zoom, disableDefaultUI: true, zoomControl: false, clickableIcons: false, gestureHandling: 'greedy', keyboardShortcuts: false,
      styles: isDark() ? STYLE_DARK : STYLE_LIGHT, backgroundColor: isDark() ? '#14213d' : '#e9edf3',
    }, extra || {}));
  }
  const cityCenter = () => {
    const s = S();
    const c = (s.passenger && s.passenger.city) || ((TK.sel.me && TK.sel.me()) || {}).city || 'erbil';
    return CITY_CENTER[c] || DEFAULT_CENTER;
  };

  /* =========================================================
   * ٢. شوێنی زیندووی شۆفێر
   * ======================================================= */
  const LIVE = new Map(); // driverId → { lat, lng, at, run, ... }
  TK.liveLoc = LIVE;
  let liveUid = null;
  let liveUn = null;
  function watchLive() {
    const cloud = TK.cloud;
    const uid = cloud && cloud.on && TK.role === 'passenger' ? cloud.me : null;
    if (uid === liveUid) return;
    if (liveUn) {
      try {
        liveUn();
      } catch (e) {
        /* هیچ */
      }
      liveUn = null;
    }
    LIVE.clear();
    liveUid = uid;
    if (!uid || !window.TKFB) return;
    const spec = { id: 'live', col: 'live', where: ['_r', 'array-contains', uid] };
    liveUn = window.TKFB.listen(
      spec,
      (changes) => {
        changes.forEach((ch) => {
          const id = ch.path.split('/')[1];
          if (ch.type === 'removed' || !ch.data) LIVE.delete(id);
          // rx: کاتی گەیشتن بەم مۆبایلە (کاتژمێری مۆبایلی شۆفێر لەوانەیە جیاواز بێت)
          else LIVE.set(id, Object.assign({}, ch.data, { rx: Date.now() }));
        });
        TK.live && TK.live();
      },
      (err) => console.warn('شوێنی زیندوو', err && err.code)
    );
  }
  setInterval(watchLive, 1500);

  /** شوێنی ئێستای ئۆتۆمبێلی گەشتێک، ئەگەر نوێ بێت */
  function carPos(t) {
    if (!t || t.status !== 'active') return null;
    const key = t.runId || t.id;
    if (TK.role === 'driver') {
      if (drv.pos && drv.run === key && Date.now() - drv.pos.at < STALE_MS) return drv.pos;
      return null;
    }
    const l = LIVE.get(t.driverId);
    // کۆن: ماوەیەکە نوێ نەبووەتەوە، یان پێش کردنەوەی ئەپەکە نووسراوە (جیاوازی کاتژمێر تا ٣٠ خولەک قبووڵە)
    if (!l || l.run !== key || Date.now() - l.rx > STALE_MS || Math.abs(Date.now() - (l.at || 0)) > 30 * 60000 + STALE_MS) return null;
    return l;
  }
  TK.carPos = carPos;

  /* ---------- شۆفێر: ناردنی شوێن لە کاتی گەشتدا ---------- */
  const drv = { watch: null, pos: null, run: null, sent: null, sentAt: 0, owners: '', denied: false, err: null, lock: null, locking: false, near: new Set(), busy: false, wrote: false, cleaned: null };
  TK.gps = drv;
  const myActiveRun = () => {
    const s = S();
    const me = s.driver && s.driver.meId;
    if (!me) return null;
    const t = s.trips.find((x) => x.driverId === me && x.status === 'active');
    return t ? TK.runOf(t) : null;
  };
  function gpsTick() {
    if (TK.role !== 'driver' || !TK.cloud || !TK.cloud.me) return stopGps();
    const run = myActiveRun();
    if (!run || !run.length) {
      // شوێنێکی کۆن کە پێشتر نەسڕدرایەوە (ئەپ داخرا یان مۆبایل کوژایەوە لە ناوەڕاستی گەشتدا)
      if (drv.cleaned !== TK.cloud.me && TK.cloud.synced && TK.cloud.synced() && window.TKFB) {
        drv.cleaned = TK.cloud.me;
        window.TKFB.write({ op: 'delete', path: 'live/' + TK.cloud.me }).catch(() => {});
      }
      return stopGps();
    }
    const key = run[0].runId || run[0].id;
    drv.run = key;
    if (!drv.watch && !drv.denied && navigator.geolocation && window.isSecureContext) {
      drv.watch = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    }
    keepAwake(true);
    maybeSend(run, key);
  }
  function onPos(p) {
    const c = p.coords;
    drv.pos = { lat: c.latitude, lng: c.longitude, acc: Math.round(c.accuracy || 0), hd: c.heading != null && isFinite(c.heading) ? Math.round(c.heading) : null, sp: c.speed != null && isFinite(c.speed) ? Math.round(c.speed * 3.6) : null, at: Date.now() };
    drv.err = null;
    const run = myActiveRun();
    if (run && run.length) {
      maybeSend(run, run[0].runId || run[0].id);
      checkNear(run);
    }
    TK.live && TK.live();
  }
  function onPosErr(e) {
    drv.err = e && e.code;
    if (e && e.code === 1) {
      drv.denied = true;
      stopWatch();
      TK.toast && TK.toast('ڕێگە بە شوێن (Location) نەدرا. سەرنشینەکان شوێنی ئۆتۆمبێلەکەت نابینن');
      if (TK.app && TK.app.current) TK.render();
    }
  }
  /** دووبارە هەوڵدانەوە دوای ئەوەی شۆفێر ڕێگەی دا (لە ڕێکخستنەکانی مۆبایل) */
  TK.retryGps = () => {
    drv.denied = false;
    gpsTick();
  };
  function stopWatch() {
    if (drv.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(drv.watch);
    drv.watch = null;
  }
  function stopGps() {
    if (drv.watch == null && !drv.wrote && !drv.lock) return;
    stopWatch();
    keepAwake(false);
    // گەشتەکە تەواو بوو: شوێنەکە دەسڕدرێتەوە بۆ ئەوەی کەس نەیبینێت
    if (drv.wrote && TK.cloud && TK.cloud.me && window.TKFB) {
      window.TKFB.write({ op: 'delete', path: 'live/' + TK.cloud.me }).catch(() => {});
    }
    drv.wrote = false;
    drv.sent = null;
    drv.sentAt = 0;
    drv.owners = '';
    drv.run = null;
    drv.pos = null;
  }
  /**
   * کێ ئێستا دەتوانێت ئۆتۆمبێلەکە ببینێت (بۆ پاراستنی ماڵی هاوڕێکانی تەکسی):
   * - سەرنشینێک کە وێستگەی داهاتوو هی خۆیەتی (شۆفێر بەرەو لای ئەو دێت)، بەڵام تەنها یەک خولەک دوای بەجێهێشتنی وێستگەی پێشوو
   * - سەرنشینێک کە سوار بووە و هێشتا نەگەیشتووە
   */
  function viewers(run) {
    const now = Date.now();
    const out = new Set();
    run.filter((t) => t.status === 'active' && t.owner && t.owner !== 'me').forEach((t) => {
      const next = t.stops.findIndex((st) => !st.done);
      if (next < 0) return;
      const own = (st) => TK.ownStop(t, st);
      const pick = t.stops.findIndex((st) => st.kind === 'pickup' && own(st));
      const onBoard = pick >= 0 && t.stops[pick].done;
      const left = t.stops.some((st, i) => i >= next && st.kind === 'dropoff' && own(st));
      if (onBoard && left) return out.add(t.owner);
      if (!onBoard && pick === next) {
        const prev = t.stops[next - 1];
        if (!prev || !prev.doneAt || now - prev.doneAt > 60000) out.add(t.owner);
      }
    });
    return [...out].sort();
  }
  TK._liveViewers = (run) => viewers(run);
  function maybeSend(run, key) {
    const p = drv.pos;
    if (!p || drv.busy || !window.TKFB || !TK.cloud.me) return;
    if (Date.now() - p.at > 60000) return;
    const owners = viewers(run);
    const ok = owners.join(',');
    if (!owners.length) {
      // کەس نییە بیبینێت: هیچ نانێردرێت و شوێنی پێشوو دەسڕدرێتەوە
      if (drv.wrote) {
        drv.busy = true;
        window.TKFB.write({ op: 'delete', path: 'live/' + TK.cloud.me })
          .then(() => {
            drv.wrote = false;
            drv.sent = null;
            drv.owners = '';
          })
          .catch(() => {})
          .then(() => (drv.busy = false));
      }
      return;
    }
    const last = drv.sent;
    const age = Date.now() - drv.sentAt;
    const moved = last ? TK.geoKm(last, p) * 1000 : Infinity;
    const jitter = Math.max(30, p.acc || 0); // جووڵەی کەمتر لە وردی GPS حیساب ناکرێت
    // بە خێرایی: هەر ٢٥٠ مەتر (لانیکەم ١٥ چرکە)؛ بە هێواشی: هەر ٣٠ چرکە؛ ڕاوەستاو: هەر ٢ خولەک جارێک
    const due = !last || last.run !== key || ok !== drv.owners || (moved >= Math.max(250, jitter) && age >= 15000) || (moved >= jitter && age >= 30000) || age >= 120000;
    if (!due) return;
    const data = { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), acc: p.acc, hd: p.hd, sp: p.sp, at: Date.now(), run: key, d: TK.cloud.me, _r: owners };
    drv.busy = true;
    drv.wrote = true;
    // بێ ئینتەرنێت Firestore نووسینەکە ڕادەگرێت؛ «busy» دوای ٢٠ چرکە دەکرێتەوە بۆ ئەوەی ناردن نەوەستێت
    const unstick = setTimeout(() => (drv.busy = false), 20000);
    window.TKFB.write({ op: 'set', path: 'live/' + TK.cloud.me, data })
      .then(() => {
        drv.sent = data;
        drv.sentAt = data.at;
        drv.owners = ok;
      })
      .catch((e) => console.warn('ناردنی شوێن', e && e.code))
      .then(() => {
        clearTimeout(unstick);
        drv.busy = false;
      });
  }
  /** «شۆفێرەکەت نزیکە»: یەک جار بۆ هەر وێستگەیەکی سوارکردن */
  function checkNear(run) {
    const lim = TK.CONFIG.nearAlertM;
    const p = drv.pos;
    if (!lim || !p || p.acc > 250) return;
    const lead = run.find((t) => t.status === 'active');
    if (!lead) return;
    const st = lead.stops.find((x) => !x.done);
    if (!st || st.kind !== 'pickup' || st.arrivedAt || st.nearAt) return;
    const k = lead.runId + ':' + st.id + ':' + lead.id;
    if (drv.near.has(k)) return;
    const g = TK.stopGeo(lead, st);
    const m = g ? TK.geoKm(p, g) * 1000 : null;
    if (m == null || m > lim) return;
    drv.near.add(k);
    TK.actions.driverNear(lead.id, st.id, m);
  }
  /** شاشەکە ناکوژێتەوە لە کاتی گەشتدا (بۆ ئەوەی GPS بەردەوام بێت) */
  async function keepAwake(on) {
    if (!('wakeLock' in navigator) || drv.locking) return;
    try {
      if (on && !drv.lock && document.visibilityState === 'visible') {
        drv.locking = true;
        const l = await navigator.wakeLock.request('screen');
        drv.locking = false;
        // لەم ماوەیەدا گەشتەکە تەواو بوو
        if (!myActiveRun()) return l.release();
        drv.lock = l;
        l.addEventListener('release', () => drv.lock === l && (drv.lock = null));
      } else if (!on && drv.lock) {
        const l = drv.lock;
        drv.lock = null;
        await l.release();
      }
    } catch (e) {
      drv.locking = false;
      drv.lock = null;
    }
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && TK.role === 'driver' && gpsTick());
  /** دۆخی GPS بۆ پیشاندان لە ئەپی شۆفێر */
  TK.gpsState = () => {
    if (!navigator.geolocation) return 'none';
    if (!window.isSecureContext) return 'insecure';
    if (drv.denied) return 'denied';
    if (drv.pos && Date.now() - drv.pos.at < 60000) return 'ok';
    return 'wait';
  };

  /* =========================================================
   * ٣. کاتی گەیشتن لە شوێنی ڕاستەقینەوە
   * ======================================================= */
  const sim = TK.sim;
  const simMinutes = sim.minutesLeft;
  function liveMinutes(t) {
    const car = carPos(t);
    if (!car) return null;
    const own = (st) => TK.ownStop(t, st);
    const pick = t.stops.findIndex((st) => st.kind === 'pickup' && own(st));
    let target = -1;
    t.stops.forEach((st, i) => own(st) && (target = i));
    if (target < 0) target = t.stops.length - 1;
    const goal = pick >= 0 && !t.stops[pick].done ? pick : target;
    const next = t.stops.findIndex((st) => !st.done);
    if (next < 0 || goal < next) return null;
    const goalGeo = TK.stopGeo(t, t.stops[goal]);
    if (!goalGeo) return null;
    let km = 0;
    let prev = car;
    let unknown = 0;
    let boards = 0;
    for (let i = next; i <= goal; i++) {
      const g = TK.stopGeo(t, t.stops[i]);
      if (g) {
        km += TK.geoKm(prev, g) * ROAD;
        prev = g;
      } else unknown++;
      if (i < goal) boards++;
    }
    const mins = (km / KMH) * 60 + boards * 1.5 + unknown * (TK.CONFIG.stopMin || 5) * 0.5;
    return Math.max(1, Math.ceil(mins));
  }
  sim.minutesLeft = function (t, now) {
    const m = liveMinutes(t);
    return m != null ? m : simMinutes.call(sim, t, now);
  };

  /* =========================================================
   * ٤. نەخشەی گەشت
   * ======================================================= */
  const entries = new Map(); // key → { el, map, stops: Map, car, line, fit }
  function stopPoints(t) {
    return t.stops.map((st, i) => ({ st, i, g: TK.stopGeo(t, st) })).filter((x) => x.g);
  }
  function createEntry(key) {
    const el = document.createElement('div');
    el.className = 'gm';
    const map = newMap(el, cityCenter(), 13);
    const e = { key, el, map, stops: new Map(), car: null, line: null, done: null, fitN: -1, moved: false, used: Date.now(), dark: isDark() };
    map.addListener('dragstart', () => (e.moved = true));
    entries.set(key, e);
    return e;
  }
  function stopHtml(t, x, many, mine) {
    const done = x.st.done;
    const own = TK.ownStop(t, x.st);
    const cls = done ? 'done' : (mine && own) || (!many && x.st.kind === 'dropoff') ? 'mine' : '';
    const label = many ? x.i + 1 : '';
    return `<span class="gm-stop ${cls} ${x.st.kind}">${fmt.n(label)}</span>`;
  }
  const CAR = () => `<span class="gm-car"><i></i><b>${icon('car', 18, '#F5A623', 2.4)}</b></span>`;
  function updateEntry(e, t, mine) {
    const L = G.lib;
    if (e.dark !== isDark()) {
      e.dark = isDark();
      e.map.setOptions({ styles: e.dark ? STYLE_DARK : STYLE_LIGHT });
    }
    const pts = stopPoints(t);
    const many = t.stops.length > 2;
    const seen = new Set();
    pts.forEach((x) => {
      const id = x.st.id + ':' + x.i;
      seen.add(id);
      let m = e.stops.get(id);
      if (!m) {
        m = new HtmlMarker(x.g, '', 'stop');
        m.setMap(e.map);
        e.stops.set(id, m);
      }
      m.setPos(x.g);
      m.setHtml(stopHtml(t, x, many, mine));
    });
    e.stops.forEach((m, id) => {
      if (!seen.has(id)) {
        m.setMap(null);
        e.stops.delete(id);
      }
    });
    const car = carPos(t);
    if (car) {
      if (!e.car) {
        e.car = new HtmlMarker(car, CAR(), 'car');
        e.car.setMap(e.map);
      }
      e.car.setPos(car);
    } else if (e.car) {
      e.car.setMap(null);
      e.car = null;
    }
    // هێڵی ڕێگا: وێستگە ماوەکان (لە ئۆتۆمبێلەوە ئەگەر هەبێت)
    const rest = pts.filter((x) => !x.st.done).map((x) => x.g);
    const path = (car && t.status === 'active' ? [car] : []).concat(rest);
    const donePath = pts.filter((x) => x.st.done).map((x) => x.g);
    if (!e.line) e.line = new L.Polyline({ map: e.map, strokeColor: '#F5A623', strokeOpacity: 0.95, strokeWeight: 5, clickable: false });
    e.line.setPath(path);
    e.line.setOptions(t.status === 'active' ? { strokeOpacity: 0.95, icons: [] } : { strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#F5A623', scale: 3 }, offset: '0', repeat: '14px' }] });
    if (!e.done) e.done = new L.Polyline({ map: e.map, strokeColor: '#22C55E', strokeOpacity: 0.7, strokeWeight: 4, clickable: false });
    e.done.setPath(donePath.length > 1 ? donePath : []);
    // نیشاندانی هەموو خاڵەکان (تەنها کاتێک ژمارەیان گۆڕا و بەکارهێنەر نەخشەکەی نەجووڵاندووە)
    const all = pts.map((x) => x.g).concat(car ? [car] : []);
    const n = all.length + (car ? 100 : 0);
    if (!e.moved && n !== e.fitN && all.length) {
      e.fitN = n;
      if (all.length === 1) {
        e.map.setCenter(all[0]);
        e.map.setZoom(15);
      } else {
        const b = new L.LatLngBounds();
        all.forEach((g) => b.extend(g));
        e.map.fitBounds(b, 48);
      }
    }
  }
  /** نەخشەی ڕاستەقینە تەنها کاتێک دادەنرێت کە لانیکەم خاڵێکی ڕاستەقینە هەبێت (وێستگە یان ئۆتۆمبێل) */
  const hasReal = (t) => !!carPos(t) || stopPoints(t).length > 0;
  function mountTripMaps() {
    const hosts = document.querySelectorAll('[data-gmap]');
    if (!hosts.length) return;
    const want = [...hosts].some((h) => {
      const t = TK.sel.trip(h.getAttribute('data-gtrip'));
      return t && hasReal(t);
    });
    if (!want) return;
    if (!ready()) {
      if (G.status === 'idle') load();
      return;
    }
    hosts.forEach((host) => {
      const t = TK.sel.trip(host.getAttribute('data-gtrip'));
      if (!t || !hasReal(t)) return;
      const key = host.getAttribute('data-gmap');
      const e = entries.get(key) || createEntry(key);
      e.used = Date.now();
      if (e.el.parentNode !== host) {
        const svg = host.querySelector(':scope > svg');
        if (svg) svg.remove();
        host.insertBefore(e.el, host.firstChild);
        host.classList.add('gm-on');
      }
      updateEntry(e, t, host.hasAttribute('data-gmine'));
    });
    // نەخشەی کۆن کە ماوەیەکە بەکارنەهاتووە لادەبرێت
    entries.forEach((e, k) => {
      if (!document.body.contains(e.el) && Date.now() - e.used > 5 * 60000) entries.delete(k);
    });
  }
  /** نوێکردنەوەی ئۆتۆمبێل لەسەر نەخشە هەر چرکەیەک (بێ دووبارە دروستکردنی شاشە) */
  function liveTripMaps() {
    if (!ready()) return;
    document.querySelectorAll('[data-gmap].gm-on').forEach((host) => {
      const e = entries.get(host.getAttribute('data-gmap'));
      const t = TK.sel.trip(host.getAttribute('data-gtrip'));
      if (e && t && e.el.parentNode === host) updateEntry(e, t, host.hasAttribute('data-gmine'));
    });
  }

  /* =========================================================
   * ٥. هەڵبژاردنی شوێن لەسەر نەخشە
   * ======================================================= */
  let picker = null; // { el, map }
  const PK = { open: false, center: null, name: '', q: '', sugg: [], token: null, resolve: null, prev: null, title: '', busy: false, msg: '' };
  /** گەڕانی شوێن بە Google (Places API New). لیستێک لە { main, sub, pred } */
  async function suggest(q, near) {
    if (!q || q.trim().length < 2) return [];
    await load();
    if (!ready() || G.placesOk === false) return [];
    try {
      const P = await google.maps.importLibrary('places');
      if (!PK.token) PK.token = new P.AutocompleteSessionToken();
      const req = { input: q.trim(), sessionToken: PK.token, includedRegionCodes: ['iq'] };
      const c = near || cityCenter();
      req.locationBias = { center: c, radius: 30000 };
      const { suggestions } = await P.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      G.placesOk = true;
      return (suggestions || []).filter((s) => s.placePrediction).slice(0, 6).map((s) => {
        const p = s.placePrediction;
        return { main: (p.mainText && p.mainText.text) || (p.text && p.text.text) || '', sub: (p.secondaryText && p.secondaryText.text) || '', pred: p };
      });
    } catch (e) {
      console.warn('گەڕانی شوێن', e && (e.message || e));
      G.placesOk = false;
      return [];
    }
  }
  TK.geoSuggest = suggest;
  async function resolvePred(pred) {
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ['location', 'displayName'] });
      PK.token = null; // کۆتایی دانیشتنی گەڕان
      const loc = place.location;
      return loc ? { lat: loc.lat(), lng: loc.lng(), name: place.displayName || '' } : null;
    } catch (e) {
      console.warn('شوێن', e && (e.message || e));
      return null;
    }
  }
  /** ناوی گەڕەک بۆ شوێنێک (تەنها ناوچە، نەک ناونیشانی ورد) */
  async function areaName(g) {
    try {
      const { Geocoder } = await google.maps.importLibrary('geocoding');
      const { results } = await new Geocoder().geocode({ location: g });
      const pickType = (types) => {
        for (const r of results || []) for (const c of r.address_components || []) if (c.types.some((x) => types.includes(x))) return c.long_name;
        return '';
      };
      return pickType(['neighborhood', 'sublocality_level_1', 'sublocality']) || pickType(['locality']) || '';
    } catch (e) {
      return '';
    }
  }
  /** شوێنی ئێستای مۆبایل */
  function here() {
    return new Promise((res) => {
      if (!navigator.geolocation || !window.isSecureContext) return res({ err: !window.isSecureContext ? 'insecure' : 'none' });
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        (e) => res({ err: e && e.code === 1 ? 'denied' : 'fail' }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }
  TK.here = here;
  const HERE_ERR = { insecure: 'شوێنی ئێستا تەنها لەسەر https کار دەکات', none: 'ئەم مۆبایلە شوێن نادات', denied: 'ڕێگە بە شوێن (Location) نەدرا. لە ڕێکخستنەکانی مۆبایل ڕێگەی پێبدە', fail: 'شوێنەکەت نەدۆزرایەوە. دووبارە هەوڵ بدەرەوە' };
  TK.hereErr = (e) => HERE_ERR[e] || HERE_ERR.fail;

  /**
   * پەنجەرەی هەڵبژاردنی شوێن. Promise → { lat, lng, name } یان null
   * opts: { title, center, q, useHere }
   */
  TK.pickLocation = function (opts = {}) {
    if (PK.open || PK.loading) return Promise.resolve(null);
    PK.loading = true;
    return new Promise(async (resolve) => {
      await load();
      PK.loading = false;
      if (!ready()) {
        // بێ نەخشە: تەنها ئەگەر داوای «شوێنی ئێستام» کرابێت، دەنا هیچ (شوێنی هەڵە دانانرێت)
        if (!opts.useHere) {
          TK.toast('نەخشە بار نەبوو. ئینتەرنێت بپشکنە یان «شوێنی ئێستام» بەکاربهێنە');
          return resolve(null);
        }
        const h = await here();
        if (h.err) {
          TK.toast(TK.hereErr(h.err));
          return resolve(null);
        }
        TK.toast('شوێنی ئێستات وەرگیرا');
        return resolve({ lat: h.lat, lng: h.lng, name: '', area: '' });
      }
      Object.assign(PK, { open: true, fresh: true, center: opts.center || cityCenter(), zoom: opts.center ? 17 : 13, name: '', q: opts.q || '', sugg: [], resolve, prev: TK.app.sheetFn, title: opts.title || 'شوێن دیاری بکە', busy: false, msg: '' });
      TK.sheet(pickerHtml);
      if (opts.q) runSuggest(opts.q);
      if (opts.useHere) TK.app.acts.pkHere();
    });
  };
  function pickerHtml() {
    return `<div class="row between"><div class="h2">${esc(PK.title)}</div><button class="icon-btn plain" data-act="pkCancel" aria-label="داخستن">${icon('x', 22)}</button></div>
      <div class="place-field"><span class="pin-ic">${icon('search', 20, 'var(--muted)')}</span><input class="input" id="pk-q" data-input="pkType" placeholder="ناوی شوێن بگەڕێ، بۆ نموونە: فامیلی مۆڵ" autocomplete="off" value="${esc(PK.q)}"></div>
      <div class="sugg" id="pk-sugg">${suggHtml()}</div>
      <div class="gm-pick" data-gpick><div class="gm-pin">${icon('pin', 40, '#F5A623', 2.2, '#13254A')}</div><button type="button" class="gm-here" data-act="pkHere" aria-label="شوێنی ئێستام">${icon('navigate', 20, 'var(--brand)', 2.2)}</button></div>
      <div class="xs muted center">نەخشەکە بجووڵێنە تا دەرزییەکە دەکەوێتە سەر شوێنی ورد</div>
      ${PK.msg ? `<div class="err">${esc(PK.msg)}</div>` : ''}
      <button class="btn block" data-act="pkOk" ${PK.busy ? 'disabled' : ''}>${icon('check', 18, 'currentColor', 2.4)}ئەم شوێنە</button>`;
  }
  function suggHtml() {
    return PK.sugg.map((x, i) => `<button type="button" data-act="pkPick" data-arg="${i}">${icon('pin', 18, 'var(--brand)')}<span class="grow">${esc(x.main)}${x.sub ? `<span class="xs muted" style="display:block">${esc(x.sub)}</span>` : ''}</span></button>`).join('') +
      (G.placesOk === false && PK.q.trim().length >= 2 ? '<div class="xs muted" style="padding:6px 4px">گەڕانی Google بەردەست نییە. دەرزییەکە بە دەست دابنێ.</div>' : '');
  }
  let sT = 0;
  function runSuggest(q) {
    clearTimeout(sT);
    sT = setTimeout(async () => {
      const list = await suggest(q, PK.center);
      if (PK.q !== q) return;
      PK.sugg = list;
      const box = document.getElementById('pk-sugg');
      if (box) {
        box.innerHTML = suggHtml();
        TK.localizeDigits(box);
      }
    }, 350);
  }
  function finishPick(v) {
    const r = PK.resolve;
    const prev = PK.prev;
    PK.open = false;
    PK.resolve = null;
    PK.sugg = [];
    if (prev) TK.sheet(prev);
    else TK.closeSheet();
    if (r) r(v);
  }
  Object.assign(TK.app.acts, {
    pkType(v) {
      PK.q = v;
      if (v.trim().length < 2) {
        PK.sugg = [];
        const box = document.getElementById('pk-sugg');
        if (box) box.innerHTML = suggHtml();
        return;
      }
      runSuggest(v);
    },
    async pkPick(i) {
      const x = PK.sugg[+i];
      if (!x) return;
      const g = await resolvePred(x.pred);
      if (!g) return TK.toast('ئەم شوێنە نەدۆزرایەوە');
      PK.name = x.main;
      PK.center = { lat: g.lat, lng: g.lng };
      PK.sugg = [];
      PK.q = x.main;
      if (document.activeElement) document.activeElement.blur();
      if (picker) {
        picker.map.setCenter(PK.center);
        picker.map.setZoom(17);
      }
      TK.sheet.refresh();
    },
    async pkHere() {
      const h = await here();
      if (h.err) return TK.toast(TK.hereErr(h.err));
      PK.center = { lat: h.lat, lng: h.lng };
      PK.name = '';
      if (picker) {
        picker.map.setCenter(PK.center);
        picker.map.setZoom(17);
      }
    },
    pkCancel() {
      finishPick(null);
    },
    async pkOk() {
      if (PK.busy) return;
      const c = picker ? picker.map.getCenter() : null;
      const g = c ? { lat: +c.lat().toFixed(6), lng: +c.lng().toFixed(6) } : PK.center;
      if (!g) return;
      PK.busy = true;
      TK.sheet.refresh();
      // area: تەنها ناوی گەڕەک (بۆ ئەوەی ناونیشانی ورد لە نووسینی گشتیدا نەبێت)
      const area = await areaName(g);
      PK.busy = false;
      finishPick({ lat: g.lat, lng: g.lng, name: PK.name || area, area });
    },
  });
  function mountPicker() {
    const host = document.querySelector('[data-gpick]');
    if (!host || !ready()) return;
    if (!picker) {
      const el = document.createElement('div');
      el.className = 'gm';
      const map = newMap(el, PK.center || cityCenter(), PK.zoom || 13);
      picker = { el, map };
      map.addListener('dragstart', () => (PK.name = '')); // دەرزی جووڵا: ناوی گەڕانەکە ئیتر ڕاست نییە
      map.addListener('idle', () => {
        const c = map.getCenter();
        if (c) PK.center = { lat: c.lat(), lng: c.lng() };
      });
    } else if (PK.fresh) {
      // کردنەوەی نوێ: لە شوێنی داواکراو دەست پێدەکات. دووبارە پیشاندانی هەمان پەنجەرە نەخشەکە ناگۆڕێت
      picker.map.setCenter(PK.center || cityCenter());
      picker.map.setZoom(PK.zoom || 13);
    }
    PK.fresh = false;
    if (picker.el.parentNode !== host) host.insertBefore(picker.el, host.firstChild);
  }

  /* =========================================================
   * ٦. ڕێنمایی ڕێگا: Google Maps یان Waze
   * ======================================================= */
  TK.navUrls = function (g, label, city) {
    const dest = g ? `${g.lat},${g.lng}` : `${label || ''}، ${city || ''}`;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`,
      waze: g ? `https://waze.com/ul?ll=${g.lat}%2C${g.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(dest)}&navigate=yes`,
    };
  };
  TK.navSheet = function (g, label, city) {
    const u = TK.navUrls(g, label, city);
    TK.sheet(() => `<div class="h2">ڕێنمایی ڕێگا</div>
      <div class="sm muted">${esc(label || '')}${g ? '' : '<br>شوێنی ورد لەسەر نەخشە دیاری نەکراوە، بە ناوەکەی دەگەڕێت'}</div>
      <a class="btn block" href="${u.google}" target="_blank" rel="noopener" data-close-nav>${icon('navigate', 18, 'currentColor', 2.2)}Google Maps</a>
      <a class="btn secondary block" href="${u.waze}" target="_blank" rel="noopener" data-close-nav>${icon('navigate', 18, 'currentColor', 2.2)}Waze</a>
      <button class="btn ghost block" data-close>داخستن</button>`);
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-nav]')) setTimeout(() => TK.closeSheet(), 300);
  });

  /* ---------- پەیوەستکردن بە core.js ---------- */
  /** ئەگەر پەنجەرەکە بە شێوەیەکی تر داخرا (دەست لە دەرەوە، گۆڕینی شاشە)، چاوەڕوانییەکە کۆتایی دێت */
  function pickerGone() {
    if (!PK.open || TK.app.sheetFn === pickerHtml) return;
    const r = PK.resolve;
    PK.open = false;
    PK.resolve = null;
    PK.sugg = [];
    if (r) r(null);
  }
  function paint() {
    mountTripMaps();
    pickerGone();
    if (PK.open) {
      if (!ready()) load().then(() => ready() && mountPicker());
      else mountPicker();
    }
  }
  TK.hooks.paint.push(paint);
  const GPS_TAG = { ok: 'سەرنشینەکان شوێنت دەبینن', wait: 'چاوەڕێی GPS...', denied: 'GPS کوژاوەیە', insecure: 'GPS بەردەست نییە', none: 'GPS بەردەست نییە' };
  TK.hooks.live.push(() => {
    pickerGone();
    gpsTick();
    liveTripMaps();
    document.querySelectorAll('[data-gps-tag]').forEach((el) => {
      const t = GPS_TAG[TK.gpsState()] || '';
      if (el.textContent !== t) el.textContent = t;
    });
  });
})();
