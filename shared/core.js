/* تەکسیەکەم، کۆدی هاوبەش بۆ هەر سێ ئەپ (سەرنشین، شۆفێر، بەڕێوەبەر)
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
    commission: 0.12, // کۆمیسیۆنی ئەپ لە هەر بەژدارییەک
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
    greeting() {
      const h = new Date().getHours();
      if (h < 12) return 'بەیانیت باش';
      if (h < 17) return 'ڕۆژت باش';
      return 'ئێوارەت باش';
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

  /** دووری بە کیلۆمەتر (ڕێگای شار ≈ ١.٣ × هێڵی ڕاست) */
  TK.distance = function (fromId, toId) {
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
  TK.priceFor = function (d) {
    const km = TK.distance(d.fromId, d.toId);
    const dayCount = d.days.filter(Boolean).length || 1;
    const oneWay = d.oneWay != null ? d.oneWay : !d.back;
    const c = cfg();
    let per = (c.basePrice + km * c.perKm) * (dayCount / 5) * (oneWay ? c.oneWayFactor : 1);
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
  const ALL_DAYS = (n) => [0, 1, 2, 3, 4, 5, 6].map((i) => (n === 5 ? i >= 1 && i <= 5 : i < n));

  const MONTH_KEY = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const TODAY = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  TK.todayISO = () => TODAY();
  /** زانیاری تایبەتی هەر سەرنشینێک (کاتی گۆڕینی هەژمار هەڵدەگیرێت لە vault) */
  const PRIV = ['passenger', 'family', 'notices', 'readNoticesAt', 'rewards', 'billing', 'tickets', 'history', 'seenNews'];
  function emptyPassenger(name = '', phone = '') {
    const first = name.split(' ')[0] || '';
    return {
      passenger: { onboarded: true, loggedIn: false, name, phone, homeId: '', city: 'erbil', sharePhone: false },
      family: { members: name ? [{ id: 'm' + uid(), name: first, initial: name.slice(0, 1), kind: 'adult', relation: 'خاوەن ئەکاونت' }] : [], guardians: name ? [{ name: `${first} (تۆ)`, initial: name.slice(0, 1) }] : [] },
      notices: [],
      readNoticesAt: 0,
      rewards: { points: 0, code: phone ? (phone.slice(-4) + 'TK').toUpperCase() : '', invited: 0, redeemed: [] },
      billing: { month: fmt.MONTHS[new Date().getMonth()], monthKey: MONTH_KEY(), adjustments: [], method: 'cash', paid: false, promo: null, history: [] },
      tickets: [],
      history: [],
      seenNews: [],
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
      config: {},
      ledger: [],
      payouts: [],
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
    };
  }
  TK.createSeed = createSeed;

  /* ---------- هاوبەشەکان (قوتابخانە، زانکۆ، کۆمپانیا) ----------
   * هەر سەرنشینێک بە کۆد یان QR دەبەسترێتەوە بە هاوبەشێک. کاتێک فاتورەی مانگ دەدرێت،
   * ڕێژەی هاوبەش (بۆ نموونە ٣٪) لە پارەی دراو حیساب دەکرێت و لە قازانجی تەکسیەکەم دەردەچێت. */
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
   *  - سەرنشین: بەژداری، گەشت، داواکاری و نامەکانی خۆی (ژمارەی کەسانی تر نابینێت)
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
  };
  // زانیاری تایبەتی شۆفێر کە تەنها خۆی و بەڕێوەبەر دەیبینن (بەڵگەنامە، ناونیشان، موچە)
  const SENS = new Set([
    'birth', 'idNo', 'idExpiry', 'idFront', 'idBack', 'licNo', 'licClass', 'licExpiry', 'licFront', 'licBack', 'regNo', 'regExpiry', 'regPhoto',
    'secPhoto', 'secDate', 'emergencyName', 'emergencyPhone', 'district', 'neighborhood', 'landmark', 'payMethod', 'payAccount',
    'docStatus', 'docReason', 'termsAt', 'terms', 'readNoticesAt', 'carFront', 'carBack', 'carLeft', 'carRight', 'carInside', 'addedByAdmin', 'gender',
  ]);
  // بەشی تایبەتی سەرنشین (pax/{uid})؛ ئاگادارکردنەوە و مێژوو کۆلێکشنی جیان
  const PAX_FIELDS = ['passenger', 'family', 'readNoticesAt', 'rewards', 'billing', 'tickets', 'seenNews'];
  // هەر ڕۆڵێک دەتوانێت چی بنووسێت: rw = دروستکردن/گۆڕین/سڕینەوە، c = تەنها دروستکردن، u = تەنها گۆڕین
  const ALL_RW = Object.keys(ARR).concat(['meta', 'pax', 'accounts', 'drivers', 'dpub', 'pnotices', 'phistory']).reduce((o, k) => ((o[k] = 'rw'), o), {});
  const MODES = {
    passenger: { pax: 'rw', accounts: 'rw', requests: 'rw', subscriptions: 'rw', trips: 'rw', routes: 'rw', messages: 'rw', swaps: 'rw', pnotices: 'rw', phistory: 'rw', dnotices: 'c', adminNotices: 'c', reports: 'c', ledger: 'c', partnerEarnings: 'c', dpub: 'u' },
    driver: { drivers: 'rw', dpub: 'rw', requests: 'rw', subscriptions: 'rw', trips: 'rw', routes: 'rw', messages: 'rw', swaps: 'rw', dnotices: 'rw', driverLog: 'rw', pnotices: 'c', phistory: 'c', adminNotices: 'c', ledger: 'c' },
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
    if (ROLE === 'admin') out.set('meta/app', { places: c.places, cities: c.cities, config: c.config || {}, lastBackupAt: c.lastBackupAt || null });
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
        const once = /^(trips|driverLog)\//.test(path);
        if (mode !== 'u') ops.push({ op: once ? 'create' : 'set', path, data: clone(data) });
      } else if (mode !== 'c') {
        const u = fieldDiff(e.data || {}, data);
        if (u) ops.push({ op: 'update', path, data: u });
      }
    });
    cloud.docs.forEach((e, path) => {
      if (want.has(path) || modeOf(path) !== 'rw') return;
      if (path.startsWith('meta/') && ROLE !== 'admin') return;
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
    cloud.pending = Promise.all(ops.map(send));
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
        ['requests', 'subscriptions', 'trips', 'routes', 'messages', 'swaps', 'pnotices', 'phistory'].map(R)
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
        ['requests', 'subscriptions', 'trips', 'routes', 'messages', 'swaps', 'dnotices', 'ledger', 'payouts', 'driverLog'].map(R)
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
    const draft = clone(state);
    const r = fn(draft);
    state = r || draft;
    saveLocal(state);
    cloudFlush();
    emit();
  }
  TK.update = update;

  /* ---------- ڕێکخستنەوەی ڕۆژانە (لەسەر ئەو ئامێرەی دەسەڵاتی هەیە) ----------
   * شۆفێر: گەشتەکانی دوێنێ دادەخات، گەشتەکانی ئەمڕۆ و ڕۆتەکانی ڕێک دەخات.
   * سەرنشین: گەشتی ئەمڕۆی بەژدارییە تاکەکانی خۆی و فاتورەی مانگی نوێ.
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
    const probe = clone(state);
    try {
      if (ROLE === 'driver') reconcileDriver(probe, cloud.me);
      else if (ROLE === 'passenger') reconcilePassenger(probe);
      else if (ROLE === 'admin') ensureDay(probe);
    } catch (e) {
      console.error('reconcile', e);
      return;
    }
    if (stable(probe) !== stable(state)) update(() => probe);
    // بەڵگەنامەی سەرەتایی (بۆ نموونە meta/app بۆ بەڕێوەبەر) یان ئەوەی پێشتر نەنووسرابوو
    else cloudFlush();
  }
  TK.reconcile = reconcile;
  setInterval(() => {
    if (state && state.day !== TODAY()) scheduleCompose();
    reconcile();
  }, 60000);

  /** کورتەی گەشتێکی هاوبەش بۆ شۆفێر: سەرەکی (lead)، وێستگەکان، دۆخ، کات */
  function runView(trips) {
    const pick = (st) => trips.find((t) => t.status === st);
    const lead = pick('active') || pick('scheduled') || pick('done') || pick('absent') || trips[0];
    const status = pick('active') ? 'active' : pick('scheduled') ? 'scheduled' : pick('done') || pick('absent') ? 'done' : 'skipped';
    const riding = trips.filter((t) => t.status !== 'skipped' && t.status !== 'noshow');
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
    /** بەژدارییەکانی سەرنشینی ئێستا */
    mySubs: () => state.subscriptions.filter((x) => (x.owner || 'me') === 'me'),
    /** گەشتەکانی بەژداری ڕاگیراو پیشان نادرێن */
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
      const rank = { active: 0, scheduled: 1, done: 2, skipped: 3 };
      return [...groups.values()].map(runView).sort((a, b) => rank[a.status] - rank[b.status] || a.time.localeCompare(b.time));
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
        id: x.id, family: true, name: x.riderNames || fmt.names(sel.names(x.memberIds)), role: sel.peerName(x.owner || 'me'),
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
    peerPhone(peer) {
      if (ROLE !== 'admin') return '';
      const a = state.accounts.find((x) => x.uid === peer);
      return a ? a.phone : '';
    },
    unread: () => state.notices.filter((n) => n.at > state.readNoticesAt).length,
    myDNotices: () => state.dnotices.filter((n) => n.driverId === state.driver.meId),
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
  TK.adminNoticeAdd = anotice;
  /** بەشی تایبەتی سەرنشینێک (ئێستا یان لە vault) */
  function pslice(s, owner) {
    if (!owner || owner === 'me') return s;
    return s.vault[owner] || null;
  }
  TK.pslice = pslice;
  /** ژمارەی مۆبایلی خاوەنی تۆمارێک */
  const ownerPhone = (s, owner) => (!owner || owner === 'me' ? s.passenger.phone : owner);

  /** ئایا بەژدارییەک ئەمڕۆ گەشتی هەیە */
  function dayApplies(sub, date = new Date()) {
    if (!sub.days || !sub.days[(date.getDay() + 1) % 7]) return false;
    return !sub.startDate || sub.startDate <= TODAY(date);
  }
  /* ---------- ڕۆت: چەند سەرنشین لە یەک تەکسیدا ----------
   * شۆفێر چەند بەژدارییەک دەخاتە یەک ڕۆتەوە (route). هەموو ڕۆژێک بۆ هەر ڕۆتێک یەک «گەشتی هاوبەش» (run) دروست دەبێت.
   * هەر سەرنشینێک هێشتا گەشتی تایبەتی خۆی هەیە (بۆ «نایەم»، هەڵسەنگاندن و مێژوو)، بەڵام هەموو گەشتەکانی یەک run
   * هەمان لیستی وێستگەکانیان هەیە و بە یەکەوە دەجووڵێن. هەر وێستگەیەک «parts»ـی هەیە: کێ لەو وێستگەیە سوار دەبێت یان دادەبەزێت. */
  const subTime = (sub, dir) => (dir === 'back' ? sub.back : sub.go);
  const subLeg = (sub, dir) => (dir === 'back' ? { from: sub.to, to: sub.from } : { from: sub.from, to: sub.to });
  const toMin = (hhmm) => +String(hhmm).slice(0, 2) * 60 + +String(hhmm).slice(3, 5);
  TK.toMin = toMin;
  /** ئەندامانی بەژدارییەک بە ناوی یەکەم و ڕەگەز (بۆ ئەوەی سەرنشینانی تر بزانن کێ لەگەڵیانە) */
  function subPeople(s, sub) {
    if (Array.isArray(sub.people)) return sub.people;
    return familyPeople(s, sub);
  }
  /** ناوی یەکەم و ڕەگەزی ئەندامانی بەژدارییەک لە خێزانی خاوەنەکەی (تەنها خاوەن و بەڕێوەبەر دەیبینن) */
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
  /** ئایا ئەم بەژداریانە دەکرێت پێکەوە لە یەک ڕۆتدا بن؟ هەڵە دەگەڕێنێتەوە یان null */
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
  /** وێستگەکانی گەشتێکی تاک (یەک بەژداری) */
  function soloStops(s, sub, dir, time) {
    const leg = subLeg(sub, dir);
    const mins = Math.round(sub.km ? sub.km * 2.5 + 8 : 20);
    return [
      mergeParts({ id: 's1', place: leg.from, kind: 'pickup', parts: [partOf(s, sub)], time, done: false }),
      mergeParts({ id: 's2', place: leg.to, kind: 'dropoff', parts: [partOf(s, sub)], time: fmt.addMin(time, mins), done: false }),
    ];
  }
  /** وێستگەکانی ڕۆتێک بۆ ئەو بەژداریانەی ئەمڕۆ دێن. سوارکردنی یەک لە دوای یەک لە هەمان شوێن یەک وێستگەن */
  function runStops(s, route, subs) {
    const c = cfg();
    const order = route.subIds.filter((id) => subs.some((x) => x.id === id));
    const byId = (id) => subs.find((x) => x.id === id);
    const picks = [];
    order.forEach((id) => {
      const x = byId(id);
      const place = subLeg(x, route.dir).from;
      const last = picks[picks.length - 1];
      if (last && last.place === place) last.parts.push(partOf(s, x));
      else picks.push({ id: 'p' + id, place, kind: 'pickup', parts: [partOf(s, x)], done: false });
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
      let d = drops.find((y) => y.place === place);
      if (!d) drops.push((d = { id: 'd' + id, place, kind: 'dropoff', parts: [], done: false }));
      d.parts.push(partOf(s, x));
    });
    drops.forEach((d, i) => {
      d.time = fmt.addMin(firstDrop, i * c.stopMin);
      mergeParts(d);
    });
    return picks.concat(drops);
  }
  /** کاتی سوارکردنی هەر بەژدارییەک لە ڕۆتێکدا (بۆ ئاگادارکردنەوەی سەرنشین کاتێک دەگۆڕێت) */
  function routePickTimes(s, route) {
    const subs = route.subIds.map((id) => s.subscriptions.find((x) => x.id === id)).filter(Boolean);
    const out = {};
    runStops(s, route, subs).forEach((st) => st.kind === 'pickup' && st.subIds.forEach((id) => (out[id] = st.time)));
    return out;
  }
  TK.routeStops = (route, subs) => runStops(state, route, subs);
  function mkTrip(s, sub, dir) {
    const time = subTime(sub, dir);
    return {
      id: `t_${sub.id}_${s.day}_${dir}`, day: s.day, dir, driverId: sub.driverId, subId: sub.id, reqId: sub.reqId || null, owner: sub.owner || 'me',
      title: dir === 'back' ? `هاتنەوە، ${sub.riderNames}` : `${sub.riderNames}، ${sub.to.split('، ')[0]}`,
      memberIds: sub.memberIds.slice(), kind: sub.hasChild ? 'kids' : sub.rideType === 'private' ? 'private' : 'shared', time, status: 'scheduled',
      stops: soloStops(s, sub, dir, time),
    };
  }
  const routedIn = (s, subId, dir) => (s.routes || []).find((r) => r.dir === dir && r.subIds.includes(subId));
  TK.dayApplies = (sub, date) => dayApplies(sub, date);
  /** دروستکردنی گەشتەکانی ئەمڕۆی بەژدارییەک (چوون و هاتنەوە). ئەگەر لە ڕۆتێکدایە، syncRun دروستی دەکات */
  function genTrips(s, sub) {
    if (sub.status === 'ended' || !dayApplies(sub)) return;
    ['go', 'back'].forEach((dir) => {
      if (!subTime(sub, dir) || routedIn(s, sub.id, dir)) return;
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
    if (sub && subTime(sub, t.dir)) {
      t.time = subTime(sub, t.dir);
      t.stops = soloStops(s, sub, t.dir, t.time);
    }
  }
  const runStarted = (trips) => trips.some((t) => t.status === 'active' || t.status === 'done' || t.status === 'absent');
  /** گەشتەکانی ئەمڕۆی ڕۆتێک ڕێک دەخاتەوە (تەنها پێش دەستپێکردن) */
  function syncRun(s, route) {
    if (!route || ROLE === 'passenger') return;
    const runId = route.id + ':' + s.day;
    const inRun = () => s.trips.filter((t) => t.runId === runId);
    if (runStarted(inRun())) return;
    const subs = route.subIds
      .map((id) => s.subscriptions.find((x) => x.id === id))
      .filter((x) => x && x.status === 'active' && x.driverId === route.driverId && dayApplies(x) && subTime(x, route.dir));
    subs.forEach((x) => {
      let t = s.trips.find((y) => y.subId === x.id && y.day === s.day && y.dir === route.dir);
      if (t && t.status !== 'scheduled' && t.status !== 'skipped') return; // پێشتر بە تاک دەستی پێکردووە
      if (!t) s.trips.push((t = mkTrip(s, x, route.dir)));
      t.runId = runId;
      t.routeId = route.id;
    });
    inRun().filter((t) => !subs.some((x) => x.id === t.subId)).forEach((t) => detachTrip(s, t));
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
  TK.syncRunIn = syncRun;
  /** دوای گۆڕانکاری لە بەژدارییەک، ڕۆتەکانی نوێ دەکرێنەوە */
  function syncRoutesOf(s, subId) {
    (s.routes || []).filter((r) => r.subIds.includes(subId)).forEach((r) => syncRun(s, r));
  }
  /** بەژدارییەک لە هەموو ڕۆتەکان لادەبرێت (کۆتاییهاتن، گۆڕینی شۆفێر) */
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
  /** لابردنی بەژدارییەک لە وێستگەکانی گەشتێکی دەستپێکراو (نایەم یان نەهات) */
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
    const sw = run.find((t) => t.swapPay && t.originalDriverId);
    if (sw) {
      ledger(s, sw.originalDriverId, 'swap', -sw.swapPay, `جێگرەوە بۆ ${sw.runTitle || sw.title}`);
      ledger(s, sw.driverId, 'swap', sw.swapPay, `جێگرەوەی ${(s.drivers.find((x) => x.id === sw.originalDriverId) || {}).name || ''}، ${sw.runTitle || sw.title}`);
    }
  }
  /** گەشتەکانی ڕۆژانی پێشوو (جگە لە گەشتی چالاک) لە مێژووی شۆفێر تۆمار دەکرێن و لادەبرێن */
  function closeOldTrips(s, pick) {
    const today = TODAY();
    const old = s.trips.filter((t) => pick(t) && t.day && t.day !== today && t.status !== 'active');
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
  /** خانەی «people» لەسەر بەژداری بە پێی خێزانی خاوەنەکەی (بۆ ئەوەی شۆفێر و هاوڕێکانی تەکسی بزانن کێن) */
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
  /** ئەپی سەرنشین: گەشتی ئەمڕۆی بەژدارییەکانی خۆی و فاتورەی مانگی نوێ */
  function reconcilePassenger(s) {
    s.day = TODAY();
    s.subscriptions.filter((x) => (x.owner || 'me') === 'me').forEach((x) => {
      syncPeople(s, x);
      genTrips(s, x);
    });
    fixBilling(s.billing);
  }
  /** بەڕێوەبەر: هەموو شتێک (بۆ ئەو شۆفێرانەی ئەمڕۆ ئەپەکەیان نەکردووەتەوە) و ئاگادارکردنەوەی بەسەرچوونی بەڵگەنامە */
  function ensureDay(s) {
    s.day = TODAY();
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
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 750 123 4567)';
      if (!pass) return 'وشەی نهێنی بنووسە';
      const nc = needCloud();
      if (nc) return nc;
      let u;
      try {
        u = await window.TKFB.signIn(emailOf(p, 'p'), pass);
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
      const partner = ref ? TK.partnerByCode(ref) : null;
      if (ref && String(ref).trim() && !partner) return 'کۆدی قوتابخانە یان کۆمپانیا دروست نییە';
      if (name.trim().split(/\s+/).length < 2) return 'ناوی تەواوت بنووسە (ناو و ناوی باوک)';
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 750 123 4567)';
      if (pass.length < 6) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت';
      if (gender !== 'm' && gender !== 'f') return 'ڕەگەز هەڵبژێرە (نێر یان مێ)';
      const nc = needCloud();
      if (nc) return nc;
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
        s.accounts.push({ uid: u.uid, phone: p, name: name.trim(), city: city || 'erbil', createdAt: Date.now(), partnerId: partner ? partner.id : null });
        s.passenger.city = city || 'erbil';
        s.passenger.gender = gender;
        if (s.family.members[0]) s.family.members[0].woman = gender === 'f';
        s.passenger.loggedIn = true;
        s.passenger.onboarded = true;
        notice(s, { kind: 'info', title: `بەخێربێیت ${name.trim().split(' ')[0]}`, body: 'یەکەم بەژداری مانگانەت دروست بکە. شوێن و کات دیاری بکە و شۆفێرەکان نرخت بۆ دەنێرن.' });
      });
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
          const base = {
            fromId: draft.fromId, toId: draft.toId, days: draft.days, oneWay: draft.dir !== 'both',
            mode: draft.mode, rideType, riders: g.length, hasChild,
          };
          const r = {
            id: 'q' + uid(), groupId, owner: 'me', ownerName: s.passenger.name.split(' ')[0], city: s.passenger.city || 'erbil',
            memberIds: g, riders: g.length, riderNames: fmt.names(members.map((m) => m.name)), hasChild,
            fromId: draft.fromId, toId: draft.toId,
            from: from.name + (draft.fromNote ? `، ${draft.fromNote}` : ''),
            to: to.name + (draft.toNote ? `، ${draft.toNote}` : ''),
            km: Math.round(TK.distance(draft.fromId, draft.toId) * 10) / 10,
            go: draft.dir !== 'back' ? draft.go : null, back: draft.dir !== 'go' ? draft.backTime : null, days: draft.days.slice(),
            replacesSub: draft.replacesSub || null,
            startDate: draft.startDate || null,
            mode: draft.mode, rideType, womanOnly: draft.womanOnly, note: draft.note || '',
            price: TK.priceFor(base), target, status: 'open',
            createdAt: now, expiresAt: now + cfg().requestHours * 3600000, offers: [], declined: [],
          };
          s.requests.unshift(r);
          ids.push(r.id);
        });
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
          days: r.days, mode: r.mode, riders: r.riders, rideType: r.rideType, womanOnly: r.womanOnly, note: r.note || '', price: offer.price, status: 'active', startDate: r.startDate || null, pauseLog: [], createdAt: Date.now(),
          ownerName: r.ownerName || '',
        };
        sub.people = familyPeople(s, sub);
        s.subscriptions.push(sub);
        genTrips(s, sub);
        if (r.replacesSub) endSub(s, r.replacesSub, 'change');
        if (d) d.freeSeats = Math.max(0, d.freeSeats - (r.mode === 'one' ? r.riders : 1));
        notice(s, { kind: 'info', title: 'بەژدارییەکەت چالاک کرا', body: `${r.riderNames} لەگەڵ ${d ? d.name : 'شۆفێر'}، ${fmt.money(offer.price)} مانگانە` }, r.owner);
        dnotice(s, driverId, { kind: 'ok', title: `${r.ownerName} تۆی هەڵبژارد`, body: `${r.from} ← ${r.to}، ${fmt.money(offer.price)} مانگانە`, link: 'routes' });
        r.offers.filter((o) => o.driverId !== driverId).forEach((o) => dnotice(s, o.driverId, { kind: 'info', title: 'داواکارییەکە داخرا', body: `${r.ownerName} شۆفێرێکی تری هەڵبژارد`, link: 'requests' }));
      });
    },

    /** ناردنی نامە لە نێوان شۆفێر (driverId) و سەرنشین (peer) */
    sendMessage(driverId, peer, text, fromDriver) {
      update((s) => {
        const now = Date.now();
        s.messages.push({ id: uid(), driverId, peer, fromDriver, text, at: now, readP: !fromDriver, readD: fromDriver });
        const d = s.drivers.find((x) => x.id === driverId);
        if (fromDriver) notice(s, { kind: 'chat', title: `نامە لە ${d ? d.name : 'شۆفێر'}`, body: text, link: `chat/${driverId}` }, peer);
        else dnotice(s, driverId, { kind: 'chat', title: `نامە لە ${sel.peerName(peer)}`, body: text, link: `chat/${encodeURIComponent(peer)}` });
      });
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
    setSharePhone(v) {
      update((s) => {
        s.passenger.sharePhone = v;
      });
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
        s.rewards.points += 20;
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
    pay(total, points, phone) {
      update((s) => {
        const owner = !phone || phone === s.passenger.phone ? 'me' : phone;
        const ps = pslice(s, owner);
        if (!ps) return;
        const inv = TK.invoice(s, owner);
        ps.billing.paid = true;
        ps.billing.history.unshift({ month: ps.billing.month, total, at: Date.now(), method: ps.billing.method, lines: inv.lines, promo: inv.promo, credit: inv.credit, name: ps.passenger.name });
        partnerEarn(s, ps.passenger.phone, ps.passenger.name, ps.billing.month, total);
        ps.billing.adjustments = []; // قەرەبووەکان بەکارهاتن
        ps.rewards.points += points;
        notice(s, { kind: 'pay', title: 'پارەدان تۆمار کرا', body: `${fmt.money(total)}، ${points} خاڵی پاداشت زیاد کرا` }, owner);
      });
    },
    redeem(id, cost) {
      if (state.rewards.points < cost || state.rewards.redeemed.includes(id)) return false;
      update((s) => {
        s.rewards.points -= cost;
        s.rewards.redeemed.push(id);
      });
      return true;
    },
    addTicket(subject) {
      update((s) => {
        const t = { id: 1000 + Math.floor(Math.random() * 9000), subject, status: 'open', at: Date.now(), by: s.passenger.name, phone: s.passenger.phone };
        s.tickets.unshift(t);
        anotice(s, { kind: 'ticket', title: `داواکاری پشتگیری لە ${s.passenger.name}`, body: subject, link: 'reports' });
      });
    },
    /** ڕاگرتن / دەستپێکردنەوەی بەژداری. شۆفێر ئاگادار دەکرێتەوە */
    toggleSubPause(id) {
      update((s) => {
        const sub = s.subscriptions.find((x) => x.id === id);
        if (!sub) return;
        sub.status = sub.status === 'paused' ? 'active' : 'paused';
        const paused = sub.status === 'paused';
        syncRoutesOf(s, sub.id);
        sub.pauseLog = sub.pauseLog || [];
        if (paused) sub.pauseLog.push({ from: Date.now(), to: null });
        else if (sub.pauseLog.length && !sub.pauseLog[sub.pauseLog.length - 1].to) sub.pauseLog[sub.pauseLog.length - 1].to = Date.now();
        const names = sub.riderNames;
        const d = s.drivers.find((x) => x.id === sub.driverId);
        notice(s, { kind: 'info', title: paused ? 'بەژدارییەکە ڕاگیرا' : 'بەژدارییەکە دەستی پێکردەوە', body: `${names}، ${d ? d.name : ''} ئاگادار کرایەوە` });
        dnotice(s, sub.driverId, { kind: paused ? 'info' : 'ok', title: paused ? `${s.passenger.name} بەژدارییەکەی ڕاگرت` : `${s.passenger.name} بەژدارییەکەی دەستپێکردەوە`, body: `${names}، ${sub.to}${paused ? '، تا ئاگاداری دووەم گەشت نییە' : ''}`, link: 'today' });
        s.messages.push({ id: uid(), driverId: sub.driverId, peer: 'me', fromDriver: false, system: true, text: paused ? `بەژداری ${names} بۆ ${sub.to} ڕاگیرا` : `بەژداری ${names} بۆ ${sub.to} دەستی پێکردەوە`, at: Date.now(), readP: true, readD: false });
      });
    },
    /** گۆڕینی کات و ڕۆژەکانی بەژداری */
    updateSub(id, patch) {
      update((s) => {
        const sub = s.subscriptions.find((x) => x.id === id);
        if (!sub) return;
        Object.assign(sub, patch);
        s.trips.filter((t) => t.subId === id).forEach((t) => {
          const isBack = t.dir === 'back';
          const time = patch.go && !isBack ? patch.go : patch.back && isBack ? patch.back : null;
          if (time && t.status === 'scheduled' && !t.runId) {
            const shift = (+time.slice(0, 2) * 60 + +time.slice(3)) - (+t.time.slice(0, 2) * 60 + +t.time.slice(3));
            t.time = time;
            t.stops.forEach((x) => (x.time = fmt.addMin(x.time, shift)));
          }
        });
        if (patch.days) {
          // ئەگەر ئەمڕۆ لابرا یان زیاد کرا
          if (!dayApplies(sub)) s.trips = s.trips.filter((t) => t.subId !== id || t.status !== 'scheduled');
          else genTrips(s, sub);
        }
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
        const text = `گۆڕانکاری لە بەژداری ${sub.riderNames}: ${fmt.schedule(sub)}، ${fmt.days(sub.days)}`;
        s.messages.push({ id: uid(), driverId: sub.driverId, peer: 'me', fromDriver: false, system: true, text, at: Date.now(), readP: true, readD: false });
        dnotice(s, sub.driverId, { kind: 'info', title: 'گۆڕانکاری لە بەژدارییەک', body: text, link: 'today' });
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
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        if (!t || t.status !== 'scheduled') return;
        const c = cfg();
        const sub = s.subscriptions.find((x) => x.id === t.subId);
        const perTrip = sub ? sub.price / Math.max(1, sub.days.filter(Boolean).length * 4.3 * (sub.go && sub.back ? 2 : 1)) : 0;
        const credit = Math.max(c.noShowCreditMin, Math.round(perTrip / 500) * 500);
        t.status = 'noshow';
        const adj = { id: 'a' + uid(), amount: credit, note: `قەرەبوو: شۆفێر نەهات، ${t.title}`, at: Date.now() };
        s.billing.adjustments.push(adj);
        const le = ledger(s, t.driverId, 'penalty', -c.noShowPenalty, `نەهاتن بۆ ${t.title}، ${fmt.clock(t.time)}`);
        s.reports.unshift({ id: 'r' + uid(), type: 'noshow', tripId, driverId: t.driverId, by: s.passenger.name, phone: s.passenger.phone, note: note || '', credit, penalty: c.noShowPenalty, adjId: adj.id, ledgerId: le.id, status: 'open', at: Date.now() });
        notice(s, { kind: 'info', title: 'ڕاپۆرتەکەت تۆمار کرا', body: `${fmt.money(credit)} قەرەبوو بۆ فاتورەی داهاتوو زیاد کرا` });
        dnotice(s, t.driverId, { kind: 'info', red: true, title: 'ڕاپۆرتی نەهاتن', body: `${t.title}، ${fmt.money(c.noShowPenalty)} سزا. ئەگەر هەڵەیە پەیوەندی بە پشتگیری بکە`, link: 'earnings' });
        anotice(s, { kind: 'report', red: true, title: `ڕاپۆرتی «شۆفێر نەهات» لە ${s.passenger.name}`, body: t.title, link: 'reports' });
      });
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
        dnotice(s, id, { kind: 'info', title: 'زانیارییەکانت نێردران', body: 'تیمی تەکسیەکەم بەڵگەنامەکانت دەپشکنێت. دوای پشتڕاستکردنەوە دەتوانیت کار بکەیت.', link: 'profile' });
        anotice(s, { kind: 'driver', title: `شۆفێری نوێ: ${f.name}`, body: 'چاوەڕێی پشکنینی بەڵگەنامەکانە', link: `driver/${id}` });
      });
      imgPump();
      return null;
    },
    async driverLogin(phone, pass) {
      const p = cleanPhone(phone);
      if (!/^7\d{9}$/.test(p)) return 'ژمارەی مۆبایل دروست نییە (وەک 750 123 4567)';
      if (!pass) return 'وشەی نهێنی بنووسە';
      const nc = needCloud();
      if (nc) return nc;
      let u;
      try {
        u = await window.TKFB.signIn(emailOf(p, 'd'), pass);
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
    setMyDriver(patch) {
      update((s) => {
        const d = s.drivers.find((x) => x.id === s.driver.meId);
        if (d) Object.assign(d, patch);
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
        notice(s, { kind: 'offer', title: `${d.name} داواکارییەکەتی قبووڵ کرد`, body: `${r.riderNames}، ${r.to}، ${fmt.money(price)} مانگانە`, link: `request/${r.id}` }, r.owner);
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
      if (state.trips.some((x) => x.driverId === t0.driverId && x.status === 'active' && x.runId !== t0.runId)) return 'سەرەتا گەشتی ئێستات تەواو بکە';
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
    riderAbsent(tripId) {
      let finished = false;
      const t0 = state.trips.find((x) => x.id === tripId);
      const st0 = t0 && t0.stops.find((x) => !x.done);
      if (!st0 || st0.kind !== 'pickup' || !st0.arrivedAt || Date.now() < TK.absentAt(st0)) return false;
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
          notice(s, { kind: 'info', red: true, title: `${stop.riders} سوار نەبوون`, body: `${d ? d.name : 'شۆفێر'} ${mins} خولەک لە ${stop.place} چاوەڕێی کرد. چونکە پێشتر «نایەم»ت نەکردبوو، ئەم گەشتە وەک کراو حیساب دەکرێت`, link: `track/${x.id}` }, x.owner);
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
        route.subIds.forEach((sid) => {
          const x = s.subscriptions.find((y) => y.id === sid);
          if (x) notice(s, { kind: 'info', title: 'گۆڕانکاری لە گەشتەکەت', body: `${x.riderNames} ئیتر بە تەنها دەچن، کاتی سوارکردن ${fmt.clock(subTime(x, route.dir))}`, link: 'trips' }, x.owner);
        });
      });
      return null;
    },
    rateRiders(tripId) {
      update((s) => {
        const t = s.trips.find((x) => x.id === tripId);
        runOf(s, t).forEach((x) => (x.rated = true));
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
  TK.noticeAdd = (s, n, owner) => notice(s, n, owner);
  TK.dnoticeAdd = (s, n) => dnotice(s, n.driverId, n);
  TK.endSubIn = (s, id, why) => endSub(s, id, why);
  /** کۆتاییهێنان بە بەژداری: گەشتە نەکراوەکان لادەبرێن، مێژوو دەمێنێتەوە */
  function endSub(s, id, why) {
    const sub = s.subscriptions.find((x) => x.id === id);
    if (!sub) return;
    s.subscriptions = s.subscriptions.filter((x) => x.id !== id);
    s.trips = s.trips.filter((t) => t.subId !== id || t.status === 'active' || t.status === 'done');
    unrouteSub(s, id, sub.riderNames);
    const d = s.drivers.find((x) => x.id === sub.driverId);
    if (d) d.freeSeats += sub.mode === 'one' ? sub.memberIds.length : 1;
    const names = sub.riderNames;
    const who = sel.peerName(sub.owner || 'me');
    const reason = why === 'change' ? 'شۆفێری گۆڕی' : why === 'admin' ? 'بەژدارییەکەی لەلایەن بەڕێوەبەرەوە هەڵوەشێنرایەوە' : 'بەژدارییەکەی هەڵوەشاندەوە';
    s.messages.push({ id: uid(), driverId: sub.driverId, peer: sub.owner || 'me', fromDriver: false, system: true, text: `${who} ${reason} (${names}، ${sub.to})`, at: Date.now(), readP: true, readD: false });
    dnotice(s, sub.driverId, { kind: 'info', title: `${who} ${reason}`, body: `${names}، ${sub.to}، گەشتەکانی داهاتوو لابران` });
    notice(s, { kind: 'info', title: why === 'change' ? 'شۆفێر گۆڕا' : 'بەژدارییەکە هەڵوەشێنرایەوە', body: `${names}، ${d ? d.name : ''} ئاگادار کرایەوە. گەشتە کراوەکان لە «گەشتەکانم» دەمێننەوە` }, sub.owner);
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
      const b = Math.min(end, p.to || Date.now());
      if (b > a) ms += b - a;
    });
    return (sub.pauseLog || []).some((p) => (p.to || Date.now()) > start) ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
  };
  /** فاتورەی مانگی سەرنشینێک (بنەڕەت: سەرنشینی ئێستا) */
  TK.invoice = function (s, owner = 'me') {
    const mb = monthBounds();
    const ps = pslice(s, owner) || { billing: { adjustments: [] } };
    const lines = s.subscriptions.filter((x) => (x.owner || 'me') === owner).map((x) => {
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
      const d = s.drivers.find((y) => y.id === x.driverId) || {};
      return { subId: x.id, label: `${x.riderNames}، ${d.name || ''}`, note: notes.join('، '), full: x.price, amount: Math.round((x.price * factor) / 1000) * 1000 };
    }).filter(Boolean);
    const sub = lines.reduce((n, l) => n + l.amount, 0);
    const b = ps.billing || {};
    const promo = b.promo ? Math.round((sub * b.promo.rate) / 1000) * 1000 : 0;
    const adj = (b.adjustments || []).reduce((n, a) => n + a.amount, 0);
    const credit = Math.min(adj, Math.max(0, sub - promo));
    return { lines, sub, promo, credit, adjustments: b.adjustments || [], total: Math.max(0, sub - promo - credit) };
  };

  /* ---------- حیسابی شۆفێر: داهات، کۆمیسیۆن، سزا، پاداشت ---------- */
  TK.payout = function (s, driverId) {
    const c = cfg();
    const d = s.drivers.find((x) => x.id === driverId) || {};
    const subs = s.subscriptions.filter((x) => x.driverId === driverId && x.status !== 'paused');
    const gross = subs.reduce((n, x) => n + x.price, 0);
    const commission = Math.round(gross * c.commission);
    const entries = s.ledger.filter((e) => e.driverId === driverId && !e.paidOut);
    const ledgerSum = entries.reduce((n, e) => n + e.amount, 0);
    const mk = MONTH_KEY();
    const bonusDays = (d.workDays || []).filter((x) => x.startsWith(mk)).length;
    const bonus = bonusDays >= c.bonusDays ? c.bonusAmount : 0;
    return { gross, commission, entries, ledgerSum, bonus, bonusDays, net: gross - commission + ledgerSum + bonus, subs: subs.length };
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
        const closed = new Set();
        s.trips.filter((t) => stale.includes(t.id) && t.status === 'active').forEach((t) => {
          t.stops.forEach((st) => {
            if (!st.done) Object.assign(st, { done: true, doneAt: now, auto: true });
          });
          t.autoClosed = true;
          finishTrip(s, t, now);
          const k = t.runId || t.id;
          if (closed.has(k)) return;
          closed.add(k);
          finishRun(s, runOf(s, t));
          const d = s.drivers.find((x) => x.id === t.driverId);
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
    if (full) {
      if (!need(f.name) || f.name.trim().split(/\s+/).length < 3) return 'ناوی سیانی وەک کارتی نیشتمانی بنووسە';
      if (!['m', 'f'].includes(f.gender)) return 'ڕەگەز هەڵبژێرە';
      if (!/^7\d{9}$/.test(cleanPhone(f.phone))) return 'ژمارەی مۆبایل دروست نییە (وەک 750 123 4567)';
      if (!f.pass || f.pass.length < 6) return 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت';
      if (f.pass !== f.pass2) return 'وشە نهێنییەکان وەک یەک نین';
      if (!need(f.birth)) return 'ڕۆژی لەدایکبوون بنووسە';
      if (TK.age(f.birth) < c.minDriverAge) return `تەمەنی شۆفێر دەبێت لانیکەم ${c.minDriverAge} ساڵ بێت`;
      if (!need(f.emergencyName) || !/^7\d{9}$/.test(cleanPhone(f.emergencyPhone))) return 'ناو و ژمارەی کەسێکی نزیک بۆ فریاکەوتن بنووسە';
      if (cleanPhone(f.emergencyPhone) === cleanPhone(f.phone)) return 'ژمارەی فریاکەوتن دەبێت جیا بێت لە ژمارەکەی خۆت';
      if (!need(f.city) || !need(f.district) || !need(f.neighborhood)) return 'شار، قەزا و گەڕەک بنووسە';
      if (!need(f.photo)) return 'وێنەی ڕووخسار بار بکە';
    }
    if (full || 'idNo' in f) {
      if (!/^[0-9A-Za-z]{6,20}$/.test(String(f.idNo || '').trim())) return 'ژمارەی کارتی نیشتمانی دروست نییە';
      if (!need(f.idExpiry) || f.idExpiry <= today) return 'کارتی نیشتمانی بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!need(f.idFront) || !need(f.idBack)) return 'وێنەی هەردوو ڕووی کارتی نیشتمانی بار بکە';
    }
    if (full || 'licNo' in f) {
      if (!need(f.licNo)) return 'ژمارەی مۆڵەتی شۆفێری بنووسە';
      if (!need(f.licExpiry) || f.licExpiry <= today) return 'مۆڵەتی شۆفێری بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!need(f.licFront) || !need(f.licBack)) return 'وێنەی هەردوو ڕووی مۆڵەتی شۆفێری بار بکە';
    }
    if (full || 'carMake' in f) {
      if (!need(f.carMake) || !need(f.carModel) || !need(f.carColor)) return 'جۆر، مۆدێل و ڕەنگی ئۆتۆمبێل بنووسە';
      const y = +f.carYear;
      if (!y || y < c.minCarYear || y > new Date().getFullYear() + 1) return `ساڵی دروستکردنی ئۆتۆمبێل دەبێت ${c.minCarYear} یان نوێتر بێت`;
      if (!(+f.seats >= 1 && +f.seats <= 8)) return 'ژمارەی کورسی سەرنشین دروست نییە';
      if (!/^\d{2}$/.test(String(f.plateCode || '')) || !/^\d{3,6}$/.test(String(f.plateNo || ''))) return 'ژمارەی تابلۆ دروست نییە (وەک 22 A 12345)';
      if (!['carFront', 'carBack', 'carLeft', 'carRight', 'carInside'].every((k) => need(f[k]))) return 'هەر پێنج وێنەی ئۆتۆمبێل بار بکە';
    }
    if (full || 'regNo' in f) {
      if (!need(f.regNo)) return 'ژمارەی ساڵانەی ئۆتۆمبێل بنووسە';
      if (!need(f.regExpiry) || f.regExpiry <= today) return 'ساڵانەی ئۆتۆمبێل بەسەرچووە یان بەروارەکەی نەنووسراوە';
      if (!need(f.regPhoto)) return 'وێنەی ساڵانە بار بکە';
    }
    if (full || 'secPhoto' in f) {
      if (!need(f.secPhoto) || !need(f.secDate)) return 'وێنە و بەرواری کۆدی ئاسایش بار بکە';
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
          await window.TKFB.write({ op: 'set', path: 'img/' + id, data: { d, o: cloud.me, pub: pubWant.has(id), at: Date.now() } });
          imgQueue.delete(id);
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
    if (ROLE !== 'driver' && ROLE !== 'admin') return;
    const ids = [];
    want.forEach((d, path) => {
      if (path.startsWith('dpub/') && (ROLE === 'admin' || path === 'dpub/' + cloud.me)) {
        if (d.photo) ids.push(d.photo);
        (d.showPhotos || []).forEach((x) => ids.push(x));
      }
      if (path.startsWith('news/') && ROLE === 'admin' && d.image) ids.push(d.image);
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
  /** وێنەکانی ناو ئەم ئامێرە */
  TK.allImages = async function () {
    const out = {};
    IMGS.forEach((v, k) => (out[k] = v));
    try {
      const keys = await imgTx('readonly', (st) => st.getAllKeys());
      const vals = await imgTx('readonly', (st) => st.getAll());
      keys.forEach((k, i) => (out[k] = vals[i]));
    } catch (e) {
      /* هیچ */
    }
    return out;
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
    if (meta) meta.setAttribute('content', dark ? '#0B1733' : '#F4F6FA');
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
  }
  TK.render = () => render(true);

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
    const w = on.offsetWidth;
    const put = (x, anim) => {
      pill.style.transition = anim ? '' : 'none';
      pill.style.width = w + 'px';
      pill.style.transform = `translateX(${x}px)`;
    };
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
    render(same);
    if (!same) window.scrollTo(0, 0);
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
  }

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
      renderSheetSafe();
      return;
    }
    pending = false;
    render(true);
  }
  function renderSheetSafe() {
    /* شیت لە کاتی نووسیندا دەست لێنادرێت */
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
    el.innerHTML = `<div class="ico-box">${TK.icon(ic, 20, 'var(--brand)')}</div><div class="grow"><b>${esc(n.title)}</b><div class="sm muted ellipsis">${esc(n.body || '')}</div></div>`;
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
    const opts = { body: fmt.n(n.body || ''), icon: 'icon-192.png', badge: 'icon-192.png', tag: n.id, data: { link: n.link || '' } };
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
      app.root.innerHTML = `<div class="splash"><img src="../shared/logo.png" alt=""><div class="h1">تەکسیەکەم</div><div class="sm" style="opacity:.75" id="bootmsg">بارکردن...</div></div>`;
      const t0 = Date.now();
      const wait = () => {
        if (cloud.ready) return boot();
        if (cloud.error === 'load' || Date.now() - t0 > 15000) {
          const m = document.getElementById('bootmsg');
          app.root.innerHTML = `<div class="splash" style="gap:14px"><img src="../shared/logo.png" alt=""><div class="h2">پەیوەندی بە سێرڤەر نییە</div><div class="sm" style="opacity:.8;max-width:300px;text-align:center;line-height:1.9">دڵنیابە ئینتەرنێتت هەیە، پاشان دووبارە هەوڵ بدەرەوە.</div><button class="btn" onclick="location.reload()">دووبارە هەوڵدانەوە</button></div>`;
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
  const ui = {
    icon: TK.icon,
    avatar(initial, tone = '', size = 44) {
      return `<span class="avatar ${tone}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${esc(initial)}</span>`;
    },
    /** وێنەی شۆفێر (ئەگەر هەبێت) یان پیتی یەکەمی ناوەکەی */
    dAvatar(d, size = 44) {
      if (!d) return ui.avatar('?', '', size);
      const src = d.photo ? TK.img(d.photo) : '';
      if (src) return `<img class="avatar" src="${src}" alt="" style="width:${size}px;height:${size}px;object-fit:cover">`;
      return ui.avatar(d.initial || (d.name || '?').slice(0, 1), d.woman ? 'woman' : 'amber', size);
    },
    badge(label, tone = '') {
      return `<span class="badge ${tone}">${esc(label)}</span>`;
    },
    header(title, opts = {}) {
      return `<div class="header">
        ${opts.back !== false ? `<button class="icon-btn" data-back="${esc(opts.back || '')}" aria-label="گەڕانەوە">${TK.icon('back', 22)}</button>` : ''}
        <div class="titles"><div class="h2">${esc(title)}</div>${opts.sub ? `<div class="sm muted">${esc(opts.sub)}</div>` : ''}</div>
        ${opts.right || ''}
      </div>`;
    },
    nav(items, active) {
      return `<nav class="bottom-nav">${items
        .map(
          (it) => `<a href="#/${it.path}" class="${it.key === active ? 'on' : ''}" ${it.key === active ? 'aria-current="page"' : ''}>
            <span class="ni">${TK.icon(it.icon, 25, 'currentColor', it.key === active ? 2.3 : 1.9)}${it.badge ? `<span class="nb">${it.badge}</span>` : ''}</span><span class="nl">${esc(it.label)}</span>
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
    empty(icon, title, text, btn) {
      return `<div class="empty"><div class="ico-box">${TK.icon(icon, 30, 'var(--amber)')}</div><div class="h3">${esc(title)}</div><div class="sm muted">${esc(text)}</div>${btn || ''}</div>`;
    },
    /** تابلۆی ئۆتۆمبێل لە یەک پارچەدا (بۆ ئەوەی نەبێت بە دوو دێڕ) */
    /** type: «taxi» ستوونی سوور، «private» سپی (تەنها بۆ شۆفێری ئافرەت) */
    plate(p, type = 'taxi') {
      // تابلۆی تەکسی هەرێمی کوردستان: ستوونی سوور (IRQ KR)، سەرەوە «22 A»، خوارەوە ژمارە
      const raw = String(p || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      const nums = raw.match(/\d+/g) || [];
      const letter = (raw.match(/[A-Za-z]/) || ['A'])[0].toUpperCase();
      const code = nums.length > 1 ? nums[0] : '22';
      const num = nums.length ? nums[nums.length - 1] : '';
      return `<span class="kplate latin ${type === 'private' ? 'private' : ''}" title="${type === 'private' ? 'تابلۆی تایبەت' : 'تابلۆی تەکسی'}" data-raw aria-label="تابلۆ ${esc(code)} ${letter} ${esc(num)}"><span class="kp-side"><i>I</i><i>R</i><i>Q</i><i>KR</i></span><span class="kp-main"><span class="kp-top">${esc(code)}<span class="kp-dot"></span>${letter}</span><span class="kp-num">${esc(num)}</span></span></span>`;
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
        <select class="input" id="${id}-m" aria-label="مانگ">${opt('', 'مانگ', !m)}${fmt.MONTHS.map((n, i) => opt(i + 1, n, m === i + 1)).join('')}</select>
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
      return `<div class="map ${opts.tall ? 'tall' : ''}" style="${opts.radius === 0 ? 'border-radius:0' : ''}">
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
          const body = m.voice
            ? `<div class="voice">${TK.icon('play', 16, 'currentColor', 2, 'currentColor')}<span class="wave"></span><span class="xs">0:0${m.voice}</span></div>`
            : esc(m.text);
          const read = asDriver ? m.readP : m.readD;
          const tick = mine ? `<span class="ticks ${read ? 'read' : ''}">${read ? '✓✓' : '✓'}</span>` : '';
          return `${sep}<div class="bubble ${mine ? 'me' : 'them'}">${body}<div class="time">${fmt.clock(fmt.hhmm(m.at))} ${tick}</div></div>`;
        })
        .join('')}</div>`;
    },
    /** لیستی گفتوگۆکان */
    threads(list, asDriver, mkHead) {
      if (!list.length) return ui.empty('chat', 'هێشتا نامەت نییە', asDriver ? 'کاتێک سەرنشینێک نامەت بۆ بنێرێت لێرە دەردەکەوێت' : 'کاتێک شۆفێرێکت هەبوو، لێرە ڕاستەوخۆ قسەی لەگەڵ دەکەیت');
      return `<div class="list">${list
        .map((t) => {
          const h = mkHead(t);
          const last = t.last;
          const mine = last.fromDriver === asDriver;
          const replied = !mine;
          const read = asDriver ? last.readP : last.readD;
          const status = last.system ? '' : mine ? (read ? '<span class="badge info">بینیویەتی</span>' : '<span class="badge">چاوەڕێی وەڵام</span>') : replied && t.unread ? '' : '<span class="badge ok">وەڵامی دایەوە</span>';
          const preview = last.voice ? 'نامەی دەنگی' : last.text;
          return `<div class="item tap" data-go="${esc(h.link)}">
            <div style="position:relative">${h.avatar}${h.online ? '<span class="online-dot"></span>' : ''}</div>
            <div class="grow" style="min-width:0">
              <div class="row between"><b class="ellipsis">${esc(h.name)}</b><span class="xs muted" style="white-space:nowrap">${fmt.ago(last.at)}</span></div>
              ${h.sub ? `<div class="xs muted ellipsis">${esc(h.sub)}</div>` : ''}
              <div class="row between" style="gap:6px"><span class="sm ellipsis ${t.unread ? 'bold' : 'muted'}">${mine ? 'تۆ: ' : ''}${esc(preview)}</span>${t.unread ? `<span class="unread-pill">${t.unread}</span>` : status}</div>
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
    noticeList(list, readAt) {
      if (!list.length) return ui.empty('bell', 'هیچ ئاگادارکردنەوەیەک نییە', 'کاتێک شتێکی نوێ ڕوو بدات لێرە دەردەکەوێت');
      return `<div class="list">${list
        .map((n) => {
          const [ic, tone] = ui.noticeIcon(n.kind);
          return `<div class="item ${n.link ? 'tap' : ''}" ${n.link ? `data-go="${esc(n.link)}"` : ''}>
            <div class="ico-box ${tone}">${TK.icon(ic, 20, 'var(--brand)')}</div>
            <div class="grow"><div class="bold" style="font-size:.95rem">${esc(n.title)}</div><div class="sm muted">${esc(n.body)}</div></div>
            <div class="col tight" style="align-items:flex-end"><span class="xs muted" style="white-space:nowrap">${fmt.ago(n.at)}</span>${n.at > readAt ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--amber)"></span>' : ''}</div>
          </div>`;
        })
        .join('')}</div>`;
    },
    requestSummary(r) {
      return `<div class="col tight">
        <div class="row sm">${TK.icon('pin', 16, 'var(--success)')}<span class="grow">${esc(r.from)}</span></div>
        <div class="row sm">${TK.icon('pin', 16, 'var(--amber)')}<span class="grow">${esc(r.to)}</span></div>
        <div class="row sm muted">${TK.icon('clock', 16)}<span>${fmt.schedule(r)}</span></div>
        <div class="row sm muted">${TK.icon('calendar', 16)}<span>${fmt.days(r.days)}</span></div>
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

  /* ---------- کارۆسێلی هەواڵ: جووڵەی خۆکار و خاڵەکان ---------- */
  let carIdx = 0;
  let carTimer = null;
  TK.initCarousel = function () {
    clearInterval(carTimer);
    const c = document.querySelector('[data-carousel]');
    if (!c) return;
    const track = c.querySelector('.track');
    const dots = c.querySelectorAll('.dots i');
    const count = dots.length;
    // ئاراستەی ڕاست بۆ چەپ: سلایدی دواتر لە لای چەپەوە دێت، و scrollLeft بەرەو سالب دەچێت
    const step = () => (track.children.length > 1 ? Math.abs(track.children[1].offsetLeft - track.children[0].offsetLeft) : track.clientWidth);
    const pos = () => Math.abs(track.scrollLeft);
    const setDots = (i) => dots.forEach((d, k) => d.classList.toggle('on', k === i));
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = -carIdx * step();
    track.style.scrollBehavior = '';
    setDots(carIdx);
    let userTouch = 0;
    track.addEventListener('scroll', () => {
      const i = Math.round(pos() / (step() || 1));
      if (i !== carIdx && i >= 0 && i < count) {
        carIdx = i;
        setDots(i);
      }
    }, { passive: true });
    // ئەگەر لە دوایین ڕیکلامدایت و هێشتا پەنجە بۆ دواتر دەکێشیت، دەگەڕێتەوە بۆ یەکەم
    let startX = null;
    let startIdx = 0;
    const goFirst = () => {
      carIdx = 0;
      setDots(0);
      track.scrollTo({ left: 0, behavior: 'smooth' });
    };
    track.addEventListener('touchstart', (e) => {
      userTouch = Date.now();
      startX = e.touches[0].clientX;
      startIdx = carIdx;
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      userTouch = Date.now();
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX; // ڕاست بۆ چەپ: دواتر = پەنجە بەرەو ڕاست
      startX = null;
      if (startIdx === count - 1 && dx > 40) setTimeout(goFirst, 60);
    }, { passive: true });
    // بە ماوس (کۆمپیوتەر)
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      startX = e.clientX;
      startIdx = carIdx;
    });
    track.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse' || startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (startIdx === count - 1 && dx > 40) goFirst();
    });
    carTimer = setInterval(() => {
      if (!document.body.contains(track)) return clearInterval(carTimer);
      if (Date.now() - userTouch < 6000) return;
      carIdx = (carIdx + 1) % count;
      track.scrollTo({ left: -carIdx * step(), behavior: 'smooth' });
      setDots(carIdx);
    }, 4500);
  };

  /* ---------- کردارە هاوبەشەکان (ڕێکخستن) ---------- */
  Object.assign(app.acts, {
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
      if (!(await TK.ask('هەموو زانیارییەکان (سەرنشینان، شۆفێران، بەژداری و پارەدان) بە تەواوی دەسڕدرێنەوە و ناگەڕێنەوە. پێش ئەمە فایلی پاشەکەوت دابگرە.', { yes: 'سڕینەوەی هەمووی' }))) return;
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
        ${who === 'driver' ? `<b>٤. شۆفێر:</b> زانیارییەکانت دەبێت ڕاست و نوێ بن. ئەگەر بەڵگەنامەیەک بەسەر چوو دەبێت نوێی بکەیتەوە. دواکەوتن و نەهاتن سزای لەسەرە. تەکسیەکەم دەتوانێت هەژمار ڕابگرێت ئەگەر زانیاری هەڵە بێت یان سکاڵای جددی هەبێت.<br>` : `<b>٤. سەرنشین:</b> «نایەم» تا ${cfg().skipCutoffMin} خولەک پێش گەشت دەکرێت. ئەگەر شۆفێر نەهات، ڕاپۆرت بکە و قەرەبوو دەکرێیتەوە.<br>`}
        <b>٥. پارەدان:</b> نرخی مانگانە پێش دەستپێکردن ڕێک دەکەوێت و لە کاتی گەشتدا ناگۆڕێت.
      </div>
      <button class="btn block" data-close>تێگەیشتم</button>`);
  };

  /** شاردنەوەی ژمارەی تەلەفۆن لە چاتدا (بۆ ئەوەی پەیوەندی لەناو ئەپ بمێنێتەوە) */
  TK.maskPhones = function (text) {
    const re = /(\+?[0-9٠-٩][0-9٠-٩\s-]{6,}[0-9٠-٩])/g;
    const found = re.test(text);
    return { text: text.replace(re, '•••• ••• ••••'), found };
  };
})();
