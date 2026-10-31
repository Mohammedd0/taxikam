/* یەکسا، کۆدی هاوبەش بۆ هەر سێ ئەپ (سەرنشین، شۆفێر، بەڕێوەبەر)
 * زانیارییەکان لە Firebase (Firestore) هەڵدەگیرێن و لە نێوان هەموو مۆبایلەکاندا هاوبەشن:
 * شۆفێر «سوار بوون» دادەگرێت و ئەپی سەرنشین لە مۆبایلێکی ترەوە دەستبەجێ دەیبینێت.
 */
(function () {
  'use strict';

  const TK = (window.TK = {});
  const STATE_VERSION = 7;

  // ڕێکخستنەکانی خاوەنی ئەپ (دواتر لە پانێڵی بەڕێوەبردن دەگۆڕدرێن)
  // بنەڕەتی یاساکان. خاوەنی ئەپ لە پانێڵی بەڕێوەبردن دەیانگۆڕێت (state.config)
  const CONFIG = {
    commission: 0.12, // کۆمیسیۆنی ئەپ لە هەر بەشدارییەک (کاتێک جۆرەکەی ٪ بێت)
    commissionType: 'pct', // 'pct' = ڕێژە لە نرخ، 'fixed' = بڕێکی جێگیر بۆ هەر کەسێک لە مانگێکدا
    commissionFixed: 10000, // کۆمیسیۆنی جێگیر بۆ کەسی یەکەم (کەسی دووەم بەدواوە بە ڕێژەی نرخەکەی)
    commissionNext: null, // یاسای نوێ کە لە مانگی داهاتووەوە جێبەجێ دەبێت: { type, pct, fixed, from: 'YYYY-MM' }
    refOn: true, // بانگهێشتی هاوڕێ
    refType: 'fixed', // 'fixed' = دینار، 'pct' = ڕێژە لە نرخی یەکەم مانگ
    refFixed: 5000, // داشکاندنی هەر یەکێک لە دوو هاوڕێکە
    refPct: 0.05,
    refMax: 10000, // زۆرترین داشکاندن کاتێک بە ٪ بێت
    pointsPerRating: 20, // خاڵ بۆ هەر هەڵسەنگاندنێک
    rewards: null, // لیستی پاداشتەکان (null = بنەڕەت)
    faq: null, // پرسیارە باوەکان (null = بنەڕەت)
    contacts: [], // ژمارەکانی پەیوەندی بە یەکسا: { id, phone, label, aud: p|d|all }
    walletOn: false,
    photosRequired: false, // وێنەی بەڵگەنامەکانی شۆفێر ئیجبارین؟ (بۆ تاقیکردنەوە ناچالاکە؛ پێش دەستپێکردنی ڕاستەقینە لە پانێڵ چالاکی بکە) // جزدان: سەرنشین پێش یەکەم گەشتی هەر مانگێک لە جزدانەوە پارە دەدات، شۆفێر ڕۆژانە داهات وەردەگرێت
    skipEvery: 5, // جزدان: بۆ هەر ئەوەندە ڕۆژ «نایەم» لە یەک مانگدا...
    skipRefundDays: 1, // ...پارەی ئەوەندە ڕۆژ لە شۆفێرەوە بۆ سەرنشین دەگەڕێتەوە
    noShowComp: 5000, // جزدان: لە سزای «شۆفێر نەهات» ئەوەندە دەچێتە سەر باڵانسی سەرنشین
    withdrawMin: 25000, // جزدان: کەمترین بڕ بۆ داوای وەرگرتنی شۆفێر (٠ = بێ سنوور)
    offerRange: 0.15, // شۆفێر دەتوانێت تا ١٥٪ کەمتر یان زیاتر نرخ پێشنیار بکات
    requestHours: 48, // داواکاری دوای ٤٨ کاتژمێر دادەخرێت
    basePrice: 50000, // نرخی بنەڕەتی مانگانە
    perKm: 7000, // بۆ هەر کیلۆمەترێک
    oneWayFactor: 0.6, // تەنها چوون یان تەنها هاتنەوە
    privateFactor: 1.4, // تەکسی تایبەت
    familyFactor: 1.2, // خێزان بە تەنها
    kidsFactor: 1.1, // چاودێری منداڵ
    extraRiderFactor: 0.7, // کەسی دووەم بەدواوە لە یەک تەکسی
    skipCutoffMin: 30, // «نایەم» تا ٣٠ خولەک پێش گەشت
    noShowPenalty: 5000, // سزای شۆفێر کاتێک نایەت
    noShowCreditMin: 4000, // کەمترین قەرەبووی سەرنشین
    bonusAmount: 50000, // پاداشتی مانگانەی شۆفێر
    bonusDays: 26, // ڕۆژی کار بۆ پاداشت
    debtLimit: 50000, // سنووری قەرزی شۆفێر
    pointsPer1000: 1, // خاڵی پاداشت بۆ هەر ١٠٠٠ دینار
    minDriverAge: 23, // کەمترین تەمەنی شۆفێر
    minCarYear: 2010, // کەمترین ساڵی دروستکردنی ئۆتۆمبێل
    expiryWarnDays: 30, // چەند ڕۆژ پێش بەسەرچوونی بەڵگەنامە ئاگادار دەکرێتەوە
    securityValidDays: 180, // کۆدی ئاسایش چەند ڕۆژ بە دروست دەمێنێتەوە
    stopMin: 5, // خولەک لە نێوان دوو وێستگە لە ڕۆتێکی هاوبەشدا
    poolWindowMin: 45, // زۆرترین جیاوازی کاتی سەرنشینانی یەک ڕۆت
    startEarlyMin: 30, // شۆفێر چەند خولەک پێش کاتی یەکەم وێستگە دەتوانێت «بەڕێ کەوتم» بکات (٠ = بێ سنوور)
    absentWaitMin: 3, // شۆفێر دەبێت ئەم ماوەیە چاوەڕێ بکات (دوای «گەیشتم») پێش ئەوەی «نەهات» دابگرێت
    autoCloseMin: 180, // گەشتی چالاک کە ئەم ماوەیە هیچ جووڵەیەکی نەبێت خۆکار دادەخرێت (٠ = هەرگیز)
    nearAlertM: 500, // سەرنشین ئاگادار دەکرێتەوە کاتێک شۆفێر ئەوەندە مەتر نزیک دەبێتەوە (٠ = هەرگیز)
  };
  const cfg = () => Object.assign({}, CONFIG, (state && state.config) || {});
  Object.defineProperty(TK, 'CONFIG', { get: cfg });
  TK.CONFIG_DEFAULTS = CONFIG;

  /* =========================================================
   * ١. فۆرمات
   * ======================================================= */
  const KU = '٠١٢٣٤٥٦٧٨٩';
  const WEEKDAYS = ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'];
  // ناوی کورت بەڵام ناسراو (تاک پیت وەک «س» یان «ش» تێگەیشتنی قورس بوو)
  const WEEKDAY_SHORT = ['شەم', 'یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'هەینی'];
  const MONTHS = ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];

  const fmt = {
    WEEKDAYS,
    WEEKDAY_SHORT,
    MONTHS,
    /** ژمارەکان بە پێی ڕێکخستن: ١٢٣ یان 123 */
    n(v) {
      const s = String(v);
      if (state && state.settings.digits === 'en') return s.replace(/[٠-٩]/g, (d) => String(KU.indexOf(d)));
      return s.replace(/[0-9]/g, (d) => KU[+d]).replace(/([٠-٩]),(?=[٠-٩])/g, '$1٬');
    },
    group(n) {
      return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    money(n) {
      return fmt.group(n) + ' دینار';
    },
    /** 7501234567 → 0750 123 4567 */
    phone(p) {
      const d = String(p || '').replace(/\D/g, '');
      return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d;
    },
    /** کات بێ بەیانی/ئێوارە (تەنها کاتێک «period» جیا نووسرابێت) */
    clockBare(hhmm) {
      if (!hhmm) return '';
      const [h, m] = hhmm.split(':').map(Number);
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${String(m).padStart(2, '0')}`;
    },
    /** کات هەمیشە لەگەڵ بەیانی/نیوەڕۆ/ئێوارە، بۆ ئەوەی «١:٣٠» ناڕوون نەبێت */
    clock(hhmm) {
      if (!hhmm) return '';
      return `${fmt.clockBare(hhmm)} ${fmt.period(hhmm)}`;
    },
    period(hhmm) {
      const h = Number((hhmm || '0').split(':')[0]);
      if (h < 4 || h >= 20) return 'شەو';
      if (h < 12) return 'بەیانی';
      if (h < 15) return 'نیوەڕۆ';
      return 'ئێوارە';
    },
    time(hhmm) {
      return fmt.clock(hhmm);
    },
    /** کاتەکانی چوون و هاتنەوە: هەردووکیان، تەنها چوون، یان تەنها هاتنەوە */
    schedule(x) {
      if (x.perDay && Object.keys(x.perDay).length) return 'کاتی جیاواز بۆ هەر ڕۆژێک';
      if (x.go && x.back) return `${fmt.time(x.go)}، هاتنەوە ${fmt.time(x.back)}`;
      if (x.go) return `${fmt.time(x.go)}، تەنها چوون`;
      if (x.back) return `تەنها هاتنەوە، ${fmt.time(x.back)}`;
      return '';
    },
    /** "2026-11-01" → شەممە ١ی تشرینی دووەم */
    day(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-').map(Number);
      return fmt.date(new Date(y, m - 1, d).getTime());
    },
    date(ts) {
      const d = new Date(ts);
      return `${WEEKDAYS[(d.getDay() + 1) % 7]} ${d.getDate()}ی ${MONTHS[d.getMonth()]}`;
    },
    hhmm(ts) {
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },
    addMin(hhmm, mins) {
      const [h, m] = hhmm.split(':').map(Number);
      const t = (h * 60 + m + mins + 1440) % 1440;
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    },
    ago(at) {
      const mins = Math.floor((Date.now() - at) / 60000);
      if (mins < 1) return 'ئێستا';
      if (mins < 60) return `${mins} خولەک لەمەوبەر`;
      const h = Math.floor(mins / 60);
      if (h < 24) return `${h} کاتژمێر لەمەوبەر`;
      if (h < 48) return 'دوێنێ';
      return `${Math.floor(h / 24)} ڕۆژ لەمەوبەر`;
    },
    /** کاتی ئاگادارکردنەوە: ئێستا، ٥ خولەک، ٣ کاتژمێر، دوێنێ ٩:١٥ بەیانی، ٣ ڕۆژ، یان بەروار */
    noticeWhen(at) {
      const d = new Date(at);
      const mins = Math.floor((Date.now() - at) / 60000);
      const day0 = new Date();
      day0.setHours(0, 0, 0, 0);
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (mins < 1) return 'ئێستا';
      if (mins < 60) return `${mins} خولەک لەمەوبەر`;
      if (at >= day0.getTime()) return `${Math.floor(mins / 60)} کاتژمێر لەمەوبەر`;
      if (at >= day0.getTime() - 864e5) return `دوێنێ، ${fmt.clock(hm)}`;
      const days = Math.ceil((day0.getTime() - at) / 864e5);
      if (days < 7) return `${days} ڕۆژ لەمەوبەر`;
      return fmt.date(at);
    },
    left(until) {
      const mins = Math.max(0, Math.floor((until - Date.now()) / 60000));
      if (mins < 60) return `${mins} خولەک ماوە`;
      return `${Math.floor(mins / 60)} کاتژمێر ماوە`;
    },
    today() {
      const d = new Date();
      const wd = WEEKDAYS[(d.getDay() + 1) % 7];
      return `${wd}، ${d.getDate()}ی ${MONTHS[d.getMonth()]}`;
    },
    names(list) {
      if (list.length <= 1) return list[0] || '';
      return list.slice(0, -1).join('، ') + ' و ' + list[list.length - 1];
    },
    days(days) {
      const on = days.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      if (on.length === 7) return 'هەموو ڕۆژێک';
      const isRange = on.length > 2 && on.every((v, i) => i === 0 || v === on[i - 1] + 1);
      if (isRange) return `${WEEKDAYS[on[0]]} تا ${WEEKDAYS[on[on.length - 1]]}`;
      return on.map((i) => WEEKDAYS[i]).join('، ');
    },
  };
  TK.fmt = fmt;

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TK.esc = esc;
  const uid = () => Math.random().toString(36).slice(2, 9);
  TK.uid = uid;

  /* =========================================================
   * ٢. ئایکۆن
   * ======================================================= */
  const P = (d) => `<path d="${d}"/>`;
  const ICONS = {
    home: P('M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'),
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/>' + P('M16 3v4M8 3v4M3 10h18'),
    users: '<circle cx="9" cy="8" r="3.5"/>' + P('M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5') + P('M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.6 3.6 5.2'),
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/>' + P('M3 10h18M16 15h2'),
    user: '<circle cx="12" cy="8" r="4"/>' + P('M4 21c1-4 4.5-6 8-6s7 2 8 6'),
    bell: P('M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z') + P('M10 20a2 2 0 0 0 4 0'),
    back: P('m9 6 6 6-6 6'),
    forward: P('m15 6-6 6 6 6'),
    chat: P('M4 5h16v11H9l-5 4z'),
    phone: P('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z'),
    pin: P('M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z') + '<circle cx="12" cy="9.5" r="2.5"/>',
    check: P('m5 12 5 5 9-10'),
    swap: P('M7 7h11l-3-3M17 17H6l3 3'),
    shield: P('M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z') + P('m9 12 2 2 4-4'),
    clock: '<circle cx="12" cy="12" r="9"/>' + P('M12 7v5l3 2'),
    gift: P('M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5z'),
    search: '<circle cx="11" cy="11" r="7"/>' + P('m20 20-3.5-3.5'),
    help: '<circle cx="12" cy="12" r="9"/>' + P('M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01'),
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/>' + P('M8 11V7a4 4 0 0 1 8 0v4'),
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/>' + P('M5 11a7 7 0 0 0 14 0M12 18v3'),
    play: P('M7 4v16l13-8z'),
    plus: P('M12 5v14M5 12h14'),
    minus: P('M5 12h14'),
    download: P('M12 3v12M7 10l5 5 5-5M5 21h14'),
    edit: P('M4 20h4L19 9l-4-4L4 16z'),
    eye: P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z') + '<circle cx="12" cy="12" r="3"/>',
    car: '<path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.65 5H8.4a2 2 0 0 0-1.9 1.26L5 10 3 8"/><rect x="3" y="10" width="18" height="8" rx="2"/>' + P('M7 14h.01M17 14h.01M5 18v2M19 18v2'),
    school: P('M2 9l10-5 10 5-10 5z') + P('M6 11v5c3 2 9 2 12 0v-5'),
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/>' + P('M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'),
    logout: P('M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10'),
    star: P('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'),
    woman: '<circle cx="12" cy="8" r="3.5"/>' + P('M7.6 13.2C6.6 11.8 6 10 6 8a6 6 0 0 1 12 0c0 2-.6 3.8-1.6 5.2') + P('M4.5 21c.9-3.6 3.9-6 7.5-6s6.6 2.4 7.5 6'),
    medal: '<circle cx="12" cy="9" r="6"/>' + P('m8.5 14-1.5 7 5-3 5 3-1.5-7'),
    fuel: '<rect x="4" y="3" width="10" height="18" rx="2"/>' + P('M4 10h10M14 8l4 3v7a1.5 1.5 0 0 0 3 0v-9l-3-3'),
    wrench: P('M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z'),
    seat: P('M7 3v10h10M7 13l-2 8M17 13l2 8M9 7h5'),
    doc: P('M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5'),
    camera: P('M4 7h3l2-3h6l2 3h3v13H4z') + '<circle cx="12" cy="13" r="4"/>',
    down: P('m6 9 6 6 6-6'),
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' + P('M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'),
    alert: P('M12 3 2 20h20z') + P('M12 10v4M12 17h.01'),
    up: P('M6 15l6-6 6 6'),
    menu: P('M4 6h16M4 12h16M4 18h16'),
    volume: P('M11 5 6 9H3v6h3l5 4z') + P('M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13'),
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/>' + P('M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7'),
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/>' + P('M7 8h10M7 12h10M7 16h6'),
    megaphone: P('M3 10v4h4l7 5V5L7 10zM18 8a5 5 0 0 1 0 8'),
    tag: P('M3 12V4h8l10 10-8 8z') + '<circle cx="7.5" cy="8.5" r="1.5"/>',
    send: P('M3 3l18 7-7 3-3 7z') + P('m14 13-4-4'),
    x: P('M6 6l12 12M18 6 6 18'),
    trash: P('M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3'),
    sun: '<circle cx="12" cy="12" r="4"/>' + P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'),
    moon: P('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'),
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/>' + P('M5 15V5a2 2 0 0 1 2-2h10'),
    sos: P('M7 18v-6a5 5 0 1 1 10 0v6M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2zM21 12h1M18.5 4.5 18 5M2 12h1M12 2v1M4.9 4.9l.7.7M12 12v6'),
    child: P('M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5') + P('M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1'),
    hourglass: P('M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2'),
    receipt: P('M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4'),
    settings: '<circle cx="12" cy="12" r="3"/>' + P('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
    mall: P('M4 8h16l-1 13H5zM8 8V6a4 4 0 0 1 8 0v2'),
    hospital: '<rect x="4" y="3" width="16" height="18" rx="2"/>' + P('M12 7v6M9 10h6'),
    dumbbell: P('M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12'),
    flag: P('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7'),
    navigate: P('M3 11 22 2l-9 19-2-8z'),
    eyeOff: P('M10.7 5.1A10.7 10.7 0 0 1 22 12a10.8 10.8 0 0 1-1.5 2.5M14.1 14.2a3 3 0 0 1-4.2-4.2M17.5 17.5A10.8 10.8 0 0 1 2 12a10.8 10.8 0 0 1 4.5-5.1M2 2l20 20'),
    trophy: P('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4'),
    pause: '<circle cx="12" cy="12" r="9"/>' + P('M10 9v6M14 9v6'),
    sliders: P('M4 7h10M18 7h2M4 17h4M12 17h8') + '<circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>' + P('M7 12h.01M17 12h.01'),
    undo: P('M9 14 4 9l5-5') + P('M4 9h10a6 6 0 0 1 0 12h-3'),
    sunrise: P('M12 3v3M5.6 7.6l1.4 1.4M18.4 7.6 17 9M3 15h2M19 15h2M7 15a5 5 0 0 1 10 0M3 19h18'),
  };
  TK.icon = function (name, size = 22, color = 'currentColor', sw = 1.9, fill = 'none') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  };

  /* =========================================================
   * ٣. شوێنەکان (هەولێر) و نرخ
   * ======================================================= */
  // x و y بە کیلۆمەتر، تەنها بۆ مەزەندەکردنی دووری
  const PLACES = [
    { id: 'azadi', name: 'گەڕەکی ئازادی', kind: 'home', x: 0, y: 0 },
    { id: 'iskan', name: 'گەڕەکی ئیسکان', kind: 'home', x: 3, y: 2 },
    { id: 'bakhtiari', name: 'گەڕەکی بەختیاری', kind: 'home', x: 4, y: -1 },
    { id: 'naznaz', name: 'نازناز', kind: 'home', x: 5, y: 3 },
    { id: 'ankawa', name: 'عەینکاوە', kind: 'home', x: 6, y: 6 },
    { id: 's60', name: 'شەقامی ٦٠ مەتری', kind: 'home', x: 2, y: -2 },
    { id: 's100', name: 'شەقامی ١٠٠ مەتری', kind: 'home', x: 4, y: 4 },
    { id: 's30', name: 'شەقامی ٣٠ مەتری', kind: 'home', x: 1, y: -1 },
    { id: 'kurdistan', name: 'گەڕەکی کوردستان', kind: 'home', x: -2, y: 1 },
    { id: 'shaqlawa', name: 'گەڕەکی شەقڵاوە ڕۆد', kind: 'home', x: 6, y: -2 },
    { id: 'dream', name: 'دریم سیتی', kind: 'home', x: 7, y: -3 },
    { id: 'empire', name: 'ئیمپایەر وۆرڵد', kind: 'home', x: 5, y: -5 },
    { id: 'italian', name: 'گوندی ئیتاڵی', kind: 'home', x: 8, y: -1 },
    { id: 'english', name: 'گوندی ئینگلیزی', kind: 'home', x: 8, y: 2 },
    { id: 'roshnbiri', name: 'گەڕەکی ڕۆشنبیری', kind: 'home', x: -1, y: -2 },
    { id: 'brayati', name: 'گەڕەکی برایەتی', kind: 'home', x: -3, y: 0 },
    { id: 'zanyari', name: 'گەڕەکی زانیاری', kind: 'home', x: -4, y: -2 },
    { id: 'mamostayan', name: 'گەڕەکی مامۆستایان', kind: 'home', x: 2, y: 3 },
    { id: 'uni', name: 'زانکۆی سەڵاحەدین', kind: 'school', x: -3, y: -3 },
    { id: 'uni2', name: 'زانکۆی جیهان', kind: 'school', x: 6, y: 1 },
    { id: 'uni3', name: 'زانکۆی کوردستان هەولێر', kind: 'school', x: 7, y: 4 },
    { id: 'edu', name: 'بەڕێوەبەرایەتی پەروەردە', kind: 'work', x: 2, y: -3 },
    { id: 'gov', name: 'پارێزگای هەولێر', kind: 'work', x: 0, y: -3 },
    { id: 'rizgary', name: 'نەخۆشخانەی ڕزگاری', kind: 'hospital', x: -1, y: 2 },
    { id: 'rojhalat', name: 'نەخۆشخانەی ڕۆژهەڵات', kind: 'hospital', x: 4, y: -3 },
    { id: 'park', name: 'پارکی سامی عەبدولڕەحمان', kind: 'work', x: -2, y: -1 },
    { id: 'qala', name: 'قەڵای هەولێر', kind: 'work', x: 1, y: -4 },
    { id: 'family', name: 'فامیلی مۆڵ', kind: 'mall', x: 5, y: -4 },
    { id: 'majidi', name: 'ماجیدی مۆڵ', kind: 'mall', x: 7, y: 1 },
    { id: 'royal', name: 'ڕۆیاڵ مۆڵ', kind: 'mall', x: 3, y: 5 },
    { id: 'airport', name: 'فڕۆکەخانەی هەولێر', kind: 'work', x: -5, y: 5 },
  ].map((p) => ({ ...p, city: 'erbil' })).concat([
    // سلێمانی (x و y جیا لە هەولێر، تەنها بۆ مەزەندەی دووری ناو شار)
    { id: 'sl-salim', name: 'شەقامی سالم', kind: 'home', x: 200, y: 0 },
    { id: 'sl-bakhtyari', name: 'گەڕەکی بەختیاری، سلێمانی', kind: 'home', x: 202, y: 2 },
    { id: 'sl-raparin', name: 'گەڕەکی ڕاپەڕین', kind: 'home', x: 197, y: 3 },
    { id: 'sl-azmar', name: 'گەڕەکی ئازمڕ', kind: 'home', x: 204, y: 5 },
    { id: 'sl-sarchnar', name: 'سەرچنار', kind: 'home', x: 196, y: -3 },
    { id: 'sl-kaniaskan', name: 'گەڕەکی کانیاسکان', kind: 'home', x: 199, y: -2 },
    { id: 'sl-uni', name: 'زانکۆی سلێمانی', kind: 'school', x: 203, y: -1 },
    { id: 'sl-auis', name: 'زانکۆی ئەمریکی سلێمانی', kind: 'school', x: 210, y: 3 },
    { id: 'sl-shar', name: 'نەخۆشخانەی شار', kind: 'hospital', x: 201, y: -1 },
    { id: 'sl-family', name: 'فامیلی مۆڵ، سلێمانی', kind: 'mall', x: 206, y: 2 },
    { id: 'sl-bazar', name: 'بازاڕی سلێمانی', kind: 'work', x: 200, y: 1 },
  ].map((p) => ({ ...p, city: 'sulaimani' })));
  // شارەکان و قەزاکان (لە پانێڵی بەڕێوەبردن دەستکاری دەکرێن)
  const CITIES = [
    { id: 'erbil', name: 'هەولێر', districts: ['ناوەندی شار', 'عەینکاوە', 'خەبات', 'شەقڵاوە', 'سۆران', 'کۆیە', 'مەخموور', 'چۆمان', 'مێرگەسۆر'] },
    { id: 'sulaimani', name: 'سلێمانی', districts: ['ناوەندی شار', 'بازیان', 'تانجەرۆ', 'دوکان', 'ڕانیە', 'پشدەر', 'پێنجوێن', 'شارەزوور', 'چەمچەماڵ', 'دەربەندیخان', 'ماوەت'] },
  ];
  // شێوازەکانی وەرگرتنی موچەی شۆفێر (بەڕێوەبەر زیاد یان ناچالاکیان دەکات)
  const PAY_METHODS = [
    { id: 'fib', name: 'FIB', on: true, account: true, topup: true, yeksaAccount: '', holder: '' },
    { id: 'fastpay', name: 'FastPay', on: true, account: true, topup: true, yeksaAccount: '', holder: '' },
    { id: 'cash', name: 'کاش', on: true, account: false, topup: true },
  ];
  TK.PAY_METHODS_DEFAULTS = PAY_METHODS;
  TK.payMethods = () => (state && state.payMethods && state.payMethods.length ? state.payMethods : PAY_METHODS);
  TK.payMethod = (id) => TK.payMethods().find((m) => m.id === id) || null;
  TK.payName = (id) => (TK.payMethod(id) || {}).name || id || '-';
  /** شێوازی موچەی ئێستای شۆفێر وەک یەک دەق (بۆ بەراوردکردن لەگەڵ ئەوەی بەڕێوەبەر پشتڕاستی کردووەتەوە) */
  const payKey = (d) => `${d.payMethod || ''}|${d.payAccount || ''}`;
  TK.payKey = payKey;
  /** ئایا شێوازی موچە گۆڕاوە و بەڕێوەبەر هێشتا پشتڕاستی نەکردووەتەوە (payAckFor تەنها بەڕێوەبەر دەینووسێت) */
  TK.payUnconfirmed = (d) => !!d && (d.payAckFor != null ? d.payAckFor !== payKey(d) : !!d.payChangedAt);
  TK.cities = () => (state && state.cities && state.cities.length ? state.cities : CITIES);
  TK.city = (id) => TK.cities().find((c) => c.id === id) || null;
  TK.CITIES_DEFAULTS = CITIES;
  const allPlaces = () => (state && state.places && state.places.length ? state.places : PLACES);
  Object.defineProperty(TK, 'PLACES', { get: allPlaces });
  TK.PLACES_DEFAULTS = PLACES;
  /** شوێنی ناو لیست، یان شوێنێکی نووسراو بە دەست (c:ناو) */
  TK.place = (id) => {
    if (!id) return null;
    if (String(id).startsWith('c:')) return { id, name: id.slice(2), kind: 'custom' };
    return allPlaces().find((p) => p.id === id) || null;
  };
  // بۆ گەڕان: پیتە عەرەبی و کوردییەکان یەک دەخرێن و بۆشایی لادەبرێت
  const norm = (t) =>
    String(t || '')
      .replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/[ةہھه]/g, 'ە').replace(/[ؤ]/g, 'و').replace(/[أإآ]/g, 'ا')
      .replace(/[ڕ]/g, 'ر').replace(/[ڵ]/g, 'ل').replace(/[ێ]/g, 'ی').replace(/[ۆ]/g, 'و').replace(/[\u064B-\u0652\u200c\s·\-]/g, '')
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .toLowerCase();
  TK.normalize = norm;
  /** گەڕانی شوێن: «بەخت» ← گەڕەکی بەختیاری */
  TK.searchPlaces = function (q, exclude) {
    const n = norm(q);
    // تەنها شوێنەکانی شاری سەرنشین
    const city = state && state.passenger && state.passenger.city;
    const pool = allPlaces().filter((p) => p.id !== exclude && (!city || (p.city || 'erbil') === city));
    if (!n) return pool.slice(0, 6);
    const scored = pool
      .map((p) => {
        const name = norm(p.name);
        const words = p.name.split(' ').map(norm);
        const score = name.startsWith(n) ? 0 : words.some((w) => w.startsWith(n)) ? 1 : name.includes(n) ? 2 : 9;
        return { p, score };
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score);
    return scored.map((x) => x.p).slice(0, 6);
  };
  TK.placeIcon = (kind) => ({ home: 'home', school: 'school', work: 'briefcase', hospital: 'hospital', mall: 'mall', gym: 'dumbbell' }[kind] || 'pin');

  const round5k = (n) => Math.max(40000, Math.round(n / 5000) * 5000);

  /** شوێنی سەر نەخشە {lat, lng} یان null */
  const isGeo = (g) => !!g && typeof g.lat === 'number' && typeof g.lng === 'number' && isFinite(g.lat) && isFinite(g.lng);
  TK.isGeo = isGeo;
  /** دووری هێڵی ڕاست بە کیلۆمەتر لە نێوان دوو شوێنی سەر نەخشە */
  TK.geoKm = function (a, b) {
    if (!isGeo(a) || !isGeo(b)) return null;
    const R = 6371;
    const r = (d) => (d * Math.PI) / 180;
    const dLat = r(b.lat - a.lat);
    const dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  /** شوێنی سەر نەخشەی شوێنێکی ناو لیست (ئەگەر بەڕێوەبەر دیاری کردبێت) */
  TK.placeGeo = (id) => {
    const p = TK.place(id);
    return p && isGeo(p) ? { lat: p.lat, lng: p.lng } : null;
  };
  /** دووری بە کیلۆمەتر (ڕێگای شار ≈ ١.٣ × هێڵی ڕاست). ئەگەر شوێنی سەر نەخشە هەبێت، ئەوە بەکاردێت */
  TK.distance = function (fromId, toId, ga, gb) {
    const g1 = isGeo(ga) ? ga : TK.placeGeo(fromId);
    const g2 = isGeo(gb) ? gb : TK.placeGeo(toId);
    const km = TK.geoKm(g1, g2);
    if (km != null) return Math.max(1.5, km * 1.3);
    const a = TK.place(fromId);
    const b = TK.place(toId);
    if (!a || !b || a.x == null || b.x == null) return 6; // شوێنی نووسراو بە دەست: مەزەندەی ناوەند
    return Math.max(1.5, Math.hypot(a.x - b.x, a.y - b.y) * 1.3);
  };

  /**
   * نرخی پێشنیارکراوی مانگانە
   * - بنەڕەت: ٥٠٬٠٠٠ + ٧٬٠٠٠ بۆ هەر کیلۆمەترێک، بۆ ٥ ڕۆژ لە هەفتەدا
   * - تەنها چوون (بێ گەڕانەوە): ٦٠٪
   * - تەکسی تایبەت: +٤٠٪، گەشتی منداڵان: +١٠٪ (چاودێری)
   * - چەند کەس لە یەک تەکسی: کەسی دووەم بەدواوە ٧٠٪
   */
  /* ---------- کاتی جیاواز بۆ هەر ڕۆژێک ----------
   * perDay: { "0".."6": { go: "07:30"|null, back: "14:00"|null } } (ژمارەی ڕۆژ وەک fmt.WEEKDAYS: ٠ = شەممە)
   * کاتێک هەیە، تەنها ئەو ڕۆژانەی تێیدان گەشتیان هەیە. go و back ـی بەشدارییەکە کاتی باوترینە (بۆ ڕۆت و نیشاندان). */
  const hasPerDay = (x) => !!(x && x.perDay && Object.keys(x.perDay).length);
  TK.hasPerDay = hasPerDay;
  /** ڕێکخستنی perDay: ڕۆژە بەتاڵەکان لادەبرێن، days و کاتی باوتر دروست دەکرێنەوە */
  TK.normPerDay = function (pd) {
    const out = {};
    const days = [false, false, false, false, false, false, false];
    Object.keys(pd || {}).forEach((k) => {
      const e = pd[k] || {};
      const go = e.go || null;
      const back = e.back || null;
      if (!go && !back) return;
      out[k] = { go, back };
      days[+k] = true;
    });
    const mode = (arr) => {
      const n = {};
      arr.filter(Boolean).forEach((v) => (n[v] = (n[v] || 0) + 1));
      return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b))[0] || null;
    };
    const vals = Object.values(out);
    return { perDay: out, days, go: mode(vals.map((e) => e.go)), back: mode(vals.map((e) => e.back)), empty: !vals.length };
  };
  /** ڕێژەی هەفتانە بەراورد بە «٥ ڕۆژ چوون و هاتنەوە» (بۆ نرخ و قەرەبوو) */
  function weekFactor(d) {
    const c = cfg();
    if (hasPerDay(d)) {
      const vals = Object.values(d.perDay);
      const both = vals.filter((e) => e.go && e.back).length;
      const one = vals.filter((e) => !!e.go !== !!e.back).length;
      return Math.max(0.2, (both + one * c.oneWayFactor) / 5);
    }
    const dayCount = (d.days || []).filter(Boolean).length || 1;
    const oneWay = d.oneWay != null ? d.oneWay : !(d.go && d.back);
    return (dayCount / 5) * (oneWay ? c.oneWayFactor : 1);
  }
  /** ژمارەی گەشتەکانی هەفتەیەک (هەر چوون یان هاتنەوەیەک یەک گەشتە) */
  TK.legsPerWeek = function (x) {
    if (hasPerDay(x)) return Object.values(x.perDay).reduce((n, e) => n + (e.go ? 1 : 0) + (e.back ? 1 : 0), 0);
    return (x.days || []).filter(Boolean).length * ((x.go ? 1 : 0) + (x.back ? 1 : 0));
  };
  TK.priceFor = function (d) {
    const km = d.km != null ? d.km : TK.distance(d.fromId, d.toId, d.fromGeo, d.toGeo);
    const c = cfg();
    let per = (c.basePrice + km * c.perKm) * weekFactor(d);
    if (d.rideType === 'private') per *= c.privateFactor;
    if (d.rideType === 'family') per *= c.familyFactor;
    if (d.hasChild) per *= c.kidsFactor;
    const n = Math.max(1, d.riders || 1);
    const total = d.mode === 'separate' ? per : per * (1 + c.extraRiderFactor * (n - 1));
    return round5k(total);
  };
  TK.offerBounds = function (price) {
    const r = cfg().offerRange;
    return { min: round5k(price * (1 - r)), max: round5k(price * (1 + r)) };
  };

  /* =========================================================
   * ٤. زانیاری سەرەتایی (بەتاڵ)
   * ======================================================= */

  const MONTH_KEY = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const TODAY = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  TK.monthKey = () => MONTH_KEY();
  /** زانیاری تایبەتی هەر سەرنشینێک (کاتی گۆڕینی هەژمار هەڵدەگیرێت لە vault) */
  const PRIV = ['passenger', 'family', 'notices', 'readNoticesAt', 'rewards', 'billing', 'tickets', 'history', 'seenNews', 'pins'];
  function emptyPassenger(name = '', phone = '') {
    const first = name.split(' ')[0] || '';
    return {
      passenger: { onboarded: true, loggedIn: false, name, phone, homeId: '', city: 'erbil', photo: null },
      family: { members: name ? [{ id: 'm' + uid(), name: first, initial: name.slice(0, 1), kind: 'adult', relation: 'خاوەن ئەکاونت' }] : [], guardians: name ? [{ name: `${first} (تۆ)`, initial: name.slice(0, 1) }] : [] },
      notices: [],
      readNoticesAt: 0,
      rewards: { points: 0, code: '', redeemed: [], pending: [], used: [] },
      billing: { month: fmt.MONTHS[new Date().getMonth()], monthKey: MONTH_KEY(), adjustments: [], method: 'cash', paid: false, promo: null, history: [] },
      tickets: [],
      history: [],
      seenNews: [],
      // شوێنی وردی سەر نەخشە بۆ هەر داواکارییەک (تەنها خۆی و بەڕێوەبەر دەیبینن): { reqId: { from, to } }
      pins: {},
    };
  }
  function createSeed() {
    const p = emptyPassenger();
    p.passenger.onboarded = false;
    return {
      v: STATE_VERSION,
      settings: { theme: 'auto', textScale: 'md', digits: 'ku', mapStyle: 'brand', notify: { ride: true, pay: true, news: true } },
      admin: null, // یەکەم جار خاوەنی ئەپ ناو و وشەی نهێنی دادەنێت
      accounts: [],
      ...p,
      vault: {},
      drivers: [],
      driver: { meId: null },
      places: JSON.parse(JSON.stringify(PLACES)),
      cities: JSON.parse(JSON.stringify(CITIES)),
      payMethods: JSON.parse(JSON.stringify(PAY_METHODS)),
      config: {},
      ledger: [],
      payouts: [],
      wallet: [],
      topups: [],
      withdraws: [],
      reports: [],
      broadcasts: [],
      news: [],
      subscriptions: [],
      routes: [],
      driverLog: [],
      trips: [],
      day: TODAY(),
      requests: [],
      dnotices: [],
      adminNotices: [],
      messages: [],
      swaps: [],
      partners: [],
      partnerEarnings: [],
      partnerPays: [],
      referrals: [],
      unsent: [],
    };
  }
  TK.createSeed = createSeed;

  /* ---------- هاوبەشەکان (قوتابخانە، زانکۆ، کۆمپانیا) ----------
   * هەر سەرنشینێک بە کۆد یان QR دەبەسترێتەوە بە هاوبەشێک. کاتێک فاتورەی مانگ دەدرێت،
   * ڕێژەی هاوبەش (بۆ نموونە ٣٪) لە پارەی دراو حیساب دەکرێت و لە قازانجی یەکسا دەردەچێت. */
  function seedPartners(s) {
    s.partners = s.partners || [];
    s.partnerEarnings = s.partnerEarnings || [];
    s.partnerPays = s.partnerPays || [];
    return s;
  }
  TK.seedPartners = seedPartners;
  /** تۆمارکردنی پشکی هاوبەش کاتێک سەرنشین فاتورەکەی دەدات (لەناو update) */
  function partnerEarn(s, phone, name, month, paid) {
    const acc = (s.accounts || []).find((a) => a.phone === phone);
    if (!acc || !acc.partnerId || !paid) return;
    const pt = (s.partners || []).find((x) => x.id === acc.partnerId);
    if (!pt || pt.status !== 'active') return;
    // ئەگەر ڕێککەوتن بۆ چەند مانگێکی دیاریکراوە (لە ڕۆژی تۆمارکردنی سەرنشینەوە)
    if (pt.months && acc.createdAt && Date.now() - acc.createdAt > pt.months * 30.5 * 24 * 3600000) return;
    s.partnerEarnings = s.partnerEarnings || [];
    s.partnerEarnings.unshift({ id: 'pe' + uid(), partnerId: pt.id, phone, name, month, paid, pct: pt.pct, amount: Math.round((paid * pt.pct) / 100), at: Date.now(), settled: null });
  }
  TK.partnerByCode = (code) => {
    const c = String(code || '').trim().toUpperCase();
    return c ? (state.partners || []).find((p) => p.code === c && p.status === 'active') : null;
  };
  TK.partner = (id) => (state.partners || []).find((p) => p.id === id);
  /** کۆدی بانگهێشت دەناسێتەوە: { partner } یان { friend: {uid, name, code} } یان { bad: true }. بەتاڵ = null */
  const inviteCache = new Map();
  TK.resolveInvite = async function (code) {
    const c = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!c) return null;
    const partner = TK.partnerByCode(c);
    if (partner) return { partner };
    if (!/^[A-Z0-9]{4,10}$/.test(c)) return { bad: true };
    if (inviteCache.has(c)) return inviteCache.get(c);
    let out = { bad: true };
    try {
      const d = window.TKFB && window.TKFB.get ? await window.TKFB.get('refcodes/' + c) : null;
      if (d && d.uid) out = { friend: { uid: d.uid, name: d.name || '', code: c } };
    } catch (e) {
      return { bad: true, offline: true };
    }
    inviteCache.set(c, out);
    return out;
  };
  /** کۆدی بانگهێشتی تایبەت (وەک YK7Q4M) بۆ سەرنشینی ئێستا، یەک جار دروست دەکرێت و دووبارە نابێتەوە */
  let refBusy = false;
  TK.ensureRefCode = async function () {
    if (refBusy || ROLE !== 'passenger' || !cloud.me || !window.TKFB || !window.TKFB.get) return;
    const r = state.rewards || {};
    if (r.code && r.codeOk) return;
    refBusy = true;
    try {
      for (let i = 0; i < 6; i++) {
        const code = TK.newRefCode();
        await window.TKFB.write({ op: 'create', path: 'refcodes/' + code, data: { uid: cloud.me, name: (state.passenger.name || '').split(' ')[0] } });
        const got = await window.TKFB.get('refcodes/' + code);
        if (got && got.uid === cloud.me) {
          update((s) => {
            s.rewards.code = code;
            s.rewards.codeOk = true;
          });
          return;
        }
      }
    } catch (e) {
      /* دواتر هەوڵ دەدرێتەوە */
    } finally {
      refBusy = false;
    }
  };
  /** ئاماری هاوبەشێک: سەرنشینەکان، پشکی ئەم مانگە، کۆ، دراو و ماوە */
  TK.partnerStats = function (s, id) {
    const d = new Date();
    const inMonth = (t) => new Date(t).getMonth() === d.getMonth() && new Date(t).getFullYear() === d.getFullYear();
    const earn = (s.partnerEarnings || []).filter((e) => e.partnerId === id);
    const pays = (s.partnerPays || []).filter((p) => p.partnerId === id);
    const total = earn.reduce((n, e) => n + e.amount, 0);
    const paidOut = pays.reduce((n, p) => n + p.amount, 0);
    return {
      riders: (s.accounts || []).filter((a) => a.partnerId === id),
      earn, pays, total, paidOut,
      balance: Math.max(0, total - paidOut),
      month: earn.filter((e) => inMonth(e.at)).reduce((n, e) => n + e.amount, 0),
      monthPaidIn: earn.filter((e) => inMonth(e.at)).reduce((n, e) => n + e.paid, 0),
    };
  };

  /* =========================================================
   * ٥. ستۆر: Firebase (Firestore + Auth)
   * ---------------------------------------------------------
   * هەموو زانیارییەکان لە Firestore دان و هەر کەسێک تەنها ئەوەی خۆی دادەبەزێنێت:
   *  - سەرنشین: بەشداری، گەشت، داواکاری و نامەکانی خۆی (ژمارەی کەسانی تر نابینێت)
   *  - شۆفێر: سەرنشینەکانی خۆی (بێ ژمارەی مۆبایل)، داواکارییە کراوەکان
   *  - بەڕێوەبەر: هەموو شتێک
   * ناوەوەی ئەپ وەک پێشوو کار دەکات (state)؛ ئەم بەشە state لە بەڵگەنامەکانی Firestore دروست دەکات
   * و دوای هەر گۆڕانکارییەک تەنها بەڵگەنامە گۆڕاوەکان دەنووسێتەوە.
   * سەرنشینی ئێستا لە ناو ئەپدا «me»ـە، لە Firestore بە UIDـی خۆی.
   * ======================================================= */
  let state = null;
  const listeners = new Set();
  const ROLE = (() => {
    const p = location.pathname;
    if (/\/driver\//.test(p)) return 'driver';
    if (/\/admin\//.test(p)) return 'admin';
    if (/\/passenger\//.test(p)) return 'passenger';
    return 'home';
  })();
  TK.role = ROLE;
  const FBC = window.TK_FIREBASE || {};
  const ADMINS = FBC.admins || [];
  /** ژمارەی مۆبایل ← ئیمەیڵی ناوخۆیی (سەرنشین و شۆفێر هەژماری جیایان هەیە) */
  const emailOf = (phone, kind) => `${phone}@${kind}.taxikam.app`;
  TK.emailOf = emailOf;
  /** چوونەژوورەوە بە ژمارە. ئەگەر هەژمارێکی کۆن بە ژمارەی 0 ـدار دروست کرابێت (بۆ نموونە لە Firebase Console)، ئەویش تاقی دەکرێتەوە */
  async function signInPhone(p, kind, pass) {
    try {
      return await window.TKFB.signIn(emailOf(p, kind), pass);
    } catch (e) {
      if (!/user-not-found|invalid-credential|invalid-login/.test(String(e && (e.code || e.message)))) throw e;
      try {
        return await window.TKFB.signIn(emailOf('0' + p, kind), pass);
      } catch (e2) {
        throw e;
      }
    }
  }

  /* ---------- زانیاری ناوخۆیی ئەم ئامێرە (ڕووکار، قەبارەی نووسین) ---------- */
  const LOCAL_KEY = 'taxikam:local:v1';
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
    // ڕێکخستنەکانی وەشانی پێشوو (بێ سێرڤەر) دەهێنرێنەوە
    if (!local.settings) {
      const old = JSON.parse(localStorage.getItem('taxikam:data:v6') || 'null');
      if (old && old.settings) local.settings = old.settings;
    }
  } catch (e) {
    local = {};
  }
  function saveLocal(s) {
    local = { settings: s.settings, onboarded: !!(s.passenger && s.passenger.onboarded) };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    } catch (e) {
      /* هیچ */
    }
  }

  /* ---------- کۆلێکشنەکان ---------- */
  // لیستەکانی ناو state ← کۆلێکشن (1 = کۆن لە سەرەتا، -1 = نوێ لە سەرەتا)
  const ARR = {
    requests: -1, subscriptions: 1, trips: 1, routes: 1, messages: 1, swaps: -1, dnotices: -1, adminNotices: -1,
    reports: -1, ledger: -1, payouts: -1, driverLog: -1, news: -1, broadcasts: -1, partners: 1, partnerEarnings: -1, partnerPays: -1,
    referrals: -1, // بانگهێشتی هاوڕێ (ئەحمەد و ئاراس هەردووکیان دەیبینن)
    unsent: -1, // دەقی ڕاستەقینەی نامە گەڕێنراوەکان (تەنها بەڕێوەبەر دەیبینێت)
    wallet: -1, // دەفتەری جزدان: هەر دێڕێک ناسڕێتەوە و ناگۆڕدرێت
    topups: -1, // داواکاری پڕکردنەوەی جزدان (سەرنشین یان شۆفێر، role) و گەڕاندنەوەی بەشداری
    withdraws: -1, // داوای ڕاکێشانی پارە (driverId = خاوەنەکەی، شۆفێر یان سەرنشین، role)
  };
  // زانیاری تایبەتی شۆفێر کە تەنها خۆی و بەڕێوەبەر دەیبینن (بەڵگەنامە، ناونیشان، موچە)
  const SENS = new Set([
    'birth', 'idNo', 'idExpiry', 'idFront', 'idBack', 'licNo', 'licClass', 'licExpiry', 'licFront', 'licBack', 'regNo', 'regExpiry', 'regPhoto',
    'secPhoto', 'secDate', 'emergencyName', 'emergencyPhone', 'district', 'neighborhood', 'landmark', 'payMethod', 'payAccount',
    'docStatus', 'docReason', 'termsAt', 'terms', 'readNoticesAt', 'carFront', 'carBack', 'carLeft', 'carRight', 'carInside', 'addedByAdmin', 'gender',
    'payChangedAt', 'payAckAt', 'payAckFor', 'payPrev', 'deleteRequestedAt', 'tickets',
  ]);
  // بەشی تایبەتی سەرنشین (pax/{uid})؛ ئاگادارکردنەوە و مێژوو کۆلێکشنی جیان
  const PAX_FIELDS = ['passenger', 'family', 'readNoticesAt', 'rewards', 'billing', 'tickets', 'seenNews', 'pins'];
  // هەر ڕۆڵێک دەتوانێت چی بنووسێت: rw = دروستکردن/گۆڕین/سڕینەوە، c = تەنها دروستکردن، u = تەنها گۆڕین
  const ALL_RW = Object.keys(ARR).concat(['meta', 'pax', 'accounts', 'drivers', 'dpub', 'pnotices', 'phistory']).reduce((o, k) => ((o[k] = 'rw'), o), {});
  const MODES = {
    passenger: { pax: 'rw', accounts: 'rw', requests: 'rw', subscriptions: 'rw', trips: 'rw', routes: 'rw', messages: 'rw', swaps: 'rw', pnotices: 'rw', phistory: 'rw', dnotices: 'c', adminNotices: 'c', reports: 'c', ledger: 'c', partnerEarnings: 'c', dpub: 'u', unsent: 'c', referrals: 'rw', wallet: 'c', topups: 'rw', withdraws: 'rw' },
    driver: { drivers: 'rw', dpub: 'rw', requests: 'rw', subscriptions: 'rw', trips: 'rw', routes: 'rw', messages: 'rw', swaps: 'rw', dnotices: 'rw', driverLog: 'rw', pnotices: 'c', phistory: 'c', adminNotices: 'c', ledger: 'c', unsent: 'c', wallet: 'c', withdraws: 'rw', topups: 'rw' },
    admin: ALL_RW,
    home: {},
  };

  const cloud = {
    on: false, // Firebase ئامادەیە
    authKnown: false,
    user: null,
    me: null, // UID
    docs: new Map(), // path → { data, holders: Set, opt }
    subs: new Map(), // listenerId → unsubscribe
    waiting: new Set(), // ئەو گوێگرانەی هێشتا یەکەم وەڵامیان نەهاتووە
    unsynced: new Set(), // ئەو گوێگرانەی هێشتا وەڵامی سێرڤەریان نەهاتووە (تەنها بیرگەی ناوخۆ)
    retry: new Map(), // «create»ـە نەنێردراوەکان (بێ ئینتەرنێت)
    ready: false,
    error: null,
    pending: Promise.resolve(),
  };
  TK.cloud = cloud;

  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (v[k] !== undefined) o[k] = sortKeys(v[k]);
      });
      return o;
    }
    return v;
  }
  const stable = (v) => JSON.stringify(sortKeys(v));

  function modeOf(path) {
    const [col, id] = path.split('/');
    const m = (MODES[ROLE] || {})[col];
    if (ROLE === 'driver' && col === 'dpub' && id !== cloud.me) return 'u';
    if (ROLE === 'driver' && col === 'drivers' && id !== cloud.me) return null;
    return m || null;
  }

  /** کێ دەتوانێت ئەم تۆمارە بخوێنێتەوە (UIDـی سەرنشین و شۆفێر). بەڕێوەبەر هەمیشە دەتوانێت */
  function aclOf(K, it, c, prev) {
    const own = (subId) => (c.subscriptions.find((x) => x.id === subId) || {}).owner;
    let r = [];
    if (K === 'requests') r = [it.owner, it.target !== 'all' ? it.target : null, it.chosenDriverId].concat((it.offers || []).map((o) => o.driverId));
    else if (K === 'subscriptions') r = [it.owner, it.driverId];
    else if (K === 'trips') r = [it.owner, it.driverId, it.originalDriverId];
    else if (K === 'routes') r = [it.driverId].concat((it.subIds || []).map(own));
    else if (K === 'messages') r = [it.driverId, it.peer];
    else if (K === 'swaps') r = [it.fromDriverId, it.takenBy].concat(c.trips.filter((t) => t.swapId === it.id || t.id === it.tripId || (it.runId && t.runId === it.runId)).map((t) => t.owner));
    else if (K === 'dnotices' || K === 'ledger' || K === 'payouts') r = [it.driverId];
    else if (K === 'driverLog') r = [it.driverId, it.originalDriverId];
    else if (K === 'referrals') r = [it.inviter, it.invitee];
    else if (K === 'wallet') r = [it.who].concat(it.type === 'monthpay' || it.type === 'legacy' ? (it.lines || []).map((l) => l.driverId) : it.type === 'xfer' ? [it.to] : []);
    else if (K === 'topups') r = [it.owner];
    else if (K === 'withdraws') r = [it.driverId];
    // ئەوانەی هەموو بەشەکانی نابینن، دەستکاری لیستی خوێنەران ناکەن (تەنها زیاد دەکەن)
    const partial = (K === 'routes' && ROLE !== 'driver' && ROLE !== 'admin') || K === 'swaps';
    if (partial && prev && prev._r) r = r.concat(prev._r);
    return [...new Set(r.filter((x) => x && x !== 'me'))].sort();
  }

  /** ناوی سەرنشینێک بۆ ئەوانەی هەژمارەکەی نابینن (تەنها ناوی یەکەم) */
  function ownerName(s, pk) {
    const a = s.accounts.find((x) => x.uid === pk);
    if (a) return a.name;
    const r = s.requests.find((x) => x.owner === pk && x.ownerName);
    if (r) return r.ownerName;
    const x = s.subscriptions.find((y) => y.owner === pk && y.ownerName);
    return x ? x.ownerName : '';
  }

  /** دروستکردنی state لە بەڵگەنامەکانی Firestore */
  function compose() {
    const s = createSeed();
    if (local.settings) Object.assign(s.settings, local.settings);
    s.passenger.onboarded = !!local.onboarded;
    s.day = TODAY();
    const by = {};
    cloud.docs.forEach((e, path) => {
      const i = path.indexOf('/');
      const col = path.slice(0, i);
      (by[col] = by[col] || []).push({ id: path.slice(i + 1), data: e.data });
    });
    const strip = (x) => {
      const o = clone(x.data) || {};
      delete o._r;
      if (o.id == null) o.id = x.id;
      return o;
    };
    const meta = (by.meta || []).find((x) => x.id === 'app');
    if (meta) {
      const m = meta.data || {};
      if (m.places && m.places.length) s.places = m.places;
      if (m.cities && m.cities.length) s.cities = m.cities;
      s.config = m.config || {};
      if (m.payMethods && m.payMethods.length) s.payMethods = m.payMethods;
      s.lastBackupAt = m.lastBackupAt || null;
    }
    Object.keys(ARR).forEach((K) => {
      s[K] = (by[K] || []).map(strip).sort((a, b) => ARR[K] * ((a._t || 0) - (b._t || 0)) || String(a.id).localeCompare(String(b.id)));
    });
    // شۆفێر: بەشی گشتی (dpub) + بەشی تایبەت (drivers) ئەگەر دەستمان پێی بگات
    const priv = {};
    (by.drivers || []).forEach((x) => (priv[x.id] = strip(x)));
    s.drivers = (by.dpub || []).map((x) => Object.assign(strip(x), priv[x.id] || {})).sort((a, b) => (a._t || 0) - (b._t || 0) || String(a.id).localeCompare(String(b.id)));
    s.accounts = (by.accounts || []).map((x) => Object.assign(strip(x), { uid: x.id })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    s.accounts.forEach((a) => delete a.id);
    // سەرنشینەکان
    const notes = {};
    const hist = {};
    (by.pnotices || []).forEach((x) => {
      const n = strip(x);
      (notes[n.owner] = notes[n.owner] || []).push(n);
    });
    (by.phistory || []).forEach((x) => {
      const h = strip(x);
      (hist[h.owner] = hist[h.owner] || []).push(h);
    });
    (by.pax || []).forEach((x) => {
      const v = Object.assign(emptyPassenger(), strip(x));
      delete v.id;
      s.vault[x.id] = v;
    });
    // ئەو سەرنشینانەی تەنها ناویان دەزانین (بۆ ئاگادارکردنەوە و مێژوو کە شۆفێر بۆیان دەنووسێت)
    const owners = new Set(Object.keys(notes).concat(Object.keys(hist)));
    s.subscriptions.forEach((x) => owners.add(x.owner));
    s.requests.forEach((r) => owners.add(r.owner));
    s.messages.forEach((m) => owners.add(m.peer));
    s.trips.forEach((t) => {
      owners.add(t.owner);
      (t.stops || []).forEach((st) => (st.parts || []).forEach((p) => owners.add(p.owner)));
    });
    owners.forEach((pk) => {
      if (!pk || pk === 'me' || s.vault[pk]) return;
      const v = emptyPassenger();
      v.__stub = true;
      v.passenger.name = ownerName(s, pk);
      s.vault[pk] = v;
    });
    Object.keys(s.vault).forEach((pk) => {
      s.vault[pk].notices = (notes[pk] || []).sort((a, b) => (b.at || 0) - (a.at || 0));
      s.vault[pk].history = (hist[pk] || []).sort((a, b) => (b.date || 0) - (a.date || 0));
    });
    if (ROLE === 'passenger' && cloud.me) {
      // سەرنشینی ئێستا دەبێت بە «me»
      let mine = s.vault[cloud.me];
      delete s.vault[cloud.me];
      if (!mine || mine.__stub) {
        const st = emptyPassenger();
        st.notices = (mine && mine.notices) || [];
        st.history = (mine && mine.history) || [];
        mine = st;
      }
      PRIV.forEach((k) => (s[k] = mine[k] !== undefined ? mine[k] : emptyPassenger()[k]));
      s.passenger = Object.assign({}, s.passenger, { loggedIn: true, onboarded: true });
      retag(s, cloud.me, 'me');
    }
    if (ROLE === 'driver' && cloud.me && s.drivers.some((d) => d.id === cloud.me)) s.driver.meId = cloud.me;
    return s;
  }

  /** state ← شێوەی Firestore (سەرنشینی ئێستا لە «me»ـەوە دەگۆڕدرێت بۆ UID) */
  function canonical(st) {
    const c = clone(st);
    if (ROLE === 'passenger' && cloud.me) {
      retag(c, 'me', cloud.me);
      const mine = {};
      PRIV.forEach((k) => (mine[k] = c[k]));
      mine.passenger = Object.assign({}, mine.passenger);
      delete mine.passenger.loggedIn;
      delete mine.passenger.onboarded;
      c.vault[cloud.me] = mine;
    }
    return c;
  }

  /** کاتی دروستبوون (_t) بۆ ڕیزبەندی، تەنها بۆ تۆماری نوێ */
  function stamp(st) {
    const base = Date.now() * 1000;
    const run = (K, arr, dir) => {
      const fresh = [];
      (arr || []).forEach((it) => {
        if (!it || it._t != null) return;
        const k = cloud.docs.get(`${K}/${it.id}`);
        if (k && k.data && k.data._t != null) it._t = k.data._t;
        else fresh.push(it);
      });
      fresh.forEach((it, i) => (it._t = base + (dir > 0 ? i : fresh.length - i)));
    };
    Object.keys(ARR).forEach((K) => run(K, st[K], ARR[K]));
    run('dpub', st.drivers, 1);
  }

  /** state ← بەڵگەنامەکانی Firestore (Map: path → data) */
  function toDocs(c) {
    const out = new Map();
    const prev = (p) => {
      const e = cloud.docs.get(p);
      return e && e.data;
    };
    Object.keys(ARR).forEach((K) =>
      (c[K] || []).forEach((it) => {
        if (!it || it.id == null || String(it.id).includes('/')) return;
        const path = `${K}/${it.id}`;
        const d = Object.assign({}, it);
        d._r = aclOf(K, it, c, prev(path));
        out.set(path, d);
      })
    );
    (c.drivers || []).forEach((d) => {
      if (!d || !d.id) return;
      const pub = {};
      const pv = {};
      Object.keys(d).forEach((k) => {
        if (k === 'pass' || k === 'pass2') return;
        (SENS.has(k) ? pv : pub)[k] = d[k];
      });
      pv.id = d.id;
      out.set('dpub/' + d.id, pub);
      if (ROLE === 'admin' || d.id === cloud.me || cloud.docs.has('drivers/' + d.id)) out.set('drivers/' + d.id, pv);
    });
    (c.accounts || []).forEach((a) => {
      if (!a || !a.uid) return;
      const x = Object.assign({}, a);
      delete x.pass;
      delete x.uid;
      out.set('accounts/' + a.uid, x);
    });
    Object.keys(c.vault || {}).forEach((pk) => {
      const v = c.vault[pk];
      if (!v || pk === 'me') return;
      if (!v.__stub) {
        const p = {};
        PAX_FIELDS.forEach((k) => v[k] !== undefined && (p[k] = v[k]));
        out.set('pax/' + pk, p);
      }
      (v.notices || []).forEach((n) => n && n.id != null && out.set('pnotices/' + n.id, Object.assign({}, n, { owner: pk, _r: [pk] })));
      (v.history || []).forEach((h) => h && h.id != null && out.set('phistory/' + h.id, Object.assign({}, h, { owner: pk, _r: [pk] })));
    });
    if (ROLE === 'admin') out.set('meta/app', { places: c.places, cities: c.cities, config: c.config || {}, payMethods: c.payMethods || PAY_METHODS, lastBackupAt: c.lastBackupAt || null });
    return out;
  }

  /** گۆڕانکاری خانەکان: تەنها ئەوەی گۆڕاوە. لیستی زیادکراو بە arrayUnion (بۆ ئەوەی دوو کەس پێکەوە بنووسن) */
  function fieldDiff(o, n) {
    const u = {};
    let any = false;
    new Set(Object.keys(o).concat(Object.keys(n))).forEach((k) => {
      if (!(k in n) || n[k] === undefined) {
        if (k in o) {
          u[k] = { __del: 1 };
          any = true;
        }
        return;
      }
      const a = o[k];
      const b = n[k];
      if (k === '_r' && Array.isArray(a) && Array.isArray(b)) {
        const as = a.slice().sort();
        const bs = b.slice().sort();
        if (stable(as) === stable(bs)) return;
        if (as.every((x) => bs.includes(x))) {
          u[k] = { __union: bs.filter((x) => !as.includes(x)) };
          any = true;
          return;
        }
        u[k] = b;
        any = true;
        return;
      }
      if (stable(a) === stable(b)) return;
      if (Array.isArray(a) && Array.isArray(b)) {
        const as = a.map(stable);
        const bs = b.map(stable);
        const uniq = new Set(bs).size === bs.length && new Set(as).size === as.length;
        // تەنها زیادکراو لە کۆتایی
        if (uniq && bs.length > as.length && as.every((x, i) => x === bs[i])) {
          u[k] = { __union: clone(b.slice(as.length)) };
          any = true;
          return;
        }
        // تەنها لابراو (ڕیزبەندی وەک خۆی)
        if (uniq && bs.length < as.length) {
          let j = 0;
          as.forEach((x) => {
            if (j < bs.length && x === bs[j]) j++;
          });
          if (j === bs.length) {
            u[k] = { __remove: a.filter((x, i) => !bs.includes(as[i])).map(clone) };
            any = true;
            return;
          }
        }
      }
      u[k] = clone(b);
      any = true;
    });
    return any ? u : null;
  }
  function applyFields(data, u) {
    const d = clone(data) || {};
    Object.keys(u).forEach((k) => {
      const v = u[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && (v.__del || v.__union || v.__remove)) {
        if (v.__del) delete d[k];
        else if (v.__union) {
          const cur = Array.isArray(d[k]) ? d[k] : [];
          const have = cur.map(stable);
          v.__union.forEach((x) => !have.includes(stable(x)) && cur.push(clone(x)));
          d[k] = cur;
        } else {
          const rm = v.__remove.map(stable);
          d[k] = (Array.isArray(d[k]) ? d[k] : []).filter((x) => !rm.includes(stable(x)));
        }
      } else d[k] = clone(v);
    });
    return d;
  }

  /** نووسینی گۆڕانکارییەکان بۆ Firestore (تەنها بەڵگەنامە گۆڕاوەکان) */
  /** هەموو گوێگرەکان وەڵامی سێرڤەریان هاتووە (نەک تەنها بیرگەی ناوخۆ) */
  const synced = () => cloud.ready && !cloud.unsynced.size;
  cloud.synced = synced;
  function cloudFlush() {
    if (!cloud.on || !cloud.ready || (!cloud.me && ROLE !== 'admin')) return;
    if (cloud.deleting) return; // هەژمارەکە خەریکی سڕینەوەیە: هیچ شتێک دووبارە دروست ناکرێتەوە
    if (ROLE === 'home') return;
    stamp(state);
    const want = toDocs(canonical(state));
    const ops = [];
    const personal = /^(pax|accounts|drivers|dpub)\//;
    want.forEach((data, path) => {
      const mode = modeOf(path);
      if (!mode) return;
      const e = cloud.docs.get(path);
      if (!e) {
        // پرۆفایلێک کە هێشتا لە سێرڤەرەوە نەهاتووە دووبارە دروست ناکرێت (دەنا بە بەتاڵی جێگای ڕاستەقینەکە دەگرێتەوە)
        if (personal.test(path) && !synced()) return;
        // گەشت و مێژووی شۆفێر ناسنامەی دیاریکراویان هەیە (هەموو ئامێرێک هەمان ناسنامە دروست دەکات):
        // تەنها ئەگەر نەبوو دروست دەکرێن، بۆ ئەوەی گەشتێکی دەستپێکراو نەسڕێتەوە
        const once = /^(trips|driverLog|wallet)\//.test(path);
        if (mode !== 'u') ops.push({ op: once ? 'create' : 'set', path, data: clone(data) });
      } else if (mode !== 'c') {
        const u = fieldDiff(e.data || {}, data);
        if (u) ops.push({ op: 'update', path, data: u });
      }
    });
    cloud.docs.forEach((e, path) => {
      if (want.has(path) || modeOf(path) !== 'rw') return;
      if (path.startsWith('meta/') && ROLE !== 'admin') return;
      // سەرنشین و شۆفێر هەرگیز هەژمار یان پرۆفایلی خۆیان ناسڕنەوە
      if (personal.test(path) && ROLE !== 'admin') return;
      ops.push({ op: 'delete', path });
    });
    markPublicImages(want);
    if (!ops.length) return;
    ops.forEach((op) => {
      const e = cloud.docs.get(op.path);
      if (op.op === 'delete') cloud.docs.delete(op.path);
      else if (op.op === 'set' || op.op === 'create') cloud.docs.set(op.path, { data: clone(op.data), holders: e ? e.holders : new Set(), opt: true });
      else cloud.docs.set(op.path, { data: applyFields(e ? e.data : {}, op.data), holders: e ? e.holders : new Set(), opt: true });
    });
    // سڕینەوەکان دوای نووسینەکان دەنێردرێن: هەندێک یاسای ئاسایش (بۆ نموونە دێڕی جزدان) گەشتەکە دەخوێننەوە کە لە هەمان کاتدا دەسڕدرێتەوە
    // ڕیزبەندی: سەرەتا نوێکردنەوەکان (بۆ نموونە دۆخی گەشت ← تەواو)، پاشان دروستکردنەکان (دێڕی جزدان کە یاساکان گەشتەکە دەخوێننەوە)، لە کۆتاییدا سڕینەوەکان
    const phase = (k) => Promise.allSettled(ops.filter((op) => k.includes(op.op)).map(send));
    cloud.pending = phase(['set', 'update']).then(() => phase(['create'])).then(() => phase(['delete']));
  }
  const send = (op) => Promise.resolve().then(() => window.TKFB.write(op)).then(() => cloud.retry.delete(op.path), (err) => writeFailed(op, err));
  /** «create»ـەکانی کاتی بێ ئینتەرنێت دووبارە دەنێردرێنەوە */
  function retryCreates() {
    if (!cloud.on || !cloud.retry.size || navigator.onLine === false) return;
    cloud.retry.forEach((op, path) => {
      const e = cloud.docs.get(path);
      // ئەگەر لەم ماوەیەدا لە سێرڤەرەوە هات (ئامێرێکی تر دروستی کرد)، پێویست ناکات
      if (!e || e.holders.size) return cloud.retry.delete(path);
      send(op);
    });
  }
  window.addEventListener('online', () => setTimeout(retryCreates, 1500));
  setInterval(retryCreates, 20000);
  TK.flush = cloudFlush;
  // بۆ تاقیکردنەوە
  cloud.debug = { toDocs: (st) => toDocs(canonical(st || state)), compose: () => compose(), modeOf: (p) => modeOf(p) };
  function writeFailed(op, err) {
    const code = (err && err.code) || String(err);
    // بێ ئینتەرنێت «create» (transaction) ناکرێت: کاتێک ئینتەرنێت گەڕایەوە دووبارە دەنێردرێتەوە
    if (op.op === 'create' && !/permission|invalid/.test(code)) {
      cloud.retry.set(op.path, op);
      return;
    }
    console.warn('نووسین سەرکەوتوو نەبوو', op.op, op.path, code);
    cloud.lastWriteError = { op: op.op, path: op.path, code: (err && err.code) || String(err) };
    const e = cloud.docs.get(op.path);
    // ئەگەر گوێگرێک ئەم بەڵگەنامەیە دەبینێت، Firestore خۆی دەیگەڕێنێتەوە. ئەگەر نا، لێرە دەسڕدرێتەوە
    if (e && !e.holders.size) {
      cloud.docs.delete(op.path);
      scheduleCompose();
    }
  }

  /* ---------- گوێگرتن لە گۆڕانکارییەکان ---------- */
  function specs(uid) {
    const out = [{ id: 'meta', doc: 'meta/app' }, { id: 'partners', col: 'partners' }];
    if (!uid) return out;
    const R = (col) => ({ id: col + ':r', col, where: ['_r', 'array-contains', uid] });
    if (ROLE === 'passenger') {
      return out.concat(
        [{ id: 'pax', doc: 'pax/' + uid }, { id: 'acc', doc: 'accounts/' + uid }, { id: 'dpub', col: 'dpub' }, { id: 'news', col: 'news' }],
        ['requests', 'subscriptions', 'trips', 'routes', 'messages', 'swaps', 'pnotices', 'phistory', 'referrals', 'wallet', 'topups', 'withdraws'].map(R)
      );
    }
    if (ROLE === 'driver') {
      return out.concat(
        [
          { id: 'drv', doc: 'drivers/' + uid }, { id: 'dpub', col: 'dpub' }, { id: 'news', col: 'news' },
          { id: 'oreq', col: 'requests', where: ['status', '==', 'open'] },
          { id: 'oswap', col: 'swaps', where: ['status', '==', 'open'] },
          { id: 'otrip', col: 'trips', where: ['swapOpen', '==', true] },
        ],
        ['requests', 'subscriptions', 'trips', 'routes', 'messages', 'swaps', 'dnotices', 'ledger', 'payouts', 'driverLog', 'wallet', 'withdraws', 'topups'].map(R)
      );
    }
    if (ROLE === 'admin') {
      return out.concat(['pax', 'accounts', 'drivers', 'dpub', 'pnotices', 'phistory'].concat(Object.keys(ARR).filter((k) => k !== 'partners')).map((col) => ({ id: col, col })));
    }
    return out;
  }
  function onChanges(lid, changes, meta) {
    changes.forEach((ch) => {
      const e = cloud.docs.get(ch.path);
      if (ch.type === 'removed') {
        if (!e) return;
        e.holders.delete(lid);
        if (!e.holders.size) cloud.docs.delete(ch.path);
        return;
      }
      const x = e || { holders: new Set() };
      x.data = ch.data;
      x.opt = false;
      x.holders.add(lid);
      cloud.docs.set(ch.path, x);
    });
    // تەنها کاتێک زانیارییەکە لە سێرڤەرەوە هات (نەک تەنها بیرگەی ناوخۆ) ئامادە دادەنرێت، مەگەر ئینتەرنێت نەبێت
    const fresh = !meta || !meta.fromCache;
    if (fresh && cloud.unsynced.delete(lid) && synced()) {
      reconcileSoon();
      retryCreates();
    }
    if ((fresh || navigator.onLine === false) && cloud.waiting.delete(lid)) checkReady();
    scheduleCompose();
  }
  function subscribe(list) {
    list.forEach((sp) => {
      if (cloud.subs.has(sp.id)) return;
      cloud.waiting.add(sp.id);
      cloud.unsynced.add(sp.id);
      const owner = cloud.me;
      const un = window.TKFB.listen(
        sp,
        (changes, meta) => onChanges(sp.id, changes, meta),
        (err) => {
          console.error('گوێگرتن سەرکەوتوو نەبوو', sp.id, err && err.code);
          cloud.error = (err && err.code) || 'error';
          cloud.unsynced.delete(sp.id);
          // گوێگرێک کە هەڵەی هەبوو لە Firebase کۆتایی دێت: دوای ماوەیەک دووبارە دەست پێدەکرێتەوە (جگە لە ڕێگەپێنەدان)
          if (!/permission/.test(cloud.error)) {
            const wait = Math.min(60000, (sp.wait || 2000) * 2);
            sp.wait = wait;
            setTimeout(() => {
              if (cloud.me !== owner || cloud.subs.get(sp.id) !== un) return;
              cloud.subs.delete(sp.id);
              subscribe([sp]);
            }, wait);
          }
          // meta/app بۆ هەمووان کراوەیە: ئەگەر ئەویش ڕەتکرایەوە، یاساکانی ئاسایش هێشتا دانەنراون
          if (sp.id === 'meta' && /permission/.test(cloud.error)) setTimeout(() => TK.toast && TK.toast('یاساکانی ئاسایشی Firestore دانەنراون (firestore.rules). بڕوانە README'), 1500);
          if (cloud.waiting.delete(sp.id)) checkReady();
        }
      );
      cloud.subs.set(sp.id, un);
    });
  }
  function unsubscribeAll(keepPublic) {
    cloud.subs.forEach((un, id) => {
      if (keepPublic && (id === 'meta' || id === 'partners')) return;
      try {
        un();
      } catch (e) {
        /* هیچ */
      }
      cloud.subs.delete(id);
      cloud.waiting.delete(id);
      cloud.unsynced.delete(id);
      cloud.docs.forEach((e, path) => {
        e.holders.delete(id);
        if (!e.holders.size) cloud.docs.delete(path);
      });
    });
    // تۆمارە نووسراوەکانی هەژماری پێشوو کە کەس گوێی لێ نەبوو
    cloud.docs.forEach((e, path) => !e.holders.size && cloud.docs.delete(path));
  }
  function checkReady() {
    if (cloud.ready || !cloud.authKnown || cloud.waiting.size) return;
    cloud.ready = true;
    scheduleCompose();
  }
  /** چاوەڕێکردن تا زانیارییەکانی هەژماری ئێستا بار دەبن */
  TK.whenReady = (uid) =>
    new Promise((res) => {
      const ok = () => cloud.error === 'load' || (cloud.ready && (uid === undefined || cloud.me === uid));
      const t0 = Date.now();
      const tick = () => (ok() || Date.now() - t0 > 20000 ? res() : setTimeout(tick, 60));
      tick();
    });

  let composeT = 0;
  function composeNow() {
    if (!composeT) return false;
    clearTimeout(composeT);
    composeT = 0;
    const s = compose();
    if (stable(s) === stable(state)) return false;
    state = s;
    return true;
  }
  function scheduleCompose() {
    if (composeT) return;
    composeT = setTimeout(() => {
      composeT = 0;
      const s = compose();
      if (stable(s) !== stable(state)) {
        state = s;
        emit();
      }
      if (cloud.ready) reconcileSoon();
      imgPump();
    }, 0);
  }

  function roleOk(u) {
    if (!u) return false;
    if (ROLE === 'admin') return ADMINS.includes(u.uid);
    if (ROLE === 'driver') return /@d\.taxikam\.app$/.test(u.email || '');
    if (ROLE === 'passenger') return /@p\.taxikam\.app$/.test(u.email || '');
    return false;
  }
  function onAuth(u) {
    if (u && !roleOk(u)) {
      // هەژماری ئەپێکی تر (بۆ نموونە شۆفێر لە ئەپی سەرنشین)
      window.TKFB.signOut();
      u = null;
    }
    const uid = u ? u.uid : null;
    if (cloud.authKnown && uid === cloud.me) return;
    cloud.authKnown = true;
    cloud.user = u;
    cloud.me = uid;
    cloud.ready = false;
    if (cloud.error !== 'load') cloud.error = null;
    cloud.retry.clear();
    unsubscribeAll(true);
    subscribe(specs(uid));
    checkReady();
    scheduleCompose();
    // ئەگەر سێرڤەر وەڵامی نەدایەوە (بێ ئینتەرنێت)، ئەپ بە زانیاری ناوخۆ دەکرێتەوە
    const me = uid;
    setTimeout(() => {
      if (cloud.me === me && !cloud.ready) {
        cloud.waiting.clear();
        checkReady();
      }
    }, 9000);
  }
  function startCloud() {
    if (cloud.on || !window.TKFB || ROLE === 'home') return;
    try {
      window.TKFB.init(ROLE);
    } catch (e) {
      cloud.error = 'init';
      console.error(e);
      return;
    }
    cloud.on = true;
    subscribe(specs(null));
    window.TKFB.onAuth(onAuth);
  }
  if (window.TKFB) setTimeout(startCloud);
  else {
    window.addEventListener('tkfb-ready', startCloud);
    window.addEventListener('tkfb-error', () => {
      cloud.error = 'load';
    });
  }

  /** هەڵەکانی Firebase بە کوردی */
  function authErr(e) {
    const c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'ژمارە یان وشەی نهێنی هەڵەیە';
    if (/email-already-in-use/.test(c)) return 'ئەم ژمارەیە پێشتر تۆمار کراوە. بچۆ ژوورەوە';
    if (/weak-password/.test(c)) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت';
    if (/too-many-requests/.test(c)) return 'زۆر هەوڵت دا. چەند خولەکێک چاوەڕێ بکە';
    if (/network/.test(c)) return 'ئینتەرنێت نییە. دووبارە هەوڵ بدەرەوە';
    if (/operation-not-allowed/.test(c)) return 'چوونەژوورەوە بە ئیمەیڵ و وشەی نهێنی لە Firebase چالاک نەکراوە';
    if (/no-user|requires-recent-login/.test(c)) return 'دووبارە بچۆ ژوورەوە';
    if (!window.TKFB) return 'پەیوەندی بە سێرڤەر نییە. ئینتەرنێت بپشکنە';
    return 'هەڵەیەک ڕوویدا (' + (c || 'نەزانراو') + ')';
  }
  TK.authErr = authErr;
  const needCloud = () => (window.TKFB && cloud.on ? null : 'پەیوەندی بە سێرڤەر نییە. ئینتەرنێت بپشکنە و لاپەڕەکە نوێ بکەرەوە');

  state = compose();

  TK.get = () => state;
  TK.subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  function emit() {
    listeners.forEach((fn) => fn(state));
  }
  /** گۆڕینی زانیاری: fn دەتوانێت s ڕاستەوخۆ بگۆڕێت */
  function update(fn) {
    // ئەگەر گۆڕانکارییەک لە سێرڤەرەوە هاتووە و هێشتا نەخراوەتە ناو state، سەرەتا دەخرێتە ناوی
    // (دەنا ئەو تۆمارە نوێیە وەک «سڕاوە» دادەنرێت و دەسڕدرێتەوە)
    composeNow();
    const draft = clone(state);
    const r = fn(draft);
    // تەنها ئەگەر fn بە ئەنقەست state ـێکی تەواوی گەڕاندەوە (وەک reconcile)، جێگای دەگرێتەوە.
    // هەر گەڕاندنەوەیەکی تر (دەق، ژمارە، true) پشتگوێ دەخرێت: دەنا هەموو زانیارییەکان وەک «سڕاوە» دادەنران و لە Firebase دەسڕانەوە
    state = r && typeof r === 'object' && Array.isArray(r.subscriptions) && Array.isArray(r.drivers) && Array.isArray(r.trips) ? r : draft;
    saveLocal(state);
    cloudFlush();
    emit();
  }
  TK.update = update;

  /* ---------- ڕێکخستنەوەی ڕۆژانە (لەسەر ئەو ئامێرەی دەسەڵاتی هەیە) ----------
   * شۆفێر: گەشتەکانی دوێنێ دادەخات، گەشتەکانی ئەمڕۆ و ڕۆتەکانی ڕێک دەخات.
   * سەرنشین: گەشتی ئەمڕۆی بەشدارییە تاکەکانی خۆی و فاتورەی مانگی نوێ.
   * بەڕێوەبەر: هەموو شتێک (ئەگەر شۆفێرێک ئەپەکەی نەکردبێتەوە). */
  let recT = 0;
  function reconcileSoon() {
    clearTimeout(recT);
    recT = setTimeout(reconcile, 120);
  }
  function reconcile() {
    // تەنها کاتێک هەموو زانیارییەکان لە سێرڤەرەوە هاتوون (دەنا گەشتێک کە هێشتا نەهاتووە وەک نەبوو دادەنرێت)
    if (!synced() || (!cloud.me && ROLE !== 'admin') || ROLE === 'home') return;
    if (ROLE === 'admin' && !cloud.me) return;
    const fresh = composeNow();
    const probe = clone(state);
    try {
      if (ROLE === 'driver') reconcileDriver(probe, cloud.me);
      else if (ROLE === 'passenger') reconcilePassenger(probe);
      else if (ROLE === 'admin') ensureDay(probe);
    } catch (e) {
      console.error('reconcile', e);
      return;
    }
    if (walletOn() && (ROLE === 'passenger' || ROLE === 'driver')) ensureDir();
    if (stable(probe) !== stable(state)) update(() => probe);
    // بەڵگەنامەی سەرەتایی (بۆ نموونە meta/app بۆ بەڕێوەبەر) یان ئەوەی پێشتر نەنووسرابوو
    else {
      cloudFlush();
      if (fresh) emit();
    }
  }
  TK.reconcile = reconcile;
  /** نوێکردنەوەی دەستی (ڕاکێشانی پەڕە): پەیوەندی دووبارە دەبەسترێتەوە، پاشان ڕێکخستنەوە و پیشاندانەوە */
  TK.refresh = async function () {
    try {
      if (window.TKFB && window.TKFB.reconnect) await Promise.race([window.TKFB.reconnect(), new Promise((r) => setTimeout(r, 4000))]);
    } catch (e) {
      /* هیچ */
    }
    try {
      reconcile();
      if (TK.imgPump) TK.imgPump();
    } catch (e) {
      /* هیچ */
    }
    scheduleCompose();
  };
  /* ---------- «نوێ» لە لیستی ئاگادارکردنەوەکان ----------
   * ئەوەی کراوەتەوە یەکسەر شین نامێنێت. کاتێک لە ئاگادارکردنەوەیەکەوە دەگەڕێیتەوە، ئەوانی تر هێشتا نوێن؛
   * کاتێک دواتر لە شوێنێکی ترەوە دێیتەوە، هەموویان وەک خوێندراوە دەردەکەون */
  const ntOpened = new Set();
  let ntReturn = false;
  let ntVisit = null;
  let ntRead = 0;
  TK.noticeReadAt = (stored) => {
    if (ntVisit !== app.current) {
      ntVisit = app.current;
      if (ntReturn) ntReturn = false;
      else ntRead = stored || 0;
    }
    return ntRead;
  };
  document.addEventListener('click', (e) => {
    const row = e.target.closest && e.target.closest('.nt-row[data-nt]');
    if (!row) return;
    ntOpened.add(row.getAttribute('data-nt'));
    if (row.hasAttribute('data-go')) ntReturn = true;
    row.classList.remove('nt-new');
    const dot = row.querySelector('.nt-dot');
    if (dot) dot.remove();
  }, true);
  /** تۆماری ژمارەکەم لە pdir/ddir (بۆ ئەوەی کەسانی تر بە ژمارە بمدۆزنەوە و پارەم بۆ بنێرن). یەک جار لە هەر کردنەوەیەک */
  let dirDone = false;
  async function ensureDir() {
    if (dirDone || !cloud.me || !window.TKFB || !window.TKFB.get || !cloud.user || !cloud.user.email) return;
    dirDone = true;
    const [key, dom] = String(cloud.user.email).split('@');
    const col = dom === 'd.taxikam.app' ? 'ddir' : dom === 'p.taxikam.app' ? 'pdir' : null;
    const name = ROLE === 'driver' ? (sel.me() || {}).name : (state.passenger || {}).name;
    if (!col || !key || !name) return (dirDone = false);
    try {
      const cur = await window.TKFB.get(col + '/' + key);
      if (!cur || cur.uid !== cloud.me || cur.name !== name) await window.TKFB.write({ op: 'set', path: col + '/' + key, data: { uid: cloud.me, name } });
    } catch (e) {
      dirDone = false;
    }
  }
  setInterval(() => {
    if (state && state.day !== TODAY()) scheduleCompose();
    reconcile();
  }, 60000);

  /** کورتەی گەشتێکی هاوبەش بۆ شۆفێر: سەرەکی (lead)، وێستگەکان، دۆخ، کات */
  function runView(trips) {
    const pick = (st) => trips.find((t) => t.status === st);
    const lead = pick('active') || pick('scheduled') || pick('done') || pick('absent') || pick('missed') || trips[0];
    const status = pick('active') ? 'active' : pick('scheduled') ? 'scheduled' : pick('done') || pick('absent') || pick('missed') ? 'done' : 'skipped';
    const riding = trips.filter((t) => !['skipped', 'noshow', 'missed'].includes(t.status));
    return {
      key: lead.runId || lead.id, id: lead.id, lead, trips, status, pooled: !!lead.runId,
      stops: lead.stops, time: (lead.stops[0] && lead.stops[0].time) || lead.time,
      title: lead.runTitle || lead.title, kind: lead.kind, driverId: lead.driverId, originalDriverId: lead.originalDriverId,
      people: riding.reduce((n, t) => n + t.memberIds.length, 0), skipped: trips.filter((t) => t.status === 'skipped'),
      rated: trips.filter((t) => t.status === 'done').every((t) => t.rated),
    };
  }
  TK.runView = (trips) => runView(trips);

  /* =========================================================
   * ٦. هەڵبژێرەرەکان
   * ======================================================= */
  /** گەشتی ئەمڕۆ (گەشتی کۆنی نەداخراو پیشان نادرێت، جگە لە گەشتی چالاک) */
  const isToday = (t) => !t.day || t.day === TODAY() || t.status === 'active';
  const sel = {
    driver: (id) => state.drivers.find((d) => d.id === id),
    member: (id) => state.family.members.find((m) => m.id === id),
    names: (ids) => ids.map((id) => (sel.member(id) || {}).name).filter(Boolean),
    trip: (id) => state.trips.find((t) => t.id === id),
    request: (id) => state.requests.find((r) => r.id === id),
    me: () => (state.driver.meId ? sel.driver(state.driver.meId) : null),
    sub: (id) => state.subscriptions.find((x) => x.id === id),
    /** بەشدارییەکانی سەرنشینی ئێستا */
    mySubs: () => state.subscriptions.filter((x) => (x.owner || 'me') === 'me'),
    /** گەشتەکانی بەشداری ڕاگیراو پیشان نادرێن */
    paused: (t) => !!(t.subId && (state.subscriptions.find((x) => x.id === t.subId) || {}).status === 'paused'),
    myTrips: () => state.trips.filter((t) => (t.owner || 'me') === 'me' && t.memberIds.length > 0 && !sel.paused(t) && isToday(t)),
    driverTrips: () => state.trips.filter((t) => (t.driverId === state.driver.meId || t.originalDriverId === state.driver.meId) && !sel.paused(t) && isToday(t)),
    swapOf: (tripId) => state.swaps.find((w) => w.tripId === tripId && w.status !== 'cancelled'),
    /** گەشتەکانی شۆفێر بە شێوەی «گەشتی هاوبەش»: هەر ڕۆتێک یەک دانە، گەشتی تاکیش یەک دانە */
    driverRuns() {
      const groups = new Map();
      sel.driverTrips().forEach((t) => {
        const k = t.runId || t.id;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(t);
      });
      const rank = { active: 0, scheduled: 1, done: 2, missed: 2, skipped: 3 };
      const rk = (x) => (x.status in rank ? rank[x.status] : 2);
      return [...groups.values()].map(runView).sort((a, b) => rk(a) - rk(b) || a.time.localeCompare(b.time));
    },
    run: (tripId) => {
      const t = sel.trip(tripId);
      return t ? runView(runOf(state, t)) : null;
    },
    openSwapsForMe() {
      const me = sel.me();
      if (!me || me.status !== 'active') return [];
      return state.swaps.filter((w) => {
        if (w.status !== 'open' || w.fromDriverId === me.id) return false;
        const t = sel.trip(w.tripId);
        const womanOnly = w.womanOnly != null ? w.womanOnly : tripWomanOnly(state, t || {});
        return t && t.status === 'scheduled' && (t.kind !== 'kids' || me.kidsDriver) && (!womanOnly || me.woman);
      });
    },
    /** هەموو سەرنشینەکانی شۆفێری ئێستا */
    myClients() {
      const me = state.driver.meId;
      return state.subscriptions.filter((x) => x.driverId === me).map((x) => ({
        id: x.id, family: true, name: x.riderNames || fmt.names(sel.names(x.memberIds)), role: sel.peerName(x.owner || 'me'), photo: x.ownerPhoto || null,
        child: !!x.hasChild, from: x.from, to: x.to, go: x.go, back: x.back, days: x.days, price: x.price, paused: x.status === 'paused', peer: x.owner || 'me',
      })).sort((a, b) => String(a.go || a.back).localeCompare(String(b.go || b.back)));
    },
    /** گفتوگۆکانی سەرنشین (یەک گفتوگۆ بۆ هەر شۆفێرێک) */
    threadsP() {
      const map = {};
      state.messages.filter((m) => m.peer === 'me').forEach((m) => (map[m.driverId] = map[m.driverId] || []).push(m));
      return Object.keys(map)
        .map((driverId) => ({ key: driverId, driverId, msgs: map[driverId], last: map[driverId][map[driverId].length - 1], unread: map[driverId].filter((m) => m.fromDriver && !m.readP).length }))
        .sort((a, b) => b.last.at - a.last.at);
    },
    /** گفتوگۆکانی شۆفێری ئێستا (یەک گفتوگۆ بۆ هەر سەرنشینێک) */
    threadsD() {
      const me = state.driver.meId;
      const map = {};
      state.messages.filter((m) => m.driverId === me).forEach((m) => (map[m.peer] = map[m.peer] || []).push(m));
      return Object.keys(map)
        .map((peer) => ({ key: peer, peer, msgs: map[peer], last: map[peer][map[peer].length - 1], unread: map[peer].filter((m) => !m.fromDriver && !m.readD).length }))
        .sort((a, b) => b.last.at - a.last.at);
    },
    unreadMsgsP: () => state.messages.filter((m) => m.peer === 'me' && m.fromDriver && !m.readP).length,
    unreadMsgsD: () => state.messages.filter((m) => m.driverId === state.driver.meId && !m.fromDriver && !m.readD).length,
    /** ناوی سەرنشین: «me» سەرنشینی ئێستایە، ئەوانی تر ژمارەی مۆبایلن */
    peerName(peer) {
      if (peer === 'me') return state.passenger.name || 'سەرنشین';
      const a = state.accounts.find((x) => x.uid === peer || x.phone === peer);
      if (a && a.name) return a.name;
      const v = state.vault[peer];
      return (v && v.passenger && v.passenger.name) || ownerName(state, peer) || 'سەرنشین';
    },
    /** ژمارەی سەرنشین هەرگیز بۆ شۆفێر نانێردرێت. تەنها بەڕێوەبەر دەیبینێت */
    /** وێنەی سەرنشینێک بۆ شۆفێرەکەی (لە بەشدارییەکەوە) یان بۆ بەڕێوەبەر */
    peerPhoto(peer) {
      if (!peer) return null;
      if (ROLE === 'admin') {
        const v = state.vault[peer];
        return (v && v.passenger && v.passenger.photo) || null;
      }
      const x = state.subscriptions.find((y) => (y.owner || 'me') === peer && y.ownerPhoto && (ROLE !== 'driver' || y.driverId === state.driver.meId));
      return x ? x.ownerPhoto : null;
    },
    peerPhone(peer) {
      if (ROLE !== 'admin') return '';
      const a = state.accounts.find((x) => x.uid === peer);
      return a ? a.phone : '';
    },
    // نامەکان تەنها لە بەشی «نامەکان»دان: لە لیستی ئاگادارکردنەوە و ژمارەی زەنگەکە دەرنەچن (بانەری کاتی هاتنی نامە هەر دەمێنێت)
    unread: () => state.notices.filter((n) => n.kind !== 'chat' && n.at > state.readNoticesAt).length,
    myNotices: () => state.notices.filter((n) => n.kind !== 'chat'),
    myDNotices: () => state.dnotices.filter((n) => n.driverId === state.driver.meId && n.kind !== 'chat'),
    dUnread() {
      const me = sel.me();
      return me ? sel.myDNotices().filter((n) => n.at > (me.readNoticesAt || 0)).length : 0;
    },
    newsFor: (aud) => state.news.filter((n) => !n.hidden && (n.aud === aud || n.aud === 'all')),
    /** جۆری هەواڵ: «ad» = ڕێکلام و هەواڵ (بانەری سەرەوە)، «offer» = ئۆفەر (لیستی خوارەوە) */
    newsKind: (n) => n.kind || (n.code || /ئۆفەر/.test(n.tag || '') ? 'offer' : 'ad'),
    /** ئایا شۆفێرێک بۆ داواکارییەک دەگونجێت */
    fits(d, r) {
      if (!d || d.status !== 'active') return false;
      if (r.womanOnly && !d.woman) return false;
      if (r.city && d.city && r.city !== d.city) return false; // هەر شۆفێرێک تەنها داواکاری شارەکەی خۆی دەبینێت
      if (r.hasChild && !d.kidsDriver) return false;
      // تەنها ئەوەندە دەپشکنرێت کە ئەم کەسانە جێیان دەبێتەوە. ڕۆتەکان کورسی هەر گەشتێک ڕێک دەخەن
      if (r.mode === 'one' && (d.seats || 4) < r.riders) return false;
      if (r.target !== 'all' && r.target !== d.id) return false;
      return true;
    },
    /** داواکارییە کراوەکان کە شۆفێری ئێستا دەیانبینێت */
    openForMe() {
      const me = sel.me();
      if (!me) return [];
      return state.requests.filter(
        (r) => r.status === 'open' && sel.fits(me, r) && !r.declined.includes(me.id) && !r.offers.some((o) => o.driverId === me.id)
      );
    },
    myOffers() {
      const id = state.driver.meId;
      return state.requests
        .filter((r) => r.offers.some((o) => o.driverId === id))
        .map((r) => ({ r, o: r.offers.find((o) => o.driverId === id) }));
    },
  };
  TK.sel = sel;

  /** ئاگادارکردنەوەی سەرنشین. owner: «me» یان ژمارەی سەرنشینێکی تر (لە vault) */
  function notice(s, n, owner) {
    const item = { id: uid(), at: Date.now(), ...n };
    if (owner && owner !== 'me') {
      const v = s.vault[owner];
      if (!v) return;
      v.notices = [item].concat(v.notices || []).slice(0, 50);
      return;
    }
    s.notices.unshift(item);
    s.notices = s.notices.slice(0, 50);
  }
  /** ئاگادارکردنەوەی سەرنشینێکی تر بە UID (بۆ نموونە ئەحمەد کاتێک ئاراس بەشداری دەکات) */
  function notifyPax(s, pk, n) {
    if (!pk) return;
    if (!s.vault[pk]) {
      const v = emptyPassenger();
      v.__stub = true;
      s.vault[pk] = v;
    }
    notice(s, n, pk);
  }
  /** ئاگادارکردنەوەی شۆفێرێکی دیاریکراو */
  function dnotice(s, driverId, n) {
    if (!driverId) return;
    s.dnotices.unshift({ id: uid(), at: Date.now(), driverId, ...n });
    s.dnotices = s.dnotices.slice(0, 300);
  }
  /** ئاگادارکردنەوەی بەڕێوەبەر (بۆ نموونە بەسەرچوونی بەڵگەنامە) */
  function anotice(s, n) {
    s.adminNotices = s.adminNotices || [];
    if (n.key && s.adminNotices.some((x) => x.key === n.key)) return;
    s.adminNotices.unshift({ id: uid(), at: Date.now(), ...n });
    s.adminNotices = s.adminNotices.slice(0, 200);
  }
  /** بەشی تایبەتی سەرنشینێک (ئێستا یان لە vault) */
  function pslice(s, owner) {
    if (!owner || owner === 'me') return s;
    return s.vault[owner] || null;
  }
  TK.pslice = pslice;
  /** ژمارەی مۆبایلی خاوەنی تۆمارێک */
  const ownerPhone = (s, owner) => (!owner || owner === 'me' ? s.passenger.phone : owner);

  /** ئایا بەشدارییەک ئەمڕۆ گەشتی هەیە */
  function dayApplies(sub, date = new Date()) {
    const wd = (date.getDay() + 1) % 7;
    if (hasPerDay(sub)) {
      const e = sub.perDay[wd];
      if (!e || (!e.go && !e.back)) return false;
    } else if (!sub.days || !sub.days[wd]) return false;
    return !sub.startDate || sub.startDate <= TODAY(date);
  }
  /** کاتی چوون یان هاتنەوەی ڕۆژێکی دیاریکراو (بنەڕەت: ئەمڕۆ). null = ئەو ڕۆژە ئەو بەشەی نییە */
  function dayTime(sub, dir, date = new Date()) {
    if (!sub) return null;
    if (hasPerDay(sub)) {
      const e = sub.perDay[(date.getDay() + 1) % 7];
      return (e && (dir === 'back' ? e.back : e.go)) || null;
    }
    return (dir === 'back' ? sub.back : sub.go) || null;
  }
  TK.dayTime = (sub, dir, date) => dayTime(sub, dir, date);
  /* ---------- ڕۆت: چەند سەرنشین لە یەک تەکسیدا ----------
   * شۆفێر چەند بەشدارییەک دەخاتە یەک ڕۆتەوە (route). هەموو ڕۆژێک بۆ هەر ڕۆتێک یەک «گەشتی هاوبەش» (run) دروست دەبێت.
   * هەر سەرنشینێک هێشتا گەشتی تایبەتی خۆی هەیە (بۆ «نایەم»، هەڵسەنگاندن و مێژوو)، بەڵام هەموو گەشتەکانی یەک run
   * هەمان لیستی وێستگەکانیان هەیە و بە یەکەوە دەجووڵێن. هەر وێستگەیەک «parts»ـی هەیە: کێ لەو وێستگەیە سوار دەبێت یان دادەبەزێت. */
  const subTime = (sub, dir) => (dir === 'back' ? sub.back : sub.go);
  const subLeg = (sub, dir) => (dir === 'back' ? { from: sub.to, to: sub.from } : { from: sub.from, to: sub.to });
  const toMin = (hhmm) => +String(hhmm).slice(0, 2) * 60 + +String(hhmm).slice(3, 5);
  TK.toMin = toMin;
  /** ئەندامانی بەشدارییەک بە ناوی یەکەم و ڕەگەز (بۆ ئەوەی سەرنشینانی تر بزانن کێ لەگەڵیانە) */
  function subPeople(s, sub) {
    if (Array.isArray(sub.people)) return sub.people;
    return familyPeople(s, sub);
  }
  /** ناوی یەکەم و ڕەگەزی ئەندامانی بەشدارییەک لە خێزانی خاوەنەکەی (تەنها خاوەن و بەڕێوەبەر دەیبینن) */
  function familyPeople(s, sub) {
    const ps = pslice(s, sub.owner || 'me');
    const mem = ps && ps.family ? ps.family.members : [];
    return (sub.memberIds || [])
      .map((id) => mem.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ n: String(m.name || '').split(' ')[0], w: m.woman === true ? 1 : m.woman === false ? 0 : null, kid: m.kind === 'child' ? 1 : 0 }));
  }
  const allWomen = (s, sub) => {
    const p = subPeople(s, sub);
    return p.length > 0 && p.every((x) => x.w === 1);
  };
  /** کێ دەتوانێت لەگەڵ کێ بێت: منداڵ تەنها لەگەڵ منداڵ، خێزان لەگەڵ خێزان، گەورە لەگەڵ گەورە. تایبەت لەگەڵ کەس نا */
  const poolGroup = (sub) => (sub.rideType === 'private' ? null : sub.rideType === 'kids' ? 'kids' : sub.rideType === 'family' ? 'family' : 'shared');
  const GROUP_LABEL = { kids: 'منداڵ تەنها لەگەڵ منداڵ', family: 'خێزان تەنها لەگەڵ خێزان', shared: 'گەورە' };
  /** ئایا ئەم بەشداریانە دەکرێت پێکەوە لە یەک ڕۆتدا بن؟ هەڵە دەگەڕێنێتەوە یان null */
  function poolError(s, subs, dir, driver) {
    if (!subs.length) return 'سەرنشین هەڵبژێرە';
    for (const x of subs) {
      if (x.rideType === 'private') return `${x.riderNames} تەکسی تایبەتی داواکردووە، ناکرێت لەگەڵ کەسی تر بێت`;
      if (!subTime(x, dir)) return `${x.riderNames} ${dir === 'back' ? 'هاتنەوەی' : 'چوونی'} نییە`;
    }
    const g = poolGroup(subs[0]);
    const odd = subs.find((x) => poolGroup(x) !== g);
    if (odd) return `${odd.riderNames} ناگونجێت: ${GROUP_LABEL[poolGroup(odd)] || ''}`;
    if (subs.some((x) => x.womanOnly) && !subs.every((x) => x.womanOnly || allWomen(s, x))) return 'سەرنشینێک «تەنها ئافرەت»ی داواکردووە، تەنها ئافرەت دەتوانن لەگەڵی بن';
    const times = subs.map((x) => toMin(subTime(x, dir)));
    if (Math.max(...times) - Math.min(...times) > cfg().poolWindowMin) return `کاتەکانیان زۆر جیاوازە (زیاتر لە ${cfg().poolWindowMin} خولەک)`;
    const seats = subs.reduce((n, x) => n + (x.riders || (x.memberIds || []).length || 1), 0);
    const cap = (driver && driver.seats) || 4;
    if (seats > cap) return `${seats} کەسن، بەڵام ئۆتۆمبێلەکەت ${cap} کورسی هەیە`;
    return null;
  }
  TK.poolError = (subs, dir, driver) => poolError(state, subs, dir, driver);
  TK.subTime = subTime;
  TK.subLeg = subLeg;
  /** دروستکردنی بەشێک (part) بۆ وێستگە */
  const partOf = (s, sub) => ({ subId: sub.id, owner: sub.owner || 'me', riders: sub.riderNames, memberIds: (sub.memberIds || []).slice(), people: subPeople(s, sub) });
  /** خانە کۆکراوەکانی وێستگە لە parts دروست دەکرێنەوە */
  function mergeParts(st) {
    st.subIds = st.parts.map((p) => p.subId);
    st.memberIds = [].concat(...st.parts.map((p) => p.memberIds));
    st.people = [].concat(...st.parts.map((p) => p.people));
    st.riders = st.parts.map((p) => p.riders).join('، ');
    return st;
  }
  /** وێستگەکانی گەشتێکی تاک (یەک بەشداری) */
  function soloStops(s, sub, dir, time) {
    const leg = subLeg(sub, dir);
    const mins = Math.round(sub.km ? sub.km * 2.5 + 8 : 20);
    return [
      mergeParts({ id: 's1', place: leg.from, kind: 'pickup', parts: [partOf(s, sub)], time, done: false }),
      mergeParts({ id: 's2', place: leg.to, kind: 'dropoff', parts: [partOf(s, sub)], time: fmt.addMin(time, mins), done: false }),
    ];
  }
  /** وێستگەکانی ڕۆتێک بۆ ئەو بەشداریانەی ئەمڕۆ دێن. سوارکردنی یەک لە دوای یەک لە هەمان شوێن یەک وێستگەن */
  function runStops(s, route, subs) {
    const c = cfg();
    const order = route.subIds.filter((id) => subs.some((x) => x.id === id));
    const byId = (id) => subs.find((x) => x.id === id);
    const picks = [];
    // دوو سەرنشین تەنها کاتێک یەک وێستگەن کە هەمان ناو و هەمان شوێنی سەر نەخشەیان هەبێت (کەمتر لە ٦٠ مەتر)
    const geoOf = new Map();
    const sameSpot = (a, b) => (!a && !b) || (a && b && TK.geoKm(a, b) < 0.06);
    order.forEach((id) => {
      const x = byId(id);
      const place = subLeg(x, route.dir).from;
      const g = TK.subGeo(x, route.dir, s).from;
      const last = picks[picks.length - 1];
      if (last && last.place === place && sameSpot(geoOf.get(last), g)) last.parts.push(partOf(s, x));
      else {
        const st = { id: 'p' + id, place, kind: 'pickup', parts: [partOf(s, x)], done: false };
        geoOf.set(st, g);
        picks.push(st);
      }
    });
    picks.forEach((p, i) => {
      p.time = fmt.addMin(route.time, i * c.stopMin);
      mergeParts(p);
    });
    const km = Math.max(3, ...order.map((id) => byId(id).km || 0));
    const firstDrop = fmt.addMin(route.time, Math.max(0, picks.length - 1) * c.stopMin + Math.round(km * 2.5 + 8));
    const dropOrder = (route.dropOrder || []).filter((id) => order.includes(id)).concat(order.filter((id) => !(route.dropOrder || []).includes(id)));
    const drops = [];
    dropOrder.forEach((id) => {
      const x = byId(id);
      const place = subLeg(x, route.dir).to;
      const g = TK.subGeo(x, route.dir, s).to;
      let d = drops.find((y) => y.place === place && sameSpot(geoOf.get(y), g));
      if (!d) {
        drops.push((d = { id: 'd' + id, place, kind: 'dropoff', parts: [], done: false }));
        geoOf.set(d, g);
      }
      d.parts.push(partOf(s, x));
    });
    drops.forEach((d, i) => {
      d.time = fmt.addMin(firstDrop, i * c.stopMin);
      mergeParts(d);
    });
    return picks.concat(drops);
  }
  /** کاتی سوارکردنی هەر بەشدارییەک لە ڕۆتێکدا (بۆ ئاگادارکردنەوەی سەرنشین کاتێک دەگۆڕێت) */
  function routePickTimes(s, route) {
    const subs = route.subIds.map((id) => s.subscriptions.find((x) => x.id === id)).filter(Boolean);
    const out = {};
    runStops(s, route, subs).forEach((st) => st.kind === 'pickup' && st.subIds.forEach((id) => (out[id] = st.time)));
    return out;
  }
  TK.routeStops = (route, subs) => runStops(state, route, subs);
  function mkTrip(s, sub, dir) {
    const time = dayTime(sub, dir);
    return {
      id: `t_${sub.id}_${s.day}_${dir}`, day: s.day, dir, driverId: sub.driverId, subId: sub.id, reqId: sub.reqId || null, owner: sub.owner || 'me',
      title: dir === 'back' ? `هاتنەوە، ${sub.riderNames}` : `${sub.riderNames}، ${sub.to.split('، ')[0]}`,
      memberIds: sub.memberIds.slice(), kind: sub.hasChild ? 'kids' : sub.rideType === 'private' ? 'private' : 'shared', time, status: 'scheduled',
      stops: soloStops(s, sub, dir, time),
    };
  }
  /**
   * ئایا بەشدارییەک لەو ڕۆژەدا لەگەڵ ڕۆتەکەی دەڕوات. بەشداری ئاسایی هەمیشە بەڵێ.
   * کاتی جیاواز بۆ هەر ڕۆژێک: تەنها ئەگەر کاتی ئەو ڕۆژە نزیک بێت لە کاتی ئاسایی (ئەوەی ڕۆتەکەی بۆ دروست کراوە)
   */
  function inRouteOn(sub, dir, date = new Date()) {
    if (!sub || !hasPerDay(sub)) return true;
    const tm = dayTime(sub, dir, date);
    const base = subTime(sub, dir);
    return !!tm && !!base && Math.abs(toMin(tm) - toMin(base)) <= cfg().poolWindowMin;
  }
  TK.inRouteOn = (sub, dir, date) => inRouteOn(sub, dir, date);
  /** ڕۆتێک کە ئەمڕۆ ئەم بەشدارییە دەگرێتەوە */
  const routedIn = (s, subId, dir) => {
    const sub = s.subscriptions.find((x) => x.id === subId);
    return (s.routes || []).find((r) => r.dir === dir && r.subIds.includes(subId) && inRouteOn(sub, dir));
  };
  TK.dayApplies = (sub, date) => dayApplies(sub, date);
  /** دروستکردنی گەشتەکانی ئەمڕۆی بەشدارییەک (چوون و هاتنەوە). ئەگەر لە ڕۆتێکدایە، syncRun دروستی دەکات */
  function genTrips(s, sub) {
    if (sub.status === 'ended' || !dayApplies(sub)) return;
    // جزدان: پێش پارەدانی ئەم مانگە گەشت دروست نابێت
    if (walletOn() && !subPaid(s, sub, monthOf(s.day))) return;
    ['go', 'back'].forEach((dir) => {
      if (!dayTime(sub, dir) || routedIn(s, sub.id, dir)) return;
      if (s.trips.some((t) => t.subId === sub.id && t.day === s.day && t.dir === dir)) return;
      s.trips.push(mkTrip(s, sub, dir));
    });
  }
  /** گەشتێک لە ڕۆت جیا دەکرێتەوە و دەبێتەوە بە گەشتی تاک */
  function detachTrip(s, t) {
    const sub = s.subscriptions.find((x) => x.id === t.subId);
    delete t.runId;
    delete t.routeId;
    delete t.runTitle;
    // ئەمڕۆ ئەم بەشەی نییە (کاتی جیاواز بۆ هەر ڕۆژێک): گەشتەکە لادەبرێت
    if (t.status === 'scheduled' && (!sub || !dayApplies(sub) || !dayTime(sub, t.dir))) t._drop = true;
    if (sub && dayTime(sub, t.dir)) {
      t.time = dayTime(sub, t.dir);
      t.stops = soloStops(s, sub, t.dir, t.time);
    }
  }
  /** لابردنی ئەو گەشتانەی detachTrip نیشانەی کردوون */
  const dropLegless = (s) => {
    if (s.trips.some((t) => t._drop)) s.trips = s.trips.filter((t) => !t._drop);
  };
  const runStarted = (trips) => trips.some((t) => t.status === 'active' || t.status === 'done' || t.status === 'absent');
  /** گەشتەکانی ئەمڕۆی ڕۆتێک ڕێک دەخاتەوە (تەنها پێش دەستپێکردن) */
  function syncRun(s, route) {
    if (!route || ROLE === 'passenger') return;
    const runId = route.id + ':' + s.day;
    const inRun = () => s.trips.filter((t) => t.runId === runId);
    if (runStarted(inRun())) return;
    const subs = route.subIds
      .map((id) => s.subscriptions.find((x) => x.id === id))
      // کاتی جیاواز بۆ هەر ڕۆژێک: ئەو ڕۆژەی کاتەکەی زۆر جیاوازە لە کاتی ئاسایی، بە تەنها دەڕوات
      .filter((x) => x && x.status === 'active' && x.driverId === route.driverId && dayApplies(x) && dayTime(x, route.dir) && inRouteOn(x, route.dir) && (!walletOn() || subPaid(s, x, monthOf(s.day))));
    subs.forEach((x) => {
      let t = s.trips.find((y) => y.subId === x.id && y.day === s.day && y.dir === route.dir);
      if (t && t.status !== 'scheduled' && t.status !== 'skipped') return; // پێشتر بە تاک دەستی پێکردووە
      if (!t) s.trips.push((t = mkTrip(s, x, route.dir)));
      t.runId = runId;
      t.routeId = route.id;
    });
    inRun().filter((t) => !subs.some((x) => x.id === t.subId)).forEach((t) => detachTrip(s, t));
    dropLegless(s);
    const live = inRun().filter((t) => t.status === 'scheduled');
    const stops = runStops(s, route, subs.filter((x) => live.some((t) => t.subId === x.id)));
    inRun().forEach((t) => {
      t.runTitle = route.name;
      if (t.status !== 'scheduled') return;
      t.stops = JSON.parse(JSON.stringify(stops));
      const p = stops.find((st) => st.kind === 'pickup' && st.subIds.includes(t.subId));
      if (p) t.time = p.time;
    });
  }
  /** دوای گۆڕانکاری لە بەشدارییەک، ڕۆتەکانی نوێ دەکرێنەوە */
  function syncRoutesOf(s, subId) {
    (s.routes || []).filter((r) => r.subIds.includes(subId)).forEach((r) => syncRun(s, r));
  }
  /** بەشدارییەک لە هەموو ڕۆتەکان لادەبرێت (کۆتاییهاتن، گۆڕینی شۆفێر) */
  function unrouteSub(s, subId, names) {
    const sub = s.subscriptions.find((x) => x.id === subId) || { riderNames: names };
    (s.routes || []).filter((r) => r.subIds.includes(subId)).forEach((r) => {
      r.subIds = r.subIds.filter((x) => x !== subId);
      // شۆفێر دەزانێت کە جێگایەک بەتاڵ بوو و دەتوانێت کەسێکی تر بخاتە ناوی
      dnotice(s, r.driverId, { kind: 'info', title: `جێگایەک لە «${r.name}» بەتاڵ بوو`, body: `${sub.riderNames || 'سەرنشینێک'} لە ڕۆتەکە دەرچوو. دەتوانیت کەسێکی تر زیاد بکەیت`, link: 'routes' });
      r.dropOrder = (r.dropOrder || []).filter((x) => x !== subId);
      syncRun(s, r);
    });
    s.routes = (s.routes || []).filter((r) => r.subIds.length);
  }
  /** لابردنی بەشدارییەک لە وێستگەکانی گەشتێکی دەستپێکراو (نایەم یان نەهات) */
  function dropSubFromStops(stops, subId) {
    return stops
      .map((st) => {
        if (st.done || !(st.subIds || []).includes(subId)) return st;
        if (!st.parts) return null;
        const n = Object.assign({}, st, { parts: st.parts.filter((p) => p.subId !== subId) });
        return n.parts.length ? mergeParts(n) : null;
      })
      .filter(Boolean);
  }
  const runOf = (s, t) => (t && t.runId ? s.trips.filter((x) => x.runId === t.runId) : t ? [t] : []);
  TK.runOf = (t) => runOf(state, t);
  /** ئایا وێستگەیەک هی ئەم گەشتەیە (بۆ سەرنشین) */
  const ownStop = (t, st) => !st.subIds || !t.subId || st.subIds.includes(t.subId);
  TK.ownStop = ownStop;
  TK.ownStops = (t) => t.stops.filter((st) => ownStop(t, st));
  /** شوێنی سەر نەخشەی سوار بوون و گەیشتنی بەشدارییەک بە پێی ئاراستە (ئەگەر دیاری کرابێت) */
  TK.subGeo = function (sub, dir, s = state) {
    if (!sub) return { from: null, to: null };
    const r = sub.reqId ? s.requests.find((x) => x.id === sub.reqId) : null;
    const f = isGeo(sub.fromGeo) ? sub.fromGeo : r ? TK.placeGeo(r.fromId) : null;
    const t = isGeo(sub.toGeo) ? sub.toGeo : r ? TK.placeGeo(r.toId) : null;
    return dir === 'back' ? { from: t, to: f } : { from: f, to: t };
  };
  /** شوێنی سەر نەخشەی وێستگەیەک. تەنها ئەگەر بەشدارییەکەی دیار بێت (سەرنشین شوێنی هاوڕێکانی نابینێت) */
  TK.stopGeo = function (t, st, s = state) {
    if (!t || !st) return null;
    const ids = st.subIds || (t.subId ? [t.subId] : []);
    for (const id of ids) {
      const sub = s.subscriptions.find((x) => x.id === id);
      if (!sub) continue;
      const g = TK.subGeo(sub, t.dir, s);
      const x = st.kind === 'pickup' ? g.from : g.to;
      if (x) return x;
    }
    return null;
  };
  /** شوێنی گەیشتنی سەرنشین خۆی (نەک کۆتا وێستگەی ڕۆتەکە) */
  TK.dest = (t) => {
    const own = t.stops.filter((st) => st.kind === 'dropoff' && ownStop(t, st));
    return (own[own.length - 1] || t.stops[t.stops.length - 1] || {}).place || '';
  };
  /** هاوڕێکانی تەکسی بۆ سەرنشین: تەنها ناوی یەکەم و ڕەگەز، بە ڕیزی سوارکردن */
  TK.coRiders = (t) => {
    if (!t.runId) return [];
    const out = [];
    t.stops.filter((st) => st.kind === 'pickup').forEach((st, i) => {
      (st.parts || []).forEach((p) => out.push({ order: i + 1, mine: p.subId === t.subId, people: p.people || [], absent: !!st.absent && (st.absentIds || []).includes(p.subId), done: !!st.done }));
    });
    return out;
  };
  /** کاتێک شۆفێر دەتوانێت «نەهات» دابگرێت (دوای چاوەڕوانی) */
  TK.absentAt = (st) => (st && st.arrivedAt ? st.arrivedAt + cfg().absentWaitMin * 60000 : Infinity);
  /** تێبینی سەرنشین بۆ شۆفێر (لە داواکارییەکەوە) */
  TK.subNote = (subId) => {
    const x = state.subscriptions.find((y) => y.id === subId);
    if (!x) return '';
    if (x.note) return x.note;
    const r = state.requests.find((y) => y.id === x.reqId);
    return (r && r.note) || '';
  };
  /** چەند خولەک ماوە تا شۆفێر بتوانێت دەست پێبکات (٠ = ئێستا دەتوانێت) */
  TK.startWait = (t) => {
    const lim = cfg().startEarlyMin;
    if (!lim || !t || !t.stops || !t.stops.length) return 0;
    return Math.max(0, TK.minutesUntil(t.stops[0].time) - lim);
  };
  /** تەواوبوونی گەشتی سەرنشینێک: مێژوو تەنها وێستگەکانی خۆی تێدایە */
  function finishTrip(s, t, now) {
    t.status = 'done';
    t.doneAt = now;
    const ps = pslice(s, t.owner);
    if (!ps) return;
    ps.history = ps.history || [];
    ps.history.unshift({
      id: 'h' + uid(), tripId: t.id, tripTitle: t.title, driverId: t.driverId, originalDriverId: t.originalDriverId || null,
      memberIds: t.memberIds.slice(), kind: t.kind, date: now, startedAt: t.startedAt || null, pooled: t.runId ? runOf(s, t).length : 0,
      stops: t.stops.filter((x) => ownStop(t, x)).map((x) => ({ place: x.place, kind: x.kind, riders: (x.parts ? x.parts.filter((p) => p.subId === t.subId).map((p) => p.riders).join('، ') : x.riders) || x.riders, arrivedAt: x.arrivedAt || null, doneAt: x.doneAt })),
    });
  }
  /** کاتێک هەموو گەشتێکی ڕۆت (یان گەشتی تاک) تەواو بوو: ژمارەی گەشت و ڕۆژی کاری شۆفێر، پارەی جێگرەوە */
  /** تۆمارێک لە مێژووی شۆفێر بۆ هەر گەشتێک (یان ڕۆتێک) کە کۆتایی هات یان نەکرا */
  function logRun(s, run) {
    if (!run.length) return;
    const lead = run.find((t) => t.status === 'done') || run[0];
    const key = (lead.runId || lead.id) + ':' + (lead.day || s.day);
    walletRun(s, run, lead.day || s.day);
    s.driverLog = s.driverLog || [];
    if (s.driverLog.some((e) => e.key === key)) return;
    const st = (t) => (t.status === 'done' ? 'done' : t.status === 'absent' ? 'absent' : t.status === 'skipped' ? 'skipped' : t.status === 'noshow' ? 'noshow' : 'missed');
    const firstStop = lead.stops[0] || {};
    s.driverLog.unshift({
      key, id: 'g_' + key.replace(/[^\w:-]/g, '_'), driverId: lead.driverId, originalDriverId: lead.originalDriverId || null, day: lead.day || s.day, at: Date.now(),
      title: lead.runTitle || lead.title, dir: lead.dir, time: firstStop.time || lead.time, pooled: !!lead.runId, startedAt: lead.startedAt || null, auto: run.some((t) => t.autoClosed),
      riders: run.map((t) => ({ names: (s.subscriptions.find((x) => x.id === t.subId) || {}).riderNames || t.title, owner: t.owner || 'me', status: st(t) })),
      from: firstStop.place || '', to: TK.dest(lead),
    });
    s.driverLog = s.driverLog.slice(0, 1500);
  }
  function finishRun(s, run) {
    logRun(s, run);
    const lead = run[0];
    const d = s.drivers.find((x) => x.id === lead.driverId);
    if (d) {
      d.trips = (d.trips || 0) + 1;
      d.workDays = d.workDays || [];
      if (!d.workDays.includes(s.day)) d.workDays.push(s.day);
    }
    const sw = !walletOn() && run.find((t) => t.swapPay && t.originalDriverId);
    if (sw) {
      ledger(s, sw.originalDriverId, 'swap', -sw.swapPay, `جێگرەوە بۆ ${sw.runTitle || sw.title}`, { tripId: sw.id });
      ledger(s, sw.driverId, 'swap', sw.swapPay, `جێگرەوەی ${(s.drivers.find((x) => x.id === sw.originalDriverId) || {}).name || ''}، ${sw.runTitle || sw.title}`, { tripId: sw.id });
    }
  }
  /** گەشتەکانی ڕۆژانی پێشوو (جگە لە گەشتی چالاک) لە مێژووی شۆفێر تۆمار دەکرێن و لادەبرێن */
  function closeOldTrips(s, pick) {
    const today = TODAY();
    // ڕۆتێک کە هێشتا گەشتێکی چالاکی تێدایە دەست لێنادرێت (دەنا تەنها بەشێکی حیساب دەکرێت)
    const busy = new Set(s.trips.filter((t) => t.status === 'active').map((t) => t.runId || t.id));
    const old = s.trips.filter((t) => pick(t) && t.day && t.day !== today && t.status !== 'active' && !busy.has(t.runId || t.id));
    if (!old.length) return;
    const groups = {};
    old.forEach((t) => (groups[t.runId || t.id] = groups[t.runId || t.id] || []).push(t));
    Object.values(groups).forEach((g) => logRun(s, g));
    s.trips = s.trips.filter((t) => !old.includes(t));
  }
  /** جێگرەوەیەک کە سەرنشین ڕەتی کردەوە: هەموو گەشتەکانی ئەو جێگرەوەیە دەگەڕێنەوە بۆ شۆفێری یەکەم */
  function revertRejectedSwaps(s) {
    s.swaps.filter((w) => w.status === 'rejected').forEach((w) => {
      s.trips.filter((t) => t.swapId === w.id && t.originalDriverId && t.status === 'scheduled').forEach((t) => {
        t.driverId = t.originalDriverId;
        t.originalDriverId = null;
        t.swapPay = null;
        t.swapId = null;
        t.swapOk = null;
        t.swapOpen = false;
      });
    });
  }
  /** فاتورەی مانگی نوێ */
  function fixBilling(b) {
    const mk = MONTH_KEY();
    if (b && b.monthKey !== mk) {
      b.monthKey = mk;
      b.month = fmt.MONTHS[new Date().getMonth()];
      b.paid = false;
      b.promo = null;
    }
  }
  /** خانەی «people» لەسەر بەشداری بە پێی خێزانی خاوەنەکەی (بۆ ئەوەی شۆفێر و هاوڕێکانی تەکسی بزانن کێن) */
  function syncPeople(s, sub) {
    const p = familyPeople(s, sub);
    if (p.length && stable(p) !== stable(sub.people || null)) sub.people = p;
  }
  /** ئەپی شۆفێر: گەشتەکانی دوێنێ دادەخات، گەشت و ڕۆتەکانی ئەمڕۆ ڕێک دەخات */
  function reconcileDriver(s, me) {
    s.day = TODAY();
    const mine = (t) => t.driverId === me || t.originalDriverId === me;
    closeOldTrips(s, mine);
    revertRejectedSwaps(s);
    s.subscriptions.filter((x) => x.driverId === me).forEach((x) => genTrips(s, x));
    (s.routes || []).filter((r) => r.driverId === me).forEach((r) => syncRun(s, r));
    // سەرنشینێک کە دوای دەستپێکردنی ڕۆت «نایەم»ی کرد: وێستگەکانی لە گەشتە چالاکەکان لادەبرێن
    s.trips.filter((t) => t.status === 'skipped' && t.runId && mine(t)).forEach((t) => {
      s.trips.filter((x) => x.runId === t.runId && x.status === 'active').forEach((x) => {
        if ((x.stops || []).some((st) => !st.done && (st.subIds || []).includes(t.subId))) x.stops = dropSubFromStops(x.stops, t.subId);
      });
    });
    s.swaps = s.swaps.filter((w) => w.fromDriverId !== me || s.trips.some((t) => t.id === w.tripId));
  }
  /** ئەپی سەرنشین: گەشتی ئەمڕۆی بەشدارییەکانی خۆی و فاتورەی مانگی نوێ */
  function reconcilePassenger(s) {
    s.day = TODAY();
    fixBilling(s.billing);
    if (walletOn() && dueLines(s, 'me').length) {
      const mk = MONTH_KEY();
      const inv = TK.invoice(s, 'me', { due: true });
      // پارەدان هەمیشە بە دەستی سەرنشینە، تەنها ئاگادار دەکرێتەوە
      if (s.billing.dueNotice !== mk) {
        s.billing.dueNotice = mk;
        notice(s, { kind: 'pay', title: 'پارەی مانگ ئامادە بکە', body: `${fmt.money(inv.total)}، گەشتەکان دوای پارەدان دەست پێدەکەن`, link: 'wallet' });
      }
    }
    s.subscriptions.filter((x) => (x.owner || 'me') === 'me').forEach((x) => {
      syncPeople(s, x);
      genTrips(s, x);
    });
  }
  /** بەڕێوەبەر: هەموو شتێک (بۆ ئەو شۆفێرانەی ئەمڕۆ ئەپەکەیان نەکردووەتەوە) و ئاگادارکردنەوەی بەسەرچوونی بەڵگەنامە */
  function ensureDay(s) {
    s.day = TODAY();
    walletBonuses(s);
    closeOldTrips(s, () => true);
    revertRejectedSwaps(s);
    s.subscriptions.forEach((x) => genTrips(s, x));
    (s.routes || []).forEach((r) => syncRun(s, r));
    s.swaps = s.swaps.filter((w) => s.trips.some((t) => t.id === w.tripId));
    fixBilling(s.billing);
    Object.values(s.vault || {}).forEach((v) => !v.__stub && fixBilling(v.billing));
    // بەڵگەنامەی بەسەرچوو یان نزیک لە بەسەرچوون: ئاگادارکردنەوەی سوور بۆ بەڕێوەبەر و شۆفێر
    s.drivers.forEach((d) => {
      TK.expiries(d).forEach((e) => {
        if (e.days > cfg().expiryWarnDays) return;
        const key = `exp:${d.id}:${e.key}:${e.date}:${e.days < 0 ? 'x' : 'w'}`;
        if ((s.adminNotices || []).some((x) => x.key === key)) return;
        anotice(s, { key, kind: 'expiry', red: true, driverId: d.id, title: e.days < 0 ? `${e.label}ی ${d.name} بەسەرچووە` : `${e.label}ی ${d.name} ${e.days} ڕۆژی ماوە`, body: `بەرواری بەسەرچوون: ${fmt.day(e.date)}`, link: `driver/${d.id}` });
        dnotice(s, d.id, { kind: 'info', red: true, title: e.days < 0 ? `${e.label}ەکەت بەسەرچووە` : `${e.label}ەکەت ${e.days} ڕۆژی ماوە`, body: 'تکایە بەڵگەنامەی نوێ بار بکە لە پرۆفایل', link: 'profile' });
      });
    });
  }
  TK.ensureDay = () => reconcile();

  /** گۆڕینی خاوەن لە هەموو تۆمارە هاوبەشەکان («me» ← UID و بە پێچەوانەوە) */
  function retag(s, from, to) {
    (s.wallet || []).forEach((e) => {
      if (e.role !== 'p') return;
      if (e.who === from) e.who = to;
      if (e.type === 'xfer' && e.to === from) e.to = to;
    });
    (s.topups || []).forEach((x) => x.owner === from && (x.owner = to));
    (s.withdraws || []).forEach((w) => w.role === 'p' && w.driverId === from && (w.driverId = to));
    (s.driverLog || []).forEach((e) => (e.riders || []).forEach((r) => (r.owner || 'me') === from && (r.owner = to)));
    s.requests.forEach((r) => r.owner === from && (r.owner = to));
    s.messages.forEach((m) => m.peer === from && (m.peer = to));
    s.subscriptions.forEach((x) => (x.owner || 'me') === from && (x.owner = to));
    s.trips.forEach((t) => {
      if ((t.owner || 'me') === from) t.owner = to;
      // لە ڕۆتی هاوبەش، هەر وێستگەیەک خاوەنی خۆی هەیە (بۆ نامە و پەیوەندی شۆفێر)
      (t.stops || []).forEach((st) => (st.parts || []).forEach((p) => (p.owner || 'me') === from && (p.owner = to)));
    });
  }
  /* =========================================================
   * ٧. کردارەکان
   * ======================================================= */
  /** دوای چوونەدەرەوە کۆپی ناوخۆی زانیارییەکان لەسەر ئەم مۆبایلە دەسڕدرێتەوە (بۆ مۆبایلی هاوبەش) */
  async function clearDevice() {
    if (!window.TKFB.clearCache) return;
    try {
      await window.TKFB.clearCache();
    } catch (e) {
      /* هیچ */
    }
    location.reload();
    await new Promise(() => {});
  }
  /** چاوەڕێی نووسینە نەنێردراوەکان (زۆرترین ٣ چرکە، بێ ئینتەرنێت هەتاهەتایە ناوەستێت) */
  const settle = () => Promise.race([cloud.pending, new Promise((r) => setTimeout(r, 3000))]);
  /** گۆڕینی وشەی نهێنی هەژماری ئێستا */
  async function changePass(oldPass, newPass) {
    const nc = needCloud();
    if (nc) return nc;
    try {
      await window.TKFB.changePassword(oldPass, newPass);
      return null;
    } catch (e) {
      return /invalid-credential|wrong-password/.test((e && e.code) || '') ? 'وشەی نهێنی ئێستا هەڵەیە' : authErr(e);
    }
  }
  const cleanPhone = (phone) => String(phone || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').replace(/^964/, '').replace(/^0/, '');
  TK.cleanPhone = cleanPhone;
  const actions = {
    /** سڕینەوەی هەموو زانیارییەکان لە Firebase (تەنها بەڕێوەبەر). هەژمارەکانی چوونەژوورەوە لە Authentication دەمێننەوە */
    wipeAll() {
      if (ROLE !== 'admin') return;
      TK.clearImages();
      update((s0) => {
        const s = createSeed();
        s.settings = s0.settings;
        return s;
      });
    },
    setSetting(key, value) {
      update((s) => {
        s.settings[key] = value;
      });
    },
    markNewsSeen(id) {
      if (state.seenNews.includes(id)) return;
      update((s) => {
        s.seenNews.push(id);
      });
    },

    /* ---------- سەرنشین ---------- */
    finishOnboarding() {
      update((s) => {
        s.passenger.onboarded = true;
      });
    },
    /** چوونەژوورەوە بە ژمارە و وشەی نهێنی. Promise: هەڵە یان null */
    async login(phone, pass) {
      const p = cleanPhone(phone);
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 7xx xxx xxxx)';
      if (!pass) return 'وشەی نهێنی بنووسە';
      const nc = needCloud();
      if (nc) return nc;
      let u;
      try {
        u = await signInPhone(p, 'p', pass);
      } catch (e) {
        return authErr(e);
      }
      await TK.whenReady(u.uid);
      const acc = state.accounts.find((a) => a.uid === u.uid);
      if (acc && acc.blocked) {
        await window.TKFB.signOut();
        return 'ئەم ئەکاونتە ڕاگیراوە. پەیوەندی بە پشتگیری بکە';
      }
      update((s) => {
        s.passenger.onboarded = true;
        // ئەگەر تۆمارکردن نیوەچڵ مابوو (ئینتەرنێت بڕا)، هەژمارەکە تەواو دەکرێت
        if (!s.accounts.some((a) => a.uid === u.uid)) s.accounts.push({ uid: u.uid, phone: p, name: s.passenger.name || '', city: s.passenger.city || 'erbil', createdAt: Date.now(), partnerId: null });
        if (!s.passenger.phone) s.passenger.phone = p;
      });
      return null;
    },
    async register(name, phone, pass, ref, city, gender) {
      const p = cleanPhone(phone);
      if (name.trim().split(/\s+/).length < 2) return 'ناوی تەواوت بنووسە (ناو و ناوی باوک)';
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 7xx xxx xxxx)';
      if (pass.length < 6) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت';
      if (gender !== 'm' && gender !== 'f') return 'ڕەگەز هەڵبژێرە (نێر یان مێ)';
      const nc = needCloud();
      if (nc) return nc;
      // کۆدی بانگهێشت: کۆدی هاوبەش (قوتابخانە، کۆمپانیا) یان کۆدی هاوڕێ
      const inv = await TK.resolveInvite(ref);
      if (inv && inv.bad) return 'کۆدی بانگهێشت نەدۆزرایەوە. دڵنیابە لە کۆدەکە یان بەتاڵی بهێڵەوە';
      const partner = inv && inv.partner;
      const friend = inv && inv.friend;
      let u;
      try {
        u = await window.TKFB.signUp(emailOf(p, 'p'), pass);
      } catch (e) {
        return authErr(e);
      }
      await TK.whenReady(u.uid);
      update((s) => {
        const P = emptyPassenger(name.trim(), p);
        PRIV.forEach((k) => (s[k] = P[k]));
        s.accounts = s.accounts.filter((a) => a.uid !== u.uid);
        s.accounts.push({ uid: u.uid, phone: p, name: name.trim(), city: city || 'erbil', createdAt: Date.now(), partnerId: partner ? partner.id : null, refBy: friend && friend.uid !== u.uid ? friend.uid : null });
        if (friend && friend.uid !== u.uid && cfg().refOn) {
          const first = name.trim().split(' ')[0];
          s.referrals = (s.referrals || []).filter((x) => x.id !== u.uid);
          s.referrals.push({ id: u.uid, inviter: friend.uid, invitee: u.uid, inviterName: friend.name || '', inviteeName: first, code: friend.code, status: 'joined', amount: null, at: Date.now() });
          notifyPax(s, friend.uid, { kind: 'info', title: `${first} بە کۆدەکەت هات`, body: 'کاتێک بەشداری بکات، هەردووکتان داشکاندن وەردەگرن', link: 'rewards' });
        }
        s.passenger.city = city || 'erbil';
        s.passenger.gender = gender;
        if (s.family.members[0]) s.family.members[0].woman = gender === 'f';
        s.passenger.loggedIn = true;
        s.passenger.onboarded = true;
        notice(s, { kind: 'info', title: `بەخێربێیت ${name.trim().split(' ')[0]}`, body: 'یەکەم بەشداری مانگانەت دروست بکە. شوێن و کات دیاری بکە و شۆفێرەکان نرخت بۆ دەنێرن.' });
        if (friend && friend.uid !== u.uid && cfg().refOn) notice(s, { kind: 'info', title: `بانگهێشتی ${friend.name || 'هاوڕێکەت'}`, body: `${TK.refText()} داشکاندن لە یەکەم مانگی بەشدارییەکەت`, link: 'rewards' });
      });
      TK.ensureRefCode();
      return null;
    },
    /** زیادکردنی کۆدی هاوبەش دوای تۆمارکردن (تەنها ئەگەر پێشتر نەبووبێت) */
    setPartnerCode(code) {
      const pt = TK.partnerByCode(code);
      if (!pt) return 'ئەم کۆدە دروست نییە';
      const acc = state.accounts.find((a) => a.uid === cloud.me);
      if (!acc) return 'ئەکاونت نەدۆزرایەوە';
      if (acc.partnerId) return 'پێشتر کۆدێکت تۆمار کردووە';
      update((s) => {
        s.accounts.find((a) => a.uid === cloud.me).partnerId = pt.id;
      });
      return null;
    },
    async logout() {
      if (window.TKFB && cloud.on) {
        await settle();
        await window.TKFB.signOut();
        await clearDevice();
      }
    },
    updateProfile(name, homeId, city, gender) {
      update((s) => {
        s.passenger.name = name;
        if (gender === 'm' || gender === 'f') {
          s.passenger.gender = gender;
          if (s.family.members[0]) s.family.members[0].woman = gender === 'f';
        }
        // ماڵی نوێ: شوێنی پێشووی سەر نەخشە ئیتر ڕاست نییە
        if (s.passenger.homeId !== homeId && s.pins && s.pins._home) delete s.pins._home;
        s.passenger.homeId = homeId;
        if (city) s.passenger.city = city;
        const acc = s.accounts.find((a) => a.uid === cloud.me);
        if (acc) {
          acc.name = name;
          if (city) acc.city = city;
        }
        const owner = s.family.members[0];
        if (owner) {
          owner.name = name.split(' ')[0];
          owner.initial = name.slice(0, 1);
        }
      });
    },
    async changePassword(oldPass, newPass) {
      if (String(newPass || '').length < 6) return 'وشەی نهێنی نوێ دەبێت لانیکەم ٦ پیت بێت';
      return changePass(oldPass, newPass);
    },
    /**
     * سەرنشین هەژمارەکەی خۆی دەسڕێتەوە:
     * بەشدارییەکان هەڵدەوەشێنەوە (شۆفێر ئاگادار دەکرێتەوە)، زانیاری کەسی (ناو، ژمارە، خێزان، شوێنەکان، ئاگادارکردنەوە و مێژوو) دەسڕێتەوە،
     * داواکارییە کۆنەکان بێناو دەکرێن، پاشان هەژماری چوونەژوورەوە دەسڕدرێتەوە.
     * گەشت و نامە کۆنەکان (بێ ژمارە و بێ ناوی تەواو) بۆ حیسابی شۆفێر و سکاڵا دەمێننەوە.
     */
    async deleteMyAccount(pass) {
      const nc = needCloud();
      if (nc) return nc;
      if (ROLE !== 'passenger' || !cloud.me) return 'نەکرا';
      const me = cloud.me;
      const acc = state.accounts.find((a) => a.uid === me);
      if (acc && acc.blocked) return 'ئەم هەژمارە ڕاگیراوە. بۆ سڕینەوە پەیوەندی بە پشتگیری یەکسا بکە';
      if (state.trips.some((t) => (t.owner || 'me') === 'me' && t.status === 'active')) return 'گەشتێکت ئێستا لە ڕێگەیە. دوای تەواوبوونی هەوڵ بدەرەوە';
      if (walletOn() && (TK.balance(state, 'me') > 0 || TK.pendingWithdraw(state, 'me') > 0)) return 'سەرەتا پارەی جزدانەکەت ڕابکێشە (یان بینێرە)، پاشان هەژمارەکە بسڕەوە';
      if (walletOn() && (state.topups || []).some((x) => x.owner === 'me' && x.status === 'pending')) return 'داواکارییەکی زیادکردنت چاوەڕێیە. سەرەتا هەڵیبوەشێنەوە یان چاوەڕێی پەسەندکردن بکە';
      try {
        await window.TKFB.reauth(String(pass || ''));
      } catch (e) {
        return authErr(e);
      }
      const name = state.passenger.name;
      const errBefore = cloud.lastWriteError;
      // ژمارەکەی لە لیستی «ناردن» لادەبرێت
      try {
        const key = String((cloud.user && cloud.user.email) || '').split('@')[0];
        if (key) await window.TKFB.write({ op: 'delete', path: 'pdir/' + key });
      } catch (e) {
        /* بەڕێوەبەر دەتوانێت بیسڕێتەوە */
      }
      update((s) => {
        s.subscriptions.filter((x) => (x.owner || 'me') === 'me').map((x) => x.id).forEach((id) => endSub(s, id, 'deleted'));
        // ناوەکان لە گەشتە کۆنەکانی خۆی
        s.trips.filter((t) => (t.owner || 'me') === 'me').forEach((t) => {
          t.title = 'گەشتی بەکارهێنەری سڕاوە';
          (t.stops || []).forEach((st) => {
            (st.parts || []).forEach((p) => {
              if ((p.owner || 'me') !== 'me') return;
              p.riders = 'سڕاوە';
              p.people = (p.people || []).map((x) => Object.assign({}, x, { n: '' }));
            });
            if (st.parts) mergeParts(st);
          });
        });
        s.requests.filter((r) => r.owner === 'me').forEach((r) => {
          if (r.status === 'open') {
            r.status = 'closed';
            r.closedReason = 'cancel';
            (r.offers || []).forEach((o) => o.status === 'pending' && (o.status = 'lost'));
          }
          r.ownerName = 'بەکارهێنەری سڕاوە';
          r.riderNames = 'سڕاوە';
          r.note = '';
        });
        s.notices = [];
        s.history = [];
        anotice(s, { kind: 'info', title: 'سەرنشینێک هەژمارەکەی سڕییەوە', body: `${name || ''}. ئەگەر ڕاپۆرت یان تۆماری هاوبەشی هەبێت، لە پانێڵ بیانسڕەوە` });
      });
      // چاوەڕێ دەکرێت تا هەموو گۆڕانکارییەکان بە دڵنیایی گەیشتنە سێرڤەر (بێ ئەوە سڕینەوە ناتەواو دەبێت)
      const FAIL = 'سڕینەوە تەواو نەبوو. ئینتەرنێت بپشکنە و دووبارە هەوڵ بدەرەوە';
      const ok = await Promise.race([
        Promise.resolve(cloud.pending).then(() => (window.TKFB.waitWrites ? window.TKFB.waitWrites() : null)).then(() => true, () => false),
        new Promise((r) => setTimeout(() => r(false), 30000)),
      ]);
      if (!ok || cloud.lastWriteError !== errBefore) return FAIL;
      // پرۆفایلەکان بە دەست دەسڕدرێنەوە (cloudFlush هەرگیز پرۆفایلی خۆت ناسڕێتەوە)
      cloud.deleting = true;
      try {
        for (const path of ['pax/' + me, 'accounts/' + me]) await window.TKFB.write({ op: 'delete', path });
        await window.TKFB.deleteUser();
      } catch (e) {
        cloud.deleting = false;
        console.warn('سڕینەوەی هەژمار', e && e.code);
        return FAIL;
      }
      await clearDevice();
      return null;
    },

    addMember(name, kind, woman, age) {
      update((s) => {
        s.family.members.push({
          id: 'm' + uid(), name, initial: name.slice(0, 1), kind, woman, age: kind === 'child' ? age : undefined,
          relation: kind === 'child' ? (woman ? 'کچ' : 'کوڕ') : 'ئەندامی خێزان',
        });
      });
    },
    removeMember(id) {
      update((s) => {
        s.family.members = s.family.members.filter((m) => m.id !== id);
      });
    },
    addGuardian(name, woman) {
      update((s) => {
        s.family.guardians.push({ name, initial: name.slice(0, 1), woman });
      });
    },

    /** دروستکردنی داواکاری (بڵاوکردنەوە یان ڕاستەوخۆ). ئەگەر «تەکسی جیا» بێت بۆ هەر کەسێک یەک داواکاری */
    createRequests(draft, target) {
      const ids = [];
      update((s) => {
        const groups = draft.mode === 'separate' ? draft.memberIds.map((id) => [id]) : [draft.memberIds.slice()];
        const groupId = uid();
        const now = Date.now();
        groups.forEach((g) => {
          const members = g.map((id) => s.family.members.find((m) => m.id === id)).filter(Boolean);
          const hasChild = members.some((m) => m.kind === 'child');
          const hasAdult = members.some((m) => m.kind !== 'child');
          // منداڵ هەرگیز لەگەڵ کەسی گەورەی نەناسراو سوار ناکرێت
          const rideType = draft.rideType === 'private' ? 'private' : hasChild && hasAdult ? 'family' : hasChild ? 'kids' : 'shared';
          const from = TK.place(draft.fromId);
          const to = TK.place(draft.toId);
          // شوێنی ورد تەنها لای سەرنشین (pins) دەمێنێتەوە؛ داواکارییەکە کە شۆفێران دەیبینن تەنها نووسینەکەی تێدایە
          const fromGeo = TK.isGeo(draft.fromGeo) ? draft.fromGeo : null;
          const toGeo = TK.isGeo(draft.toGeo) ? draft.toGeo : null;
          const km = Math.round(TK.distance(draft.fromId, draft.toId, fromGeo, toGeo) * 10) / 10;
          const pd = draft.perDay ? TK.normPerDay(draft.perDay) : null;
          const sched = pd && !pd.empty ? { perDay: pd.perDay, days: pd.days, go: pd.go, back: pd.back } : { perDay: null, days: draft.days.slice(), go: draft.dir !== 'back' ? draft.go : null, back: draft.dir !== 'go' ? draft.backTime : null };
          const base = {
            fromId: draft.fromId, toId: draft.toId, days: sched.days, go: sched.go, back: sched.back, perDay: sched.perDay,
            mode: draft.mode, rideType, riders: g.length, hasChild, km,
          };
          const r = {
            id: 'q' + uid(), groupId, owner: 'me', ownerName: s.passenger.name.split(' ')[0], city: s.passenger.city || 'erbil',
            memberIds: g, riders: g.length, riderNames: fmt.names(members.map((m) => m.name)), hasChild,
            fromId: draft.fromId, toId: draft.toId,
            from: from.name + (draft.fromNote ? `، ${draft.fromNote}` : ''),
            to: to.name + (draft.toNote ? `، ${draft.toNote}` : ''),
            km,
            go: sched.go, back: sched.back, days: sched.days, perDay: sched.perDay,
            replacesSub: draft.replacesSub || null,
            startDate: draft.startDate || null,
            mode: draft.mode, rideType, womanOnly: draft.womanOnly, note: draft.note || '',
            price: TK.priceFor(base), target, status: 'open',
            createdAt: now, expiresAt: now + cfg().requestHours * 3600000, offers: [], declined: [],
          };
          s.requests.unshift(r);
          ids.push(r.id);
          if (fromGeo || toGeo) {
            s.pins = s.pins || {};
            s.pins[r.id] = { from: fromGeo, to: toGeo };
          }
        });
        // شوێنی ماڵ بۆ جاری داهاتوو
        if (TK.isGeo(draft.fromGeo) && draft.fromId && draft.fromId === s.passenger.homeId) {
          s.pins = s.pins || {};
          s.pins._home = { lat: draft.fromGeo.lat, lng: draft.fromGeo.lng };
        }
        // شۆفێرە ئامادەکان ئاگادار دەکرێنەوە ئەگەر داواکارییەکە بۆیان بگونجێت
        s.requests.filter((r) => ids.includes(r.id)).forEach((r) => {
          s.drivers.forEach((d) => {
            if (d.online && sel.fits(d, r)) {
              dnotice(s, d.id, { kind: 'offer', title: r.target === d.id ? `داواکاری ڕاستەوخۆ لە ${r.ownerName}` : `داواکاری نوێ لە ${r.ownerName}`, body: `${r.riderNames}، ${r.from.split('، ')[0]} ← ${r.to.split('، ')[0]}، ${fmt.money(r.price)}`, link: 'requests' });
            }
          });
        });
        notice(s, {
          kind: 'info',
          title: target === 'all' ? 'داواکارییەکەت بڵاو کرایەوە' : 'داواکارییەکەت نێردرا',
          body: target === 'all' ? 'کاتێک شۆفێرێک قبووڵی بکات ئاگادار دەکرێیتەوە' : `بۆ ${(sel.driver(target) || {}).name || 'شۆفێر'}`,
          link: 'requests',
        });
      });
      return ids;
    },
    cancelRequest(id) {
      update((s) => {
        const r = s.requests.find((x) => x.id === id);
        if (!r || r.status !== 'open') return;
        r.status = 'closed';
        r.closedReason = 'cancel';
        r.offers.forEach((o) => {
          if (o.status === 'pending') o.status = 'lost';
          dnotice(s, o.driverId, { kind: 'info', title: 'داواکارییەک هەڵوەشێنرایەوە', body: `${r.ownerName}، ${r.to.split('، ')[0]}`, link: 'requests' });
        });
      });
    },
    /** سەرنشین شۆفێرێک لەناو ئەوانەی نرخیان ناردووە هەڵدەبژێرێت */
    chooseOffer(reqId, driverId) {
      update((s) => {
        const r = s.requests.find((x) => x.id === reqId);
        if (!r || r.status !== 'open') return;
        const offer = r.offers.find((o) => o.driverId === driverId);
        if (!offer) return;
        r.status = 'matched';
        r.chosenDriverId = driverId;
        r.offers.forEach((o) => (o.status = o.driverId === driverId ? 'chosen' : 'lost'));
        const d = s.drivers.find((x) => x.id === driverId);
        const sub = {
          id: 'sub' + uid(), reqId, owner: r.owner, memberIds: r.memberIds, riderNames: r.riderNames, hasChild: r.hasChild, driverId, from: r.from, to: r.to, go: r.go, back: r.back, km: r.km,
          days: r.days, perDay: r.perDay || null, mode: r.mode, riders: r.riders, rideType: r.rideType, womanOnly: r.womanOnly, note: r.note || '', price: offer.price, status: 'active', startDate: r.startDate || null, pauseLog: [], createdAt: Date.now(),
          ownerName: r.ownerName || '',
        };
        // وێنەی سەرنشین تەنها لە بەشدارییەکەدایە، کە تەنها خۆی و شۆفێرەکەی دەیبینن
        const ownerPhoto = ((pslice(s, r.owner) || {}).passenger || {}).photo;
        if (ownerPhoto) sub.ownerPhoto = ownerPhoto;
        // شوێنی ورد تەنها دوای هەڵبژاردن دەدرێت بە شۆفێر (بەشداری تەنها خۆی و شۆفێرەکەی دەیبینن)
        const pin = (pslice(s, r.owner) || {}).pins || {};
        const pg = pin[r.id] || {};
        const fg = TK.isGeo(pg.from) ? pg.from : TK.placeGeo(r.fromId);
        const tg = TK.isGeo(pg.to) ? pg.to : TK.placeGeo(r.toId);
        if (fg) sub.fromGeo = { lat: fg.lat, lng: fg.lng };
        if (tg) sub.toGeo = { lat: tg.lat, lng: tg.lng };
        sub.people = familyPeople(s, sub);
        s.subscriptions.push(sub);
        genTrips(s, sub);
        // بانگهێشت: یەکەم بەشداری ئاراس هەردووکیان داشکاندن پێدەبەخشێت
        const ref = (s.referrals || []).find((x) => x.invitee === meUid(r.owner));
        if (ref && r.replacesSub && ref.subId === r.replacesSub) ref.subId = sub.id;
        else if (ref && ref.status === 'joined' && cfg().refOn) {
          Object.assign(ref, { status: 'subscribed', subId: sub.id, amount: TK.refAmount(sub.price), month: (sub.startDate || TODAY()).slice(0, 7), subAt: Date.now() });
          notifyPax(s, ref.inviter, { kind: 'info', title: `${ref.inviteeName || 'هاوڕێکەت'} بەشداری کرد`, body: `${fmt.money(ref.amount)} داشکاندن لە فاتورەی داهاتووت دەبڕدرێت`, link: 'rewards' });
        }
        if (r.replacesSub) endSub(s, r.replacesSub, 'change');
        if (d) d.freeSeats = Math.max(0, d.freeSeats - (r.mode === 'one' ? r.riders : 1));
        notice(s, { kind: 'info', title: 'بەشدارییەکەت چالاک کرا', body: `${r.riderNames} لەگەڵ ${d ? d.name : 'شۆفێر'}، ${fmt.money(offer.price)} مانگانە` }, r.owner);
        dnotice(s, driverId, { kind: 'ok', title: `${r.ownerName} تۆی هەڵبژارد`, body: `${r.from} ← ${r.to}، ${fmt.money(offer.price)} مانگانە`, link: 'routes' });
        r.offers.filter((o) => o.driverId !== driverId).forEach((o) => dnotice(s, o.driverId, { kind: 'info', title: 'سەرنشین شۆفێرێکی تری هەڵبژارد', body: `${r.ownerName}، ${r.from.split('، ')[0]} ← ${r.to.split('، ')[0]}. داواکارییەکە داخرا.`, link: 'requests' }));
      });
    },

    /** ناردنی نامە لە نێوان شۆفێر (driverId) و سەرنشین (peer) */
    sendMessage(driverId, peer, text, fromDriver) {
      update((s) => {
        const now = Date.now();
        const msgId = uid();
        const nid = uid();
        // nid: ئاگادارکردنەوەکەی وەرگر، بۆ ئەوەی ئەگەر نامەکە گەڕێنرایەوە دەقەکەی لەویش بسڕدرێتەوە
        s.messages.push({ id: msgId, driverId, peer, fromDriver, text, at: now, readP: !fromDriver, readD: fromDriver, nid });
        const d = s.drivers.find((x) => x.id === driverId);
        if (fromDriver) notice(s, { id: nid, kind: 'chat', title: `نامە لە ${d ? d.name : 'شۆفێر'}`, body: text, link: `chat/${driverId}`, msgId }, peer);
        else dnotice(s, driverId, { id: nid, kind: 'chat', title: `نامە لە ${sel.peerName(peer)}`, body: text, link: `chat/${encodeURIComponent(peer)}`, msgId });
      });
    },
    /**
     * گەڕاندنەوەی نامە تەنها تا ٥ خولەک دوای ناردن. لای هەردوولا «ئەم نامەیە گەڕێنرایەوە» دەردەکەوێت.
     * دەقی ڕاستەقینە تەنها بۆ بەڕێوەبەر هەڵدەگیرێت (بۆ سکاڵا و سەلامەتی).
     */
    unsendMessage(id) {
      const m = state.messages.find((x) => x.id === id);
      if (!m || m.system || m.unsent || m.voice) return 'ئەم نامەیە ناگەڕێنرێتەوە';
      if (!TK.canUnsend(m)) return 'تەنها تا ٥ خولەک دوای ناردن دەتوانیت نامە بگەڕێنیتەوە';
      update((s) => {
        const x = s.messages.find((y) => y.id === id);
        if (!x || x.unsent) return;
        const now = Date.now();
        s.unsent = s.unsent || [];
        s.unsent.unshift({ id: 'u' + uid(), msgId: x.id, text: x.text, sentAt: x.at, at: now, driverId: x.driverId, peer: x.peer === 'me' ? cloud.me : x.peer, fromDriver: !!x.fromDriver, by: cloud.me });
        x.text = '';
        x.unsent = true;
        x.unsentAt = now;
      });
      // دەقی نامەکە لە ئاگادارکردنەوەی وەرگریش دەسڕدرێتەوە (دوای ئەوەی نامەکە گەڕێنرایەوە)
      if (m.nid && window.TKFB) {
        const path = (m.fromDriver ? 'pnotices/' : 'dnotices/') + m.nid;
        Promise.resolve(cloud.pending)
          .then(() => window.TKFB.write({ op: 'update', path, data: { body: 'ئەم نامەیە گەڕێنرایەوە' } }))
          .catch((e) => console.warn('ئاگادارکردنەوەی نامە', e && e.code));
      }
      return null;
    },
    markThreadRead(driverId, peer, asDriver) {
      const need = state.messages.some((m) => m.driverId === driverId && m.peer === peer && (asDriver ? !m.fromDriver && !m.readD : m.fromDriver && !m.readP));
      if (!need) return;
      update((s) => {
        s.messages.forEach((m) => {
          if (m.driverId !== driverId || m.peer !== peer) return;
          if (asDriver && !m.fromDriver) m.readD = true;
          if (!asDriver && m.fromDriver) m.readP = true;
        });
      });
    },
    /** وێنەی پرۆفایلی سەرنشین (ئارەزوومەندانە). لە بەشدارییەکانیشی دادەنرێت بۆ ئەوەی شۆفێرەکەی بیبینێت */
    setMyPhoto(id) {
      const old = state.passenger.photo;
      update((s) => {
        s.passenger.photo = id || null;
        s.subscriptions.filter((x) => (x.owner || 'me') === 'me').forEach((x) => {
          if (id) x.ownerPhoto = id;
          else delete x.ownerPhoto;
        });
      });
      if (old && old !== id) TK.removeImage(old);
    },
    rateDriver(tripId, stars, tags) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t) return;
        t.ratedByPassenger = stars;
        const d = s.drivers.find((x) => x.id === t.driverId);
        if (d) {
          d.reviews = (d.reviews || 0) + 1;
          d.rating = Math.round((((d.rating || 0) * (d.reviews - 1) + stars) / d.reviews) * 10) / 10;
          d.tags = d.tags || [];
          tags.forEach((label) => {
            const tg = d.tags.find((x) => x.label === label);
            if (tg) tg.count += 1;
            else d.tags.push({ label, count: 1 });
          });
        }
        s.rewards.points += cfg().pointsPerRating || 0;
      });
    },

    setPayMethod(method) {
      update((s) => {
        s.billing.method = method;
      });
    },
    /** کۆدی داشکاندن: تەنها ئەو کۆدانەی بەڕێوەبەر لە هەواڵێکی چالاکدا داینابێت (١٠٪) */
    applyPromo(code) {
      const c = code.trim().toUpperCase();
      const n = state.news.find((x) => !x.hidden && x.code && x.code.toUpperCase() === c);
      if (!n) return 'ئەم کۆدە دروست نییە';
      if (state.billing.promo) return 'کۆدێکی داشکاندن پێشتر بەکارهاتووە';
      update((s) => {
        s.billing.promo = { code: c, rate: (n.rate || 10) / 100 };
      });
      return null;
    },
    /** تۆمارکردنی پارەدانی فاتورە. phone: بەتاڵ = سەرنشینی ئێستا، یان ژمارەی سەرنشینێک (بەڕێوەبەر) */
    pay(total, points, phone) {
      const st = state;
      const acc = phone && phone !== st.passenger.phone ? st.accounts.find((a) => a.phone === phone) : null;
      const owner = !phone || phone === st.passenger.phone ? 'me' : acc ? acc.uid : phone;
      if (phone && phone !== st.passenger.phone && !acc) return 'هەژماری ئەم ژمارەیە نەدۆزرایەوە';
      if (walletOn()) {
        // جزدان: بەڕێوەبەر کاشەکەی وەرگرت ← دەچێتە سەر جزدان و پارەی مانگ دەدرێت. سەرنشین ← تەنها لە جزدانەوە
        let err = null;
        update((s) => {
          if (ROLE === 'admin') {
            const inv = TK.invoice(s, owner, { due: true });
            const ps = pslice(s, owner);
            if (inv.total > 0) went(s, { id: 't' + uid(), who: owner, role: 'p', type: 'topup', amount: inv.total, method: 'cash', note: 'کاش، وەرگیرا لەلایەن بەڕێوەبەر', by: 'admin', name: ps ? ps.passenger.name : '' });
          }
          err = payMonthIn(s, owner);
        });
        return err;
      }
      update((s) => {
        const ps = pslice(s, owner);
        if (!ps) return;
        const inv = TK.invoice(s, owner);
        const pts = recordPayment(s, owner, inv);
        notice(s, { kind: 'pay', title: 'پارەدان تۆمار کرا', body: `${fmt.money(inv.total)}${pts ? `، ${pts} خاڵی پاداشت زیاد کرا` : ''}` }, owner);
      });
      return null;
    },
    /* ---------- جزدان ---------- */
    /** سەرنشین پارەی مانگ لە جزدانەکەی دەدات. هەڵە یان null */
    payMonth() {
      let err = null;
      update((s) => {
        err = payMonthIn(s, 'me');
      });
      return err;
    },
    /** داواکاری پڕکردنەوە: سەرنشین پارەی نارد (FIB، FastPay) یان دەیدات بە بەڕێوەبەر (کاش). بەڕێوەبەر پەسەندی دەکات */
    requestTopup(amount, method, ref, photo) {
      let id = null;
      const d = ROLE === 'driver' ? sel.me() : null;
      if (ROLE === 'driver' && !d) return null;
      update((s) => {
        id = 'tp' + uid();
        const who = d ? { owner: d.id, role: 'd', name: d.name, phone: d.phone } : { owner: 'me', role: 'p', name: s.passenger.name, phone: s.passenger.phone };
        s.topups.unshift(Object.assign({ id, kind: 'topup', amount, method, ref: ref || '', photo: photo || null, status: 'pending', at: Date.now() }, who));
        anotice(s, { kind: 'pay', title: `زیادکردن: ${who.name}${d ? ' (شۆفێر)' : ''}`, body: `${fmt.money(amount)}، ${TK.payName(method)}${ref ? `، ${ref}` : ''}`, link: 'wallet' });
      });
      return id;
    },
    cancelTopup(id) {
      update((s) => {
        const x = s.topups.find((y) => y.id === id && y.status === 'pending' && y.kind !== 'refund');
        if (x) x.status = 'cancelled';
      });
    },
    /** بەڕێوەبەر: پڕکردنەوە (یان گەڕاندنەوە) پەسەند دەکات ← دێڕێک لە دەفتەر و ئاگادارکردنەوە */
    approveTopup(id, amount) {
      let err = null;
      update((s) => {
        const x = s.topups.find((y) => y.id === id);
        if (!x || x.status !== 'pending') {
          err = 'ئەم داواکارییە ئیتر چاوەڕێ نییە';
          return;
        }
        const a = Math.round(amount > 0 ? amount : x.amount);
        const refund = x.kind === 'refund';
        const e = went(s, { id: 't_' + safeId(id), who: x.owner, role: x.role || 'p', type: refund ? 'refund' : 'topup', amount: a, method: x.method, ref: x.ref || '', note: refund ? x.note : `${TK.payName(x.method)}${x.ref ? `، حەواڵە ${x.ref}` : ''}`, name: x.name, req: id, subId: x.subId || null });
        if (!e) {
          err = 'پێشتر تۆمار کراوە';
          return;
        }
        x.status = 'approved';
        x.amount = a;
        x.decidedAt = Date.now();
        x.entryId = e.id;
        const n = { kind: 'pay', title: refund ? 'پارەکەت گەڕایەوە' : 'پارە زیاد کرا بۆ جزدانەکەت', body: `${fmt.money(a)} چووە سەر جزدانەکەت` };
        if (x.role === 'd') dnotice(s, x.owner, Object.assign(n, { link: 'earnings' }));
        else notice(s, Object.assign(n, { link: 'wallet' }), x.owner);
      });
      return err;
    },
    rejectTopup(id, why) {
      update((s) => {
        const x = s.topups.find((y) => y.id === id);
        if (!x || x.status !== 'pending') return;
        x.status = 'rejected';
        x.why = why || '';
        x.decidedAt = Date.now();
        const n = { kind: 'info', title: x.kind === 'refund' ? 'داوای گەڕاندنەوە ڕەتکرایەوە' : 'زیادکردن پەسەند نەکرا', body: `${fmt.money(x.amount)}${why ? `، ${why}` : ''}. بۆ زانیاری پەیوەندی بە یەکسا بکە` };
        if (x.role === 'd') dnotice(s, x.owner, Object.assign(n, { link: 'earnings' }));
        else notice(s, Object.assign(n, { link: 'wallet' }), x.owner);
      });
    },
    /** بەڕێوەبەر: زیادکردن یان لێبڕینی دەستی (سەرنشین p، شۆفێر d) */
    walletAdjust(who, role, amount, note, method, kind) {
      update((s) => {
        const type = kind || (role === 'p' && amount > 0 && method ? 'topup' : 'adjust');
        went(s, { id: 'a' + uid(), who, role, type, amount: Math.round(amount), method: method || null, note: note || (amount > 0 ? 'زیادکردنی دەستی' : 'لێبڕینی دەستی'), by: 'admin' });
        const body = `${note ? note + '، ' : ''}${amount > 0 ? '+' : '−'}${fmt.money(Math.abs(amount))}`;
        if (role === 'd') dnotice(s, who, { kind: 'pay', title: amount > 0 ? 'پارە بۆ جزدانەکەت' : 'لێبڕین لە جزدانەکەت', body, link: 'earnings' });
        else notice(s, { kind: 'pay', title: amount > 0 ? 'پارە زیاد کرا بۆ جزدانەکەت' : 'لێبڕین لە جزدانەکەت', body, link: 'wallet' }, who);
      });
    },
    /** داوای ڕاکێشانی پارە (شۆفێر یان سەرنشین): یەکسا بە دەست دەینێرێت. هەڵە یان null */
    requestWithdraw(amount, method, account) {
      const d = ROLE === 'driver' ? sel.me() : null;
      if (ROLE === 'driver' && !d) return 'هەژمار نەدۆزرایەوە';
      const who = d ? d.id : 'me';
      const free = TK.balance(state, who) - TK.pendingWithdraw(state, who);
      const min = cfg().withdrawMin || 0;
      method = method || (d && d.payMethod) || '';
      account = String(account != null ? account : (d && d.payAccount) || '').trim();
      const m = TK.payMethod(method);
      amount = Math.round(amount);
      if (!(amount > 0)) return 'بڕەکە بنووسە';
      if (amount > free) return `زۆرترین ${fmt.money(Math.max(0, free))}`;
      if (min && amount < min) return `کەمترین بڕ ${fmt.money(min)}`;
      if (!m || m.on === false) return 'شێوازی ڕاکێشان هەڵبژێرە';
      if (m.account !== false && account.replace(/\D/g, '').length < 6) return `ژمارەی هەژماری ${m.name} بنووسە`;
      const name = d ? d.name : state.passenger.name;
      update((s) => {
        s.withdraws.unshift({ id: 'wd' + uid(), driverId: who, role: d ? 'd' : 'p', name, phone: d ? d.phone : s.passenger.phone, amount, method, account: m.account === false ? '' : account, status: 'pending', at: Date.now() });
        anotice(s, { kind: 'pay', title: `داوای ڕاکێشان: ${name}${d ? ' (شۆفێر)' : ''}`, body: `${fmt.money(amount)}، ${TK.payName(method)}${account && m.account !== false ? ` ${account}` : ''}`, link: 'wallet' });
      });
      return null;
    },
    /** دۆزینەوەی خاوەنی ژمارەیەک بۆ ناردن (سەرنشین بۆ سەرنشین، شۆفێر بۆ شۆفێر). { uid, name } یان { err } */
    async lookupPeer(phone) {
      const p = cleanPhone(phone);
      if (!/^7\d{9}$/.test(p)) return { err: 'ژمارەی مۆبایل دروست نییە' };
      const mine = ROLE === 'driver' ? cleanPhone((sel.me() || {}).phone) : cleanPhone(state.passenger.phone);
      if (p === mine) return { err: 'ناتوانیت بۆ خۆت بنێریت' };
      if (!window.TKFB || !window.TKFB.get) return { err: 'ئینتەرنێت نییە' };
      const col = ROLE === 'driver' ? 'ddir' : 'pdir';
      try {
        for (const k of [p, '0' + p]) {
          const d = await window.TKFB.get(col + '/' + k);
          if (d && d.uid && d.uid !== cloud.me) return { uid: d.uid, name: d.name || '', phone: p };
        }
      } catch (e) {
        return { err: 'پەیوەندی نییە، دووبارە هەوڵ بدەرەوە' };
      }
      return { err: ROLE === 'driver' ? 'هیچ شۆفێرێکی یەکسا بەم ژمارەیە نییە' : 'هیچ سەرنشینێکی یەکسا بەم ژمارەیە نییە' };
    },
    /** ناردنی پارە لە جزدانی خۆمەوە بۆ کەسێکی تر (هەمان ڕۆڵ). هەڵە یان null */
    sendMoney(peer, amount, note) {
      const d = ROLE === 'driver' ? sel.me() : null;
      if (ROLE === 'driver' && !d) return 'هەژمار نەدۆزرایەوە';
      if (!peer || !peer.uid || peer.uid === cloud.me) return 'وەرگر هەڵبژێرە';
      const who = d ? d.id : 'me';
      const free = TK.balance(state, who) - TK.pendingWithdraw(state, who);
      amount = Math.round(amount);
      if (!(amount > 0)) return 'بڕەکە بنووسە';
      if (amount > free) return `باڵانسەکەت بەس نییە (${fmt.money(Math.max(0, free))})`;
      const fromName = d ? d.name : state.passenger.name;
      let id = null;
      update((s) => {
        const e = went(s, { id: 'x' + uid(), who, role: d ? 'd' : 'p', type: 'xfer', to: peer.uid, toName: peer.name || '', fromName, amount: -amount, note: String(note || '').trim().slice(0, 80) });
        if (!e) return;
        id = e.id;
        const n = { kind: 'pay', title: `${fromName} پارەی بۆ ناردیت`, body: `${fmt.money(amount)} چووە سەر جزدانەکەت${e.note ? `، ${e.note}` : ''}` };
        if (d) dnotice(s, peer.uid, Object.assign(n, { link: 'earnings' }));
        else notifyPax(s, peer.uid, Object.assign(n, { link: 'wallet' }));
      });
      return id ? null : 'نەنێردرا، دووبارە هەوڵ بدەرەوە';
    },
    cancelWithdraw(id) {
      update((s) => {
        const w = s.withdraws.find((x) => x.id === id && x.status === 'pending');
        if (w) w.status = 'cancelled';
      });
    },
    /** بەڕێوەبەر پارەکەی نارد ← لە جزدانی شۆفێر دەبڕدرێت */
    markWithdrawSent(id, ref) {
      let err = null;
      update((s) => {
        const w = s.withdraws.find((x) => x.id === id);
        if (!w || w.status !== 'pending') {
          err = 'ئەم داوایە ئیتر چاوەڕێ نییە';
          return;
        }
        if (TK.balance(s, w.driverId) < w.amount) {
          err = `باڵانسەکەی بەس نییە (${fmt.money(TK.balance(s, w.driverId))})`;
          return;
        }
        const e = went(s, { id: 'w_' + safeId(id), who: w.driverId, role: w.role || 'd', type: 'withdraw', amount: -w.amount, method: w.method, ref: ref || '', note: `${TK.payName(w.method)}${w.account ? ` ${w.account}` : ''}`, req: id, by: 'admin' });
        if (!e) return;
        w.status = 'sent';
        w.sentAt = Date.now();
        w.ref = ref || '';
        const n = { kind: 'pay', title: 'پارەکەت نێردرا', body: `${fmt.money(w.amount)}، ${TK.payName(w.method)}${w.account ? ` ${w.account}` : ''}` };
        if (w.role === 'p') notice(s, Object.assign(n, { link: 'wallet' }), w.driverId);
        else dnotice(s, w.driverId, Object.assign(n, { link: 'earnings' }));
      });
      return err;
    },
    rejectWithdraw(id, why) {
      update((s) => {
        const w = s.withdraws.find((x) => x.id === id);
        if (!w || w.status !== 'pending') return;
        w.status = 'rejected';
        w.why = why || '';
        const n = { kind: 'info', title: 'داوای ڕاکێشان ڕەتکرایەوە', body: `${fmt.money(w.amount)}${why ? `، ${why}` : ''}` };
        if (w.role === 'p') notice(s, Object.assign(n, { link: 'wallet' }), w.driverId);
        else dnotice(s, w.driverId, Object.assign(n, { link: 'earnings' }));
      });
    },
    /** بەڕێوەبەر: «شۆفێر نەهات» پەسەند یان ڕەت دەکاتەوە (جزدان) */
    decideNoShow(reportId, ok, owner) {
      update((s) => {
        const r = s.reports.find((x) => x.id === reportId);
        if (!r || r.status !== 'open') return;
        r.status = ok ? 'approved' : 'rejected';
        r.decidedAt = Date.now();
        if (ok) {
          // بڕەکان لە یاساکانی ئێستاوە (نەک لە ڕاپۆرتەکەوە کە سەرنشین نووسیویەتی)
          const c = cfg();
          const penalty = c.noShowPenalty || 0;
          const credit = Math.min(c.noShowComp || 0, penalty);
          r.penalty = penalty;
          r.credit = credit;
          if (penalty) went(s, { id: 'np_' + safeId(r.id), who: r.driverId, role: 'd', type: 'penalty', amount: -penalty, note: `نەهاتن، ${r.title || ''}`, report: r.id, by: 'admin' });
          if (credit && owner) went(s, { id: 'nc_' + safeId(r.id), who: owner, role: 'p', type: 'comp', amount: credit, note: `قەرەبوو: شۆفێر نەهات، ${r.title || ''}`, report: r.id, by: 'admin' });
          if (owner) notice(s, { kind: 'pay', title: 'ڕاپۆرتەکەت پەسەند کرا', body: `${fmt.money(credit)} قەرەبوو چووە سەر جزدانەکەت`, link: 'wallet' }, owner);
          dnotice(s, r.driverId, { kind: 'info', red: true, title: 'سزا: نەهاتن', body: `${r.title || ''}، −${fmt.money(penalty)}`, link: 'earnings' });
        } else {
          // شۆفێر هاتبوو: پارەی ئەو گەشتەی بۆ دەچێت
          // دۆخی گەشتەکە ناگۆڕدرێت (ڕۆتی هاوبەش لەوانەیە پێشتر حیساب کرابێت)؛ پارەی ئەو گەشتە یەک جار بە ناسنامەی ڕاپۆرتەکە دەنووسرێت
          const lv = (() => { const sub = s.subscriptions.find((x) => x.id === r.subId); return (sub && legValue(s, sub, monthOf(r.day))) || r.legValue; })();
          if (lv) went(s, { id: 'en_' + safeId(r.id), who: r.driverId, role: 'd', type: 'earn', amount: r.legValue, day: r.day, month: monthOf(r.day), lines: [{ subId: r.subId, owner: owner || '', names: r.title || '', dir: r.dir, status: 'done', amount: r.legValue }], title: r.title || '', note: 'ڕاپۆرتی نەهاتن ڕەتکرایەوە', by: 'admin' });
          if (owner) notice(s, { kind: 'info', title: 'ڕاپۆرتەکەت پشکنرا', body: 'بە پێی زانیارییەکانی گەشت شۆفێر هاتبوو', link: 'support' }, owner);
          dnotice(s, r.driverId, { kind: 'ok', title: 'ڕاپۆرتی نەهاتن ڕەتکرایەوە', body: 'پارەی ئەو گەشتە بۆت دەچێت', link: 'earnings' });
        }
      });
    },
    /** بەڕێوەبەر جزدان چالاک دەکات: بەشدارییەکانی ئەم مانگە بە «پێشتر دراوە» دادەنرێن (موچەی ئەم مانگە بە شێوازی کۆن)، لە مانگی داهاتووەوە هەموو شت لە جزدانەوە */
    enableWallet(on) {
      update((s) => {
        s.config = Object.assign({}, s.config, { walletOn: !!on });
        if (!on) return;
        const mk = MONTH_KEY();
        s.subscriptions.forEach((x) => {
          if (x.status === 'ended' || subPaid(s, x, mk)) return;
          went(s, { id: `lg_${safeId(x.id)}_${mk}`, who: x.owner, role: 'p', type: 'legacy', amount: 0, month: mk, lines: [{ subId: x.id, driverId: x.driverId, names: x.riderNames }], note: 'ئەم مانگە بە شێوازی پێشوو', by: 'admin' });
        });
      });
    },
    /** گۆڕینەوەی خاڵ بە پاداشت: دەبێت بە داشکاندنی چاوەڕوان و لە فاتورەی داهاتوو دەبڕدرێت */
    redeem(id) {
      const x = TK.rewardsList().find((y) => y.id === id && y.on !== false);
      const r = state.rewards;
      if (!x || r.points < x.cost || (!x.repeat && (r.redeemed || []).includes(id))) return null;
      update((s) => {
        s.rewards.points -= x.cost;
        s.rewards.redeemed = (s.rewards.redeemed || []).filter((y) => y !== id).concat(id);
        s.rewards.pending = (s.rewards.pending || []).concat({ id: 'rp' + uid(), rid: x.id, title: x.title, kind: x.kind, amount: x.amount, at: Date.now() });
      });
      return x;
    },
    addTicket(subject) {
      update((s) => {
        const t = { id: 1000 + Math.floor(Math.random() * 9000), subject, status: 'open', at: Date.now(), by: s.passenger.name, phone: s.passenger.phone };
        s.tickets.unshift(t);
        anotice(s, { kind: 'ticket', title: `سکاڵا لە ${s.passenger.name}`, body: subject, link: 'reports' });
      });
    },
    /** ڕاگرتن / دەستپێکردنەوەی بەشداری. شۆفێر ئاگادار دەکرێتەوە */
    toggleSubPause(id) {
      update((s) => {
        const sub = s.subscriptions.find((x) => x.id === id);
        if (!sub) return;
        sub.status = sub.status === 'paused' ? 'active' : 'paused';
        const paused = sub.status === 'paused';
        syncRoutesOf(s, sub.id);
        sub.pauseLog = sub.pauseLog || [];
        if (paused) sub.pauseLog.push({ from: Date.now(), to: null });
        else if (sub.pauseLog.length && !sub.pauseLog[sub.pauseLog.length - 1].to) {
          sub.pauseLog[sub.pauseLog.length - 1].to = Date.now();
          refundRequest(s, sub, legsPaused(sub, sub.pauseLog[sub.pauseLog.length - 1]), 'ڕاگرتنی کاتی');
        }
        const names = sub.riderNames;
        const d = s.drivers.find((x) => x.id === sub.driverId);
        notice(s, { kind: 'info', title: paused ? 'بەشدارییەکە ڕاگیرا' : 'بەشدارییەکە دەستی پێکردەوە', body: `${names}، ${d ? d.name : ''} ئاگادار کرایەوە` });
        dnotice(s, sub.driverId, { kind: paused ? 'info' : 'ok', title: paused ? `${s.passenger.name} بەشدارییەکەی ڕاگرت` : `${s.passenger.name} بەشدارییەکەی دەستپێکردەوە`, body: `${names}، ${sub.to}${paused ? '، تا ئاگاداری دووەم گەشت نییە' : ''}`, link: 'today' });
        s.messages.push({ id: uid(), driverId: sub.driverId, peer: 'me', fromDriver: false, system: true, text: paused ? `بەشداری ${names} بۆ ${sub.to} ڕاگیرا` : `بەشداری ${names} بۆ ${sub.to} دەستی پێکردەوە`, at: Date.now(), readP: true, readD: false });
      });
    },
    /** گۆڕینی کات و ڕۆژەکانی بەشداری */
    updateSub(id, patch) {
      update((s) => {
        const sub = s.subscriptions.find((x) => x.id === id);
        if (!sub) return;
        Object.assign(sub, patch);
        // گەشتەکانی ئەمڕۆ کە هێشتا دەستیان پێنەکردووە بە کاتی نوێ ڕێک دەخرێنەوە
        const today = (t) => t.subId === id && t.status === 'scheduled' && (!t.day || t.day === s.day);
        s.trips = s.trips.filter((t) => !(today(t) && (!dayApplies(sub) || !dayTime(sub, t.dir))));
        s.trips.filter((t) => today(t) && !t.runId).forEach((t) => {
          const time = dayTime(sub, t.dir);
          if (time && time !== t.time) {
            const shift = toMin(time) - toMin(t.time);
            t.time = time;
            t.stops.forEach((x) => (x.time = fmt.addMin(x.time, shift)));
          }
        });
        if (!dayApplies(sub)) s.trips = s.trips.filter((t) => !today(t));
        // ئەگەر کاتی نوێ لەگەڵ ڕۆتەکەی ناگونجێت، لە ڕۆتەکە دەردەچێت و شۆفێر ئاگادار دەکرێتەوە
        (s.routes || []).filter((r) => r.subIds.includes(id)).forEach((r) => {
          const tm = subTime(sub, r.dir);
          if (!tm || Math.abs(toMin(tm) - toMin(r.time)) > cfg().poolWindowMin) {
            r.subIds = r.subIds.filter((x) => x !== id);
            dnotice(s, sub.driverId, { kind: 'info', red: true, title: `${sub.riderNames} لە «${r.name}» دەرچوو`, body: 'کاتەکەی گۆڕی و ئیتر لەگەڵ ڕۆتەکە ناگونجێت', link: 'routes' });
          }
          syncRun(s, r);
        });
        s.routes = (s.routes || []).filter((r) => r.subIds.length);
        genTrips(s, sub);
        const text = `گۆڕانکاری لە بەشداری ${sub.riderNames}: ${fmt.schedule(sub)}، ${fmt.days(sub.days)}`;
        s.messages.push({ id: uid(), driverId: sub.driverId, peer: 'me', fromDriver: false, system: true, text, at: Date.now(), readP: true, readD: false });
        dnotice(s, sub.driverId, { kind: 'info', title: 'گۆڕانکاری لە بەشدارییەک', body: text, link: 'today' });
        notice(s, { kind: 'info', title: 'گۆڕانکارییەکان پاشەکەوت کران', body: 'شۆفێرەکە ئاگادار کرایەوە' });
      });
    },
    cancelSub(id) {
      update((s) => endSub(s, id, 'cancel'));
    },
    /** خێزان ڕازییە بە شۆفێری جێگرەوە */
    approveSwap(tripId) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (t) t.swapOk = true;
      });
    },
    /** خێزان شۆفێری جێگرەوە ڕەت دەکاتەوە: گەشتەکە دەگەڕێتەوە بۆ شۆفێری یەکەم */
    rejectSwap(tripId) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || !t.originalDriverId || t.status !== 'scheduled') return;
        const taker = t.driverId;
        const orig = t.originalDriverId;
        const w = s.swaps.find((x) => x.id === t.swapId);
        if (w) w.status = 'rejected';
        runOf(s, t).filter((x) => x.originalDriverId === orig).forEach((x) => {
          // سەرنشینانی تری هەمان تەکسی ئاگادار دەکرێنەوە کە شۆفێری خۆیان دێتەوە
          if (x.id !== t.id && x.status === 'scheduled') notice(s, { kind: 'info', title: 'شۆفێری خۆت دێت', body: `جێگرەوەکە لەلایەن سەرنشینێکی تری هەمان تەکسییەوە ڕەتکرایەوە. ${(s.drivers.find((y) => y.id === orig) || {}).name || 'شۆفێرەکەت'} خۆی دێت`, link: `track/${x.id}` }, x.owner);
          x.driverId = orig;
          x.originalDriverId = null;
          x.swapPay = null;
          x.swapId = null;
          x.swapOk = null;
        });
        const od = s.drivers.find((x) => x.id === orig);
        notice(s, { kind: 'info', title: 'جێگرەوەکە ڕەتکرایەوە', body: `${od ? od.name : 'شۆفێرەکەت'} ئاگادار کرایەوە` });
        dnotice(s, orig, { kind: 'info', title: 'سەرنشین جێگرەوەکەی ڕەتکردەوە', body: `${t.title}، ${fmt.clock(t.time)}، دەبێت خۆت بڕۆیت`, link: `trip/${t.id}` });
        dnotice(s, taker, { kind: 'info', title: 'گەشتی جێگرەوە لابرا', body: `${t.title}، سەرنشین شۆفێری خۆی دەوێت`, link: 'today' });
      });
    },
    /** سەرنشین ڕاپۆرت دەکات کە شۆفێر نەهات: قەرەبوو و سزا خۆکار جێبەجێ دەکرێن */
    reportNoShow(tripId, note) {
      const t0 = state.trips.find((x) => x.id === tripId);
      // تەنها دوای ئەوەی ١٠ خولەک لە کاتی گەشتەکە تێپەڕی (شۆفێر دوا کەوتووە و هێشتا دەستی پێنەکردووە)
      if (!t0 || t0.status !== 'scheduled') return 'ئەم گەشتە ناتوانرێت ڕاپۆرت بکرێت';
      if (TK.minutesUntil(t0.time) > -10) return `دەتوانیت ١٠ خولەک دوای کاتی گەشتەکە (${fmt.clock(fmt.addMin(t0.time, 10))}) ڕاپۆرت بکەیت`;
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || t.status !== 'scheduled') return;
        const c = cfg();
        if (walletOn()) {
          // جزدان: هیچ شتێک ناگۆڕێت تا بەڕێوەبەر دەیپشکنێت. پارەی ئەو گەشتە بۆ کەس ناچێت
          const sub = s.subscriptions.find((x) => x.id === t.subId);
          const mk = monthOf(t.day || s.day);
          t.status = 'noshow';
          s.reports.unshift({ id: 'r' + uid(), type: 'noshow', wallet: true, tripId, subId: t.subId, day: t.day || s.day, dir: t.dir, driverId: t.driverId, by: s.passenger.name, phone: s.passenger.phone, note: note || '', penalty: c.noShowPenalty, credit: Math.min(c.noShowComp, c.noShowPenalty), legValue: legValue(s, sub, mk), status: 'open', at: Date.now(), title: t.title });
          notice(s, { kind: 'info', title: 'ڕاپۆرتەکەت نێردرا', body: 'یەکسا دەیپشکنێت. ئەگەر پەسەند کرا، قەرەبووەکە دەچێتە سەر جزدانەکەت' });
          dnotice(s, t.driverId, { kind: 'info', red: true, title: 'ڕاپۆرتی نەهاتن', body: `${t.title}، یەکسا دەیپشکنێت. ئەگەر هەڵەیە پەیوەندی بە یەکسا بکە`, link: 'support' });
          anotice(s, { kind: 'report', red: true, title: `ڕاپۆرتی «شۆفێر نەهات» لە ${s.passenger.name}`, body: t.title, link: 'reports' });
          return;
        }
        const sub = s.subscriptions.find((x) => x.id === t.subId);
        const perTrip = sub ? sub.price / Math.max(1, TK.legsPerWeek(sub) * 4.3) : 0;
        const credit = Math.max(c.noShowCreditMin, Math.round(perTrip / 500) * 500);
        t.status = 'noshow';
        const adj = { id: 'a' + uid(), amount: credit, note: `قەرەبوو: شۆفێر نەهات، ${t.title}`, at: Date.now() };
        s.billing.adjustments.push(adj);
        const le = ledger(s, t.driverId, 'penalty', -c.noShowPenalty, `نەهاتن بۆ ${t.title}، ${fmt.clock(t.time)}`, { tripId });
        s.reports.unshift({ id: 'r' + uid(), type: 'noshow', tripId, driverId: t.driverId, by: s.passenger.name, phone: s.passenger.phone, note: note || '', credit, penalty: c.noShowPenalty, adjId: adj.id, ledgerId: le.id, status: 'open', at: Date.now() });
        notice(s, { kind: 'info', title: 'ڕاپۆرتەکەت تۆمار کرا', body: `${fmt.money(credit)} قەرەبوو بۆ فاتورەی داهاتوو زیاد کرا` });
        dnotice(s, t.driverId, { kind: 'info', red: true, title: 'ڕاپۆرتی نەهاتن', body: `${t.title}، ${fmt.money(c.noShowPenalty)} سزا. ئەگەر هەڵەیە پەیوەندی بە پشتگیری بکە`, link: 'earnings' });
        anotice(s, { kind: 'report', red: true, title: `ڕاپۆرتی «شۆفێر نەهات» لە ${s.passenger.name}`, body: t.title, link: 'reports' });
      });
      return null;
    },
    /** سەرنشین ڕادەگەیەنێت کە بۆ گەشتێکی ئەمڕۆ نایەت (چوون، هاتنەوە یان هەردووکیان) */
    skipTrips(ids, reason) {
      update((s) => {
        const trips = s.trips.filter((t) => ids.includes(t.id) && t.status === 'scheduled' && TK.canSkip(t));
        if (!trips.length) return;
        trips.forEach((t) => {
          t.status = 'skipped';
          t.skipReason = reason || '';
          if (!t.runId) return;
          // لە ڕۆتێکی هاوبەش: پێش دەستپێکردن ڕۆتەکە ڕێک دەخرێتەوە، دوای دەستپێکردن تەنها وێستگەکانی لادەبرێن
          const run = runOf(s, t).filter((x) => x.id !== t.id);
          if (runStarted(run)) run.filter((x) => x.status === 'active').forEach((x) => (x.stops = dropSubFromStops(x.stops, t.subId)));
          else syncRun(s, s.routes.find((r) => r.id === t.routeId));
        });
        const t0 = trips[0];
        const names = t0.stops[0].riders;
        const what = trips.length > 1 ? 'چوون و هاتنەوە' : t0.dir === 'back' ? 'هاتنەوە' : 'چوون';
        const text = `ئەمڕۆ ${names} بۆ ${what} نایەن${reason ? `، ${reason}` : ''}`;
        const byDriver = {};
        trips.forEach((t) => (byDriver[t.driverId] = true));
        Object.keys(byDriver).forEach((did) => {
          s.messages.push({ id: uid(), driverId: did, peer: 'me', fromDriver: false, system: true, text, at: Date.now(), readP: true, readD: false });
          dnotice(s, did, { kind: 'info', title: `${names} ئەمڕۆ نایەن`, body: `${what}${reason ? '، ' + reason : ''}، پێویست ناکات بڕۆیت`, link: 'today' });
        });
        notice(s, { kind: 'info', title: 'شۆفێر ئاگادار کرایەوە', body: `${names} ئەمڕۆ بۆ ${what} نایەن` });
      });
    },
    unskipTrip(id) {
      const t0 = state.trips.find((x) => x.id === id);
      if (t0 && t0.runId && runStarted(runOf(state, t0))) return 'شۆفێر بەڕێ کەوتووە، نامەی بۆ بنێرە';
      update((s) => {
        const t = s.trips.find((x) => x.id === id);
        if (!t || t.status !== 'skipped') return;
        t.status = 'scheduled';
        if (t.runId) syncRun(s, s.routes.find((r) => r.id === t.routeId));
        const names = t.stops[0].riders;
        const text = `${names} بۆ ${t.dir === 'back' ? 'هاتنەوە' : 'چوون'} دێن (هەڵوەشاندنەوەی «نایەم»)`;
        s.messages.push({ id: uid(), driverId: t.driverId, peer: 'me', fromDriver: false, system: true, text, at: Date.now(), readP: true, readD: false });
        dnotice(s, t.driverId, { kind: 'ok', title: `${names} دێن`, body: `گەشتی ${fmt.clock(t.time)} دەگەڕێتەوە خشتە`, link: 'today' });
      });
    },
    markNoticesRead() {
      update((s) => {
        s.readNoticesAt = Date.now();
      });
    },
    markDNoticesRead() {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (d) d.readNoticesAt = Date.now();
      });
    },

    /* ---------- شۆفێر ---------- */
    /** تۆمارکردنی شۆفێری نوێ. Promise: هەڵە یان null */
    async driverRegister(f) {
      const err = TK.validateDriver(f, true);
      if (err) return err;
      const nc = needCloud();
      if (nc) return nc;
      const phone = cleanPhone(f.phone);
      let u;
      try {
        u = await window.TKFB.signUp(emailOf(phone, 'd'), f.pass);
      } catch (e) {
        return authErr(e);
      }
      await TK.whenReady(u.uid);
      update((s) => {
        const id = u.uid;
        const woman = f.gender === 'f';
        const docStatus = {};
        TK.DOC_GROUPS.forEach((g) => (docStatus[g.key] = 'pending'));
        const rec = {
          ...f, id, phone, woman, initial: f.name.slice(0, 1),
          car: `${f.carMake} ${f.carModel} ${f.carColor}`.trim(),
          plate: `${f.plateCode} ${String(f.plateLetter || 'A').toUpperCase()} ${f.plateNo}`,
          plateType: 'taxi', status: 'pending', docStatus, docReason: {},
          seats: +f.seats || 4, freeSeats: Math.max(1, (+f.seats || 4)), online: false,
          rating: 0, reviews: 0, trips: 0, onTime: 100, tags: [], workDays: [], area: f.workAreas || '',
          joinedAt: Date.now(), termsAt: Date.now(), readNoticesAt: 0,
        };
        ['pass', 'pass2', 'step'].forEach((k) => delete rec[k]);
        s.drivers = s.drivers.filter((d) => d.id !== id);
        s.drivers.push(rec);
        s.driver.meId = id;
        dnotice(s, id, { kind: 'info', title: 'زانیارییەکانت نێردران', body: 'تیمی یەکسا بەڵگەنامەکانت دەپشکنێت. دوای پشتڕاستکردنەوە دەتوانیت کار بکەیت.', link: 'profile' });
        anotice(s, { kind: 'driver', title: `شۆفێری نوێ: ${f.name}`, body: 'چاوەڕێی پشکنینی بەڵگەنامەکانە', link: `driver/${id}` });
      });
      imgPump();
      return null;
    },
    async driverLogin(phone, pass) {
      const p = cleanPhone(phone);
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 7xx xxx xxxx)';
      if (!pass) return 'وشەی نهێنی بنووسە';
      const nc = needCloud();
      if (nc) return nc;
      let u;
      try {
        u = await signInPhone(p, 'd', pass);
      } catch (e) {
        return authErr(e);
      }
      await TK.whenReady(u.uid);
      if (!sel.driver(u.uid)) {
        await window.TKFB.signOut();
        return 'ئەم ژمارەیە وەک شۆفێر تۆمار نەکراوە';
      }
      return null;
    },
    async driverLogout() {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (d) d.online = false;
      });
      if (window.TKFB && cloud.on) {
        // شوێنی زیندوو (ئەگەر هەبێت) پێش چوونەدەرەوە دەسڕدرێتەوە
        if (cloud.me) await Promise.race([window.TKFB.write({ op: 'delete', path: 'live/' + cloud.me }).catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
        await settle();
        await window.TKFB.signOut();
        await clearDevice();
      }
    },
    /** شۆفێر بەڵگەنامەیەکی ڕەتکراو یان بەسەرچوو نوێ دەکاتەوە */
    updateDriverDocs(group, patch) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (!d) return;
        Object.assign(d, patch);
        d.docStatus[group] = 'pending';
        delete d.docReason[group];
        d.car = `${d.carMake} ${d.carModel} ${d.carColor}`.trim();
        anotice(s, { kind: 'driver', title: `${d.name} بەڵگەنامەی نوێی ناردووە`, body: (TK.DOC_GROUPS.find((g) => g.key === group) || {}).label || '', link: `driver/${d.id}` });
      });
    },
    async driverChangePassword(oldPass, newPass) {
      if (String(newPass || '').length < 6) return 'وشەی نهێنی نوێ دەبێت لانیکەم ٦ پیت بێت';
      return changePass(oldPass, newPass);
    },
    /** بەڕێوەبەر: چوونەژوورەوە بە ئیمەیڵ و وشەی نهێنی (هەژمارەکە لە Firebase Console دروست کراوە) */
    async adminLogin(email, pass) {
      const nc = needCloud();
      if (nc) return nc;
      let u;
      try {
        u = await window.TKFB.signIn(String(email || '').trim(), pass || '');
      } catch (e) {
        return /invalid-email|missing-email/.test((e && e.code) || '') ? 'ئیمەیڵ دروست نییە' : /invalid-credential|wrong-password|user-not-found/.test((e && e.code) || '') ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە' : authErr(e);
      }
      if (!ADMINS.includes(u.uid)) {
        await window.TKFB.signOut();
        return 'ئەم هەژمارە بەڕێوەبەر نییە';
      }
      await TK.whenReady(u.uid);
      return null;
    },
    async adminLogout() {
      if (window.TKFB && cloud.on) {
        await settle();
        await window.TKFB.signOut();
        await clearDevice();
      }
    },
    async adminChangePassword(oldPass, newPass) {
      if (String(newPass || '').length < 8) return 'وشەی نهێنی نوێ لانیکەم ٨ پیت بێت';
      return changePass(oldPass, newPass);
    },
    /** سکاڵای شۆفێر بۆ تیمی یەکسا (لە بەشی تایبەتی شۆفێردا هەڵدەگیرێت، تەنها خۆی و بەڕێوەبەر دەیبینن) */
    driverTicket(subject) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (!d) return;
        const t = { id: 1000 + Math.floor(Math.random() * 9000), subject, status: 'open', at: Date.now() };
        d.tickets = [t].concat(d.tickets || []).slice(0, 50);
        anotice(s, { kind: 'ticket', title: `سکاڵا لە شۆفێر ${d.name}`, body: subject, link: 'reports' });
      });
    },
    /** شۆفێر وەڵامەکانی بینی */
    driverTicketsSeen() {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (d && d.tickets) d.tickets.forEach((t) => { if (t.reply) t.seen = true; });
      });
    },
    /** شۆفێر داوای سڕینەوەی هەژمارەکەی دەکات؛ بەڕێوەبەر دوای تەواوکردنی حیساب دەیسڕێتەوە */
    requestDriverDeletion(on) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (!d) return;
        if (on) {
          d.deleteRequestedAt = Date.now();
          d.online = false;
          anotice(s, { kind: 'driver', red: true, title: `${d.name} داوای سڕینەوەی هەژمارەکەی کرد`, body: 'دوای تەواوکردنی حیساب و موچە، لە لاپەڕەی شۆفێر بیسڕەوە', link: `driver/${d.id}` });
        } else {
          delete d.deleteRequestedAt;
          anotice(s, { kind: 'driver', title: `${d.name} داوای سڕینەوەی هەڵوەشاندەوە`, body: '', link: `driver/${d.id}` });
        }
      });
    },
    setMyDriver(patch) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (d) Object.assign(d, patch);
      });
    },
    /** شۆفێر شێوازی وەرگرتنی موچە دەگۆڕێت؛ بەڕێوەبەر ئاگادار دەکرێتەوە بۆ ئەوەی پێش پارەدان بیپشکنێت */
    setPayout(method, account) {
      const m = TK.payMethod(method);
      if (!m || m.on === false) return 'ئەم شێوازە بەردەست نییە';
      const acc = String(account || '').trim();
      if (m.account !== false && acc.length < 4) return 'ژمارەی حیساب بنووسە';
      let err = null;
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (!d) {
          err = 'نەدۆزرایەوە';
          return;
        }
        if (d.payMethod === method && (d.payAccount || '') === (m.account === false ? '' : acc)) return;
        d.payPrev = { method: d.payMethod || '', account: d.payAccount || '' };
        d.payMethod = method;
        d.payAccount = m.account === false ? '' : acc;
        d.payChangedAt = Date.now();
        anotice(s, { kind: 'pay', title: `${d.name} شێوازی موچەی گۆڕی`, body: `${TK.payName(d.payPrev.method)} ← ${m.name}${d.payAccount ? ` (${d.payAccount})` : ''}. پێش پارەدان پشتڕاستی بکەرەوە`, link: `driver/${d.id}` });
        dnotice(s, d.id, { kind: 'self', title: 'شێوازی موچە گۆڕدرا', body: `${m.name}${d.payAccount ? `، ${d.payAccount}` : ''}` });
      });
      return err;
    },
    /** بەڕێوەبەر گۆڕانی شێوازی موچەی شۆفێرێک پشتڕاست دەکاتەوە */
    ackPayChange(driverId) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === driverId);
        if (!d) return;
        d.payAckAt = Date.now();
        d.payAckFor = payKey(d);
      });
    },
    /** شۆفێر نزیکی وێستگەی سوارکردن بووەوە (GPS): سەرنشینەکانی ئەو وێستگەیە یەک جار ئاگادار دەکرێنەوە */
    driverNear(tripId, stopId, meters) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || t.status !== 'active') return;
        const run = runOf(s, t).filter((x) => x.status === 'active');
        const idx = t.stops.findIndex((x) => x.id === stopId);
        const st = t.stops[idx];
        if (!st || st.done || st.arrivedAt || st.nearAt || st.kind !== 'pickup') return;
        const now = Date.now();
        run.forEach((x) => x.stops[idx] && x.stops[idx].id === stopId && (x.stops[idx].nearAt = now));
        const d = s.drivers.find((x) => x.id === t.driverId);
        run.filter((x) => ownStop(x, st)).forEach((x) =>
          notice(s, { kind: 'driver', title: 'شۆفێرەکەت نزیکە، ئامادە بە', body: `${d ? d.name : 'شۆفێر'} نزیکەی ${fmt.group(Math.max(50, Math.round(meters / 50) * 50))} مەتر لە ${st.place} دوورە`, link: `track/${x.id}` }, x.owner)
        );
      });
    },
    /** شۆفێر نرخ پێشنیار دەکات (قبووڵکردنی داواکاری) */
    makeOffer(reqId, price, note) {
      update((s) => {
        const r = s.requests.find((x) => x.id === reqId);
        const meId = s.driver.meId;
        const d = s.drivers.find((x) => x.id === meId);
        if (!d || d.status !== 'active' || !r || r.status !== 'open' || !(price > 0) || r.offers.some((o) => o.driverId === meId)) return;
        r.offers.push({ driverId: meId, price, note: note || '', at: Date.now(), status: 'pending' });
        notice(s, { kind: 'offer', title: `${d.name} نرخی ناردووە: ${fmt.money(price)}`, body: `${r.riderNames}، ${r.to}، ${fmt.money(price)} مانگانە`, link: `request/${r.id}` }, r.owner);
      });
    },
    withdrawOffer(reqId) {
      update((s) => {
        const r = s.requests.find((x) => x.id === reqId);
        if (!r || r.status !== 'open') return;
        r.offers = r.offers.filter((o) => o.driverId !== s.driver.meId);
      });
    },
    declineRequest(reqId) {
      update((s) => {
        const r = s.requests.find((x) => x.id === reqId);
        if (!r) return;
        r.declined.push(s.driver.meId);
        if (r.target === s.driver.meId) {
          const d = s.drivers.find((x) => x.id === s.driver.meId);
          r.status = 'closed';
          r.closedReason = 'declined';
          notice(s, { kind: 'info', title: `${d.name} ناتوانێت ئەم گەشتە وەربگرێت`, body: 'دەتوانیت داواکارییەکە بۆ هەموو شۆفێرەکان بڵاو بکەیتەوە', link: `request/${r.id}` }, r.owner);
        }
      });
    },
    /** داواکاری ڕاستەوخۆی داخراو دەکرێتەوە بە بڵاوکردنەوە بۆ هەمووان */
    rebroadcast(reqId) {
      update((s) => {
        const r = s.requests.find((x) => x.id === reqId);
        if (!r) return;
        r.target = 'all';
        r.status = 'open';
        r.closedReason = null;
        r.createdAt = Date.now();
        r.expiresAt = Date.now() + cfg().requestHours * 3600000;
        s.drivers.forEach((d) => {
          if (d.online && sel.fits(d, r) && !r.declined.includes(d.id)) dnotice(s, d.id, { kind: 'offer', title: `داواکاری نوێ لە ${r.ownerName}`, body: `${r.riderNames}، ${r.from.split('، ')[0]} ← ${r.to.split('، ')[0]}`, link: 'requests' });
        });
      });
    },
    /** شۆفێر گەشتێک بۆ جێگرەوە بڵاو دەکاتەوە و خۆی نرخ دادەنێت */
    postSwap(tripId, pay, note) {
      update((s) => {
        if (s.swaps.some((w) => w.tripId === tripId && w.status === 'open')) return;
        const t = s.trips.find((x) => x.id === tripId);
        const w = { id: 'w' + uid(), tripId, runId: (t && t.runId) || null, fromDriverId: s.driver.meId, pay, note: note || '', status: 'open', createdAt: Date.now(), womanOnly: !!(t && tripWomanOnly(s, t)), kids: !!(t && t.kind === 'kids') };
        s.swaps.unshift(w);
        // شۆفێرانی تر تا جێگرەوەکە کراوەیە دەتوانن گەشتەکە ببینن
        if (t) runOf(s, t).filter((x) => x.status === 'scheduled' || x.status === 'skipped').forEach((x) => (x.swapOpen = true));
        const from = s.drivers.find((x) => x.id === s.driver.meId);
        s.drivers.forEach((d) => {
          if (d.id === from.id || d.status !== 'active' || !d.online) return;
          if (t && t.kind === 'kids' && !d.kidsDriver) return;
          if (t && tripWomanOnly(s, t) && !d.woman) return;
          dnotice(s, d.id, { kind: 'swap', title: `${from.name} جێگرەوەی دەوێت`, body: `${t ? t.title + '، ' + fmt.clock(t.time) : ''}، ${fmt.money(pay)}`, link: 'today' });
        });
      });
    },
    cancelSwap(id) {
      update((s) => {
        const w = s.swaps.find((x) => x.id === id);
        if (!w || w.status !== 'open') return;
        w.status = 'cancelled';
        const t = s.trips.find((x) => x.id === w.tripId);
        if (t) runOf(s, t).forEach((x) => (x.swapOpen = false));
      });
    },
    /** شۆفێری ئێستا جێگای شۆفێرێکی تر دەگرێتەوە */
    takeSwap(id) {
      update((s) => {
        const w = s.swaps.find((x) => x.id === id);
        if (!w || w.status !== 'open') return;
        applySwap(s, w, s.driver.meId);
      });
    },
    /** «بەڕێ کەوتم»: هەموو سەرنشینانی گەشتەکە (یان ڕۆتەکە) ئاگادار دەکرێنەوە. هەڵە دەگەڕێنێتەوە یان null */
    startTrip(tripId) {
      const t0 = state.trips.find((x) => x.id === tripId);
      if (!t0 || t0.status !== 'scheduled') return 'ئەم گەشتە ناتوانرێت دەست پێبکرێت';
      const d0 = state.drivers.find((x) => x.id === t0.driverId);
      if (!d0 || d0.status !== 'active') return 'هەژمارەکەت هێشتا چالاک نییە';
      const wait = TK.startWait(t0);
      if (wait > 0) return `هێشتا زووە. لە ${fmt.clock(fmt.addMin(t0.stops[0].time, -cfg().startEarlyMin))}ەوە دەتوانیت دەست پێبکەیت`;
      if (state.trips.some((x) => x.driverId === t0.driverId && x.status === 'active' && (x.runId || x.id) !== (t0.runId || t0.id))) return 'سەرەتا گەشتی ئێستات تەواو بکە';
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        const d = s.drivers.find((x) => x.id === (t && t.driverId));
        if (!t || t.status !== 'scheduled' || !d || d.status !== 'active') return;
        const run = runOf(s, t).filter((x) => x.status === 'scheduled');
        const now = Date.now();
        const picks = t.stops.filter((st) => st.kind === 'pickup');
        run.forEach((x) => {
          x.status = 'active';
          x.segmentStartedAt = now;
          x.startedAt = now;
          const pos = picks.findIndex((st) => ownStop(x, st));
          const body = run.length > 1
            ? pos <= 0 ? `${d.name} یەکەم جار بۆ لای تۆ دێت، ${x.stops[0].place}` : `پێش تۆ ${pos} وێستگە هەیە، پاشان بۆ لای تۆ دێت`
            : `${d.name} بەرەو ${x.stops[0].place} دێت`;
          notice(s, { kind: 'driver', title: 'شۆفێر بەڕێ کەوت', body, link: `track/${x.id}` }, x.owner);
        });
      });
      return null;
    },
    /** وێستگەی داهاتوو: «گەیشتم» ← «سوار بوو» یان «گەیاندم». true ئەگەر هەموو گەشتەکە تەواو بوو */
    completeStop(tripId) {
      let finished = false;
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || t.status !== 'active') return;
        const idx = t.stops.findIndex((x) => !x.done);
        if (idx < 0) return;
        // گەشتەکانی تری هەمان ڕۆت کە هێشتا بەشدارن (سەرنشینێک کە گەیشتووە وێستگەکانی هەر نوێ دەکرێنەوە)
        const run = runOf(s, t).filter((x) => x.status === 'active' || x.status === 'done');
        const stop = t.stops[idx];
        const now = Date.now();
        const d = s.drivers.find((x) => x.id === t.driverId);
        const dn = d ? d.name : 'شۆفێر';
        const mine = run.filter((x) => ownStop(x, stop));
        const each = (fn) => run.forEach((x) => x.stops[idx] && fn(x.stops[idx], x));
        if (stop.kind === 'pickup' && !stop.arrivedAt) {
          each((st) => (st.arrivedAt = now));
          mine.forEach((x) => notice(s, { kind: 'driver', title: `${dn} گەیشتە ${stop.place}`, body: 'لە بەردەم دەرگا چاوەڕێتان دەکات', link: `track/${x.id}` }, x.owner));
          return;
        }
        each((st) => {
          st.done = true;
          st.doneAt = now;
        });
        run.forEach((x) => x.status === 'active' && (x.segmentStartedAt = now));
        const ridersOf = (x) => (stop.parts ? stop.parts.filter((p) => p.subId === x.subId).map((p) => p.riders).join('، ') : stop.riders) || stop.riders;
        const many = (txt) => /\sو\s|،/.test(txt);
        if (stop.kind === 'pickup') {
          mine.forEach((x) => {
            const r = ridersOf(x);
            notice(s, { kind: 'ride', title: `${r} سوار ${many(r) ? 'بوون' : 'بوو'}`, body: `لە ${stop.place} لەگەڵ ${dn}`, link: `track/${x.id}` }, x.owner);
          });
          // سەرنشینی وێستگەی داهاتوو ئاگادار دەکرێتەوە کە نۆرەی ئەوە
          const next = t.stops[idx + 1];
          if (next && next.kind === 'pickup') run.filter((x) => x.status === 'active' && ownStop(x, next)).forEach((x) => notice(s, { kind: 'driver', title: 'ئێستا نۆرەی تۆیە', body: `${dn} بەرەو ${next.place} دێت`, link: `track/${x.id}` }, x.owner));
        } else {
          mine.forEach((x) => {
            const r = ridersOf(x);
            notice(s, { kind: 'drop', title: `${r} ${many(r) ? 'گەیشتنە' : 'گەیشتە'} ${stop.place}`, body: 'بە سەلامەتی گەیشتن', link: `track/${x.id}` }, x.owner);
            // گەشتی ئەم سەرنشینە تەواو بوو کاتێک کۆتا وێستگەی خۆی تەواو بوو
            if (x.status === 'active' && x.stops.filter((st) => ownStop(x, st)).every((st) => st.done)) finishTrip(s, x, now);
          });
        }
        finished = t.stops.every((x) => x.done);
        if (finished) {
          run.filter((x) => x.status === 'active').forEach((x) => finishTrip(s, x, now));
          finishRun(s, runOf(s, t));
        }
      });
      return finished;
    },
    /** سەرنشین لە وێستگەکەی نەهات (شۆفێر چاوەڕێی کرد). true ئەگەر گەشتەکە تەواو بوو */
    riderAbsent(tripId, stopId) {
      let finished = false;
      const t0 = state.trips.find((x) => x.id === tripId);
      const st0 = t0 && t0.stops.find((x) => !x.done);
      if (!st0 || st0.kind !== 'pickup' || !st0.arrivedAt || Date.now() < TK.absentAt(st0)) return false;
      // دوگمەکە بۆ وێستگەیەکی دیاریکراو بوو: ئەگەر لەم ماوەیەدا وێستگەکە گۆڕا (ئامێرێکی تر)، هیچ ناکرێت
      if (stopId && st0.id !== stopId) return false;
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || t.status !== 'active') return;
        const idx = t.stops.findIndex((x) => !x.done);
        const stop = t.stops[idx];
        if (!stop || stop.kind !== 'pickup') return;
        const now = Date.now();
        const d = s.drivers.find((x) => x.id === t.driverId);
        const run = runOf(s, t).filter((x) => x.status === 'active' || x.status === 'done');
        const gone = run.filter((x) => ownStop(x, stop));
        const ids = gone.map((x) => x.subId);
        gone.forEach((x) => {
          x.status = 'absent';
          x.absentAt = now;
          const mins = Math.max(1, Math.round((now - stop.arrivedAt) / 60000));
          // سەرنشین پێشتر ئاگاداری نەکردبووەوە: گەشتەکە وەک کراو حیساب دەکرێت (پارەی ئەو ڕۆژە دەچێت بۆ شۆفێر)
          notice(s, { kind: 'info', red: true, title: `${stop.riders} سوار ${/\sو\s|،/.test(stop.riders || '') ? 'نەبوون' : 'نەبوو'}`, body: `${d ? d.name : 'شۆفێر'} ${mins} خولەک لە ${stop.place} چاوەڕێی کرد. چونکە پێشتر «نایەم»ت نەکردبوو، ئەم گەشتە وەک کراو حیساب دەکرێت`, link: `track/${x.id}` }, x.owner);
          s.messages.push({ id: uid(), driverId: x.driverId, peer: x.owner || 'me', fromDriver: true, system: true, text: `${fmt.clock(fmt.hhmm(now))}: ${mins} خولەک لە ${stop.place} چاوەڕێم کرد، کەس نەهات`, at: now, readP: false, readD: true });
          const ps = pslice(s, x.owner);
          if (ps) {
            ps.history = ps.history || [];
            ps.history.unshift({
              id: 'h' + uid(), tripId: x.id, tripTitle: x.title, driverId: x.driverId, originalDriverId: x.originalDriverId || null, memberIds: x.memberIds.slice(), kind: x.kind, date: now, startedAt: x.startedAt || null, absent: true, waited: mins,
              stops: [{ place: stop.place, kind: 'pickup', riders: stop.riders, arrivedAt: stop.arrivedAt, doneAt: now, absent: true }],
            });
          }
        });
        const rest = run.filter((x) => !ids.includes(x.subId));
        rest.forEach((x) => {
          let stops = x.stops.map((st, i) => (i === idx ? Object.assign({}, st, { done: true, doneAt: now, absent: true, absentIds: ids }) : st));
          ids.forEach((id) => (stops = dropSubFromStops(stops, id)));
          x.stops = stops;
          if (x.status === 'active') x.segmentStartedAt = now;
        });
        // وێستگەی نەهاتووەکان لە گەشتی خۆیان وەک تەواو دیار دەبێت
        gone.forEach((x) => (x.stops = x.stops.map((st, i) => (i === idx ? Object.assign({}, st, { done: true, doneAt: now, absent: true, absentIds: ids }) : st))));
        const live = rest.filter((x) => x.status === 'active');
        // سەرنشینی وێستگەی داهاتوو: نۆرەی ئەوە
        const nx = live[0] && live[0].stops.find((st) => !st.done);
        if (nx && nx.kind === 'pickup') live.filter((x) => ownStop(x, nx)).forEach((x) => notice(s, { kind: 'driver', title: 'ئێستا نۆرەی تۆیە', body: `${d ? d.name : 'شۆفێر'} بەرەو ${nx.place} دێت`, link: `track/${x.id}` }, x.owner));
        if (!live.length) {
          // هەموو سەرنشینەکان نەهاتن یان پێشتر گەیشتبوون: گەشتەکە بۆ شۆفێر حیساب دەکرێت
          finished = true;
          finishRun(s, runOf(s, t));
        } else if (live[0].stops.every((st) => st.done)) {
          finished = true;
          live.forEach((x) => finishTrip(s, x, now));
          finishRun(s, runOf(s, t));
        }
      });
      return finished;
    },
    /** پاشەکەوتکردنی ڕۆت (نوێ یان دەستکاری). { err, warn } دەگەڕێنێتەوە */
    saveRoute(input) {
      const me = sel.me();
      if (!me) return { err: 'نەدۆزرایەوە' };
      const subs = input.subIds.map((id) => state.subscriptions.find((x) => x.id === id)).filter(Boolean);
      if (subs.length < 2) return { err: 'لانیکەم دوو سەرنشین هەڵبژێرە' };
      const err = poolError(state, subs, input.dir, me);
      if (err) return { err };
      const taken = subs.find((x) => (state.routes || []).some((r) => r.id !== input.id && r.dir === input.dir && r.subIds.includes(x.id)));
      if (taken) return { err: `${taken.riderNames} پێشتر لە ڕۆتێکی ترە` };
      const old = input.id && (state.routes || []).find((r) => r.id === input.id);
      if (old && state.trips.some((t) => t.routeId === old.id && t.status === 'active')) return { err: 'ئەم ڕۆتە ئێستا لە ڕێگەیە. دوای تەواوبوون دەستکاری بکە' };
      let warn = '';
      let savedId = null;
      update((s) => {
        s.routes = s.routes || [];
        const before = old ? routePickTimes(s, old) : {};
        const r = old ? s.routes.find((x) => x.id === old.id) : { id: 'rt' + uid(), driverId: me.id, createdAt: Date.now() };
        Object.assign(r, { dir: input.dir, time: input.time, name: input.name || `${input.dir === 'back' ? 'هاتنەوە' : 'چوون'} ${fmt.n(fmt.clock(input.time))}`, subIds: input.subIds.slice(), dropOrder: (input.dropOrder || []).slice() });
        if (!old) s.routes.push(r);
        savedId = r.id;
        // ئەوانەی لە ڕۆتە کۆنەکەدا بوون و ئێستا نین
        if (old) old.subIds.filter((id) => !r.subIds.includes(id)).forEach((id) => {
          const x = s.subscriptions.find((y) => y.id === id);
          if (x) notice(s, { kind: 'info', title: 'گۆڕانکاری لە گەشتەکەت', body: `${x.riderNames} ئیتر بە تەنها دەچن، کاتی سوارکردن ${fmt.clock(subTime(x, r.dir))}`, link: 'trips' }, x.owner);
        });
        syncRun(s, r);
        const after = routePickTimes(s, r);
        const ppl = subs.reduce((n, x) => n + (x.riders || 1), 0);
        subs.forEach((x) => {
          const prev = before[x.id] || subTime(x, r.dir);
          const isNew = !old || !old.subIds.includes(x.id);
          if (!isNew && prev === after[x.id]) return;
          const body = `${ppl} کەس لە یەک تەکسیدان. کاتی سوارکردنی ${x.riderNames}: ${fmt.clock(after[x.id])}`;
          notice(s, { kind: 'info', title: r.dir === 'back' ? 'گەشتی هاتنەوەت هاوبەش کرا' : 'گەشتەکەت هاوبەش کرا', body, link: 'trips' }, x.owner);
          s.messages.push({ id: uid(), driverId: me.id, peer: x.owner || 'me', fromDriver: true, system: true, text: body, at: Date.now(), readP: false, readD: true });
        });
        // ڕۆتی هاتنەوە بە پێچەوانەی ڕیزبەندی
        if (input.pair && r.dir === 'go' && !old) {
          const back = subs.filter((x) => x.back);
          const e2 = back.length >= 2 ? poolError(s, back, 'back', me) || (back.some((x) => s.routes.some((y) => y.dir === 'back' && y.subIds.includes(x.id))) ? 'هەندێکیان پێشتر لە ڕۆتی هاتنەوەن' : null) : 'لانیکەم دوو کەس هاتنەوەیان هەیە';
          if (e2) warn = `ڕۆتی هاتنەوە دروست نەکرا: ${e2}`;
          else {
            const ids = r.subIds.filter((id) => back.some((x) => x.id === id));
            const bt = back.map((x) => x.back).sort()[0];
            const br = { id: 'rt' + uid(), driverId: me.id, createdAt: Date.now(), dir: 'back', time: bt, name: `هاتنەوە ${fmt.n(fmt.clock(bt))}`, subIds: ids.slice(), dropOrder: ids.slice().reverse() };
            s.routes.push(br);
            syncRun(s, br);
            const bt2 = routePickTimes(s, br);
            back.forEach((x) => notice(s, { kind: 'info', title: 'گەشتی هاتنەوەت هاوبەش کرا', body: `کاتی سوارکردنی ${x.riderNames}: ${fmt.clock(bt2[x.id])}`, link: 'trips' }, x.owner));
          }
        }
      });
      return { err: null, warn, id: savedId };
    },
    deleteRoute(id) {
      const r = (state.routes || []).find((x) => x.id === id);
      if (!r) return null;
      if (state.trips.some((t) => t.routeId === r.id && t.status === 'active')) return 'ئەم ڕۆتە ئێستا لە ڕێگەیە';
      update((s) => {
        const route = s.routes.find((x) => x.id === id);
        s.routes = s.routes.filter((x) => x.id !== id);
        s.trips.filter((t) => t.routeId === id && (t.status === 'scheduled' || t.status === 'skipped')).forEach((t) => detachTrip(s, t));
        dropLegless(s);
        route.subIds.forEach((sid) => {
          const x = s.subscriptions.find((y) => y.id === sid);
          if (x) notice(s, { kind: 'info', title: 'گۆڕانکاری لە گەشتەکەت', body: `${x.riderNames} ئیتر بە تەنها دەچن، کاتی سوارکردن ${fmt.clock(subTime(x, route.dir))}`, link: 'trips' }, x.owner);
        });
      });
      return null;
    },
    /** هەڵسەنگاندنی سەرنشینەکان لەلایەن شۆفێر (نهێنی، تەنها بەڕێوەبەر دەیبینێت). scores: { ڕیزبەند: ١..٥ } بە ڕیزی سەرنشینەکانی گەشتەکە */
    rateRiders(tripId, scores) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t) return;
        const run = runOf(s, t);
        if (scores) {
          // هەمان ڕیزبەندی پەڕەی هەڵسەنگاندن: وێستگەکانی گەشتی سەرەکی (هەر گەشتێکی ڕۆت هەموو وێستگەکانی تێدایە)
          const names = [];
          (t.stops || []).filter((st) => st.kind === 'pickup' && !st.absent).forEach((st) => (st.parts || [{ riders: st.riders, owner: t.owner }]).forEach((p) => names.push({ name: p.riders, owner: p.owner || t.owner })));
          // لە تۆماری شۆفێر (driverLog) پاشەکەوت دەکرێت: سەرنشین نایبینێت، بەڕێوەبەر دەیبینێت
          const lead = run.find((x) => x.status === 'done') || run[0];
          const key = (lead.runId || lead.id) + ':' + (lead.day || s.day);
          const log = (s.driverLog || []).find((e) => e.key === key);
          if (log) names.forEach((n, i) => {
            const r = (log.riders || []).find((x) => (x.owner || 'me') === (n.owner || 'me'));
            if (r) r.rating = Math.min(5, Math.max(1, +scores[i] || 5));
          });
        }
        run.forEach((x) => (x.rated = true));
      });
    },
  };
  TK.actions = actions;

  /** گۆڕینی شۆفێری گەشتێک دوای ئەوەی جێگرەوە قبووڵی کرد. تەنها ئەوکات سەرنشین ئاگادار دەکرێتەوە */
  function applySwap(s, w, takerId) {
    const t = s.trips.find((x) => x.id === w.tripId);
    if (!t) return;
    w.status = 'taken';
    w.takenBy = takerId;
    w.takenAt = Date.now();
    const from = s.drivers.find((x) => x.id === w.fromDriverId);
    const to = s.drivers.find((x) => x.id === takerId);
    // لە ڕۆتی هاوبەش هەموو گەشتەکانی ڕۆتەکە پێکەوە دەگوازرێنەوە. پارەی جێگرەوە تەنها لەسەر یەکەمیان
    runOf(s, t).filter((x) => x.status === 'scheduled' || x.status === 'skipped').forEach((x) => {
      x.originalDriverId = x.originalDriverId || w.fromDriverId;
      x.driverId = takerId;
      x.swapPay = x.id === t.id ? w.pay : 0;
      x.swapId = w.id;
      x.swapOk = false; // سەرنشین دەتوانێت جێگرەوە ڕەت بکاتەوە
      x.swapOpen = false;
      if (x.status === 'scheduled') notice(s, { kind: 'swap', title: 'شۆفێری جێگرەوە', body: `${to.name} لە جیاتی ${from.name} بۆ گەشتی ${fmt.clock(x.time)} دێت (${to.car}). دەتوانیت ڕەتی بکەیتەوە`, link: `track/${x.id}` }, x.owner);
    });
    // پارەی جێگرەوە تەنها دوای تەواوبوونی گەشت دەگوازرێتەوە
    dnotice(s, w.fromDriverId, { kind: 'ok', title: `${to.name} جێگاکەتی گرتەوە`, body: `${t.title}، ${fmt.clock(t.time)}، دوای تەواوبوونی گەشت ${fmt.money(w.pay)} لە داهاتەکەت کەم دەکرێتەوە`, link: 'today' });
    dnotice(s, takerId, { kind: 'ok', title: 'گەشتی جێگرەوە زیاد کرا', body: `${t.title}، ${fmt.clock(t.time)}، دوای تەواوبوون ${fmt.money(w.pay)} بۆت زیاد دەکرێت`, link: `trip/${t.id}` });
  }
  /** ئایا گەشتەکە «تەنها شۆفێری ئافرەت»ـە */
  function tripWomanOnly(s, t) {
    return runOf(s, t).some((x) => {
      const sub = s.subscriptions.find((y) => y.id === x.subId);
      if (sub) return !!sub.womanOnly;
      const r = s.requests.find((y) => y.id === x.reqId);
      return !!(r && r.womanOnly);
    });
  }
  TK.tripWomanOnly = (t) => tripWomanOnly(state, t);
  function ledger(s, driverId, type, amount, note, extra) {
    const e = { id: 'l' + uid(), driverId, type, amount, note, at: Date.now(), ...(extra || {}) };
    s.ledger.unshift(e);
    return e;
  }
  TK.ledgerAdd = ledger;
  /* =========================================================
   * جزدان
   * دەفتەرێک کە هەر دێڕێکی ناسڕێتەوە و ناگۆڕدرێت؛ باڵانس = کۆی دێڕەکان.
   * who: UIDـی سەرنشین (لە ئەپی سەرنشین «me») یان ناسنامەی شۆفێر. role: p سەرنشین، d شۆفێر.
   * ناسنامەی دێڕەکان دیاریکراون (بۆ نموونە e_ڕۆت_ڕۆژ)، بۆیە ئەگەر دوو ئامێر هەمان کار بکەن دووبارە نابێتەوە.
   * پڕکردنەوە ئێستا بە دەستی بەڕێوەبەرە (topups)؛ دواتر سێرڤەری FIB/FastPay هەمان دێڕی «topup» دەنووسێت.
   * ======================================================= */
  const walletOn = () => cfg().walletOn === true;
  TK.walletOn = walletOn;
  const safeId = (x) => String(x).replace(/[^\w-]/g, '_');
  /** دێڕێکی نوێ لە دەفتەر (ئەگەر هەمان ناسنامە هەبێت هیچ ناکات) */
  function went(s, e) {
    s.wallet = s.wallet || [];
    if (s.wallet.some((x) => x.id === e.id)) return null;
    const x = Object.assign({ at: Date.now(), by: ROLE }, e);
    s.wallet.unshift(x);
    payIdx.delete(s.wallet);
    return x;
  }
  TK.walletAdd = went;
  /** ناونیشان و ئایکۆنی هەر جۆرێکی دێڕ (بۆ سەرنشین و شۆفێر) */
  TK.txLabel = function (e) {
    const m = e.method ? TK.payName(e.method) : '';
    const lines = (e.lines || []).map((l) => `${l.names}${l.status === 'skipped' ? ' («نایەم»)' : l.status === 'absent' ? ' (نەهات)' : ''}`).join('، ');
    const T = {
      topup: { icon: 'wallet', title: `زیادکردن${m ? ' بە ' + m : ''}`, sub: e.note || '' },
      monthpay: { icon: 'receipt', title: e.note || 'پارەی مانگ', sub: (e.lines || []).map((l) => l.names).join('، ') || e.title || '' },
      skipref: { icon: 'undo', title: 'گەڕانەوەی پارەی ڕۆژ', sub: e.note || '' },
      comp: { icon: 'shield', title: 'قەرەبوو: شۆفێر نەهات', sub: e.note || '' },
      refund: { icon: 'undo', title: 'گەڕاندنەوە', sub: e.note || '' },
      adjust: { icon: 'sliders', title: e.amount >= 0 ? 'زیادکردن لەلایەن یەکسا' : 'لێبڕین لەلایەن یەکسا', sub: e.note || '' },
      legacy: { icon: 'calendar', title: 'مانگی پێش جزدان', sub: e.note || '' },
      earn: { icon: 'route', title: lines || e.title || 'داهاتی گەشت', sub: `${e.title || ''}${e.dir ? (e.dir === 'go' ? '، چوون' : '، هاتنەوە') : ''}` },
      swapout: { icon: 'swap', title: 'جێگرەوە', sub: e.note || '' },
      swapin: { icon: 'swap', title: 'گەشتی جێگرەوە', sub: e.note || '' },
      skipdeduct: { icon: 'undo', title: 'گەڕانەوەی ڕۆژ بۆ سەرنشین', sub: e.note || '' },
      penalty: { icon: 'alert', title: 'سزا', sub: e.note || '', bad: true },
      bonus: { icon: 'trophy', title: 'پاداشت', sub: e.note || '' },
      withdraw: { icon: 'download', title: `ڕاکێشان${m ? ' بۆ ' + m : ''}`, sub: e.note || '' },
      xfer: e.incoming ? { icon: 'send', title: `وەرگرتن لە ${e.fromName || ''}`, sub: e.note || 'ناردن لە جزدانێکی ترەوە' } : { icon: 'send', title: `ناردن بۆ ${e.toName || ''}`, sub: e.note || '' },
    };
    return T[e.type] || { icon: 'wallet', title: e.note || e.type, sub: '' };
  };
  /** دێڕەکانی کەسێک. ناردنێک کە بۆی هاتووە (xfer بە to) وەک دێڕی هاتوو (بڕی پۆزەتیڤ) دەگەڕێنرێتەوە */
  TK.walletOf = (s, who) => (s.wallet || []).filter((e) => e.who === who || (e.type === 'xfer' && e.to === who)).map((e) => (e.who === who ? e : Object.assign({}, e, { amount: -(e.amount || 0), incoming: true }))).sort((a, b) => (b.at || 0) - (a.at || 0));
  TK.balance = (s, who) => (s.wallet || []).reduce((n, e) => n + (e.who === who ? e.amount || 0 : e.type === 'xfer' && e.to === who ? -(e.amount || 0) : 0), 0);
  /** ئەو داوای ڕاکێشانانەی هێشتا نەنێردراون (لە باڵانسی بەردەست کەم دەکرێنەوە) */
  TK.pendingWithdraw = (s, driverId) => (s.withdraws || []).filter((w) => w.driverId === driverId && w.status === 'pending').reduce((n, w) => n + w.amount, 0);
  const monthOf = (day) => String(day || TODAY()).slice(0, 7);
  /** پارەدانی مانگی بەشدارییەک لە دەفتەرەوە (نەک لەسەر بەشدارییەکە، تا کەس نەتوانێت خۆی «دراوە» بنووسێت):
   * دێڕی monthpay (سەرنشین دەیدات) یان legacy (بەڕێوەبەر: ئەو مانگەی جزدان تێیدا چالاک کرا). هەردوو سەرنشین و شۆفێر دەیبینن */
  const payIdx = new WeakMap();
  function payRec(s, sub, mk = MONTH_KEY()) {
    if (!sub) return null;
    const w = s.wallet || [];
    let idx = payIdx.get(w);
    if (!idx) {
      idx = {};
      w.forEach((e) => (e.type === 'monthpay' || e.type === 'legacy') && (e.lines || []).forEach((l) => (idx[l.subId + '|' + e.month] = Object.assign({ ref: e.id, legacy: e.type === 'legacy' }, l))));
      payIdx.set(w, idx);
    }
    return idx[sub.id + '|' + mk] || null;
  }
  TK.payRec = payRec;
  const subPaid = (s, sub, mk = MONTH_KEY()) => !!payRec(s, sub, mk);
  TK.subPaid = (sub, mk) => subPaid(state, sub, mk);
  /** ژمارەی گەشتەکانی (چوون و هاتنەوە جیا) بەشدارییەک لە مانگێکدا، لە ڕۆژی from ـەوە */
  function legsInMonth(sub, mk, from, ignoreStart, skipPast) {
    const [y, m] = mk.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const x = ignoreStart ? Object.assign({}, sub, { startDate: null }) : sub;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = TODAY();
    let n = 0;
    for (let d = 1; d <= last; d++) {
      const dt = new Date(y, m - 1, d);
      const day = TODAY(dt);
      if (from && day < from) continue;
      if (!dayApplies(x, dt)) continue;
      ['go', 'back'].forEach((dir) => {
        const t = dayTime(x, dir, dt);
        // گەشتی ئەمڕۆ کە کاتەکەی تێپەڕیوە حیساب ناکرێت (پارەی نادرێت و نایەتە سەر شۆفێر)
        if (t && !(skipPast && day === today && t <= hhmm)) n++;
      });
    }
    return n;
  }
  TK.legsInMonth = legsInMonth;
  /** چەند گەشت لە ڕۆژێکدا (١ یان ٢) بۆ «نایەم»: یەک لا = نیو ڕۆژ */
  const legsPerDay = (sub) => {
    if (hasPerDay(sub)) return Math.max(1, ...Object.values(sub.perDay || {}).map((e) => (e && e.go ? 1 : 0) + (e && e.back ? 1 : 0)));
    return Math.max(1, (sub.go ? 1 : 0) + (sub.back ? 1 : 0));
  };
  /** بەهای یەک گەشت بۆ شۆفێر (دوای کۆمیسیۆن، کە یەک جار لە کاتی پارەداندا دەبڕدرێت) لە مانگێکدا */
  const legValue = (s, sub, mk) => {
    const rec = payRec(s, sub, mk);
    if (!rec || rec.legacy || !rec.legs) return 0;
    return Math.round((rec.amt - rec.fee) / rec.legs);
  };
  TK.legValue = (sub, mk) => legValue(state, sub, mk);
  /** ئەو بەشدارییانەی سەرنشین کە پارەی ئەم مانگەیان نەدراوە: بڕ لە ئەمڕۆوە تا کۆتایی مانگ (بە پێی ژمارەی گەشت) */
  function dueLines(s, owner) {
    const mk = MONTH_KEY();
    const from = TODAY();
    return s.subscriptions.filter((x) => (x.owner || 'me') === owner && x.status === 'active' && !subPaid(s, x, mk)).map((x) => {
      const full = legsInMonth(x, mk, null, true);
      const legs = legsInMonth(x, mk, x.startDate && x.startDate > from ? x.startDate : from, false, true);
      if (!full || !legs) return null;
      const factor = legs / full;
      const amount = Math.round((x.price * factor) / 250) * 250;
      const d = s.drivers.find((y) => y.id === x.driverId) || {};
      return { subId: x.id, label: `${x.riderNames}، ${d.name || ''}`, note: legs < full ? `${legs} گەشتی ماوەی ئەم مانگە` : '', full: x.price, amount, legs, factor };
    }).filter(Boolean);
  }
  TK.dueLines = dueLines;
  /** تۆمارکردنی پارەدانی مانگ: مێژوو، هاوبەش، داشکاندنە بەکارهاتووەکان، خاڵ */
  function recordPayment(s, owner, inv, method) {
    const ps = pslice(s, owner);
    if (!ps) return 0;
    const pts = TK.pointsFor(inv.total);
    const now = Date.now();
    ps.billing.paid = true;
    ps.billing.history.unshift({ month: ps.billing.month, total: inv.total, at: now, method: method || ps.billing.method, lines: inv.lines, promo: inv.promo, disc: inv.disc, discounts: inv.discounts.map((d) => ({ label: d.label, amount: d.amount })), credit: inv.credit, name: ps.passenger.name });
    partnerEarn(s, ps.passenger.phone, ps.passenger.name, ps.billing.month, inv.total);
    // قەرەبووەکان بەکارهاتن؛ ئەگەر لە فاتورەکە زیاتر بوون، ماوەکە بۆ مانگی داهاتوو دەمێنێتەوە
    if (!walletOn()) {
      const adj = (ps.billing.adjustments || []).reduce((n, a) => n + a.amount, 0);
      const rest = adj - (inv.credit || 0);
      ps.billing.adjustments = rest > 0 ? [{ id: 'adj' + uid(), amount: rest, note: 'ماوەی قەرەبوو', at: now }] : [];
    }
    ps.rewards = Object.assign({ points: 0, redeemed: [], pending: [], used: [] }, ps.rewards);
    inv.discounts.forEach((d) => {
      const r = d.kind !== 'reward' && (s.referrals || []).find((x) => x.id === d.id);
      if (r && d.kind === 'refIn') r.inviteeUsedAt = now;
      if (r && d.kind === 'refOut') r.inviterUsedAt = now;
      if (d.kind === 'reward') {
        const p = (ps.rewards.pending || []).find((x) => x.id === d.id);
        ps.rewards.pending = (ps.rewards.pending || []).filter((x) => x.id !== d.id);
        if (p) ps.rewards.used = [Object.assign({}, p, { value: d.amount, usedAt: now })].concat(ps.rewards.used || []).slice(0, 30);
      }
    });
    ps.rewards.points += pts;
    return pts;
  }
  /** پارەدانی مانگ لە جزدان (لە ناو update). هەڵە دەگەڕێنێتەوە یان null */
  function payMonthIn(s, owner) {
    const inv = TK.invoice(s, owner, { due: true });
    if (!inv.lines.length) return 'هیچ پارەیەکی ئەم مانگە نەماوە';
    if (TK.balance(s, owner) < inv.total) return 'باڵانسی جزدانەکەت بەس نییە';
    const mk = MONTH_KEY();
    const now = Date.now();
    const subIds = inv.lines.map((l) => l.subId).sort();
    const rule = TK.commissionRule();
    const lines = inv.lines.map((l) => {
      const sub = s.subscriptions.find((x) => x.id === l.subId);
      return { subId: l.subId, driverId: sub.driverId, names: sub.riderNames, amt: l.amount, fee: TK.feeFor(sub, l.amount, l.factor, rule), legs: l.legs };
    });
    const gross = lines.reduce((n, l) => n + l.amt, 0);
    // داشکاندن (هاوبەش، بانگهێشت، پاداشت) لە کۆمیسیۆنی یەکسا دەدرێت، نەک لە بەشی شۆفێر
    const e = went(s, { id: safeId(`m_${mk}_${subIds.join('_')}`), who: owner, role: 'p', type: 'monthpay', amount: -inv.total, gross, discount: gross - inv.total, month: mk, lines, note: `پارەی مانگ، ${fmt.MONTHS[new Date().getMonth()]}`, title: inv.lines.map((l) => l.label).join('؛ ') });
    if (!e) return 'پارەی ئەم مانگە پێشتر دراوە';
    lines.forEach((l) => {
      const sub = s.subscriptions.find((x) => x.id === l.subId);
      genTrips(s, sub);
      dnotice(s, sub.driverId, { kind: 'pay', title: `${sel.peerName(sub.owner || 'me')} پارەی مانگی دا`, body: `${sub.riderNames}، گەشتەکان دەست پێدەکەن`, link: 'riders' });
    });
    const pts = recordPayment(s, owner, inv, 'wallet');
    notice(s, { kind: 'pay', title: 'پارەی مانگ درا', body: `${fmt.money(inv.total)} لە جزدانەکەت${pts ? `، ${pts} خاڵی پاداشت` : ''}` }, owner);
    return null;
  }
  /** داهاتی شۆفێر کاتێک ڕۆتێک (یان گەشتێک) کۆتایی دێت: تەواوبوو، «نایەم» و «نەهات»ی سەرنشین داهاتن؛ «شۆفێر نەهات» و نەکراو نا */
  function walletRun(s, run, day) {
    if (!walletOn() || !run.length) return;
    const mk = monthOf(day);
    const lead = run[0];
    const groups = {};
    run.forEach((t) => {
      const sub = s.subscriptions.find((x) => x.id === t.subId);
      const v = legValue(s, sub, mk);
      if (!v) return;
      const st = t.status === 'done' ? 'done' : t.status === 'skipped' ? 'skipped' : t.status === 'absent' ? 'absent' : null;
      if (!st) return;
      const who = t.originalDriverId || t.driverId;
      (groups[who] = groups[who] || []).push({ subId: sub.id, owner: sub.owner || 'me', names: sub.riderNames, dir: t.dir, status: st, amount: v });
    });
    const key = safeId(`${lead.runId || lead.id}_${day}`);
    Object.keys(groups).forEach((who) => {
      const lines = groups[who];
      went(s, { id: `e_${key}_${who}`, who, role: 'd', type: 'earn', amount: lines.reduce((n, l) => n + l.amount, 0), day, month: mk, lines, tripId: lead.id, title: lead.runTitle || lead.title, dir: lead.dir });
    });
    // پارەی جێگرەوە: لە شۆفێری سەرەکییەوە بۆ ئەو شۆفێرەی چوو، تەنها ئەگەر گەشتەکە کرا
    const sw = run.find((t) => t.swapPay && t.originalDriverId && t.status === 'done');
    if (sw) {
      const fromName = (s.drivers.find((x) => x.id === sw.originalDriverId) || {}).name || '';
      const toName = (s.drivers.find((x) => x.id === sw.driverId) || {}).name || '';
      went(s, { id: `so_${safeId(sw.id)}`, who: sw.originalDriverId, role: 'd', type: 'swapout', amount: -sw.swapPay, day, month: mk, tripId: sw.id, note: `جێگرەوە: ${toName}، ${sw.runTitle || sw.title}` });
      went(s, { id: `si_${safeId(sw.id)}`, who: sw.driverId, role: 'd', type: 'swapin', amount: sw.swapPay, day, month: mk, tripId: sw.id, note: `جێگرەوەی ${fromName}، ${sw.runTitle || sw.title}` });
    }
    [...new Set(run.filter((t) => t.status === 'skipped').map((t) => t.subId))].forEach((id) => skipRefunds(s, id, mk));
  }
  TK.walletRun = walletRun;
  /** «نایەم»: بۆ هەر skipEvery ڕۆژ لە یەک مانگدا، پارەی skipRefundDays ڕۆژ لە شۆفێرەوە بۆ سەرنشین (یەک لا = نیو ڕۆژ) */
  function skipRefunds(s, subId, mk) {
    const c = cfg();
    const sub = s.subscriptions.find((x) => x.id === subId);
    const v = legValue(s, sub, mk);
    if (!v || !(c.skipEvery > 0) || !(c.skipRefundDays > 0)) return;
    const lpd = legsPerDay(sub);
    const legs = (s.wallet || []).filter((e) => e.type === 'earn' && e.month === mk).reduce((n, e) => n + (e.lines || []).filter((l) => l.subId === subId && l.status === 'skipped').length, 0);
    const k = Math.floor(legs / (c.skipEvery * lpd));
    const amount = v * lpd * c.skipRefundDays;
    for (let i = 1; i <= k; i++) {
      const note = `گەڕانەوەی ${c.skipRefundDays} ڕۆژ (${c.skipEvery} ڕۆژ «نایەم»)، ${sub.riderNames}`;
      const a = went(s, { id: `sr_${safeId(subId)}_${mk}_${i}`, who: sub.owner || 'me', role: 'p', type: 'skipref', amount, month: mk, subId, note });
      if (a) {
        went(s, { id: `sd_${safeId(subId)}_${mk}_${i}`, who: sub.driverId, role: 'd', type: 'skipdeduct', amount: -amount, month: mk, subId, note });
        notice(s, { kind: 'pay', title: 'پارەی ڕۆژێک گەڕایەوە', body: `${fmt.money(amount)} چووە سەر جزدانەکەت (${c.skipEvery} ڕۆژ «نایەم»)` }, sub.owner);
      }
    }
  }
  /** پاداشتی مانگانەی شۆفێر بۆ مانگی ڕابردوو (تەنها بەڕێوەبەر دەینووسێت) */
  function walletBonuses(s) {
    if (!walletOn() || ROLE !== 'admin') return;
    const c = cfg();
    const d0 = new Date();
    const pmk = MONTH_KEY(new Date(d0.getFullYear(), d0.getMonth() - 1, 1));
    if (!(c.bonusAmount > 0)) return;
    s.drivers.forEach((d) => {
      // ڕۆژەکانی کار لە دەفتەرەوە (داهاتی گەشت)، نەک لە پرۆفایلەوە کە شۆفێر خۆی دەینووسێت
      const days = new Set((s.wallet || []).filter((e) => e.who === d.id && e.type === 'earn' && e.month === pmk && e.day).map((e) => e.day)).size;
      if (days < c.bonusDays) return;
      if (went(s, { id: `b_${safeId(d.id)}_${pmk}`, who: d.id, role: 'd', type: 'bonus', amount: c.bonusAmount, month: pmk, note: `پاداشتی مانگانە، ${days} ڕۆژی کار` })) {
        dnotice(s, d.id, { kind: 'pay', title: 'پاداشتی مانگانە', body: `${fmt.money(c.bonusAmount)} چووە سەر جزدانەکەت`, link: 'earnings' });
      }
    });
  }
  /** گەڕاندنەوەی پارەی ئەو ڕۆژانەی کە بەشدارییەک نەکرا (هەڵوەشاندنەوە یان ڕاگرتن): داواکارییەک بۆ بەڕێوەبەر (سەرنشین خۆی ناتوانێت پارە بخاتە سەر جزدان) */
  function refundRequest(s, sub, legs, why) {
    const mk = MONTH_KEY();
    const rec = payRec(s, sub, mk);
    if (!walletOn() || !rec || rec.legacy || !rec.legs || legs <= 0) return;
    const amount = Math.round((rec.amt * Math.min(legs, rec.legs)) / rec.legs / 250) * 250;
    if (!amount) return;
    const ps = pslice(s, sub.owner || 'me') || s;
    s.topups = s.topups || [];
    s.topups.unshift({ id: 'tp' + uid(), kind: 'refund', owner: sub.owner || 'me', name: ps.passenger.name, phone: ps.passenger.phone, amount, method: 'refund', subId: sub.id, legs, note: `${why}، ${sub.riderNames}، ${legs} گەشت`, status: 'pending', at: Date.now() });
    anotice(s, { kind: 'pay', title: `داوای گەڕاندنەوە: ${ps.passenger.name}`, body: `${fmt.money(amount)}، ${why}`, link: 'wallet' });
  }
  /** ژمارەی گەشتەکانی ماوەی مانگ لە ئەمڕۆوە (گەشتە دەستپێنەکراوەکانی ئەمڕۆ لەگەڵ) */
  function legsLeft(s, sub) {
    const mk = MONTH_KEY();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const today = s.trips.filter((t) => t.subId === sub.id && t.day === TODAY() && t.status === 'scheduled').length;
    return (monthOf(TODAY(d)) === mk ? legsInMonth(sub, mk, TODAY(d)) : 0) + today;
  }
  /** گەشتەکانی ماوەی ڕاگرتنێک لەم مانگەدا (لە ڕۆژی دوای ڕاگرتنەوە تا ڕۆژی پێش دەستپێکردنەوە) */
  function legsPaused(sub, p) {
    const mk = MONTH_KEY();
    const a = new Date(p.from);
    a.setDate(a.getDate() + 1);
    const b = new Date(p.to || Date.now());
    let n = 0;
    for (let d = new Date(a.getFullYear(), a.getMonth(), a.getDate()); d < new Date(b.getFullYear(), b.getMonth(), b.getDate()); d.setDate(d.getDate() + 1)) {
      if (monthOf(TODAY(d)) !== mk || !dayApplies(sub, d)) continue;
      ['go', 'back'].forEach((dir) => dayTime(sub, dir, d) && n++);
    }
    return n;
  }
  TK.noticeAdd = (s, n, owner) => notice(s, n, owner);
  TK.dnoticeAdd = (s, n) => dnotice(s, n.driverId, n);
  /** بەشی ئاگادارکردنەوەی شۆفێر بۆ دوگمەکانی سەرەوە: pay پارە، req داواکاری، acct هەژمار، trip گەشت (ئاگادارکردنەوە کۆنەکانیش دەگرێتەوە) */
  TK.dnoticeCat = (n) => {
    const l = String(n.link || '');
    const t = String(n.title || '');
    if (n.kind === 'pay' || n.kind === 'self' || l.startsWith('earnings') || /سزا|پاداشت|موچە|کۆمیسیۆن|قەرز|حیساب/.test(t)) return 'pay';
    if (n.kind === 'offer' || l.startsWith('request')) return 'req';
    if (l.startsWith('profile') || l.startsWith('support') || /بەڵگەنامە|هەژمار|سکاڵا|پشتڕاست/.test(t)) return 'acct';
    if (n.kind === 'swap' || /^(trip|routes|today|riders)/.test(l) || /بەشداری|گەشت|سەرنشین|جێگرەوە/.test(t)) return 'trip';
    return '';
  };
  TK.endSubIn = (s, id, why) => endSub(s, id, why);
  /** کۆتاییهێنان بە بەشداری: گەشتە نەکراوەکان لادەبرێن، مێژوو دەمێنێتەوە */
  function endSub(s, id, why) {
    const sub = s.subscriptions.find((x) => x.id === id);
    if (!sub) return;
    if (ROLE !== 'driver') refundRequest(s, sub, sub.status === 'paused' ? 0 : legsLeft(s, sub), why === 'change' ? 'گۆڕینی شۆفێر' : 'هەڵوەشاندنەوەی بەشداری');
    s.subscriptions = s.subscriptions.filter((x) => x.id !== id);
    // ئەگەر ئاراس پێش یەکەم پارەدان هەڵیوەشاندەوە، داشکاندنی بانگهێشت نامێنێت
    if (why !== 'change') (s.referrals || []).forEach((x) => x.subId === id && x.status === 'subscribed' && !x.inviteeUsedAt && (x.status = 'cancelled'));
    s.trips = s.trips.filter((t) => t.subId !== id || t.status === 'active' || t.status === 'done');
    unrouteSub(s, id, sub.riderNames);
    const d = s.drivers.find((x) => x.id === sub.driverId);
    if (d) d.freeSeats += sub.mode === 'one' ? sub.memberIds.length : 1;
    const names = sub.riderNames;
    const who = why === 'deleted' ? 'سەرنشینێک' : sel.peerName(sub.owner || 'me');
    const reason = why === 'change' ? 'شۆفێری گۆڕی' : why === 'admin' ? 'بەشدارییەکەی لەلایەن بەڕێوەبەرەوە هەڵوەشێنرایەوە' : why === 'deleted' ? 'هەژمارەکەی سڕییەوە' : 'بەشدارییەکەی هەڵوەشاندەوە';
    s.messages.push({ id: uid(), driverId: sub.driverId, peer: sub.owner || 'me', fromDriver: false, system: true, text: `${who} ${reason} (${names}، ${sub.to})`, at: Date.now(), readP: true, readD: false });
    dnotice(s, sub.driverId, { kind: 'info', title: `${who} ${reason}`, body: `${names}، ${sub.to}، گەشتەکانی داهاتوو لابران` });
    notice(s, { kind: 'info', title: why === 'change' ? 'شۆفێر گۆڕا' : 'بەشدارییەکە هەڵوەشێنرایەوە', body: `${names}، ${d ? d.name : ''} ئاگادار کرایەوە. گەشتە کراوەکان لە «گەشتەکانم» دەمێننەوە` }, sub.owner);
  }

  /** چەند خولەک ماوە بۆ کاتێکی ئەمڕۆ (نێگەتیڤ = تێپەڕیوە) */
  TK.minutesUntil = function (hhmm) {
    const d = new Date();
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m - (d.getHours() * 60 + d.getMinutes());
  };
  /** «نایەم» تەنها تا ماوەیەک پێش گەشت ڕێگەپێدراوە */
  TK.canSkip = function (t) {
    const m = TK.minutesUntil(t.time);
    return !(m >= 0 && m < cfg().skipCutoffMin);
  };

  /* ---------- فاتورە: بە پێی ڕۆژی دەستپێکردن و ڕۆژە ڕاگیراوەکان ---------- */
  function monthBounds() {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    return { start, end, days: Math.round((end - start) / 86400000) };
  }
  TK.pausedDays = function (sub) {
    const { start, end } = monthBounds();
    let ms = 0;
    (sub.pauseLog || []).forEach((p) => {
      const a = Math.max(start, p.from);
      // ڕاگرتنێک کە هێشتا کراوەیە تا کۆتایی مانگ حیساب دەکرێت (نەک تا ئەمڕۆ)
      const b = Math.min(end, p.to || end);
      if (b > a) ms += b - a;
    });
    return (sub.pauseLog || []).some((p) => (p.to || Date.now()) > start) ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
  };
  /** بڕی ئەم مانگەی بەشدارییەک: بە پێی ڕۆژی دەستپێکردن و ڕۆژە ڕاگیراوەکان. null ئەگەر هێشتا دەستی پێنەکردبێت */
  function monthShare(x) {
    const mb = monthBounds();
    let factor = 1;
    const notes = [];
    if (x.startDate) {
      const [y, m, d] = x.startDate.split('-').map(Number);
      const st = new Date(y, m - 1, d).getTime();
      if (st >= mb.end) return null; // هێشتا دەستی پێنەکردووە
      if (st > mb.start) {
        factor = (mb.days - d + 1) / mb.days;
        notes.push(`لە ${d}ی مانگەوە`);
      }
    }
    const pd = TK.pausedDays(x);
    if (pd) {
      factor = Math.max(0, factor - pd / mb.days);
      notes.push(`${pd} ڕۆژ ڕاگیراو`);
    }
    return { factor, notes, amount: Math.round((x.price * factor) / 1000) * 1000 };
  }
  TK.monthShare = monthShare;
  /* ---------- کۆمیسیۆنی یەکسا ----------
   * ٪: ڕێژەیەک لە نرخی هەر بەشدارییەک.
   * دینار: بڕێکی جێگیر بۆ کەسی یەکەم؛ کەسی دووەم بەدواوە بە هەمان ڕێژەی نرخەکەی («نرخی کەسی دووەم بەدواوە»).
   * هەردووکیان بە پێی ڕۆژە چالاکەکانی مانگ حیساب دەکرێن. یاسای نوێ لە مانگی داهاتووەوە جێبەجێ دەبێت. */
  const nextMonthKey = () => {
    const d = new Date();
    return MONTH_KEY(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };
  TK.nextMonthKey = nextMonthKey;
  TK.commissionRule = function (mk = MONTH_KEY()) {
    const c = cfg();
    const n = c.commissionNext;
    if (n && n.from && mk >= n.from) return { type: n.type, pct: n.pct, fixed: n.fixed };
    return { type: c.commissionType || 'pct', pct: c.commission, fixed: c.commissionFixed };
  };
  /** کێشی بەشدارییەک بە پێی ژمارەی کەس: ١ + ٠٫٧ × (کەس - ١) */
  TK.riderWeight = function (x) {
    const n = Math.max(1, x.riders || (x.memberIds || []).length || 1);
    if (x.mode === 'separate' || n === 1) return 1;
    return 1 + cfg().extraRiderFactor * (n - 1);
  };
  /** کۆمیسیۆنی بەشدارییەک. amount = نرخی ئەم مانگە (دوای حیسابی ڕۆژەکان)، factor = بەشی ڕۆژە چالاکەکان */
  TK.feeFor = function (x, amount, factor = 1, rule = TK.commissionRule()) {
    if (rule.type === 'fixed') return Math.min(amount, Math.round((rule.fixed * TK.riderWeight(x) * factor) / 250) * 250);
    return Math.round(amount * rule.pct);
  };
  /** دەقی یاسای کۆمیسیۆن بۆ نیشاندان */
  TK.commissionText = function (rule = TK.commissionRule()) {
    if (rule.type === 'fixed') return `${fmt.money(rule.fixed)} بۆ هەر کەسێک لە مانگێکدا`;
    return `${fmt.n(Math.round(rule.pct * 100))}٪ لە نرخی هەر بەشدارییەک`;
  };

  /* ---------- بانگهێشتی هاوڕێ ----------
   * ئەحمەد کۆدەکەی دەنێرێت بۆ ئاراس. کاتێک ئاراس بەشداری دەکات، هەردووکیان هەمان داشکاندن وەردەگرن:
   * ئاراس لە فاتورەی یەکەم مانگی، ئەحمەد لە فاتورەی داهاتووی. پارە نییە و ناکێشرێتەوە.
   * داشکاندن لە کۆمیسیۆنی یەکسا دەبڕدرێت؛ داهاتی شۆفێر ناگۆڕێت. */
  TK.refAmount = function (price) {
    const c = cfg();
    if (!c.refOn) return 0;
    if (c.refType === 'pct') {
      const v = Math.round((price * c.refPct) / 250) * 250;
      return Math.min(price, c.refMax ? Math.min(v, c.refMax) : v);
    }
    return Math.min(price, c.refFixed || 0);
  };
  /** دەقی داشکاندنی بانگهێشت: «٥٬٠٠٠ دینار» یان «٥٪ (تا ١٠٬٠٠٠ دینار)» */
  TK.refText = function () {
    const c = cfg();
    if (c.refType === 'pct') return `${fmt.n(Math.round(c.refPct * 100))}٪${c.refMax ? ` (تا ${fmt.money(c.refMax)})` : ''}`;
    return fmt.money(c.refFixed || 0);
  };
  const REF_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  TK.newRefCode = () => 'YK' + Array.from({ length: 4 }, () => REF_ABC[Math.floor(Math.random() * REF_ABC.length)]).join('');
  const meUid = (owner) => (!owner || owner === 'me' ? cloud.me : owner);
  /** ئەو بانگهێشتەی ئەم سەرنشینە پێی هاتووە (وەک ئاراس) */
  TK.refAsInvitee = (s, owner = 'me') => (s.referrals || []).find((r) => r.invitee === meUid(owner)) || null;
  /** ئەو هاوڕێیانەی ئەم سەرنشینە بانگهێشتی کردوون (وەک ئەحمەد) */
  TK.refsAsInviter = (s, owner = 'me') => (s.referrals || []).filter((r) => r.inviter === meUid(owner));

  /* ---------- پاداشتەکان (بەڕێوەبەر دیارییان دەکات) ---------- */
  const REWARDS_DEFAULT = [
    { id: 'rw1', title: '١٠٬٠٠٠ دینار داشکاندن', cost: 500, kind: 'iqd', amount: 10000, repeat: true, on: true },
    { id: 'rw2', title: '٢٥٬٠٠٠ دینار داشکاندن', cost: 1000, kind: 'iqd', amount: 25000, repeat: true, on: true },
    { id: 'rw3', title: 'هەفتەیەکی بەخۆڕایی', cost: 2500, kind: 'days', amount: 7, repeat: true, on: true },
  ];
  TK.REWARDS_DEFAULT = REWARDS_DEFAULT;

  /* ---------- پرسیارە باوەکان (بەڕێوەبەر دیارییان دەکات). aud: p سەرنشین، d شۆفێر، all هەردووکیان ---------- */
  const FAQ_DEFAULT = [
    { id: 'fq1', aud: 'p', on: true, q: 'ئەگەر شۆفێرەکەم نەهات چی دەبێت؟', a: 'شۆفێرێکی جێگرەوە بە هەمان کات و نرخ دێت و پێشوەختە ئاگادار دەکرێیتەوە. ئەگەر دواکەوتن هەبوو، قەرەبووی ڕۆژەکە بۆ فاتورەی داهاتوو زیاد دەکرێت.' },
    { id: 'fq2', aud: 'p', on: true, q: 'چۆن نرخ دیاری دەکرێت؟', a: 'ئەپەکە بە پێی دووری ڕێگا، ژمارەی ڕۆژەکان و ژمارەی سەرنشینەکان نرخێک پێشنیار دەکات. شۆفێرەکان دەتوانن تا {offerRange} کەمتر یان زیاتر نرخ بنێرن و تۆ هەڵدەبژێریت.' },
    { id: 'fq3', aud: 'p', on: true, q: 'دەتوانم بەشدارییەکەم ڕابگرم؟', a: 'بەڵێ، لە بەشی بەشداری «ڕاگرتنی کاتی» دابگرە. بۆ ئەو ڕۆژانەی ڕاگیراوە پارە نادەیت.' },
    { id: 'fq4', aud: 'p', on: true, q: 'چۆن پەیوەندی بە شۆفێرەکەمەوە بکەم؟', a: 'لە ناو ئەپ نامەی بۆ بنێرە، یان لە پەڕەی شۆفێرەکە پەیوەندی تەلەفۆنی پێوە بکە. ژمارەی مۆبایلی تۆ لای شۆفێر هەمیشە شاراوەیە.' },
    { id: 'fq5', aud: 'd', on: true, q: 'چۆن داواکاری وەربگرم؟', a: '«ئامادەی کارم» چالاک بکە. کاتێک سەرنشینێک داوا بکات دەنگێکت بۆ دێت. نرخێک پێشنیار کراوە، دەتوانیت تا {offerRange} کەمتر یان زیاتر نرخ بنێریت.' },
    { id: 'fq6', aud: 'd', on: true, q: 'ئەگەر ڕۆژێک نەتوانم بچم چی بکەم؟', a: 'گەشتەکە بکەرەوە و «ناتوانم بڕۆم، جێگرەوە» دابگرە. داواکارییەکەت بۆ شۆفێرانی تر بڵاو دەبێتەوە و ئەو بڕەی دیاری دەکەیت بۆ ئەو کەسە دەبێت کە وەری دەگرێت. ئەگەر کەس وەری نەگرت، دەبێت خۆت بڕۆیت.' },
    { id: 'fq7', aud: 'd', on: true, q: 'بۆچی ژمارەی سەرنشین نابینم؟', a: 'بۆ پاراستنی تایبەتمەندی سەرنشینان، ژمارەکانیان شاراوەیە. لە ڕێگەی نامەی ناو ئەپەوە پەیوەندییان پێوە بکە.' },
  ];
  TK.FAQ_DEFAULT = FAQ_DEFAULT;
  /** ژمارەکانی پەیوەندی کە بەڕێوەبەر دایناون (سەرنشین p، شۆفێر d) */
  TK.contactsFor = (aud) => (Array.isArray(cfg().contacts) ? cfg().contacts : []).filter((x) => x.phone && (x.aud === aud || !x.aud || x.aud === 'all'));
  /** پەنجەرەی «پەیوەندی»: لیستی ژمارەکان، هەر یەکەیان پەیوەندی تەلەفۆنی ڕاستەوخۆ */
  TK.contactSheet = (aud) => TK.sheet(() => {
    const l = TK.contactsFor(aud);
    return `<div class="h2 center">پەیوەندی بە یەکسا</div>
      ${l.length ? `<div class="list contact-list">${l.map((x) => `<a class="item tap" href="tel:+964${esc(x.phone)}"><div class="grow"><b class="latin" dir="ltr" style="display:block;text-align:right">${fmt.phone(x.phone)}</b>${x.label ? `<div class="xs muted">${esc(x.label)}</div>` : ''}</div><span class="ico-box ok">${TK.icon('phone', 20, 'var(--ok-text)')}</span></a>`).join('')}</div>`
        : '<div class="sm muted center">هێشتا هیچ ژمارەیەک دانەنراوە</div>'}
      <button class="btn ghost block" data-close>داخستن</button>`;
  });
  TK.faqAll = () => (Array.isArray(cfg().faq) ? cfg().faq : FAQ_DEFAULT);
  /** پرسیارە چالاکەکانی سەرنشین (p) یان شۆفێر (d) */
  TK.faqList = (aud) => TK.faqAll().filter((x) => x.on !== false && (x.aud === aud || x.aud === 'all'));
  /** {offerRange} لە وەڵامدا دەبێتە ڕێژەی ئێستای ڕێکخستن (بۆ نموونە ١٥٪) */
  TK.faqText = (t) => String(t || '').replace(/\{offerRange\}/g, `${fmt.n(Math.round((cfg().offerRange || 0) * 100))}٪`);
  TK.rewardsList = () => {
    const l = cfg().rewards;
    return Array.isArray(l) ? l : REWARDS_DEFAULT;
  };
  /** دەقی بڕی پاداشتێک: «١٠٬٠٠٠ دینار» یان «٧ ڕۆژ» */
  TK.rewardValue = (x) => (x.kind === 'days' ? `${fmt.n(x.amount)} ڕۆژی بەخۆڕایی` : `${fmt.money(x.amount)} داشکاندن`);
  /** خاڵ بۆ بڕێک پارە */
  TK.pointsFor = (total) => Math.floor((total / 1000) * (cfg().pointsPer1000 || 0));

  /** فاتورەی مانگی سەرنشینێک (بنەڕەت: سەرنشینی ئێستا)
   * ڕیز: کۆی بەشدارییەکان ← کۆدی داشکاندن ← داشکاندنی بانگهێشت و پاداشت ← قەرەبوو */
  TK.invoice = function (s, owner = 'me', opts = {}) {
    const ps = pslice(s, owner) || { billing: { adjustments: [] } };
    const mb = monthBounds();
    // جزدان: تەنها ئەو بەشدارییانەی پارەی ئەم مانگەیان نەدراوە، لە ئەمڕۆوە
    const lines = opts.due ? dueLines(s, owner) : s.subscriptions.filter((x) => (x.owner || 'me') === owner).map((x) => {
      const sh = monthShare(x);
      if (!sh) return null;
      const d = s.drivers.find((y) => y.id === x.driverId) || {};
      return { subId: x.id, label: `${x.riderNames}، ${d.name || ''}`, note: sh.notes.join('، '), full: x.price, amount: sh.amount };
    }).filter(Boolean);
    const sub = lines.reduce((n, l) => n + l.amount, 0);
    const b = ps.billing || {};
    const promo = b.promo ? Math.round((sub * b.promo.rate) / 1000) * 1000 : 0;
    // داشکاندنەکان: تەنها ئەوەی بە تەواوی جێی دەبێتەوە، ئەوانی تر بۆ مانگی داهاتوو دەمێننەوە
    const discounts = [];
    const waiting = [];
    let room = Math.max(0, sub - promo);
    const take = (d) => {
      if (d.amount > 0 && d.amount <= room) {
        room -= d.amount;
        discounts.push(d);
      } else if (d.amount > 0) waiting.push(d);
    };
    const mk = MONTH_KEY();
    const asInv = TK.refAsInvitee(s, owner);
    if (asInv && asInv.status === 'subscribed' && !asInv.inviteeUsedAt && (!asInv.month || asInv.month <= mk) && lines.some((l) => l.subId === asInv.subId)) {
      take({ kind: 'refIn', id: asInv.id, label: 'داشکاندنی بانگهێشتی هاوڕێ، یەکەم مانگ', amount: asInv.amount || 0 });
    }
    TK.refsAsInviter(s, owner).filter((r) => r.status === 'subscribed' && !r.inviterUsedAt).forEach((r) => {
      take({ kind: 'refOut', id: r.id, label: `داشکاندنی بانگهێشت، ${r.inviteeName || 'هاوڕێ'}`, amount: r.amount || 0 });
    });
    ((ps.rewards || {}).pending || []).forEach((p) => {
      const amount = p.kind === 'days' ? Math.round(((sub / mb.days) * p.amount) / 250) * 250 : p.amount;
      take({ kind: 'reward', id: p.id, label: `پاداشت، ${p.title}`, amount });
    });
    const disc = discounts.reduce((n, d) => n + d.amount, 0);
    const adj = opts.due ? 0 : (b.adjustments || []).reduce((n, a) => n + a.amount, 0);
    const credit = Math.min(adj, Math.max(0, sub - promo - disc));
    return { lines, sub, promo, discounts, waiting, disc, credit, adjustments: b.adjustments || [], total: Math.max(0, sub - promo - disc - credit) };
  };

  /* ---------- حیسابی شۆفێر: داهات، کۆمیسیۆن، سزا، پاداشت ---------- */
  TK.payout = function (s, driverId) {
    const c = cfg();
    const d = s.drivers.find((x) => x.id === driverId) || {};
    // هەمان بڕی فاتورەی سەرنشین: تەنها ڕۆژەکانی ئەم مانگە کە بەشدارییەکە چالاک بووە (ڕۆژە ڕاگیراوەکان کەم دەکرێنەوە)
    const rule = TK.commissionRule();
    const lines = s.subscriptions.filter((x) => x.driverId === driverId).map((x) => ({ x, sh: monthShare(x) })).filter((l) => l.sh && l.sh.amount > 0);
    lines.forEach((l) => (l.fee = TK.feeFor(l.x, l.sh.amount, l.sh.factor, rule)));
    const subs = lines.map((l) => l.x);
    const gross = lines.reduce((n, l) => n + l.sh.amount, 0);
    const commission = lines.reduce((n, l) => n + l.fee, 0);
    const entries = s.ledger.filter((e) => e.driverId === driverId && !e.paidOut);
    const ledgerSum = entries.reduce((n, e) => n + e.amount, 0);
    const mk = MONTH_KEY();
    const bonusDays = (d.workDays || []).filter((x) => x.startsWith(mk)).length;
    const bonus = bonusDays >= c.bonusDays ? c.bonusAmount : 0;
    return { gross, commission, entries, ledgerSum, bonus, bonusDays, net: gross - commission + ledgerSum + bonus, subs: subs.length, rule, lines: lines.map((l) => ({ subId: l.x.id, riderNames: l.x.riderNames, riders: l.x.riders || 1, full: l.x.price, amount: l.sh.amount, fee: l.fee, note: l.sh.notes.join('، ') })) };
  };

  /* =========================================================
   * ٨. نەخشە: جووڵەی مەزەندەیی ئۆتۆمبێل لەسەر ڕێگا (بێ GPS)
   * ======================================================= */
  const SEGMENT_MS = 6 * 60000; // هەر بەشێکی ڕێگا نزیکەی ٦ خولەک
  const DISPLAY_MIN = 6;
  const sim = {
    progress(t, now = Date.now()) {
      const n = t.stops.length;
      if (n < 2) return 0;
      if (t.status === 'done') return 1;
      if (t.status !== 'active') return 0;
      const done = t.stops.filter((x) => x.done).length;
      if (done === 0) return 0; // هێشتا لە ڕێگەیە بۆ یەکەم وێستگە
      const seg = Math.min(0.92, Math.max(0, (now - (t.segmentStartedAt || now)) / SEGMENT_MS));
      return Math.min(1, (done - 1 + seg) / (n - 1));
    },
    /** خولەکی ماوە: پێش سوار بوون تا شۆفێر دەگاتە لای سەرنشین، دوای ئەوە تا گەیشتن بە شوێنی خۆی */
    minutesLeft(t, now = Date.now()) {
      const n = t.stops.length;
      const done = t.stops.filter((x) => x.done).length;
      const pick = t.stops.findIndex((st) => st.kind === 'pickup' && ownStop(t, st));
      let target = -1;
      t.stops.forEach((st, i) => ownStop(t, st) && (target = i));
      if (target < 0) target = n - 1;
      const goal = pick >= 0 && !t.stops[pick].done ? pick : target;
      const seg = Math.min(0.92, Math.max(0, (now - (t.segmentStartedAt || now)) / SEGMENT_MS));
      return Math.max(1, Math.ceil((goal - done + 1 - seg) * DISPLAY_MIN));
    },
    /** ئایا سەرنشین هێشتا سوار نەبووە (شۆفێر بەرەو لای دێت) */
    waiting(t) {
      const pick = t.stops.findIndex((st) => st.kind === 'pickup' && ownStop(t, st));
      return pick >= 0 && !t.stops[pick].done;
    },
    eta(t) {
      const d = new Date(Date.now() + sim.minutesLeft(t) * 60000);
      return fmt.hhmm(d.getTime());
    },
    next: (t) => t.stops.findIndex((x) => !x.done),
    ROUTE: [
      [70, 300],
      [70, 190],
      [180, 190],
      [180, 80],
      [320, 80],
    ],
    pointAt(route, t) {
      const lens = [];
      let total = 0;
      for (let i = 1; i < route.length; i++) {
        const l = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
        lens.push(l);
        total += l;
      }
      let dist = Math.max(0, Math.min(1, t)) * total;
      for (let i = 0; i < lens.length; i++) {
        if (dist <= lens[i]) {
          const f = lens[i] === 0 ? 0 : dist / lens[i];
          return [route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f];
        }
        dist -= lens[i];
      }
      return route[route.length - 1];
    },
    /** هەر چرکەیەک: داواکاری بەسەرچوو دادەخرێت و ڕۆژی نوێ ئامادە دەکرێت */
    tick() {
      if (!state || !synced()) return;
      const now = Date.now();
      // هەر ئامێرێک تەنها ئەوەی خۆی دادەخات: سەرنشین داواکارییەکانی خۆی، شۆفێر گەشتەکانی خۆی، بەڕێوەبەر هەمووی
      const mineReq = (r) => ROLE === 'admin' || (ROLE === 'passenger' && r.owner === 'me');
      const mineTrip = (t) => ROLE === 'admin' || (ROLE === 'driver' && t.driverId === cloud.me);
      const expired = state.requests.filter((r) => r.status === 'open' && now > r.expiresAt && mineReq(r)).map((r) => r.id);
      const lim = cfg().autoCloseMin * 60000;
      const stale = lim > 0 ? state.trips.filter((t) => t.status === 'active' && mineTrip(t) && now - (t.segmentStartedAt || t.startedAt || now) > lim).map((t) => t.id) : [];
      if (!expired.length && !stale.length) return;
      update((s) => {
        // گەشتێک کە شۆفێر لەبیری چووە تەواوی بکات خۆکار دادەخرێت
        // هەموو گەشتەکانی هەمان ڕۆت پێکەوە دادەخرێن (نەک یەک یەک)، پاشان یەک جار حیساب دەکرێت
        const closed = new Set();
        s.trips.filter((t) => stale.includes(t.id) && t.status === 'active').forEach((t) => {
          const k = t.runId || t.id;
          if (closed.has(k)) return;
          closed.add(k);
          const d = s.drivers.find((x) => x.id === t.driverId);
          runOf(s, t).filter((x) => x.status === 'active').forEach((x) => {
            const picked = x.stops.filter((st) => st.kind === 'pickup' && ownStop(x, st)).every((st) => st.done);
            x.autoClosed = true;
            if (picked) {
              // سوار کرابوو: وەک گەیەنراو دادەنرێت
              x.stops.forEach((st) => {
                if (!st.done) Object.assign(st, { done: true, doneAt: now, auto: true });
              });
              finishTrip(s, x, now);
            } else {
              // هەرگیز سوار نەکرا: پارەی بۆ شۆفێر نییە، سەرنشین ئاگادار دەکرێتەوە
              x.status = 'missed';
              x.missedAt = now;
              notice(s, { kind: 'info', red: true, title: 'گەشتەکە نەکرا', body: `${x.title}. شۆفێر دەستی پێکرد بەڵام سواری نەکردیت. ئەگەر کێشەیەک هەبوو «سکاڵا» بنێرە`, link: 'support' }, x.owner);
            }
          });
          finishRun(s, runOf(s, t));
          if (ROLE === 'admin' && window.TKFB && window.TKFB.write) window.TKFB.write({ op: 'delete', path: 'live/' + t.driverId }).catch(() => {});
          anotice(s, { kind: 'report', title: 'گەشتێک خۆکار داخرا', body: `${t.runTitle || t.title}، ${d ? d.name : ''}، دوای ${cfg().autoCloseMin} خولەک بێ جووڵە`, link: 'trips' });
          dnotice(s, t.driverId, { kind: 'info', title: 'گەشتەکەت خۆکار داخرا', body: `${t.runTitle || t.title}. تکایە دوای گەیاندن «گەیاندم» دابگرە`, link: 'today' });
        });
        s.requests.forEach((r) => {
          if (expired.includes(r.id) && r.status === 'open') {
            r.status = 'closed';
            r.closedReason = 'expired';
            notice(s, { kind: 'info', title: 'کاتی داواکارییەکەت تەواو بوو', body: `${r.riderNames}، ${r.to.split('، ')[0]}`, link: `request/${r.id}` }, r.owner);
          }
        });
      });
    },
  };
  TK.sim = sim;


  /* =========================================================
   * بەڵگەنامەکانی شۆفێر، وێنە و پشکنین
   * ======================================================= */
  // گرووپەکانی بەڵگەنامە کە بەڕێوەبەر هەر یەکەیان جیا پەسەند یان ڕەت دەکاتەوە
  TK.DOC_GROUPS = [
    { key: 'personal', label: 'زانیاری کەسی و وێنە', icon: 'user', fields: ['photo'] },
    { key: 'id', label: 'کارتی نیشتمانی', icon: 'doc', fields: ['idFront', 'idBack'] },
    { key: 'license', label: 'مۆڵەتی شۆفێری', icon: 'doc', fields: ['licFront', 'licBack'] },
    { key: 'car', label: 'ئۆتۆمبێل و وێنەکانی', icon: 'car', fields: ['carFront', 'carBack', 'carLeft', 'carRight', 'carInside'] },
    { key: 'registration', label: 'ساڵانەی ئۆتۆمبێل', icon: 'receipt', fields: ['regPhoto'] },
    { key: 'security', label: 'کۆدی ئاسایش', icon: 'shield', fields: ['secPhoto'] },
  ];
  TK.PHOTO_LABELS = {
    photo: 'وێنەی ڕووخسار', idFront: 'کارتی نیشتمانی (پێشەوە)', idBack: 'کارتی نیشتمانی (دواوە)',
    licFront: 'مۆڵەتی شۆفێری (پێشەوە)', licBack: 'مۆڵەتی شۆفێری (دواوە)',
    carFront: 'ئۆتۆمبێل (پێشەوە)', carBack: 'ئۆتۆمبێل (دواوە)', carLeft: 'ئۆتۆمبێل (لای چەپ)', carRight: 'ئۆتۆمبێل (لای ڕاست)', carInside: 'ناوەوەی ئۆتۆمبێل',
    regPhoto: 'وێنەی ساڵانە', secPhoto: 'وێنەی کۆدی ئاسایش',
  };
  /** ڕۆژەکانی بەسەرچوونی بەڵگەنامەکانی شۆفێرێک */
  TK.expiries = function (d) {
    const out = [];
    const add = (key, label, date) => {
      if (!date) return;
      const [y, m, dd] = String(date).split('-').map(Number);
      const days = Math.floor((new Date(y, m - 1, dd).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
      out.push({ key, label, date, days });
    };
    add('id', 'کارتی نیشتمانی', d.idExpiry);
    add('license', 'مۆڵەتی شۆفێری', d.licExpiry);
    add('registration', 'ساڵانەی ئۆتۆمبێل', d.regExpiry);
    if (d.secDate) {
      const [y, m, dd] = d.secDate.split('-').map(Number);
      const exp = new Date(y, m - 1, dd + cfg().securityValidDays);
      add('security', 'کۆدی ئاسایش', TODAY(exp));
    }
    return out;
  };
  /** تەمەن بە ساڵ لە ڕۆژی لەدایکبوونەوە */
  TK.age = function (birth) {
    if (!birth) return 0;
    const [y, m, d] = birth.split('-').map(Number);
    const now = new Date();
    let a = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a -= 1;
    return a;
  };
  /** پشکنینی زانیاری شۆفێر. full: تۆمارکردنی نوێ (هەموو خانەکان پێویستن) */
  TK.validateDriver = function (f, full) {
    const c = cfg();
    const today = TODAY();
    const need = (v) => v != null && String(v).trim() !== '';
    // وێنەکان تەنها کاتێک ئیجبارین کە بەڕێوەبەر «وێنە ئیجبارییە» چالاک کردبێت
    const pic = (v) => c.photosRequired !== true || need(v);
    if (full) {
      if (!need(f.name) || f.name.trim().split(/\s+/).length < 3) return 'ناوی سیانی وەک کارتی نیشتمانی بنووسە';
      if (!['m', 'f'].includes(f.gender)) return 'ڕەگەز هەڵبژێرە';
      if (!/^7\d{9}$/.test(cleanPhone(f.phone))) return 'ژمارەی مۆبایل دروست نییە (وەک 7xx xxx xxxx)';
      if (!f.pass || f.pass.length < 6) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت';
      if (f.pass !== f.pass2) return 'وشە نهێنییەکان وەک یەک نین';
      if (!need(f.birth)) return 'ڕۆژی لەدایکبوون بنووسە';
      if (TK.age(f.birth) < c.minDriverAge) return `تەمەنی شۆفێر دەبێت لانیکەم ${c.minDriverAge} ساڵ بێت`;
      if (!need(f.city) || !need(f.district) || !need(f.neighborhood)) return 'شار، قەزا و گەڕەک بنووسە';
      if (!pic(f.photo)) return 'وێنەی ڕووخسار بار بکە';
    }
    if (full || 'idNo' in f) {
      if (!/^[0-9A-Za-z]{6,20}$/.test(String(f.idNo || '').trim())) return 'ژمارەی کارتی نیشتمانی دروست نییە';
      if (!need(f.idExpiry) || f.idExpiry <= today) return 'کارتی نیشتمانی بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!pic(f.idFront) || !pic(f.idBack)) return 'وێنەی هەردوو ڕووی کارتی نیشتمانی بار بکە';
    }
    if (full || 'licNo' in f) {
      if (!need(f.licNo)) return 'ژمارەی مۆڵەتی شۆفێری بنووسە';
      if (!need(f.licExpiry) || f.licExpiry <= today) return 'مۆڵەتی شۆفێری بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!pic(f.licFront) || !pic(f.licBack)) return 'وێنەی هەردوو ڕووی مۆڵەتی شۆفێری بار بکە';
    }
    if (full || 'carMake' in f) {
      if (!need(f.carMake) || !need(f.carModel) || !need(f.carColor)) return 'جۆر، مۆدێل و ڕەنگی ئۆتۆمبێل بنووسە';
      const y = +f.carYear;
      if (!y || y < c.minCarYear || y > new Date().getFullYear() + 1) return `ساڵی دروستکردنی ئۆتۆمبێل دەبێت ${c.minCarYear} یان نوێتر بێت`;
      if (!(+f.seats >= 1 && +f.seats <= 8)) return 'ژمارەی کورسی سەرنشین دروست نییە';
      if (!/^\d{2}$/.test(String(f.plateCode || '')) || !/^\d{3,6}$/.test(String(f.plateNo || ''))) return 'ژمارەی تابلۆ دروست نییە (وەک 21 A 12345)';
      if (!['carFront', 'carBack', 'carLeft', 'carRight', 'carInside'].every((k) => pic(f[k]))) return 'هەر پێنج وێنەی ئۆتۆمبێل بار بکە';
    }
    if (full || 'regNo' in f) {
      if (!need(f.regNo)) return 'ژمارەی ساڵانەی ئۆتۆمبێل بنووسە';
      if (!need(f.regExpiry) || f.regExpiry <= today) return 'ساڵانەی ئۆتۆمبێل بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!pic(f.regPhoto)) return 'وێنەی ساڵانە بار بکە';
    }
    if (full || 'secPhoto' in f) {
      if (!pic(f.secPhoto) || !need(f.secDate)) return 'وێنە و بەرواری کۆدی ئاسایش بار بکە';
      if (f.secDate > today) return 'بەرواری کۆدی ئاسایش لە داهاتوودایە';
    }
    if (full) {
      if (!need(f.payMethod)) return 'شێوازی وەرگرتنی موچە هەڵبژێرە';
      if (!f.terms) return 'دەبێت ڕازی بیت بە مەرج و ڕێساکان';
    }
    return null;
  };

  /** وێنە: بچووک دەکرێتەوە (درێژترین لا ١٠٠٠ پیکسڵ) و جیا لە زانیارییەکان هەڵدەگیرێت */
  TK.compressImage = function (file, max = 1000, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image'));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };
  /* ---------- وێنەکان ----------
   * هەر وێنەیەک بەڵگەنامەیەکە لە Firestore (img/{id}) و کۆپییەکی لە IndexedDBـی ئەم ئامێرە (بۆ خێرایی).
   * وێنەی ڕووخسار و ئۆتۆمبێلی شۆفێر و وێنەی هەواڵ گشتین؛ بەڵگەنامەکانی شۆفێر تەنها خۆی و بەڕێوەبەر دەیبینن.
   * وێنەیەک کە پێش چوونەژوورەوە هەڵبژێردراوە (تۆمارکردنی شۆفێر) دوای دروستبوونی هەژمار بار دەکرێت. */
  const IMGS = new Map();
  const imgTried = new Map();
  let idbP = null;
  const idb = () =>
    idbP ||
    (idbP = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open('taxikam', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const imgTx = (mode, fn) =>
    idb().then((db) => new Promise((res, rej) => {
      const tx = db.transaction('img', mode);
      const req = fn(tx.objectStore('img'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('abort'));
    }));
  let imgRenderT = 0;
  const imgRerender = () => {
    clearTimeout(imgRenderT);
    imgRenderT = setTimeout(() => {
      if (app.current) render(true);
    }, 30);
  };
  const loadSet = (k) => {
    try {
      return new Set(JSON.parse(localStorage.getItem(k) || '[]'));
    } catch (e) {
      return new Set();
    }
  };
  const saveSet = (k, set) => {
    try {
      localStorage.setItem(k, JSON.stringify([...set].slice(-800)));
    } catch (e) {
      /* هیچ */
    }
  };
  const imgQueue = loadSet('taxikam:imgq:' + ROLE); // چاوەڕێی بارکردن
  const pubDone = loadSet('taxikam:imgpub:' + ROLE);
  const pubWant = new Set();
  let pumping = false;
  /** بارکردنی ئەو وێنانەی هێشتا نەچوونەتە سەر Firebase */
  const ownDone = loadSet('taxikam:imgown');
  async function imgPump() {
    if (pumping || !cloud.on || !cloud.me || !window.TKFB || !imgQueue.size) return;
    pumping = true;
    try {
      for (const id of [...imgQueue]) {
        let d = IMGS.get(id);
        if (!d) {
          try {
            d = await imgTx('readonly', (st) => st.get(id));
          } catch (e) {
            d = null;
          }
        }
        if (!d) {
          imgQueue.delete(id);
          continue;
        }
        try {
          const pub = pubWant.has(id);
          await window.TKFB.write({ op: 'set', path: 'img/' + id, data: { d, o: cloud.me, pub, at: Date.now() } });
          imgQueue.delete(id);
          // ئەگەر لە کاتی بارکردندا بوو بە گشتی (بۆ نموونە وێنەی سەرنشین بۆ شۆفێرەکەی)
          if (!pub && pubWant.has(id)) await window.TKFB.write({ op: 'update', path: 'img/' + id, data: { pub: true } });
          if (pubWant.has(id)) pubDone.add(id);
        } catch (e) {
          console.warn('وێنە بار نەکرا', id, e && e.code);
          break;
        }
      }
      saveSet('taxikam:imgq:' + ROLE, imgQueue);
      saveSet('taxikam:imgpub:' + ROLE, pubDone);
    } finally {
      pumping = false;
    }
  }
  TK.imgPump = imgPump;
  /** وێنەکانی ناو تۆمارە گشتییەکان (ڕووخسار و ئۆتۆمبێلی شۆفێر، هەواڵ) سەرنشینەکان دەیبینن */
  function markPublicImages(want) {
    if (ROLE !== 'driver' && ROLE !== 'admin' && ROLE !== 'passenger') return;
    const ids = [];
    // وێنەی سەرنشین: ناسنامەکەی تەنها لە بەشدارییەکانیدایە (تەنها شۆفێرەکەی دەیبینێت)
    if (ROLE === 'passenger' && cloud.me) {
      const px = want.get('pax/' + cloud.me);
      if (px && px.passenger && px.passenger.photo) ids.push(px.passenger.photo);
    }
    want.forEach((d, path) => {
      if (path.startsWith('dpub/') && (ROLE === 'admin' || path === 'dpub/' + cloud.me)) {
        if (d.photo) ids.push(d.photo);
        (d.showPhotos || []).forEach((x) => ids.push(x));
      }
      if (path.startsWith('news/') && ROLE === 'admin' && d.image) ids.push(d.image);
      // بەڵگەنامەی شۆفێر کە بەڕێوەبەر باری کردووە: خاوەنایەتییەکەی دەدرێتە شۆفێرەکە تا خۆی بتوانێت بیبینێت
      if (path.startsWith('drivers/') && ROLE === 'admin') {
        const did = path.slice(8);
        ['idFront', 'idBack', 'licFront', 'licBack', 'regPhoto', 'secPhoto', 'carFront', 'carBack', 'carLeft', 'carRight', 'carInside'].forEach((k) => {
          const id = d[k];
          if (!id || ownDone.has(id) || imgQueue.has(id)) return;
          ownDone.add(id);
          saveSet('taxikam:imgown', ownDone);
          window.TKFB.write({ op: 'update', path: 'img/' + id, data: { o: did } }).catch(() => ownDone.delete(id));
        });
      }
    });
    ids.forEach((id) => {
      if (!id || pubDone.has(id)) return;
      pubWant.add(id);
      if (imgQueue.has(id)) return; // لە کاتی بارکردندا گشتی دەکرێت
      pubDone.add(id);
      saveSet('taxikam:imgpub:' + ROLE, pubDone);
      window.TKFB.write({ op: 'update', path: 'img/' + id, data: { pub: true } }).catch(() => pubDone.delete(id));
    });
  }
  /** وێنەی زۆر گەورە بچووک دەکرێتەوە (سنووری Firestore بۆ هەر بەڵگەنامەیەک ١ مێگابایتە) */
  function shrink(dataUrl) {
    if (String(dataUrl).length < 700000) return Promise.resolve(dataUrl);
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        let q = 0.7;
        let out = c.toDataURL('image/jpeg', q);
        while (out.length > 700000 && q > 0.3) out = c.toDataURL('image/jpeg', (q -= 0.1));
        res(out);
      };
      img.onerror = () => res(dataUrl);
      img.src = dataUrl;
    });
  }
  /** پاشەکەوتی وێنە: ناسنامەکەی دەگەڕێنێتەوە */
  TK.saveImage = async function (dataUrl) {
    const data = await shrink(dataUrl);
    const id = 'i' + Date.now().toString(36) + uid();
    try {
      await imgTx('readwrite', (st) => st.put(data, id));
    } catch (e) {
      /* تەنها لە بیرگە */
    }
    IMGS.set(id, data);
    imgQueue.add(id);
    saveSet('taxikam:imgq:' + ROLE, imgQueue);
    imgPump();
    return id;
  };
  TK.img = (id) => {
    if (!id) return '';
    const v = IMGS.get(id);
    if (v) return v;
    const last = imgTried.get(id) || 0;
    if (Date.now() - last > 20000) {
      imgTried.set(id, Date.now());
      imgTx('readonly', (st) => st.get(id))
        .catch(() => null)
        .then(async (v0) => {
          let val = v0;
          if (!val && cloud.on && cloud.me && window.TKFB) {
            try {
              const d = await window.TKFB.get('img/' + id);
              val = d && d.d;
              if (val) imgTx('readwrite', (st) => st.put(val, id)).catch(() => {});
            } catch (e) {
              /* دەستمان پێی ناگات یان هێشتا بار نەکراوە */
            }
          }
          if (val) {
            IMGS.set(id, val);
            imgRerender();
          }
        });
    }
    return '';
  };
  TK.removeImage = (id) => {
    if (!id) return;
    IMGS.delete(id);
    imgTx('readwrite', (st) => st.delete(id)).catch(() => {});
    if (imgQueue.delete(id)) saveSet('taxikam:imgq:' + ROLE, imgQueue);
    else if (cloud.on && cloud.me && window.TKFB) window.TKFB.write({ op: 'delete', path: 'img/' + id }).catch(() => {});
  };
  TK.replaceImages = async function (map) {
    IMGS.clear();
    imgTried.clear();
    await imgTx('readwrite', (st) => {
      st.clear();
      Object.keys(map || {}).forEach((id) => st.put(map[id], id));
    });
    Object.keys(map || {}).forEach((id) => IMGS.set(id, map[id]));
  };
  TK.clearImages = () => TK.replaceImages({}).catch(() => {});

  /* =========================================================
   * ٩. ڕووکار (لایت/دارک) و ڕێکخستنەکان
   * ======================================================= */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const st = state.settings;
    const dark = st.theme === 'dark' || (st.theme === 'auto' && mq && mq.matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.scale = st[TK.scaleKey || 'textScale'] || 'md';
    root.dataset.map = st.mapStyle;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', introColor || (dark ? '#16181D' : '#FFFFFF'));
  }
  // ڕەنگی بەشی سەرەوەی شاشە (کاتژمێر و باتری) لە کاتی جووڵەی کرانەوەدا
  let introColor = null;
  function setIntroColor(c) {
    introColor = c;
    applyTheme();
  }

  /* ---------- جووڵەی کرانەوە ----------
   * شاشەی سپی ← دوو ڕێگا لە دوو لاوە دێن و یەک دەگرن ← خاڵە پرتەقاڵییەکە بە ڕێگاکەدا دادەبەزێت
   * ← «یەکسا» لە تەمەوە ڕوون دەبێتەوە ← بازنەیەکی ڕەش لە خاڵەکەوە هەموو شاشەکە دادەگرێت.
   * لێدان لەسەر شاشە ڕاستەوخۆ دەیبڕێت. ئەگەر جووڵە لە مۆبایلەکەدا کوژابێتەوە، تەنها کۆتاییەکەی دەبینرێت. */
  function playIntro() {
    if (!document.body || !document.body.animate) return;
    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `<div class="in-layer in-light">
        <span class="ylogo big in-logo" role="img" aria-label="یەکسا">
          <svg class="yl-mk" viewBox="0 0 100 100" aria-hidden="true">
            <path class="yl-s in-l" d="M24 14 L50 50"/><path class="yl-s in-r" d="M76 14 L50 50"/><path class="yl-s in-st" d="M50 50 L50 76"/>
            <path class="yl-d in-d" d="M50 57 L50 71"/><circle class="in-ring" cx="50" cy="85" r="10"/><circle class="in-ring" cx="50" cy="85" r="10"/>
            <circle class="yl-p in-p" cx="50" cy="85" r="10"/>
          </svg>
          <span class="yl-vr"></span>
          <span class="yl-tx"><span class="yl-ku" aria-hidden="true">یەکسا</span><span class="yl-la latin" aria-hidden="true"><b>Y</b><b>E</b><b>K</b><i>S</i><i>A</i></span></span>
        </span>
      </div>
      <div class="in-layer in-dark" aria-hidden="true">
        <span class="ylogo big in-logo" role="img" aria-label="یەکسا">
          <svg class="yl-mk" viewBox="0 0 100 100" aria-hidden="true">
            <path class="yl-s in-l" d="M24 14 L50 50"/><path class="yl-s in-r" d="M76 14 L50 50"/><path class="yl-s in-st" d="M50 50 L50 76"/>
            <path class="yl-d in-d" d="M50 57 L50 71"/>
            <circle class="yl-p in-p" cx="50" cy="85" r="10"/>
          </svg>
          <span class="yl-vr"></span>
          <span class="yl-tx"><span class="yl-ku" aria-hidden="true">یەکسا</span><span class="yl-la latin" aria-hidden="true"><b>Y</b><b>E</b><b>K</b><i>S</i><i>A</i></span></span>
        </span>
        <div class="in-tag">هاتووچۆی مانگانە بۆ هەموو خێزان</div>
      </div>`;
    document.body.appendChild(el);
    setIntroColor('#FFFFFF');
    const light = el.querySelector('.in-light');
    const q = (c) => light.querySelector(c);
    const qa = (c) => [...light.querySelectorAll(c)];
    const anims = [];
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    // شوێنی خاڵە پرتەقاڵییەکە پێش جووڵە (ناوەندی بازنە ڕەشەکە)
    const mk = q('.yl-mk').getBoundingClientRect();
    const cx = mk.left + mk.width * 0.5;
    const cy = mk.top + mk.height * 0.85;
    const A = (node, kf, o) => anims.push(node.animate(kf, Object.assign({ fill: 'both', easing: ease }, o)));
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let wipeAt = 2950;
    let doneAt = 3900;
    if (!reduce) {
      A(q('.in-l'), [{ transform: 'translateX(-70px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700 });
      A(q('.in-r'), [{ transform: 'translateX(70px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700 });
      A(q('.yl-mk'), [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 260, delay: 640, easing: 'ease-out' });
      const st = q('.in-st');
      const L = st.getTotalLength ? st.getTotalLength() : 26;
      st.style.strokeDasharray = L;
      A(st, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 450, delay: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      A(q('.in-p'), [{ transform: 'translateY(-35px)', opacity: 0 }, { transform: 'translateY(-35px)', opacity: 1, offset: 0.15 }, { transform: 'none', opacity: 1 }], { duration: 470, delay: 800, easing: 'cubic-bezier(.5,0,.3,1)' });
      qa('.in-ring').forEach((r, i) => A(r, [{ transform: 'scale(1)', opacity: 0.6 }, { transform: 'scale(3.2)', opacity: 0 }], { duration: 700, delay: 1250 + i * 170, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }));
      A(q('.in-d'), [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 1280 });
      A(q('.yl-vr'), [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 420, delay: 1350 });
      A(q('.yl-ku'), [{ opacity: 0, filter: 'blur(14px)', transform: 'scale(1.15)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }], { duration: 750, delay: 1500 });
      qa('.yl-la > *').forEach((c, i) => A(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 2150 + i * 60 }));
      A(q('.yl-la'), [{ letterSpacing: '.9em' }, { letterSpacing: '.32em' }], { duration: 600, delay: 2150 });
    } else {
      wipeAt = 0;
      doneAt = 700;
    }
    // بازنەی ڕەش لە ناوەندی خاڵە پرتەقاڵییەکەوە: لایەری ڕەش (لۆگۆی سپی) وردە وردە دەردەکەوێت
    const dark = el.querySelector('.in-dark');
    const r = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 10;
    anims.push(dark.animate([{ clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${r}px at ${cx}px ${cy}px)` }], { duration: reduce ? 1 : 900, delay: wipeAt, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'both' }));
    const timers = [];
    timers.push(setTimeout(() => setIntroColor('#1C1C1E'), wipeAt + (reduce ? 0 : 450)));
    anims.push(dark.querySelector('.in-tag').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: reduce ? 0 : 3600, easing: ease, fill: 'both' }));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.finish());
      // ئەگەر ئەپەکە هێشتا بار نەبووبێت، شاشەی بارکردنی ڕەش لە ژێرەوە دەمێنێتەوە
      const out = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease', fill: 'forwards' });
      out.onfinish = () => {
        el.remove();
        setIntroColor(cloud.ready ? null : '#1C1C1E');
      };
    };
    timers.push(setTimeout(finish, doneAt + 500));
    el.addEventListener('click', finish);
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
  TK.applyTheme = applyTheme;

  /** گۆڕینی ژمارەکانی ناو نووسین بۆ کوردی (بێ دەستکاریکردنی SVG و کۆد) */
  function localizeDigits(root) {
    if (!root || state.settings.digits === 'en') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || !/[0-9]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (p.closest('svg,script,style,textarea,.latin,[data-raw]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => (n.nodeValue = fmt.n(n.nodeValue)));
  }
  TK.localizeDigits = localizeDigits;

  /* =========================================================
   * ١٠. ڕاوتەر و پیشاندان
   * ======================================================= */
  const app = {
    routes: [],
    acts: {},
    ui: {},
    current: null,
    root: null,
    sheetFn: null,
    stack: [], // مێژووی شاشەکان بۆ دوگمەی گەڕانەوە
    replacing: false,
    pushOnReplace: false,
  };
  TK.app = app;

  TK.route = (pattern, def) => app.routes.push({ pattern, parts: pattern.split('/'), ...def });

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, q] = h.split('?');
    const query = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => {
      const [k, v] = kv.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { path: path || '', query };
  }
  function match(path) {
    const segs = path.split('/');
    for (const r of app.routes) {
      if (r.parts.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < segs.length; i++) {
        if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(segs[i]);
        else if (r.parts[i] !== segs[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route: r, params };
    }
    return null;
  }

  TK.go = function (path, replace) {
    const target = '#/' + path.replace(/^#?\/?/, '');
    if (replace || location.hash === target) {
      app.replacing = true;
      history.replaceState(null, '', target);
      onRoute();
    } else {
      location.hash = target;
    }
  };
  /** گەڕانەوە بۆ شاشەی پێشوو (ئەو شاشانەی ناگونجێن تێدەپەڕێنرێن) */
  TK.back = function (fallback) {
    app.stack.pop();
    const ok = (p) => p && p !== 'splash' && (!app.validBack || app.validBack(p));
    while (app.stack.length && !ok(app.stack[app.stack.length - 1])) app.stack.pop();
    const target = app.stack.length ? app.stack.pop() : fallback || app.home;
    app.pushOnReplace = true;
    TK.go(target, true);
  };

  function captureInputs() {
    const out = {};
    document.querySelectorAll('input[id],textarea[id],select[id]').forEach((el) => {
      out[el.id] = { v: el.value, c: el.checked, focus: document.activeElement === el, s: el.selectionStart, e: el.selectionEnd };
    });
    return out;
  }
  function restoreInputs(saved) {
    Object.keys(saved).forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.hasAttribute('data-fresh')) return;
      const x = saved[id];
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = x.c;
      else el.value = x.v;
      if (x.focus) {
        el.focus();
        try {
          if (x.s != null) el.setSelectionRange(x.s, x.e);
        } catch (e) {
          /* هیچ */
        }
      }
    });
  }

  /** خوێندنەوەی بەروار لە ui.dateParts: «YYYY-MM-DD» یان '' */
  TK.readDate = function (id) {
    const g = (k) => (document.getElementById(`${id}-${k}`) || {}).value || '';
    const y = g('y');
    const m = g('m');
    const d = g('d');
    if (!y || !m || !d) return '';
    const dt = new Date(+y, +m - 1, +d);
    if (dt.getMonth() !== +m - 1) return 'bad';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  /** ناوی ستوونەکان دەدرێتە هەر خانەیەک، بۆ ئەوەی لە مۆبایلدا خشتە وەک کارت پیشان بدرێت */
  function labelTables(root) {
    root.querySelectorAll('table.tbl').forEach((tb) => {
      const heads = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      tb.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => heads[i] && td.setAttribute('data-label', heads[i])));
    });
  }

  /** پیشاندانی شاشەی ئێستا. ئەگەر هەمان شاشە بێت، نووسینی ناو خانەکان دەپارێزرێت */
  function render(sameScreen) {
    if (!app.current) return;
    applyTheme();
    const saved = sameScreen ? captureInputs() : {};
    const scroll = window.scrollY;
    const { route, params, query } = app.current;
    // ئەگەر دۆخ گۆڕا (بۆ نموونە چوونەدەرەوە)، ڕاوتەکە دووبارە پشکنین دەکرێت
    if (route.guard) {
      const to = route.guard(params, query);
      if (to) {
        setTimeout(() => TK.go(to, true));
        return;
      }
    }
    let html;
    try {
      html = route.render(params, query);
    } catch (err) {
      console.error(err);
      html = `<div class="screen no-nav"><div class="card danger"><b>هەڵەیەک ڕوویدا</b><div class="sm latin">${esc(err.message)}</div></div><button class="btn" data-go="${app.home}">گەڕانەوە بۆ سەرەکی</button></div>`;
    }
    if (html == null) return; // ڕاوتەکە ئاراستەی گۆڕی
    // جووڵەی هاتنە ژوورەوە تەنها کاتی گۆڕینی شاشە، نەک لە هەر نوێکردنەوەیەک
    if (sameScreen) app.root.removeAttribute('data-enter');
    else app.root.setAttribute('data-enter', '');
    app.root.innerHTML = html;
    labelTables(app.root);
    localizeDigits(app.root);
    renderSheet();
    if (sameScreen) {
      restoreInputs(saved);
      window.scrollTo(0, scroll);
    }
    if (route.after) route.after(params, query);
    live();
    navFx();
    runHooks('paint');
  }
  TK.render = () => render(true);
  /** ئەو بەشانەی دوای هەر پیشاندانێک کار دەکەن (نەخشەی ڕاستەقینە: maps.js) */
  const hooks = { paint: [], live: [] };
  TK.hooks = hooks;
  function runHooks(k) {
    hooks[k].forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('hook', k, e);
      }
    });
  }

  // خڕەی nav: خلیسکان و ڕاکێشان بە پەنجە (وەک وەتساپ)
  let navX = null;
  function navFx() {
    if (!app.root) return;
    const nav = app.root.querySelector('.bottom-nav');
    const on = nav && nav.querySelector('a.on');
    if (!on) return;
    nav.querySelectorAll('.nav-pill').forEach((p) => p.remove());
    const links = [...nav.querySelectorAll('a')];
    const pill = document.createElement('i');
    pill.className = 'nav-pill';
    nav.prepend(pill);
    nav.classList.add('fx');
    let w = on.offsetWidth;
    const put = (x, anim) => {
      w = on.offsetWidth;
      pill.style.transition = anim ? '' : 'none';
      pill.style.width = w + 'px';
      pill.style.top = on.offsetTop + 'px';
      pill.style.height = on.offsetHeight + 'px';
      pill.style.borderRadius = on.offsetHeight / 2 + 'px';
      pill.style.transform = `translateX(${x}px)`;
    };
    navTrack = () => { put(on.offsetLeft, false); navX = on.offsetLeft; };
    put(navX == null ? on.offsetLeft : navX, false);
    pill.getBoundingClientRect();
    put(on.offsetLeft, true);
    navX = on.offsetLeft;

    let startX = 0, drag = false;
    const move = (e) => {
      if (!drag && Math.abs(e.clientX - startX) < 8) return;
      drag = true;
      const r = nav.getBoundingClientRect();
      const x = Math.max(6, Math.min(e.clientX - r.left - w / 2, r.width - w - 6));
      put(x, false);
      navX = x;
    };
    const up = (e) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!drag) return;
      if (e.type === 'pointercancel') { put(on.offsetLeft, true); navX = on.offsetLeft; drag = false; return; }
      const r = nav.getBoundingClientRect();
      const mid = (a) => r.left + a.offsetLeft + a.offsetWidth / 2;
      const near = links.reduce((a, b) => (Math.abs(mid(b) - e.clientX) < Math.abs(mid(a) - e.clientX) ? b : a));
      if (near === on) { put(on.offsetLeft, true); navX = on.offsetLeft; }
      else location.hash = near.getAttribute('href');
    };
    nav.addEventListener('pointerdown', (e) => {
      startX = e.clientX; drag = false;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    nav.addEventListener('click', (e) => { if (drag) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  window.addEventListener('resize', () => { navX = null; navFx(); });

  // کاتێک بەکارهێنەر دێتە خوارەوە nav بچووک دەبێتەوە، بە گەڕانەوە بۆ سەرەوە گەورە دەبێتەوە (وەک ئینستاگرام)
  let navTrack = null, navY = 0, navAcc = 0, navRaf = 0;
  function navMini(v) {
    const h = document.documentElement;
    if (h.classList.contains('nav-mini') === v) return;
    h.classList.toggle('nav-mini', v);
    // خڕەکە لەگەڵ قەبارەی دوگمەکان دەڕوات تا جوڵەکە تەواو دەبێت
    cancelAnimationFrame(navRaf);
    const end = performance.now() + 480;
    const step = () => { if (navTrack) navTrack(); if (performance.now() < end) navRaf = requestAnimationFrame(step); };
    navRaf = requestAnimationFrame(step);
  }
  window.addEventListener('scroll', () => {
    const y = window.scrollY, dy = y - navY;
    navY = y;
    if (y < 24) { navAcc = 0; navMini(false); return; }
    if (innerHeight + y > document.documentElement.scrollHeight - 4) return; // لەرینەوەی کۆتایی پەڕە لە iPhone
    navAcc = Math.sign(dy) === Math.sign(navAcc) ? navAcc + dy : dy;
    if (navAcc > 16) navMini(true);
    else if (navAcc < -16) navMini(false);
  }, { passive: true });


  function onRoute() {
    const { path, query } = parseHash();
    const st = app.stack;
    if (app.replacing) {
      if (app.pushOnReplace || !st.length) st.push(path);
      else st[st.length - 1] = path;
    } else if (st.length >= 2 && st[st.length - 2] === path) st.pop(); // دوگمەی گەڕانەوەی وێبگەڕ
    else if (st[st.length - 1] !== path) st.push(path);
    if (st.length > 40) st.splice(0, st.length - 40);
    app.replacing = false;
    app.pushOnReplace = false;
    const m = match(path) || match(app.home);
    if (!m) return;
    if (m.route.guard) {
      const redirect = m.route.guard(m.params, query);
      if (redirect && redirect !== path) {
        app.stack.pop();
        app.pushOnReplace = true;
        TK.go(redirect, true);
        return;
      }
    }
    closeSheet(true);
    const same = app.current && app.current.path === path;
    if (!same) {
      const b = document.getElementById('inbanner');
      if (b) b.classList.remove('show');
    }
    app.current = { route: m.route, params: m.params, query, path };
    // پێش پیشاندان دەچێتە سەرەوە، تا after() بتوانێت شوێنی خۆی دیاری بکات (بۆ نموونە نامەکان: دوا نامە)
    if (!same) window.scrollTo(0, 0);
    render(same);
  }

  /* ---------- شیت ---------- */
  function renderSheet() {
    let back = document.getElementById('sheet');
    if (!app.sheetFn) {
      if (back) back.remove();
      return;
    }
    const saved = back ? captureInputs() : {};
    const html = app.sheetFn();
    if (html == null) {
      closeSheet();
      return;
    }
    if (!back) {
      back = document.createElement('div');
      back.id = 'sheet';
      back.className = 'sheet-back';
      back.addEventListener('click', (e) => {
        if (e.target === back) closeSheet();
      });
      document.body.appendChild(back);
      document.body.style.overflow = 'hidden';
    }
    back.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
    localizeDigits(back);
    restoreInputs(saved);
    runHooks('paint');
  }
  function closeSheet(silent) {
    app.sheetFn = null;
    const back = document.getElementById('sheet');
    if (back) back.remove();
    document.body.style.overflow = '';
    if (!silent) live();
  }
  TK.sheet = function (fn) {
    app.sheetFn = fn;
    renderSheet();
  };
  TK.sheet.refresh = renderSheet;

  /** پرسیاری «دڵنیایت؟» لەناو ئەپ (لە جیاتی پەنجەرەی ئامادەی وێبگەڕ). Promise<boolean> دەگەڕێنێتەوە */
  TK.ask = function (message, opts = {}) {
    const prev = app.sheetFn;
    return new Promise((resolve) => {
      const done = (v) => {
        delete app.acts.__askYes;
        delete app.acts.__askNo;
        if (prev) TK.sheet(prev);
        else closeSheet();
        resolve(v);
      };
      app.acts.__askYes = () => done(true);
      app.acts.__askNo = () => done(false);
      TK.sheet(() => `
        <div class="row top" style="gap:12px">
          <div class="ico-box ${opts.danger === false ? '' : 'danger'}">${TK.icon(opts.icon || 'alert', 22, opts.danger === false ? 'var(--brand)' : 'var(--danger-text)')}</div>
          <div class="grow col tight"><div class="h3">${esc(opts.title || 'دڵنیایت؟')}</div><div class="sm muted" style="line-height:1.8">${esc(message)}</div></div>
        </div>
        <div class="grid2">
          <button class="btn secondary" data-act="__askNo">${esc(opts.no || 'نەخێر')}</button>
          <button class="btn ${opts.danger === false ? '' : 'danger-solid'}" data-act="__askYes">${esc(opts.yes || 'بەڵێ')}</button>
        </div>`);
    });
  };
  TK.closeSheet = () => closeSheet();

  /** دوگمەیەک لە کاتی چاوەڕوانی سێرڤەر (بۆ ئەوەی دوو جار دانەگیرێت). فەنکشنێک دەگەڕێنێتەوە بۆ کۆتاییهێنان */
  TK.busyBtn = function (el) {
    let btn = null;
    if (el && el.tagName === 'FORM') btn = el.querySelector('button[type="submit"]') || el.querySelector('button:not([type="button"])');
    else if (el && el.closest) btn = el.closest('button') || null;
    app.ui.busy = true;
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }
    return () => {
      app.ui.busy = false;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    };
  };

  /* ---------- تۆست ---------- */
  let toastTimer = null;


  /* =========================================================
   * لۆگۆی یەکسا: نیشانەی Y (بێ باکگراوند)، هێڵێکی باریک، «یەکسا» بە دوو ڕەنگ و YEKSA
   * cls: 'big' بۆ قەبارەی گەورە، 'inv' بۆ سەر باکگراوندی تاریک
   * ======================================================= */
  const Y_MARK = '<svg class="yl-mk" viewBox="0 0 100 100" aria-hidden="true"><path class="yl-s" d="M24 14 L50 50 L76 14"/><path class="yl-s" d="M50 50 L50 76"/><path class="yl-d" d="M50 57 L50 71"/><circle class="yl-p" cx="50" cy="85" r="10"/></svg>';
  function yLogo(cls) {
    return `<span class="ylogo${cls ? ' ' + cls : ''}" role="img" aria-label="یەکسا">${Y_MARK}<span class="yl-vr"></span><span class="yl-tx"><span class="yl-ku" aria-hidden="true">یەکسا</span><span class="yl-la latin" aria-hidden="true"><b>YEK</b>SA</span></span></span>`;
  }
  TK.logo = yLogo;
  /** ڕوونکردنەوەکان: هەر ئەپێک ناوەڕۆکی خۆی زیاد دەکات. { key: { title, body: html یان function } } */
  TK.HELP = {};
  /** دوگمەی (؟) بۆ سەرەوەی پەڕە */
  TK.helpBtn = (key) => `<button class="icon-btn help-btn" data-act="help" data-arg="${key}" aria-label="ڕوونکردنەوە">${TK.icon('help', 22)}</button>`;
  /* =========================================================
   * وێنەی پەڕە بەتاڵەکان (خۆڵەمێشی، هەمان شێوە لە ڕووناک و تاریک)
   * ======================================================= */
  const EMPTY_BG = '<rect class="ea-p" x="30" y="20" width="170" height="44" rx="22"/><rect class="ea-p" x="10" y="74" width="200" height="44" rx="22"/><rect class="ea-p" x="40" y="128" width="150" height="40" rx="20"/>';
  const EMPTY_ART = {
    megaphone: '<path class="ea-2" d="M62 78h22l46-28v84l-46-28H62a10 10 0 0 1-10-10V88a10 10 0 0 1 10-10z"/><rect class="ea-1" x="80" y="78" width="10" height="28"/><path class="ea-1" d="M68 106h16l6 28h-14z"/><path class="ea-l" d="M144 74q10 18 0 36M156 64q18 28 0 56"/><circle class="ea-1" cx="170" cy="40" r="12"/><path class="ea-l" d="M165 40h10"/>',
    chat: '<path class="ea-1" d="M50 40h90a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14H82l-20 16v-16H50a14 14 0 0 1-14-14V54a14 14 0 0 1 14-14z"/><path class="ea-l" d="M56 62h70M56 78h50"/><path class="ea-2" d="M118 86h70a12 12 0 0 1 12 12v32a12 12 0 0 1-12 12h-8v14l-16-14h-46a12 12 0 0 1-12-12V98a12 12 0 0 1 12-12z"/><circle class="ea-d" cx="132" cy="114" r="4"/><circle class="ea-d" cx="150" cy="114" r="4"/><circle class="ea-d" cx="168" cy="114" r="4"/>',
    bell: '<path class="ea-1" d="M110 34a36 36 0 0 1 36 36v26l12 18H62l12-18V70a36 36 0 0 1 36-36z"/><path class="ea-2" d="M96 120a14 14 0 0 0 28 0z"/><rect class="ea-2" x="104" y="24" width="12" height="12" rx="6"/><path class="ea-l" d="M86 70a24 24 0 0 1 14-22M158 46l10-8M162 62h12M52 46l-10-8M48 62H36"/>',
    calendar: '<path class="ea-1" d="M46 54h128v24a12 12 0 0 0 0 24v24H46v-24a12 12 0 0 0 0-24z"/><path class="ea-l" d="M126 58v66" stroke-dasharray="5 6"/><path class="ea-l" d="M62 76h46M62 92h34M62 108h40"/><circle class="ea-2" cx="150" cy="90" r="14"/><path class="ea-l" d="M144 90l4 4 8-8"/>',
    route: '<path class="ea-2" d="M30 150 L86 40 h48 L190 150z"/><path class="ea-g" d="M110 52v14M110 80v16M110 112v20"/><path class="ea-1" d="M70 100h80l8 18v18a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6v-4H80v4a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6v-18z"/><path class="ea-2" d="M78 100l8-16h48l8 16z"/><circle class="ea-d" cx="80" cy="120" r="4"/><circle class="ea-d" cx="140" cy="120" r="4"/><path class="ea-l" d="M164 30v20M154 40h20"/>',
    search: '<rect class="ea-1" x="40" y="44" width="92" height="104" rx="12"/><circle class="ea-2" cx="70" cy="74" r="12"/><path class="ea-l" d="M90 70h28M90 82h18M56 106h60M56 122h44"/><circle class="ea-1" cx="146" cy="84" r="30"/><path class="ea-l" d="M168 106l22 22" stroke-width="8"/><path class="ea-l" d="M136 84h20"/>',
    users: '<circle class="ea-2" cx="140" cy="62" r="18"/><path class="ea-2" d="M108 132a32 32 0 0 1 64 0z"/><circle class="ea-1" cx="88" cy="70" r="22"/><path class="ea-1" d="M48 146a40 40 0 0 1 80 0z"/><path class="ea-l" d="M170 34v16M162 42h16"/>',
    tag: '<path class="ea-1" d="M52 60l52-20 64 64-48 48-64-64z"/><circle class="ea-2" cx="86" cy="70" r="10"/><path class="ea-l" d="M104 98l24 24M96 112l18 18"/><circle class="ea-2" cx="170" cy="46" r="12"/><path class="ea-l" d="M165 46h10M170 41v10"/>',
    news: '<rect class="ea-1" x="46" y="36" width="116" height="116" rx="14"/><rect class="ea-2" x="60" y="50" width="88" height="34" rx="8"/><path class="ea-l" d="M60 100h88M60 116h70M60 132h50"/><rect class="ea-2" x="148" y="26" width="34" height="24" rx="8"/>',
    clock: '<circle class="ea-1" cx="110" cy="92" r="52"/><circle class="ea-2" cx="110" cy="92" r="38"/><path class="ea-l" d="M110 70v24l16 10" stroke-width="4"/><circle class="ea-d" cx="110" cy="92" r="4"/><path class="ea-l" d="M168 52l12-10M52 52l-12-10"/>',
  };
  const EMPTY_ALIAS = { doc: 'news', car: 'search', user: 'search', briefcase: 'search' };
  /** پەیامی گەورەی دڵنیاکردنەوە (بۆ نموونە دوای «بەڕێ کەوتم»): ئایکۆنی ✓ و نووسینێکی گەورە بۆ ماوەیەکی کورت */
  let flashT = 0;
  TK.flash = function (msg) {
    let el = document.getElementById('flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="fl-box"><span class="fl-ic">${TK.icon('check', 34, '#fff', 3)}</span><b>${esc(msg)}</b></div>`;
    localizeDigits(el);
    el.classList.add('show');
    clearTimeout(flashT);
    flashT = setTimeout(() => el.classList.remove('show'), 1700);
  };
  TK.toast = function (msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = fmt.n(msg);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    if (navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (e) {
        /* هیچ */
      }
    }
  };

  /* ---------- نوێکردنەوەی زیندوو (جووڵەی ئۆتۆمبێل) بێ دووبارە پیشاندانی شاشە ---------- */
  function live() {
    document.querySelectorAll('[data-live-car]').forEach((g) => {
      const t = sel.trip(g.getAttribute('data-live-car'));
      if (!t) return;
      const route = JSON.parse(g.getAttribute('data-route'));
      const [x, y] = sim.pointAt(route, sim.progress(t));
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
    document.querySelectorAll('[data-live-min]').forEach((el) => {
      const t = sel.trip(el.getAttribute('data-live-min'));
      if (t) el.textContent = fmt.n(sim.minutesLeft(t));
    });
    document.querySelectorAll('[data-live-eta]').forEach((el) => {
      const t = sel.trip(el.getAttribute('data-live-eta'));
      if (t) el.textContent = fmt.n(el.hasAttribute('data-bare') ? fmt.clockBare(sim.eta(t)) : fmt.clock(sim.eta(t)));
    });
    // دوگمەیەک کە دوای کاتێکی دیاریکراو چالاک دەبێت (بۆ نموونە «نەهات»)
    document.querySelectorAll('[data-wait-until]').forEach((el) => {
      const left = Number(el.getAttribute('data-wait-until')) - Date.now();
      const w = el.querySelector('.wait');
      el.disabled = left > 0;
      const sec = Math.ceil(left / 1000);
      if (w) w.textContent = left > 0 ? fmt.n(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`) : '';
    });
    document.querySelectorAll('[data-live-left]').forEach((el) => {
      el.textContent = fmt.n(fmt.left(Number(el.getAttribute('data-live-left'))));
    });
    // بانەری نامەیەک کە دواتر گەڕێنرایەوە
    const ib = document.getElementById('inbanner');
    const mid = ib && ib.getAttribute('data-msg');
    if (mid) {
      const m = state.messages.find((x) => x.id === mid);
      const body = ib.querySelector('.sm');
      if (m && m.unsent && body) {
        body.textContent = 'ئەم نامەیە گەڕێنرایەوە';
        ib.setAttribute('data-msg', '');
      }
    }
    runHooks('live');
  }
  TK.live = () => live();

  /* ---------- دواخستنی نوێکردنەوە کاتێک پەنجە لەسەر شاشەیە ----------
   * ئەگەر شاشە لە کاتی دەستلێدانێکدا نوێ بکرێتەوە، دەستلێدانەکە ون دەبێت (پێویست دەکات دوو جار دابگریت).
   * بۆیە نوێکردنەوە دوادەخرێت تا پەنجە هەڵدەگیرێت یان خانەی نووسین بەجێدەهێڵرێت. */
  let touching = false;
  let pending = false;
  function busy() {
    const a = document.activeElement;
    return touching || (a && (a.tagName === 'SELECT' || ((a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.type !== 'checkbox')));
  }
  function requestRender() {
    if (busy()) {
      pending = true;
      // لە کاتی نووسیندا تەنها بەشی گۆڕاو (وەک نامەکان) نوێ دەکرێتەوە
      const r = app.current && app.current.route;
      if (!touching && r && r.partial) r.partial(app.current.params);
      return;
    }
    pending = false;
    render(true);
  }
  function flush() {
    if (pending && !busy()) {
      pending = false;
      render(true);
    }
  }
  document.addEventListener('touchstart', () => (touching = true), { passive: true, capture: true });
  const endTouch = () => setTimeout(() => {
    touching = false;
    flush();
  }, 380);
  document.addEventListener('touchend', endTouch, { passive: true, capture: true });
  document.addEventListener('touchcancel', endTouch, { passive: true, capture: true });
  document.addEventListener('focusout', () => setTimeout(flush, 120));

  /* ---------- ئاگادارکردنەوە: بانەری ناو ئەپ و ئاگادارکردنەوەی مۆبایل ---------- */
  let seen = null;
  let bannerTimer = null;
  function showBanner(n) {
    let el = document.getElementById('inbanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'inbanner';
      el.addEventListener('click', () => {
        el.classList.remove('show');
        const link = el.getAttribute('data-link');
        if (link) TK.go(link);
      });
      document.body.appendChild(el);
    }
    const [ic] = ui.noticeIcon(n.kind);
    el.setAttribute('data-link', n.link || '');
    el.setAttribute('data-msg', n.msgId || '');
    el.innerHTML = `<div class="ico-box">${TK.icon(ic, 20, 'var(--brand)')}</div><div class="grow"><b>${esc(n.title)}</b><div class="sm muted ellipsis">${esc(noticeBody(n) || '')}</div></div>`;
    localizeDigits(el);
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 4500);
    if (navigator.vibrate) {
      try {
        navigator.vibrate([20, 40, 20]);
      } catch (e) {
        /* هیچ */
      }
    }
  }
  function systemNotify(n) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body: fmt.n(noticeBody(n) || ''), icon: 'icon-192.png', badge: 'icon-192.png', tag: n.id, data: { link: n.link || '' } };
    const fallback = () => {
      try {
        const x = new Notification(fmt.n(n.title), opts);
        x.onclick = () => {
          window.focus();
          if (n.link) TK.go(n.link);
        };
      } catch (e) {
        /* هیچ */
      }
    };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.showNotification(fmt.n(n.title), opts) : fallback())).catch(fallback);
    } else fallback();
  }
  let seenKey = null;
  function watchNotices() {
    if (!app.watch) return;
    const items = app.watch(state) || [];
    // کاتی گۆڕینی هەژمار، ئاگادارکردنەوە کۆنەکانی هەژماری نوێ وەک نوێ پیشان نادرێن
    const key = app.watchKey ? app.watchKey(state) : '';
    if (key !== seenKey) {
      seenKey = key;
      seen = null;
    }
    if (!seen) {
      seen = new Set(items.map((x) => x.id));
      return;
    }
    const fresh = items.filter((x) => !seen.has(x.id));
    fresh.forEach((x) => seen.add(x.id));
    if (!fresh.length) return;
    if (app.onFresh) {
      try {
        app.onFresh(fresh);
      } catch (e) {
        /* هیچ */
      }
    }
    const n = fresh[0];
    // ئەگەر لە هەمان شاشەدایت (بۆ نموونە ناو چاتەکە) بانەر پیشان نادرێت
    const here = app.current && n.link && app.current.path === n.link;
    if (!here) showBanner(n);
    if (document.hidden) fresh.forEach(systemNotify);
  }
  /** داوای ڕێگەپێدان بۆ ئاگادارکردنەوەی مۆبایل */
  TK.askNotify = function () {
    if (!('Notification' in window)) return Promise.resolve('unsupported');
    if (!window.isSecureContext) return Promise.resolve('insecure');
    return Notification.requestPermission();
  };
  TK.notifyStatus = function () {
    if (!('Notification' in window)) return 'unsupported';
    if (!window.isSecureContext) return 'insecure';
    return Notification.permission;
  };

  /* ---------- کرتە و نووسین ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go],[data-act],[data-back],[data-close]');
    if (!el) return;
    if (el.hasAttribute('data-close')) {
      e.preventDefault();
      closeSheet();
      return;
    }
    if (el.hasAttribute('data-back')) {
      e.preventDefault();
      TK.back(el.getAttribute('data-back'));
      return;
    }
    if (el.hasAttribute('data-go')) {
      e.preventDefault();
      if (el.hasAttribute('data-close-first')) closeSheet(true);
      TK.go(el.getAttribute('data-go'), el.hasAttribute('data-replace'));
      return;
    }
    const name = el.getAttribute('data-act');
    const fn = app.acts[name];
    if (fn) {
      e.preventDefault();
      fn(el.getAttribute('data-arg'), el, e);
    } else console.warn('کردار نەدۆزرایەوە:', name);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const fn = app.acts[el.getAttribute('data-input')];
    if (fn) fn(el.value, el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = app.acts[el.getAttribute('data-change')];
    if (fn) fn(el.value, el, e);
  });
  /* ---------- خانەی نووسینی نامە: لەگەڵ نووسیندا گەورە دەبێت (تا ٥ دێڕ) ---------- */
  function fitChat(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight + 2, 140) + 'px';
  }
  TK.fitChat = fitChat;
  /** خانەی ژمارەی مۆبایل: تەنها ژمارە، 0 یان 964 ی پێشەوە لادەبرێت، زۆرترین ١٠ ژمارە، بە شێوەی 770 049 1654 */
  function fitPhone(el) {
    const v = el.value;
    const caret = el.selectionStart == null ? v.length : el.selectionStart;
    const digitsBefore = v.slice(0, caret).replace(/[٠-٩]/g, '0').replace(/\D/g, '').length;
    let d = v.replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/\D/g, '');
    let cut = 0;
    if (d.length > 10 && d.startsWith('964')) { d = d.slice(3); cut = 3; }
    while (d.startsWith('0')) { d = d.slice(1); cut++; }
    d = d.slice(0, 10);
    const out = d.length > 6 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
    if (out === v) return;
    el.value = out;
    let n = Math.max(0, Math.min(d.length, digitsBefore - cut)), pos = 0;
    while (n > 0 && pos < out.length) { if (out[pos] !== ' ') n--; pos++; }
    try { if (document.activeElement === el) el.setSelectionRange(pos, pos); } catch (e) { /* هیچ */ }
  }
  TK.fitPhone = fitPhone;
  /** کردنەوەی گفتوگۆ: ڕاستەوخۆ دوا نامە پیشان دەدات (دووبارە دوای بارکردنی وێنە و فۆنت، مەگەر بەکارهێنەر خۆی سکرۆڵی کردبێت) */
  function chatEnd() {
    const bottom = () => window.scrollTo(0, document.documentElement.scrollHeight);
    bottom();
    let y = window.scrollY;
    const again = () => {
      if (Math.abs(window.scrollY - y) > 4) return; // بەکارهێنەر جووڵاوە
      bottom();
      y = window.scrollY;
    };
    requestAnimationFrame(again);
    [120, 400, 900].forEach((t) => setTimeout(again, t));
    document.querySelectorAll('#thread img, .header img').forEach((im) => { if (!im.complete) im.addEventListener('load', again, { once: true }); });
  }
  TK.chatEnd = chatEnd;
  document.addEventListener('input', (e) => {
    if (e.target.classList && e.target.classList.contains('chat-in')) fitChat(e.target);
    if (e.target.matches && e.target.matches('input[inputmode="tel"]')) fitPhone(e.target);
  });
  document.addEventListener('focusin', (e) => {
    if (e.target.matches && e.target.matches('input[inputmode="tel"]') && e.target.value) fitPhone(e.target);
  });
  // لە کۆمپیوتەر Enter دەینێرێت (Shift+Enter = دێڕی نوێ). لە مۆبایل Enter دێڕی نوێیە و دوگمەکە دەینێرێت
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.classList || !t.classList.contains('chat-in') || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    e.preventDefault();
    if (t.form) t.form.requestSubmit();
  });
  /* ---------- کیبۆرد: خانەی نووسین ڕاستەوخۆ لە سەرووی کیبۆرد (ئایفۆن و ئەندرۆید) ---------- */
  function kbFit() {
    const vv = window.visualViewport;
    if (!vv) return;
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--kb', kb + 'px');
    document.documentElement.classList.toggle('kb-open', kb > 80);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', kbFit);
    window.visualViewport.addEventListener('scroll', kbFit);
  }

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-submit]');
    if (!form) return;
    e.preventDefault();
    const fn = app.acts[form.getAttribute('data-submit')];
    if (fn) fn(Object.fromEntries(new FormData(form).entries()), form, e);
  });

  /** دەستپێکردنی ئەپ */
  TK.start = function (opts) {
    app.root = document.getElementById(opts.rootId || 'app');
    app.home = opts.home;
    applyTheme();
    if (opts.intro) playIntro();
    window.addEventListener('hashchange', onRoute);
    app.watch = opts.watch || null;
    app.watchKey = opts.watchKey || null;
    app.onFresh = opts.onFresh || null;
    app.validBack = opts.validBack || null;
    if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/' + (opts.start || opts.home));
    let booted = false;
    const boot = () => {
      if (booted) return;
      booted = true;
      if (!document.getElementById('intro')) setIntroColor(null);
      watchNotices();
      TK.subscribe(() => {
        requestRender();
        watchNotices();
      });
      setInterval(() => {
        sim.tick();
        live();
      }, 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) requestRender();
      });
      app.replacing = true;
      onRoute();
    };
    // پێش پیشاندانی ئەپ، چاوەڕێ دەکرێت تا Firebase دەزانێت کێ چووەتە ژوورەوە و زانیارییەکانی بار دەبن
    if (cloud.ready) boot();
    else {
      app.root.innerHTML = `<div class="splash">${yLogo('big inv')}<div class="sm" style="opacity:.75" id="bootmsg">بارکردن...</div></div>`;
      const t0 = Date.now();
      const wait = () => {
        if (cloud.ready) return boot();
        if (cloud.error === 'load' || Date.now() - t0 > 15000) {
          const m = document.getElementById('bootmsg');
          app.root.innerHTML = `<div class="splash" style="gap:14px">${yLogo('big inv')}<div class="h2">پەیوەندی بە سێرڤەر نییە</div><div class="sm" style="opacity:.8;max-width:300px;text-align:center;line-height:1.9">دڵنیابە ئینتەرنێتت هەیە، پاشان دووبارە هەوڵ بدەرەوە.</div><button class="btn" onclick="location.reload()">دووبارە هەوڵدانەوە</button></div>`;
          void m;
          // ئەگەر دواتر پەیوەندی دروست بوو، ئەپەکە دەست پێدەکات
          const later = () => (cloud.ready ? boot() : setTimeout(later, 500));
          return later();
        }
        setTimeout(wait, 60);
      };
      wait();
    }
    // Service worker تەنها لەسەر https یان localhost کار دەکات
    if ('serviceWorker' in navigator && window.isSecureContext && opts.sw) {
      navigator.serviceWorker.register(opts.sw).catch(() => {});
    }
  };

  /* =========================================================
   * ١١. پێکهاتە هاوبەشەکان (HTML)
   * ======================================================= */
  /** دەقی ئاگادارکردنەوە: ئەگەر نامەکە گەڕێنرابێتەوە، دەقەکەی پیشان نادرێت */
  const noticeBody = (n) => {
    if (n && n.msgId) {
      const m = state.messages.find((x) => x.id === n.msgId);
      if (m && m.unsent) return 'ئەم نامەیە گەڕێنرایەوە';
    }
    return n ? n.body : '';
  };
  TK.noticeBody = noticeBody;
  const ui = {
    icon: TK.icon,
    avatar(initial, tone = '', size = 44) {
      return `<span class="avatar ${tone}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${esc(initial)}</span>`;
    },
    /** تەنها هێڵکاری کەسەکە (بۆ ناو سندوقی وێنەی شۆفێر لە کارتەکان) */
    personSvg() {
      return '<svg class="person-svg" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="39" r="15"/><path d="M22 84c3-15 14-23 28-23s25 8 28 23"/></svg>';
    },
    /** وێنەی کەسێک: وێنەکەی خۆی، یان وێنەی بنەڕەت (کەسی هێڵکاری لەسەر زیوی) */
    personAv(imgId, size = 44) {
      const src = imgId ? TK.img(imgId) : '';
      if (src) return `<img class="avatar" src="${src}" alt="" style="width:${size}px;height:${size}px;object-fit:cover">`;
      return `<span class="pav" style="width:${size}px;height:${size}px" aria-hidden="true">${ui.personSvg()}</span>`;
    },
    /** وێنەی شۆفێر (ئەگەر هەبێت) یان وێنەی بنەڕەت */
    dAvatar(d, size = 44) {
      return ui.personAv(d && d.photo, size);
    },
    /** کارتی ڕەشی جزدان (هەمان شێوەی سەرنشین و شۆفێر) */
    walletCard(title, tag, amount, pills = []) {
      return `<div class="wcard">
        <div class="wc-top"><div class="col tight"><span class="wc-title"><i></i>${esc(title)}</span><span class="wc-tag">${esc(tag)}</span></div><div class="row" style="gap:10px"><span class="wc-nfc">)))</span><span class="wc-chip"><i></i></span></div></div>
        <div class="wc-amount ${amount < 0 ? 'neg' : ''}">${amount < 0 ? '−' : ''}${fmt.group(Math.abs(amount))} <small>دینار</small></div>
        <div class="wc-line"></div>
        <div class="wc-foot">${pills.map((p) => `<span class="wc-pill">${TK.icon(p[0], 16, p[2] || '#FBBF24')}${p[1]}</span>`).join('')}<span class="wc-coins"><i></i><i></i></span></div>
      </div>`;
    },
    /** دێڕێکی دەفتەر: ئایکۆن، ناونیشان، ڕوونکردنەوە، بڕ */
    txRow(e, opts = {}) {
      const L = TK.txLabel(e);
      const amt = e.amount || 0;
      const tone = opts.pending ? 'pend' : amt > 0 ? 'in' : L.bad ? 'bad' : '';
      const col = tone === 'in' ? 'var(--ok-text)' : tone === 'pend' ? '#B45309' : tone === 'bad' ? 'var(--danger-text)' : 'var(--text)';
      const lead = opts.avatar || `<span class="txi ${tone}">${TK.icon(L.icon, 20, col)}</span>`;
      return `<div class="item tx tap" data-act="${opts.act || 'txOpen'}" data-arg="${esc(e.id)}">${lead}<div class="grow" style="min-width:0"><div class="t">${esc(L.title)}</div><div class="s">${esc(L.sub)}</div></div><div class="a ${amt > 0 ? 'in' : ''}">${amt > 0 ? '+' : amt < 0 ? '−' : ''}${fmt.group(Math.abs(amt))}<small>${opts.pending ? 'چاوەڕێ' : fmt.hhmm(e.at)}</small></div></div>`;
    },
    /** دێڕەکان بە پێی ڕۆژ: ئەمڕۆ، دوێنێ، پاشان مانگ */
    txGroups(list, row, sums) {
      const d0 = new Date();
      d0.setHours(0, 0, 0, 0);
      const t = d0.getTime();
      const groups = [];
      list.forEach((e) => {
        const at = e.at || 0;
        const d = new Date(at);
        const k = at >= t ? 'ئەمڕۆ' : at >= t - 864e5 ? 'دوێنێ' : `${fmt.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        let g = groups.find((x) => x[0] === k);
        if (!g) groups.push((g = [k, []]));
        g[1].push(e);
      });
      return groups.map(([k, l]) => {
        const sum = l.reduce((n, e) => n + (e.amount || 0), 0);
        return `<div class="dayh">${k}${sums ? `<span>${sum > 0 ? '+' : sum < 0 ? '−' : ''}${fmt.group(Math.abs(sum))}</span>` : ''}</div><div class="list">${l.map(row).join('')}</div>`;
      }).join('');
    },
    /** پسوولەی دێڕێکی دەفتەر (یان داواکارییەک) */
    receipt(e, extra = '') {
      const L = TK.txLabel(e);
      const amt = e.amount || 0;
      const row = (k, v) => (v ? `<div class="row between"><span class="muted">${k}</span><b>${v}</b></div>` : '');
      const d = new Date(e.at || Date.now());
      return `<div class="col center" style="align-items:center;gap:8px;padding:4px 0 8px">
          <span class="okc ${amt < 0 ? 'out' : ''}">${TK.icon(amt < 0 ? 'receipt' : 'check', 32, amt < 0 ? 'var(--text)' : 'var(--ok-text)', 2.4)}</span>
          <div class="h1" style="margin:0">${amt > 0 ? '+' : amt < 0 ? '−' : ''}${fmt.group(Math.abs(amt))} <small class="muted" style="font-size:1rem">دینار</small></div>
          ${e._pending ? ui.badge('چاوەڕێی پشکنینە', 'note') : ui.badge('تۆمارکراو', 'ok')}
        </div>
        <div class="card flat col tight sm" style="line-height:2">
          ${row('جۆر', esc(L.title))}
          ${row('وردەکاری', esc(L.sub))}
          ${row('شێواز', e.method ? esc(TK.payName(e.method)) : '')}
          ${row('ژمارەی حەواڵە', e.ref ? `<span class="latin">${esc(e.ref)}</span>` : '')}
          ${row('کات', `${fmt.date(e.at)}، ${fmt.hhmm(e.at)}`)}
          ${row('ناسنامە', `<span class="latin" data-raw>${esc(String(e.id).slice(-10).toUpperCase())}</span>`)}
        </div>
        ${extra}
        <button class="btn ghost block" data-close>داخستن</button>`;
    },
    /** لیستی پرسیارە باوەکان (کردنەوە و داخستن) */
    faq(list) {
      return `<div class="list">${list.map((x) => `<details class="item faq" style="display:block"><summary class="bold">${esc(x.q)}${TK.icon('down', 18, 'currentColor', 2.2)}</summary><div class="sm muted" style="margin-top:6px;white-space:pre-line">${esc(TK.faqText(x.a))}</div></details>`).join('')}</div>`;
    },
    badge(label, tone = '') {
      return `<span class="badge ${tone}">${esc(label)}</span>`;
    },
    header(title, opts = {}) {
      return `<div class="header${opts.cls ? ' ' + opts.cls : ''}">
        ${opts.back !== false ? `<button class="icon-btn" data-back="${esc(opts.back || '')}" aria-label="گەڕانەوە">${TK.icon('back', 22)}</button>` : ''}
        ${opts.avatar ? `<span class="hd-av">${opts.avatar}</span>` : ''}
        <div class="titles"><div class="h2">${esc(title)}</div>${opts.sub ? `<div class="sm muted">${esc(opts.sub)}</div>` : ''}</div>
        ${opts.right || ''}
      </div>`;
    },
    nav(items, active) {
      return `<nav class="bottom-nav">${items
        .map(
          (it) => `<a href="#/${it.path}" class="${it.key === active ? 'on' : ''}" ${it.key === active ? 'aria-current="page"' : ''}>
            <span class="ni">${TK.icon(it.icon, 25, 'currentColor', it.key === active ? 2.3 : 1.9)}${it.badge ? `<span class="nb${it.red ? ' red' : ''}">${it.badge}</span>` : ''}</span><span class="nl">${esc(it.label)}</span>
          </a>`
        )
        .join('')}</nav>`;
    },
    seg(act, options, value) {
      return `<div class="seg">${options
        // latin: ناوەکە نابێت بە ژمارەی کوردی (بۆ نموونە هەڵبژاردنی «123»)
        .map((o) => `<button type="button" class="${o.v === value ? 'on' : ''}" data-act="${act}" data-arg="${esc(o.v)}" aria-pressed="${o.v === value}">${o.latin ? `<span class="latin" data-raw>${esc(o.l)}</span>` : esc(o.l)}</button>`)
        .join('')}</div>`;
    },
    toggle(act, on, arg = '') {
      return `<button type="button" class="toggle ${on ? 'on' : ''}" data-act="${act}" data-arg="${esc(arg)}" role="switch" aria-checked="${on}"></button>`;
    },
    /** وێنەی کاڵی هاوشێوەی پەڕە بەتاڵەکان (بۆ ناساندنی سەرەتا) */
    art(key, cls = '') {
      const art = EMPTY_ART[EMPTY_ALIAS[key] || key];
      return art ? `<svg class="empty-art ${cls}" viewBox="0 0 220 180" aria-hidden="true">${EMPTY_BG}${art}</svg>` : '';
    },
    empty(icon, title, text, btn) {
      const art = EMPTY_ART[EMPTY_ALIAS[icon] || icon];
      return `<div class="empty">${art ? `<svg class="empty-art" viewBox="0 0 220 180" aria-hidden="true">${EMPTY_BG}${art}</svg>` : `<div class="ico-box">${TK.icon(icon, 30, 'var(--muted)')}</div>`}<div class="h3">${esc(title)}</div><div class="sm muted">${esc(text)}</div>${btn || ''}</div>`;
    },
    /** تابلۆی ئۆتۆمبێل لە یەک پارچەدا (یەک شێوە لە هەموو ئەپەکان)
     * type: «taxi» لای IRQ KR سوورە، «private» سپییە (بە هێڵی کاڵ تا لە باکگراوندی سپی جیا بێتەوە). size: 'sm' بۆ کارتەکان */
    plate(p, type = 'taxi', size = '') {
      const raw = String(p || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
      const priv = type === 'private';
      return `<span class="mplate ${priv ? 'priv' : 'taxi'}${size ? ' ' + size : ''}" data-raw title="${priv ? 'تابلۆی تایبەت (سپی)' : 'تابلۆی تەکسی (سوور)'}" aria-label="تابلۆ ${esc(raw)}"><span class="mp-s">IRQ<br>KR</span><span class="mp-n latin">${esc(raw)}</span></span>`;
    },
    /** هەڵبژاردنی کات بە کوردی (لە جیاتی خانەی کاتی سیستەم کە «07:30 AM» پیشان دەدات) */
    timeSelect(id, value, attrs = '') {
      const opts = [];
      for (let m = 5 * 60; m <= 22 * 60; m += 5) opts.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
      if (value && !opts.includes(value)) opts.push(value), opts.sort();
      return `<select class="input" id="${id}" ${attrs}>${opts.map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${fmt.clock(v)}</option>`).join('')}</select>`;
    },
    /** هەڵبژاردنی ڕۆژ بە کوردی، بۆ نموونە «سێشەممە ٢٧ی تشرینی یەکەم» */
    dateSelect(id, value, days = 45, attrs = '') {
      const iso = (n) => {
        const d = new Date();
        d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const opts = [];
      for (let n = 0; n <= days; n++) opts.push(iso(n));
      return `<select class="input" id="${id}" ${attrs}>${opts.map((v, n) => `<option value="${v}" ${v === value ? 'selected' : ''}>${n === 0 ? 'ئەمڕۆ، ' : n === 1 ? 'سبەینێ، ' : ''}${fmt.day(v)}</option>`).join('')}</select>`;
    },
    /** بەروار بە سێ هەڵبژاردن (ڕۆژ، مانگ، ساڵ) بە کوردی. بە TK.readDate(id) دەخوێندرێتەوە */
    dateParts(id, value, fromYear, toYear) {
      const [y, m, d] = String(value || '').split('-').map(Number);
      const years = [];
      for (let k = toYear; k >= fromYear; k--) years.push(k);
      const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
      return `<div class="date3" id="${id}">
        <select class="input" id="${id}-d" aria-label="ڕۆژ">${opt('', 'ڕۆژ', !d)}${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, d === i + 1)).join('')}</select>
        <select class="input" id="${id}-m" aria-label="مانگ">${opt('', 'مانگ', !m)}${Array.from({ length: 12 }, (_, i) => opt(i + 1, i + 1, m === i + 1)).join('')}</select>
        <select class="input" id="${id}-y" aria-label="ساڵ">${opt('', 'ساڵ', !y)}${years.map((k) => opt(k, k, y === k)).join('')}</select>
      </div>`;
    },
    /** خانەی وێنە: لە مۆبایل کامێرا یان گەلەری دەکاتەوە */
    photoField(key, label, imgId, act = 'pickPhoto') {
      const src = imgId ? TK.img(imgId) : '';
      return `<label class="photo-tile ${src ? 'has' : ''}">
        ${src ? `<img src="${src}" alt="">` : `<span class="ph-ic">${TK.icon('camera', 26, 'var(--brand)')}</span>`}
        <span class="ph-l">${esc(label)}</span>
        <span class="ph-a">${src ? 'گۆڕین' : 'گرتن یان هەڵبژاردن'}</span>
        <input type="file" accept="image/*" data-change="${act}" data-arg="${key}" style="display:none">
      </label>`;
    },
    stars(r) {
      return `<span class="row" style="gap:2px">${TK.icon('star', 14, 'var(--amber)', 1.5, 'var(--amber)')}<b class="sm">${r}</b></span>`;
    },
    /** نەخشەی سیمولەیشن بە ڕەنگی براند */
    map(trip, opts = {}) {
      const R = sim.ROUTE;
      const pts = R.map((p) => p.join(',')).join(' ');
      const [cx, cy] = trip ? sim.pointAt(R, sim.progress(trip)) : R[0];
      const h = opts.tall ? 370 : 300;
      const vb = opts.tall ? '0 -20 390 370' : '0 10 390 320';
      const done = trip ? trip.stops.filter((x) => x.done).length : 0;
      const stopPts = trip ? trip.stops.map((_, i) => sim.pointAt(R, i / Math.max(1, trip.stops.length - 1))) : [R[0], R[R.length - 1]];
      const blocks = [
        [10, 10, 45, 60], [100, 10, 60, 55], [205, 10, 95, 55], [345, 10, 40, 55],
        [10, 100, 45, 70], [100, 100, 60, 70], [205, 100, 90, 70], [320, 100, 65, 70],
        [10, 210, 45, 70], [100, 210, 60, 70], [205, 210, 95, 70], [320, 210, 65, 70],
        [100, 315, 60, 50], [205, 315, 95, 50],
      ];
      // data-gmap: ئەگەر Google Maps بەردەست بێت، maps.js نەخشەی ڕاستەقینە لە جیاتی ئەم وێنەیە دادەنێت
      const gkey = trip ? `${trip.id}${opts.tall ? ':t' : ''}${opts.mine ? ':m' : ''}` : '';
      return `<div class="map ${opts.tall ? 'tall' : ''}" style="${opts.radius === 0 ? 'border-radius:0' : ''}" ${trip ? `data-gmap="${esc(gkey)}" data-gtrip="${esc(trip.id)}" ${opts.mine ? 'data-gmine' : ''}` : ''}>
        <svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" style="height:${opts.height || 'auto'}" aria-label="نەخشە">
          <rect x="-50" y="-50" width="500" height="460" fill="var(--map-road)"/>
          ${blocks.map(([x, y, w, hh]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="6" fill="var(--map-bg)"/>`).join('')}
          <rect x="215" y="112" width="70" height="46" rx="8" fill="var(--map-park)"/>
          <rect x="15" y="220" width="35" height="50" rx="6" fill="var(--map-park)"/>
          <polyline points="${pts}" fill="none" stroke="var(--amber)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>
          <polyline points="${pts}" fill="none" stroke="var(--amber)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${trip && trip.status === 'active' ? '0' : '8 7'}"/>
          ${stopPts
            .map(([x, y], i) => {
              const st = trip ? trip.stops[i] : null;
              const isEnd = i === stopPts.length - 1;
              const isDone = i < done;
              // لە گەشتی هاوبەش: وێستگەکان ژمارەیان هەیە، وێستگەکانی سەرنشین خۆی بازنەی ئاڵتوونی گەورەیان هەیە
              const many = stopPts.length > 2;
              const mine = opts.mine && st && ownStop(trip, st);
              const r = many ? (mine ? 13 : 10) : isEnd ? 10 : 8;
              const fill = isDone ? '#22C55E' : mine || (!many && isEnd) ? 'var(--amber)' : 'var(--card)';
              const stroke = isDone || mine || (!many && isEnd) ? '#fff' : 'var(--navy)';
              return `${mine && !isDone ? `<circle cx="${x}" cy="${y}" r="${r + 7}" fill="var(--amber)" opacity=".25"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>${many ? `<text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="${isDone || mine ? '#0B1733' : 'var(--text)'}">${i + 1}</text>` : ''}`;
            })
            .join('')}
          ${trip && trip.status === 'active'
            ? `<g class="car" data-live-car="${trip.id}" data-route='${JSON.stringify(R)}' transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">
                <circle r="20" fill="var(--amber)" opacity=".22"/>
                <circle r="15" fill="#13254A" stroke="#fff" stroke-width="2.5"/>
                <g transform="translate(-9 -9) scale(.75)" fill="none" stroke="#F5A623" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS.car}</g>
              </g>`
            : ''}
        </svg>
        ${opts.tag ? `<div class="map-tag">${opts.tag}</div>` : ''}
      </div>`;
    },
    /** کارتی هەواڵ (بانەری جووڵاو) */
    banner(n) {
      const src = n.image ? TK.img(n.image) : '';
      if (src && n.imageOnly) return `<div class="banner has-img img-only" data-go="news/${n.id}" role="link" aria-label="${esc(n.title)}"><img class="bimg" src="${src}" alt=""></div>`;
      return `<div class="banner th-${n.theme} ${src ? 'has-img' : ''}" data-go="news/${n.id}" role="link">
        ${src ? `<img class="bimg" src="${src}" alt="">` : ''}
        <span class="tag">${esc(n.tag)}</span>
        <div class="t">${esc(n.title)}</div>
        <div class="s">${esc(n.sub)}</div>
        ${src ? '' : `<div class="art">${n.big ? `<span class="big" style="text-align:center">${ui.bigHtml(n.big)}</span>` : `<span style="opacity:.9">${TK.icon(n.icon, 96, 'currentColor', 1.4)}</span>`}</div>`}
      </div>`;
    },
    carousel(list, opts = {}) {
      if (!list.length) return '';
      return `<div class="carousel ${opts.bleed ? 'bleed' : ''}" data-carousel>
        <div class="track">${list.map(ui.banner).join('')}</div>
        <div class="dots">${list.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
      </div>`;
    },
    /** «10%» → «١٠٪» بەپێی ڕێکخستنی ژمارەکان، بۆ ئەوەی لەگەڵ دەقی ناو بانەرەکە یەک بێت */
    bigText(b) {
      return state.settings.digits === 'en' ? String(b) : String(b).replace(/%/g, '٪');
    },
    /** ژمارەی گەورەی بانەر: «50K» ← «٥٠» لەگەڵ «هەزار»ی بچووک لە ژێریدا */
    bigHtml(b) {
      const t = ui.bigText(b);
      const m = t.match(/^(.*?)K$/i);
      return m ? `${esc(m[1])}<small style="display:block;font-size:.34em;letter-spacing:0;margin-top:4px">هەزار</small>` : esc(t);
    },
    newsThumb(n, size = 86) {
      return `<div class="thumb th-${n.theme}" style="width:${size}px;min-height:${size}px">${n.big ? `<b style="font-size:${size / 3.4}px;text-align:center;line-height:1.1">${ui.bigHtml(n.big)}</b>` : TK.icon(n.icon, size / 2.3, 'currentColor', 1.6)}</div>`;
    },
    settingsCard() {
      const st = state.settings;
      return `<div class="card col">
        <div class="col tight"><div class="sm bold">ڕووکار</div>${ui.seg('setTheme', [{ v: 'light', l: 'ڕووناک' }, { v: 'dark', l: 'تاریک' }, { v: 'auto', l: 'خۆکار' }], st.theme)}</div>
        <div class="col tight"><div class="sm bold">قەبارەی نووسین</div>${ui.seg('setScale', [{ v: 'sm', l: 'بچووک' }, { v: 'md', l: 'ئاسایی' }, { v: 'lg', l: 'گەورە' }], st[TK.scaleKey || 'textScale'] || 'md')}</div>
        <div class="col tight"><div class="sm bold">ژمارەکان</div>${ui.seg('setDigits', [{ v: 'ku', l: '١٢٣' }, { v: 'en', l: '123', latin: true }], st.digits)}</div>
      </div>`;
    },
    /** پیشاندانی نامەکانی گفتوگۆیەک. asDriver: ئایا خوێنەر شۆفێرە */
    chat(msgs, asDriver) {
      if (!msgs.length) return `<div class="center sm muted" style="padding:30px 0">هێشتا هیچ نامەیەک نییە. یەکەم نامە بنووسە.</div>`;
      let lastDay = '';
      return `<div class="chat">${msgs
        .map((m) => {
          const day = new Date(m.at).toDateString();
          const today = new Date().toDateString();
          const yest = new Date(Date.now() - 86400000).toDateString();
          const label = day === today ? 'ئەمڕۆ' : day === yest ? 'دوێنێ' : fmt.ago(m.at);
          const sep = day !== lastDay ? `<div class="day-sep">${esc(label)}</div>` : '';
          lastDay = day;
          if (m.system) return `${sep}<div class="sys-msg">${esc(m.text)}</div>`;
          const mine = m.fromDriver === asDriver;
          if (m.unsent) return `${sep}<div class="bubble ${mine ? 'me' : 'them'} unsent">${TK.icon('x', 14)}${mine ? 'نامەکەت گەڕاندەوە' : 'ئەم نامەیە گەڕێنرایەوە'}<div class="time">${fmt.clock(fmt.hhmm(m.at))}</div></div>`;
          const body = m.voice
            ? `<div class="voice">${TK.icon('play', 16, 'currentColor', 2, 'currentColor')}<span class="wave"></span><span class="xs">0:0${m.voice}</span></div>`
            : esc(m.text);
          const read = asDriver ? m.readP : m.readD;
          const tick = mine ? `<span class="ticks ${read ? 'read' : ''}">${read ? '✓✓' : '✓'}</span>` : '';
          // نامەی خۆت تا ٥ خولەک: دەستلێدان ← گەڕاندنەوە
          const undo = TK.canUnsend(m) ? ` tap" data-act="msgMenu" data-arg="${esc(m.id)}` : '';
          return `${sep}<div class="bubble ${mine ? 'me' : 'them'}${undo}">${body}<div class="time">${fmt.clock(fmt.hhmm(m.at))} ${tick}${undo ? ` <span class="undo-hint">${TK.icon('undo', 12)}</span>` : ''}</div></div>`;
        })
        .join('')}</div>`;
    },
    /** لیستی گفتوگۆکان */
    /** لیستی نامەکان (وەک واتسئاپ): وێنە، ناو و کات، یەک دێڕ لە دوایین نامە، نەخوێندراوە ئەستوورە */
    threads(list, asDriver, mkHead) {
      if (!list.length) return ui.empty('chat', 'هێشتا نامەت نییە', asDriver ? 'کاتێک سەرنشینێک نامەت بۆ بنێرێت لێرە دەردەکەوێت' : 'کاتێک شۆفێرێکت هەبوو، لێرە ڕاستەوخۆ نامەی بۆ دەنێریت');
      return `<div class="chats">${list
        .map((t) => {
          const h = mkHead(t);
          const last = t.last;
          const mine = !last.system && last.fromDriver === asDriver;
          const preview = last.unsent ? 'نامەیەک گەڕێنرایەوە' : last.voice ? 'نامەی دەنگی' : last.text;
          return `<div class="chat-row tap ${t.unread ? 'un' : ''}" data-go="${esc(h.link)}">
            <div class="cr-av">${h.avatar}${h.online ? '<span class="online-dot"></span>' : ''}</div>
            <div class="cr-mid">
              <div class="cr-1"><b class="ellipsis">${esc(h.name)}</b><span class="cr-t">${fmt.ago(last.at)}</span></div>
              <div class="cr-2"><span class="ellipsis">${mine ? 'تۆ: ' : ''}${esc(preview)}</span>${t.unread ? `<span class="cr-n">${t.unread}</span>` : ''}</div>
            </div>
          </div>`;
        })
        .join('')}</div>`;
    },
    noticeIcon(kind) {
      return (
        {
          ride: ['car', 'ok'], drop: ['check', 'ok'], swap: ['swap', ''], pay: ['wallet', 'info'], info: ['bell', 'navy'], driver: ['route', ''],
          offer: ['tag', ''], chat: ['chat', 'info'], ok: ['check', 'ok'], self: ['check', 'navy'],
        }[kind] || ['bell', 'navy']
      );
    },
    /** لیستی ئاگادارکردنەوەکان وەک فەیسبووک: «نوێ» (نەخوێندراوە)، «ئەمڕۆ»، «دوێنێ»، «پێشتر»، و کاتی کورت (٥ خولەک، ٣ کاتژمێر) */
    noticeList(list, readAt) {
      const isNew = (n) => n.at > readAt && !ntOpened.has(n.id);
      if (!list.length) return ui.empty('bell', 'هیچ ئاگادارکردنەوەیەک نییە', 'کاتێک شتێکی نوێ ڕوو بدات لێرە دەردەکەوێت');
      const day0 = new Date();
      day0.setHours(0, 0, 0, 0);
      const today = day0.getTime();
      const yest = today - 864e5;
      const groups = [['نوێ', []], ['ئەمڕۆ', []], ['دوێنێ', []], ['پێشتر', []]];
      list.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).forEach((n) => {
        const g = isNew(n) ? 0 : n.at >= today ? 1 : n.at >= yest ? 2 : 3;
        groups[g][1].push(n);
      });
      const row = (n, fresh) => {
        const [ic, tone] = ui.noticeIcon(n.kind);
        return `<div class="item nt-row ${fresh ? 'nt-new' : ''} ${n.link ? 'tap' : ''}" data-nt="${esc(n.id)}" ${n.link ? `data-go="${esc(n.link)}"` : ''}>
            <div class="ico-box ${tone}">${TK.icon(ic, 20, 'var(--brand)')}</div>
            <div class="grow"><div class="bold" style="font-size:.95rem">${esc(n.title)}</div><div class="sm muted">${esc(noticeBody(n))}</div><div class="xs nt-when">${fmt.noticeWhen(n.at)}</div></div>
            ${fresh ? '<span class="nt-dot" aria-label="نوێ"></span>' : ''}
          </div>`;
      };
      return groups.filter((g) => g[1].length).map(([t, l], gi) => `<div class="nt-h">${t}</div><div class="list">${l.map((n) => row(n, t === 'نوێ')).join('')}</div>`).join('');
    },
    /** خشتەی کاتەکانی هەر ڕۆژێک (کاتێک کاتەکان جیاوازن) */
    perDayList(x) {
      const rows = [0, 1, 2, 3, 4, 5, 6].filter((i) => x.perDay[i] && (x.perDay[i].go || x.perDay[i].back));
      return `<div class="pdlist">${rows.map((i) => {
        const e = x.perDay[i];
        return `<div class="pdl"><b>${fmt.WEEKDAYS[i]}</b><span>${e.go ? `چوون ${fmt.clock(e.go)}` : '<i class="muted">بێ چوون</i>'}</span><span>${e.back ? `هاتنەوە ${fmt.clock(e.back)}` : '<i class="muted">بێ هاتنەوە</i>'}</span></div>`;
      }).join('')}</div>`;
    },
    requestSummary(r) {
      return `<div class="col tight">
        <div class="row sm">${TK.icon('pin', 16, 'var(--success)')}<span class="grow">${esc(r.from)}</span></div>
        <div class="row sm">${TK.icon('pin', 16, 'var(--amber)')}<span class="grow">${esc(r.to)}</span></div>
        ${hasPerDay(r) ? ui.perDayList(r) : `<div class="row sm muted">${TK.icon('clock', 16)}<span>${fmt.schedule(r)}</span></div>
        <div class="row sm muted">${TK.icon('calendar', 16)}<span>${fmt.days(r.days)}</span></div>`}
        ${r.startDate ? `<div class="row sm muted">${TK.icon('flag', 16)}<span>دەستپێکردن: ${fmt.day(r.startDate)}</span></div>` : ''}
      </div>`;
    },
    requestTags(r) {
      const t = [];
      if (r.hasChild) t.push(ui.badge(r.rideType === 'private' ? 'تەنها منداڵەکانی خۆم' : r.rideType === 'family' ? 'لەگەڵ خێزان' : 'تەنها لەگەڵ منداڵ', 'note'));
      else t.push(ui.badge(r.rideType === 'private' ? 'تەکسی تایبەت' : 'هاوبەش'));
      if (r.womanOnly) t.push(ui.badge('شۆفێری ئافرەت', 'woman'));
      if (r.riders > 1) t.push(ui.badge(`${r.riders} سەرنشین`, 'info'));
      return `<div class="row wrap" style="gap:6px">${t.join('')}</div>`;
    },
  };
  TK.ui = ui;

  /* =========================================================
   * ڕاکێشانی پەڕە بۆ نوێکردنەوە (pull to refresh)
   * خاڵە زەردەکەی لۆگۆی Y دێتە خوارەوە و بە دەوری بازنەکەدا هێڵ دەکێشێت؛ لە کاتی نوێکردنەوەدا دەسوڕێتەوە.
   * هەر ئەپێک بە TK.enablePtr([...]) دیاری دەکات لە کام پەڕانەدا کار بکات.
   * ======================================================= */
  const ptrRoutes = new Set();
  TK.enablePtr = (list) => list.forEach((x) => ptrRoutes.add(x));
  const PTR_MAX = 120; // زۆرترین ڕاکێشان (پیکسڵ)
  const PTR_GO = 84; // لێرەوە نوێکردنەوە دەست پێدەکات
  let ptr = null;
  function ptrSvg(o) {
    const R = 20, C = 24, L = 2 * Math.PI * R;
    const ang = o.angle != null ? o.angle : 90;
    let dx = C, dy;
    if (o.drop < 1) dy = 31 + (C + R - 31) * o.drop;
    else {
      dx = C + R * Math.cos((ang * Math.PI) / 180);
      dy = C + R * Math.sin((ang * Math.PI) / 180);
    }
    const len = (o.arc || 0) * L;
    const arc = len > 0.5 ? `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#F5A623" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${L.toFixed(1)}" transform="rotate(${(ang - (o.arc || 0) * 360).toFixed(1)} ${C} ${C})"/>` : '';
    return `<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true"><circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--line)" stroke-width="2.2"/>${arc}<path d="M16.5 13.5 L24 23.5 L31.5 13.5 M24 23.5 L24 28" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="3.6" fill="#F5A623"/></svg>`;
  }
  function ptrEl() {
    let el = document.getElementById('ptr');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ptr';
      el.innerHTML = '<div class="ptr-bub"></div><span class="ptr-lbl"></span>';
      document.body.appendChild(el);
    }
    return el;
  }
  function ptrDraw(pull, spinAngle) {
    const el = ptrEl();
    const p = Math.min(1, pull / PTR_GO);
    // یەکەم بەش: خاڵەکە دێتە خوارەوە؛ دووەم بەش: بە دەوری بازنەکەدا هێڵ دەکێشێت
    const o = spinAngle != null ? { drop: 1, arc: 0.3, angle: spinAngle } : p < 0.35 ? { drop: p / 0.35, arc: 0 } : { drop: 1, arc: ((p - 0.35) / 0.65) * 0.9, angle: 90 + ((p - 0.35) / 0.65) * 0.9 * 360 };
    el.querySelector('.ptr-bub').innerHTML = ptrSvg(o);
    el.querySelector('.ptr-lbl').textContent = spinAngle != null ? '' : p >= 1 ? 'بەری بدە بۆ نوێکردنەوە' : 'ڕابکێشە بۆ نوێکردنەوە';
    el.style.transform = `translateY(${Math.max(0, pull - 64) / 2 + Math.min(pull, 64) - 56}px)`;
    el.style.opacity = String(Math.min(1, pull / 30));
    el.classList.toggle('on', pull > 0);
    const sc = app.root && app.root.querySelector('.screen');
    if (sc) sc.style.transform = pull ? `translateY(${pull}px)` : '';
  }
  function ptrReset() {
    const el = document.getElementById('ptr');
    const sc = app.root && app.root.querySelector('.screen');
    [el, sc].forEach((x) => x && x.classList.add('ptr-anim'));
    ptrDraw(0);
    setTimeout(() => {
      [document.getElementById('ptr'), app.root && app.root.querySelector('.screen')].forEach((x) => x && x.classList.remove('ptr-anim'));
      if (el) el.classList.remove('on');
    }, 260);
  }
  const ptrOk = (e) => {
    const r = app.current;
    if (!r || !ptrRoutes.has(r.path) || window.scrollY > 0 || document.querySelector('.sheet')) return false;
    const t = e.target;
    return !(t.closest && t.closest('input, textarea, select, .gmap, .map, .mapbox, [data-noptr], .carousel, .fchips, .tabs'));
  };
  document.addEventListener('touchstart', (e) => {
    if (ptr && ptr.busy) return;
    ptr = e.touches.length === 1 && ptrOk(e) ? { y0: e.touches[0].clientY, x0: e.touches[0].clientX, pull: 0, live: false } : null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!ptr || ptr.busy) return;
    const dy = e.touches[0].clientY - ptr.y0;
    const dx = Math.abs(e.touches[0].clientX - ptr.x0);
    if (!ptr.live) {
      if (dy < 8 || dx > dy || window.scrollY > 0) {
        if (dy < -4 || dx > 12) ptr = null;
        return;
      }
      ptr.live = true;
    }
    e.preventDefault(); // ڕاکێشانی خۆماڵی وێبگەڕ (و بازدانی ئایفۆن) ڕادەگیرێت
    ptr.pull = Math.min(PTR_MAX, Math.max(0, dy - 8) * 0.55);
    ptrDraw(ptr.pull);
  }, { passive: false });
  document.addEventListener('touchend', async () => {
    if (!ptr || ptr.busy) return;
    const st = ptr;
    if (!st.live || st.pull < PTR_GO) {
      ptr = null;
      if (st.live) ptrReset();
      return;
    }
    st.busy = true;
    // دەوەستێت لە شوێنی خۆی و دەسوڕێتەوە تا نوێکردنەوە تەواو دەبێت
    const el = ptrEl();
    const sc = app.root && app.root.querySelector('.screen');
    [el, sc].forEach((x) => x && x.classList.add('ptr-anim'));
    let ang = 90 + 0.9 * 360;
    ptrDraw(70, ang);
    setTimeout(() => [el, sc].forEach((x) => x && x.classList.remove('ptr-anim')), 220);
    let spin = true;
    const tick = () => {
      if (!spin) return;
      ang += 9;
      ptrDraw(70, ang);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const t0 = Date.now();
    await TK.refresh();
    await new Promise((r) => setTimeout(r, Math.max(0, 800 - (Date.now() - t0))));
    spin = false;
    ptrReset();
    ptr = null;
  });

  /* ---------- کارۆسێلی هەواڵ: جووڵەی خۆکار و خاڵەکان ---------- */
  let carIdx = 0;
  let carTimer = null;
  /* بانەرەکان بێ کۆتایی دەسوڕێنەوە (وەک ئەپە جیهانییەکان): دوای دوایین ڕیکلام یەکەم دێتەوە، و پێش یەکەم دوایین.
   * ڕێگاکە: کۆپییەکی دوایین لە پێش یەکەم و کۆپییەکی یەکەم لە دوای دوایین دادەنرێت؛ کاتێک لەسەر کۆپییەک وەستا، بێ جووڵە دەچێتە سەر ڕاستەقینەکە */
  TK.initCarousel = function () {
    clearInterval(carTimer);
    const c = document.querySelector('[data-carousel]');
    if (!c) return;
    const track = c.querySelector('.track');
    const dots = c.querySelectorAll('.dots i');
    const count = dots.length;
    if (carIdx >= count) carIdx = 0;
    const setDots = (i) => dots.forEach((d, k) => d.classList.toggle('on', k === i));
    setDots(carIdx);
    if (count < 2) return;
    const first = track.children[0];
    const last = track.children[count - 1];
    const cf = first.cloneNode(true);
    const cl = last.cloneNode(true);
    [cf, cl].forEach((x) => { x.setAttribute('aria-hidden', 'true'); x.classList.add('clone'); });
    track.appendChild(cf);
    track.insertBefore(cl, first);
    // ئاراستەی ڕاست بۆ چەپ: scrollLeft بەرەو سالب دەچێت. شوێنی p: ٠ = کۆپی دوایین، ١..count = ڕاستەقینە، count+1 = کۆپی یەکەم
    const step = () => Math.abs(track.children[2].offsetLeft - track.children[1].offsetLeft) || track.clientWidth;
    const pos = () => Math.round(Math.abs(track.scrollLeft) / (step() || 1));
    const jump = (p) => {
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = -p * step();
      requestAnimationFrame(() => {
        track.style.scrollSnapType = '';
        track.style.scrollBehavior = '';
      });
    };
    jump(carIdx + 1);
    let userTouch = 0;
    let settle = 0;
    const fix = () => {
      const p = pos();
      if (p <= 0) jump(count);
      else if (p >= count + 1) jump(1);
    };
    track.addEventListener('scroll', () => {
      const p = pos();
      const i = (p - 1 + count) % count;
      if (i !== carIdx) {
        carIdx = i;
        setDots(i);
      }
      clearTimeout(settle);
      settle = setTimeout(fix, 140);
    }, { passive: true });
    ['touchstart', 'pointerdown', 'wheel'].forEach((ev) => track.addEventListener(ev, () => (userTouch = Date.now()), { passive: true }));
    carTimer = setInterval(() => {
      if (!document.body.contains(track)) return clearInterval(carTimer);
      if (Date.now() - userTouch < 6000) return;
      const p = pos();
      track.scrollTo({ left: -(p + 1) * step(), behavior: 'smooth' });
    }, 4500);
  };

  /* ---------- کردارە هاوبەشەکان (ڕێکخستن) ---------- */
  Object.assign(app.acts, {
    /** ڕوونکردنەوەی پەڕە: ئایکۆنی (؟) لە سەرەوە، ناوەڕۆکەکەی لە TK.HELP */
    help: (key) => {
      const h = TK.HELP[key];
      if (!h) return;
      TK.sheet(() => `<div class="row" style="gap:10px"><span class="help-ic">${TK.icon('help', 22, 'currentColor', 2)}</span><div class="h2 grow">${esc(h.title)}</div></div><div class="help-body">${typeof h.body === 'function' ? h.body() : h.body}</div><button class="btn block" data-close>تێگەیشتم</button>`);
    },
    /** گەڕاندنەوەی نامەی خۆت (تا ٥ خولەک) */
    msgMenu: async (id) => {
      const m = state.messages.find((x) => x.id === id);
      if (!TK.canUnsend(m)) return;
      const left = Math.max(1, Math.ceil((TK.UNSEND_MS - (Date.now() - m.at)) / 60000));
      if (!(await TK.ask(`«${String(m.text).slice(0, 80)}» دەگەڕێنرێتەوە و لای کەسەکەی تر «ئەم نامەیە گەڕێنرایەوە» دەردەکەوێت. (${left} خولەکی ماوە)`, { title: 'گەڕاندنەوەی نامە', yes: 'گەڕاندنەوە', icon: 'undo' }))) return;
      const err = actions.unsendMessage(id);
      TK.toast(err || 'نامەکە گەڕێنرایەوە');
    },
    setTheme: (v) => actions.setSetting('theme', v),
    setScale: (v) => actions.setSetting(TK.scaleKey || 'textScale', v),
    setDigits: (v) => actions.setSetting('digits', v),
    copy: (v) => {
      const done = () => TK.toast('کۆپی کرا');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(done, done);
      else {
        const ta = document.createElement('textarea');
        ta.value = v;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } catch (e) {
          /* هیچ */
        }
        ta.remove();
        done();
      }
    },
    wipeAll: async () => {
      if (!(await TK.ask('هەموو زانیارییەکان (سەرنشینان، شۆفێران، بەشداری و پارەدان) بە تەواوی دەسڕدرێنەوە و ناگەڕێنەوە. پێش ئەمە فایلی پاشەکەوت دابگرە.', { yes: 'سڕینەوەی هەمووی' }))) return;
      actions.wipeAll();
      TK.toast('هەموو زانیارییەکان سڕانەوە');
      TK.go(app.home, true);
    },
  });

  /** مەرج و ڕێساکان و پاراستنی زانیاری */
  TK.showTerms = function (who) {
    TK.sheet(() => `<div class="h2">مەرج و ڕێساکان</div>
      <div class="sm" style="line-height:2">
        <b>١. پاراستنی زانیاری:</b> زانیاری کەسی، وێنەی بەڵگەنامەکان و ژمارەی مۆبایل تەنها بۆ پشتڕاستکردنەوە و سەلامەتی گەشتەکان بەکاردێن و بە کەسی تر نادرێن.<br>
        <b>٢. ژمارەی مۆبایل:</b> ژمارەی سەرنشین تەنها ئەگەر خۆی ڕێگە بدات بۆ شۆفێر دیار دەبێت.<br>
        <b>٣. سەلامەتی منداڵان:</b> منداڵ هەرگیز لەگەڵ کەسی گەورەی نەناسراو سوار ناکرێت و تەنها شۆفێری پشکنراوی منداڵان گەشتی منداڵان وەردەگرن.<br>
        ${who === 'driver' ? `<b>٤. شۆفێر:</b> زانیارییەکانت دەبێت ڕاست و نوێ بن. ئەگەر بەڵگەنامەیەک بەسەر چوو دەبێت نوێی بکەیتەوە. دواکەوتن و نەهاتن سزای لەسەرە. یەکسا دەتوانێت هەژمار ڕابگرێت ئەگەر زانیاری هەڵە بێت یان سکاڵای جددی هەبێت.<br>` : `<b>٤. سەرنشین:</b> «نایەم» تا ${cfg().skipCutoffMin} خولەک پێش گەشت دەکرێت. ئەگەر شۆفێر نەهات، ڕاپۆرت بکە و قەرەبوو دەکرێیتەوە.<br>`}
        <b>٥. پارەدان:</b> نرخی مانگانە پێش دەستپێکردن ڕێک دەکەوێت و لە کاتی گەشتدا ناگۆڕێت.
      </div>
      <button class="btn block" data-close>تێگەیشتم</button>`);
  };

  /** ئایا ئەم نامەیە هی ئەم بەکارهێنەرەیە و هێشتا لە ٥ خولەکەکەدایە */
  TK.UNSEND_MS = 5 * 60000;
  TK.canUnsend = function (m) {
    if (!m || m.system || m.unsent || m.voice) return false;
    const mine = ROLE === 'driver' ? m.fromDriver && m.driverId === state.driver.meId : ROLE === 'passenger' ? !m.fromDriver && (m.peer || 'me') === 'me' : false;
    return mine && Date.now() - m.at < TK.UNSEND_MS;
  };
  /** شاردنەوەی ژمارەی تەلەفۆن لە چاتدا (بۆ ئەوەی پەیوەندی لەناو ئەپ بمێنێتەوە) */
  TK.maskPhones = function (text) {
    const re = /(\+?[0-9٠-٩][0-9٠-٩\s-]{6,}[0-9٠-٩])/g;
    const found = re.test(text);
    return { text: text.replace(re, '•••• ••• ••••'), found };
  };
})();
